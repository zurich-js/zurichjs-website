-- Raffle entries and draws (docs/domains/sponsorship/raffles.md). Entering is free, without an account:
-- a name or nickname and an email, one entry per email per raffle. The entry counts at once; the email
-- is verified when its owner confirms from the link we sent. Draws are append-only: the first draw and
-- any redraw (with its reason), each with the entries' hash and the random index.
-- Once entries open, the rules version, its URL, the closing time, the prize and the meetup are frozen.

alter table raffles
  add column rules_version text check (rules_version is null or length(rules_version) between 1 and 40),
  add column rules_url text check (rules_url is null or rules_url ~ '^https://'),
  add column opened_at timestamptz,
  add column closes_at timestamptz,
  add constraint raffle_open_has_rules check (stage not in ('open', 'closed', 'drawn', 'fulfilled') or (rules_version is not null and rules_url is not null and closes_at is not null));

create function raffles_frozen_terms() returns trigger
language plpgsql as $$
begin
  if old.opened_at is not null and (new.prize, new.quantity, new.event_id, new.event_date, new.rules_version, new.rules_url, new.closes_at, new.opened_at, new.sponsor_id)
     is distinct from (old.prize, old.quantity, old.event_id, old.event_date, old.rules_version, old.rules_url, old.closes_at, old.opened_at, old.sponsor_id) then
    raise exception 'a raffle''s terms are frozen once entries open' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger raffles_frozen_terms before update on raffles
  for each row execute function raffles_frozen_terms();

create table raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references raffles (id) on delete restrict,
  name text not null check (length(name) between 1 and 80),
  email citext not null check (length(email) <= 254 and email ~ '^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$'),
  claim_code text not null check (claim_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (raffle_id, email),
  unique (raffle_id, claim_code)
);

create index raffle_entries_raffle_idx on raffle_entries (raffle_id, created_at, id);

create table raffle_draws (
  raffle_id uuid not null references raffles (id) on delete restrict,
  seq int not null check (seq >= 1),
  entry_id uuid not null references raffle_entries (id) on delete restrict,
  eligible_count int not null check (eligible_count > 0),
  entries_hash text not null check (entries_hash ~ '^[0-9a-f]{64}$'),
  index int not null check (index >= 0 and index < eligible_count),
  reason text check ((seq = 1) = (reason is null) and (reason is null or length(reason) between 1 and 500)),
  actor_kind text not null check (actor_kind in ('board', 'script')),
  actor_id text not null,
  at timestamptz not null default now(),
  primary key (raffle_id, seq)
);

create trigger raffle_draws_append_only before update or delete on raffle_draws
  for each row execute function raffle_append_only();
