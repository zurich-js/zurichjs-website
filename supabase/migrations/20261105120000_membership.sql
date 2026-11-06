-- Verein membership (docs/v2/MEMBERSHIP.md).
--
-- Access model:
--   * The site's functions use the service role. Every write goes through the
--     member_* functions below, so a status change and its audit row are one
--     transaction, and the functions are the only thing service_role may run.
--   * Signed-in members (role `authenticated`) may only SELECT their own rows,
--     and the documents their level allows. They cannot write anything.
--   * `anon` gets nothing.
--   * member_events is append-only, even for the service role and the owner.
-- The status rules themselves live in @zurichjs/membership (state.ts); the
-- database enforces shape, uniqueness, append-only history and compare-and-set.
--
-- Supabase grants anon and authenticated everything on new tables by default:
-- every later migration that adds a table must revoke that again (see the end).

create extension if not exists citext with schema extensions;

create type public.member_level as enum ('basic', 'supporter');
create type public.member_cycle as enum ('quarterly', 'yearly');
create type public.member_kind as enum ('person', 'organisation');
create type public.member_category as enum ('passive', 'active');
create type public.member_status as enum ('applied', 'approved', 'signed', 'active', 'past_due', 'imported_manual', 'resigning', 'rejected', 'ended');
create type public.member_ended_reason as enum ('resigned', 'expelled', 'deceased', 'dissolved', 'lapsed');
create type public.member_source as enum ('self_serve', 'imported');
create type public.member_payment_mode as enum ('automatic', 'manual');
create type public.member_actor_kind as enum ('member', 'board', 'stripe', 'script');
create type public.declaration_kind as enum ('digital', 'paper_import');

-- Members ---------------------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email extensions.citext not null unique check (email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  kind public.member_kind not null default 'person',
  name text not null check (length(name) between 1 and 200),
  organisation_name text check (organisation_name is null or length(organisation_name) between 1 and 200),
  level public.member_level not null,
  cycle public.member_cycle not null,
  category public.member_category not null default 'passive',
  status public.member_status not null,
  ended_reason public.member_ended_reason,
  -- Set when the status becomes `ended`; the one-year retention runs from here.
  ended_at timestamptz,
  anonymised_at timestamptz,
  source public.member_source not null,
  joined_at date,
  paid_until date,
  payment_mode public.member_payment_mode not null default 'automatic',
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

create index members_status_idx on public.members (status);
create index members_paid_until_idx on public.members (paid_until) where payment_mode = 'manual';

-- Audit log (append-only) -----------------------------------------------------

create table public.member_events (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.members (id) on delete restrict,
  type text not null check (type ~ '^[a-z_]{1,40}$'),
  from_status public.member_status,
  to_status public.member_status,
  actor_kind public.member_actor_kind not null,
  actor_id text not null check (length(actor_id) between 1 and 200),
  payload jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index member_events_member_idx on public.member_events (member_id, at);

create function public.member_events_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'member_events is append-only' using errcode = 'P0001';
end;
$$;

create trigger member_events_no_update before update or delete on public.member_events
  for each row execute function public.member_events_append_only();
create trigger member_events_no_truncate before truncate on public.member_events
  for each statement execute function public.member_events_append_only();

-- Declarations (the signed membership declaration) ----------------------------

create table public.declaration_versions (
  id text primary key check (id ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\.[0-9]+)?$'),
  effective_from date not null,
  bylaws_version text not null,
  declaration_de text not null,
  declaration_en text not null,
  bylaws_de text not null,
  bylaws_en text not null,
  created_at timestamptz not null default now()
);

create table public.declarations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  kind public.declaration_kind not null,
  version_id text references public.declaration_versions (id),
  signed_at timestamptz not null,
  typed_name text,
  ip inet,
  user_agent text check (user_agent is null or length(user_agent) <= 1000),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  -- typed_name is cleared when the member is anonymised (member_anonymise).
  constraint digital_has_version check (kind = 'paper_import' or version_id is not null)
);

create index declarations_member_idx on public.declarations (member_id);

-- Stripe webhook idempotency ---------------------------------------------------

create table public.stripe_events (
  id text primary key check (id ~ '^evt_'),
  type text not null,
  processed_at timestamptz not null default now()
);

-- Perks and documents ----------------------------------------------------------

create table public.perks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  min_level public.member_level not null default 'basic',
  requires_active boolean not null default false,
  -- Codes and links are only handed out by the API, never selectable by members.
  code text,
  url text check (url is null or url ~ '^https://'),
  -- Yearly entitlement, e.g. the one included paid event (Art. 4).
  yearly boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.perk_entitlements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  perk_id uuid not null references public.perks (id) on delete restrict,
  year int not null check (year between 2025 and 2100),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz,
  unique (member_id, perk_id, year)
);

create table public.member_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('gv_invitation', 'gv_minutes', 'annual_accounts', 'other')),
  dated date not null,
  min_level public.member_level not null default 'basic',
  active_only boolean not null default false,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

-- updated_at --------------------------------------------------------------------

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger members_touch before update on public.members
  for each row execute function public.touch_updated_at();

-- Writes (service role only) -------------------------------------------------------
-- Used by the write functions: raises when the member does not exist (P0002) or
-- was anonymised (nothing may change an anonymised member again).
create function public.member_missing_or_anonymised(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.members where id = p_id) then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.members where id = p_id and anonymised_at is not null) then
    raise exception 'member_anonymised' using errcode = 'P0001';
  end if;
end;
$$;

-- security definer: the service role has no direct INSERT or UPDATE on members or
-- member_events, so these functions are the only way to write them.

create function public.member_create(p_member jsonb, p_actor_kind public.member_actor_kind, p_actor_id text)
returns public.members
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  insert into public.members (email, kind, name, organisation_name, level, cycle, category, status, source, joined_at, paid_until, payment_mode, notes, auth_user_id)
  values (
    p_member->>'email',
    coalesce(p_member->>'kind', 'person')::public.member_kind,
    p_member->>'name',
    p_member->>'organisation_name',
    (p_member->>'level')::public.member_level,
    (p_member->>'cycle')::public.member_cycle,
    coalesce(p_member->>'category', 'passive')::public.member_category,
    (p_member->>'status')::public.member_status,
    (p_member->>'source')::public.member_source,
    (p_member->>'joined_at')::date,
    (p_member->>'paid_until')::date,
    coalesce(p_member->>'payment_mode', 'automatic')::public.member_payment_mode,
    p_member->>'notes',
    (p_member->>'auth_user_id')::uuid
  )
  returning * into m;
  insert into public.member_events (member_id, type, to_status, actor_kind, actor_id, payload)
  values (m.id, 'created', m.status, p_actor_kind, p_actor_id, jsonb_build_object('source', m.source));
  return m;
end;
$$;

-- Only these fields; status, Stripe ids and ended_reason have their own functions.
create function public.member_update(p_id uuid, p_patch jsonb, p_actor_kind public.member_actor_kind, p_actor_id text)
returns public.members
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
  unknown text[];
begin
  select array_agg(k) into unknown from jsonb_object_keys(p_patch) k
  where k not in ('auth_user_id', 'name', 'organisation_name', 'level', 'cycle', 'category', 'paid_until', 'payment_mode', 'notes', 'joined_at');
  if unknown is not null then
    raise exception 'member_update cannot change %', array_to_string(unknown, ', ') using errcode = 'P0001';
  end if;
  update public.members set
    auth_user_id = case when p_patch ? 'auth_user_id' then (p_patch->>'auth_user_id')::uuid else auth_user_id end,
    name = case when p_patch ? 'name' then p_patch->>'name' else name end,
    organisation_name = case when p_patch ? 'organisation_name' then p_patch->>'organisation_name' else organisation_name end,
    level = case when p_patch ? 'level' then (p_patch->>'level')::public.member_level else level end,
    cycle = case when p_patch ? 'cycle' then (p_patch->>'cycle')::public.member_cycle else cycle end,
    category = case when p_patch ? 'category' then (p_patch->>'category')::public.member_category else category end,
    paid_until = case when p_patch ? 'paid_until' then (p_patch->>'paid_until')::date else paid_until end,
    payment_mode = case when p_patch ? 'payment_mode' then (p_patch->>'payment_mode')::public.member_payment_mode else payment_mode end,
    notes = case when p_patch ? 'notes' then p_patch->>'notes' else notes end,
    joined_at = case when p_patch ? 'joined_at' then (p_patch->>'joined_at')::date else joined_at end
  where id = p_id and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform public.member_missing_or_anonymised(p_id);
  end if;
  insert into public.member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'updated', p_actor_kind, p_actor_id, jsonb_build_object('fields', (select jsonb_agg(k) from jsonb_object_keys(p_patch) k)));
  return m;
end;
$$;

create function public.member_link_stripe(p_id uuid, p_customer_id text, p_subscription_id text, p_actor_kind public.member_actor_kind, p_actor_id text)
returns public.members
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  update public.members set
    stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
    stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id)
  where id = p_id and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform public.member_missing_or_anonymised(p_id);
  end if;
  insert into public.member_events (member_id, type, actor_kind, actor_id, payload)
  values (m.id, 'stripe_linked', p_actor_kind, p_actor_id, jsonb_strip_nulls(jsonb_build_object('customerId', p_customer_id, 'subscriptionId', p_subscription_id)));
  return m;
end;
$$;

-- Compare-and-set: fails with member_transition_conflict when the status is no longer p_from.
create function public.member_transition(
  p_id uuid,
  p_from public.member_status,
  p_to public.member_status,
  p_ended_reason public.member_ended_reason,
  p_actor_kind public.member_actor_kind,
  p_actor_id text,
  p_payload jsonb default '{}'::jsonb
)
returns public.members
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  update public.members set status = p_to, ended_reason = p_ended_reason,
    ended_at = case when p_to = 'ended' then now() else null end
  where id = p_id and status = p_from and anonymised_at is null
  returning * into m;
  if m.id is null then
    perform public.member_missing_or_anonymised(p_id);
    raise exception 'member_transition_conflict' using errcode = 'P0001';
  end if;
  insert into public.member_events (member_id, type, from_status, to_status, actor_kind, actor_id, payload)
  values (m.id, 'status_changed', p_from, p_to, p_actor_kind, p_actor_id,
    coalesce(p_payload, '{}'::jsonb) || case when p_ended_reason is null then '{}'::jsonb else jsonb_build_object('reason', p_ended_reason) end);
  return m;
end;
$$;

-- Retention ------------------------------------------------------------------------
-- Member data is kept for one year after the membership ends (owner, 6th November
-- 2026), then anonymised: the row stays (counts, levels and dates for the GV and the
-- accounts), the person does not. Returns the declaration files the caller must
-- delete from Storage; the caller also deletes the auth user. Stripe invoices are
-- not touched: they are the payment records the association's accounts rely on.
-- The audit log keeps its rows: payloads never hold personal data by design.
create function public.member_anonymise(p_id uuid, p_actor_id text, p_retention interval default interval '1 year')
returns setof text
language plpgsql security definer set search_path = '' as $$
declare
  m public.members;
begin
  if p_retention < interval '1 year' then
    raise exception 'member_retention_too_short' using errcode = 'P0001';
  end if;
  select * into m from public.members where id = p_id for update;
  if m.id is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;
  if m.anonymised_at is not null then
    raise exception 'member_already_anonymised' using errcode = 'P0001';
  end if;
  if m.status <> 'ended' or m.ended_at > now() - p_retention then
    raise exception 'member_retention_not_reached' using errcode = 'P0001';
  end if;
  update public.members set
    email = 'anonymised-' || m.id || '@members.invalid',
    name = 'Anonymised',
    kind = 'person',
    organisation_name = null,
    notes = null,
    auth_user_id = null,
    stripe_customer_id = null,
    stripe_subscription_id = null,
    anonymised_at = now()
  where id = p_id;
  update public.declarations set typed_name = null, ip = null, user_agent = null where member_id = p_id;
  insert into public.member_events (member_id, type, actor_kind, actor_id)
  values (p_id, 'anonymised', 'script', p_actor_id);
  return query select d.storage_path from public.declarations d where d.member_id = p_id;
end;
$$;

-- Visibility helpers (used by the policies) ----------------------------------------

create function public.member_level_rank(l public.member_level) returns int
language sql immutable set search_path = '' as $$
  select array_position(enum_range(null::public.member_level), l) - 1
$$;

create function public.current_member() returns public.members
language sql stable security definer set search_path = '' as $$
  select * from public.members where auth_user_id = auth.uid() and auth.uid() is not null
$$;

-- Privileges --------------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.member_events enable row level security;
alter table public.declaration_versions enable row level security;
alter table public.declarations enable row level security;
alter table public.stripe_events enable row level security;
alter table public.perks enable row level security;
alter table public.perk_entitlements enable row level security;
alter table public.member_documents enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- Members read their own rows (column list: no Stripe ids, notes or the end reason).
grant select (id, email, kind, name, organisation_name, level, cycle, category, status, joined_at, paid_until, payment_mode) on public.members to authenticated;
create policy members_own on public.members for select to authenticated using (auth_user_id = auth.uid());

grant select (id, member_id, kind, version_id, signed_at, typed_name) on public.declarations to authenticated;
create policy declarations_own on public.declarations for select to authenticated
  using (member_id = (select (public.current_member()).id));

grant select (id, member_id, perk_id, year, issued_at, redeemed_at) on public.perk_entitlements to authenticated;
create policy entitlements_own on public.perk_entitlements for select to authenticated
  using (member_id = (select (public.current_member()).id));

grant select (id, title, kind, dated, min_level, active_only) on public.member_documents to authenticated;
create policy documents_for_level on public.member_documents for select to authenticated
  using (exists (
    select 1 from (select (public.current_member()).*) m
    where m.status in ('active', 'past_due', 'imported_manual', 'resigning')
      and public.member_level_rank(m.level) >= public.member_level_rank(member_documents.min_level)
      and (not member_documents.active_only or m.category = 'active')
  ));

grant execute on function public.current_member() to authenticated;
grant execute on function public.member_level_rank(public.member_level) to authenticated;

-- The service role: reads everything, writes only through the functions.
revoke insert, update, delete, truncate on public.members, public.member_events from service_role;
grant select on all tables in schema public to service_role;
grant insert, update, delete on public.declaration_versions, public.declarations, public.stripe_events, public.perks, public.perk_entitlements, public.member_documents to service_role;
grant execute on function public.member_create(jsonb, public.member_actor_kind, text) to service_role;
grant execute on function public.member_update(uuid, jsonb, public.member_actor_kind, text) to service_role;
grant execute on function public.member_link_stripe(uuid, text, text, public.member_actor_kind, text) to service_role;
grant execute on function public.member_transition(uuid, public.member_status, public.member_status, public.member_ended_reason, public.member_actor_kind, text, jsonb) to service_role;
grant execute on function public.member_anonymise(uuid, text, interval) to service_role;

-- Private buckets. No storage policies: only the service role reads or writes,
-- and members download through short-lived signed URLs the functions create.
insert into storage.buckets (id, name, public) values ('declarations', 'declarations', false), ('member-documents', 'member-documents', false)
on conflict (id) do nothing;
