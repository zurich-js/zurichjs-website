/**
 * The board's side of sponsorships (/admin/sponsors, API under /api/membership/admin/sponsors,
 * behind the same ADMIN_PASSWORD session as memberships: the cookie is scoped to
 * /api/membership/admin, so the sponsor admin API lives there too).
 *
 *   invite      a company to sponsor: `pending`, with the plan agreed; the contact is emailed
 *               to sign (unless a contract is attached) and pay by card
 *   import      an existing sponsorship paid outside Stripe: `active`, paid by bank transfer
 *               through a date; the contact is emailed to take it over online
 *   bundle      a one-time sponsorship for several meetups at a price per meetup (or moved)
 *   contract    a contract signed outside the site, attached as a PDF (replaces signing online)
 *   link        a Stripe payment link for a one-time sponsorship with a contract on file
 *   record      a bank transfer received (sponsorships paid outside Stripe)
 *   suggest     email a change agreed in conversation; the sponsor confirms it on their page
 *   end         outright (terminated, or an invitation withdrawn); logged
 *   to do       what needs someone: see `attention`
 */
import {
  DuplicateContact,
  FeeGateClosed,
  isCycle,
  isTier,
  type Contact,
  type FeeStore,
  type NewSponsor,
  type Sponsor,
  type SponsorMeetup,
  type SponsorStore,
} from '@zurichjs/sponsorship';
import { siteOrigin } from './auth.ts';
import { adminPassword, isAdmin, sameOrigin } from './admin-auth.ts';
import { lastDay, longDate } from './dates.ts';
import { fail, isEmail, text, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { afterLastMeetup, emailSponsor, meetupLabel, note, planLabel, slackText, sponsorFee, sponsorStore, who, zurichDay } from './sponsor.ts';
import { isDate, parseDetails, parsePrice, type Parsed } from './sponsor-input.ts';
import { SponsorshipError, type LifecycleDeps } from './sponsor-lifecycle.ts';
import type { LogoStore } from './sponsor-logo.ts';
import { knownFailure, lifecycleDeps, type Meetup } from './sponsor-route.ts';
import { closeCheckout } from './sponsor-stripe.ts';
import { StripeUnavailable } from './stripe.ts';

export interface SponsorAdminDeps {
  env?: Env;
  store?: SponsorStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: (m: string) => void;
  now?: number;
  logos?: LogoStore;
  meetups?: () => Promise<Meetup[]>;
  /** Tariffs and quotes (sponsor-fees.ts); the database by default. */
  fees?: FeeStore;
}

export interface SponsorAdminCtx {
  env: Env;
  store: SponsorStore;
  origin: string;
  lifecycle: LifecycleDeps;
}

export const BOARD = { kind: 'board', id: 'admin' } as const;

export async function sponsorAdminRoute(request: Request, deps: SponsorAdminDeps, fn: (ctx: SponsorAdminCtx) => Promise<Response>, what: string): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!adminPassword(env)) return fail(503, 'The admin area is not set up yet (ADMIN_PASSWORD).');
  if (!isAdmin(request, env, deps.now)) return fail(401, 'Sign in to the admin area.');
  if (request.method !== 'GET' && !sameOrigin(request)) return fail(403, 'Refused: the request did not come from this site.');
  try {
    const store = deps.store ?? sponsorStore(env);
    const origin = siteOrigin(env);
    const now = deps.now === undefined ? undefined : () => new Date(deps.now!);
    return await fn({ env, store, origin, lifecycle: lifecycleDeps(env, store, origin, { fetch: deps.fetch, slack: deps.slack, log: deps.log, now }) });
  } catch (cause) {
    const known = knownFailure(cause);
    if (known) return known;
    if (cause instanceof FeeGateClosed) return fail(409, cause.message, { field: 'feeChoice' });
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) return fail(503, `Not configured: ${(cause as Error).message}`);
    console.error(`[sponsorship-admin] ${what} failed`, cause);
    return fail(502, `Could not ${what}. Try again; details are in the function log.`);
  }
}

const no = (error: string, field: string) => ({ ok: false as const, error, field });

export interface NewSponsorInput {
  mode: 'invite' | 'import';
  details: Pick<NewSponsor, 'companyName' | 'legalName' | 'billingAddress' | 'vatId' | 'website'>;
  contact: { name: string; email: string };
  tier: Sponsor['tier'];
  cycle: Sponsor['cycle'];
  /** One-time: the Sanity event ids of the meetups. */
  eventIds: string[];
  pricePerMeetup: number | null;
  /** Import: when it started, and the first day not paid for. */
  startedAt: string | null;
  paidUntil: string | null;
  notes: string | null;
  /** Our words in the email. */
  message: string | null;
  sendEmail: boolean;
}

export function parseNewSponsor(body: Record<string, unknown>): Parsed<NewSponsorInput> {
  const mode = body.mode === 'import' ? 'import' : body.mode === 'invite' || body.mode === undefined ? 'invite' : null;
  if (!mode) return no('Choose invite or import.', 'mode');
  const details = parseDetails(body, true);
  if (!details.ok) return details;
  const name = text(body.contactName, 200);
  if (!name || /:\/\/|www\./i.test(name)) return no('Add the contact’s name.', 'contactName');
  const email = text(body.contactEmail, 254);
  if (!email || !isEmail(email)) return no('Add the contact’s email.', 'contactEmail');
  if (!isTier(body.tier)) return no('Choose a tier.', 'tier');
  if (!isCycle(body.cycle)) return no('Choose how often they pay.', 'cycle');
  const once = body.cycle === 'once';
  const eventIds = Array.isArray(body.eventIds) ? [...new Set(body.eventIds.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 200))] : [];
  if (once && !eventIds.length) return no('Choose at least one meetup.', 'eventIds');
  const price = parsePrice(body.pricePerMeetup);
  if (!price.ok) return price;
  if (!once && price.value !== null) return no('A custom price is only for one-time sponsorships.', 'pricePerMeetup');
  const startedAt = body.startedAt ? (isDate(body.startedAt) ? body.startedAt : null) : null;
  const paidUntil = body.paidUntil ? (isDate(body.paidUntil) ? body.paidUntil : null) : null;
  if (body.startedAt && !startedAt) return no('Give the date as YYYY-MM-DD.', 'startedAt');
  if (body.paidUntil && !paidUntil) return no('Give the date as YYYY-MM-DD.', 'paidUntil');
  if (mode === 'import' && !startedAt) return no('Say when the sponsorship started.', 'startedAt');
  if (mode === 'import' && !once && !paidUntil) return no('Say until when it is paid (the first day not paid for).', 'paidUntil');
  if (startedAt && paidUntil && paidUntil <= startedAt) return no('Paid until must be after the start.', 'paidUntil');
  const notes = text(body.notes, 4000);
  if (notes === false) return no('Keep the notes under 4000 characters, without < or >.', 'notes');
  const message = text(body.message, 2000);
  if (message === false) return no('Keep the message under 2000 characters, without < or >.', 'message');
  return {
    ok: true,
    value: {
      mode,
      details: {
        companyName: details.value.companyName!,
        legalName: details.value.legalName ?? null,
        billingAddress: details.value.billingAddress ?? null,
        vatId: details.value.vatId ?? null,
        website: details.value.website ?? null,
      },
      contact: { name, email: email.toLowerCase() },
      tier: body.tier,
      cycle: body.cycle,
      eventIds: once ? eventIds : [],
      pricePerMeetup: once ? price.value : null,
      startedAt,
      paidUntil,
      notes: notes ?? null,
      message: message ?? null,
      sendEmail: body.sendEmail !== false,
    },
  };
}

/** The meetups for these event ids, from the upcoming published ones. Refuses unknown or past ones. */
export async function resolveMeetups(eventIds: string[], meetups: () => Promise<Meetup[]>): Promise<SponsorMeetup[]> {
  const upcoming = await meetups();
  const out = eventIds.map((id) => upcoming.find((m) => m.id === id));
  if (out.some((m) => !m)) throw new SponsorshipError('A chosen meetup is not upcoming (or not published). Reload the list.', 400, 'eventIds');
  return out.map((m) => ({ eventId: m!.id, title: m!.title, date: m!.date }));
}

/** Emails the invitation (new) or the "now online" note (imported) to these contacts. */
export async function sendInvitation(s: Sponsor, contacts: Contact[], message: string | null, deps: LifecycleDeps): Promise<number> {
  const day = zurichDay(deps.now?.() ?? new Date());
  const existing = s.source === 'imported' && s.paidUntil && s.cycle !== 'once' ? longDate(lastDay(s.paidUntil)) : null;
  const contractOnFile = (await deps.store.documents(s.id)).length > 0;
  return emailSponsor(s, 'sponsor-invite', (base) => ({ ...base, message, existingPaidThrough: existing, contractOnFile }), {
    ...deps,
    contacts,
    key: `sponsor-invite:${s.id}:${s.tier}-${s.cycle}:${day}`,
  });
}

export async function createSponsor(
  input: NewSponsorInput,
  deps: LifecycleDeps & { meetups: () => Promise<Meetup[]> },
): Promise<{ result: 'created'; sponsor: Sponsor; contact: Contact; emailed: number } | { result: 'exists'; contact: Contact }> {
  const { store } = deps;
  const existing = await store.contactByEmail(input.contact.email);
  // A colleague-added contact nobody accepted does not block the board: it is removed and re-added here.
  if (existing && !(existing.addedBy === 'sponsor' && !existing.userId)) return { result: 'exists', contact: existing };
  const meetups = input.cycle === 'once' ? await resolveMeetups(input.eventIds, deps.meetups) : [];
  if (existing) await store.removeContact(existing.id, BOARD);
  const imported = input.mode === 'import';
  let created: { sponsor: Sponsor; contact: Contact };
  try {
    created = await store.create(
      {
        ...input.details,
        tier: input.tier,
        cycle: input.cycle,
        paymentMode: imported ? 'manual' : 'card',
        status: 'pending',
        source: imported ? 'imported' : 'invited',
        startedAt: imported ? input.startedAt : null,
        paidUntil: imported ? (input.cycle === 'once' ? afterLastMeetup(meetups) : input.paidUntil) : null,
        pricePerMeetup: input.pricePerMeetup,
        notes: input.notes,
      },
      { email: input.contact.email, name: input.contact.name, role: 'primary', addedBy: 'board' },
      BOARD,
    );
  } catch (cause) {
    if (cause instanceof DuplicateContact) return { result: 'exists', contact: (await store.contactByEmail(input.contact.email))! };
    throw cause;
  }
  let sponsor = created.sponsor;
  if (meetups.length) await store.setMeetups(sponsor.id, meetups, BOARD);
  if (imported) sponsor = await store.transition(sponsor.id, { from: 'pending', to: 'active', actor: BOARD, payload: { imported: true } });
  const emailed = input.sendEmail ? await sendInvitation(sponsor, [created.contact], input.message, deps) : 0;
  await note(
    `:envelope: ${imported ? 'Existing sponsorship added' : 'Invited to sponsor'}: ${who(sponsor)}, ${sponsorFee(sponsor, meetups)}${
      meetups.length ? ` (${meetups.map((m) => slackText(meetupLabel(m))).join('; ')})` : ''
    }${imported && sponsor.paidUntil && sponsor.cycle !== 'once' ? `, paid through ${longDate(lastDay(sponsor.paidUntil))}` : ''}. ${emailed ? `${slackText(input.contact.name)} was emailed.` : 'No email sent.'}`,
    deps,
  );
  return { result: 'created', sponsor, contact: created.contact, emailed };
}

/** The plan of an invitation nobody has paid yet, changed directly (no confirmation needed: they confirm by paying). */
export async function changeInvitedPlan(s: Sponsor, plan: { tier: Sponsor['tier']; cycle: Sponsor['cycle'] }, deps: LifecycleDeps): Promise<Sponsor> {
  if (s.status !== 'pending') throw new SponsorshipError('It has started: send them a change to confirm instead.');
  if (plan.cycle === 'once' && s.cycle !== 'once') throw new SponsorshipError('To make it one-time, withdraw this invitation and invite them for the meetups.', 400, 'cycle');
  if (s.cycle === 'once' && plan.cycle !== 'once') throw new SponsorshipError('To make it recurring, withdraw this invitation and invite them again.', 400, 'cycle');
  await closeCheckout(s, deps.store, deps.stripe);
  const updated = await deps.store.update(s.id, { tier: plan.tier, cycle: plan.cycle }, BOARD);
  await note(`:pencil2: Invitation to ${who(s)} changed to ${planLabel(updated)}.`, deps);
  return updated;
}

/* ------------------------------------------------------------------ what needs someone */

export type Attention = 'payment_overdue' | 'manual_overdue' | 'manual_due_soon' | 'invite_waiting' | 'new_logo' | 'meetup_passed_unpaid';

export const ATTENTION_LABEL: Record<Attention, string> = {
  payment_overdue: 'Payment overdue',
  manual_overdue: 'Bank transfer overdue',
  manual_due_soon: 'Bank transfer due soon',
  invite_waiting: 'Invitation not answered',
  new_logo: 'New logo for Sanity',
  meetup_passed_unpaid: 'Meetup passed, unpaid',
};

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** What a sponsorship needs from the board today, most urgent first. */
export async function attention(s: Sponsor, store: SponsorStore, today: string): Promise<Attention[]> {
  const out: Attention[] = [];
  if (s.status === 'past_due') out.push('payment_overdue');
  const manual = s.paymentMode === 'manual' && !s.stripeSubscriptionId && s.cycle !== 'once';
  if ((s.status === 'active' || s.status === 'past_due') && manual && s.paidUntil) {
    const left = days(today, s.paidUntil);
    if (left <= 0) out.push('manual_overdue');
    else if (left <= 30) out.push('manual_due_soon');
  }
  if (s.status === 'pending') {
    if (s.cycle === 'once') {
      const meetups = await store.meetups(s.id);
      if (meetups.some((m) => m.date < today)) out.push('meetup_passed_unpaid');
    }
    if (days(s.createdAt.slice(0, 10), today) >= 7) out.push('invite_waiting');
  }
  if (s.status !== 'ended') {
    const logo = (await store.logos(s.id))[0];
    // A logo the board uploaded itself needs no reminder.
    if (logo && logo.uploadedBy !== 'board' && days(logo.uploadedAt.slice(0, 10), today) <= 14) out.push('new_logo');
  }
  return out;
}
