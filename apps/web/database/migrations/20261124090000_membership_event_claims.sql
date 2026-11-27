
alter table stripe_events
  alter column processed_at drop not null,
  alter column processed_at drop default,
  add column claimed_at timestamptz,
  add constraint stripe_events_claimed_or_processed check (processed_at is not null or claimed_at is not null);
