-- Sponsorship (docs/domains/sponsorship/overview.md): sponsors, the people who sign in for them, the
-- agreements they accepted, the board's proposals, logos, and an append-only audit log.
--
-- Only the site's server functions connect. Every write in the store
-- (packages/sponsorship/src/postgres.ts) is one statement that changes the row and
-- appends its audit row (data-modifying CTE), with compare-and-set on the status.
-- Values are text with checks (no enum types), so adding a tier or cycle later is a
-- check change. The status rules live in @zurichjs/sponsorship (state.ts).

create extension if not exists citext;

create table sponsors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(company_name) between 1 and 200),
  legal_name text check (legal_name is null or length(legal_name) between 1 and 200),
  billing_address text check (billing_address is null or length(billing_address) <= 1000),
  vat_id text check (vat_id is null or length(vat_id) <= 40),
  website text check (website is null or website ~ '^https?://'),
  tier text not null check (tier in ('supporter', 'friend', 'builder', 'champion')),
  cycle text not null check (cycle in ('monthly', 'quarterly', 'yearly', 'once')),
  payment_mode text not null check (payment_mode in ('card', 'invoice', 'manual')),
  status text not null check (status in ('pending', 'active', 'past_due', 'ending', 'ended')),
  ended_reason text check (ended_reason in ('cancelled', 'completed', 'lapsed', 'terminated', 'withdrawn')),
  ended_at timestamptz,
  source text not null check (source in ('self_serve', 'invited', 'imported')),
  started_at date,
  paid_until date,
  event_id text,
  event_title text check (event_title is null or length(event_title) <= 300),
  event_date date,
  partner_id text,
  stripe_customer_id text unique check (stripe_customer_id is null or stripe_customer_id ~ '^cus_'),
  stripe_subscription_id text unique check (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_'),
  notes text check (notes is null or length(notes) <= 4000),
  end_requested_at timestamptz,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ended_has_reason check ((status = 'ended') = (ended_reason is not null)),
  constraint ended_has_date check ((status = 'ended') = (ended_at is not null)),
  constraint once_has_event check (cycle <> 'once' or status in ('pending', 'ended') or event_date is not null)
);

create index sponsors_status_idx on sponsors (status);

create trigger sponsors_touch before update on sponsors
  for each row execute function touch_updated_at();

create table sponsor_contacts (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  -- One sponsor per email: signing in finds the sponsor by it.
  email citext not null unique check (email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  name text not null check (length(name) between 1 and 200),
  role text not null check (role in ('primary', 'billing', 'other')),
  user_id text unique references "user" (id) on delete set null,
  created_at timestamptz not null default now()
);

create index sponsor_contacts_sponsor_idx on sponsor_contacts (sponsor_id);

-- Append-only audit log. Payloads hold ids, versions and choices, no free text.
create table sponsor_events (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  type text not null check (type ~ '^[a-z_]{1,40}$'),
  from_status text,
  to_status text,
  actor_kind text not null check (actor_kind in ('sponsor', 'board', 'stripe', 'script')),
  actor_id text not null check (length(actor_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index sponsor_events_sponsor_idx on sponsor_events (sponsor_id, at);

create function sponsor_events_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'sponsor_events is append-only' using errcode = 'P0001';
end;
$$;

create trigger sponsor_events_no_update before update or delete on sponsor_events
  for each row execute function sponsor_events_append_only();
create trigger sponsor_events_no_truncate before truncate on sponsor_events
  for each statement execute function sponsor_events_append_only();

-- Signed agreements: who accepted which version, for what (append-only by convention;
-- the store has no update or delete).
create table sponsor_agreements (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$'),
  signer_name text not null check (length(signer_name) between 1 and 200),
  signer_title text not null check (length(signer_title) between 1 and 200),
  signer_email citext not null,
  context text not null check (context in ('start', 'change', 'proposal')),
  summary text not null check (length(summary) <= 300),
  accepted_at timestamptz not null default now()
);

create index sponsor_agreements_sponsor_idx on sponsor_agreements (sponsor_id, accepted_at desc);

create table sponsor_proposals (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  kind text not null check (kind in ('plan', 'end')),
  tier text check (tier in ('supporter', 'friend', 'builder', 'champion')),
  cycle text check (cycle in ('monthly', 'quarterly', 'yearly', 'once')),
  message text check (message is null or length(message) <= 2000),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'withdrawn', 'expired')),
  created_by text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_by text,
  decided_at timestamptz,
  constraint plan_has_target check (kind <> 'plan' or (tier is not null and cycle is not null))
);

-- At most one proposal waits for an answer per sponsor.
create unique index sponsor_proposals_one_open on sponsor_proposals (sponsor_id) where status = 'open';

create table sponsor_logos (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  blob_key text not null unique,
  content_type text not null check (content_type in ('image/svg+xml', 'image/png', 'image/webp')),
  bytes int not null check (bytes between 1 and 2097152),
  filename text not null check (length(filename) between 1 and 200),
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  review text not null default 'pending' check (review in ('pending', 'approved', 'rejected')),
  review_note text check (review_note is null or length(review_note) <= 1000),
  reviewed_at timestamptz
);

create index sponsor_logos_sponsor_idx on sponsor_logos (sponsor_id, uploaded_at desc);

-- Own table, not stripe_events: the membership and sponsorship webhook endpoints can both
-- receive the same event id, and each must handle it once.
create table sponsor_stripe_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  processed_at timestamptz not null default now()
);
