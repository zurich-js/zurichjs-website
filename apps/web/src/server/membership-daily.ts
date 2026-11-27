import type { MemberStore } from '@zurichjs/membership';
import { lastDay, longDate, zurichDay } from './dates.ts';
import { siteOrigin } from './auth.ts';
import type { Env } from './http.ts';
import { deliverMembershipNotices } from './membership-delivery.ts';
import { who, type MembershipSlack } from './membership-slack.ts';

export interface DailyDeps {
  env: Env;
  store: MemberStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: (m: string) => void;
  now?: () => Date;
}

export async function membershipDailyCheck(deps: DailyDeps): Promise<{ ended: number }> {
  const today = zurichDay(deps.now?.() ?? new Date());
  let ended = 0;
  for (;;) {
    const due = await deps.store.dueResignations(today);
    if (!due.length) break;
    for (const candidate of due) {
      const changed = await deps.store.transaction(async (tx) => {
        const m = await tx.get(candidate.id);
        if (m?.status !== 'resigning' || !m.resignationConfirmedAt || m.paymentMode !== 'manual' || !m.paidUntil || m.paidUntil > today) return false;
        await tx.transition(m.id, { from: 'resigning', to: 'ended', actor: { kind: 'script', id: 'membership-daily' }, reason: 'resigned' });
        const key = `resignation-end:${m.id}:${m.resignedAt}`;
        await tx.enqueue(m.id, key, key, {
          kind: 'board',
          text: `:checkered_flag: Resignation took effect: ${who(m)}. Their paid term ended on ${longDate(lastDay(m.paidUntil))}.`,
        });
        return true;
      });
      if (changed) ended++;
    }
  }
  const errors: unknown[] = [];
  for (const op of await deps.store.pendingOperations()) {
    try {
      await deliverMembershipNotices(op, { ...deps, origin: siteOrigin(deps.env) });
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Pending membership deliveries need another attempt.');
  return { ended };
}
