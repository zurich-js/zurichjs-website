import pg from 'pg';
import { postgresStore, type MemberStore, type Queryable } from '@zurichjs/membership';
import { DB_TIMEOUTS, membershipUrl } from './db-url.ts';
import type { Env } from './http.ts';

export class MembershipUnavailable extends Error {}

let pool: Queryable | undefined;

export function membershipDb(env: Env): Queryable {
  const url = membershipUrl(env);
  if (!url) throw new MembershipUnavailable('DATABASE_URL is not set');
  // Serverless functions: a few connections each, through Neon's pooler (the -pooler host).
  pool ??= new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000, ...DB_TIMEOUTS }) as unknown as Queryable;
  return pool;
}

export const memberStore = (env: Env): MemberStore => postgresStore(membershipDb(env));
