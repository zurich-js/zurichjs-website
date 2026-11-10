/** The admin sign-in attempt counter on the real migration (local Postgres; skips without it). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../../packages/membership/test/pg.ts';
import { databaseAttempts } from '../src/server/admin-auth.ts';

const migrations = join(import.meta.dirname, '../netlify/database/migrations');
const db = startPg();

(db ? describe : describe.skip)('admin sign-in attempts (database)', () => {
  const pgdb = db as Pg;
  let pool: pg.Pool;
  beforeAll(() => {
    for (const f of readdirSync(migrations).sort()) pgdb.sql(readFileSync(join(migrations, f), 'utf8'));
    pool = new pg.Pool({ ...pgdb.connection, max: 2 });
  });
  afterAll(async () => {
    await pool?.end();
    pgdb.stop();
  });

  it('counts failures per IP within the window, and drops rows older than a day', async () => {
    const attempts = databaseAttempts(pool);
    pgdb.sql(`insert into admin_login_attempts (ip, at) values ('203.0.113.9', now() - interval '2 days')`);
    await attempts.fail('203.0.113.9');
    await attempts.fail('203.0.113.9');
    await attempts.fail('198.51.100.1');
    expect(await attempts.failures('203.0.113.9', Date.now() - 15 * 60_000)).toBe(2);
    expect(await attempts.failures('198.51.100.1', Date.now() - 15 * 60_000)).toBe(1);
    expect(await attempts.failures('203.0.113.9', Date.now() + 60_000)).toBe(0);
    expect(pgdb.sql(`select count(*) from admin_login_attempts where at < now() - interval '1 day'`)).toBe('0');
  });
});
