-- Sponsorship, second round (owner, 18th November 2026; docs/v2/SPONSORSHIP.md):
--   * card only: no Stripe invoices (sponsors paid outside Stripe stay `manual`)
--   * meetup bundles: one or more meetups per one-time sponsorship, optionally at a custom
--     price per meetup set by the board
--   * board changes are emailed links the sponsor confirms: no proposals table
--   * logos are uploaded and announced, not reviewed
--   * contracts signed outside the site can be attached (they replace the online agreement)
--   * contacts remember who added them: a contact another contact added is only linked to a
--     sign-in once that person accepts the invitation on the site
--   * Checkout sessions and payment links are kept, so a second payment page can be closed

update sponsors set payment_mode = 'card' where payment_mode = 'invoice';
alter table sponsors drop constraint sponsors_payment_mode_check;
alter table sponsors add constraint sponsors_payment_mode_check check (payment_mode in ('card', 'manual'));

alter table sponsors
  add column price_per_meetup int check (price_per_meetup is null or price_per_meetup between 1 and 100000),
  add column checkout_session_id text check (checkout_session_id is null or checkout_session_id ~ '^cs_'),
  add column payment_link_id text check (payment_link_id is null or payment_link_id ~ '^plink_'),
  add column payment_link_url text check (payment_link_url is null or payment_link_url ~ '^https://');

create table sponsor_meetups (
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  event_id text not null check (length(event_id) between 1 and 200),
  title text not null check (length(title) between 1 and 300),
  date date not null,
  primary key (sponsor_id, event_id)
);

insert into sponsor_meetups (sponsor_id, event_id, title, date)
  select id, event_id, coalesce(event_title, 'Meetup'), event_date from sponsors where event_id is not null and event_date is not null;

alter table sponsors drop constraint once_has_event;
alter table sponsors drop column event_id, drop column event_title, drop column event_date;

drop table sponsor_proposals;

alter table sponsor_logos drop column review, drop column review_note, drop column reviewed_at;

alter table sponsor_contacts add column added_by text not null default 'board' check (added_by in ('board', 'sponsor', 'self'));

-- Contracts signed outside the site (PDF in the private Netlify Blobs store `sponsors`).
create table sponsor_documents (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors (id) on delete restrict,
  kind text not null default 'contract' check (kind in ('contract')),
  blob_key text not null unique,
  filename text not null check (length(filename) between 1 and 200),
  bytes int not null check (bytes between 1 and 10485760),
  signed_on date,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now()
);

create index sponsor_documents_sponsor_idx on sponsor_documents (sponsor_id, uploaded_at desc);
