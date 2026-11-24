-- Payment links the board asked Stripe for (docs/domains/sponsorship/overview.md, "Payment links").
-- A row is written before Stripe is called, with the exact request and the idempotency key (`key`)
-- it is sent with. So a link Stripe made is never lost: when Stripe's answer or the next write fails,
-- the board's retry or the daily check sends the same request again, gets the same link back and
-- switches it off. Stripe keeps idempotency keys for at least 24 hours; the daily check runs inside that.
--
--   open     asked for; it may exist in Stripe (`link_id` once Stripe answered)
--   kept     the sponsor's payment link (sponsors.payment_link_id)
--   closing  not kept (a second request won, or the first failed): to be switched off in Stripe
--   closed   Stripe confirmed it is off

create table sponsor_payment_link_attempts (
  key uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  request text not null check (length(request) <= 8000),
  link_id text check (link_id is null or length(link_id) <= 255),
  state text not null default 'open' check (state in ('open', 'kept', 'closing', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sponsor_payment_link_attempts_unsettled_idx on sponsor_payment_link_attempts (created_at) where state in ('open', 'closing');
