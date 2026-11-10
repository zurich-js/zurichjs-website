import type { ActorKind, EndedReason, Member, Status } from './types.ts';

/**
 * Every allowed status change, and who may make it. The store refuses anything
 * else, and the database's `member_transition` refuses a change whose `from`
 * no longer matches (a retried webhook, two clicks at once).
 *
 * Anyone can join (owner, 10th November 2026; bylaws Art. 4: any person who
 * supports the association's goals may become a member). There is no approval
 * and no declaration to sign: people accept the membership terms, which rest on
 * the bylaws, and pay. `pending` becomes `active` when Stripe confirms the first
 * payment.
 *
 * Bylaws (Art. 5): a member may resign at any time, provided no dues are
 * outstanding. So `resigning → ended` is the board confirming, and the caller
 * checks for open invoices first; the board cannot refuse a resignation, only
 * record that the member withdrew it (`resigning → active`). The board can also
 * end a membership (expulsion, death, dissolution).
 */
export const TRANSITIONS: Readonly<Record<Status, Partial<Record<Status, readonly ActorKind[]>>>> = {
  pending: { active: ['stripe'] },
  active: { past_due: ['stripe'], resigning: ['member', 'board'], ended: ['board', 'stripe'] },
  past_due: { active: ['stripe'], resigning: ['member', 'board'], ended: ['board', 'stripe'] },
  imported_manual: { active: ['stripe'], resigning: ['member', 'board'], ended: ['board'] },
  resigning: { ended: ['board', 'stripe'], active: ['board'] },
  ended: { pending: ['member'] },
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
 * Whether the member may start (or switch to) automatic payment through Stripe:
 * people who signed up and have not paid yet, and imported members paying by
 * hand, once they have accepted the current membership terms online. Imported
 * members accept them in the portal first (owner, 6th and 10th November 2026);
 * accepting does not change their status. The caller passes whether that
 * acceptance exists.
 */
export function canStartAutomaticPayment(m: Pick<Member, 'status' | 'paymentMode'>, acceptedCurrentTerms: boolean): boolean {
  if (m.status === 'pending') return acceptedCurrentTerms;
  if (m.status === 'imported_manual') return m.paymentMode === 'manual' && acceptedCurrentTerms;
  return false;
}

/** Whether a person may sign up (again): no membership yet, or an ended one. */
export const canJoin = (s: Status | null): boolean => s === null || s === 'ended';

const LABELS: Record<Status, string> = {
  pending: 'waiting for the first payment',
  active: 'active',
  past_due: 'behind on payment',
  imported_manual: 'paid by hand',
  resigning: 'resigning',
  ended: 'ended',
};

export const label = (s: Status) => LABELS[s];

const actorLabel = (a: ActorKind) => ({ member: 'the member', board: 'an organiser', stripe: 'Stripe', script: 'the import' })[a];
