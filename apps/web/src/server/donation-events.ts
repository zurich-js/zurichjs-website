/**
 * Which donation events posted their Slack note (migration 20261124090000_donation_events).
 * Without a database (a local `pnpm dev` with `stripe listen`, a preview without Neon) there is no
 * record, and a redelivered event posts again.
 */
import type { Queryable } from '@zurichjs/membership';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';

export const CLAIM_LEASE = '5 minutes';

/**
 * `acquired`: this delivery may post (a new event, or a claim older than CLAIM_LEASE that never
 * finished); `token` identifies this claim to `done` and `release`. `in_progress`: another
 * delivery holds a fresh claim. `posted`: the note went out.
 */
export type Claim = { state: 'acquired'; token: string } | { state: 'in_progress' } | { state: 'posted' };

export interface DonationEvents {
  claim(id: string, type: string): Promise<Claim>;
  /**
   * The note went out: later deliveries are told `posted`. False when another delivery took the
   * claim over after CLAIM_LEASE; nothing is changed then, and that delivery may post as well.
   */
  done(id: string, token: string): Promise<boolean>;
  /** Nothing went out: the next delivery acquires the event at once, unless the claim was taken over. */
  release(id: string, token: string): Promise<void>;
}

/** The claim's token is its `claimed_at`, as text so no precision is lost: a takeover sets a new one. */
export function postgresDonationEvents(db: Queryable): DonationEvents {
  return {
    async claim(id, type) {
      const taken = await db.query<{ token: string }>(
        `insert into donation_stripe_events (id, type) values ($1, $2)
         on conflict (id) do update set claimed_at = now()
           where donation_stripe_events.posted_at is null and donation_stripe_events.claimed_at < now() - interval '${CLAIM_LEASE}'
         returning claimed_at::text as token`,
        [id, type],
      );
      if (taken.rows.length) return { state: 'acquired', token: taken.rows[0]!.token };
      const held = await db.query<{ posted: boolean }>('select posted_at is not null as posted from donation_stripe_events where id = $1', [id]);
      return held.rows[0]?.posted ? { state: 'posted' } : { state: 'in_progress' };
    },
    async done(id, token) {
      const r = await db.query('update donation_stripe_events set posted_at = now() where id = $1 and claimed_at = $2::timestamptz and posted_at is null returning id', [
        id,
        token,
      ]);
      return r.rows.length === 1;
    },
    release: async (id, token) => void (await db.query('delete from donation_stripe_events where id = $1 and claimed_at = $2::timestamptz and posted_at is null', [id, token])),
  };
}

export const donationEvents = (env: Env): DonationEvents | null => (membershipUrl(env) ? postgresDonationEvents(membershipDb(env)) : null);
