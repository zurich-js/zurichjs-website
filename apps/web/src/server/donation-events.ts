/**
 * Which donation events posted their Slack note (migration 20261124090000_donation_events).
 * Without a database (a local `pnpm dev` with `stripe listen`, a preview without Neon) there is no
 * record, and a redelivered event posts again.
 */
import type { Queryable } from '@zurichjs/membership';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';

/** How long a claim blocks other deliveries of the event before it may be taken over. */
export const CLAIM_LEASE = '5 minutes';

/**
 * `acquired`: this delivery may post (a new event, or a claim older than CLAIM_LEASE that never
 * finished). `in_progress`: another delivery holds a fresh claim. `posted`: the note went out.
 */
export type Claim = 'acquired' | 'in_progress' | 'posted';

export interface DonationEvents {
  claim(id: string, type: string): Promise<Claim>;
  /** The note went out: later deliveries are told `posted`. */
  done(id: string): Promise<void>;
  /** Nothing went out: the next delivery acquires the event at once. */
  release(id: string): Promise<void>;
}

export function postgresDonationEvents(db: Queryable): DonationEvents {
  return {
    async claim(id, type) {
      const taken = await db.query(
        `insert into donation_stripe_events (id, type) values ($1, $2)
         on conflict (id) do update set claimed_at = now()
           where donation_stripe_events.posted_at is null and donation_stripe_events.claimed_at < now() - interval '${CLAIM_LEASE}'
         returning id`,
        [id, type],
      );
      if (taken.rows.length) return 'acquired';
      const held = await db.query<{ posted: boolean }>('select posted_at is not null as posted from donation_stripe_events where id = $1', [id]);
      // Released between the two statements: the next delivery acquires it.
      if (!held.rows.length) return 'in_progress';
      return held.rows[0]!.posted ? 'posted' : 'in_progress';
    },
    done: async (id) => void (await db.query('update donation_stripe_events set posted_at = now() where id = $1', [id])),
    release: async (id) => void (await db.query('delete from donation_stripe_events where id = $1 and posted_at is null', [id])),
  };
}

export const donationEvents = (env: Env): DonationEvents | null => (membershipUrl(env) ? postgresDonationEvents(membershipDb(env)) : null);
