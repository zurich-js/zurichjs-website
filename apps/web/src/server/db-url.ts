/**
 * Which Postgres database this deploy uses (see membership-db.ts for the contexts). On its own, so
 * the CFP bot (cfp-bot.ts) reaches the same database without importing the membership code.
 */
import target from './db-target.json' with { type: 'json' };
import type { Env } from './http.ts';

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
