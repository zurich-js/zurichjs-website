/**
 * The CFP bot's draft store on the real migrations (local Postgres, as the membership tests do;
 * skips without it). TEST_DATABASE_URL may point at an empty throwaway database instead, for
 * machines without Postgres binaries (for example a `docker run postgres` container).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { OpenDraftExists, postgresCfpStore, type CfpStore } from '@zurichjs/agent/cfp';
import { startPg, type Pg } from '../../../packages/membership/test/pg.ts';

const migrations = join(import.meta.dirname, '../database/migrations');
const url = process.env.TEST_DATABASE_URL;
const local: Pg | null = url ? null : startPg();

(url || local ? describe : describe.skip)('CFP drafts (database)', () => {
  let pool: pg.Pool;
  let store: CfpStore;
  const ada = { team: 'T1', user: 'UADA' };
  const bob = { team: 'T1', user: 'UBOB' };
  const sql = async (q: string, p: unknown[] = []) => (await pool.query(q, p)).rows;

  beforeAll(async () => {
    pool = new pg.Pool(url ? { connectionString: url, max: 2 } : { ...local!.connection, max: 2 });
    for (const f of readdirSync(migrations).sort()) await pool.query(readFileSync(join(migrations, f), 'utf8'));
    store = postgresCfpStore(pool);
  });
  afterAll(async () => {
    await pool?.end();
    local?.stop();
  });

  it('one draft per thread and one open draft per person', async () => {
    const d = await store.create({ ...ada, channel: 'C', threadTs: '1.1' });
    expect(d).toMatchObject({ ...ada, channel: 'C', threadTs: '1.1', fields: {}, email: null, photo: null, status: 'draft' });
    // The same thread again: the same draft.
    expect((await store.create({ ...ada, channel: 'C', threadTs: '1.1' })).id).toBe(d.id);
    await expect(store.create({ ...ada, channel: 'C', threadTs: '2.1' })).rejects.toBeInstanceOf(OpenDraftExists);
    await expect(store.create({ ...bob, channel: 'C', threadTs: '1.1' })).rejects.toThrow(/someone else/);
    expect((await store.byThread({ team: 'T1', channel: 'C', threadTs: '1.1' }))?.id).toBe(d.id);
    expect((await store.openFor(ada))?.id).toBe(d.id);
  });

  it('only the owner can change, claim or delete a draft', async () => {
    const d = (await store.openFor(ada))!;
    expect(await store.update(d.id, bob, { fields: { title: 'Hacked' } })).toBeNull();
    expect(await store.update(d.id, { team: 'T2', user: 'UADA' }, { fields: { title: 'Hacked' } })).toBeNull();
    expect(await store.claim(d.id, bob)).toBeNull();
    expect(await store.remove(d.id, bob)).toBe(false);
    const saved = await store.update(d.id, ada, { fields: { title: 'Testing without mocks', topics: ['Testing'] }, photo: true });
    expect(saved).toMatchObject({ fields: { title: 'Testing without mocks', topics: ['Testing'] }, photo: true, email: null });
    // A patch without fields keeps them; email is set only when given.
    expect(await store.update(d.id, ada, { email: 'ada@example.org' })).toMatchObject({ fields: { title: 'Testing without mocks' }, email: 'ada@example.org', photo: true });
    expect(await store.byId('not-a-uuid')).toBeNull();
  });

  it('claim works once (no double submit) and release gives the draft back', async () => {
    const d = (await store.openFor(ada))!;
    const [a, b] = await Promise.all([store.claim(d.id, ada), store.claim(d.id, ada)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await store.update(d.id, ada, { fields: {} })).toBeNull();
    await store.release(d.id, ada);
    expect((await store.byId(d.id))?.status).toBe('draft');
    expect(await store.remove(d.id, ada)).toBe(true);
    expect(await store.byId(d.id)).toBeNull();
  });

  it('counts usage per person and for everyone, in a time window', async () => {
    await store.record('submission', 'T1', 'UADA');
    await store.record('submission', 'T1', 'UADA');
    await store.record('submission', 'T1', 'UBOB');
    await store.record('model_call', 'T1', null, 3);
    const hourAgo = new Date(Date.now() - 3_600_000);
    expect(await store.usage('submission', hourAgo, ada)).toBe(2);
    expect(await store.usage('submission', hourAgo, bob)).toBe(1);
    expect(await store.usage('model_call', hourAgo)).toBe(3);
    expect(await store.usage('submission', new Date(Date.now() + 60_000), ada)).toBe(0);
  });

  it('deletes drafts untouched for 14 days and old usage rows', async () => {
    const old = await store.create({ team: 'T1', user: 'UOLD', channel: 'C', threadTs: '9.1' });
    const fresh = await store.create({ team: 'T1', user: 'UNEW', channel: 'C', threadTs: '9.2' });
    await sql(`update cfp_drafts set updated_at = now() - interval '15 days' where id = $1`, [old.id]);
    await sql(`insert into cfp_usage (kind, slack_team_id, slack_user_id, at) values ('message', 'T1', 'UOLD', now() - interval '3 days')`);
    expect(await store.purge(14)).toBe(1);
    expect(await store.byId(old.id)).toBeNull();
    expect(await store.byId(fresh.id)).not.toBeNull();
    expect(await sql(`select 1 from cfp_usage where at < now() - interval '2 days'`)).toEqual([]);
  });

  it('the schema refuses bad rows', async () => {
    await expect(
      sql(`insert into cfp_drafts (slack_team_id, slack_user_id, slack_channel_id, slack_thread_ts, status) values ('T', 'U9', 'C', '5', 'submitted')`),
    ).rejects.toThrow();
    await expect(sql(`insert into cfp_drafts (slack_team_id, slack_user_id, slack_channel_id, slack_thread_ts, fields) values ('T', 'U9', 'C', '5', '[]')`)).rejects.toThrow();
    await expect(sql(`insert into cfp_usage (kind, slack_team_id) values ('other', 'T')`)).rejects.toThrow();
  });
});
