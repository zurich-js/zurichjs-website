import type { ActorKind, EndedReason, Member, Status } from './types.ts';

/**
 * Every allowed status change, and who may make it. The store refuses anything
 * else, and Supabase's `member_transition` refuses a change whose `from` no
 * longer matches (two organisers pressing Approve at once).
 *
 * Bylaws (Art. 5): a member may resign at any time, provided no dues are
 * outstanding. So `resigning → ended` is the board confirming, and the caller
 * checks for open invoices first; the board cannot refuse a resignation, only
 * record that the member withdrew it (`resigning → active`).
 */
export const TRANSITIONS: Readonly<Record<Status, Partial<Record<Status, readonly ActorKind[]>>>> = {
  applied: { approved: ['board'], rejected: ['board'] },
  approved: { signed: ['member'], rejected: ['board'] },
  signed: { active: ['stripe'], ended: ['board'] },
  active: { past_due: ['stripe'], resigning: ['member', 'board'], ended: ['board', 'stripe'] },
  past_due: { active: ['stripe'], resigning: ['member', 'board'], ended: ['board', 'stripe'] },
  imported_manual: { active: ['stripe'], resigning: ['member', 'board'], ended: ['board'] },
  resigning: { ended: ['board', 'stripe'], active: ['board'] },
  rejected: { applied: ['member'] },
  ended: { applied: ['member'] },
};

/** Reasons the board may give itself; Stripe ending a subscription always means `resigned` or `lapsed`. */
const REASONS_BY_ACTOR: Record<ActorKind, readonly EndedReason[]> = {
  board: ['resigned', 'expelled', 'deceased', 'dissolved', 'lapsed'],
  stripe: ['resigned', 'lapsed'],
  member: [],
  script: [],
};

export class TransitionError extends Error {
  constructor(
    message: string,
    readonly code: 'not_allowed' | 'wrong_actor' | 'reason_required' | 'reason_not_allowed' | 'conflict',
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

export const canTransition = (from: Status, to: Status, actor: ActorKind): boolean => TRANSITIONS[from][to]?.includes(actor) ?? false;

/**
 * Checks a change and returns what the store must write. Throws TransitionError
 * with a sentence an organiser can read in Slack.
 */
export function checkTransition(member: Pick<Member, 'status'>, to: Status, actor: ActorKind, reason?: EndedReason): { from: Status; to: Status; endedReason: EndedReason | null } {
  const from = member.status;
  const actors = TRANSITIONS[from][to];
  if (!actors) throw new TransitionError(`A membership that is ${label(from)} cannot become ${label(to)}.`, 'not_allowed');
  if (!actors.includes(actor)) throw new TransitionError(`Only ${actors.map(actorLabel).join(' or ')} can change a membership from ${label(from)} to ${label(to)}.`, 'wrong_actor');
  if (to === 'ended') {
    if (!reason) throw new TransitionError('Say why the membership ends.', 'reason_required');
    if (!REASONS_BY_ACTOR[actor].includes(reason)) throw new TransitionError(`${actorLabel(actor)} cannot end a membership as ${reason}.`, 'reason_not_allowed');
    return { from, to, endedReason: reason };
  }
  if (reason) throw new TransitionError('Only an ending has a reason.', 'reason_not_allowed');
  return { from, to, endedReason: null };
}

/** Statuses in which someone is a member of the association. */
export const isMember = (s: Status): boolean => s === 'active' || s === 'past_due' || s === 'imported_manual' || s === 'resigning';

/**
 * Whether the member may start (or switch to) automatic payment through Stripe.
 * New members pay once they have signed. Imported members must re-sign the
 * declaration digitally first: a paper declaration alone is not enough (owner,
 * 6th November 2026). Signing does not change an imported member's status;
 * the caller passes whether a digital declaration exists.
 */
export function canStartAutomaticPayment(m: Pick<Member, 'status' | 'paymentMode'>, hasDigitalDeclaration: boolean): boolean {
  if (m.status === 'signed') return hasDigitalDeclaration;
  if (m.status === 'imported_manual') return m.paymentMode === 'manual' && hasDigitalDeclaration;
  return false;
}

/** Statuses in which a person may start a new application. */
export const canApply = (s: Status | null): boolean => s === null || s === 'rejected' || s === 'ended';

const LABELS: Record<Status, string> = {
  applied: 'waiting for approval',
  approved: 'approved',
  signed: 'signed',
  active: 'active',
  past_due: 'behind on payment',
  imported_manual: 'paid by hand',
  resigning: 'resigning',
  rejected: 'declined',
  ended: 'ended',
};

export const label = (s: Status) => LABELS[s];

const actorLabel = (a: ActorKind) => ({ member: 'the member', board: 'an organiser', stripe: 'Stripe', script: 'the import' })[a];
