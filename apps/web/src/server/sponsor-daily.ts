/**
 * The daily sponsorship check (netlify/functions/sponsorship-daily.mts):
 *
 *   - a one-meetup sponsorship ends (completed) the day after its meetup; the sponsor is thanked
 *   - a sponsorship paid directly that was agreed to end, ends on its last day
 *   - proposals nobody answered expire after PROPOSAL_DAYS
 *   - the board is reminded 30 and 7 days before, and on the day, a directly paid sponsorship
 *     runs out (nothing changes by itself: a person records the payment or agrees the end)
 *
 * Stripe sponsorships need nothing here: Stripe renews, retries and ends them (webhook).
 */
import { TransitionError, type Sponsor } from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import { adminUrl, emailSponsor, note, who } from './sponsor.ts';
import { expireProposals, type LifecycleDeps } from './sponsor-lifecycle.ts';

const SCRIPT = { kind: 'script', id: 'sponsorship-daily' } as const;
const REMIND_DAYS = [30, 7, 0];

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export async function dailyCheck(deps: LifecycleDeps): Promise<{ completed: number; ended: number; expired: number; reminded: number }> {
  const today = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const all = await deps.store.search({ limit: 5000 });
  const out = { completed: 0, ended: 0, expired: 0, reminded: 0 };

  const end = async (s: Sponsor, reason: 'completed' | 'cancelled') => {
    try {
      const ended = await deps.store.transition(s.id, { from: s.status, to: 'ended', actor: SCRIPT, reason });
      await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...deps, key: `sponsor-ended:${s.id}:${reason}` });
      await note(`:checkered_flag: ${who(s)} ${reason === 'completed' ? 'is complete (the meetup is over)' : 'has ended as agreed'}. Mark them as a past sponsor in Sanity.`, deps);
      return true;
    } catch (cause) {
      if (cause instanceof TransitionError) return false;
      throw cause;
    }
  };

  for (const s of all) {
    if (s.cycle === 'once' && s.status === 'active' && s.paidUntil && s.paidUntil <= today) {
      if (await end(s, 'completed')) out.completed++;
    } else if (s.status === 'ending' && !s.stripeSubscriptionId && s.endsAt && s.endsAt <= today) {
      if (await end(s, 'cancelled')) out.ended++;
    } else if (s.status === 'active' && s.paymentMode === 'manual' && s.cycle !== 'once' && s.paidUntil) {
      const left = daysBetween(today, s.paidUntil);
      if (REMIND_DAYS.includes(left)) {
        await note(
          `:calendar: ${who(s)} is paid directly through ${longDate(lastDay(s.paidUntil))} (${left ? `${left} days left` : 'that was yesterday'}). Record the next payment or agree the end: ${adminUrl(deps.origin, s.id)}`,
          deps,
        );
        out.reminded++;
      }
    }
  }
  out.expired = await expireProposals(
    all.filter((s) => s.status !== 'ended'),
    deps,
  );
  return out;
}
