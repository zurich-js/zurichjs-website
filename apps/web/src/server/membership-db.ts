/**
 * The membership database: Netlify Database (Postgres), connected through
 * @netlify/database, which reads NETLIFY_DB_URL (set by Netlify). The schema
 * is in netlify/database/migrations, applied by Netlify on every deploy.
 *
 * One pool per function instance. Without a database URL every membership
 * route answers 503 ("not available yet") instead of crashing.
 *
 * Locally, `astro dev` starts Netlify's local database and sets NETLIFY_DB_URL
 * to it (apply the migrations there with `npx netlify database migrations apply`),
 * or set MEMBERSHIP_DB_URL to any Postgres with the migrations applied: it wins
 * over NETLIFY_DB_URL. Production sets only NETLIFY_DB_URL.
 */
import { getDatabase } from '@netlify/database';
import { postgresStore, type MemberStore, type Queryable } from '@zurichjs/membership';
import type { Env } from './http.ts';

export class MembershipUnavailable extends Error {}

let pool: Queryable | undefined;

export function membershipDb(env: Env): Queryable {
  const url = env.MEMBERSHIP_DB_URL || env.NETLIFY_DB_URL;
  if (!url) throw new MembershipUnavailable('NETLIFY_DB_URL is not set');
  pool ??= getDatabase({ connectionString: url }).pool as unknown as Queryable;
  return pool;
}

export const memberStore = (env: Env): MemberStore => postgresStore(membershipDb(env));
