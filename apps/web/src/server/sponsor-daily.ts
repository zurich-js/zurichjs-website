/**
 * The daily sponsorship check (netlify/functions/sponsorship-daily.mts), in Zurich days:
 *
 *   - a one-time sponsorship ends (completed) the day after its last meetup; the sponsor is thanked
 *   - a one-time sponsorship nobody paid is closed (withdrawn) once one of its meetups has passed,
 *     and its payment page is switched off
 *   - a sponsorship paid by bank transfer that was agreed to end, ends on its last day
 *   - the board is reminded 30 and 7 days before, and on the day, a sponsorship paid by bank
 *     transfer runs out (nothing changes by itself: a person records the payment or agrees the end).
 *     A day the check did not reach is caught up: the most urgent reminder not sent yet goes out
 *     once, never one per missed day
 *   - an ended sponsorship that still points at Stripe (a close that failed) is closed again
 *   - every notice still queued (an email or Slack note a request could not send) is sent
 *   - a payment link a request left behind (its answer or the next write lost, or a second
 *     request saved its own) is switched off, whatever the sponsorship's status
 *
 * Card sponsorships need nothing here: Stripe renews, retries and ends them (webhook).
 */
import { TransitionError, type EndedReason, type Sponsor } from '@zurichjs/sponsorship';
import { queueCoverage, queueRebuild } from './sponsor-rebuild.ts';
import { lastDay, longDate } from './dates.ts';
import { adminUrl, who, zurichDay } from './sponsor.ts';
import { emailNotice, sendNotices, slackNotice } from './sponsor-notices.ts';
import { closeStripe, type LifecycleDeps } from './sponsor-lifecycle.ts';
import { leftInStripe, recoverPaymentLinks } from './sponsor-stripe.ts';

const SCRIPT = { kind: 'script', id: 'sponsorship-daily' } as const;
const REMIND_DAYS = [30, 7, 0];

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** The reminder due `left` days before a bank-transfer sponsorship runs out: the most urgent one reached. */
const reminderDue = (left: number) => [...REMIND_DAYS].sort((a, b) => a - b).find((d) => left <= d);

/**
 * `deadline` is the scheduled function's time budget (any `{ remaining() }`, such as deadline.ts):
 * notices still queued when it runs low are left for the next run.
 */
export async function dailyCheck(deps: LifecycleDeps & { deadline?: { remaining(): number }; queueRebuild?: typeof queueRebuild }): Promise<{
  completed: number;
  ended: number;
  closed: number;
  reminded: number;
  stripeClosed: number;
  linksClosed: number;
  notices: { sent: number; failed: number; waiting: number; unrecorded: number };
}> {
  const today = zurichDay(deps.now?.() ?? new Date());
  const all = await deps.store.search({ limit: 5000 });
  const out = { completed: 0, ended: 0, closed: 0, reminded: 0, stripeClosed: 0, linksClosed: 0, notices: { sent: 0, failed: 0, waiting: 0, unrecorded: 0 } };

  /** A Stripe failure here is retried tomorrow (the ids are kept), and never stops the other sponsors. */
  const closeLater = (s: Sponsor) =>
    closeStripe(s, deps).then(
      () => true,
      (cause: Error) => {
        (deps.log ?? console.log)(`[sponsorship] daily: Stripe for ${s.id} not closed, tried again tomorrow: ${cause.message}`);
        return false;
      },
    );

  const end = async (s: Sponsor, reason: Extract<EndedReason, 'completed' | 'cancelled' | 'withdrawn'>) => {
    try {
      // The email and the note are saved with the end, so they are sent even if this run stops after it.
      const key = `sponsor-ended:${s.id}:${reason}`;
      const ended = await deps.store.transition(s.id, {
        from: s.status,
        to: 'ended',
        actor: SCRIPT,
        reason,
        notices: [
          ...(reason !== 'withdrawn' ? [emailNotice(key, 'sponsor-ended', { reason })] : []),
          slackNotice(
            `${key}:slack`,
            reason === 'withdrawn'
              ? `:hourglass: ${who(s)} was never paid and a meetup it covered is over; the sponsorship is closed. ${adminUrl(deps.origin, s.id)}`
              : `:checkered_flag: ${who(s)} ${reason === 'completed' ? 'is complete (its meetups are over)' : 'has ended as agreed'}. The site lists them as a past sponsor from the next build.`,
          ),
        ],
      });
      await closeLater(ended);
      return true;
    } catch (cause) {
      if (cause instanceof TransitionError) return false;
      throw cause;
    }
  };

  for (const s of all) {
    if (s.status === 'ended') {
      if (leftInStripe(s) && (await closeLater(s))) out.stripeClosed++;
    } else if (s.cycle === 'once' && s.status === 'active' && s.paidUntil && s.paidUntil <= today) {
      if (await end(s, 'completed')) out.completed++;
    } else if (s.cycle === 'once' && s.status === 'pending') {
      const meetups = await deps.store.meetups(s.id);
      if (meetups.some((m) => m.date < today) && (await end(s, 'withdrawn'))) out.closed++;
    } else if (s.status === 'ending' && !s.stripeSubscriptionId && s.endsAt && s.endsAt <= today) {
      if (await end(s, 'cancelled')) out.ended++;
    } else if ((s.status === 'active' || s.status === 'past_due') && s.paymentMode === 'manual' && !s.stripeSubscriptionId && s.cycle !== 'once' && s.paidUntil) {
      const left = daysBetween(today, s.paidUntil);
      const due = reminderDue(left);
      if (due === undefined) continue;
      const when = left > 0 ? `${left} days left` : left === 0 ? 'the paid period ended yesterday' : `the paid period ended ${1 - left} days ago`;
      out.reminded += await deps.store.queueNotices(s.id, [
        slackNotice(
          `sponsor-reminder:${s.id}:${s.paidUntil}:${due}`,
          `:calendar: ${who(s)} pays by bank transfer and is paid through ${longDate(lastDay(s.paidUntil))} (${when}). Record the next payment or agree the end: ${adminUrl(deps.origin, s.id)}`,
        ),
      ]);
    }
  }
  out.linksClosed = (await recoverPaymentLinks(deps.store, { ...deps.stripe, log: deps.log }, { canStart: () => !deps.deadline || deps.deadline.remaining() > 16_000 })).closed;
  out.notices = await sendNotices(deps, { limit: 200, budget: deps.deadline });
  const hasBudget = () => !deps.deadline || deps.deadline.remaining() > 16_000;
  if (hasBudget()) {
    const versions = await deps.store.pendingMeetupRebuilds();
    if (hasBudget()) await queueCoverage(deps.store, deps.queueRebuild ?? queueRebuild, versions);
  }
  return out;
}
