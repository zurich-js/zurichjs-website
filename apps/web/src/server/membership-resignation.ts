/**
 * Resignations (bylaws Art. 5), shared by the account page, the Slack button and the
 * admin area. A resignation waits for the board, then is confirmed; until the
 * membership ends the member (or the board for them) can undo it (owner, 10th November 2026).
 *
 *   resign    Renewal stops at once (cancel at period end, owner, 11th November 2026), so
 *             nothing is charged after a resignation even while it waits for the board.
 *   confirm   The board cannot refuse; it only waits while dues are open. With a Stripe
 *             subscription the membership ends with the paid period (the webhook then
 *             marks it ended; the cancel is repeated, idempotently); paid manually (cash/bank), it ends now.
 *   undo      Back to the status the member had before resigning; the subscription
 *             renews again (the scheduled end is taken back).
 *
 * The member gets an email for each step. The organisers get the Slack note and an
 * email to hello@zurichjs.com (FORMS_TO) for a resignation and for an undo.
 */
import { renderEmail, type BoardNoticeProps } from '@zurichjs/emails';
import { sendEmail, sendMemberEmail } from '@zurichjs/integrations';
import { levelInfo, TransitionError, UNDO_TARGETS, type Actor, type Member, type MemberStore, type Status } from '@zurichjs/membership';
import { resignReasonLabels, type ResignReason } from '../lib/membership.ts';
import { lastDay, longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipProps } from './membership.ts';
import { membershipSlack, notify, resignationCard, who, type MembershipSlack } from './membership-slack.ts';
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
export const resignationRef = (m: Member) => m.resignedAt ?? m.updatedAt;

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
    // Paid manually (cash/bank): no subscription to stop; the membership ends now.
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

  // Stripe first: resigning stopped the renewal (resign.ts), so it renews again.
  if (member.stripeSubscriptionId) await resumeSubscription(member.stripeSubscriptionId, resignationRef(member), stripe);
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
  what: { kind: 'resigned'; dues: number; byBoard?: boolean; reasons?: readonly ResignReason[]; note?: string } | { kind: 'withdrawn'; byBoard: boolean },
  deps: { env: Env; origin: string; fetch?: typeof fetch; log?: Log },
): Promise<void> {
  const log = deps.log ?? console.log;
  const admin = new URL('/admin/memberships', deps.origin).toString();
  const subject = what.kind === 'resigned' ? `Resignation from ${m.name}` : `${m.name} resubscribed`;
  const lines = [
    what.kind === 'resigned'
      ? `${what.byBoard ? `The board recorded ${m.name}'s resignation (bylaws Art. 5)` : `${m.name} resigned on their account page (bylaws Art. 5)`}. The request is with the board; the member was told we typically get back to them within 72 hours.`
      : `${m.name} resubscribed${what.byBoard ? ' (the board withdrew the resignation for them)' : ' on their account page'}. Their resignation is withdrawn and the membership continues${m.stripeSubscriptionId ? ' and renews as before' : ''}.`,
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
  const resigned = what.kind === 'resigned';
  const notice: BoardNoticeProps = {
    subject,
    heading: resigned ? `${m.name} resigned` : `${m.name} resubscribed`,
    intro: [lines[0]!],
    rows: [
      ['Name', m.name],
      ...(m.organisationName ? ([['Organisation', m.organisationName]] as [string, string][]) : []),
      ['Email', m.email],
      ['Membership', `${levelInfo(m.level).name}, ${m.cycle}`],
      ...(m.paidUntil ? ([['Paid until', lastPaidDayOf(m.paidUntil)!]] as [string, string][]) : []),
      ...(resigned ? ([['Open invoices', what.dues > 0 ? String(what.dues) : 'None']] as [string, string][]) : []),
      ...(resigned
        ? ([['Why', what.reasons?.length ? resignReasonLabels(what.reasons).join('; ') : what.note ? 'See their words below' : 'No reason given']] as [string, string][])
        : []),
    ],
    ...(resigned && what.note ? { message: { label: 'In their words', text: what.note } } : {}),
    button: { label: resigned ? 'Confirm in the admin area' : 'Open the admin area', url: admin },
    note: resigned
      ? `${what.dues > 0 ? 'Under the bylaws the resignation takes effect once the open invoices are paid. ' : 'Confirming ends the membership with the paid period. '}You can also confirm with the button in Slack.`
      : undefined,
    replyTo: m.name,
  };
  await sendEmail(deps.env, subject, lines.join('\n'), m.email, log, {
    fetch: deps.fetch,
    idempotencyKey: `board-${what.kind}:${m.id}:${resignationRef(m)}`,
    notice,
  }).catch((e: Error) => log(`[membership] board email about ${m.id} failed: ${e.message}`));
}

export type StartResult = { result: 'resigned'; member: Member } | { result: 'not_member' } | { result: 'changed' };

/**
 * Records a resignation (bylaws Art. 5), from the account page or by the board for a member who
 * resigned to it directly (owner, 11th November 2026). Renewal stops at once, the board gets the
 * Slack card and an email, the member a written copy. Reasons are recorded, never required.
 */
export async function startResignation(
  member: Member,
  actor: Actor,
  why: { reasons: readonly ResignReason[]; note: string },
  deps: { env: Env; store: MemberStore; origin: string; fetch?: typeof fetch; slack?: MembershipSlack; log?: Log },
): Promise<StartResult> {
  const { env, store, origin } = deps;
  const log = deps.log ?? console.log;
  if (!['active', 'past_due', 'imported_manual'].includes(member.status)) return { result: 'not_member' };
  let updated: Member;
  try {
    updated = await store.transition(member.id, {
      from: member.status,
      to: 'resigning',
      actor,
      ...(why.reasons.length || why.note ? { payload: { reasons: [...why.reasons], note: why.note } } : {}),
    });
  } catch (cause) {
    if (cause instanceof TransitionError) return { result: 'changed' };
    throw cause;
  }
  // Renewal stops now, not when the board confirms (owner, 11th November 2026): nothing more is
  // charged after a resignation. Resubscribing (or the board's undo) turns it back on.
  if (updated.stripeSubscriptionId) {
    await cancelAtPeriodEnd(updated.stripeSubscriptionId, resignationRef(updated), { env, fetch: deps.fetch }).catch(async (e: Error) => {
      log(`[membership] renewal for ${updated.id} not stopped: ${e.message}`);
      await notify(
        `:warning: The renewal of ${updated.name}'s subscription could not be stopped after their resignation (${e.message}). Confirm the resignation before their paid period ends, or cancel the renewal in Stripe.`,
        { env, slack: deps.slack, fetch: deps.fetch, log },
      );
    });
  }
  const dues = await openInvoices(updated, { env, fetch: deps.fetch }).catch(() => 0);
  const card = resignationCard(updated, dues, why);
  try {
    await (deps.slack ?? membershipSlack(env, deps.fetch)).post(card.text, card.blocks);
  } catch (e) {
    log(`[membership] resignation card for ${updated.id} not posted: ${(e as Error).message}`);
    await notify(`Resignation from ${updated.name} (${updated.email}) could not be posted with its button. Confirm it by hand.`, {
      env,
      slack: deps.slack,
      fetch: deps.fetch,
      log,
    });
  }
  await emailBoard(updated, { kind: 'resigned', dues, byBoard: actor.kind === 'board', ...why }, { env, origin, fetch: deps.fetch, log });
  const email = renderEmail('resignation-received', { ...membershipProps(updated, origin), openDues: dues > 0 });
  await sendMemberEmail(env, { to: updated.email, ...email }, { idempotencyKey: `member-resignation:${updated.id}:${updated.updatedAt}`, log, fetch: deps.fetch }).catch(
    (e: Error) => log(`[membership] resignation copy to ${updated.id} failed: ${e.message}`),
  );
  return { result: 'resigned', member: updated };
}
