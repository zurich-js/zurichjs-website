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
 *
 * Netlify stops a scheduled function after 30 s. With a `deadline` (deadline.ts) the work is done
 * in this order: everything decided from the sponsor row alone (endings, reminders, Stripe left
 * open by an ended sponsorship), then the unpaid one-time sponsorships, which need their meetups
 * read, starting at a different one each day, then the queued notices. Nothing is started with
 * less than PER_SPONSOR_MS left; what was not started is returned as `deferred` and done by a later
 * run, because each step is decided again from the saved rows (a reminder by its catch-up rule).
 */
import { TransitionError, type EndedReason, type Sponsor } from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import { adminUrl, who, zurichDay } from './sponsor.ts';
import { emailNotice, PER_NOTICE_MS, sendNotices, slackNotice } from './sponsor-notices.ts';
import { closeStripe, leftInStripe, type LifecycleDeps } from './sponsor-lifecycle.ts';
import { recoverPaymentLinks } from './sponsor-stripe.ts';

const SCRIPT = { kind: 'script', id: 'sponsorship-daily' } as const;
const REMIND_DAYS = [30, 7, 0];
export const PER_SPONSOR_MS = 8_000;

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

/** The reminder due `left` days before a bank-transfer sponsorship runs out: the most urgent one reached. */
const reminderDue = (left: number) => [...REMIND_DAYS].sort((a, b) => a - b).find((d) => left <= d);

export interface DailyResult {
  completed: number;
  ended: number;
  closed: number;
  reminded: number;
  /** Ended sponsorships whose Stripe ids this run closed and forgot. */
  stripeClosed: number;
  linksClosed: number;
  notices: { sent: number; failed: number };
  /** Sponsors this run did not get to (an unpaid one-time sponsorship before its meetups were read, too). */
  deferred: string[];
  /** Ended sponsors whose Stripe checkout, payment link or subscription is still open after this run. */
  stripeOpen: string[];
}

export async function dailyCheck(deps: LifecycleDeps & { deadline?: { remaining(): number } }): Promise<DailyResult> {
  const today = zurichDay(deps.now?.() ?? new Date());
  const all = await deps.store.search({ limit: 5000 });
  const out: DailyResult = { completed: 0, ended: 0, closed: 0, reminded: 0, stripeClosed: 0, linksClosed: 0, notices: { sent: 0, failed: 0 }, deferred: [], stripeOpen: [] };
  const room = () => !deps.deadline || deps.deadline.remaining() >= PER_SPONSOR_MS;

  /** A Stripe failure here keeps the ids for the next run, and never stops the other sponsors. */
  const closeLater = (s: Sponsor) =>
    closeStripe(s, deps).then(
      () => true,
      (cause: Error) => {
        (deps.log ?? console.log)(`[sponsorship] daily: Stripe for ${s.id} not closed, tried again tomorrow: ${cause.message}`);
        out.stripeOpen.push(s.id);
        return false;
      },
    );

  const end = async (s: Sponsor, reason: Extract<EndedReason, 'completed' | 'cancelled' | 'withdrawn'>) => {
    let ended: Sponsor;
    try {
      // The email and the note are saved with the end, so they are sent even if this run stops after it.
      const key = `sponsor-ended:${s.id}:${reason}`;
      ended = await deps.store.transition(s.id, {
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
              : `:checkered_flag: ${who(s)} ${reason === 'completed' ? 'is complete (its meetups are over)' : 'has ended as agreed'}. Mark them as a past sponsor in Sanity.`,
          ),
        ],
      });
    } catch (cause) {
      if (cause instanceof TransitionError) return false;
      throw cause;
    }
    await closeLater(ended);
    return true;
  };

  const fromRow: { id: string; run: () => Promise<void> }[] = [];
  const reminders: typeof fromRow = [];
  const leftOpen: typeof fromRow = [];
  const unpaid: Sponsor[] = [];
  for (const s of all) {
    if (s.status === 'ended') {
      if (leftInStripe(s)) leftOpen.push({ id: s.id, run: async () => void ((await closeLater(s)) && out.stripeClosed++) });
    } else if (s.cycle === 'once' && s.status === 'active' && s.paidUntil && s.paidUntil <= today) {
      fromRow.push({ id: s.id, run: async () => void ((await end(s, 'completed')) && out.completed++) });
    } else if (s.cycle === 'once' && s.status === 'pending') {
      unpaid.push(s);
    } else if (s.status === 'ending' && !s.stripeSubscriptionId && s.endsAt && s.endsAt <= today) {
      fromRow.push({ id: s.id, run: async () => void ((await end(s, 'cancelled')) && out.ended++) });
    } else if ((s.status === 'active' || s.status === 'past_due') && s.paymentMode === 'manual' && !s.stripeSubscriptionId && s.cycle !== 'once' && s.paidUntil) {
      const left = daysBetween(today, s.paidUntil);
      const due = reminderDue(left);
      if (due === undefined) continue;
      const when = left > 0 ? `${left} days left` : left === 0 ? 'the paid period ended yesterday' : `the paid period ended ${1 - left} days ago`;
      reminders.push({
        id: s.id,
        run: async () => {
          out.reminded += await deps.store.queueNotices(s.id, [
            slackNotice(
              `sponsor-reminder:${s.id}:${s.paidUntil}:${due}`,
              `:calendar: ${who(s)} pays by bank transfer and is paid through ${longDate(lastDay(s.paidUntil!))} (${when}). Record the next payment or agree the end: ${adminUrl(deps.origin, s.id)}`,
            ),
          ]);
        },
      });
    }
  }

  const first = unpaid.length ? dayNumber(today) % unpaid.length : 0;
  const unpaidWork = [...unpaid.slice(first), ...unpaid.slice(0, first)].map((s) => ({
    id: s.id,
    run: async () => {
      const meetups = await deps.store.meetups(s.id);
      if (!meetups.some((m) => m.date < today)) return;
      if (!room()) return void out.deferred.push(s.id);
      if (await end(s, 'withdrawn')) out.closed++;
    },
  }));

  const work = [...fromRow, ...reminders, ...leftOpen, ...unpaidWork];
  for (const [i, w] of work.entries()) {
    if (!room()) {
      out.deferred.push(...work.slice(i).map((x) => x.id));
      break;
    }
    await w.run();
  }
  // No notice is claimed without time to send one; the rest wait for the next run.
  if (!deps.deadline || deps.deadline.remaining() >= PER_NOTICE_MS) out.notices = await sendNotices(deps, { limit: 200, budget: deps.deadline });
  if (room()) out.linksClosed = (await recoverPaymentLinks(deps.store, { ...deps.stripe, log: deps.log }, { canStart: room })).closed;
  return out;
}
