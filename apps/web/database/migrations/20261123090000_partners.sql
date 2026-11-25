-- Partners in the database (owner, 20th November 2026; docs/domains/partners/overview.md):
--   * every sponsor, host and partner the site names, current and past, is a row here and is
--     edited by the board in /admin/partners. The list in packages/content/src/partners.ts is only
--     the seed (apps/web/scripts/seed-partners.mjs) and what a build without a database shows.
--   * a partner has up to two logo files, kept here so a build can read them with the same
--     connection: `colour` (the logo as the company wants it) and `mono` (a one-colour version,
--     for the moving rows and for the hover colour), plus an optional hover colour.
--   * a sponsorship (sponsors.partner_id) names its partner by id, as before. No foreign key yet:
--     the table starts empty, and the links that exist stay valid once it is seeded.

create table partners (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  name text not null check (length(name) between 1 and 200),
  url text check (url is null or (url ~ '^https?://' and length(url) <= 500)),
  kinds text[] not null default '{}' check (kinds <@ array['sponsor', 'venue', 'food', 'community', 'conference', 'supporting']),
  tier text check (tier is null or tier in ('champion', 'builder', 'friend', 'supporter')),
  current boolean not null default false,
  -- Withdrawn from promotion: never listed, kept so a past event can still name them.
  delisted boolean not null default false,
  description text check (description is null or length(description) <= 500),
  blurb text check (blurb is null or length(blurb) <= 2000),
  allow_referrer boolean not null default false,
  -- The hover colour of their logo cell.
  logo_background text check (logo_background is null or logo_background ~ '^#[0-9a-f]{6}$'),
  -- White shapes inside a coloured one: how the black filter treats the colour logo without a `mono` file.
  logo_knockout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table partner_logos (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null references partners (id) on delete cascade,
  variant text not null check (variant in ('colour', 'mono')),
  content_type text not null check (content_type in ('image/svg+xml', 'image/png', 'image/webp')),
  filename text not null check (length(filename) between 1 and 200),
  bytes int not null check (bytes between 1 and 2097152),
  data bytea not null,
  -- Width / height, to give every logo the same visual weight; null when it could not be read.
  ratio real check (ratio is null or ratio > 0),
  -- A solid background (no transparency).
  opaque boolean not null default false,
  uploaded_at timestamptz not null default now(),
  unique (partner_id, variant)
);
