-- Donation events from the shared Stripe webhook (apps/web/src/server/donation-events.ts): a
-- claim per event, and when its Slack note was posted. posted_at null with a recent claimed_at is a
-- delivery in progress; one older than five minutes may be taken over. Slack delivery is at least
-- once: see processDonationEvent in src/pages/api/donate/webhook.ts.
create table donation_stripe_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  claimed_at timestamptz not null default now(),
  posted_at timestamptz
);
