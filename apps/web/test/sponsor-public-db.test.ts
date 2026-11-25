/** What the public site reads at build time, on the real migrations (local Postgres; skips without it). */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresStore } from '@zurichjs/sponsorship';
import { startPg, type Pg } from '../../../packages/membership/test/pg.ts';
import { PUBLIC_SPONSORSHIPS_SQL, sponsorshipRow } from '../src/server/sponsor-public.ts';
import { dailyCheck } from '../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../src/server/sponsor-route.ts';
import { env, NOW, world, newSponsor } from './sponsor-faults.ts';

const migrations = join(import.meta.dirname, '../database/migrations');
const db = startPg();
const board = { kind: 'board', id: 'test' } as const;

(db ? describe : describe.skip)('public sponsorships (database)', () => {
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

  const read = async (id: string) => (await pool.query(PUBLIC_SPONSORSHIPS_SQL)).rows.map(sponsorshipRow).find((r) => r.id === id);

  it('lists the meetups a one-time sponsorship covers now, with or without the covered-meetups history (#98)', async () => {
    const store = postgresStore(pool);
    const meetups = [
      { eventId: 'event-dec', title: 'December', date: '2026-12-09' },
      { eventId: 'event-jan', title: 'January', date: '2027-01-13' },
    ];
    const { sponsor } = await store.create(
      newSponsor({ cycle: 'once', status: 'active', source: 'imported', paymentMode: 'manual' }),
      { email: 'a@example.test', name: 'A', role: 'primary' },
      board,
      {
        meetups,
      },
    );
    expect(await read(sponsor.id)).toMatchObject({ eventIds: ['event-dec', 'event-jan'] });
    const beforeRemoval = await store.pendingMeetupRebuilds();
    expect(beforeRemoval).toHaveLength(1);
    // #98 keeps a meetup taken off a sponsorship as a row with removed_at set.
    pgdb.sql(`alter table sponsor_meetups add column if not exists removed_at timestamptz`);
    pgdb.sql(`update sponsor_meetups set removed_at = now() where sponsor_id = '${sponsor.id}' and event_id = 'event-dec'`);
    expect(await read(sponsor.id)).toMatchObject({ eventIds: ['event-jan'] });
    await store.acknowledgeMeetupRebuilds(beforeRemoval);
    const restartedStore = postgresStore(pool);
    const afterRemoval = await restartedStore.pendingMeetupRebuilds();
    expect(afterRemoval).toHaveLength(1);
    expect(afterRemoval).not.toEqual(beforeRemoval);
    const fake = world();
    const deps = lifecycleDeps(env, restartedStore, 'https://example.test', { fetch: fake.f, slack: fake.slack, now: () => NOW });
    await dailyCheck({
      ...deps,
      queueRebuild: async () => {
        throw new Error('queue unavailable');
      },
    });
    expect(await restartedStore.pendingMeetupRebuilds()).toEqual(afterRemoval);
    const queued: string[] = [];
    await dailyCheck({
      ...deps,
      queueRebuild: async (reason) => {
        queued.push(reason);
      },
    });
    expect(queued).toEqual(['sponsored meetups moved']);
    expect(await restartedStore.pendingMeetupRebuilds()).toEqual([]);
  });
});
