-- Consent and sharing for raffle add-ons (docs/domains/sponsorship/raffles.md, "Sharing with the sponsor").
-- Off unless the owner configured the sharing gate when entries opened: then the raffle freezes the
-- purpose, the sponsor's privacy notice and the sharing policy version, and entrants may tick an
-- unticked box. A consent counts only once the email is verified and until it is withdrawn. A share
-- is a release to one sponsor contact for a limited time; every read narrows it to consent valid then.
-- Entrant names and emails never appear in raffle_events: only entry ids and counts.

alter table raffles
  add column share_purpose text check (share_purpose is null or length(share_purpose) between 1 and 300),
  add column share_privacy_url text check (share_privacy_url is null or share_privacy_url ~ '^https://'),
  add column sharing_version text check (sharing_version is null or length(sharing_version) between 1 and 40),
  add constraint raffle_sharing_all_or_none check ((share_purpose is null) = (sharing_version is null) and (share_privacy_url is null) = (sharing_version is null));

create or replace function raffles_frozen_terms() returns trigger
language plpgsql as $$
begin
  if old.opened_at is not null and (new.prize, new.quantity, new.event_id, new.event_date, new.rules_version, new.rules_url, new.closes_at, new.opened_at, new.sponsor_id,
                                    new.share_purpose, new.share_privacy_url, new.sharing_version)
     is distinct from (old.prize, old.quantity, old.event_id, old.event_date, old.rules_version, old.rules_url, old.closes_at, old.opened_at, old.sponsor_id,
                       old.share_purpose, old.share_privacy_url, old.sharing_version) then
    raise exception 'a raffle''s terms are frozen once entries open' using errcode = 'P0001';
  end if;
  return new;
end $$;

create table raffle_consents (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references raffle_entries (id) on delete restrict,
  raffle_id uuid not null references raffles (id) on delete restrict,
  recipient_sponsor_id uuid not null references sponsors (id) on delete restrict,
  purpose text not null check (length(purpose) between 1 and 300),
  version text not null check (length(version) between 1 and 40),
  given_at timestamptz not null,
  verified_at timestamptz,
  withdrawn_at timestamptz
);

-- One choice in force per entry; a withdrawn one stays as a record.
create unique index raffle_consents_active_idx on raffle_consents (entry_id) where withdrawn_at is null;
create index raffle_consents_raffle_idx on raffle_consents (raffle_id);

create table raffle_shares (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references raffles (id) on delete restrict,
  recipient_contact_id uuid not null references sponsor_contacts (id) on delete restrict,
  purpose text not null,
  fields text[] not null check (array_length(fields, 1) >= 1 and fields <@ array['name', 'email']),
  entry_ids uuid[] not null check (array_length(entry_ids, 1) >= 1),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint share_expiry check (expires_at > created_at and expires_at <= created_at + interval '31 days')
);

create index raffle_shares_raffle_idx on raffle_shares (raffle_id, created_at desc);
