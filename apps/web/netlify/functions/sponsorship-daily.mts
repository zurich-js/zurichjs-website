/**
 * Once a day (07:15 UTC): completes one-time sponsorships after their last meetup, closes
 * unpaid one-time ones whose meetup has passed, ends bank-transfer sponsorships agreed to end,
 * and reminds the board 30, 7 and 0 days before a bank-transfer sponsorship runs out.
 * Logic and tests: src/server/sponsor-daily.ts.
 * Env: DATABASE_URL, RESEND_API_KEY, SLACK_AGENT_BOT_TOKEN, SLACK_SPONSORSHIP_CHANNEL_ID.
 */
import { holdIneligibleRaffles, raffleStore } from '../../src/server/raffle.ts';
import { sanityMeetups } from '../../src/server/sponsor-coverage.ts';
import { deliverRaffleMail } from '../../src/server/raffle-mail.ts';
import { siteOrigin } from '../../src/server/auth.ts';
import { sponsorStore } from '../../src/server/sponsor.ts';
import { dailyCheck } from '../../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../../src/server/sponsor-route.ts';

export default async () => {
  const env = process.env;
  try {
    const store = sponsorStore(env);
    const result = await dailyCheck(lifecycleDeps(env, store, siteOrigin(env), {}));
    const raffles = raffleStore(env);
    for (const id of await raffles.dueForErasure(new Date())) await raffles.eraseEntries(id, { kind: 'script', id: 'retention' });
    await deliverRaffleMail(env, raffleStore(env), store, siteOrigin(env));
    await holdIneligibleRaffles(raffleStore(env), store, sanityMeetups(env), new Date());
    console.log(`[sponsorship-daily] ${JSON.stringify(result)}`);
  } catch (err) {
    console.error('[sponsorship-daily] failed', err);
  }
};

export const config = { schedule: '15 7 * * *' };
