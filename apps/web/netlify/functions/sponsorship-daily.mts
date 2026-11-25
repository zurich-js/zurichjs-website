/**
 * Once a day (07:15 UTC): completes one-time sponsorships after their last meetup, closes
 * unpaid one-time ones whose meetup has passed, ends bank-transfer sponsorships agreed to end,
 * reminds the board 30, 7 and 0 days before a bank-transfer sponsorship runs out, closes what an
 * ended sponsorship left open in Stripe and sends queued notices. Logic and tests:
 * src/server/sponsor-daily.ts. Every outbound call shares one 25 s budget (deadline.ts). Sponsors
 * not reached are logged as deferred, and ended ones whose Stripe page stayed open as stripeOpen;
 * both are done again by the next run.
 * Env: DATABASE_URL, RESEND_API_KEY, SLACK_AGENT_BOT_TOKEN, SLACK_SPONSORSHIP_CHANNEL_ID.
 */
import { holdIneligibleRaffles, raffleStore } from '../../src/server/raffle.ts';
import { sanityMeetups } from '../../src/server/sponsor-coverage.ts';
import { deliverRaffleMail } from '../../src/server/raffle-mail.ts';
import { siteOrigin } from '../../src/server/auth.ts';
import { deadline, SCHEDULED_BUDGET_MS } from '../../src/server/deadline.ts';
import { sponsorStore } from '../../src/server/sponsor.ts';
import { dailyCheck } from '../../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../../src/server/sponsor-route.ts';

export default async () => {
  const env = process.env;
  try {
    const budget = deadline(SCHEDULED_BUDGET_MS);
    const store = sponsorStore(env);
    const result = await dailyCheck({ ...lifecycleDeps(env, store, siteOrigin(env), { fetch: budget.fetch() }), deadline: budget });
    const raffles = raffleStore(env);
    for (const id of await raffles.dueForErasure(new Date())) {
      if (budget.remaining() <= 0) break;
      await raffles.eraseEntries(id, { kind: 'script', id: 'retention' });
    }
    if (budget.remaining() > 0) await deliverRaffleMail(env, raffles, store, siteOrigin(env), { fetch: budget.fetch() });
    if (budget.remaining() > 0) await holdIneligibleRaffles(raffles, store, sanityMeetups(env, budget.fetch()), new Date());
    console.log(`[sponsorship-daily] ${JSON.stringify(result)}`);
    if (result.deferred.length)
      console.error(`[sponsorship-daily] time budget reached; ${result.deferred.length} sponsorships left for the next run: ${result.deferred.join(', ')}`);
    if (result.stripeOpen.length) console.error(`[sponsorship-daily] ended, but Stripe is not closed yet (tried again on the next run): ${result.stripeOpen.join(', ')}`);
  } catch (err) {
    console.error('[sponsorship-daily] failed', err);
  }
};

export const config = { schedule: '15 7 * * *' };
