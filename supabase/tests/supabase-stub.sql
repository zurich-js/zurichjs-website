-- The parts of a Supabase database the membership migration relies on, for
-- testing migrations on a plain local Postgres (no Docker needed):
--   roles anon, authenticated, service_role; auth.users and auth.uid() (from
--   the request.jwt.claim.sub setting, as PostgREST sets it); storage.buckets;
--   and Supabase's default grants on the public schema, which the migration
--   must revoke. This is a test double, not Supabase: check the real project
--   (staging) before trusting production.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema extensions;
create schema auth;
create schema storage;

create table auth.users (id uuid primary key, email text);

create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table storage.buckets (id text primary key, name text not null, public boolean not null default false);

grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- Supabase's defaults: everything on new public objects for the API roles.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
