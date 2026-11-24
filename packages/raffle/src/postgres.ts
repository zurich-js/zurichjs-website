/**
 * The raffle store on Postgres. Each write is one statement: a data-modifying CTE changes the row
 * and appends the audit row. Stage and funding changes are compare-and-set.
 */
import { RaffleRuleError, checkFunding, checkStage } from './rules.ts';
import { RaffleNotFound, conflict, readyBlocker, type RaffleStore } from './store.ts';
import type { Actor, LedgerEntry, Raffle, RaffleEvent } from './types.ts';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());
/** pg returns `date` columns as Date at local midnight; keep YYYY-MM-DD. */
const day = (v: unknown) => {
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v as Date;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const raffleOf = (r: Row): Raffle => ({
  id: r.id as string,
  sponsorId: r.sponsor_id as string,
  eventId: r.event_id as string,
  eventTitle: r.event_title as string,
  eventDate: day(r.event_date),
  prize: r.prize as string,
  quantity: Number(r.quantity),
  budgetMinor: Number(r.budget_minor),
  fulfilment: r.fulfilment as Raffle['fulfilment'],
  stage: r.stage as Raffle['stage'],
  funding: r.funding as Raffle['funding'],
  flags: (r.flags as Raffle['flags']) ?? [],
  amountMinor: r.amount_minor === null ? null : Number(r.amount_minor),
  quoteId: (r.quote_id as string | null) ?? null,
  termsVersion: (r.terms_version as string | null) ?? null,
  acceptedVersion: (r.accepted_version as string | null) ?? null,
  acceptedBy: (r.accepted_by as string | null) ?? null,
  acceptedAt: iso(r.accepted_at),
  paymentLinkId: (r.payment_link_id as string | null) ?? null,
  paymentLinkUrl: (r.payment_link_url as string | null) ?? null,
  reason: (r.reason as string | null) ?? null,
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
});

const ledgerOf = (r: Row): LedgerEntry => ({
  id: String(r.id),
  raffleId: r.raffle_id as string,
  kind: r.kind as LedgerEntry['kind'],
  amountMinor: Number(r.amount_minor),
  note: r.note as string,
  reference: (r.reference as string | null) ?? null,
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  at: iso(r.at)!,
});

const eventOf = (r: Row): RaffleEvent => ({
  id: String(r.id),
  raffleId: r.raffle_id as string,
  type: r.type as string,
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  payload: r.payload as Record<string, unknown>,
  at: iso(r.at)!,
});

export function postgresRaffleStore(db: Queryable): RaffleStore {
  const q = async (text: string, params: unknown[] = []) => (await db.query<Row>(text, params)).rows;
  /** Runs `update` (returning *) and appends its audit row; null when no row matched. */
  const audited = async (update: string, params: unknown[], type: string, actor: Actor, payload: Row = {}) => {
    const n = params.length;
    const rows = await q(
      `with s as (${update}), e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
         select s.id, $${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}::jsonb from s) select * from s`,
      [...params, type, actor.kind, actor.id, JSON.stringify(payload)],
    );
    return rows[0] ? raffleOf(rows[0]) : null;
  };
  const get = async (id: string) => {
    if (!UUID.test(id)) return null;
    const r = (await q('select * from raffles where id = $1', [id]))[0];
    return r ? raffleOf(r) : null;
  };
  const must = async (id: string) => {
    const r = await get(id);
    if (!r) throw new RaffleNotFound();
    return r;
  };
  /** No row matched: the raffle is gone, or it changed under us. */
  const missed = async (id: string) => ((await get(id)) ? conflict() : new RaffleNotFound());

  return {
    async create(n, actor) {
      const rows = await q(
        `with s as (insert into raffles (sponsor_id, event_id, event_title, event_date, prize, quantity, budget_minor, fulfilment)
                    values ($1, $2, $3, $4, $5, $6, $7, $8) returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select id, 'proposed', $9, $10, jsonb_build_object('eventId', event_id, 'fulfilment', fulfilment) from s)
         select * from s`,
        [n.sponsorId, n.eventId, n.eventTitle, n.eventDate, n.prize, n.quantity, n.budgetMinor, n.fulfilment, actor.kind, actor.id],
      );
      return raffleOf(rows[0]!);
    },
    get,
    bySponsor: async (sid) => (UUID.test(sid) ? (await q('select * from raffles where sponsor_id = $1 order by created_at desc', [sid])).map(raffleOf) : []),
    byPaymentLink: async (pl) => {
      const r = (await q('select * from raffles where payment_link_id = $1', [pl]))[0];
      return r ? raffleOf(r) : null;
    },
    list: async ({ stage, limit = 200 } = {}) =>
      (await q('select * from raffles where ($1::text is null or stage = $1) order by created_at desc limit $2', [stage ?? null, Math.min(Math.max(limit, 1), 1000)])).map(
        raffleOf,
      ),
    async moveStage(id, { from, to, actor, reason }) {
      const r = await must(id);
      if (r.stage !== from) throw conflict();
      checkStage(from, to, actor.kind);
      if (to === 'ready') {
        const why = readyBlocker(r);
        if (why) throw new RaffleRuleError(why);
      }
      const keep = to === 'ready' || to === 'offered' ? null : r.reason;
      const out = await audited(`update raffles set stage = $3, reason = $4 where id = $1 and stage = $2 returning *`, [id, from, to, reason ?? keep], 'stage_changed', actor, {
        from,
        to,
      });
      if (!out) throw conflict();
      return out;
    },
    async setFunding(id, { from, to, actor, payload = {} }) {
      checkFunding(from, to);
      const out = await audited(`update raffles set funding = $3 where id = $1 and funding = $2 returning *`, [id, from, to], 'funding_changed', actor, { ...payload, from, to });
      if (!out) throw await missed(id);
      return out;
    },
    async offer(id, { from, amountMinor, quoteId, termsVersion, actor }) {
      checkStage(from, 'offered', actor.kind);
      const out = await audited(
        `update raffles set stage = 'offered', amount_minor = $3, quote_id = $4, terms_version = $5,
           accepted_version = null, accepted_by = null, accepted_at = null, reason = null
         where id = $1 and stage = $2 returning *`,
        [id, from, amountMinor, quoteId, termsVersion],
        'offered',
        actor,
        { amountMinor, quoteId, termsVersion },
      );
      if (!out) throw await missed(id);
      return out;
    },
    async accept(id, { version, contactId, actor }) {
      const r = await must(id);
      if (r.stage !== 'offered' || r.termsVersion !== version) throw conflict();
      if (r.acceptedVersion === version) return r;
      const out = await audited(
        `update raffles set accepted_version = $2, accepted_by = $3, accepted_at = now() where id = $1 and stage = 'offered' and terms_version = $2 returning *`,
        [id, version, contactId],
        'terms_accepted',
        actor,
        { version, contactId },
      );
      if (!out) throw conflict();
      return out;
    },
    async linkPayment(id, link, actor) {
      const r = await must(id);
      const out = await audited(
        `update raffles set payment_link_id = $2, payment_link_url = $3 where id = $1 returning *`,
        [id, link?.id ?? null, link?.url ?? null],
        link ? 'payment_link_created' : 'payment_link_closed',
        actor,
        { paymentLinkId: link?.id ?? r.paymentLinkId },
      );
      return out!;
    },
    async flag(id, f, actor, payload = {}) {
      const out = await audited(`update raffles set flags = array_append(flags, $2) where id = $1 and not ($2 = any(flags)) returning *`, [id, f], 'flagged', actor, {
        ...payload,
        flag: f,
      });
      return out ?? must(id);
    },
    async clearFlag(id, f, actor) {
      const out = await audited(`update raffles set flags = array_remove(flags, $2) where id = $1 and $2 = any(flags) returning *`, [id, f], 'flag_cleared', actor, { flag: f });
      return out ?? must(id);
    },
    async addLedger(id, e, actor) {
      const rows = await q(
        `with s as (insert into raffle_ledger (raffle_id, kind, amount_minor, note, reference, actor_kind, actor_id) values ($1, $2, $3, $4, $5, $6, $7) returning *),
              e as (insert into raffle_events (raffle_id, type, actor_kind, actor_id, payload)
                    select raffle_id, 'ledger_added', actor_kind, actor_id, jsonb_build_object('kind', kind, 'amountMinor', amount_minor) from s)
         select * from s`,
        [id, e.kind, e.amountMinor, e.note, e.reference, actor.kind, actor.id],
      );
      return ledgerOf(rows[0]!);
    },
    ledger: async (id) => (UUID.test(id) ? (await q('select * from raffle_ledger where raffle_id = $1 order by at, id', [id])).map(ledgerOf) : []),
    events: async (id) => (UUID.test(id) ? (await q('select * from raffle_events where raffle_id = $1 order by at, id', [id])).map(eventOf) : []),
    stripeEventSeen: async (id) => (await q('select 1 from raffle_stripe_events where id = $1', [id])).length > 0,
    markStripeEvent: async (id, type) => void (await q('insert into raffle_stripe_events (id, type) values ($1, $2) on conflict (id) do nothing', [id, type])),
  };
}
