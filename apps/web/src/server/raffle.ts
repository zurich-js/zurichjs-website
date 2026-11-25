/**
 * Raffle add-ons on the server (docs/domains/sponsorship/raffles.md): the store, the raffle terms
 * gate, eligibility against the sponsorship, the views, Stripe and the webhook part.
 *
 * The raffle terms gate: the approved sponsorship agreement says sponsors run their own raffles and
 * ZurichJS gives no attendee data. A raffle ZurichJS runs therefore needs a raffle terms version the
 * owner approved (RAFFLE_TERMS_VERSION, with RAFFLE_TERMS_URL where sponsors read it). Without both,
 * sponsors can propose and the board can review, but nothing is offered, accepted or paid.
 *
 * Slack gets counts and company names only. Nothing here holds entrant data.
 */
import { createHash } from 'node:crypto';
import {
  RaffleRuleError,
  eligibility,
  postgresRaffleStore,
  settlement,
  type Draw,
  type Entry,
  type LedgerEntry,
  type Raffle,
  type RaffleEvent,
  type RaffleStore,
} from '@zurichjs/raffle';
import type { FeeStore } from '@zurichjs/sponsorship';
import { chfMinor, type Quote, type QuotePayment, type SponsorStore, type Sponsor } from '@zurichjs/sponsorship';
import { deactivateLink } from './sponsor-stripe.ts';
import { sanityMeetups, type LiveLookup } from './sponsor-coverage.ts';
import { longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';
import { stripeApi, stripeForm } from './stripe.ts';
import { SURCHARGE_NAME, quoteView } from './sponsor-fees.ts';
import { zurichDay } from './sponsor.ts';

type Fetch = typeof fetch;

/** The `source` of every raffle payment. The sponsorship part of the webhook skips it. */
export const RAFFLE_SOURCE = 'zurichjs.com/partners/raffle';

export const raffleStore = (env: Env): RaffleStore => postgresRaffleStore(membershipDb(env));

export type TermsGate = { open: true; version: string; url: string } | { open: false; reason: string };

export function approvedHttps(value: string | undefined): value is string {
  if (!value || !URL.canParse(value)) return false;
  const u = new URL(value);
  return u.protocol === 'https:' && !!u.hostname && !u.username && !u.password;
}

export async function requireHost(id: string, env: Env, deps: { meetups?: () => Promise<{ id: string }[]>; fetch?: typeof fetch }, now: Date) {
  const ok = deps.meetups
    ? (await deps.meetups()).some((m) => m.id === id)
    : (await sanityMeetups(env, deps.fetch)([id])).some((m) => m.id === id && m.status !== 'cancelled' && m.status !== 'postponed' && m.datetime && new Date(m.datetime) > now);
  if (!ok) throw new RaffleRuleError('The host meetup is no longer available.');
}

export function termsGate(env: Env): TermsGate {
  const version = env.RAFFLE_TERMS_VERSION?.trim();
  const url = env.RAFFLE_TERMS_URL?.trim();
  if (!version || !approvedHttps(url))
    return { open: false, reason: 'The raffle terms are not approved yet (RAFFLE_TERMS_VERSION and RAFFLE_TERMS_URL). Proposals can wait as drafts.' };
  return { open: true, version, url };
}

/**
 * The entrant rules gate: entries open only under a raffle rules version the owner approved
 * (RAFFLE_RULES_VERSION) and published (RAFFLE_RULES_URL). The version and URL are frozen on the
 * raffle when entries open.
 */
export function rulesGate(env: Env): TermsGate {
  const version = env.RAFFLE_RULES_VERSION?.trim();
  const url = env.RAFFLE_RULES_URL?.trim();
  if (!version || !approvedHttps(url)) return { open: false, reason: 'The raffle rules for entrants are not approved yet (RAFFLE_RULES_VERSION and RAFFLE_RULES_URL).' };
  return { open: true, version, url };
}

/**
 * The sharing gate: contacts reach a sponsor only when the owner configured all of it, and only for
 * a raffle whose sponsor accepted the raffle terms version that covers sharing:
 *   RAFFLE_SHARING_POLICY_VERSION   the approved raffle notice and recipient policy, as one version
 *   RAFFLE_SHARING_NOTICE_URL       where entrants read it (https)
 *   RAFFLE_RETENTION_DAYS           how long entries are kept after the raffle (1 to 3650)
 *   RAFFLE_SHARING_TERMS_VERSION    the raffle terms version (sponsor agreement) that allows sharing
 * Off by default; checked when entries open, on every release and on every read.
 */
export type SharingGate = { open: true; version: string; noticeUrl: string; retentionDays: number } | { open: false; reason: string };

export function retentionSchedule(env: Env): number | null {
  const days = Number(env.RAFFLE_RETENTION_DAYS);
  return env.RAFFLE_RETENTION_ANCHOR === 'fulfilled_or_cancelled' && Number.isInteger(days) && days > 0 && days <= 3650 ? days : null;
}
export function sharingGate(env: Env, r?: Pick<Raffle, 'acceptedVersion' | 'sharingVersion' | 'noticeUrl' | 'openedAt'>): SharingGate {
  const version = env.RAFFLE_SHARING_POLICY_VERSION?.trim();
  const noticeUrl = env.RAFFLE_SHARING_NOTICE_URL?.trim();
  const days = retentionSchedule(env) ?? 0;
  const terms = env.RAFFLE_SHARING_TERMS_VERSION?.trim();
  if (!version || !approvedHttps(noticeUrl) || !Number.isInteger(days) || days < 1 || days > 3650 || !terms)
    return {
      open: false,
      reason:
        'Sharing with sponsors is off: the raffle notice, recipient policy, retention period and sharing terms are not all approved (RAFFLE_SHARING_POLICY_VERSION, RAFFLE_SHARING_NOTICE_URL, RAFFLE_RETENTION_DAYS, RAFFLE_SHARING_TERMS_VERSION).',
    };
  if (r && (!termsGate(env).open || env.RAFFLE_TERMS_VERSION?.trim() !== r.acceptedVersion)) return { open: false, reason: 'The approved raffle agreement changed.' };
  if (r && r.acceptedVersion !== terms) return { open: false, reason: `The sponsor accepted raffle terms ${r.acceptedVersion ?? 'none'}, not ${terms}, which covers sharing.` };
  if (r?.openedAt && (r.sharingVersion !== version || r.noticeUrl !== noticeUrl)) return { open: false, reason: 'The approved sharing notice changed. Sharing is paused.' };
  return { open: true, version, noticeUrl, retentionDays: days };
}

/** An entrant's own link: a random token we email, kept only as its SHA-256. */
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
/** In the fragment, so the token never reaches a server log or a Referer header. */
export const manageUrl = (origin: string, token: string) => `${new URL('/raffle/manage', origin).toString()}#t=${token}`;
export const entryUrl = (origin: string, id: string) => `${new URL('/raffle', origin).toString()}?r=${encodeURIComponent(id)}`;

/** What anyone can see of a raffle once entries opened. No entrant data; winners by claim code only. */
export function publicRaffleView(r: Raffle, sponsorName: string, winningCodes: string[], now: Date, noticeUrl: string | null = null) {
  const state =
    r.stage === 'open'
      ? r.closesAt && now.toISOString() < r.closesAt
        ? 'open'
        : 'closed'
      : r.stage === 'closed' || r.stage === 'on_hold'
        ? 'closed'
        : r.stage === 'cancelled'
          ? 'cancelled'
          : 'drawn';
  return {
    id: r.id,
    prize: r.prize,
    quantity: r.quantity,
    eventTitle: r.eventTitle,
    eventDateLabel: longDate(r.eventDate),
    sponsorName,
    state,
    closesAt: r.closesAt,
    rulesUrl: r.rulesUrl,
    winningCodes: state === 'drawn' ? winningCodes : [],
    /** The optional box: who gets the contact, for what, and both privacy notices. Null when this raffle does not share. */
    sharing:
      r.sharingVersion && r.sharePurpose && r.sharePrivacyUrl && noticeUrl
        ? { version: r.sharingVersion, purpose: r.sharePurpose, sponsorPrivacyUrl: r.sharePrivacyUrl, noticeUrl }
        : null,
  };
}

export type PublicRaffleView = ReturnType<typeof publicRaffleView>;

/** Stages the public entry page shows; earlier ones are not public. */
export const PUBLIC_STAGES: readonly Raffle['stage'][] = ['open', 'closed', 'drawn', 'fulfilled', 'cancelled', 'on_hold'];

/** Throws when the sponsorship may not buy a raffle today. */
export function assertEligible(s: Sponsor, now: Date = new Date()): void {
  const e = eligibility(s, zurichDay(now));
  if (!e.ok) throw new RaffleRuleError(e.reason, 'not_eligible');
}

export const STAGE_LABEL: Record<Raffle['stage'], string> = {
  proposed: 'Proposed, waiting for the board',
  offered: 'Offered, waiting for you',
  ready: 'Ready',
  open: 'Entries open',
  closed: 'Entries closed',
  drawn: 'Winner drawn',
  fulfilled: 'Prize delivered',
  on_hold: 'On hold',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export const FUNDING_LABEL: Record<Raffle['funding'], string> = {
  unpaid: 'Not paid',
  paid: 'Paid',
  refund_pending: 'Refund being decided',
  refunded: 'Refunded',
  in_kind: 'Prize sent by you',
};

/** What the sponsor sees: their raffle, its offer and its payment, and entry counts. Never entrant data. */
export const raffleView = (r: Raffle, quote: Quote | null, counts: { total: number } | null = null, winningCode: string | null = null) => ({
  id: r.id,
  eventId: r.eventId,
  eventTitle: r.eventTitle,
  eventDate: r.eventDate,
  eventDateLabel: longDate(r.eventDate),
  prize: r.prize,
  quantity: r.quantity,
  budget: chfMinor(r.budgetMinor),
  fulfilment: r.fulfilment,
  stage: r.stage,
  stageLabel: STAGE_LABEL[r.stage],
  funding: r.funding,
  fundingLabel: FUNDING_LABEL[r.funding],
  termsVersion: r.termsVersion,
  accepted: !!r.acceptedVersion && r.acceptedVersion === r.termsVersion,
  quote: quote ? quoteView(quote) : null,
  payUrl: r.stage === 'offered' && r.funding === 'unpaid' ? r.paymentLinkUrl : null,
  reason: ['declined', 'cancelled', 'on_hold'].includes(r.stage) ? r.reason : null,
  entries: counts?.total ?? null,
  closesAt: r.closesAt,
  winningCode,
});

export type RaffleView = ReturnType<typeof raffleView>;

/** The board also sees flags, the ledger, the settlement and the history. */
export const adminRaffleView = (
  r: Raffle,
  quote: Quote | null,
  ledger: LedgerEntry[],
  events: RaffleEvent[],
  counts: { total: number; verified: number } = { total: 0, verified: 0 },
  draws: (Draw & { winner: Pick<Entry, 'name' | 'email' | 'claimCode'> })[] = [],
  origin = '',
  payments: QuotePayment[] = [],
  claimDecision: 'claimed' | 'expired' | null = null,
) => ({
  ...raffleView(r, quote, counts, draws.at(-1)?.winner.claimCode ?? null),
  claimDecision,
  verifiedEntries: counts.verified,
  rulesVersion: r.rulesVersion,
  entryUrl: origin && r.openedAt ? entryUrl(origin, r.id) : null,
  /** ZurichJS contacts the winner privately: the board sees the name and email, nobody else does. */
  draws: draws.map((d) => ({
    seq: d.seq,
    claimCode: d.winner.claimCode,
    name: d.winner.name,
    email: d.winner.email,
    eligibleCount: d.eligibleCount,
    entriesHash: d.entriesHash,
    reason: d.reason,
    at: d.at,
  })),
  payments: payments
    .filter((p) => p.subject === 'raffle' && p.subjectId === r.id)
    .map((p) => ({
      session: p.sessionId,
      quoteId: p.quoteId,
      amount: p.amountMinor,
      currency: p.currency,
      fee: p.feeMinor === null ? null : chfMinor(p.feeMinor),
      net: p.netMinor === null ? null : chfMinor(p.netMinor),
      review: p.reason,
    })),
  sponsorId: r.sponsorId,
  flags: r.flags,
  amount: r.amountMinor === null ? null : chfMinor(r.amountMinor),
  acceptedAt: r.acceptedAt,
  paymentLinkUrl: r.paymentLinkUrl,
  ledger: ledger.map((e) => ({ id: e.id, kind: e.kind, amount: chfMinor(e.amountMinor), note: e.note, reference: e.reference, at: e.at })),
  settlement: (() => {
    const s = settlement(r, ledger);
    return { ...s, receivedLabel: chfMinor(s.received), spentLabel: chfMinor(s.spent), differenceLabel: chfMinor(Math.abs(s.difference)) };
  })(),
  events: events.map((e) => ({ type: e.type, actor: e.actor.kind, at: e.at, payload: e.payload })).reverse(),
});

export type AdminRaffleView = ReturnType<typeof adminRaffleView> & { sharing?: SharingSummary };

/** Loads everything the board's view of one raffle needs. */
export async function loadAdminView(r: Raffle, raffles: RaffleStore, fees: FeeStore, origin: string, env: Env = {}): Promise<AdminRaffleView & { sharing: SharingSummary }> {
  const [quote, ledger, events, counts, draws, entries] = await Promise.all([
    r.quoteId ? fees.quote(r.quoteId) : null,
    raffles.ledger(r.id),
    raffles.events(r.id),
    raffles.entryCounts(r.id),
    raffles.draws(r.id),
    r.stage === 'drawn' || r.stage === 'fulfilled' ? raffles.entries(r.id) : [],
  ]);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const withWinners = draws.filter((d) => byId.has(d.entryId)).map((d) => ({ ...d, winner: byId.get(d.entryId)! }));
  const gate = sharingGate(env, r);
  return {
    ...adminRaffleView(
      r,
      quote,
      ledger,
      events,
      counts,
      withWinners,
      origin,
      await fees.payments(r.sponsorId),
      draws.length ? await raffles.claimDecision(r.id, draws.at(-1)!.seq) : null,
    ),
    sharing: { gateOpen: gate.open, reason: gate.open ? null : gate.reason, offered: !!r.sharingVersion, purpose: r.sharePurpose, sponsorPrivacyUrl: r.sharePrivacyUrl },
  };
}

export interface SharingSummary {
  gateOpen: boolean;
  reason: string | null;
  offered: boolean;
  purpose: string | null;
  sponsorPrivacyUrl: string | null;
}

/* ------------------------------------------------------------------ Stripe */

interface StripeDeps {
  env: Env;
  fetch?: Fetch;
}

const meta = (r: Raffle, quote: Quote) => ({ source: RAFFLE_SOURCE, raffleId: r.id, sponsorId: r.sponsorId, quoteId: quote.id });

/**
 * A single-use payment link for a raffle's frozen quote: the prize amount, and the processing fee
 * as its own line when the sponsor covers it. With a receipt (invoice). Replaces any earlier link.
 */
export async function createRafflePaymentLink(r: Raffle, quote: Quote, origin: string, deps: StripeDeps): Promise<{ id: string; url: string }> {
  const api = <T>(method: 'POST', path: string, params: URLSearchParams, key?: string) => stripeApi<T>(deps.env, deps.fetch ?? fetch, method, path, params, key);
  if (r.paymentLinkId) await closeRafflePaymentLink(r, deps);
  const what = `Raffle add-on: ${r.quantity > 1 ? `${r.quantity} × ` : ''}${r.prize}, ${r.eventTitle} (${longDate(r.eventDate)})`.slice(0, 500);
  const price = await api<{ id: string }>(
    'POST',
    'prices',
    stripeForm({ currency: 'chf', unit_amount: quote.baseMinor, product_data: { name: what.slice(0, 250) }, metadata: meta(r, quote) }),
    `raffle-price:${quote.id}`,
  );
  const surcharge = quote.surchargeMinor
    ? await api<{ id: string }>(
        'POST',
        'prices',
        stripeForm({ currency: 'chf', unit_amount: quote.surchargeMinor, product_data: { name: SURCHARGE_NAME }, metadata: meta(r, quote) }),
        `raffle-surcharge:${quote.id}`,
      )
    : null;
  const link = await api<{ id: string; url: string }>(
    'POST',
    'payment_links',
    stripeForm({
      line_items: [{ price: price.id, quantity: 1 }, ...(surcharge ? [{ price: surcharge.id, quantity: 1 }] : [])],
      metadata: meta(r, quote),
      payment_method_types: ['card'],
      payment_intent_data: { metadata: meta(r, quote), description: what },
      invoice_creation: { enabled: true, invoice_data: { metadata: meta(r, quote), description: what } },
      restrictions: { completed_sessions: { limit: 1 } },
      after_completion: { type: 'redirect', redirect: { url: `${new URL('/partners/account', origin).toString()}?raffle=paid` } },
    }),
    `raffle-link:${quote.id}`,
  );
  return link;
}

export async function closeRafflePaymentLink(r: Raffle, deps: StripeDeps): Promise<void> {
  if (!r.paymentLinkId) return;
  await deactivateLink(r.paymentLinkId, deps);
}

export async function holdIneligibleRaffles(raffles: RaffleStore, sponsors: SponsorStore, lookup: LiveLookup, now: Date) {
  const outstanding = await raffles.outstanding();
  const hosts = await lookup([...new Set(outstanding.map((r) => r.eventId))]).catch(() => null);
  const byId = new Map(hosts?.map((h) => [h.id, h]));
  const actor = { kind: 'script', id: 'raffle-eligibility' } as const;
  for (const raffle of outstanding) {
    const sponsor = await sponsors.get(raffle.sponsorId);
    const host = byId.get(raffle.eventId);
    const ended = !sponsor || !eligibility(sponsor, zurichDay(now)).ok;
    const moved = hosts !== null && (!host || host.status === 'cancelled' || host.status === 'postponed');
    if (!ended && !moved) continue;
    if (ended) await raffles.flag(raffle.id, 'late_payment', actor);
    if (moved) await raffles.flag(raffle.id, 'meetup_changed', actor);
    if (raffle.funding === 'paid') await raffles.flag(raffle.id, 'refund_review', actor);
    await raffles.moveStage(raffle.id, { from: raffle.stage, to: 'on_hold', actor, reason: ended ? 'The sponsorship is no longer eligible.' : 'The host meetup changed.' });
  }
}
