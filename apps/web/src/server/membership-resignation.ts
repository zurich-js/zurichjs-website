/**
 * Confirming a resignation (bylaws Art. 5), shared by the Slack button and the
 * admin area. The board cannot refuse a resignation; it only waits while dues
 * are open. With a Stripe subscription the membership ends with the paid
 * period (cancel at period end; the webhook then marks it ended); paid by hand,
 * it ends now. The member gets the confirmation email.
 */
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { TransitionError, type Member, type MemberStore } from '@zurichjs/membership';
import { lastDay, longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipProps } from './membership.ts';
import { cancelAtPeriodEnd, openInvoices, type StripeDeps } from './membership-stripe.ts';

export type ConfirmResult =
  | { result: 'confirmed'; member: Member; lastPaidDay: string | null; emailFailed: boolean }
  | { result: 'not_found' }
  | { result: 'not_resigning'; member: Member }
  | { result: 'open_dues'; member: Member; dues: number };

export interface ConfirmDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  stripe?: StripeDeps;
  fetch?: typeof fetch;
  log?: (m: string) => void;
  /** Makes the email idempotent per confirmation (e.g. the Slack message ts). */
  reference: string;
}

/** `by`: who confirmed (a Slack user id, or "admin" for the admin area). */
export async function confirmResignation(memberId: string, by: string, deps: ConfirmDeps): Promise<ConfirmResult> {
  const { env, store } = deps;
  const log = deps.log ?? console.log;
  const member = await store.get(memberId);
  if (!member) return { result: 'not_found' };
  if (member.status !== 'resigning') return { result: 'not_resigning', member };
  const stripe: StripeDeps = deps.stripe ?? { env, fetch: deps.fetch };
  const dues = await openInvoices(member, stripe);
  if (dues > 0) return { result: 'open_dues', member, dues };
  let end: string | null = member.paidUntil;
  if (member.stripeSubscriptionId) end = (await cancelAtPeriodEnd(member.stripeSubscriptionId, stripe)).periodEnd ?? end;
  else {
    // Paid by hand: no subscription to stop; the membership ends now.
    try {
      await store.transition(member.id, { from: 'resigning', to: 'ended', actor: { kind: 'board', id: by }, reason: 'resigned', payload: { reference: deps.reference } });
    } catch (cause) {
      if (!(cause instanceof TransitionError)) throw cause;
    }
  }
  const lastPaidDay = end ? longDate(lastDay(end)) : null;
  const email = renderEmail('resignation-confirmed', { ...membershipProps(member, deps.origin), lastDay: lastPaidDay });
  let emailFailed = false;
  await sendMemberEmail(env, { to: member.email, ...email }, { idempotencyKey: `member-resignation-confirmed:${member.id}:${deps.reference}`, log, fetch: deps.fetch }).catch(
    (e: Error) => {
      log(`[membership] resignation email to ${member.id} failed: ${e.message}`);
      emailFailed = true;
    },
  );
  return { result: 'confirmed', member, lastPaidDay, emailFailed };
}
