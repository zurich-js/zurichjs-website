/**
 * supabase/migrations on a real (local) Postgres with a stand-in for Supabase's
 * roles and auth (supabase/tests/supabase-stub.sql). Skips when Postgres is not
 * installed. Covers who can read and write what, which is the point of RLS.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from './pg.ts';

const root = join(import.meta.dirname, '../../..');
const pg = startPg();
const d = pg ? describe : describe.skip;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

const create = (db: Pg, m: Record<string, unknown>) => db.sql(`select id from public.member_create('${JSON.stringify(m)}'::jsonb, 'script', 'test')`, { role: 'service_role' });

d('membership migration', () => {
  const db = pg!;
  const ids: Record<string, string> = {};

  beforeAll(() => {
    db.sql(readFileSync(join(root, 'supabase/tests/supabase-stub.sql'), 'utf8'));
    for (const f of readdirSync(join(root, 'supabase/migrations')).sort()) db.sql(readFileSync(join(root, 'supabase/migrations', f), 'utf8'));
    db.sql(`insert into auth.users (id, email) values ('${A}', 'a@example.com'), ('${B}', 'b@example.com'), ('${C}', 'c@example.com')`);
    const base = { kind: 'person', cycle: 'yearly', source: 'imported', status: 'imported_manual', paid_until: '2027-03-31', payment_mode: 'manual' };
    ids.a = create(db, { ...base, email: 'a@example.com', name: 'Ada', level: 'basic', auth_user_id: A });
    ids.b = create(db, { ...base, email: 'b@example.com', name: 'Bob', level: 'supporter', category: 'active', auth_user_id: B });
    ids.c = create(db, { email: 'c@example.com', name: 'Cy', level: 'advocate', cycle: 'yearly', source: 'self_serve', status: 'applied', auth_user_id: C });
    db.sql(`insert into public.member_documents (title, kind, dated, min_level, active_only, storage_path) values
      ('Minutes 2026', 'gv_minutes', '2026-06-01', 'basic', false, 'docs/minutes-2026.pdf'),
      ('Supporter notes', 'other', '2026-06-01', 'supporter', false, 'docs/supporter.pdf'),
      ('Active members only', 'other', '2026-06-01', 'basic', true, 'docs/active.pdf')`);
  });
  afterAll(() => db.stop());

  describe('the service role', () => {
    it('creates members only through member_create, which logs the creation', () => {
      expect(ids.a).toMatch(/^[0-9a-f-]{36}$/);
      expect(db.sql(`select type || ':' || to_status from public.member_events where member_id = '${ids.a}'`, { role: 'service_role' })).toBe('created:imported_manual');
      expect(
        db.fails(`insert into public.members (email, name, level, cycle, status, source) values ('x@example.com', 'X', 'basic', 'yearly', 'applied', 'self_serve')`, {
          role: 'service_role',
        }),
      ).toMatch(/permission denied/);
      expect(db.fails(`update public.members set status = 'active' where id = '${ids.a}'`, { role: 'service_role' })).toMatch(/permission denied/);
    });

    it('rejects a duplicate email, whatever the case', () => {
      expect(() => create(db, { email: 'A@Example.com', name: 'Ada again', level: 'basic', cycle: 'yearly', source: 'self_serve', status: 'applied' })).toThrow(
        /duplicate key|members_email_key/,
      );
    });

    it('changes status with compare-and-set and an audit row in the same transaction', () => {
      db.sql(`select public.member_transition('${ids.c}', 'applied', 'approved', null, 'board', 'U123', '{"ts":"1.2"}')`, { role: 'service_role' });
      expect(db.sql(`select status from public.members where id = '${ids.c}'`)).toBe('approved');
      expect(
        db.sql(
          `select actor_id || ' ' || from_status || '>' || to_status || ' ' || (payload->>'ts') from public.member_events where member_id = '${ids.c}' and type = 'status_changed'`,
        ),
      ).toBe('U123 applied>approved 1.2');
      // A second organiser pressing Approve: the status is no longer `applied`.
      expect(db.fails(`select public.member_transition('${ids.c}', 'applied', 'approved', null, 'board', 'U456')`, { role: 'service_role' })).toMatch(/member_transition_conflict/);
      expect(db.sql(`select count(*) from public.member_events where member_id = '${ids.c}' and type = 'status_changed'`)).toBe('1');
    });

    it('requires a reason exactly when a membership ends', () => {
      expect(db.fails(`select public.member_transition('${ids.c}', 'approved', 'ended', null, 'board', 'U1')`, { role: 'service_role' })).toMatch(/ended_has_reason/);
      expect(db.fails(`select public.member_transition('${ids.c}', 'approved', 'signed', 'expelled', 'member', 'U1')`, { role: 'service_role' })).toMatch(/ended_has_reason/);
    });

    it('updates only the allowed fields', () => {
      expect(db.fails(`select public.member_update('${ids.a}', '{"status":"active"}', 'board', 'U1')`, { role: 'service_role' })).toMatch(/cannot change status/);
      db.sql(`select public.member_update('${ids.a}', '{"notes":"Paid by bank transfer"}', 'board', 'U1')`, { role: 'service_role' });
      expect(db.sql(`select notes from public.members where id = '${ids.a}'`)).toBe('Paid by bank transfer');
    });

    it('keeps manual members dated', () => {
      expect(() => create(db, { email: 'd@example.com', name: 'D', level: 'basic', cycle: 'yearly', source: 'imported', status: 'imported_manual' })).toThrow(
        /manual_has_paid_until/,
      );
    });
  });

  it('keeps the audit log append-only, even for the database owner', () => {
    expect(db.fails(`update public.member_events set actor_id = 'someone else'`)).toMatch(/append-only/);
    expect(db.fails(`delete from public.member_events`)).toMatch(/append-only/);
    expect(db.fails(`truncate public.member_events cascade`)).toMatch(/append-only/);
    expect(db.fails(`insert into public.member_events (member_id, type, actor_kind, actor_id) values ('${ids.a}', 'forged', 'board', 'x')`, { role: 'service_role' })).toMatch(
      /permission denied/,
    );
  });

  describe('a signed-in member', () => {
    it('sees only their own membership', () => {
      expect(db.sql(`select name from public.members`, { role: 'authenticated', uid: A })).toBe('Ada');
      expect(db.sql(`select count(*) from public.members where id = '${ids.b}'`, { role: 'authenticated', uid: A })).toBe('0');
    });

    it('cannot read Stripe ids, notes or the end reason', () => {
      expect(db.fails(`select notes from public.members`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
      expect(db.fails(`select stripe_customer_id from public.members`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
    });

    it('cannot write anything or call the write functions', () => {
      expect(db.fails(`update public.members set level = 'advocate'`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
      expect(db.fails(`select public.member_transition('${ids.a}', 'imported_manual', 'active', null, 'stripe', 'x')`, { role: 'authenticated', uid: A })).toMatch(
        /permission denied/,
      );
      expect(db.fails(`select public.member_create('{}'::jsonb, 'member', 'x')`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
      expect(db.fails(`select * from public.member_events`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
      expect(db.fails(`select code from public.perks`, { role: 'authenticated', uid: A })).toMatch(/permission denied/);
    });

    it('sees the documents for their level and category only', () => {
      // Ada: Basic, passive.
      expect(db.sql(`select title from public.member_documents order by title`, { role: 'authenticated', uid: A })).toBe('Minutes 2026');
      // Bob: Supporter, active.
      expect(db.sql(`select title from public.member_documents order by title`, { role: 'authenticated', uid: B }).split('\n')).toEqual([
        'Active members only',
        'Minutes 2026',
        'Supporter notes',
      ]);
      // Cy is Advocate but not a member yet (approved, not paying): nothing.
      expect(db.sql(`select count(*) from public.member_documents`, { role: 'authenticated', uid: C })).toBe('0');
    });
  });

  it('gives anonymous visitors nothing', () => {
    for (const t of ['members', 'member_documents', 'declarations', 'perks']) expect(db.fails(`select 1 from public.${t}`, { role: 'anon' })).toMatch(/permission denied/);
  });

  it('creates private buckets', () => {
    expect(db.sql(`select id || ':' || public from storage.buckets order by id`).split('\n')).toEqual(['declarations:false', 'member-documents:false']);
  });
});
