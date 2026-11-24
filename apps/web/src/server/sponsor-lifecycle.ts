/**
 * What can happen to a sponsorship, in one place for the sponsorship page, the admin area and
 * the daily job (docs/domains/sponsorship/overview.md). Every change needs the sponsor's agreement (owner,
 * 18th November 2026): they make it on their page, or we email them a link that fills it in and
 * they confirm. The agreement is signed in full once (start, or a new agreement version); later
 * changes and endings are a one-tick confirmation recorded under it. A contract signed outside
 * the site replaces the online signature. Each step emails the sponsor's confirmed contacts and
 * posts one Slack note.
 *
 *   startSponsorship   pay by card (Checkout); signed first unless a contract is on file
 *   changePlan         a higher tier on the same cycle now (prorated), anything else at renewal;
 *                      paid outside Stripe or not started yet: at once
 *   endSponsorship     with the paid period; can be undone until then
 *   suggestChange      we email a link with a change agreed in conversation
 *   recordPayment      a bank transfer we received (sponsorships paid outside Stripe)
 *   setBundle          the meetups and price per meetup of a one-time sponsorship (board)
 *   boardEnd           the board ends it outright (terminated, or an invitation withdrawn)
 */
import {
  AGREEMENT,
  bundleLabel,
  canChange,
  changeTiming,
  chf,
  cycleInfo,
  feeLabel,
  tierInfo,
  type Actor,
  type Contact,
  type Cycle,
  type EndedReason,
  type Sponsor,
  type SponsorMeetup,
  type Tier,
} from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import { accountUrl, afterLastMeetup, agreementUrl, emailSponsor, meetupLabel, note, planLabel, slackText, tierBenefits, who, zurichDay, type NotifyDeps } from './sponsor.ts';
import {
  cancelAtPeriodEnd,
  cancelNow,
  cancelPendingChange,
  checkPrices,
  closeCheckout,
  closePaymentLink,
  periodEnd,
  resumeSubscription,
  scheduleChange,
  startCardCheckout,
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

/** Who confirms: a full signature (name and role typed) or a confirmation under an earlier one. */
export interface Signer {
  name: string;
  title: string;
  email: string;
  /** `full`: typed now; `confirm`: one tick under the current agreement; `contract`: covered by a signed contract on file. */
  kind: 'full' | 'confirm' | 'contract';
}

/** "18th November 2026, 14:05 (Zurich time)" */
const zurichMoment = (iso: string) =>
  `${longDate(zurichDay(new Date(iso)))}, ${new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))} (Zurich time)`;

const today = (deps: LifecycleDeps) => zurichDay(deps.now?.() ?? new Date());
const nowIso = (deps: LifecycleDeps) => (deps.now?.() ?? new Date()).toISOString();
const summary = (s: Pick<Sponsor, 'tier' | 'cycle' | 'paymentMode'>) =>
  `${tierInfo(s.tier).name}, ${cycleInfo(s.cycle).label.toLowerCase()}, ${{ card: 'by card', manual: 'by bank transfer' }[s.paymentMode]}`;

/** Records the acceptance (start or change). A contract on file stands in for the start. */
async function sign(s: Sponsor, signer: Signer, context: 'start' | 'change', actor: Actor, deps: LifecycleDeps, what: string) {
  if (signer.kind === 'contract' && context === 'start') return null;
  return deps.store.acceptAgreement(
    s.id,
    { version: AGREEMENT.version, signerName: signer.name, signerTitle: signer.title, signerEmail: signer.email, context, summary: what.slice(0, 300) },
    actor,
  );
}

/**
 * The signer for a request. A full signature (name, role, current version) always works. A
 * one-tick confirmation works once the sponsorship has an agreement on the current version. With
 * a contract on file, neither is needed. Returns null when a signature is still missing.
 */
export async function resolveSigner(
  s: Sponsor | null,
  contact: Contact | null,
  input: { name?: string; title?: string; confirm?: boolean },
  email: string,
  deps: Pick<LifecycleDeps, 'store'>,
): Promise<Signer | null> {
  if (input.name && input.title) return { name: input.name, title: input.title, email, kind: 'full' };
  if (!s) return null;
  if ((await deps.store.documents(s.id)).length) return { name: contact?.name ?? email, title: 'Under the signed contract', email, kind: 'contract' };
  if (!input.confirm) return null;
  const agreements = await deps.store.agreements(s.id);
  if (!agreements.some((a) => a.version === AGREEMENT.version)) return null;
  const mine = agreements.find((a) => a.signerEmail === email);
  return { name: mine?.signerName ?? contact?.name ?? email, title: mine?.signerTitle ?? 'Contact', email, kind: 'confirm' };
}

/* ------------------------------------------------------------------ start */

/**
 * Sets up card payment. From `pending` (new or invited), or a running sponsorship paid outside
 * Stripe that moves to card (charged when its paid period ends). Returns Stripe Checkout's URL.
 */
export async function startSponsorship(s: Sponsor, signer: Signer, actor: Actor, deps: LifecycleDeps): Promise<{ checkoutUrl: string; sponsor: Sponsor }> {
  const switching = s.status === 'active' && s.paymentMode === 'manual';
  if (s.status !== 'pending' && !switching) throw new SponsorshipError('Payment is already set up for this sponsorship.');
  const meetups = s.cycle === 'once' ? await deps.store.meetups(s.id) : [];
  if (s.cycle === 'once') {
    if (switching) throw new SponsorshipError('A one-time sponsorship that is already paid needs no card.');
    if (!meetups.length) throw new SponsorshipError('Choose the meetup you sponsor first.', 400, 'eventId');
    if (meetups.some((m) => m.date < today(deps)))
      throw new SponsorshipError('A meetup of this sponsorship is already over. Write to hello@zurichjs.com to move it.', 409, 'eventId');
  }
  // Before signing or creating anything in Stripe: a missing price fails here, not half-way.
  await checkPrices(s, deps.stripe);
  const contacts = await deps.store.contacts(s.id);
  const sponsor = s.paymentMode === 'card' || switching ? s : await deps.store.update(s.id, { paymentMode: 'card' }, actor);
  const what = s.cycle === 'once' ? `${tierInfo(s.tier).name}, ${bundleLabel(s.tier, meetups.length, s.pricePerMeetup)}, by card` : summary({ ...sponsor, paymentMode: 'card' });
  const agreement = signer.kind === 'full' ? await sign(sponsor, signer, 'start', actor, deps, what) : null;
  const checkoutUrl = await startCardCheckout(sponsor, contacts, meetups, deps.store, deps.origin, deps.stripe);
  if (agreement)
    await emailSponsor(
      sponsor,
      'sponsor-agreement',
      (base) => ({
        ...base,
        signerName: signer.name,
        signerTitle: signer.title,
        acceptedAt: zurichMoment(agreement.acceptedAt),
        agreementVersion: longDate(agreement.version),
        agreementUrl: agreementUrl(deps.origin),
      }),
      { ...deps, key: `sponsor-agreement:${agreement.id}`, contacts, meetups },
    );
  return { checkoutUrl, sponsor };
}

/* ------------------------------------------------------------------ plan changes */

/** When a change would apply, in words for emails and the page. */
export async function appliesLabel(
  s: Sponsor,
  to: { tier: Tier; cycle: Cycle },
  deps: LifecycleDeps,
): Promise<{ timing: 'none' | 'now' | 'renewal'; text: string; from: string | null }> {
  const timing = s.status === 'pending' || s.paymentMode === 'manual' ? (s.tier === to.tier && s.cycle === to.cycle ? 'none' : 'now') : changeTiming(s, to);
  if (timing === 'none') return { timing, text: 'no change', from: null };
  if (timing === 'now') {
    if (s.status === 'pending') return { timing, text: 'now (nothing is charged until you pay)', from: null };
    if (s.paymentMode === 'manual') return { timing, text: 'as soon as you confirm (we bill the difference ourselves)', from: null };
    return { timing, text: 'now (Stripe charges only the difference for this term)', from: null };
  }
  const from = s.stripeSubscriptionId ? await periodEnd(s.stripeSubscriptionId, deps.stripe).catch(() => null) : null;
  return { timing, text: from ? `from ${longDate(from)} (your next renewal)` : 'from your next renewal', from };
}

/**
 * Changes tier and/or how often they pay. Not started yet or paid outside Stripe: at once (an open
 * Checkout is closed so the next one has the new price). Card: by changeTiming. Choosing the
 * current plan drops a change waiting for the renewal.
 */
export async function changePlan(
  s: Sponsor,
  to: { tier: Tier; cycle: Cycle },
  actor: Actor,
  deps: LifecycleDeps,
  signer: Signer | null,
): Promise<{ sponsor: Sponsor; timing: 'none' | 'now' | 'renewal'; from: string | null }> {
  if (s.cycle === 'once' || to.cycle === 'once') {
    if (s.status !== 'pending' || s.source !== 'self_serve')
      throw new SponsorshipError('A one-time sponsorship cannot be changed here. To sponsor more meetups, write to hello@zurichjs.com.');
  } else if (s.status !== 'pending' && !canChange(s)) throw new SponsorshipError('This sponsorship cannot be changed now.');
  const previous = planLabel(s);
  const { timing, from } = await appliesLabel(s, to, deps);
  let sponsor = s;

  if (timing === 'none') {
    if (s.stripeSubscriptionId && (await cancelPendingChange(s.stripeSubscriptionId, deps.stripe)))
      await note(`:leftwards_arrow_with_hook: ${who(s)} keeps ${previous}; the change waiting for the renewal is cancelled.`, deps);
    return { sponsor, timing, from };
  }
  if (signer && s.status !== 'pending') await sign(s, signer, 'change', actor, deps, `${summary({ ...s, ...to })} (from ${previous})`);

  if (timing === 'now') {
    if (s.status === 'pending') await closeCheckout(s, deps.store, deps.stripe);
    else if (s.stripeSubscriptionId) await upgradeNow(s.stripeSubscriptionId, to, deps.stripe);
    sponsor = await deps.store.update(s.id, { tier: to.tier, cycle: to.cycle }, actor);
  } else {
    await scheduleChange(s.stripeSubscriptionId!, to, deps.stripe);
  }

  if (s.status !== 'pending') {
    await emailSponsor({ ...sponsor, ...to }, 'sponsor-change', (base) => ({ ...base, timing, from: from ? longDate(from) : null, previous, manual: s.paymentMode === 'manual' }), {
      ...deps,
      key: `sponsor-change:${s.id}:${to.tier}-${to.cycle}:${today(deps)}`,
    });
    const manual = s.paymentMode === 'manual' ? ' They pay by bank transfer: bill the difference by hand.' : '';
    await note(
      timing === 'now'
        ? `:arrows_counterclockwise: ${who(s)} is now ${planLabel(to)}.${manual} Update the tier in Sanity if the logo size changes.`
        : `:arrows_counterclockwise: ${who(s)} moves to ${planLabel(to)} on ${from ? longDate(from) : 'the renewal'}.`,
      deps,
    );
  }
  return { sponsor, timing, from };
}

/* ------------------------------------------------------------------ ending */

/** Ends with the paid period. Returns the sponsorship, now `ending`. */
export async function endSponsorship(s: Sponsor, actor: Actor, deps: LifecycleDeps, signer: Signer | null): Promise<Sponsor> {
  if (s.cycle === 'once') throw new SponsorshipError('A one-time sponsorship ends by itself after its meetups.');
  if (s.status === 'ending') return s;
  if (s.status !== 'active' && s.status !== 'past_due') throw new SponsorshipError('Only a running sponsorship can be ended.');
  let endsAt: string | null;
  let dropped = false;
  if (s.stripeSubscriptionId) ({ endsAt, droppedChange: dropped } = await cancelAtPeriodEnd(s.stripeSubscriptionId, nowIso(deps), deps.stripe));
  else endsAt = s.paidUntil && s.paidUntil > today(deps) ? s.paidUntil : today(deps);
  if (signer) await sign(s, signer, 'change', actor, deps, `End of the sponsorship (${planLabel(s)})${endsAt ? `, last day ${lastDay(endsAt)}` : ''}`);
  const ending = await deps.store.transition(s.id, { from: s.status, to: 'ending', actor, endsAt });
  const last = ending.endsAt ? longDate(lastDay(ending.endsAt)) : 'the end of the paid period';
  await emailSponsor(ending, 'sponsor-ending', (base) => ({ ...base, lastDay: last, droppedChange: dropped ? 'the plan you scheduled' : null }), {
    ...deps,
    key: `sponsor-ending:${s.id}:${ending.endRequestedAt}`,
  });
  await note(`:wave: ${who(s)} ends with the paid period (last day ${last}).`, deps);
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

/** Stripe pages or a subscription an ended sponsorship still points at: a close that failed half-way. */
export const leftInStripe = (s: Sponsor) => !!(s.stripeSubscriptionId || s.checkoutSessionId || s.paymentLinkId);

/**
 * After any end: Stripe stops and nothing points at it any more (a later restart starts clean).
 * Each id is forgotten only once Stripe confirms, so after a failure it is safe to run again.
 */
export async function closeStripe(s: Sponsor, deps: LifecycleDeps): Promise<void> {
  if (s.stripeSubscriptionId) await cancelNow(s.stripeSubscriptionId, deps.stripe);
  await closeCheckout(s, deps.store, deps.stripe);
  await closePaymentLink(s, deps.store, deps.stripe);
  if (s.stripeSubscriptionId) await deps.store.linkStripe(s.id, { subscriptionId: null }, { kind: 'stripe', id: s.stripeSubscriptionId });
}

/**
 * The board ends a sponsorship outright (or withdraws an invitation). Our record changes first,
 * so Stripe's own "deleted" event finds it ended and does not call it unpaid. If Stripe fails
 * after that, the same request again finishes the job: it closes what is left in Stripe, then
 * emails and posts as the first attempt would have.
 */
export async function boardEnd(s: Sponsor, reason: Extract<EndedReason, 'terminated' | 'withdrawn'>, actor: Actor, deps: LifecycleDeps): Promise<Sponsor> {
  let ended = s;
  if (s.status === 'ended') {
    if (s.endedReason !== reason || !leftInStripe(s)) return s;
  } else {
    if (reason === 'withdrawn' && s.status !== 'pending') throw new SponsorshipError('Only a sponsorship that has not started can be withdrawn. End it instead.');
    if (reason === 'terminated' && s.status === 'pending') throw new SponsorshipError('A sponsorship that has not started is withdrawn, not ended.');
    ended = await deps.store.transition(s.id, { from: s.status, to: 'ended', actor, reason });
  }
  await closeStripe(ended, deps);
  if (reason === 'terminated') await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...deps, key: `sponsor-ended:${s.id}:${reason}` });
  await note(
    reason === 'withdrawn'
      ? `:no_entry: Invitation to ${who(s)} withdrawn.`
      : `:no_entry: ${who(s)} ended by ZurichJS. Stripe stopped, but nothing was refunded: refund the unused part in Stripe unless it was a code of conduct breach. Mark them as a past sponsor in Sanity.`,
    deps,
  );
  return ended;
}

/* ------------------------------------------------------------------ changes we suggest */

export type Suggestion = { kind: 'plan'; tier: Tier; cycle: Cycle } | { kind: 'end' };

/** The sponsorship page with the change filled in. */
export const changeUrl = (origin: string, c: Suggestion) => `${accountUrl(origin)}?change=${c.kind === 'end' ? 'end' : `${c.tier}-${c.cycle}`}`;

/** Reads `?change=` back: "builder-yearly" or "end". */
export function parseChange(v: string | null): Suggestion | null {
  if (v === 'end') return { kind: 'end' };
  const m = /^(supporter|friend|builder|champion)-(monthly|quarterly|yearly)$/.exec(v ?? '');
  return m ? { kind: 'plan', tier: m[1] as Tier, cycle: m[2] as Cycle } : null;
}

/**
 * Emails a change agreed in conversation (owner, 18th November 2026): the link opens the
 * sponsorship page with it filled in, and their confirmation there is the approval.
 */
export async function suggestChange(s: Sponsor, c: Suggestion, message: string | null, actor: Actor, deps: LifecycleDeps): Promise<{ url: string; emailed: number }> {
  if (s.cycle === 'once') throw new SponsorshipError('A one-time sponsorship is changed by editing its meetups and price.');
  if (c.kind === 'end' && s.status !== 'active' && s.status !== 'past_due') throw new SponsorshipError('Only a running sponsorship can be ended.');
  if (c.kind === 'plan') {
    if (s.status === 'pending') throw new SponsorshipError('It has not started yet: change the invited plan directly.');
    if (s.status !== 'active' && s.status !== 'past_due') throw new SponsorshipError('Only a running sponsorship can be changed.');
    if (c.tier === s.tier && c.cycle === s.cycle) throw new SponsorshipError('That is the plan they have now.', 400, 'tier');
  }
  const url = changeUrl(deps.origin, c);
  const applies = c.kind === 'plan' ? await appliesLabel(s, c, deps) : null;
  const last = c.kind === 'end' ? (s.stripeSubscriptionId ? await periodEnd(s.stripeSubscriptionId, deps.stripe).catch(() => null) : s.paidUntil) : null;
  const emailed = await emailSponsor(
    s,
    'sponsor-change-request',
    (base) => ({
      ...base,
      kind: c.kind,
      newPlan: c.kind === 'plan' ? { tierName: tierInfo(c.tier).name, feeLabel: feeLabel(c.tier, c.cycle), applies: applies!.text, benefits: tierBenefits(c.tier) } : null,
      lastDay: last ? longDate(lastDay(last)) : null,
      message,
      url,
    }),
    { ...deps, key: `sponsor-change-request:${s.id}:${c.kind === 'end' ? 'end' : `${c.tier}-${c.cycle}`}:${today(deps)}` },
  );
  await deps.store.log(s.id, 'change_suggested', actor, c.kind === 'end' ? { kind: 'end' } : { kind: 'plan', tier: c.tier, cycle: c.cycle });
  await note(`:memo: Change sent to ${who(s)} to confirm: ${c.kind === 'plan' ? planLabel(c) : 'end the sponsorship'}.`, deps);
  return { url, emailed };
}

/* ------------------------------------------------------------------ payments outside Stripe */

export interface RecordedPayment {
  /** The first day not paid for (YYYY-MM-DD). */
  paidUntil: string;
  /** CHF, if noted. */
  amount: number | null;
  /** Their bank reference, if any. */
  reference: string | null;
}

/**
 * A payment received outside Stripe (a bank transfer against our own invoice). Only for
 * sponsorships paid that way or not started yet; card sponsorships are paid in Stripe. Moves paid
 * through on, starts a sponsorship that had not started, emails the sponsor a confirmation.
 */
export async function recordPayment(s: Sponsor, p: RecordedPayment, actor: Actor, deps: LifecycleDeps): Promise<Sponsor> {
  if (s.status === 'ended' || s.status === 'ending') throw new SponsorshipError('This sponsorship has ended or is ending; record nothing more.', 409, 'paidUntil');
  if (s.stripeSubscriptionId) throw new SponsorshipError('This sponsorship pays by card in Stripe. See the payment there.', 409, 'paidUntil');
  // The same payment again after a failure half-way: an earlier attempt started recording this date
  // (`payment_recording`) and did not finish (`payment_recorded`). Only that is resumed; any other
  // request for the current date is refused as before (an imported sponsorship's own date included).
  const events = await deps.store.events(s.id);
  const started = (type: string) => events.some((e) => e.type === type && e.payload.paidUntil === p.paidUntil);
  const resume = s.paidUntil === p.paidUntil && started('payment_recording') && !started('payment_recorded');
  if (!resume) {
    if (s.paidUntil && p.paidUntil <= s.paidUntil) throw new SponsorshipError(`It is already paid through ${longDate(lastDay(s.paidUntil))}. Give a later date.`, 400, 'paidUntil');
    if (p.paidUntil <= today(deps)) throw new SponsorshipError('Give a date after today: the first day not paid for.', 400, 'paidUntil');
  }
  await closeCheckout(s, deps.store, deps.stripe);
  await closePaymentLink(s, deps.store, deps.stripe);
  if (!resume) await deps.store.log(s.id, 'payment_recording', actor, { paidUntil: p.paidUntil });
  let updated = resume ? s : await deps.store.update(s.id, { paidUntil: p.paidUntil, paymentMode: 'manual', ...(s.startedAt ? {} : { startedAt: today(deps) }) }, actor);
  if (updated.status === 'pending' || updated.status === 'past_due')
    updated = await deps.store.transition(s.id, { from: updated.status, to: 'active', actor, payload: { recorded: true } });
  await deps.store.log(s.id, 'payment_recorded', actor, { paidUntil: p.paidUntil, ...(p.amount ? { amount: p.amount } : {}), ...(p.reference ? { reference: p.reference } : {}) });
  const paidThrough = longDate(lastDay(p.paidUntil));
  await emailSponsor(updated, 'sponsor-payment-recorded', (base) => ({ ...base, amount: p.amount ? chf(p.amount) : null, paidThrough, reference: p.reference }), {
    ...deps,
    to: 'billing',
    key: `sponsor-payment-recorded:${s.id}:${p.paidUntil}`,
  });
  await note(`:moneybag: Payment recorded for ${who(updated)}${p.amount ? `: ${chf(p.amount)}` : ''}, paid through ${paidThrough}. They were emailed a confirmation.`, deps);
  return updated;
}

/* ------------------------------------------------------------------ one-time bundles */

/**
 * The meetups (and the price per meetup, null = list price) of a one-time sponsorship, set by the
 * board: a bundle, or moving it when a meetup is cancelled. Not started yet: any open payment page
 * is closed, so the next one has the new total. Running: paid through follows the last meetup.
 */
export async function setBundle(s: Sponsor, meetups: SponsorMeetup[], pricePerMeetup: number | null, actor: Actor, deps: LifecycleDeps): Promise<Sponsor> {
  if (s.cycle !== 'once') throw new SponsorshipError('Only a one-time sponsorship has meetups.');
  if (s.status === 'ended') throw new SponsorshipError('This sponsorship has ended.');
  if (!meetups.length) throw new SponsorshipError('Choose at least one meetup.', 400, 'eventIds');
  const before = await deps.store.meetups(s.id);
  const priceChanged = pricePerMeetup !== s.pricePerMeetup || before.length !== meetups.length;
  if (priceChanged && s.status !== 'pending') throw new SponsorshipError('It is paid already: only the meetups can move, not the price or the number of meetups.', 409, 'eventIds');
  // Not started yet: the open payment pages close first, so a failure saves nothing and never leaves
  // a page payable at the old total.
  if (s.status === 'pending') {
    await closeCheckout(s, deps.store, deps.stripe);
    await closePaymentLink(s, deps.store, deps.stripe);
  }
  await deps.store.setMeetups(s.id, meetups, actor);
  const updated = await deps.store.update(
    s.id,
    s.status === 'pending' ? (pricePerMeetup !== s.pricePerMeetup ? { pricePerMeetup } : {}) : { paidUntil: afterLastMeetup(meetups) },
    actor,
  );
  await note(
    `:calendar: ${who(s)} now covers ${meetups.map((m) => slackText(meetupLabel(m))).join('; ')}${s.status === 'pending' ? ` at ${bundleLabel(s.tier, meetups.length, pricePerMeetup)}` : ''}.`,
    deps,
  );
  return updated;
}
