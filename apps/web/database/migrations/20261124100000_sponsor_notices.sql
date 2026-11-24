-- Notices a sponsorship change owes: an email to the sponsor or a Slack note for the board
-- (docs/domains/sponsorship/overview.md, "Notices"). A notice is written in the same statement as
-- the change that owes it, so a request that times out or fails after saving the change still
-- sends it later: right after the change, or from the daily check. `key` makes each notice once
-- only (the same retry or a second delivery of one Stripe event adds nothing). A sender claims a
-- notice before sending it, so two senders never send it twice; a claim older than five minutes
-- (a sender that died) can be taken again.

create table sponsor_notices (
  id bigint generated always as identity primary key,
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  key text not null unique check (length(key) between 1 and 300),
  body jsonb not null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text check (last_error is null or length(last_error) <= 500)
);

create index sponsor_notices_unsent_idx on sponsor_notices (sponsor_id, id) where sent_at is null;
