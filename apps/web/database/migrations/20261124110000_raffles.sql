-- Raffle add-ons (docs/domains/sponsorship/raffles.md): an existing sponsor pays for a prize that
-- ZurichJS raffles at one meetup. Separate from the sponsorship: own amount, payment, receipt and
-- status, and its own Stripe idempotency table. Stage and funding are separate columns; flags are
-- for the board. Gift accounting is an append-only ledger in rappen. No entrant data here.

create table raffles (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  event_id text not null check (length(event_id) between 1 and 200),
  event_title text not null check (length(event_title) between 1 and 300),
  event_date date not null,
  prize text not null check (length(prize) between 1 and 200),
  quantity int not null check (quantity between 1 and 50),
  budget_minor int not null check (budget_minor between 0 and 10000000),
  fulfilment text not null check (fulfilment in ('zurichjs', 'in_kind')),
  stage text not null default 'proposed'
    check (stage in ('proposed', 'offered', 'ready', 'open', 'closed', 'drawn', 'fulfilled', 'on_hold', 'declined', 'cancelled')),
  funding text not null default 'unpaid' check (funding in ('unpaid', 'paid', 'refund_pending', 'refunded', 'in_kind')),
  flags text[] not null default '{}' check (flags <@ array['late_payment', 'amount_mismatch', 'meetup_changed', 'refund_review']),
  amount_minor int check (amount_minor is null or amount_minor > 0),
  quote_id uuid references payment_quotes (id),
  terms_version text check (terms_version is null or length(terms_version) between 1 and 40),
  accepted_version text,
  accepted_by uuid references sponsor_contacts (id) on delete set null,
  accepted_at timestamptz,
  payment_link_id text check (payment_link_id is null or payment_link_id ~ '^plink_'),
  payment_link_url text check (payment_link_url is null or payment_link_url ~ '^https://'),
  reason text check (reason is null or length(reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- An offer names the terms it was made under; an in-kind prize is never paid by link.
  constraint raffle_offer_terms check (stage in ('proposed', 'declined') or terms_version is not null or stage = 'cancelled'),
  constraint raffle_in_kind check (fulfilment = 'zurichjs' or (amount_minor is null and payment_link_id is null and funding in ('unpaid', 'in_kind')))
);

create index raffles_sponsor_idx on raffles (sponsor_id, created_at desc);
create index raffles_stage_idx on raffles (stage);
create unique index raffles_payment_link_idx on raffles (payment_link_id) where payment_link_id is not null;

create trigger raffles_touch before update on raffles
  for each row execute function touch_updated_at();

create table raffle_ledger (
  id bigint generated always as identity primary key,
  raffle_id uuid not null references raffles (id) on delete restrict,
  kind text not null check (kind in ('payment', 'prize_purchase', 'delivery', 'refund', 'in_kind_received')),
  amount_minor int not null check (amount_minor >= 0),
  note text not null check (length(note) between 1 and 500),
  reference text check (reference is null or length(reference) <= 200),
  actor_kind text not null check (actor_kind in ('sponsor', 'board', 'stripe', 'script')),
  actor_id text not null check (length(actor_id) between 1 and 200),
  at timestamptz not null default now()
);

create index raffle_ledger_raffle_idx on raffle_ledger (raffle_id, at);

-- Payloads hold ids, versions, amounts and choices; never entrant data.
create table raffle_events (
  id bigint generated always as identity primary key,
  raffle_id uuid not null references raffles (id) on delete restrict,
  type text not null check (type ~ '^[a-z_]{1,40}$'),
  actor_kind text not null check (actor_kind in ('sponsor', 'board', 'stripe', 'script')),
  actor_id text not null check (length(actor_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index raffle_events_raffle_idx on raffle_events (raffle_id, at);

create function raffle_append_only() returns trigger
language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = 'P0001';
end $$;

create trigger raffle_ledger_append_only before update or delete on raffle_ledger
  for each row execute function raffle_append_only();
create trigger raffle_events_append_only before update or delete on raffle_events
  for each row execute function raffle_append_only();

create table raffle_stripe_events (
  id text primary key,
  type text not null,
  handled_at timestamptz not null default now()
);
