-- Donation events from the shared Stripe webhook (apps/web/src/server/donation-events.ts). The
-- donation part only posts a Slack note, so it records which events it posted: a redelivery or a
-- concurrent second delivery does not post twice. A claim that never finished (the function died
-- between claiming and posting) can be taken again after five minutes.
create table donation_stripe_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  claimed_at timestamptz not null default now(),
  posted_at timestamptz
);
