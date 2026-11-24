/**
 * The daily sponsorship check (netlify/functions/sponsorship-daily.mts), in Zurich days:
 *
 *   - a one-time sponsorship ends (completed) the day after its last meetup; the sponsor is thanked
 *   - a one-time sponsorship nobody paid is closed (withdrawn) once one of its meetups has passed,
 *     and its payment page is switched off
 *   - a sponsorship paid by bank transfer that was agreed to end, ends on its last day
 *   - the board is reminded 30 and 7 days before, and on the day, a sponsorship paid by bank
 *     transfer runs out (nothing changes by itself: a person records the payment or agrees the end)
 *
 * Card sponsorships need nothing here: Stripe renews, retries and ends them (webhook).
 *
 * Netlify stops a scheduled function after 30 s. With a `deadline` (deadline.ts) the work is done
 * in this order: everything decided from the sponsor row alone (endings, then reminders), then the
 * unpaid one-time sponsorships, which need their meetups read. Those start at a different one each
 * day, so a slow first few cannot hold back the same others every day. Nothing is started with
 * less than PER_SPONSOR_MS left; what was not started is returned as `deferred` and is looked at
 * again on the next daily run, from scratch (a reminder whose day has passed is not sent late).
 * An ending whose Stripe close the budget stopped keeps its Stripe ids and is returned in
 * `stripeOpen`: its payment page may still be payable.
 */
import { TransitionError, type EndedReason, type Sponsor } from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import { adminUrl, emailSponsor, note, who, zurichDay } from './sponsor.ts';
import { DeadlineExceeded, type Deadline } from './deadline.ts';
import { closeStripe, type LifecycleDeps } from './sponsor-lifecycle.ts';

const SCRIPT = { kind: 'script', id: 'sponsorship-daily' } as const;
const REMIND_DAYS = [30, 7, 0];
/** Budget left below which no sponsor's work is started: an ending makes a transition, Stripe closes and a Slack note. */
export const PER_SPONSOR_MS = 8_000;

const dayNumber = (day: string) => Math.floor(Date.parse(`${day}T12:00:00Z`) / 86_400_000);
const daysBetween = (from: string, to: string) => dayNumber(to) - dayNumber(from);

export interface DailyResult {
  completed: number;
  ended: number;
  closed: number;
  reminded: number;
  /** Sponsors this run did not get to (an unpaid one-time sponsorship before its meetups were read, too). */
  deferred: string[];
  /** Ended sponsors whose Stripe checkout or payment link the budget left open. */
  stripeOpen: string[];
}

export async function dailyCheck(deps: LifecycleDeps & { deadline?: Deadline }): Promise<DailyResult> {
  const today = zurichDay(deps.now?.() ?? new Date());
  const all = await deps.store.search({ limit: 5000 });
  const out: DailyResult = { completed: 0, ended: 0, closed: 0, reminded: 0, deferred: [], stripeOpen: [] };
  const room = () => !deps.deadline || deps.deadline.remaining() >= PER_SPONSOR_MS;

  const end = async (s: Sponsor, reason: Extract<EndedReason, 'completed' | 'cancelled' | 'withdrawn'>) => {
    let ended: Sponsor;
    try {
      ended = await deps.store.transition(s.id, { from: s.status, to: 'ended', actor: SCRIPT, reason });
    } catch (cause) {
      if (cause instanceof TransitionError) return false;
      throw cause;
    }
    let stillOpen = false;
    try {
      await closeStripe(s, deps);
    } catch (cause) {
      if (!(cause instanceof DeadlineExceeded)) throw cause;
      stillOpen = true;
      out.stripeOpen.push(s.id);
    }
    const open = stillOpen ? ' Its Stripe payment page could not be switched off in time: switch it off in Stripe.' : '';
    if (reason !== 'withdrawn') await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...deps, key: `sponsor-ended:${s.id}:${reason}` });
    await note(
      reason === 'withdrawn'
        ? `:hourglass: ${who(s)} was never paid and a meetup it covered is over; the sponsorship is closed.${open} ${adminUrl(deps.origin, s.id)}`
        : `:checkered_flag: ${who(s)} ${reason === 'completed' ? 'is complete (its meetups are over)' : 'has ended as agreed'}. Mark them as a past sponsor in Sanity.${open}`,
      deps,
    );
    return true;
  };

  const fromRow: { id: string; run: () => Promise<void> }[] = [];
  const reminders: typeof fromRow = [];
  const unpaid: Sponsor[] = [];
  for (const s of all) {
    if (s.cycle === 'once' && s.status === 'active' && s.paidUntil && s.paidUntil <= today) {
      fromRow.push({ id: s.id, run: async () => void ((await end(s, 'completed')) && out.completed++) });
    } else if (s.cycle === 'once' && s.status === 'pending') {
      unpaid.push(s);
    } else if (s.status === 'ending' && !s.stripeSubscriptionId && s.endsAt && s.endsAt <= today) {
      fromRow.push({ id: s.id, run: async () => void ((await end(s, 'cancelled')) && out.ended++) });
    } else if ((s.status === 'active' || s.status === 'past_due') && s.paymentMode === 'manual' && !s.stripeSubscriptionId && s.cycle !== 'once' && s.paidUntil) {
      const left = daysBetween(today, s.paidUntil);
      if (REMIND_DAYS.includes(left))
        reminders.push({
          id: s.id,
          run: async () => {
            await note(
              `:calendar: ${who(s)} pays by bank transfer and is paid through ${longDate(lastDay(s.paidUntil!))} (${left ? `${left} days left` : 'the paid period ended yesterday'}). Record the next payment or agree the end: ${adminUrl(deps.origin, s.id)}`,
              deps,
            );
            out.reminded++;
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

  const work = [...fromRow, ...reminders, ...unpaidWork];
  for (const [i, w] of work.entries()) {
    if (!room()) {
      out.deferred.push(...work.slice(i).map((x) => x.id));
      break;
    }
    await w.run();
  }
  return out;
}
