/**
 * The sponsor store on Postgres (Neon in production; a throwaway local Postgres in tests).
 * Server-side only. Each write is one statement: a data-modifying CTE changes the row and
 * appends the audit row, so both happen or neither does, without holding a client for a
 * transaction (it works on a pg.Pool). Status changes are compare-and-set. The few steps that must
 * read before they write (a payment link kept against one being switched off) run in a transaction
 * on one connection of the pool (`tx`).
 */
import { checkTransition, TransitionError } from './state.ts';
import {
  settleInvoice,
  DuplicateContact,
  NotFound,
  contactRequired,
  normaliseEmail,
  type SponsorStore,
  type SponsorSummary,
  type StripeExpect,
  type StripeLinks,
} from './store.ts';
import type {
  Actor,
  CoverageRow,
  Agreement,
  Contact,
  LinkAttempt,
  Logo,
  NewNotice,
  Sponsor,
  SponsorDocument,
  SponsorEvent,
  SponsorMeetup,
  SponsorNotice,
  SponsorPatch,
  Status,
} from './types.ts';

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
  /** A pool (pg.Pool) lends one connection for a transaction; without it the queryable is used as it is (a single client). */
  connect?(): Promise<Pick<Queryable, 'query'> & { release(err?: Error | boolean): void }>;
}

type Row = Record<string, unknown>;

/** Ids come from URLs: anything that is not a uuid is simply not found (Postgres would raise). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_COLUMNS = new Set(['started_at', 'paid_until', 'ends_at', 'date', 'signed_on']);

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
  pricePerMeetup: 'price_per_meetup',
  partnerId: 'partner_id',
  notes: 'notes',
};

const STRIPE_COLUMNS: Record<keyof StripeLinks, string> = {
  customerId: 'stripe_customer_id',
  subscriptionId: 'stripe_subscription_id',
  checkoutSessionId: 'checkout_session_id',
  paymentLinkId: 'payment_link_id',
  paymentLinkUrl: 'payment_link_url',
};

/** Only known keys with a value (null included); never a column name from outside. */
const setters = <K extends string>(map: Record<K, string>, values: Partial<Record<K, unknown>>) =>
  (Object.entries(values) as [K, unknown][]).filter(([k, v]) => v !== undefined && Object.hasOwn(map, k));

const MEETUP = 'event_id, title, date';
const meetupOf = (r: Row) => camel<SponsorMeetup>(r);

/**
 * Upserts `$2` (a JSON list of { event_id, title, date }) for sponsor `$1` by the actor kind in
 * placeholder `kind`. A row taken off is confirmed again, by this actor and now; a covered row
 * keeps its confirmation.
 */
const upsertMeetups = (kind: string) => `insert into sponsor_meetups (sponsor_id, event_id, title, date, confirmed_by)
  select $1, x.event_id, x.title, x.date::date, ${kind} from jsonb_to_recordset($2::jsonb) as x(event_id text, title text, date text)
  on conflict (sponsor_id, event_id) do update set title = excluded.title, date = excluded.date,
    confirmed_at = case when sponsor_meetups.removed_at is null then sponsor_meetups.confirmed_at else now() end,
    confirmed_by = case when sponsor_meetups.removed_at is null then sponsor_meetups.confirmed_by else excluded.confirmed_by end,
    removed_at = null, removed_by = null`;

function mapError(err: unknown): Error {
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code === '23505' && e.constraint === 'sponsor_contacts_email_key') return new DuplicateContact('that email');
  return err instanceof Error ? err : new Error(String(e.message));
}

/** Appends the audit row for the rows of CTE `s` (which must return `id`). */
const AUDIT = (from = 'null', to = 'null') =>
  `e as (insert into sponsor_events (sponsor_id, type, from_status, to_status, actor_kind, actor_id, payload)
         select s.sponsor_ref, $type, ${from}, ${to}, $actor_kind, $actor_id, $payload::jsonb from s)`;

/** Inserts notices from a jsonb array parameter for the sponsor `sponsorSql` selects; a key already there is kept. */
const INSERT_NOTICES = (sponsorId: string, param: string, from = '') =>
  `insert into sponsor_notices (sponsor_id, key, body)
   select ${sponsorId}, x.key, x.body from ${from}jsonb_to_recordset(${param}::jsonb) as x(key text, body jsonb)
   on conflict (key) do nothing`;
const noticeRows = (list: NewNotice[] = []) => JSON.stringify(list.map((x) => ({ key: x.key, body: x.body })));

type Run = <R = Row>(text: string, params?: unknown[]) => Promise<R[]>;

const runner =
  (db: Pick<Queryable, 'query'>): Run =>
  async <R = Row>(text: string, params: unknown[] = []) => {
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
const auditedOn =
  (q: Run) =>
  async (cte: string, params: unknown[], type: string, actor: Actor, payload: Row = {}, from?: string, to?: string, more = '') => {
    const n = params.length;
    const sql = `with s as (${cte}), ${AUDIT(from, to)}${more} select * from s`
      .replaceAll('$type', `$${n + 1}`)
      .replaceAll('$actor_kind', `$${n + 2}`)
      .replaceAll('$actor_id', `$${n + 3}`)
      .replaceAll('$payload', `$${n + 4}`);
    return q(sql, [...params, type, actor.kind, actor.id, JSON.stringify(payload)]);
  };

const attemptOf = (r: Row): LinkAttempt => ({
  key: String(r.key),
  sponsorId: r.sponsor_id as string,
  request: r.request as string,
  linkId: (r.link_id as string | null) ?? null,
  state: r.state as LinkAttempt['state'],
  createdAt: iso(r.created_at)!,
  ageMs: Number(r.age_ms),
});

export function postgresStore(db: Queryable): SponsorStore {
  const q = runner(db);
  const audited = auditedOn(q);
  /** `fn` in one transaction on one connection; rolled back when it throws or answers `rollback`. */
  const tx = async <T>(fn: (q: Run) => Promise<T>): Promise<T> => {
    const client = db.connect ? await db.connect() : undefined;
    const c = client ?? db;
    try {
      await c.query('begin');
      const out = await fn(runner(c));
      await c.query('commit');
      return out;
    } catch (err) {
      await c.query('rollback').catch(() => undefined);
      throw mapError(err);
    } finally {
      client?.release();
    }
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
  const covered = async (sponsorId: string) =>
    UUID.test(sponsorId) ? (await q(`select ${MEETUP} from sponsor_meetups where sponsor_id = $1 and removed_at is null order by date, event_id`, [sponsorId])).map(meetupOf) : [];

  /**
   * With `expect`: only while those columns hold those values (null matches null); undefined
   * otherwise. With `expect.attempt`, in a transaction that locks that payment link attempt first
   * and marks it kept: a cleanup claiming it at the same time waits, then finds it kept.
   */
  async function linkStripe(id: string, links: StripeLinks, actor: Actor, expect?: StripeExpect, run: Run = q): Promise<Sponsor | undefined> {
    if (expect?.attempt !== undefined && run === q)
      return tx(async (t) => {
        const open = await t("select 1 from sponsor_payment_link_attempts where key = $1 and sponsor_id = $2 and state = 'open' for update", [expect.attempt, id]);
        if (!open.length) return undefined;
        const s = await linkStripe(id, links, actor, expect, t);
        if (s)
          await t("update sponsor_payment_link_attempts set state = 'kept', link_id = coalesce($2, link_id), updated_at = now() where key = $1", [
            expect.attempt,
            links.paymentLinkId ?? null,
          ]);
        return s;
      });
    const entries = setters(STRIPE_COLUMNS, links);
    if (!entries.length) return must(id);
    const checks = expect ? setters(STRIPE_COLUMNS, expect) : [];
    const sets = entries.map(([k], i) => `${STRIPE_COLUMNS[k]} = $${i + 2}`).join(', ');
    const n = entries.length + 2;
    const where = checks.map(([k], i) => ` and ${STRIPE_COLUMNS[k]} is not distinct from $${n + i}`).join('') + (expect?.status ? ` and status = $${n + checks.length}` : '');
    const rows = await auditedOn(run)(
      `update sponsors set ${sets} where id = $1${where} returning *, id as sponsor_ref`,
      [id, ...entries.map(([, v]) => v), ...checks.map(([, v]) => v), ...(expect?.status ? [expect.status] : [])],
      'stripe_linked',
      actor,
      Object.fromEntries(entries),
    );
    if (rows[0]) return sponsorOf(rows[0]);
    if (expect) return undefined;
    throw new NotFound('sponsor');
  }

  return {
    get: (id) => one('id', id),
    byStripeSubscription: (id) => one('stripe_subscription_id', id),
    byPaymentLink: (id) => one('payment_link_id', id),
    byStripeCustomer: (id) => one('stripe_customer_id', id),
    async search({ q: text, status, limit = 200 }) {
      const needle = text?.trim() ? `%${text.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
      const rows = await q(
        `select * from sponsors s
         where ($1::text is null or s.status = $1)
           and ($2::text is null or s.company_name ilike $2 or s.legal_name ilike $2)
         order by s.created_at desc limit $3`,
        [status ?? null, needle, Math.min(Math.max(limit, 1), 5000)],
      );
      return rows.map(sponsorOf);
    },
    statusCounts: async () =>
      Object.fromEntries((await q<{ status: Status; n: number }>('select status, count(*)::int as n from sponsors group by status')).map((r) => [r.status, r.n])),
    async create(s, c, actor, opts = {}) {
      const meetups = [...new Map((opts.meetups ?? []).map((m) => [m.eventId, m])).values()];
      // One statement: the sponsor, its contact (moved from a colleague's unaccepted invitation, or
      // new), its meetups and the audit rows. `ins` reads `moved`, so it runs after it.
      const rows = await q(
        `with s as (
           insert into sponsors (company_name, legal_name, billing_address, vat_id, website, tier, cycle, payment_mode, status, source,
                                 started_at, paid_until, price_per_meetup, notes)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) returning *),
         moved as (update sponsor_contacts c set sponsor_id = (select id from s), name = $16, role = $17, added_by = $18
                   from sponsor_contacts old
                   where $21::boolean and old.id = c.id and c.email = $15 and c.added_by = 'sponsor' and c.user_id is null
                   returning c.id as contact_id, c.email as contact_email, c.added_by as contact_added_by, c.created_at as contact_created_at, old.sponsor_id as moved_from),
         ins as (insert into sponsor_contacts (sponsor_id, email, name, role, added_by) select id, $15, $16, $17, $18 from s where not exists (select 1 from moved)
                 returning id as contact_id, email as contact_email, added_by as contact_added_by, created_at as contact_created_at),
         c as (select contact_id, contact_email, contact_added_by, contact_created_at from moved union all select * from ins),
         m as (insert into sponsor_meetups (sponsor_id, event_id, title, date)
               select s.id, x.event_id, x.title, x.date::date from s, jsonb_to_recordset($22::jsonb) as x(event_id text, title text, date text)),
         e as (insert into sponsor_events (sponsor_id, type, to_status, actor_kind, actor_id, payload)
               select id, 'created', status, $19, $20, jsonb_build_object('source', source) from s
               union all select id, 'meetups_set', null, $19, $20, jsonb_build_object('events', $23::jsonb) from s where jsonb_array_length($22::jsonb) > 0
               union all select moved_from, 'contact_removed', null, $19, $20, jsonb_build_object('contactId', contact_id, 'movedTo', (select id from s)) from moved)
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
          s.pricePerMeetup,
          s.notes,
          normaliseEmail(c.email),
          c.name,
          c.role,
          c.addedBy ?? 'board',
          actor.kind,
          actor.id,
          !!opts.claimUnconfirmed,
          JSON.stringify(meetups.map((m) => ({ event_id: m.eventId, title: m.title, date: m.date }))),
          JSON.stringify(meetups.map((m) => m.eventId)),
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
          addedBy: r.contact_added_by as Contact['addedBy'],
          createdAt: iso(r.contact_created_at)!,
        },
      };
    },
    async update(id, patch, actor) {
      const entries = setters(PATCH_COLUMNS, patch);
      if (!entries.length) return must(id);
      const sets = entries.map(([k], i) => `${PATCH_COLUMNS[k]} = $${i + 2}`).join(', ');
      const rows = await audited(`update sponsors set ${sets} where id = $1 returning *, id as sponsor_ref`, [id, ...entries.map(([, v]) => v)], 'updated', actor, {
        fields: entries.map(([k]) => k),
      });
      if (!rows[0]) throw new NotFound('sponsor');
      return sponsorOf(rows[0]);
    },
    linkStripe: async (id, links, actor) => (await linkStripe(id, links, actor))!,
    linkStripeIf: async (id, expect, links, actor) => (await linkStripe(id, links, actor, expect)) ?? null,
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
        [id, t.from, t.to, t.endedReason, input.endsAt ?? null, noticeRows(input.notices)],
        'status_changed',
        input.actor,
        { ...input.payload, ...(t.endedReason ? { reason: t.endedReason } : {}), ...(input.endsAt ? { endsAt: input.endsAt } : {}) },
        '$2',
        '$3',
        `, n as (${INSERT_NOTICES('s.sponsor_ref', '$6', 's, ')})`,
      );
      if (!rows[0]) throw new TransitionError('The sponsorship changed in the meantime. Look again.', 'conflict');
      return sponsorOf(rows[0]);
    },

    meetups: covered,
    pendingMeetupRebuilds: async () =>
      (await q<{ meetup_rebuild_id: string }>('select meetup_rebuild_id from sponsors where meetup_rebuild_id is not null')).map((r) => r.meetup_rebuild_id),
    async acknowledgeMeetupRebuilds(versions) {
      await q('update sponsors set meetup_rebuild_id = null where meetup_rebuild_id = any($1::uuid[])', [versions]);
    },
    async summaries(sponsorIds) {
      const byId = new Map<string, SponsorSummary>(sponsorIds.map((id) => [id.toLowerCase(), { meetups: [], hasContract: false, latestLogo: null }]));
      const out = new Map(sponsorIds.map((id) => [id, byId.get(id.toLowerCase())!]));
      const ids = [...byId.keys()].filter((id) => UUID.test(id));
      if (!ids.length) return out;
      const [meetups, contracts, logos] = await Promise.all([
        q('select sponsor_id, event_id, title, date from sponsor_meetups where sponsor_id = any($1::uuid[]) and removed_at is null order by date, event_id', [ids]),
        q('select distinct sponsor_id from sponsor_documents where sponsor_id = any($1::uuid[])', [ids]),
        q('select distinct on (sponsor_id) * from sponsor_logos where sponsor_id = any($1::uuid[]) order by sponsor_id, uploaded_at desc', [ids]),
      ]);
      const of = (sponsorId: unknown) => byId.get(String(sponsorId).toLowerCase())!;
      for (const { sponsor_id, ...m } of meetups) of(sponsor_id).meetups.push(camel<SponsorMeetup>(m));
      for (const r of contracts) of(r.sponsor_id).hasContract = true;
      for (const r of logos) of(r.sponsor_id).latestLogo = camel<Logo>(r);
      return out;
    },
    async setMeetups(sponsorId, list, actor) {
      const unique = [...new Map(list.map((m) => [m.eventId, m])).values()];
      // One statement: take off the covered meetups not in the list (the row stays), upsert the
      // list (a row taken off is confirmed again), and append the audit row. The two never touch
      // the same row.
      await q(
        `with gone as (update sponsor_meetups set removed_at = now(), removed_by = $4
                       where sponsor_id = $1 and removed_at is null and not (event_id = any($3::text[]))),
              ins as (${upsertMeetups('$4')})
         insert into sponsor_events (sponsor_id, type, actor_kind, actor_id, payload) values ($1, 'meetups_set', $4, $5, $6::jsonb)`,
        [
          sponsorId,
          JSON.stringify(unique.map((m) => ({ event_id: m.eventId, title: m.title, date: m.date }))),
          unique.map((m) => m.eventId),
          actor.kind,
          actor.id,
          JSON.stringify({ events: [...unique].sort((a, b) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId)).map((m) => m.eventId) }),
        ],
      );
      return covered(sponsorId);
    },
    coverage: async (sponsorId) =>
      UUID.test(sponsorId)
        ? (await q('select * from sponsor_meetups where sponsor_id = $1 order by date, event_id', [sponsorId])).map((r) => {
            const { sponsorId: _, ...row } = camel<CoverageRow & { sponsorId: string }>(r);
            return row;
          })
        : [],
    async cover(sponsorId, m, actor) {
      await q(
        `with ins as (${upsertMeetups('$3')})
         insert into sponsor_events (sponsor_id, type, actor_kind, actor_id, payload) values ($1, 'meetup_covered', $3, $4, $5::jsonb)`,
        [sponsorId, JSON.stringify([{ event_id: m.eventId, title: m.title, date: m.date }]), actor.kind, actor.id, JSON.stringify({ eventId: m.eventId })],
      );
      return covered(sponsorId);
    },
    async uncover(sponsorId, eventId, actor) {
      const rows = await audited(
        `update sponsor_meetups set removed_at = now(), removed_by = $3 where sponsor_id = $1 and event_id = $2 and removed_at is null returning sponsor_id as sponsor_ref`,
        [sponsorId, eventId, actor.kind],
        'meetup_uncovered',
        actor,
        { eventId },
      );
      if (!rows[0]) throw new NotFound('covered meetup');
      return covered(sponsorId);
    },

    contacts: async (sponsorId) =>
      UUID.test(sponsorId) ? (await q('select * from sponsor_contacts where sponsor_id = $1 order by created_at', [sponsorId])).map((r) => camel<Contact>(r)) : [],
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
        `insert into sponsor_contacts (sponsor_id, email, name, role, added_by) values ($1, $2, $3, $4, $5) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, normaliseEmail(c.email), c.name, c.role, c.addedBy ?? 'board'],
        'contact_added',
        actor,
        { role: c.role, addedBy: c.addedBy ?? 'board' },
      );
      const { sponsorRef: _, ...contact } = camel<Contact & { sponsorRef: string }>(rows[0]!);
      return contact;
    },
    async linkContact(contactId, userId) {
      const r = (await q('update sponsor_contacts set user_id = $2 where id = $1 returning *', [contactId, userId]))[0];
      if (!r) throw new NotFound('contact');
      return camel<Contact>(r);
    },
    removeContact: (contactId, actor) =>
      tx(async (t) => {
        if (!UUID.test(contactId)) throw new NotFound('contact');
        // The sponsor row is locked first, so a second removal for the same sponsor waits and then
        // sees the contacts this one left.
        const locked = await t('select s.id from sponsors s join sponsor_contacts c on c.sponsor_id = s.id where c.id = $1 for update of s', [contactId]);
        if (!locked[0]) throw new NotFound('contact');
        const all = (await t('select * from sponsor_contacts where sponsor_id = $1', [locked[0].id])).map((r) => camel<Contact>(r));
        const refused = contactRequired(
          all.find((c) => c.id === contactId)!,
          all.filter((c) => c.id !== contactId),
        );
        if (refused) throw refused;
        await auditedOn(t)(`delete from sponsor_contacts where id = $1 returning sponsor_id as sponsor_ref`, [contactId], 'contact_removed', actor, { contactId });
      }),

    acceptAgreement: (sponsorId, a, actor, notices) =>
      tx(async (t) => {
        const rows = await auditedOn(t)(
          `insert into sponsor_agreements (sponsor_id, version, signer_name, signer_title, signer_email, context, summary)
           values ($1, $2, $3, $4, $5, $6, $7) returning *, sponsor_id as sponsor_ref`,
          [sponsorId, a.version, a.signerName, a.signerTitle, normaliseEmail(a.signerEmail), a.context, a.summary],
          'agreement_accepted',
          actor,
          { version: a.version, context: a.context },
        );
        const { sponsorRef: _, ...ag } = camel<Agreement & { sponsorRef: string }>(rows[0]!);
        const owed = notices?.(ag) ?? [];
        if (owed.length) await t(INSERT_NOTICES('$1::uuid', '$2'), [sponsorId, noticeRows(owed)]);
        return ag;
      }),
    agreements: async (sponsorId) => (await q('select * from sponsor_agreements where sponsor_id = $1 order by accepted_at desc', [sponsorId])).map((r) => camel<Agreement>(r)),

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
    async addDocument(sponsorId, d, actor) {
      const rows = await audited(
        `insert into sponsor_documents (sponsor_id, blob_key, filename, bytes, signed_on, uploaded_by) values ($1, $2, $3, $4, $5, $6) returning *, sponsor_id as sponsor_ref`,
        [sponsorId, d.blobKey, d.filename, d.bytes, d.signedOn, d.uploadedBy],
        'contract_attached',
        actor,
      );
      const { sponsorRef: _, ...doc } = camel<SponsorDocument & { sponsorRef: string }>(rows[0]!);
      return doc;
    },
    getDocument: async (id) => {
      if (!UUID.test(id)) return null;
      const r = (await q('select * from sponsor_documents where id = $1', [id]))[0];
      return r ? camel<SponsorDocument>(r) : null;
    },
    documents: async (sponsorId) =>
      UUID.test(sponsorId) ? (await q('select * from sponsor_documents where sponsor_id = $1 order by uploaded_at desc', [sponsorId])).map((r) => camel<SponsorDocument>(r)) : [],

    async queueNotices(sponsorId, list, event) {
      if (!event) return list.length ? (await q(`${INSERT_NOTICES('$1::uuid', '$2')} returning id`, [sponsorId, noticeRows(list)])).length : 0;
      const rows = await q(
        `with n as (${INSERT_NOTICES('$1::uuid', '$2')} returning id),
              e as (insert into sponsor_events (sponsor_id, type, actor_kind, actor_id, payload)
                    select $1, $3, $4, $5, $6::jsonb where exists (select 1 from n) or $2::jsonb = '[]'::jsonb)
         select (select count(*) from n)::int as added`,
        [sponsorId, noticeRows(list), event.type, event.actor.kind, event.actor.id, JSON.stringify(event.payload ?? {})],
      );
      return Number(rows[0]?.added ?? 0);
    },
    claimNotices: async ({ sponsorId, limit }) =>
      (
        await q(
          `update sponsor_notices set claimed_at = now(), attempts = attempts + 1
           where id in (select id from sponsor_notices
                        where sent_at is null and (claimed_at is null or claimed_at < now() - interval '5 minutes')
                          and ($1::uuid is null or sponsor_id = $1)
                        order by id limit $2 for update skip locked)
           returning *`,
          [sponsorId && UUID.test(sponsorId) ? sponsorId : null, limit],
        )
      )
        .map((r) => ({ ...camel<SponsorNotice & { claimedAt?: unknown }>(r), id: String(r.id) }))
        .map(({ claimedAt: _, ...n }) => n)
        .sort((a, b) => Number(a.id) - Number(b.id)),
    async noticeDone(id, error) {
      await q(
        error
          ? 'update sponsor_notices set claimed_at = null, last_error = left($2, 500) where id = $1'
          : 'update sponsor_notices set claimed_at = null, sent_at = now(), last_error = null where id = $1',
        error ? [id, error] : [id],
      );
    },
    async beginLinkAttempt(sponsorId, request, key = crypto.randomUUID()) {
      if (!UUID.test(sponsorId)) throw new NotFound('sponsor');
      const r = (
        await q(
          `insert into sponsor_payment_link_attempts (sponsor_id,request,key) select id,$2,$3 from sponsors where id=$1 and status <> 'ended' for share
        on conflict (key) do update set key=excluded.key where sponsor_payment_link_attempts.sponsor_id=excluded.sponsor_id
        and sponsor_payment_link_attempts.request=excluded.request returning *,extract(epoch from clock_timestamp()-created_at)*1000 as age_ms`,
          [sponsorId, request, key],
        )
      )[0];
      if (!r) throw new TransitionError('The payment link or sponsorship changed.', 'conflict');
      return attemptOf(r);
    },
    async linkAttemptCreated(key, linkId) {
      await q('update sponsor_payment_link_attempts set link_id = $2, updated_at = now() where key = $1', [key, linkId]);
    },
    async claimLinkCleanup(key, linkId) {
      const rows = await q(
        `update sponsor_payment_link_attempts set state = 'closing', link_id = coalesce($2, link_id), updated_at = now()
         where key = $1 and state in ('open', 'closing') returning key`,
        [key, linkId ?? null],
      );
      return rows.length > 0;
    },
    async linkAttemptClosed(key) {
      await q("update sponsor_payment_link_attempts set state = 'closed', updated_at = now() where key = $1 and state = 'closing'", [key]);
    },
    unsettledLinkAttempts: async ({ sponsorId, limit }) =>
      sponsorId !== undefined && !UUID.test(sponsorId)
        ? []
        : (
            await q(
              `select *, extract(epoch from clock_timestamp() - created_at) * 1000 as age_ms from sponsor_payment_link_attempts where state in ('open', 'closing') and ($1::uuid is null or sponsor_id = $1::uuid)
           order by updated_at, created_at, key limit $2`,
              [sponsorId ?? null, Math.min(Math.max(limit, 1), 1000)],
            )
          ).map(attemptOf),

    stripeEventSeen: async (id) => (await q('select 1 from sponsor_stripe_events where id = $1', [id])).length > 0,
    markStripeEvent: async (id, type) => void (await q('insert into sponsor_stripe_events (id, type) values ($1, $2) on conflict (id) do nothing', [id, type])),
    events: async (sponsorId) => (await q('select * from sponsor_events where sponsor_id = $1 order by at, id', [sponsorId])).map(eventOf),
    async log(sponsorId, type, actor, payload = {}) {
      await q('insert into sponsor_events (sponsor_id, type, actor_kind, actor_id, payload) values ($1, $2, $3, $4, $5::jsonb)', [
        sponsorId,
        type,
        actor.kind,
        actor.id,
        JSON.stringify(payload),
      ]);
    },
    paidInvoice: (sponsorId, p, actor, { clearOverdue }) =>
      tx(async (t) => {
        const [row] = await t('select * from sponsors where id = $1 for update', [sponsorId]);
        if (!row) throw new NotFound('sponsor');
        const before = sponsorOf(row);
        const history = (await t("select * from sponsor_events where sponsor_id = $1 and type in ('status_changed','stripe_linked','invoice_paid') order by id", [sponsorId])).map(
          eventOf,
        );
        const settled = settleInvoice(before, history, p, clearOverdue);
        if (!settled) return before;
        const s = settled.sponsor;
        const payload = { invoice: p.invoice, subscriptionId: p.subscriptionId, ...(p.created ? { created: p.created } : {}) };
        const [saved] = await auditedOn(t)(
          `update sponsors set status=$2, tier=$3, cycle=$4, payment_mode=$5, stripe_subscription_id=$6,
           checkout_session_id=$7, started_at=$8, paid_until=$9 where id=$1 returning *, id as sponsor_ref`,
          [sponsorId, s.status, s.tier, s.cycle, s.paymentMode, s.stripeSubscriptionId, s.checkoutSessionId, s.startedAt, s.paidUntil],
          'invoice_paid',
          actor,
          payload,
        );
        if (before.status !== s.status)
          await t(
            `insert into sponsor_events (sponsor_id,type,from_status,to_status,actor_kind,actor_id,payload)
           values ($1,'status_changed',$2,$3,$4,$5,$6::jsonb)`,
            [sponsorId, before.status, s.status, actor.kind, actor.id, JSON.stringify(payload)],
          );
        if (settled.notices.length) await t(INSERT_NOTICES('$1::uuid', '$2'), [sponsorId, noticeRows(settled.notices)]);
        return sponsorOf(saved!);
      }),
    overdueInvoice: (sponsorId, p, actor, notices) =>
      tx(async (t) => {
        // Locked first, as in paidInvoice, so a payment for this invoice is either seen here or comes after.
        const row = (await t('select * from sponsors where id = $1 for update', [sponsorId]))[0];
        if (!row) throw new NotFound('sponsor');
        const s = sponsorOf(row);
        const paid = await t(
          `select 1 from sponsor_events where sponsor_id = $1 and payload->>'invoice' = $2
             and (type = 'invoice_paid' or (type = 'status_changed' and to_status = 'active')) limit 1`,
          [sponsorId, p.invoice],
        );
        if (paid.length) return { sponsor: s, outcome: 'paid' as const };
        if (!p.subscriptionId || s.stripeSubscriptionId !== p.subscriptionId) return { sponsor: s, outcome: 'stale' as const };
        if (!['active', 'past_due', 'ending'].includes(s.status)) return { sponsor: s, outcome: 'not_running' as const };
        if (notices.length) await t(INSERT_NOTICES('$1::uuid', '$2'), [sponsorId, noticeRows(notices)]);
        if (s.status !== 'active') return { sponsor: s, outcome: 'overdue' as const };
        const rows = await auditedOn(t)(
          `update sponsors set status = 'past_due' where id = $1 and status = 'active' returning *, id as sponsor_ref`,
          [sponsorId],
          'status_changed',
          actor,
          { invoice: p.invoice, ...p.payload },
          "'active'",
          "'past_due'",
        );
        return { sponsor: sponsorOf(rows[0]!), outcome: 'overdue' as const };
      }),
  };
}
