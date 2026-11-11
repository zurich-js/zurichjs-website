-- Verein membership (docs/v2/MEMBERSHIP.md), on Netlify Database (Postgres).
--
-- Only the site's server functions connect to this database; there is no
-- client-side access, so there are no database roles or row-level security.
-- What the database itself guarantees:
--   * shape and uniqueness (one member per email, Stripe ids unique);
--   * every write to members goes through the member_* functions below, so a
--     status change and its audit row are one transaction, with compare-and-set
--     against double clicks and webhook retries (by convention: the app has no
--     other write path to members);
--   * member_events is append-only, even for the database owner;
--   * one certificate per paid Stripe invoice;
--   * personal data is removed one year after a membership ends, never earlier.
-- The status rules themselves live in @zurichjs/membership (state.ts).
--
-- Flow (owner, 10th November 2026): anyone can join. They sign in, choose a
-- level and cycle, accept the membership terms, and pay through Stripe. The
-- first payment makes them active; each paid term gets a certificate.

create extension if not exists citext;

create type member_level as enum ('basic', 'supporter');
create type member_cycle as enum ('quarterly', 'yearly');
create type member_kind as enum ('person', 'organisation');
create type member_category as enum ('passive', 'active');
create type member_status as enum ('pending', 'active', 'past_due', 'imported_manual', 'resigning', 'ended');
create type member_ended_reason as enum ('resigned', 'expelled', 'deceased', 'dissolved', 'lapsed');
create type member_source as enum ('self_serve', 'imported');
create type member_payment_mode as enum ('automatic', 'manual');
create type member_actor_kind as enum ('member', 'board', 'stripe', 'script');

-- Members ---------------------------------------------------------------------

create table members (
  id uuid primary key default gen_random_uuid(),
  -- The Better Auth user (sign-in). Null for imported members until they first sign in.
  user_id text unique references "user" (id) on delete set null,
  email citext not null unique check (email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  kind member_kind not null default 'person',
  name text not null check (length(name) between 1 and 200),
  organisation_name text check (organisation_name is null or length(organisation_name) between 1 and 200),
  level member_level not null,
  cycle member_cycle not null,
  category member_category not null default 'passive',
  status member_status not null,
  ended_reason member_ended_reason,
  -- Set when the status becomes `ended`; the one-year retention runs from here.
  ended_at timestamptz,
  anonymised_at timestamptz,
  source member_source not null,
  joined_at date,
  paid_until date,
  payment_mode member_payment_mode not null default 'automatic',
  stripe_customer_id text unique check (stripe_customer_id is null or stripe_customer_id ~ '^cus_'),
  stripe_subscription_id text unique check (stripe_subscription_id is null or stripe_subscription_id ~ '^sub_'),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organisation_has_name check (kind = 'person' or organisation_name is not null),
  constraint ended_has_reason check ((status = 'ended') = (ended_reason is not null)),
  constraint ended_has_date check ((status = 'ended') = (ended_at is not null)),
  constraint anonymised_only_when_ended check (anonymised_at is null or status = 'ended'),
  constraint manual_has_paid_until check (status <> 'imported_manual' or paid_until is not null)
);

create index members_status_idx on members (status);
create index members_paid_until_idx on members (paid_until) where payment_mode = 'manual';

-- Audit log (append-only) -----------------------------------------------------
-- Payloads never hold personal data or free text (ids, versions, reasons only).

create table member_events (
  id bigint generated always as identity primary key,
  member_id uuid not null references members (id) on delete restrict,
  type text not null check (type ~ '^[a-z_]{1,40}$'),
  from_status member_status,
  to_status member_status,
  actor_kind member_actor_kind not null,
  actor_id text not null check (length(actor_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index member_events_member_idx on member_events (member_id, at);

create function member_events_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'member_events is append-only' using errcode = 'P0001';
end;
$$;

create trigger member_events_no_update before update or delete on member_events
  for each row execute function member_events_append_only();
create trigger member_events_no_truncate before truncate on member_events
  for each statement execute function member_events_append_only();

-- Terms (no declaration to sign: accepting the terms is the agreement) -------------

create table terms_acceptances (
  id bigint generated always as identity primary key,
  member_id uuid not null references members (id) on delete restrict,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$'),
  accepted_at timestamptz not null default now()
);

create index terms_acceptances_member_idx on terms_acceptances (member_id, accepted_at desc);

-- Certificates of membership (one per paid term) -------------------------------------

create sequence certificate_number_seq;

create table certificates (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete restrict,
  -- ZJS-2026-0001: shown on the certificate.
  number text not null unique,
  level member_level not null,
  period_start date not null,
  period_end date not null check (period_end > period_start),
  -- The Stripe invoice the term was paid with (null for a term an organiser recorded by hand).
  stripe_invoice_id text unique check (stripe_invoice_id is null or stripe_invoice_id ~ '^in_'),
  issued_at timestamptz not null default now()
);

create index certificates_member_idx on certificates (member_id, period_start desc);

-- Stripe webhook idempotency ---------------------------------------------------

create table stripe_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  processed_at timestamptz not null default now()
);

-- Perks and documents ----------------------------------------------------------

create table perks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  min_level member_level not null default 'basic',
  requires_active boolean not null default false,
  code text,
  url text check (url is null or url ~ '^https://'),
  -- Yearly entitlement, e.g. the one included paid event (bylaws Art. 4).
  yearly boolean not null default false,
  created_at timestamptz not null default now()
);

create table perk_entitlements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete restrict,
  perk_id uuid not null references perks (id) on delete restrict,
  year int not null check (year between 2025 and 2100),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (member_id, perk_id, year)
);

create table member_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('gv_invitation', 'gv_minutes', 'annual_accounts', 'other')),
  dated date not null,
  min_level member_level not null default 'basic',
  active_only boolean not null default false,
  -- The file, in the private Netlify Blobs store `member-documents`.
  blob_key text not null unique,
  created_at timestamptz not null default now()
);

-- updated_at --------------------------------------------------------------------

create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger members_touch before update on members
  for each row execute function touch_updated_at();

-- Writes ---------------------------------------------------------------------------

-- Raises when the member does not exist (P0002) or was anonymised (nothing may change
-- an anonymised member again).
create function member_missing_or_anonymised(p_id uuid) returns void
language plpgsql as $$
begin
  if not exists (select 1 from members where id = p_id) then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from members where id = p_id and anonymised_at is not null) then
    raise exception 'member_anonymised' using errcode = 'P0001';
  end if;
end;
$$;

create function member_create(p_member jsonb, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
begin
  insert into members (email, kind, name, organisation_name, level, cycle, category, status, source, joined_at, paid_until, payment_mode, notes, user_id)
  values (
    p_member->>'email',
    coalesce(p_member->>'kind', 'person')::member_kind,
    p_member->>'name',
    p_member->>'organisation_name',
    (p_member->>'level')::member_level,
    (p_member->>'cycle')::member_cycle,
    coalesce(p_member->>'category', 'passive')::member_category,
    (p_member->>'status')::member_status,
    (p_member->>'source')::member_source,
    (p_member->>'joined_at')::date,
    (p_member->>'paid_until')::date,
    coalesce(p_member->>'payment_mode', 'automatic')::member_payment_mode,
    p_member->>'notes',
    p_member->>'user_id'
  )
  returning * into m;
  insert into member_events (member_id, type, to_status, actor_kind, actor_id, payload)
  values (m.id, 'created', m.status, p_actor_kind, p_actor_id, jsonb_build_object('source', m.source));
  return m;
end;
$$;

-- Only these fields; status, Stripe ids and ended_reason have their own functions.
create function member_update(p_id uuid, p_patch jsonb, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
  unknown text[];
begin
  select array_agg(k) into unknown from jsonb_object_keys(p_patch) k
  where k not in ('user_id', 'kind', 'name', 'organisation_name', 'level', 'cycle', 'category', 'paid_until', 'payment_mode', 'notes', 'joined_at');
  if unknown is not null then
    raise exception 'member_update cannot change %', array_to_string(unknown, ', ') using errcode = 'P0001';
  end if;
  update members set
    user_id = case when p_patch ? 'user_id' then p_patch->>'user_id' else user_id end,
    kind = case when p_patch ? 'kind' then (p_patch->>'kind')::member_kind else kind end,
    name = case when p_patch ? 'name' then p_patch->>'name' else name end,
    organisation_name = case when p_patch ? 'organisation_name' then p_patch->>'organisation_name' else organisation_name end,
    level = case when p_patch ? 'level' then (p_patch->>'level')::member_level else level end,
    cycle = case when p_patch ? 'cycle' then (p_patch->>'cycle')::member_cycle else cycle end,
    category = case when p_patch ? 'category' then (p_patch->>'category')::member_category else category end,
    paid_until = case when p_patch ? 'paid_until' then (p_patch->>'paid_until')::date else paid_until end,
    payment_mode = case when p_patch ? 'payment_mode' then (p_patch->>'payment_mode')::member_payment_mode else payment_mode end,
    notes = case when p_patch ? 'notes' then p_patch->>'notes' else notes end,
    joined_at = case when p_patch ? 'joined_at' then (p_patch->>'joined_at')::date else joined_at end
  where id = p_id and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'updated', p_actor_kind, p_actor_id, jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
  return m;
end;
$$;

create function member_link_stripe(p_id uuid, p_customer_id text, p_subscription_id text, p_actor_kind member_actor_kind, p_actor_id text)
returns members
language plpgsql as $$
declare
  m members;
begin
  update members set
    stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id)
  where id = p_id and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'stripe_linked', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('customerId', p_customer_id, 'subscriptionId', p_subscription_id)));
  return m;
end;
$$;

-- Compare-and-set: fails with member_transition_conflict when the status is no longer p_from.
create function member_transition(
  p_id uuid,
  p_from member_status,
  p_to member_status,
  p_ended_reason member_ended_reason,
  p_actor_kind member_actor_kind,
  p_actor_id text,
  p_payload jsonb default '{}'::jsonb
)
returns members
language plpgsql as $$
declare
  m members;
begin
  update members set status = p_to, ended_reason = p_ended_reason,
    ended_at = case when p_to = 'ended' then now() else null end
  where id = p_id and status = p_from and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
    raise exception 'member_transition_conflict' using errcode = 'P0001';
  end if;
  insert into member_events (member_id, type, from_status, to_status, actor_kind, actor_id, payload)
  values (m.id, 'status_changed', p_from, p_to, p_actor_kind, p_actor_id,
    coalesce(p_payload, '{}'::jsonb) || case when p_ended_reason is null then '{}'::jsonb else jsonb_build_object('reason', p_ended_reason) end);
  return m;
end;
$$;

create function member_accept_terms(p_id uuid, p_version text, p_actor_kind member_actor_kind, p_actor_id text)
returns void
language plpgsql as $$
begin
  perform member_missing_or_anonymised(p_id);
  insert into terms_acceptances (member_id, version) values (p_id, p_version);
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (p_id, 'terms_accepted', p_actor_kind, p_actor_id, jsonb_build_object('version', p_version));
end;
$$;

-- One certificate per paid invoice: a retried webhook returns the existing one.
create function member_issue_certificate(p_id uuid, p_start date, p_end date, p_invoice text, p_actor_kind member_actor_kind, p_actor_id text)
returns certificates
language plpgsql as $$
declare
  c certificates;
  m members;
begin
  if p_invoice is not null then
    select * into c from certificates where stripe_invoice_id = p_invoice;
    if c.id is not null then
      return c;
    end if;
  end if;
  select * into m from members where id = p_id and anonymised_at is null;
  if m.id is null then
    perform member_missing_or_anonymised(p_id);
  end if;
  insert into certificates (member_id, number, level, period_start, period_end, stripe_invoice_id)
  values (p_id, 'ZJS-' || extract(year from p_start)::int || '-' || lpad(nextval('certificate_number_seq')::text, 4, '0'), m.level, p_start, p_end, p_invoice)
  returning * into c;
  insert into member_events (member_id, type, actor_kind, actor_id, payload)
  values (p_id, 'certificate_issued', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('number', c.number, 'invoice', p_invoice)));
  return c;
end;
$$;

-- Retention ------------------------------------------------------------------------
-- Member data is kept for one year after the membership ends (owner, 6th November
-- 2026), then anonymised: the row and its certificates stay (counts, levels and dates
-- for the GV and the accounts), the person does not, and their sign-in account and
-- sessions are deleted. Stripe is not touched: its invoices are the payment records
-- the association's accounts rely on.
create function member_anonymise(p_id uuid, p_actor_id text, p_retention interval default interval '1 year')
returns void
language plpgsql as $$
declare
  m members;
begin
  if p_retention < interval '1 year' then
    raise exception 'member_retention_too_short' using errcode = 'P0001';
  end if;
  select * into m from members where id = p_id for update;
  if m.id is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if m.anonymised_at is not null then
    raise exception 'member_already_anonymised' using errcode = 'P0001';
  end if;
  if m.status <> 'ended' or m.ended_at > now() - p_retention then
    raise exception 'member_retention_not_reached' using errcode = 'P0001';
  end if;
  update members set
    email = 'anonymised-' || m.id || '@members.invalid',
    name = 'Anonymised',
    kind = 'person',
    organisation_name = null,
    notes = null,
    user_id = null,
    stripe_customer_id = null,
    stripe_subscription_id = null,
    anonymised_at = now()
  where id = p_id;
  if m.user_id is not null then
    delete from "user" where id = m.user_id;
  end if;
  insert into member_events (member_id, type, actor_kind, actor_id)
  values (p_id, 'anonymised', 'script', p_actor_id);
end;
$$;
