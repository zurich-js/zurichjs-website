/**
 * The daily sponsorship check (netlify/functions/sponsorship-daily.mts), in Zurich days:
 *
 *   - a one-time sponsorship ends (completed) the day after its last meetup; the sponsor is thanked
 *   - a one-time sponsorship nobody paid is closed (withdrawn) once one of its meetups has passed,
 *     and its payment page is switched off
 *   - a sponsorship paid by bank transfer that was agreed to end, ends on its last day
 *   - the board is reminded 30 and 7 days before, and on the day, a sponsorship paid by bank
 *     transfer runs out (nothing changes by itself: a person records the payment or agrees the end)
 *   - an ended sponsorship that still points at Stripe (a close that failed) is closed again
 *
 * Card sponsorships need nothing here: Stripe renews, retries and ends them (webhook).
 */
import { TransitionError, type EndedReason, type Sponsor } from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import { adminUrl, emailSponsor, note, who, zurichDay } from './sponsor.ts';
import { closeStripe, leftInStripe, type LifecycleDeps } from './sponsor-lifecycle.ts';

const SCRIPT = { kind: 'script', id: 'sponsorship-daily' } as const;
const REMIND_DAYS = [30, 7, 0];

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export async function dailyCheck(deps: LifecycleDeps): Promise<{ completed: number; ended: number; closed: number; reminded: number; stripeClosed: number }> {
  const today = zurichDay(deps.now?.() ?? new Date());
  const all = await deps.store.search({ limit: 5000 });
  const out = { completed: 0, ended: 0, closed: 0, reminded: 0, stripeClosed: 0 };

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
      const ended = await deps.store.transition(s.id, { from: s.status, to: 'ended', actor: SCRIPT, reason });
      await closeLater(ended);
      if (reason !== 'withdrawn') await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...deps, key: `sponsor-ended:${s.id}:${reason}` });
      await note(
        reason === 'withdrawn'
          ? `:hourglass: ${who(s)} was never paid and a meetup it covered is over; the sponsorship is closed. ${adminUrl(deps.origin, s.id)}`
          : `:checkered_flag: ${who(s)} ${reason === 'completed' ? 'is complete (its meetups are over)' : 'has ended as agreed'}. Mark them as a past sponsor in Sanity.`,
        deps,
      );
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
      if (REMIND_DAYS.includes(left)) {
        await note(
          `:calendar: ${who(s)} pays by bank transfer and is paid through ${longDate(lastDay(s.paidUntil))} (${left ? `${left} days left` : 'the paid period ended yesterday'}). Record the next payment or agree the end: ${adminUrl(deps.origin, s.id)}`,
          deps,
        );
        out.reminded++;
      }
    }
  }
  return out;
}
