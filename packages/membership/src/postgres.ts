/**
 * The member store on Postgres (Netlify Database in production; a throwaway
 * local Postgres in tests). Server-side only. Every write goes through the
 * member_* SQL functions in apps/web/netlify/database/migrations, so a status
 * change and its audit row are one transaction.
 *
 * It takes anything with pg's `query(text, params)`: the `pool` from
 * `@netlify/database`'s getDatabase(), or a `pg.Pool` / `pg.Client`.
 */
import { checkTransition, TransitionError } from './state.ts';
import { DuplicateEmail, MemberNotFound, normaliseEmail, type MemberStore } from './store.ts';
import type { Actor, Certificate, Member, MemberEvent, MemberPatch } from './types.ts';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

export interface MemberRow {
  id: string;
  user_id: string | null;
  email: string;
  kind: Member['kind'];
  name: string;
  organisation_name: string | null;
  level: Member['level'];
  cycle: Member['cycle'];
  category: Member['category'];
  status: Member['status'];
  ended_reason: Member['endedReason'];
  source: Member['source'];
  joined_at: string | Date | null;
  paid_until: string | Date | null;
  payment_mode: Member['paymentMode'];
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  notes: string | null;
  resigned_at: string | Date | null;
  resignation_confirmed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface CertificateRow {
  id: string;
  member_id: string;
  number: string;
  level: Member['level'];
  period_start: string | Date;
  period_end: string | Date;
  stripe_invoice_id: string | null;
  issued_at: string | Date;
}

interface EventRow {
  id: string | number;
  member_id: string;
  type: string;
  from_status: MemberEvent['fromStatus'];
  to_status: MemberEvent['toStatus'];
  actor_kind: Actor['kind'];
  actor_id: string;
  payload: Record<string, unknown>;
  at: string | Date;
}

/** pg returns `date` columns as Date at local midnight unless told otherwise; keep YYYY-MM-DD. */
const day = (v: string | Date | null): string | null => {
  if (v === null) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
};
const iso = (v: string | Date) => (typeof v === 'string' ? new Date(v).toISOString() : v.toISOString());

export const fromRow = (r: MemberRow): Member => ({
  id: r.id,
  userId: r.user_id,
  email: r.email,
  kind: r.kind,
  name: r.name,
  organisationName: r.organisation_name,
  level: r.level,
  cycle: r.cycle,
  category: r.category,
  status: r.status,
  endedReason: r.ended_reason,
  source: r.source,
  joinedAt: day(r.joined_at),
  paidUntil: day(r.paid_until),
  paymentMode: r.payment_mode,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  notes: r.notes,
  resignedAt: r.resigned_at ? iso(r.resigned_at) : null,
  resignationConfirmedAt: r.resignation_confirmed_at ? iso(r.resignation_confirmed_at) : null,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

const certFromRow = (r: CertificateRow): Certificate => ({
  id: r.id,
  memberId: r.member_id,
  number: r.number,
  level: r.level,
  periodStart: day(r.period_start)!,
  periodEnd: day(r.period_end)!,
  stripeInvoiceId: r.stripe_invoice_id,
  issuedAt: iso(r.issued_at),
});

const PATCH_COLUMNS: Record<keyof MemberPatch, string> = {
  userId: 'user_id',
  kind: 'kind',
  name: 'name',
  organisationName: 'organisation_name',
  level: 'level',
  cycle: 'cycle',
  category: 'category',
  paidUntil: 'paid_until',
  paymentMode: 'payment_mode',
  notes: 'notes',
  joinedAt: 'joined_at',
};

export const toPatchRow = (patch: MemberPatch): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(patch)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [PATCH_COLUMNS[k as keyof MemberPatch], v]),
  );

/** A database error mapped to the store's errors where there is one. */
function mapError(err: unknown): Error {
  const e = err as { code?: string; message?: string; constraint?: string };
  const msg = e.message ?? '';
  if (msg.includes('member_transition_conflict')) return new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
  if (e.code === '23505' && (e.constraint === 'members_email_key' || /email/.test(msg))) return new DuplicateEmail('that email');
  if (e.code === 'P0002') return new MemberNotFound('');
  return err instanceof Error ? err : new Error(msg);
}

export function postgresStore(db: Queryable): MemberStore {
  const q = async <R>(text: string, params: unknown[] = []): Promise<R[]> => {
    try {
      return (await db.query<R>(text, params)).rows;
    } catch (err) {
      throw mapError(err);
    }
  };
  const one = async (where: string, value: unknown): Promise<Member | null> => {
    const rows = await q<MemberRow>(`select * from members where ${where} = $1 limit 1`, [value]);
    return rows[0] ? fromRow(rows[0]) : null;
  };
  const fn = async (call: string, params: unknown[]) => fromRow((await q<MemberRow>(`select * from ${call}`, params))[0]!);

  return {
    get: (id) => one('id', id),
    byEmail: (email) => one('email', normaliseEmail(email)),
    byUser: (uid) => one('user_id', uid),
    byStripeSubscription: (sid) => one('stripe_subscription_id', sid),
    search: async ({ q: text, status, limit = 200 }) => {
      const needle = text?.trim() ? `%${text.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
      const rows = await q<MemberRow>(
        `select * from members
         where ($1::member_status is null or status = $1)
           and ($2::text is null or name ilike $2 or email::text ilike $2 or organisation_name ilike $2)
         order by created_at desc limit $3`,
        [status ?? null, needle, Math.min(Math.max(limit, 1), 1000)],
      );
      return rows.map(fromRow);
    },
    byStatus: async (status) => (await q<MemberRow>('select * from members where status = $1 order by created_at asc limit 500', [status])).map(fromRow),
    create: (m, actor) =>
      fn('member_create($1::jsonb, $2, $3)', [
        JSON.stringify({
          email: normaliseEmail(m.email),
          kind: m.kind,
          name: m.name,
          organisation_name: m.organisationName,
          level: m.level,
          cycle: m.cycle,
          category: m.category,
          status: m.status,
          source: m.source,
          joined_at: m.joinedAt,
          paid_until: m.paidUntil,
          payment_mode: m.paymentMode,
          notes: m.notes,
          user_id: m.userId ?? null,
        }),
        actor.kind,
        actor.id,
      ]),
    update: (id, patch, actor) => fn('member_update($1, $2::jsonb, $3, $4)', [id, JSON.stringify(toPatchRow(patch)), actor.kind, actor.id]),
    linkStripe: (id, ids, actor) => fn('member_link_stripe($1, $2, $3, $4, $5)', [id, ids.customerId ?? null, ids.subscriptionId ?? null, actor.kind, actor.id]),
    confirmResignation: (id, actor, payload = {}) => fn('member_confirm_resignation($1, $2, $3, $4::jsonb)', [id, actor.kind, actor.id, JSON.stringify(payload)]),
    async transition(id, input) {
      const current = await one('id', id);
      if (!current) throw new MemberNotFound(id);
      if (input.from && current.status !== input.from) throw new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
      const t = checkTransition(current, input.to, input.actor.kind, input.reason);
      return fn('member_transition($1, $2, $3, $4, $5, $6, $7::jsonb)', [id, t.from, t.to, t.endedReason, input.actor.kind, input.actor.id, JSON.stringify(input.payload ?? {})]);
    },
    async acceptTerms(id, version, actor) {
      await q('select member_accept_terms($1, $2, $3, $4)', [id, version, actor.kind, actor.id]);
    },
    async acceptedTerms(id) {
      const rows = await q<{ version: string }>('select version from terms_acceptances where member_id = $1 order by accepted_at desc, id desc limit 1', [id]);
      return rows[0]?.version ?? null;
    },
    async issueCertificate(id, term, actor) {
      const rows = await q<CertificateRow>('select * from member_issue_certificate($1, $2::date, $3::date, $4, $5, $6)', [
        id,
        term.periodStart,
        term.periodEnd,
        term.stripeInvoiceId,
        actor.kind,
        actor.id,
      ]);
      return certFromRow(rows[0]!);
    },
    async certificates(id) {
      return (await q<CertificateRow>('select * from certificates where member_id = $1 order by period_start desc', [id])).map(certFromRow);
    },
    async stripeEventSeen(eventId) {
      return (await q('select 1 from stripe_events where id = $1', [eventId])).length > 0;
    },
    async markStripeEvent(eventId, type) {
      await q('insert into stripe_events (id, type) values ($1, $2) on conflict (id) do nothing', [eventId, type]);
    },
    async events(id) {
      const rows = await q<EventRow>('select * from member_events where member_id = $1 order by at asc, id asc', [id]);
      return rows.map((r) => ({
        id: String(r.id),
        memberId: r.member_id,
        type: r.type,
        fromStatus: r.from_status,
        toStatus: r.to_status,
        actor: { kind: r.actor_kind, id: r.actor_id },
        payload: r.payload,
        at: iso(r.at),
      }));
    },
  };
}
