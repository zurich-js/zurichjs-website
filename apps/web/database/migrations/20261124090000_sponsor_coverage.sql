-- Covered meetups for every billing cycle (docs/domains/sponsorship/overview.md, "Covered meetups").
-- `sponsor_meetups` was the meetup list of a one-time sponsorship. It becomes the record of which
-- meetups a sponsorship covers, whatever its cycle: who confirmed each row and when, and, instead
-- of deleting a row, when it was taken off. Rows are kept after the meetup, so the history stays.
-- Rows that existed before this migration are marked confirmed by the board at migration time.

alter table sponsor_meetups
  add column confirmed_at timestamptz not null default now(),
  add column confirmed_by text not null default 'board' check (confirmed_by in ('sponsor', 'board', 'stripe', 'script')),
  add column removed_at timestamptz,
  add column removed_by text check (removed_by is null or removed_by in ('sponsor', 'board', 'stripe', 'script')),
  add constraint sponsor_meetups_removed_pair check ((removed_at is null) = (removed_by is null));

create index sponsor_meetups_event_idx on sponsor_meetups (event_id) where removed_at is null;
