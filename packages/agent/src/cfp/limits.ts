/**
 * The CFP bot's limits (owner, 11th November 2026; docs/v2/CFP-BOT.md). Counted in Postgres
 * (`cfp_usage`), so they hold across serverless instances.
 */
import type { CfpOwner, CfpStore } from './store.ts';

/** At most two proposals per person per day (owner decision). Rolling 24 hours. */
export const CFP_MAX_SUBMISSIONS_PER_DAY = 2;
/** Messages to the bot per person per hour (suggestion in the plan). */
export const CFP_MAX_MESSAGES_PER_HOUR = 30;
/** Model calls per day for everyone together: caps the cost. CFP_MAX_MODEL_CALLS_PER_DAY overrides it. */
export const CFP_MAX_MODEL_CALLS_PER_DAY = 400;
/** Unfinished drafts are deleted after this many days without activity (suggested; the owner confirms). */
export const CFP_DRAFT_RETENTION_DAYS = 14;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type LimitHit = 'messages' | 'model_calls' | null;

/** Before a model turn: the person's hourly messages, then everyone's daily model calls. */
export async function turnLimit(store: CfpStore, owner: CfpOwner, now: Date, env: Record<string, string | undefined> = {}): Promise<LimitHit> {
  if ((await store.usage('message', new Date(now.getTime() - HOUR), owner)) >= CFP_MAX_MESSAGES_PER_HOUR) return 'messages';
  const cap = Number(env.CFP_MAX_MODEL_CALLS_PER_DAY) || CFP_MAX_MODEL_CALLS_PER_DAY;
  if ((await store.usage('model_call', new Date(now.getTime() - DAY))) >= cap) return 'model_calls';
  return null;
}

export const submissionsToday = (store: CfpStore, owner: CfpOwner, now: Date) => store.usage('submission', new Date(now.getTime() - DAY), owner);
