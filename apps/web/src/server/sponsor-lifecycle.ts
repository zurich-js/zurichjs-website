/**
 * What can happen to a sponsorship, in one place for the portal, the admin area and the
 * daily job (docs/v2/SPONSORSHIP.md). Every change needs the sponsor's agreement
 * (owner, 18th November 2026): they make it themselves in the portal, or the board
 * proposes it and a contact accepts. Each step emails the sponsor's contacts and posts
 * a Slack note; the important ones also go to hello@zurichjs.com.
 *
 *   start         accept the agreement, then pay by card (Checkout) or by invoice
 *   changePlan    a higher tier on the same cycle now (prorated), anything else at renewal
 *   end           at the end of the paid period; can be undone until then
 *   proposals     the board proposes a plan change or an end; a contact accepts or declines
 *   boardEnd      the board ends it outright (terminated, or an invitation withdrawn)
 */
import {
  AGREEMENT,
  PROPOSAL_DAYS,
  TransitionError,
  canChange,
  changeTiming,
  cycleInfo,
  feeLabel,
  tierInfo,
  type Actor,
  type Contact,
  type Cycle,
  type EndedReason,
  type Proposal,
  type Sponsor,
  type Tier,
} from '@zurichjs/sponsorship';
import { lastDay, longDate, shortDateTime } from './dates.ts';
import { adminUrl, agreementUrl, emailBoard, emailSponsor, note, planLabel, who, type NotifyDeps } from './sponsor.ts';
import {
  cancelAtPeriodEnd,
  cancelNow,
  cancelPendingChange,
  periodEnd,
  resumeSubscription,
  scheduleChange,
  startCardCheckout,
  startInvoicing,
  upgradeNow,
  type StripeDeps,
} from './sponsor-stripe.ts';

export interface LifecycleDeps extends NotifyDeps {
  stripe: StripeDeps;
  now?: () => Date;
}

/** An expected refusal, with a sentence for the person and an HTTP status for the route. */
export class SponsorshipError extends Error {
  readonly status: number;
  readonly field?: string;
  constructor(message: string, status = 409, field?: string) {
    super(message);
    this.name = 'SponsorshipError';
    this.status = status;
    this.field = field;
  }
}

export interface Signer {
  name: string;
  title: string;
  email: string;
}

const today = (deps: LifecycleDeps) => (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
const nowIso = (deps: LifecycleDeps) => (deps.now?.() ?? new Date()).toISOString();
const summary = (s: Pick<Sponsor, 'tier' | 'cycle' | 'paymentMode'>) =>
  `${tierInfo(s.tier).name}, ${cycleInfo(s.cycle).label.toLowerCase()}, ${{ card: 'by card', invoice: 'by invoice', manual: 'paid directly' }[s.paymentMode]}`;

async function sign(s: Sponsor, signer: Signer, context: 'start' | 'change' | 'proposal', actor: Actor, deps: LifecycleDeps, what = summary(s)) {
  return deps.store.acceptAgreement(
    s.id,
    { version: AGREEMENT.version, signerName: signer.name, signerTitle: signer.title, signerEmail: signer.email, context, summary: what },
    actor,
  );
}

/* ------------------------------------------------------------------ start */

/**
 * Accepts the agreement and sets up payment. From `pending` (new or invited), or a running
 * sponsorship paid manually that moves to Stripe (charged when its paid period ends).
 * Card returns Stripe Checkout's URL; invoice sends the first invoice and returns its page.
 */
export async function startSponsorship(
  s: Sponsor,
  signer: Signer,
  paymentMode: 'card' | 'invoice',
  actor: Actor,
  deps: LifecycleDeps,
): Promise<{ checkoutUrl: string | null; invoiceUrl: string | null; sponsor: Sponsor }> {
  const switching = s.status === 'active' && s.paymentMode === 'manual';
  if (s.status !== 'pending' && !switching) throw new SponsorshipError('Payment is already set up for this sponsorship.');
  if (s.cycle === 'once') {
    if (switching) throw new SponsorshipError('A one-meetup sponsorship that is already paid needs no payment.');
    if (!s.eventDate || !s.eventTitle) throw new SponsorshipError('Choose the meetup you sponsor first.', 400, 'eventId');
    if (s.eventDate < today(deps)) throw new SponsorshipError('That meetup is over. Choose an upcoming one.', 400, 'eventId');
  }
  const contacts = await deps.store.contacts(s.id);
  let sponsor = s.paymentMode === paymentMode || switching ? s : await deps.store.update(s.id, { paymentMode }, actor);
  const agreement = await sign({ ...sponsor, paymentMode }, signer, 'start', actor, deps);

  let checkoutUrl: string | null = null;
  let invoiceUrl: string | null = null;
  if (paymentMode === 'card') checkoutUrl = await startCardCheckout(sponsor, contacts, deps.store, deps.origin, deps.stripe);
  else {
    ({ invoiceUrl } = await startInvoicing(sponsor, contacts, deps.store, deps.stripe));
    if (switching) sponsor = await deps.store.update(s.id, { paymentMode: 'invoice' }, actor);
  }

  await emailSponsor(
    { ...sponsor, paymentMode },
    'sponsor-agreement',
    (base) => ({
      ...base,
      signerName: signer.name,
      signerTitle: signer.title,
      acceptedAt: shortDateTime(agreement.acceptedAt),
      agreementVersion: agreement.version,
      agreementUrl: agreementUrl(deps.origin),
      invoiceUrl,
    }),
    { ...deps, key: `sponsor-agreement:${agreement.id}`, contacts },
  );
  await note(
    `:handshake: ${who(sponsor)}: ${signer.name} (${signer.title}) accepted the agreement and chose to pay ${paymentMode === 'card' ? 'by card (Checkout opened)' : 'by invoice (first invoice sent)'}.`,
    deps,
  );
  return { checkoutUrl, invoiceUrl, sponsor };
}

/* ------------------------------------------------------------------ plan changes */

/** When a change would apply, in words for emails and the portal. */
export async function appliesLabel(
  s: Sponsor,
  to: { tier: Tier; cycle: Cycle },
  deps: LifecycleDeps,
): Promise<{ timing: 'none' | 'now' | 'renewal'; text: string; from: string | null }> {
  const timing = s.status === 'pending' || s.paymentMode === 'manual' ? 'now' : changeTiming(s, to);
  if (timing === 'none') return { timing, text: 'no change', from: null };
  if (timing === 'now') return { timing, text: s.stripeSubscriptionId ? 'now (only the difference is charged for this term)' : 'now', from: null };
  const from = s.stripeSubscriptionId ? await periodEnd(s.stripeSubscriptionId, deps.stripe).catch(() => null) : null;
  return { timing, text: from ? `from ${longDate(from)} (your next renewal)` : 'from your next renewal', from };
}

/**
 * Changes tier and/or cycle. `pending` and manually paid sponsorships change at once (the
 * board settles manual billing); Stripe ones by changeTiming. Choosing the current plan
 * drops a change waiting for the renewal.
 */
export async function changePlan(
  s: Sponsor,
  to: { tier: Tier; cycle: Cycle },
  actor: Actor,
  deps: LifecycleDeps,
  signer: Signer | null,
  context: 'change' | 'proposal' = 'change',
): Promise<{ sponsor: Sponsor; timing: 'none' | 'now' | 'renewal'; from: string | null }> {
  if (s.cycle === 'once' || to.cycle === 'once') {
    if (s.status !== 'pending') throw new SponsorshipError('A one-meetup sponsorship cannot be changed. Start a new sponsorship instead.');
  } else if (s.status !== 'pending' && !canChange(s)) throw new SponsorshipError('This sponsorship cannot be changed now.');
  const previous = planLabel(s);
  const { timing, from } = await appliesLabel(s, to, deps);
  let sponsor = s;

  if (timing === 'none') {
    if (s.stripeSubscriptionId) await cancelPendingChange(s.stripeSubscriptionId, deps.stripe);
    await note(`:leftwards_arrow_with_hook: ${who(s)} keeps ${previous}; any change waiting for the renewal is cancelled.`, deps);
    return { sponsor, timing, from };
  }
  if (signer) await sign({ ...s, ...to }, signer, context, actor, deps, `${summary({ ...s, ...to })} (from ${previous})`);

  if (timing === 'now') {
    if (s.stripeSubscriptionId && s.status !== 'pending') await upgradeNow(s.stripeSubscriptionId, to, deps.stripe);
    sponsor = await deps.store.update(s.id, { tier: to.tier, cycle: to.cycle }, actor);
  } else {
    await scheduleChange(s.stripeSubscriptionId!, to, deps.stripe);
  }

  if (s.status !== 'pending') {
    await emailSponsor({ ...sponsor, ...to }, 'sponsor-change', (base) => ({ ...base, timing, from: from ? longDate(from) : null, previous }), {
      ...deps,
      key: `sponsor-change:${s.id}:${to.tier}-${to.cycle}:${today(deps)}`,
    });
    const manual = s.paymentMode === 'manual' ? ' Paid directly: adjust the billing by hand.' : '';
    await note(
      `:arrows_counterclockwise: ${who(s)} ${timing === 'now' ? 'is now' : `switches from ${from ? longDate(from) : 'the renewal'} to`} ${planLabel(to)} (was ${previous}).${manual}`,
      deps,
    );
  }
  return { sponsor, timing, from };
}

/* ------------------------------------------------------------------ ending */

/** Ends with the paid period. Returns the sponsorship, now `ending`. */
export async function endSponsorship(s: Sponsor, actor: Actor, deps: LifecycleDeps, signer: Signer | null, context: 'change' | 'proposal' = 'change'): Promise<Sponsor> {
  if (s.cycle === 'once') throw new SponsorshipError('A one-meetup sponsorship ends by itself after the meetup.');
  if (s.status === 'ending') return s;
  if (s.status !== 'active' && s.status !== 'past_due') throw new SponsorshipError('Only a running sponsorship can be ended.');
  let endsAt: string | null;
  if (s.stripeSubscriptionId) endsAt = (await cancelAtPeriodEnd(s.stripeSubscriptionId, nowIso(deps), deps.stripe)).endsAt;
  else endsAt = s.paidUntil && s.paidUntil > today(deps) ? s.paidUntil : today(deps);
  if (signer) await sign(s, signer, context, actor, deps, `End of the sponsorship (${planLabel(s)})${endsAt ? `, last day ${lastDay(endsAt)}` : ''}`);
  const ending = await deps.store.transition(s.id, { from: s.status, to: 'ending', actor, endsAt });
  const last = ending.endsAt ? longDate(lastDay(ending.endsAt)) : 'the end of the paid period';
  await emailSponsor(ending, 'sponsor-ending', (base) => ({ ...base, lastDay: last }), { ...deps, key: `sponsor-ending:${s.id}:${ending.endRequestedAt}` });
  await note(`:wave: ${who(s)} ends with the paid period (last day ${last}).`, deps);
  await emailBoard(`Sponsorship ending: ${s.companyName}`, [`${s.companyName} ends its ${tierInfo(s.tier).name} sponsorship.`], [['Last day', last]], {
    ...deps,
    key: `sponsor-board-ending:${s.id}:${ending.endRequestedAt}`,
    url: adminUrl(deps.origin, s.id),
  });
  return ending;
}

/** Takes back an end that has not happened yet: the sponsorship renews as before. */
export async function undoEnd(s: Sponsor, actor: Actor, deps: LifecycleDeps): Promise<Sponsor> {
  if (s.status !== 'ending') throw new SponsorshipError('This sponsorship is not ending.');
  if (s.stripeSubscriptionId) await resumeSubscription(s.stripeSubscriptionId, s.endRequestedAt ?? nowIso(deps), deps.stripe);
  const back = await deps.store.transition(s.id, { from: 'ending', to: 'active', actor });
  await emailSponsor(back, 'sponsor-resumed', (base) => base, { ...deps, key: `sponsor-resumed:${s.id}:${s.endRequestedAt}` });
  await note(`:leftwards_arrow_with_hook: ${who(s)} continues; the end is taken back.`, deps);
  return back;
}

/** The board ends a sponsorship outright (or withdraws an invitation). Stripe stops at once. */
export async function boardEnd(s: Sponsor, reason: Extract<EndedReason, 'terminated' | 'withdrawn' | 'completed'>, actor: Actor, deps: LifecycleDeps): Promise<Sponsor> {
  if (s.status === 'ended') return s;
  if (reason === 'withdrawn' && s.status !== 'pending') throw new SponsorshipError('Only a sponsorship that has not started can be withdrawn.');
  if (s.stripeSubscriptionId && s.status !== 'pending') await cancelNow(s.stripeSubscriptionId, deps.stripe);
  const ended = await deps.store.transition(s.id, { from: s.status, to: 'ended', actor, reason });
  if (reason !== 'withdrawn') await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...deps, key: `sponsor-ended:${s.id}:${reason}` });
  await note(`:no_entry: ${who(s)} ended by the board (${reason}).`, deps);
  return ended;
}

/* ------------------------------------------------------------------ proposals */

export interface ProposalInput {
  kind: 'plan' | 'end';
  tier: Tier | null;
  cycle: Cycle | null;
  message: string | null;
}

/** The board proposes a change agreed in conversation. Emails every contact. */
export async function propose(s: Sponsor, input: ProposalInput, actor: Actor, deps: LifecycleDeps): Promise<Proposal> {
  if (s.status === 'ended') throw new SponsorshipError('This sponsorship has ended. Invite them again instead.');
  if (input.kind === 'end' && (s.cycle === 'once' || (s.status !== 'active' && s.status !== 'past_due')))
    throw new SponsorshipError('Only a running, recurring sponsorship can be ended.');
  if (input.kind === 'plan') {
    if (!input.tier || !input.cycle) throw new SponsorshipError('Choose the tier and billing to propose.', 400, 'tier');
    if (input.tier === s.tier && input.cycle === s.cycle) throw new SponsorshipError('That is the plan they have now.', 400, 'tier');
    if (s.status !== 'pending' && (s.cycle === 'once' || input.cycle === 'once'))
      throw new SponsorshipError('A one-meetup sponsorship cannot be changed into another plan.', 400, 'cycle');
  }
  const expiresAt = new Date((deps.now?.() ?? new Date()).getTime() + PROPOSAL_DAYS * 86_400_000).toISOString();
  const p = await deps.store.propose(s.id, { kind: input.kind, tier: input.tier, cycle: input.cycle, message: input.message, expiresAt }, actor);
  const applies = p.kind === 'plan' ? await appliesLabel(s, { tier: p.tier!, cycle: p.cycle! }, deps) : null;
  const periodLast = s.stripeSubscriptionId ? await periodEnd(s.stripeSubscriptionId, deps.stripe).catch(() => null) : s.paidUntil;
  await emailSponsor(
    s,
    'sponsor-proposal',
    (base) => ({
      ...base,
      kind: p.kind,
      newPlan: p.kind === 'plan' ? { tierName: tierInfo(p.tier!).name, feeLabel: feeLabel(p.tier!, p.cycle!), applies: applies!.text } : null,
      lastDay: p.kind === 'end' && periodLast ? longDate(lastDay(periodLast)) : null,
      message: p.message,
      expires: longDate(p.expiresAt),
    }),
    { ...deps, key: `sponsor-proposal:${p.id}` },
  );
  await note(`:memo: Proposed to ${who(s)}: ${p.kind === 'plan' ? planLabel({ tier: p.tier!, cycle: p.cycle! }) : 'end the sponsorship'}. Waiting for them to confirm.`, deps);
  return p;
}

async function openProposal(p: Proposal, deps: LifecycleDeps): Promise<void> {
  if (p.status !== 'open') throw new SponsorshipError(`This proposal was already ${p.status}.`);
  if (p.expiresAt <= nowIso(deps)) {
    await deps.store.decideProposal(p.id, 'expired', 'script', { kind: 'script', id: 'proposal-expiry' }).catch(() => undefined);
    throw new SponsorshipError('This proposal has expired. Ask us for a new one.');
  }
}

/** A contact accepts: the agreement is signed for the change, then it is applied. */
export async function acceptProposal(p: Proposal, s: Sponsor, contact: Contact, signer: Signer, deps: LifecycleDeps): Promise<Sponsor> {
  await openProposal(p, deps);
  const actor: Actor = { kind: 'sponsor', id: contact.userId ?? contact.id };
  let sponsor: Sponsor;
  if (p.kind === 'plan') sponsor = (await changePlan(s, { tier: p.tier!, cycle: p.cycle! }, actor, deps, signer, 'proposal')).sponsor;
  else sponsor = await endSponsorship(s, actor, deps, signer, 'proposal');
  await deps.store.decideProposal(p.id, 'accepted', contact.email, actor).catch((e: unknown) => {
    // Applied already (a double click): the first answer stands.
    if (!(e instanceof TransitionError)) throw e;
  });
  await emailBoard(
    `Proposal accepted: ${s.companyName}`,
    [`${signer.name} (${signer.title}) accepted the proposal for ${s.companyName}.`],
    [['Proposal', p.kind === 'plan' ? planLabel({ tier: p.tier!, cycle: p.cycle! }) : 'End the sponsorship']],
    { ...deps, key: `sponsor-board-proposal:${p.id}`, url: adminUrl(deps.origin, s.id) },
  );
  return sponsor;
}

export async function declineProposal(p: Proposal, s: Sponsor, contact: Contact, deps: LifecycleDeps): Promise<Proposal> {
  await openProposal(p, deps);
  const declined = await deps.store.decideProposal(p.id, 'declined', contact.email, { kind: 'sponsor', id: contact.userId ?? contact.id });
  await note(`:x: ${who(s)} declined the proposal (${p.kind === 'plan' ? planLabel({ tier: p.tier!, cycle: p.cycle! }) : 'end'}). ${contact.name} answered.`, deps);
  await emailBoard(`Proposal declined: ${s.companyName}`, [`${contact.name} declined the proposal for ${s.companyName}. Nothing changed.`], [], {
    ...deps,
    key: `sponsor-board-proposal:${p.id}`,
    url: adminUrl(deps.origin, s.id),
  });
  return declined;
}

/** Proposals past their date become `expired` (the daily job). Returns how many. */
export async function expireProposals(sponsors: Sponsor[], deps: LifecycleDeps): Promise<number> {
  let n = 0;
  for (const s of sponsors) {
    for (const p of await deps.store.proposals(s.id)) {
      if (p.status === 'open' && p.expiresAt <= nowIso(deps)) {
        await deps.store.decideProposal(p.id, 'expired', 'script', { kind: 'script', id: 'proposal-expiry' }).catch(() => undefined);
        await note(`:hourglass: The proposal to ${who(s)} expired without an answer.`, deps);
        n++;
      }
    }
  }
  return n;
}
