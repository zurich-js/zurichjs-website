#!/usr/bin/env node
// Applies apps/web/database/migrations to the Neon database of this build, before the site is
// built (apps/web/netlify.toml). Each file once, in order, each in one transaction, recorded in
// schema_migrations; an advisory lock keeps two builds from migrating at the same time.
//
//   production       DATABASE_URL(_UNPOOLED) of the production context: the Neon production branch.
//                    Missing there, the build fails (production must never run without its schema).
//   deploy-preview   DATABASE_URL(_UNPOOLED) of the deploy-preview context: the Neon preview branch.
//                    Each PR gets its own empty database on it, pr_<number> (REVIEW_ID), migrated from
//                    scratch, so no production data reaches a preview. Its name goes into
//                    src/server/db-target.json for the functions. Dropped when the PR closes
//                    (.github/workflows/preview-db-cleanup.yml).
//   anything else    migrated if a URL is set, otherwise skipped (CI and local builds need no database).
//
// Local development uses the Docker Postgres and tools/docker/migrate.sh instead.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import pg from 'pg';

const MIGRATIONS = new URL('../database/migrations/', import.meta.url);
const TARGET = new URL('../src/server/db-target.json', import.meta.url);
const context = process.env.CONTEXT ?? 'local';
// Migrations need a direct connection (DDL, advisory locks); the pooled one is for the functions.
const base = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const log = (m) => console.log(`[db-migrate] ${m}`);

const withDatabase = (url, database) => {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
};

if (!base) {
  if (context === 'production') {
    console.error('[db-migrate] DATABASE_URL is not set for production: refusing to build without the membership database.');
    process.exit(1);
  }
  log(`no DATABASE_URL in context "${context}": skipped`);
  process.exit(0);
}

let url = base;
if (context === 'deploy-preview') {
  const pr = process.env.REVIEW_ID ?? '';
  if (!/^\d+$/.test(pr)) throw new Error(`deploy-preview without a PR number (REVIEW_ID="${pr}")`);
  const name = `pr_${pr}`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  const exists = await admin.query('select 1 from pg_database where datname = $1', [name]);
  if (!exists.rowCount) {
    await admin.query(`create database ${name}`); // the name is digits only (checked above)
    log(`created database ${name} for PR #${pr}`);
  }
  await admin.end();
  url = withDatabase(base, name);
  writeFileSync(TARGET, `${JSON.stringify({ database: name })}\n`);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("select pg_advisory_lock(hashtext('zurichjs:migrations'))");
  await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  let applied = 0;
  for (const name of files) {
    if (done.has(name)) continue;
    log(`applying ${name}`);
    await client.query('begin');
    try {
      await client.query(readFileSync(new URL(name, MIGRATIONS), 'utf8'));
      await client.query('insert into schema_migrations (name) values ($1)', [name]);
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw new Error(`${name} failed: ${e.message}`);
    }
    applied++;
  }
  log(`${applied} applied, ${files.length - applied} already there (${context})`);
} finally {
  await client.end();
}
