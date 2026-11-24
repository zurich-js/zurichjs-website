/**
 * The board's sponsor list on the real migrations, in a throwaway local Postgres: one row past the
 * limit is read and dropped before the batched summaries, and the page costs a fixed number of queries.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresStore } from '@zurichjs/sponsorship';
import { handleAdminSponsors } from '../src/pages/api/membership/admin/sponsors/index.ts';
import { LIST_LIMIT } from '../src/server/admin-views.ts';
import { startPg, type Pg } from '../../../packages/membership/test/pg.ts';

const migrations = join(import.meta.dirname, '../database/migrations');
const url = process.env.TEST_DATABASE_URL;
const local: Pg | null = url ? null : startPg();
const ADMIN = 'admin-lists-password';
const env = { ADMIN_PASSWORD: ADMIN, BETTER_AUTH_URL: 'https://zurichjs.com' };
const get = (path: string) => new Request(`https://zurichjs.com${path}`, { headers: { authorization: `Bearer ${ADMIN}` } });

(url || local ? describe : describe.skip)('the sponsor list (database)', () => {
  let pool: pg.Pool;
  beforeAll(async () => {
    pool = new pg.Pool(url ? { connectionString: url, max: 4 } : { ...local!.connection, max: 4 });
    for (const f of readdirSync(migrations).sort()) await pool.query(readFileSync(join(migrations, f), 'utf8'));
    await pool.query(
      `insert into sponsors (company_name, tier, cycle, payment_mode, status, source)
       select 'Company ' || i, 'friend', 'monthly', 'card', 'pending', 'invited' from generate_series(1, $1) i`,
      [LIST_LIMIT + 1],
    );
  });
  afterAll(async () => {
    await pool?.end();
    local?.stop();
  });

  it('shows the limit, says it stopped, and reads five times unfiltered and four times filtered', async () => {
    const seen: { text: string; params?: unknown[] }[] = [];
    const store = postgresStore({
      query: <R>(text: string, params?: unknown[]) => (seen.push({ text, params }), pool.query(text, params) as unknown as Promise<{ rows: R[] }>),
    });
    const all = (await (await handleAdminSponsors(get('/api/membership/admin/sponsors'), { env, store })).json()) as {
      sponsors: unknown[];
      truncated: boolean;
      counts: Record<string, number>;
    };
    expect(all).toMatchObject({ truncated: true, counts: { pending: LIST_LIMIT + 1 } });
    expect(all.sponsors).toHaveLength(LIST_LIMIT);
    expect(seen).toHaveLength(5);
    expect(seen.filter((q) => (q.params?.[0] as unknown[] | undefined)?.length === LIST_LIMIT)).toHaveLength(3);
    seen.length = 0;
    const some = (await (await handleAdminSponsors(get('/api/membership/admin/sponsors?status=pending'), { env, store })).json()) as { truncated: boolean; counts: unknown };
    expect(some).toMatchObject({ truncated: true, counts: null });
    expect(seen).toHaveLength(4);
  });
});
