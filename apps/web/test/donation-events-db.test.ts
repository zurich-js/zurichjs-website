/**
 * Donation event claims (donation-events.ts) on the real migrations, in a throwaway local
 * Postgres. Skips without one; TEST_DATABASE_URL may name an empty database instead.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { postgresDonationEvents, type Claim, type DonationEvents } from '../src/server/donation-events.ts';
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

  const claim = (id: string) => events.claim(id, 'checkout.session.completed');
  const token = (c: Claim) => (c.state === 'acquired' ? c.token : expect.unreachable(`not acquired: ${c.state}`));
  const age = (id: string) => pool.query(`update donation_stripe_events set claimed_at = now() - interval '6 minutes' where id = $1`, [id]);

  it('one of two concurrent deliveries acquires the event; the other is told it is in progress, then posted', async () => {
    const claims = await Promise.all([claim('evt_a'), claim('evt_a')]);
    expect(claims.map((c) => c.state).sort()).toEqual(['acquired', 'in_progress']);
    const t = token(claims.find((c) => c.state === 'acquired')!);
    expect(await events.done('evt_a', t)).toBe(true);
    await events.release('evt_a', t);
    expect(await claim('evt_a')).toEqual({ state: 'posted' });
  });

  it('a released claim, or one left unfinished for five minutes, is acquired again', async () => {
    await events.release('evt_b', token(await claim('evt_b')));
    expect((await claim('evt_b')).state).toBe('acquired');
    expect((await claim('evt_b')).state).toBe('in_progress');
    await age('evt_b');
    expect((await claim('evt_b')).state).toBe('acquired');
  });

  it('a delivery whose claim was taken over can neither release nor complete the new claim', async () => {
    for (const end of ['release', 'done'] as const) {
      const id = `evt_takeover_${end}`;
      const a = token(await claim(id));
      await age(id);
      const b = token(await claim(id));
      expect(b).not.toBe(a);
      if (end === 'done') expect(await events.done(id, a)).toBe(false);
      else await events.release(id, a);
      expect((await claim(id)).state).toBe('in_progress');
      expect(await events.done(id, b)).toBe(true);
      expect((await claim(id)).state).toBe('posted');
    }
  });
});
