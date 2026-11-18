/**
 * Once a day (07:15 UTC): completes one-time sponsorships after their last meetup, closes
 * unpaid one-time ones whose meetup has passed, ends bank-transfer sponsorships agreed to end,
 * and reminds the board 30, 7 and 0 days before a bank-transfer sponsorship runs out.
 * Logic and tests: src/server/sponsor-daily.ts.
 * Env: DATABASE_URL, RESEND_API_KEY, SLACK_AGENT_BOT_TOKEN, SLACK_SPONSORSHIP_CHANNEL_ID.
 */
import { siteOrigin } from '../../src/server/auth.ts';
import { sponsorStore } from '../../src/server/sponsor.ts';
import { dailyCheck } from '../../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../../src/server/sponsor-route.ts';

export default async () => {
  const env = process.env;
  try {
    const store = sponsorStore(env);
    const result = await dailyCheck(lifecycleDeps(env, store, siteOrigin(env), {}));
    console.log(`[sponsorship-daily] ${JSON.stringify(result)}`);
  } catch (err) {
    console.error('[sponsorship-daily] failed', err);
  }
};

export const config = { schedule: '15 7 * * *' };
