/**
 * The membership database: Postgres on Neon (owner, 11th November 2026; it was Netlify Database,
 * which the Netlify plan does not include). The schema is in apps/web/database/migrations, applied
 * before every Netlify build by tools/db-migrate.mjs.
 *
 *   production     DATABASE_URL: the Neon production branch (pooled connection)
 *   deploy preview DATABASE_URL: the Neon preview branch; each PR uses its own database on it,
 *                  pr_<number>, created empty by tools/db-migrate.mjs, which writes its name into
 *                  db-target.json (bundled with the functions; a name, not a secret)
 *   local          MEMBERSHIP_DB_URL: the Docker Postgres (docker-compose.yml); it wins over DATABASE_URL
 *
 * One pool per function instance. Without a database URL every membership route answers 503
 * ("not available yet") instead of crashing.
 */
import pg from 'pg';
import { postgresStore, type MemberStore, type Queryable } from '@zurichjs/membership';
import target from './db-target.json' with { type: 'json' };
import type { Env } from './http.ts';

export class MembershipUnavailable extends Error {}

let pool: Queryable | undefined;

/** The connection string with another database name (a deploy preview's own database). */
export function withDatabase(url: string, database: string | null): string {
  if (!database) return url;
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

export function membershipUrl(env: Env, database: string | null = target.database): string | undefined {
  if (env.MEMBERSHIP_DB_URL) return env.MEMBERSHIP_DB_URL;
  return env.DATABASE_URL ? withDatabase(env.DATABASE_URL, database) : undefined;
}

export function membershipDb(env: Env): Queryable {
  const url = membershipUrl(env);
  if (!url) throw new MembershipUnavailable('DATABASE_URL is not set');
  // Serverless functions: a few connections each, through Neon's pooler (the -pooler host).
  pool ??= new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 }) as unknown as Queryable;
  return pool;
}

export const memberStore = (env: Env): MemberStore => postgresStore(membershipDb(env));
