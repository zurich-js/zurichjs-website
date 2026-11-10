/**
 * apps/web/database/migrations on a real (local) Postgres, applied in
 * order as Netlify applies them, and the Postgres member store against it.
 * Skips when Postgres is not installed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DuplicateEmail, postgresStore, TransitionError, type MemberStore, type NewMember } from '../src/index.ts';
import { startPg, type Pg } from './pg.ts';

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;

const stripe = { kind: 'stripe', id: 'evt_1' } as const;
const board = { kind: 'board', id: 'U08MMPMNLKZ' } as const;

const person: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: 'ada@example.com',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'pending',
  source: 'self_serve',
  joinedAt: null,
  paidUntil: null,
  paymentMode: 'automatic',
  notes: null,
};

d('membership database', () => {
  const pgdb = db as Pg;
  let pool: pg.Pool;
  let store: MemberStore;
  const user = (id: string, email: string) => pgdb.sql(`insert into "user" (id, name, email, "emailVerified") values ('${id}', '', '${email}', true)`);

  beforeAll(() => {
    for (const f of readdirSync(migrations).sort()) pgdb.sql(readFileSync(join(migrations, f), 'utf8'));
    pool = new pg.Pool({ ...pgdb.connection, max: 2 });
    store = postgresStore(pool);
  });
  afterAll(async () => {
    await pool?.end();
    pgdb.stop();
  });

  it('applies the migrations in order: Better Auth tables first, then membership', () => {
    const tables = pgdb.sql(`select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema = 'public'`).split(',');
    for (const t of ['user', 'session', 'account', 'verification', 'rateLimit', 'members', 'member_events', 'terms_acceptances', 'certificates', 'stripe_events'])
      expect(tables).toContain(t);
  });

  describe('the Postgres store', () => {
    it('creates a member linked to the sign-in user, with an audit row', async () => {
      user('u-ada', 'ada@example.com');
      const m = await store.create({ ...person, email: ' Ada@Example.com ', userId: 'u-ada' }, { kind: 'member', id: 'u-ada' });
      expect(m).toMatchObject({ email: 'ada@example.com', status: 'pending', userId: 'u-ada', joinedAt: null });
      expect((await store.byUser('u-ada'))?.id).toBe(m.id);
      expect((await store.events(m.id)).map((e) => e.type)).toEqual(['created']);
    });

    it('refuses a duplicate email, whatever the case', async () => {
      await expect(store.create({ ...person, email: 'ADA@example.com' }, { kind: 'member', id: 'x' })).rejects.toBeInstanceOf(DuplicateEmail);
    });

    it('activates on the first payment exactly once (a retried webhook conflicts)', async () => {
      const m = (await store.byEmail('ada@example.com'))!;
      await store.linkStripe(m.id, { customerId: 'cus_ada', subscriptionId: 'sub_ada' }, stripe);
      const active = await store.transition(m.id, { from: 'pending', to: 'active', actor: stripe, payload: { invoice: 'in_1' } });
      expect(active.status).toBe('active');
      await expect(store.transition(m.id, { from: 'pending', to: 'active', actor: stripe })).rejects.toBeInstanceOf(TransitionError);
      // The database's compare-and-set, without the store's own check:
      expect(pgdb.fails(`select member_transition('${m.id}', 'pending', 'active', null, 'stripe', 'evt_2')`)).toMatch(/member_transition_conflict/);
      expect((await store.byStripeSubscription('sub_ada'))?.id).toBe(m.id);
    });

    it('records terms acceptances and returns the latest', async () => {
      const m = (await store.byEmail('ada@example.com'))!;
      await store.acceptTerms(m.id, '2026-01-01', { kind: 'member', id: 'u-ada' });
      await store.acceptTerms(m.id, '2026-11-10', { kind: 'member', id: 'u-ada' });
      expect(await store.acceptedTerms(m.id)).toBe('2026-11-10');
    });

    it('issues one numbered certificate per paid invoice, and keeps dates as dates', async () => {
      const m = (await store.byEmail('ada@example.com'))!;
      const term = { periodStart: '2026-11-10', periodEnd: '2027-11-10', stripeInvoiceId: 'in_1' };
      const c = await store.issueCertificate(m.id, term, stripe);
      expect(c).toMatchObject({ number: 'ZJS-2026-0001', level: 'supporter', periodStart: '2026-11-10', periodEnd: '2027-11-10', stripeInvoiceId: 'in_1' });
      expect(await store.issueCertificate(m.id, term, stripe)).toEqual(c);
      const next = await store.issueCertificate(m.id, { periodStart: '2027-11-10', periodEnd: '2028-11-10', stripeInvoiceId: 'in_2' }, stripe);
      expect(next.number).toBe('ZJS-2027-0002');
      expect((await store.certificates(m.id)).map((x) => x.number)).toEqual(['ZJS-2027-0002', 'ZJS-2026-0001']);
      expect(pgdb.fails(`insert into certificates (member_id, number, level, period_start, period_end) values ('${m.id}', 'X', 'basic', '2026-01-02', '2026-01-01')`)).toMatch(
        /check/,
      );
    });

    it('updates only the allowed fields', async () => {
      const m = (await store.byEmail('ada@example.com'))!;
      expect(pgdb.fails(`select member_update('${m.id}', '{"status":"ended"}', 'board', 'U1')`)).toMatch(/cannot change status/);
      const u = await store.update(m.id, { paidUntil: '2027-11-10', notes: 'Paid by card' }, board);
      expect(u).toMatchObject({ paidUntil: '2027-11-10', notes: 'Paid by card' });
    });

    it('switches a person to an organisation only together with its name', async () => {
      const m = (await store.byEmail('ada@example.com'))!;
      await expect(store.update(m.id, { kind: 'organisation' }, board)).rejects.toThrow(/organisation_has_name/);
      expect((await store.update(m.id, { kind: 'organisation', organisationName: 'Acme AG' }, board)).organisationName).toBe('Acme AG');
    });

    it('searches by name, email or organisation (case-insensitive, % and _ taken literally), newest first', async () => {
      await store.create({ ...person, email: 'grace@zeta.ch', name: 'Grace 100% Hopper', kind: 'organisation', organisationName: 'Zeta_Corp' }, { kind: 'member', id: 'x' });
      expect((await store.search({ q: 'ZETA' })).map((m) => m.email)).toEqual(['grace@zeta.ch']);
      expect((await store.search({ q: '100%' })).map((m) => m.email)).toEqual(['grace@zeta.ch']);
      expect((await store.search({ q: 'zeta_' })).map((m) => m.email)).toEqual(['grace@zeta.ch']);
      expect(await store.search({ q: 'zetaxcorp' })).toEqual([]);
      expect((await store.search({ q: '%' })).map((m) => m.email)).toEqual(['grace@zeta.ch']);
      expect((await store.search({ status: 'active' })).map((m) => m.email)).toEqual(['ada@example.com']);
      expect((await store.search({})).map((m) => m.email)).toEqual(['grace@zeta.ch', 'ada@example.com']);
    });

    it('keeps manual members dated', async () => {
      await expect(
        store.create({ ...person, email: 'd@example.com', status: 'imported_manual', source: 'imported', paymentMode: 'manual' }, { kind: 'script', id: 't' }),
      ).rejects.toThrow(/manual_has_paid_until/);
    });
  });

  it('keeps the audit log append-only, even for the database owner', () => {
    expect(pgdb.fails(`update member_events set actor_id = 'someone else'`)).toMatch(/append-only/);
    expect(pgdb.fails(`delete from member_events`)).toMatch(/append-only/);
    expect(pgdb.fails(`truncate member_events cascade`)).toMatch(/append-only/);
  });

  describe('retention (one year after the membership ends)', () => {
    let id = '';
    beforeAll(async () => {
      user('u-gina', 'gone@example.com');
      pgdb.sql(`insert into session (id, "expiresAt", token, "updatedAt", "userId") values ('s1', now() + interval '1 day', 'tok', now(), 'u-gina')`);
      const m = await store.create(
        { ...person, kind: 'organisation', organisationName: 'Acme AG', email: 'gone@example.com', name: 'Gina', notes: 'Prefers German', userId: 'u-gina' },
        { kind: 'member', id: 'u-gina' },
      );
      id = m.id;
      await store.linkStripe(id, { customerId: 'cus_gone', subscriptionId: 'sub_gone' }, stripe);
      await store.transition(id, { to: 'active', actor: stripe });
      await store.issueCertificate(id, { periodStart: '2026-01-01', periodEnd: '2027-01-01', stripeInvoiceId: 'in_gone' }, stripe);
      await store.transition(id, { to: 'ended', actor: board, reason: 'resigned' });
    });

    it('dates the end of a membership', () => {
      expect(pgdb.sql(`select ended_at > now() - interval '1 minute' from members where id = '${id}'`)).toBe('t');
    });

    it('refuses to anonymise before a year has passed, or with a shorter period', () => {
      expect(pgdb.fails(`select member_anonymise('${id}', 'retention')`)).toMatch(/member_retention_not_reached/);
      expect(pgdb.fails(`select member_anonymise('${id}', 'retention', interval '1 day')`)).toMatch(/member_retention_too_short/);
    });

    it('anonymises after a year: the person, their sign-in and sessions go; counts and certificates stay', async () => {
      pgdb.sql(`update members set ended_at = now() - interval '13 months' where id = '${id}'`);
      pgdb.sql(`select member_anonymise('${id}', 'retention')`);
      expect(await store.get(id)).toMatchObject({
        email: `anonymised-${id}@members.invalid`,
        name: 'Anonymised',
        kind: 'person',
        organisationName: null,
        notes: null,
        userId: null,
        stripeCustomerId: null,
        level: 'supporter',
        status: 'ended',
      });
      expect(pgdb.sql(`select count(*) from "user" where id = 'u-gina'`)).toBe('0');
      expect(pgdb.sql(`select count(*) from session where "userId" = 'u-gina'`)).toBe('0');
      expect(await store.certificates(id)).toHaveLength(1);
      expect((await store.events(id)).at(-1)?.type).toBe('anonymised');
    });

    it('never changes an anonymised member again', async () => {
      expect(pgdb.fails(`select member_anonymise('${id}', 'retention')`)).toMatch(/member_already_anonymised/);
      await expect(store.update(id, { name: 'Gina' }, board)).rejects.toThrow(/member_anonymised/);
      await expect(store.linkStripe(id, { customerId: 'cus_x' }, stripe)).rejects.toThrow(/member_anonymised/);
      await expect(store.acceptTerms(id, '2026-11-10', board)).rejects.toThrow(/member_anonymised/);
      await expect(store.issueCertificate(id, { periodStart: '2027-01-01', periodEnd: '2028-01-01', stripeInvoiceId: 'in_new' }, stripe)).rejects.toThrow(/member_anonymised/);
    });
  });
});
