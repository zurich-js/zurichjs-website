/**
 * Card tariffs and payment quotes (fees.ts), in memory for tests and on Postgres in functions.
 * Creating a quote supersedes the open quote for the same thing in the same statement, so there is
 * never more than one open quote per sponsorship or raffle. A superseded or void quote can still
 * be marked paid (a stale payment page someone paid anyway): the payment is recorded, never lost.
 */
import type { QuoteFigures, Tariff } from './fees.ts';
import type { Queryable } from './postgres.ts';

export type QuoteSubject = 'sponsorship' | 'raffle';
export type QuoteStatus = 'open' | 'paid' | 'superseded' | 'void';

export interface Quote extends QuoteFigures {
  id: string;
  sponsorId: string;
  subject: QuoteSubject;
  /** The raffle id for a raffle; null for the sponsorship itself. */
  subjectId: string | null;
  /** What it pays for, as the sponsor reads it ("Sponsorship of 3 meetups"). */
  purpose: string;
  status: QuoteStatus;
  createdBy: string;
  createdAt: string;
  paidAt: string | null;
  stripeRef: string | null;
}

export type NewQuote = QuoteFigures & Pick<Quote, 'sponsorId' | 'subject' | 'subjectId' | 'purpose' | 'createdBy'>;

export class DuplicateTariff extends Error {
  constructor(version: string) {
    super(`Tariff version ${version} exists already. A new tariff needs a new version.`);
    this.name = 'DuplicateTariff';
  }
}

export interface FeeStore {
  /** Newest first. */
  tariffs(): Promise<Tariff[]>;
  latestTariff(): Promise<Tariff | null>;
  addTariff(t: Omit<Tariff, 'enteredAt'>): Promise<Tariff>;
  /** A new open quote; any open quote for the same sponsor, subject and subject id becomes superseded. */
  createQuote(q: NewQuote): Promise<{ quote: Quote; superseded: Quote | null }>;
  quote(id: string): Promise<Quote | null>;
  openQuote(sponsorId: string, subject: QuoteSubject, subjectId: string | null): Promise<Quote | null>;
  /** Newest first. */
  quotes(sponsorId: string): Promise<Quote[]>;
  /** Records the payment. `was` is the status before: anything but `open` needs the board's attention. Null for an unknown quote. */
  markQuotePaid(id: string, stripeRef: string): Promise<{ quote: Quote; was: QuoteStatus } | null>;
  voidQuote(id: string): Promise<void>;
}

export function memoryFeeStore(opts: { now?: () => Date } = {}): FeeStore {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  const tariffs: Tariff[] = [];
  const quotes: Quote[] = [];
  let n = 0;
  const copy = (q: Quote | undefined) => (q ? { ...q } : null);
  const same = (q: Quote, sponsorId: string, subject: QuoteSubject, subjectId: string | null) => q.sponsorId === sponsorId && q.subject === subject && q.subjectId === subjectId;
  return {
    tariffs: async () => [...tariffs].reverse().map((t) => ({ ...t })),
    latestTariff: async () => (tariffs.length ? { ...tariffs.at(-1)! } : null),
    async addTariff(t) {
      if (tariffs.some((x) => x.version === t.version)) throw new DuplicateTariff(t.version);
      const row = { ...t, enteredAt: now() };
      tariffs.push(row);
      return { ...row };
    },
    async createQuote(input) {
      if (input.tariffVersion && !tariffs.some((t) => t.version === input.tariffVersion)) throw new Error('Unknown tariff version.');
      const open = quotes.find((q) => q.status === 'open' && same(q, input.sponsorId, input.subject, input.subjectId));
      if (open) open.status = 'superseded';
      const quote: Quote = { ...input, id: `q_${++n}`, status: 'open', createdAt: now(), paidAt: null, stripeRef: null };
      quotes.push(quote);
      return { quote: { ...quote }, superseded: copy(open) };
    },
    quote: async (id) => copy(quotes.find((q) => q.id === id)),
    openQuote: async (sid, subject, subjectId) => copy(quotes.find((q) => q.status === 'open' && same(q, sid, subject, subjectId))),
    quotes: async (sid) =>
      quotes
        .filter((q) => q.sponsorId === sid)
        .reverse()
        .map((q) => ({ ...q })),
    async markQuotePaid(id, ref) {
      const q = quotes.find((x) => x.id === id);
      if (!q) return null;
      const was = q.status;
      if (was !== 'paid') Object.assign(q, { status: 'paid', paidAt: now(), stripeRef: ref });
      return { quote: { ...q }, was };
    },
    async voidQuote(id) {
      const q = quotes.find((x) => x.id === id);
      if (q?.status === 'open') q.status = 'void';
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

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
});

export function postgresFeeStore(db: Queryable): FeeStore {
  const q = async (text: string, params: unknown[] = []) => (await db.query(text, params)).rows;
  return {
    tariffs: async () => (await q('select * from fee_tariffs order by entered_at desc, version desc')).map(tariffOf),
    latestTariff: async () => {
      const r = (await q('select * from fee_tariffs order by entered_at desc, version desc limit 1'))[0];
      return r ? tariffOf(r) : null;
    },
    async addTariff(t) {
      try {
        const r = (
          await q('insert into fee_tariffs (version, rate_ppm, fixed_minor, note, entered_by) values ($1, $2, $3, $4, $5) returning *', [
            t.version,
            t.ratePpm,
            t.fixedMinor,
            t.note,
            t.enteredBy,
          ])
        )[0]!;
        return tariffOf(r);
      } catch (err) {
        if ((err as { code?: string }).code === '23505') throw new DuplicateTariff(t.version);
        throw err;
      }
    },
    async createQuote(n) {
      // Supersede the open quote for the same thing, then insert. The partial unique index allows one
      // open quote per thing: a concurrent insert in between makes ours fail, and it tries once more.
      const insert = async (): Promise<{ quote: Quote; superseded: Quote | null }> => {
        const old = (
          await q(
            `update payment_quotes set status = 'superseded'
             where sponsor_id = $1 and subject = $2 and coalesce(subject_id, '') = coalesce($3, '') and status = 'open' returning *`,
            [n.sponsorId, n.subject, n.subjectId],
          )
        )[0];
        const fresh = (
          await q(
            `insert into payment_quotes (sponsor_id, subject, subject_id, purpose, base_minor, surcharge_minor, total_minor,
                                         fee_choice, tariff_version, policy_version, formula, created_by)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning *`,
            [n.sponsorId, n.subject, n.subjectId, n.purpose, n.baseMinor, n.surchargeMinor, n.totalMinor, n.feeChoice, n.tariffVersion, n.policyVersion, n.formula, n.createdBy],
          )
        )[0]!;
        return { quote: quoteOf(fresh), superseded: old ? quoteOf(old) : null };
      };
      try {
        return await insert();
      } catch (err) {
        if ((err as { constraint?: string }).constraint !== 'payment_quotes_open_idx') throw err;
        return insert();
      }
    },
    quote: async (id) => {
      if (!UUID.test(id)) return null;
      const r = (await q('select * from payment_quotes where id = $1', [id]))[0];
      return r ? quoteOf(r) : null;
    },
    openQuote: async (sponsorId, subject, subjectId) => {
      if (!UUID.test(sponsorId)) return null;
      const r = (
        await q(`select * from payment_quotes where sponsor_id = $1 and subject = $2 and coalesce(subject_id, '') = coalesce($3, '') and status = 'open'`, [
          sponsorId,
          subject,
          subjectId,
        ])
      )[0];
      return r ? quoteOf(r) : null;
    },
    quotes: async (sponsorId) => (UUID.test(sponsorId) ? (await q('select * from payment_quotes where sponsor_id = $1 order by created_at desc', [sponsorId])).map(quoteOf) : []),
    async markQuotePaid(id, ref) {
      if (!UUID.test(id)) return null;
      const rows = await q(
        `with before as (select status from payment_quotes where id = $1),
              upd as (update payment_quotes set status = 'paid', paid_at = now(), stripe_ref = $2 where id = $1 and status <> 'paid' returning *)
         select (select status from before) as was, coalesce((select row_to_json(upd) from upd), (select row_to_json(p) from payment_quotes p where id = $1)) as row`,
        [id, ref],
      );
      const r = rows[0];
      if (!r?.row) return null;
      return { quote: quoteOf(r.row as Record<string, unknown>), was: r.was as QuoteStatus };
    },
    async voidQuote(id) {
      if (UUID.test(id)) await q(`update payment_quotes set status = 'void' where id = $1 and status = 'open'`, [id]);
    },
  };
}
