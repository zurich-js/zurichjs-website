/**
 * The sponsor store on Postgres (Neon in production; a throwaway local Postgres in tests).
 * Server-side only. Each write is one statement: a data-modifying CTE changes the row and
 * appends the audit row, so both happen or neither does, without holding a client for a
 * transaction (it works on a pg.Pool). Status changes are compare-and-set.
 */
import { checkTransition, TransitionError } from './state.ts';
import { DuplicateContact, NotFound, ProposalOpen, normaliseEmail, type SponsorStore } from './store.ts';
import type { Actor, Agreement, Contact, Logo, Proposal, Sponsor, SponsorEvent, SponsorPatch } from './types.ts';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
}

type Row = Record<string, unknown>;

/** Ids come from URLs: anything that is not a uuid is simply not found (Postgres would raise). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_COLUMNS = new Set(['started_at', 'paid_until', 'event_date', 'ends_at']);

/** pg returns `date` columns as Date at local midnight unless told otherwise; keep YYYY-MM-DD. */
const day = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v as Date;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const iso = (v: unknown) => (v === null || v === undefined ? null : v instanceof Date ? v.toISOString() : new Date(String(v)).toISOString());

/** snake_case row → camelCase object; dates as YYYY-MM-DD, times as ISO. */
function camel<T>(r: Row): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) {
    const key = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = DATE_COLUMNS.has(k) ? day(v) : v instanceof Date ? v.toISOString() : v;
  }
  return out as T;
}

const sponsorOf = (r: Row): Sponsor => {
  const s = camel<Sponsor & { endedAt?: unknown; sponsorRef?: unknown }>(r);
  delete s.endedAt;
  delete s.sponsorRef;
  return s;
};
const eventOf = (r: Row): SponsorEvent => ({
  id: String(r.id),
  sponsorId: r.sponsor_id as string,
  type: r.type as string,
  fromStatus: r.from_status as SponsorEvent['fromStatus'],
  toStatus: r.to_status as SponsorEvent['toStatus'],
  actor: { kind: r.actor_kind as Actor['kind'], id: r.actor_id as string },
  payload: r.payload as Record<string, unknown>,
  at: iso(r.at)!,
});

const PATCH_COLUMNS: Record<keyof SponsorPatch, string> = {
  companyName: 'company_name',
  legalName: 'legal_name',
  billingAddress: 'billing_address',
  vatId: 'vat_id',
  website: 'website',
  tier: 'tier',
  cycle: 'cycle',
  paymentMode: 'payment_mode',
  startedAt: 'started_at',
  paidUntil: 'paid_until',
  eventId: 'event_id',
  eventTitle: 'event_title',
  eventDate: 'event_date',
  partnerId: 'partner_id',
  notes: 'notes',
};

function mapError(err: unknown): Error {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code === '23505' && e.constraint === 'sponsor_contacts_email_key') return new DuplicateContact('that email');
  if (e.code === '23505' && e.constraint === 'sponsor_proposals_one_open') return new ProposalOpen();
  return err instanceof Error ? err : new Error(String(e.message));
}

/** Appends the audit row for the rows of CTE `s` (which must return `id`). */
const AUDIT = (from = 'null', to = 'null') =>
  `e as (insert into sponsor_events (sponsor_id, type, from_status, to_status, actor_kind, actor_id, payload)
         select s.sponsor_ref, $type, ${from}, ${to}, $actor_kind, $actor_id, $payload::jsonb from s)`;

export function postgresStore(db: Queryable): SponsorStore {
  const q = async <R = Row>(text: string, params: unknown[] = []): Promise<R[]> => {
    try {
      return (await db.query<R>(text, params)).rows;
    } catch (err) {
      throw mapError(err);
    }
  };
  /**
   * Runs `cte` (a data-modifying statement aliased `s`, exposing `sponsor_ref`) and its
   * audit insert as one statement. `$type`, `$actor_kind`, `$actor_id`, `$payload` are
   * appended after the caller's parameters.
   */
  const audited = async (cte: string, params: unknown[], type: string, actor: Actor, payload: Row = {}, from?: string, to?: string) => {
    const n = params.length;
    const sql = `with s as (${cte}), ${AUDIT(from, to)} select * from s`
      .replaceAll('$type', `$${n + 1}`)
      .replaceAll('$actor_kind', `$${n + 2}`)
      .replaceAll('$actor_id', `$${n + 3}`)
      .replaceAll('$payload', `$${n + 4}`);
    return q(sql, [...params, type, actor.kind, actor.id, JSON.stringify(payload)]);
  };
  const one = async (where: string, value: unknown) => {
    if (where === 'id' && !UUID.test(String(value))) return null;
    const rows = await q(`select * from sponsors where ${where} = $1 limit 1`, [value]);
    return rows[0] ? sponsorOf(rows[0]) : null;
  };
  const must = async (id: string) => {
    const s = await one('id', id);
    if (!s) throw new NotFound('sponsor');
    return s;
  };

  return {
    get: (id) => one('id', id),
    byStripeSubscription: (id) => one('stripe_subscription_id', id),
    async search({ q: text, status, limit = 200 }) {
      const needle = text?.trim() ? `%${text.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
      const rows = await q(
        `select * from sponsors s
         where ($1::text is null or s.status = $1)
           and ($2::text is null or s.company_name ilike $2 or s.legal_name ilike $2
                or exists (select 1 from sponsor_contacts c where c.sponsor_id = s.id and (c.name ilike $2 or c.email::text ilike $2)))
         order by s.created_at desc limit $3`,
        [status ?? null, needle, Math.min(Math.max(limit, 1), 5000)],
      );
      return rows.map(sponsorOf);
    },
    async create(s, c, actor) {
      const rows = await q(
        `with s as (
           insert into sponsors (company_name, legal_name, billing_address, vat_id, website, tier, cycle, payment_mode, status, source,
                                 started_at, paid_until, event_id, event_title, event_date, notes)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) returning *),
         c as (insert into sponsor_contacts (sponsor_id, email, name, role) select id, $17, $18, $19 from s returning id as contact_id, email as contact_email, created_at as contact_created_at),
         e as (insert into sponsor_events (sponsor_id, type, to_status, actor_kind, actor_id, payload)
               select id, 'created', status, $20, $21, jsonb_build_object('source', source) from s)
         select * from s, c`,
        [
          s.companyName,
          s.legalName,
          s.billingAddress,
          s.vatId,
          s.website,
          s.tier,
          s.cycle,
          s.paymentMode,
          s.status,
          s.source,
          s.startedAt,
          s.paidUntil,
          s.eventId,
          s.eventTitle,
          s.eventDate,
          s.notes,
          normaliseEmail(c.email),
          c.name,
          c.role,
          actor.kind,
          actor.id,
        ],
      );
      const r = rows[0]!;
      const sponsor = sponsorOf(Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('contact_'))));
      return {
        sponsor,
        contact: {
          id: r.contact_id as string,
          sponsorId: sponsor.id,
          email: r.contact_email as string,
          name: c.name,
          role: c.role,
          userId: null,
          createdAt: iso(r.contact_created_at)!,
        },
      };
    },
    async update(id, patch, actor) {
      const entries = Object.entries(patch).filter(([, v]) => v !== undefined) as [keyof SponsorPatch, unknown][];
      if (!entries.length) return must(id);
      const sets = entries.map(([k], i) => `${PATCH_COLUMNS[k]} = $${i + 2}`).join(', ');
      const rows = await audited(`update sponsors set ${sets} where id = $1 returning *, id as sponsor_ref`, [id, ...entries.map(([, v]) => v)], 'updated', actor, {
        fields: entries.map(([k]) => k),
      });
      if (!rows[0]) throw new NotFound('sponsor');
      return sponsorOf(rows[0]);
    },
    async linkStripe(id, ids, actor) {
      const rows = await audited(
        `update sponsors set stripe_customer_id = coalesce($2, stripe_customer_id), stripe_subscription_id = coalesce($3, stripe_subscription_id)
         where id = $1 returning *, id as sponsor_ref`,
        [id, ids.customerId ?? null, ids.subscriptionId ?? null],
        'stripe_linked',
        actor,
        { ...ids },
      );
      if (!rows[0]) throw new NotFound('sponsor');
      return sponsorOf(rows[0]);
    },
    async transition(id, input) {
      const current = await must(id);
      if (input.from && current.status !== input.from) throw new TransitionError('The sponsorship changed in the meantime. Look again.', 'conflict');
      const t = checkTransition(current, input.to, input.actor.kind, input.reason);
      const rows = await audited(
        `update sponsors set status = $3, ended_reason = $4,
           ended_at = case when $3 = 'ended' then now() else null end,
           end_requested_at = case when $3 = 'ending' then now() when $3 = 'ended' then end_requested_at else null end,
           ends_at = case when $3 = 'ending' then $5::date when $3 = 'ended' then ends_at else null end
         where id = $1 and status = $2 returning *, id as sponsor_ref`,
        [id, t.from, t.to, t.endedReason, input.endsAt ?? null],
        'status_changed',
        input.actor,
        { ...input.payload, ...(t.endedReason ? { reason: t.endedReason } : {}), ...(input.endsAt ? { endsAt: input.endsAt } : {}) },
        '$2',
        '$3',
      );
      if (!rows[0]) throw new TransitionError('The sponsorship changed in the meantime. Look again.', 'conflict');
      return sponsorOf(rows[0]);
    },

    contacts: async (sponsorId) => (await q('select * from sponsor_contacts where sponsor_id = $1 order by created_at', [sponsorId])).map((r) => camel<Contact>(r)),
    contactByUser: async (userId) => {
      const r = (await q('select * from sponsor_contacts where user_id = $1', [userId]))[0];
      return r ? camel<Contact>(r) : null;
    },
    contactByEmail: async (email) => {
      const r = (await q('select * from sponsor_contacts where email = $1', [normaliseEmail(email)]))[0];
      return r ? camel<Contact>(r) : null;
    },
    async addContact(sponsorId, c, actor) {
      const rows = await audited(
        `insert into sponsor_contacts (sponsor_id, email, name, role) values ($1, $2, $3, $4) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, normaliseEmail(c.email), c.name, c.role],
        'contact_added',
        actor,
        { role: c.role },
      );
      const { sponsorRef: _, ...contact } = camel<Contact & { sponsorRef: string }>(rows[0]!);
      return contact;
    },
    async linkContact(contactId, userId) {
      const r = (await q('update sponsor_contacts set user_id = $2 where id = $1 returning *', [contactId, userId]))[0];
      if (!r) throw new NotFound('contact');
      return camel<Contact>(r);
    },
    async removeContact(contactId, actor) {
      const rows = await audited(`delete from sponsor_contacts where id = $1 returning sponsor_id as sponsor_ref`, [contactId], 'contact_removed', actor, { contactId });
      if (!rows[0]) throw new NotFound('contact');
    },

    async acceptAgreement(sponsorId, a, actor) {
      const rows = await audited(
        `insert into sponsor_agreements (sponsor_id, version, signer_name, signer_title, signer_email, context, summary)
         values ($1, $2, $3, $4, $5, $6, $7) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, a.version, a.signerName, a.signerTitle, normaliseEmail(a.signerEmail), a.context, a.summary],
        'agreement_accepted',
        actor,
        { version: a.version, context: a.context },
      );
      const { sponsorRef: _, ...ag } = camel<Agreement & { sponsorRef: string }>(rows[0]!);
      return ag;
    },
    agreements: async (sponsorId) => (await q('select * from sponsor_agreements where sponsor_id = $1 order by accepted_at desc', [sponsorId])).map((r) => camel<Agreement>(r)),

    async propose(sponsorId, p, actor) {
      const rows = await audited(
        `insert into sponsor_proposals (sponsor_id, kind, tier, cycle, message, expires_at, created_by)
         values ($1, $2, $3, $4, $5, $6, $7) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, p.kind, p.tier, p.cycle, p.message, p.expiresAt, actor.id],
        'proposal_created',
        actor,
        { kind: p.kind, tier: p.tier, cycle: p.cycle },
      );
      const { sponsorRef: _, ...pr } = camel<Proposal & { sponsorRef: string }>(rows[0]!);
      return pr;
    },
    getProposal: async (id) => {
      if (!UUID.test(id)) return null;
      const r = (await q('select * from sponsor_proposals where id = $1', [id]))[0];
      return r ? camel<Proposal>(r) : null;
    },
    proposals: async (sponsorId) => (await q('select * from sponsor_proposals where sponsor_id = $1 order by created_at desc', [sponsorId])).map((r) => camel<Proposal>(r)),
    async decideProposal(id, to, by, actor) {
      const rows = await audited(
        `update sponsor_proposals set status = $2, decided_by = $3, decided_at = now() where id = $1 and status = 'open' returning *, sponsor_id as sponsor_ref`,
        [id, to, by],
        `proposal_${to}`,
        actor,
        { proposalId: id },
      );
      if (!rows[0]) {
        const exists = (await q('select 1 from sponsor_proposals where id = $1', [id])).length;
        throw exists ? new TransitionError('That proposal was already answered.', 'conflict') : new NotFound('proposal');
      }
      const { sponsorRef: _, ...pr } = camel<Proposal & { sponsorRef: string }>(rows[0]);
      return pr;
    },

    async addLogo(sponsorId, l, actor) {
      const rows = await audited(
        `insert into sponsor_logos (sponsor_id, blob_key, content_type, bytes, filename, uploaded_by) values ($1, $2, $3, $4, $5, $6) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, l.blobKey, l.contentType, l.bytes, l.filename, l.uploadedBy],
        'logo_uploaded',
        actor,
      );
      const { sponsorRef: _, ...logo } = camel<Logo & { sponsorRef: string }>(rows[0]!);
      return logo;
    },
    getLogo: async (id) => {
      if (!UUID.test(id)) return null;
      const r = (await q('select * from sponsor_logos where id = $1', [id]))[0];
      return r ? camel<Logo>(r) : null;
    },
    logos: async (sponsorId) => (await q('select * from sponsor_logos where sponsor_id = $1 order by uploaded_at desc', [sponsorId])).map((r) => camel<Logo>(r)),
    async reviewLogo(id, review, note, actor) {
      const rows = await audited(
        `update sponsor_logos set review = $2, review_note = $3, reviewed_at = now() where id = $1 returning *, sponsor_id as sponsor_ref`,
        [id, review, note],
        `logo_${review}`,
        actor,
        { logoId: id },
      );
      if (!rows[0]) throw new NotFound('logo');
      const { sponsorRef: _, ...logo } = camel<Logo & { sponsorRef: string }>(rows[0]);
      return logo;
    },

    stripeEventSeen: async (id) => (await q('select 1 from sponsor_stripe_events where id = $1', [id])).length > 0,
    markStripeEvent: async (id, type) => void (await q('insert into sponsor_stripe_events (id, type) values ($1, $2) on conflict (id) do nothing', [id, type])),
    events: async (sponsorId) => (await q('select * from sponsor_events where sponsor_id = $1 order by at, id', [sponsorId])).map(eventOf),
  };
}
