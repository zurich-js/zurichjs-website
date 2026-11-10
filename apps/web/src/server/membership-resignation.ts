/**
 * Resignations (bylaws Art. 5), shared by the account page, the Slack button and the
 * admin area. A resignation waits for the board, then is confirmed; until the
 * membership ends the member (or the board for them) can undo it (owner, 10th November 2026).
 *
 *   confirm   The board cannot refuse; it only waits while dues are open. With a Stripe
 *             subscription the membership ends with the paid period (cancel at period
 *             end; the webhook then marks it ended); paid by hand, it ends now.
 *   undo      Back to the status the member had before resigning. If the board had
 *             confirmed, the subscription renews again (the scheduled end is taken back).
 *
 * The member gets an email for each step. The organisers get the Slack note and an
 * email to hello@zurichjs.com (FORMS_TO) for a resignation and for an undo.
 */
import { renderEmail } from '@zurichjs/emails';
import { sendEmail, sendMemberEmail } from '@zurichjs/integrations';
import { levelInfo, TransitionError, UNDO_TARGETS, type Actor, type Member, type MemberStore, type Status } from '@zurichjs/membership';
import { lastDay, longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipProps } from './membership.ts';
import { notify, who, type MembershipSlack } from './membership-slack.ts';
import { cancelAtPeriodEnd, openInvoices, resumeSubscription, type StripeDeps } from './membership-stripe.ts';

type Log = (m: string) => void;

export type ConfirmResult =
  | { result: 'confirmed'; member: Member; lastPaidDay: string | null; emailFailed: boolean }
  | { result: 'already_confirmed'; member: Member }
  | { result: 'not_found' }
  | { result: 'not_resigning'; member: Member }
  | { result: 'open_dues'; member: Member; dues: number };

export interface ConfirmDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  stripe?: StripeDeps;
  fetch?: typeof fetch;
  log?: Log;
  /** Makes the email idempotent per confirmation (e.g. the Slack message ts). */
  reference: string;
}

/** Names one resignation (for Stripe idempotency keys): a new resignation after an undo gets a new one. */
const resignationRef = (m: Member) => m.resignedAt ?? m.updatedAt;

/** The last day of the paid period, as written ("9th November 2027"), or null. */
const lastPaidDayOf = (end: string | null) => (end ? longDate(lastDay(end)) : null);

/** `by`: who confirmed (a Slack user id, or "admin" for the admin area). */
export async function confirmResignation(memberId: string, by: string, deps: ConfirmDeps): Promise<ConfirmResult> {
  const { env, store } = deps;
  const log = deps.log ?? console.log;
  const member = await store.get(memberId);
  if (!member) return { result: 'not_found' };
  if (member.status !== 'resigning') return { result: 'not_resigning', member };
  if (member.resignationConfirmedAt) return { result: 'already_confirmed', member };
  const stripe: StripeDeps = deps.stripe ?? { env, fetch: deps.fetch };
  const dues = await openInvoices(member, stripe);
  if (dues > 0) return { result: 'open_dues', member, dues };
  const actor: Actor = { kind: 'board', id: by };
  let end: string | null = member.paidUntil;
  // Stripe first: if recording fails because the member undid it meanwhile, take the cancel back.
  if (member.stripeSubscriptionId) end = (await cancelAtPeriodEnd(member.stripeSubscriptionId, resignationRef(member), stripe)).periodEnd ?? end;
  let confirmed: Member;
  try {
    confirmed = await store.confirmResignation(member.id, actor, { reference: deps.reference });
  } catch (cause) {
    if (!(cause instanceof TransitionError)) throw cause;
    if (member.stripeSubscriptionId) await resumeSubscription(member.stripeSubscriptionId, resignationRef(member), stripe);
    return { result: 'not_resigning', member: (await store.get(member.id)) ?? member };
  }
  if (!confirmed.stripeSubscriptionId) {
    // Paid by hand: no subscription to stop; the membership ends now.
    try {
      await store.transition(member.id, { from: 'resigning', to: 'ended', actor, reason: 'resigned', payload: { reference: deps.reference } });
    } catch (cause) {
      if (!(cause instanceof TransitionError)) throw cause;
    }
  }
  const lastPaidDay = lastPaidDayOf(end);
  const email = renderEmail('resignation-confirmed', { ...membershipProps(member, deps.origin), lastDay: lastPaidDay });
  let emailFailed = false;
  await sendMemberEmail(env, { to: member.email, ...email }, { idempotencyKey: `member-resignation-confirmed:${member.id}:${deps.reference}`, log, fetch: deps.fetch }).catch(
    (e: Error) => {
      log(`[membership] resignation email to ${member.id} failed: ${e.message}`);
      emailFailed = true;
    },
  );
  return { result: 'confirmed', member: confirmed, lastPaidDay, emailFailed };
}

export type WithdrawResult = { result: 'withdrawn'; member: Member; emailFailed: boolean } | { result: 'not_found' } | { result: 'not_resigning'; member: Member };

export interface WithdrawDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  stripe?: StripeDeps;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: Log;
}

/**
 * Undoes a resignation while the membership still runs. The member goes back to the
 * status they had before resigning (behind on payment only if dues are still open).
 */
export async function withdrawResignation(memberId: string, actor: Actor, deps: WithdrawDeps): Promise<WithdrawResult> {
  const { env, store } = deps;
  const log = deps.log ?? console.log;
  const member = await store.get(memberId);
  if (!member) return { result: 'not_found' };
  if (member.status !== 'resigning') return { result: 'not_resigning', member };
  const stripe: StripeDeps = deps.stripe ?? { env, fetch: deps.fetch };

  const before = (await store.events(member.id)).filter((e) => e.type === 'status_changed' && e.toStatus === 'resigning').at(-1)?.fromStatus;
  let to: Status = before && (UNDO_TARGETS as readonly Status[]).includes(before) ? before : 'active';
  if (to === 'past_due' && (await openInvoices(member, stripe)) === 0) to = 'active';

  // Stripe first: a confirmed resignation scheduled the end of the subscription.
  if (member.resignationConfirmedAt && member.stripeSubscriptionId) await resumeSubscription(member.stripeSubscriptionId, resignationRef(member), stripe);
  let restored: Member;
  try {
    restored = await store.transition(member.id, { from: 'resigning', to, actor, payload: { undo: true, wasConfirmed: !!member.resignationConfirmedAt } });
  } catch (cause) {
    if (!(cause instanceof TransitionError)) throw cause;
    return { result: 'not_resigning', member: (await store.get(member.id)) ?? member };
  }

  const byBoard = actor.kind === 'board';
  await notify(`:leftwards_arrow_with_hook: Resignation undone${byBoard ? ' by the board' : ' by the member'}: ${who(restored)}. The membership continues.`, {
    env,
    slack: deps.slack,
    fetch: deps.fetch,
    log,
  });
  await emailBoard(restored, { kind: 'withdrawn', byBoard }, deps);
  const email = renderEmail('resignation-withdrawn', membershipProps(restored, deps.origin));
  let emailFailed = false;
  await sendMemberEmail(
    env,
    { to: restored.email, ...email },
    { idempotencyKey: `member-resignation-withdrawn:${restored.id}:${resignationRef(member)}`, log, fetch: deps.fetch },
  ).catch((e: Error) => {
    log(`[membership] undo email to ${restored.id} failed: ${e.message}`);
    emailFailed = true;
  });
  return { result: 'withdrawn', member: restored, emailFailed };
}

/**
 * The organisers' email about a resignation or an undo (to hello@zurichjs.com, as
 * FORMS_TO), next to the Slack note. Replies go to the member. Never throws.
 */
export async function emailBoard(
  m: Member,
  what: { kind: 'resigned'; dues: number } | { kind: 'withdrawn'; byBoard: boolean },
  deps: { env: Env; origin: string; fetch?: typeof fetch; log?: Log },
): Promise<void> {
  const log = deps.log ?? console.log;
  const admin = new URL('/membership/admin', deps.origin).toString();
  const subject = what.kind === 'resigned' ? `Resignation from ${m.name}` : `Resignation undone: ${m.name}`;
  const lines = [
    what.kind === 'resigned'
      ? `${m.name} resigned on their account page (bylaws Art. 5). The request is with the board; the member was told we typically get back to them within 72 hours.`
      : `${m.name}'s resignation was undone ${what.byBoard ? 'by the board' : 'by the member'}. The membership continues${m.stripeSubscriptionId ? ' and renews as before' : ''}.`,
    '',
    `Name: ${m.name}`,
    ...(m.organisationName ? [`Organisation: ${m.organisationName}`] : []),
    `Email: ${m.email}`,
    `Membership: ${levelInfo(m.level).name}, ${m.cycle}`,
    ...(m.paidUntil ? [`Paid until: ${lastPaidDayOf(m.paidUntil)}`] : []),
    ...(what.kind === 'resigned'
      ? [
          what.dues > 0
            ? `Open invoices: ${what.dues}. Under the bylaws the resignation takes effect once they are paid.`
            : 'Open invoices: none. Confirming ends the membership with the paid period.',
          '',
          `Confirm it with the button in Slack, or in the admin area: ${admin}`,
        ]
      : ['', `Admin area: ${admin}`]),
  ];
  await sendEmail(deps.env, subject, lines.join('\n'), m.email, log, {
    fetch: deps.fetch,
    idempotencyKey: `board-${what.kind}:${m.id}:${resignationRef(m)}`,
  }).catch((e: Error) => log(`[membership] board email about ${m.id} failed: ${e.message}`));
}
