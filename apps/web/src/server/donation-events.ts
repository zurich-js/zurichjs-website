/**
 * Which donation events already posted their Slack note (migration 20261124090000_donation_events).
 * Without a database (a local `pnpm dev` with `stripe listen`, a preview without Neon) there is no
 * record, and a redelivered event posts again.
 */
import type { Queryable } from '@zurichjs/membership';
import { membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';

export interface DonationEvents {
  /** True when this delivery may post: the event is new, or an earlier claim on it never finished. */
  claim(id: string, type: string): Promise<boolean>;
  /** The note is posted: later deliveries skip the event. */
  done(id: string): Promise<void>;
  /** Posting failed: the next delivery may claim the event at once. */
  release(id: string): Promise<void>;
}

export function postgresDonationEvents(db: Queryable): DonationEvents {
  return {
    claim: async (id, type) =>
      (
        await db.query(
          `insert into donation_stripe_events (id, type) values ($1, $2)
           on conflict (id) do update set claimed_at = now()
             where donation_stripe_events.posted_at is null and donation_stripe_events.claimed_at < now() - interval '5 minutes'
           returning id`,
          [id, type],
        )
      ).rows.length > 0,
    done: async (id) => void (await db.query('update donation_stripe_events set posted_at = now() where id = $1', [id])),
    release: async (id) => void (await db.query('delete from donation_stripe_events where id = $1 and posted_at is null', [id])),
  };
}

export const donationEvents = (env: Env): DonationEvents | null => (membershipUrl(env) ? postgresDonationEvents(membershipDb(env)) : null);
