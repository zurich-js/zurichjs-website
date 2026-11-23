/**
 * Donation event claims (donation-events.ts) on the real migrations, in a throwaway local
 * Postgres (skips without one; TEST_DATABASE_URL may point at an empty database instead).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresDonationEvents, type DonationEvents } from '../src/server/donation-events.ts';
import { startPg, type Pg } from '../../../packages/membership/test/pg.ts';

const migrations = join(import.meta.dirname, '../database/migrations');
const url = process.env.TEST_DATABASE_URL;
const local: Pg | null = url ? null : startPg();

(url || local ? describe : describe.skip)('donation event claims (database)', () => {
  let pool: pg.Pool;
  let events: DonationEvents;

  beforeAll(async () => {
    pool = new pg.Pool(url ? { connectionString: url, max: 4 } : { ...local!.connection, max: 4 });
    for (const f of readdirSync(migrations).sort()) await pool.query(readFileSync(join(migrations, f), 'utf8'));
    events = postgresDonationEvents(pool);
  });
  afterAll(async () => {
    await pool?.end();
    local?.stop();
  });

  it('one of two concurrent deliveries claims the event, and a posted event stays claimed', async () => {
    const claims = await Promise.all([events.claim('evt_a', 'checkout.session.completed'), events.claim('evt_a', 'checkout.session.completed')]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await events.done('evt_a');
    await events.release('evt_a');
    expect(await events.claim('evt_a', 'checkout.session.completed')).toBe(false);
  });

  it('a released claim, or one left unfinished for five minutes, can be claimed again', async () => {
    expect(await events.claim('evt_b', 'checkout.session.completed')).toBe(true);
    await events.release('evt_b');
    expect(await events.claim('evt_b', 'checkout.session.completed')).toBe(true);
    expect(await events.claim('evt_b', 'checkout.session.completed')).toBe(false);
    await pool.query(`update donation_stripe_events set claimed_at = now() - interval '6 minutes' where id = 'evt_b'`);
    expect(await events.claim('evt_b', 'checkout.session.completed')).toBe(true);
  });
});
