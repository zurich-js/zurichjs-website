/**
 * Daily: deletes CFP bot drafts untouched for CFP_DRAFT_RETENTION_DAYS (14) and old rate-limit rows,
 * even when nobody writes in #cfp for a while (the bot also does it on every message).
 * Env: DATABASE_URL (MEMBERSHIP_DB_URL locally). Without it, logs and does nothing.
 */
import { CFP_DRAFT_RETENTION_DAYS, postgresCfpStore } from '@zurichjs/agent/cfp';
import { cfpDb } from '../../src/server/cfp-bot.ts';

export default async () => {
  try {
    const n = await postgresCfpStore(cfpDb(process.env)).purge(CFP_DRAFT_RETENTION_DAYS);
    console.log(`[slack-cfp-cleanup] deleted ${n} expired draft(s)`);
  } catch (err) {
    console.log(`[slack-cfp-cleanup] skipped: ${(err as Error).message}`);
  }
};

export const config = { schedule: '@daily' };
