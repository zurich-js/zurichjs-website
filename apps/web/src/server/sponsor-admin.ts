/**
 * The board's side of sponsorships (/admin/sponsors, API under /api/membership/admin/sponsors,
 * behind the same ADMIN_PASSWORD session as memberships: the cookie is scoped to
 * /api/membership/admin, so the sponsor admin API lives there too).
 *
 *   invite        a company to sponsor: a `pending` sponsorship with the plan agreed, emailed to
 *                 the contact to accept the agreement and pay (card or invoice)
 *   import        an existing sponsorship paid outside Stripe: `active`, paid directly until a
 *                 date; the contact is emailed to take it over online (and move to Stripe later)
 *   record        a payment made outside Stripe (extends paid until; starts a pending one)
 *   propose       a change agreed in conversation; the sponsor confirms it in the portal
 *   end           outright (terminated, or an invitation withdrawn); logged
 *   logos         review: approve or ask for another file
 */
import { DuplicateContact, isCycle, isRecurring, isTier, type Contact, type NewSponsor, type Sponsor, type SponsorStore } from '@zurichjs/sponsorship';
import { siteOrigin } from './auth.ts';
import { adminPassword, isAdmin, sameOrigin } from './admin-auth.ts';
import { lastDay, longDate } from './dates.ts';
import { fail, isEmail, text, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { emailSponsor, note, planLabel, sponsorStore, who } from './sponsor.ts';
import { parseDetails, type Parsed } from './sponsor-input.ts';
import { type LifecycleDeps } from './sponsor-lifecycle.ts';
import type { LogoStore } from './sponsor-logo.ts';
import { knownFailure, lifecycleDeps, type Meetup } from './sponsor-route.ts';
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
    const known = knownFailure(cause) ?? adminFailure(cause);
    if (known) return known;
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) return fail(503, `Not configured: ${(cause as Error).message}`);
    console.error(`[sponsorship-admin] ${what} failed`, cause);
    return fail(502, `Could not ${what}. Try again; details are in the function log.`);
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const no = (error: string, field: string) => ({ ok: false as const, error, field });

export interface NewSponsorInput {
  mode: 'invite' | 'import';
  details: Pick<NewSponsor, 'companyName' | 'legalName' | 'billingAddress' | 'vatId' | 'website'>;
  contact: { name: string; email: string };
  tier: Sponsor['tier'];
  cycle: Sponsor['cycle'];
  eventId: string | null;
  /** Import: the first day not paid for, and when it started. */
  paidUntil: string | null;
  startedAt: string | null;
  notes: string | null;
  /** The organiser's words in the email. */
  message: string | null;
  sendEmail: boolean;
}

export function parseNewSponsor(body: Record<string, unknown>): Parsed<NewSponsorInput> {
  const mode = body.mode === 'import' ? 'import' : body.mode === 'invite' || body.mode === undefined ? 'invite' : null;
  if (!mode) return no('Choose invite or import.', 'mode');
  const details = parseDetails(body, true);
  if (!details.ok) return details;
  const name = text(body.contactName, 200);
  if (!name) return no('Add the contact’s name.', 'contactName');
  const email = text(body.contactEmail, 254);
  if (!email || !isEmail(email)) return no('Add the contact’s email.', 'contactEmail');
  if (!isTier(body.tier)) return no('Choose a tier.', 'tier');
  if (!isCycle(body.cycle)) return no('Choose the billing.', 'cycle');
  const eventId = typeof body.eventId === 'string' && body.eventId ? body.eventId : null;
  if (body.cycle === 'once' && !eventId) return no('Choose the meetup for a one-meetup sponsorship.', 'eventId');
  const paidUntil = typeof body.paidUntil === 'string' && body.paidUntil ? body.paidUntil : null;
  const startedAt = typeof body.startedAt === 'string' && body.startedAt ? body.startedAt : null;
  if (paidUntil && !DATE.test(paidUntil)) return no('Give the date as YYYY-MM-DD.', 'paidUntil');
  if (startedAt && !DATE.test(startedAt)) return no('Give the date as YYYY-MM-DD.', 'startedAt');
  if (mode === 'import' && isRecurring(body.cycle) && !paidUntil) return no('Say until when it is paid (the first day not paid for).', 'paidUntil');
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
      eventId,
      paidUntil,
      startedAt,
      notes: notes ?? null,
      message: message ?? null,
      sendEmail: body.sendEmail !== false,
    },
  };
}

/** Emails a contact the invitation (new) or the "now online" note (imported). */
export async function sendInvitation(s: Sponsor, contacts: Contact[], message: string | null, deps: LifecycleDeps): Promise<number> {
  const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const existing = s.source === 'imported' && s.paidUntil ? longDate(lastDay(s.paidUntil)) : null;
  return emailSponsor(s, 'sponsor-invite', (base) => ({ ...base, message, existingPaidThrough: existing }), {
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
  if (existing) return { result: 'exists', contact: existing };
  let event: Pick<Sponsor, 'eventId' | 'eventTitle' | 'eventDate'> = { eventId: null, eventTitle: null, eventDate: null };
  if (input.cycle === 'once') {
    const m = (await deps.meetups()).find((x) => x.id === input.eventId);
    if (!m) throw new SponsorAdminError('That meetup is not upcoming (or not published).', 'eventId');
    event = { eventId: m.id, eventTitle: m.title, eventDate: m.date };
  }
  const imported = input.mode === 'import';
  const today = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  let created: { sponsor: Sponsor; contact: Contact };
  try {
    created = await store.create(
      {
        ...input.details,
        tier: input.tier,
        cycle: input.cycle,
        paymentMode: imported ? 'manual' : 'invoice',
        status: 'pending',
        source: imported ? 'imported' : 'invited',
        startedAt: imported ? (input.startedAt ?? today) : null,
        paidUntil: imported ? (input.cycle === 'once' && event.eventDate ? nextDay(event.eventDate) : input.paidUntil) : null,
        ...event,
        notes: input.notes,
      },
      { email: input.contact.email, name: input.contact.name, role: 'primary' },
      BOARD,
    );
  } catch (cause) {
    if (cause instanceof DuplicateContact) return { result: 'exists', contact: (await store.contactByEmail(input.contact.email))! };
    throw cause;
  }
  let sponsor = created.sponsor;
  if (imported) sponsor = await store.transition(sponsor.id, { from: 'pending', to: 'active', actor: BOARD, payload: { imported: true } });
  const emailed = input.sendEmail ? await sendInvitation(sponsor, [created.contact], input.message, deps) : 0;
  await note(
    `:envelope: ${imported ? 'Existing sponsorship added' : 'Invited to sponsor'}: ${who(sponsor)}, ${planLabel(sponsor)}${imported && sponsor.paidUntil ? `, paid through ${longDate(lastDay(sponsor.paidUntil))}` : ''}. ${emailed ? `${input.contact.name} was emailed.` : 'No email sent.'}`,
    deps,
  );
  return { result: 'created', sponsor, contact: created.contact, emailed };
}

export class SponsorAdminError extends Error {
  readonly field: string;
  constructor(message: string, field: string) {
    super(message);
    this.field = field;
  }
}

const nextDay = (iso: string) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * A payment made outside Stripe (bank transfer agreed directly): paid until moves on, and a
 * sponsorship that had not started starts now (the board's word for it).
 */
export async function recordPayment(s: Sponsor, paidUntil: string, deps: LifecycleDeps): Promise<Sponsor> {
  if (!DATE.test(paidUntil)) throw new SponsorAdminError('Give the date as YYYY-MM-DD.', 'paidUntil');
  if (s.status === 'ended') throw new SponsorAdminError('This sponsorship has ended. Invite them again instead.', 'paidUntil');
  const today = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  let updated = await deps.store.update(
    s.id,
    { paidUntil, ...(s.startedAt ? {} : { startedAt: today }), ...(s.stripeSubscriptionId ? {} : { paymentMode: 'manual' as const }) },
    BOARD,
  );
  if (updated.status === 'pending' || updated.status === 'past_due')
    updated = await deps.store.transition(s.id, { from: updated.status, to: 'active', actor: BOARD, payload: { recorded: true } });
  await note(`:moneybag: Payment recorded by the board for ${who(updated)}: paid through ${longDate(lastDay(paidUntil))}.`, deps);
  return updated;
}

/** Turns a SponsorAdminError into a 400 with its field. */
export const adminFailure = (cause: unknown): Response | null => (cause instanceof SponsorAdminError ? fail(400, cause.message, { field: cause.field }) : null);
