/**
 * Once a day (07:30 UTC): ends confirmed resignations of members who pay by cash or bank transfer
 * on their paid-until day. Logic and tests: src/server/membership-daily.ts.
 * Env: DATABASE_URL, SLACK_AGENT_BOT_TOKEN, SLACK_MEMBERSHIP_CHANNEL_ID.
 */
import { memberStore } from '../../src/server/membership-db.ts';
import { membershipDailyCheck } from '../../src/server/membership-daily.ts';

export default async () => {
  const env = process.env;
  try {
    const result = await membershipDailyCheck({ env, store: memberStore(env) });
    console.log(`[membership-daily] ${JSON.stringify(result)}`);
  } catch (err) {
    console.error('[membership-daily] failed', err);
  }
};

export const config = { schedule: '30 7 * * *' };
