/**
 * Card tariffs, payment quotes and the payments made against them (fees.ts), in memory for tests
 * and on Postgres in functions.
 *
 * A quote owns its payment link. There is at most one open quote per sponsorship or raffle; a new
 * offer supersedes the open one, and a superseded quote's link is marked for closing. The link of
 * the open quote is published only after `attachLink` confirms the quote still owns the offer.
 *
 * Every payment is recorded by its Stripe session (`settlePayment`), whether or not it matches.
 * A payment pays its quote only when owner, subject, currency, amount and link all match the open
 * quote; anything else is kept for the board's review and never pays a quote by itself.
 */
import type { QuoteFigures, Tariff } from './fees.ts';
import type { Queryable } from './postgres.ts';

export type QuoteSubject = 'sponsorship' | 'raffle';
/** `accepted`: a recurring quote the sponsor agreed to, in force for every renewal until superseded. */
export type QuoteStatus = 'open' | 'accepted' | 'paid' | 'superseded' | 'void';

/** How often a recurring quote is charged; null for a one-off payment. */
export type QuoteInterval = 'month' | 'quarter' | 'year';
/**
 * The quote's payment link. `creating`: asked of Stripe, not published yet. `live`: published.
 * `closing`: must be switched off (the quote no longer owns the offer). `closed`: switched off.
 */
export type LinkState = 'none' | 'creating' | 'live' | 'closing' | 'closed';

export interface Quote extends QuoteFigures {
  id: string;
  sponsorId: string;
  subject: QuoteSubject;
  /** The raffle id for a raffle; null for the sponsorship itself. */
  subjectId: string | null;
  /** What it pays for, as the sponsor reads it ("Sponsorship of 3 meetups"). */
  purpose: string;
  interval: QuoteInterval | null;
  status: QuoteStatus;
  createdBy: string;
  createdAt: string;
  paidAt: string | null;
  /** A Stripe session for a payment; the subscription item of the surcharge line for a recurring quote. */
  stripeRef: string | null;
  acceptedAt: string | null;
  /** The contact who agreed to a recurring quote. */
  acceptedBy: string | null;
  linkState: LinkState;
  linkId: string | null;
  linkUrl: string | null;
}

export type NewQuote = QuoteFigures & Pick<Quote, 'sponsorId' | 'subject' | 'subjectId' | 'purpose' | 'createdBy'> & { interval?: QuoteInterval | null };

/** `matched` paid its quote; `unquoted` came without one (before quotes existed); `review` waits for the board. */
export type PaymentOutcome = 'matched' | 'unquoted' | 'review';

export interface QuotePayment {
  sessionId: string;
  sponsorId: string;
  subject: QuoteSubject;
  subjectId: string | null;
  /** The quote the payment named, or the quote whose link it came through. */
  quoteId: string | null;
  currency: string;
  amountMinor: number;
  paymentLinkId: string | null;
  paymentIntentId: string | null;
  outcome: PaymentOutcome;
  /** Why it waits for review, in words for the board. */
  reason: string | null;
  /** What the processor kept and what reached ZurichJS, read back from Stripe; null until known. */
  feeMinor: number | null;
  netMinor: number | null;
  resolution: 'accepted' | 'dismissed' | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  receivedAt: string;
}

export type NewPayment = Pick<QuotePayment, 'sessionId' | 'sponsorId' | 'subject' | 'subjectId' | 'quoteId' | 'currency' | 'amountMinor' | 'paymentLinkId' | 'paymentIntentId'>;

export class DuplicateTariff extends Error {
  constructor(version: string) {
    super(`Tariff version ${version} exists already. A new tariff needs a new version.`);
    this.name = 'DuplicateTariff';
  }
}

export interface FeeStore {
  claimRecurring(id: string, contact: string): Promise<boolean>;
  /**
   * The sponsor agreed to an open recurring quote: it becomes the one in force (any earlier accepted
   * quote for the same thing is superseded). `ref` is the surcharge's subscription item, if any.
   * Accepting it again is a no-op. Null when it is not open or accepted.
   */
  acceptQuote(id: string, acceptedBy: string, ref: string | null): Promise<Quote | null>;
  /** The recurring quote in force for the sponsorship, if any. */
  acceptedQuote(sponsorId: string): Promise<Quote | null>;
  /** Newest first. */
  tariffs(): Promise<Tariff[]>;
  latestTariff(): Promise<Tariff | null>;
  addTariff(t: Omit<Tariff, 'enteredAt'>): Promise<Tariff>;
  /**
   * A new open quote; the open quote for the same sponsor, subject and subject id becomes superseded
   * and its link, if any, is marked for closing. With `reuse`, an open quote with the same figures
   * whose link was never published is returned instead (a retry after a failure half-way).
   */
  createQuote(
    q: NewQuote,
    opts?: { reuse?: boolean; requestId?: string; invitation?: Record<string, unknown> },
  ): Promise<{ quote: Quote; superseded: Quote | null; reused: boolean }>;
  quote(id: string): Promise<Quote | null>;
  openQuote(sponsorId: string, subject: QuoteSubject, subjectId: string | null): Promise<Quote | null>;
  /** The quote that owns (or owned) this Stripe payment link. */
  quoteByLink(linkId: string): Promise<Quote | null>;
  /** Newest first. */
  quotes(sponsorId: string): Promise<Quote[]>;
  /** The link is being made at Stripe for this open quote. Null when the quote is not open. */
  linkCreating(id: string): Promise<Quote | null>;
  /** Publishes the link on the quote, only while it is still open. Null when it lost the offer. */
  attachLink(id: string, linkId: string, url: string): Promise<Quote | null>;
  /** A link made for a quote that lost the offer: recorded so it is switched off, never left payable. */
  orphanLink(id: string, linkId: string): Promise<void>;
  /** Links of this subject that must be switched off: quotes that are not open, whose link is still on. */
  linksToClose(sponsorId: string, subject: QuoteSubject, subjectId: string | null): Promise<Quote[]>;
  linkClosed(id: string): Promise<void>;
  /** Withdraws the open quote (the offer changed or ended); its link is marked for closing. */
  voidQuote(id: string): Promise<Quote | null>;
  /**
   * Records a payment by its session, once, then pays its quote only if it matches the open quote
   * exactly. `fresh` is false for a session recorded before (a retried or repeated delivery).
   */
  settlePayment(p: NewPayment): Promise<{ payment: QuotePayment; fresh: boolean }>;
  payment(sessionId: string): Promise<QuotePayment | null>;
  /** Newest first. */
  payments(sponsorId: string): Promise<QuotePayment[]>;
  /** The board's decision on a payment under review; null when it is not under review or decided already. */
  resolvePayment(sessionId: string, resolution: 'accepted' | 'dismissed', by: string, note: string | null): Promise<QuotePayment | null>;
  /** The processor's actual fee for a payment, recorded once. */
  recordFee(sessionId: string, feeMinor: number, netMinor: number): Promise<void>;
  /** Payments whose actual fee is not known yet, oldest first. */
  unreconciled(limit: number): Promise<QuotePayment[]>;
}

const sameFigures = (a: QuoteFigures & { purpose: string }, b: QuoteFigures & { purpose: string }) =>
  a.baseMinor === b.baseMinor &&
  a.surchargeMinor === b.surchargeMinor &&
  a.totalMinor === b.totalMinor &&
  a.feeChoice === b.feeChoice &&
  a.tariffVersion === b.tariffVersion &&
  a.policyVersion === b.policyVersion &&
  a.formula === b.formula &&
  a.purpose === b.purpose;

/**
 * Whether a payment pays its quote, and why not. Pure, so memory and Postgres decide alike; the
 * Postgres store repeats the "still open" part in the statement that pays it.
 */
export function paymentVerdict(q: Quote | null, p: NewPayment): { outcome: PaymentOutcome; reason: string | null } {
  if (!p.quoteId) return { outcome: 'unquoted', reason: null };
  if (!q) return { outcome: 'review', reason: 'The payment names an offer that does not exist.' };
  if (q.sponsorId !== p.sponsorId) return { outcome: 'review', reason: 'The payment names an offer for another sponsor.' };
  if (q.subject !== p.subject || q.subjectId !== p.subjectId) return { outcome: 'review', reason: 'The payment names an offer for something else.' };
  if (p.currency !== q.currency) return { outcome: 'review', reason: `It was paid in ${p.currency.toUpperCase()}, the offer is in ${q.currency.toUpperCase()}.` };
  if (p.paymentLinkId !== q.linkId) return { outcome: 'review', reason: 'It came through a payment link the offer does not own.' };
  if (q.status === 'paid') return { outcome: 'review', reason: 'The offer was paid already; this is a second payment.' };
  if (q.status !== 'open') return { outcome: 'review', reason: 'The offer was replaced or withdrawn before it was paid.' };
  if (p.amountMinor !== q.totalMinor) return { outcome: 'review', reason: `The amount paid differs from the offer's total.` };
  return { outcome: 'matched', reason: null };
}

export function memoryFeeStore(opts: { now?: () => Date } = {}): FeeStore {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  const tariffs: Tariff[] = [];
  const quotes: Quote[] = [];
  const payments: QuotePayment[] = [];
  const applying = new Map<string, string>();
  const requests = new Map<string, Quote>();
  let n = 0;
  const copy = <T extends object>(x: T | undefined) => (x ? { ...x } : null);
  const same = (q: Quote, sponsorId: string, subject: QuoteSubject, subjectId: string | null) => q.sponsorId === sponsorId && q.subject === subject && q.subjectId === subjectId;
  const retire = (q: Quote, status: 'superseded' | 'void') => {
    q.status = status;
    if (q.linkState === 'live' || q.linkState === 'creating') q.linkState = 'closing';
  };
  return {
    tariffs: async () => [...tariffs].reverse().map((t) => ({ ...t })),
    latestTariff: async () => (tariffs.length ? { ...tariffs.at(-1)! } : null),
    async addTariff(t) {
      if (tariffs.some((x) => x.version === t.version)) throw new DuplicateTariff(t.version);
      const row = { ...t, enteredAt: now() };
      tariffs.push(row);
      return { ...row };
    },
    async createQuote(input, o = {}) {
      if (input.tariffVersion && !tariffs.some((t) => t.version === input.tariffVersion)) throw new Error('Unknown tariff version.');
      const open = quotes.find((q) => q.status === 'open' && same(q, input.sponsorId, input.subject, input.subjectId));
      const requestKey = o.requestId ? `${input.sponsorId}:${o.requestId}` : null;
      const prior = requestKey ? requests.get(requestKey) : undefined;
      if (prior) {
        if (prior.status !== 'open' || !sameFigures(prior, input)) throw new Error('This payment link request has been replaced.');
        return { quote: { ...prior }, superseded: null, reused: true };
      }
      if (o.reuse && open && (open.linkState === 'none' || open.linkState === 'creating') && sameFigures(open, input))
        return { quote: { ...open }, superseded: null, reused: true };
      if (open?.linkState === 'creating') throw new Error('Payment link creation is in progress. Retry the same offer first.');
      if (open && applying.has(open.id)) throw new Error('The sponsor is confirming this offer.');
      if (open) retire(open, 'superseded');
      const quote: Quote = {
        ...input,
        interval: input.interval ?? null,
        acceptedAt: null,
        acceptedBy: null,
        id: `q_${++n}`,
        status: 'open',
        createdAt: now(),
        paidAt: null,
        stripeRef: null,
        linkState: 'none',
        linkId: null,
        linkUrl: null,
      };
      quotes.push(quote);
      if (requestKey) requests.set(requestKey, quote);
      return { quote: { ...quote }, superseded: copy(open), reused: false };
    },
    quote: async (id) => copy(quotes.find((q) => q.id === id)),
    openQuote: async (sid, subject, subjectId) => copy(quotes.find((q) => q.status === 'open' && same(q, sid, subject, subjectId))),
    quoteByLink: async (linkId) => copy(quotes.find((q) => q.linkId === linkId)),
    quotes: async (sid) =>
      quotes
        .filter((q) => q.sponsorId === sid)
        .reverse()
        .map((q) => ({ ...q })),
    async linkCreating(id) {
      const q = quotes.find((x) => x.id === id && x.status === 'open');
      if (!q) return null;
      if (q.linkState === 'none') q.linkState = 'creating';
      return { ...q };
    },
    async attachLink(id, linkId, url) {
      const q = quotes.find((x) => x.id === id && x.status === 'open' && (x.linkState === 'creating' || (x.linkState === 'live' && x.linkId === linkId)));
      if (!q) return null;
      Object.assign(q, { linkState: 'live', linkId, linkUrl: url });
      return { ...q };
    },
    async orphanLink(id, linkId) {
      const q = quotes.find((x) => x.id === id);
      if (q && q.status !== 'open') Object.assign(q, { linkState: 'closing', linkId });
    },
    linksToClose: async (sid, subject, subjectId) =>
      quotes.filter((q) => same(q, sid, subject, subjectId) && q.status !== 'open' && ['live', 'creating', 'closing'].includes(q.linkState)).map((q) => ({ ...q })),
    async linkClosed(id) {
      const q = quotes.find((x) => x.id === id);
      if (q) q.linkState = 'closed';
    },
    async voidQuote(id) {
      const q = quotes.find((x) => x.id === id && x.status === 'open');
      if (!q) return null;
      if (applying.has(id)) return null;
      retire(q, 'void');
      return { ...q };
    },
    async claimRecurring(id, contact) {
      const q = quotes.find((x) => x.id === id);
      if (!q?.interval || q.status !== 'open' || (applying.has(id) && applying.get(id) !== contact)) return false;
      applying.set(id, contact);
      return true;
    },
    async acceptQuote(id, by, ref) {
      const q = quotes.find((x) => x.id === id);
      if (applying.has(id) && applying.get(id) !== by) return null;
      if (!q || !q.interval || (q.status !== 'open' && q.status !== 'accepted')) return null;
      if (q.status === 'accepted') return { ...q };
      for (const o of quotes) if (o.status === 'accepted' && same(o, q.sponsorId, q.subject, q.subjectId)) o.status = 'superseded';
      Object.assign(q, { status: 'accepted', acceptedAt: now(), acceptedBy: by, stripeRef: ref });
      return { ...q };
    },
    acceptedQuote: async (sid) => copy(quotes.find((q) => q.status === 'accepted' && q.sponsorId === sid && q.subject === 'sponsorship')),
    async settlePayment(p) {
      const seen = payments.find((x) => x.sessionId === p.sessionId);
      if (seen) return { payment: { ...seen }, fresh: false };
      const q = p.quoteId ? (quotes.find((x) => x.id === p.quoteId) ?? null) : null;
      const verdict = paymentVerdict(q ? { ...q } : null, p);
      if (verdict.outcome === 'matched') Object.assign(q!, { status: 'paid', paidAt: now(), stripeRef: p.sessionId });
      const row: QuotePayment = {
        ...p,
        ...verdict,
        feeMinor: null,
        netMinor: null,
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        receivedAt: now(),
      };
      payments.push(row);
      return { payment: { ...row }, fresh: true };
    },
    payment: async (sid) => copy(payments.find((x) => x.sessionId === sid)),
    payments: async (sid) =>
      payments
        .filter((x) => x.sponsorId === sid)
        .reverse()
        .map((x) => ({ ...x })),
    async resolvePayment(sid, resolution, by, note) {
      const x = payments.find((y) => y.sessionId === sid && y.outcome === 'review' && !y.resolution);
      if (!x) return null;
      Object.assign(x, { resolution, resolvedBy: by, resolvedAt: now(), resolutionNote: note });
      return { ...x };
    },
    async recordFee(sid, fee, net) {
      const x = payments.find((y) => y.sessionId === sid && y.feeMinor === null);
      if (x) Object.assign(x, { feeMinor: fee, netMinor: net });
    },
    unreconciled: async (limit) =>
      payments
        .filter((x) => x.feeMinor === null && x.paymentIntentId)
        .slice(0, limit)
        .map((x) => ({ ...x })),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const tariffOf = (r: Record<string, unknown>): Tariff => ({
  version: r.version as string,
  method: 'card',
  currency: 'chf',
  ratePpm: Number(r.rate_ppm),
  fixedMinor: Number(r.fixed_minor),
  note: (r.note as string | null) ?? null,
  enteredBy: r.entered_by as string,
  enteredAt: iso(r.entered_at)!,
});

const quoteOf = (r: Record<string, unknown>): Quote => ({
  id: r.id as string,
  sponsorId: r.sponsor_id as string,
  subject: r.subject as QuoteSubject,
  subjectId: (r.subject_id as string | null) ?? null,
  purpose: r.purpose as string,
  interval: (r.interval as QuoteInterval | null) ?? null,
  currency: 'chf',
  baseMinor: Number(r.base_minor),
  surchargeMinor: Number(r.surcharge_minor),
  totalMinor: Number(r.total_minor),
  feeChoice: r.fee_choice as Quote['feeChoice'],
  tariffVersion: (r.tariff_version as string | null) ?? null,
  policyVersion: (r.policy_version as string | null) ?? null,
  formula: r.formula as Quote['formula'],
  status: r.status as QuoteStatus,
  createdBy: r.created_by as string,
  createdAt: iso(r.created_at)!,
  paidAt: iso(r.paid_at),
  stripeRef: (r.stripe_ref as string | null) ?? null,
  acceptedAt: iso(r.accepted_at),
  acceptedBy: (r.accepted_by as string | null) ?? null,
  linkState: (r.link_state as LinkState | undefined) ?? 'none',
  linkId: (r.link_id as string | null) ?? null,
  linkUrl: (r.link_url as string | null) ?? null,
});

const paymentOf = (r: Record<string, unknown>): QuotePayment => ({
  sessionId: r.session_id as string,
  sponsorId: r.sponsor_id as string,
  subject: r.subject as QuoteSubject,
  subjectId: (r.subject_id as string | null) ?? null,
  quoteId: (r.quote_id as string | null) ?? null,
  currency: r.currency as string,
  amountMinor: Number(r.amount_minor),
  paymentLinkId: (r.payment_link_id as string | null) ?? null,
  paymentIntentId: (r.payment_intent_id as string | null) ?? null,
  outcome: r.outcome as PaymentOutcome,
  reason: (r.reason as string | null) ?? null,
  feeMinor: num(r.fee_minor),
  netMinor: num(r.net_minor),
  resolution: (r.resolution as QuotePayment['resolution']) ?? null,
  resolvedBy: (r.resolved_by as string | null) ?? null,
  resolvedAt: iso(r.resolved_at),
  resolutionNote: (r.resolution_note as string | null) ?? null,
  receivedAt: iso(r.received_at)!,
});

const SAME_THING = `sponsor_id = $1 and subject = $2 and coalesce(subject_id, '') = coalesce($3, '')`;

export function postgresFeeStore(db: Queryable): FeeStore {
  const q = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows;
  const one = async (text: string, params: unknown[] = []) => (await q(text, params))[0];
  return {
    tariffs: async () => (await q('select * from fee_tariffs order by entered_at desc, version desc')).map(tariffOf),
    latestTariff: async () => {
      const r = await one('select * from fee_tariffs order by entered_at desc, version desc limit 1');
      return r ? tariffOf(r) : null;
    },
    async addTariff(t) {
      try {
        const r = (await one('insert into fee_tariffs (version, rate_ppm, fixed_minor, note, entered_by) values ($1, $2, $3, $4, $5) returning *', [
          t.version,
          t.ratePpm,
          t.fixedMinor,
          t.note,
          t.enteredBy,
        ]))!;
        return tariffOf(r);
      } catch (err) {
        if ((err as { code?: string }).code === '23505') throw new DuplicateTariff(t.version);
        throw err;
      }
    },
    async createQuote(n, o = {}) {
      const result = (await one('select * from freeze_payment_quote($1::jsonb, $2)', [
        JSON.stringify({ ...n, requestId: o.requestId, invitation: o.invitation }),
        o.reuse === true,
      ]))!;
      return {
        quote: quoteOf(result.current_quote as Record<string, unknown>),
        superseded: result.previous_quote ? quoteOf(result.previous_quote as Record<string, unknown>) : null,
        reused: result.reused === true,
      };
    },
    quote: async (id) => {
      if (!UUID.test(id)) return null;
      const r = await one('select * from payment_quotes where id = $1', [id]);
      return r ? quoteOf(r) : null;
    },
    openQuote: async (sponsorId, subject, subjectId) => {
      if (!UUID.test(sponsorId)) return null;
      const r = await one(`select * from payment_quotes where ${SAME_THING} and status = 'open'`, [sponsorId, subject, subjectId]);
      return r ? quoteOf(r) : null;
    },
    quoteByLink: async (linkId) => {
      const r = await one('select * from payment_quotes where link_id = $1', [linkId]);
      return r ? quoteOf(r) : null;
    },
    quotes: async (sponsorId) => (UUID.test(sponsorId) ? (await q('select * from payment_quotes where sponsor_id = $1 order by created_at desc', [sponsorId])).map(quoteOf) : []),
    async linkCreating(id) {
      if (!UUID.test(id)) return null;
      const r = await one(
        `update payment_quotes set link_state = case when link_state = 'none' then 'creating' else link_state end where id = $1 and status = 'open' returning *`,
        [id],
      );
      return r ? quoteOf(r) : null;
    },
    async attachLink(id, linkId, url) {
      if (!UUID.test(id)) return null;
      const r = await one(
        `update payment_quotes set link_state = 'live', link_id = $2, link_url = $3
         where id = $1 and status = 'open' and (link_state = 'creating' or (link_state = 'live' and link_id = $2)) returning *`,
        [id, linkId, url],
      );
      return r ? quoteOf(r) : null;
    },
    async orphanLink(id, linkId) {
      if (UUID.test(id)) await q(`update payment_quotes set link_state = 'closing', link_id = $2 where id = $1 and status <> 'open'`, [id, linkId]);
    },
    linksToClose: async (sponsorId, subject, subjectId) =>
      UUID.test(sponsorId)
        ? (
            await q(`select * from payment_quotes where ${SAME_THING} and status <> 'open' and link_state in ('live', 'creating', 'closing') order by created_at`, [
              sponsorId,
              subject,
              subjectId,
            ])
          ).map(quoteOf)
        : [],
    async linkClosed(id) {
      if (UUID.test(id)) await q(`update payment_quotes set link_state = 'closed' where id = $1`, [id]);
    },
    async voidQuote(id) {
      if (!UUID.test(id)) return null;
      const r = await one(
        `update payment_quotes set status = 'void', link_state = case when link_state in ('live', 'creating') then 'closing' else link_state end
         where id = $1 and status = 'open' and applying_by is null returning *`,
        [id],
      );
      return r ? quoteOf(r) : null;
    },
    async claimRecurring(id, contact) {
      if (!UUID.test(id)) return false;
      return !!(await one(
        `update payment_quotes set applying_by = $2 where id = $1 and subject='sponsorship' and interval is not null
        and status='open' and (applying_by is null or applying_by = $2) returning id`,
        [id, contact],
      ));
    },
    async acceptQuote(id, by, ref) {
      if (!UUID.test(id)) return null;
      const row = await one('select * from confirm_recurring_quote($1,$2,$3)', [id, by, ref]);
      return row ? quoteOf(row) : null;
    },
    acceptedQuote: async (sponsorId) => {
      if (!UUID.test(sponsorId)) return null;
      const r = (await q(`select * from payment_quotes where sponsor_id = $1 and subject = 'sponsorship' and status = 'accepted'`, [sponsorId]))[0];
      return r ? quoteOf(r) : null;
    },
    async settlePayment(p) {
      const existing = await one('select * from quote_payments where session_id = $1', [p.sessionId]);
      if (existing) return { payment: paymentOf(existing), fresh: false };
      const quote = p.quoteId && UUID.test(p.quoteId) ? await one('select * from payment_quotes where id = $1', [p.quoteId]) : undefined;
      const verdict =
        p.quoteId && !UUID.test(p.quoteId)
          ? { outcome: 'review' as const, reason: 'The payment names an offer that does not exist.' }
          : paymentVerdict(quote ? quoteOf(quote) : null, p);
      // Paying the quote and recording the payment are one statement. The quote is paid only while it
      // is still open with the same total (it may have been replaced since it was read); otherwise the
      // payment waits for review. A repeated delivery of the session inserts nothing.
      const r = (await one(
        `with paid as (
           update payment_quotes set status = 'paid', paid_at = now(), stripe_ref = $1
           where $10 = 'matched' and id = $5::uuid and status = 'open' and total_minor = $7 and currency = $6
             and not exists (select 1 from quote_payments where session_id = $1)
           returning id),
         ins as (
           insert into quote_payments (session_id, sponsor_id, subject, subject_id, quote_id, currency, amount_minor, payment_link_id, payment_intent_id, outcome, reason)
           select $1, $2, $3, $4, case when exists (select 1 from payment_quotes where id = $5::uuid) then $5::uuid end, $6, $7, $8, $9,
                  case when $10 = 'matched' and not exists (select 1 from paid) then 'review' else $10 end,
                  case when $10 = 'matched' and not exists (select 1 from paid) then 'The offer changed while it was being paid.' else $11 end
           on conflict (session_id) do nothing
           returning *)
         select (select row_to_json(ins) from ins) as row`,
        [
          p.sessionId,
          p.sponsorId,
          p.subject,
          p.subjectId,
          quote ? p.quoteId : null,
          p.currency,
          p.amountMinor,
          p.paymentLinkId,
          p.paymentIntentId,
          verdict.outcome,
          verdict.reason,
        ],
      ))!;
      if (r.row) return { payment: paymentOf(r.row as Record<string, unknown>), fresh: true };
      return { payment: paymentOf((await one('select * from quote_payments where session_id = $1', [p.sessionId]))!), fresh: false };
    },
    payment: async (sessionId) => {
      const r = await one('select * from quote_payments where session_id = $1', [sessionId]);
      return r ? paymentOf(r) : null;
    },
    payments: async (sponsorId) =>
      UUID.test(sponsorId) ? (await q('select * from quote_payments where sponsor_id = $1 order by received_at desc, session_id', [sponsorId])).map(paymentOf) : [],
    async resolvePayment(sessionId, resolution, by, note) {
      const r = await one(
        `update quote_payments set resolution = $2, resolved_by = $3, resolved_at = now(), resolution_note = $4
         where session_id = $1 and outcome = 'review' and resolution is null returning *`,
        [sessionId, resolution, by, note],
      );
      return r ? paymentOf(r) : null;
    },
    async recordFee(sessionId, fee, net) {
      await q('update quote_payments set fee_minor = $2, net_minor = $3, fee_checked_at = now() where session_id = $1 and fee_minor is null', [sessionId, fee, net]);
    },
    unreconciled: async (limit) =>
      (await q('select * from quote_payments where fee_minor is null and payment_intent_id is not null order by received_at limit $1', [limit])).map(paymentOf),
  };
}
