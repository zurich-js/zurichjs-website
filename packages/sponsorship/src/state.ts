import type { ActorKind, EndedReason, Sponsor, Status } from './types.ts';

/**
 * Every allowed status change, and who may make it. The stores refuse anything else,
 * and the database update is compare-and-set on the status the caller saw.
 *
 * Changes to a running sponsorship need the sponsor's agreement (owner, 18th November
 * 2026): the board proposes, a contact accepts in the portal, and only then does the
 * status move (a confirmed end is the sponsor ending it). The board can still
 * end one outright for a reason the sponsor does not agree to (`terminated`) or take
 * back an invitation (`withdrawn`); both are logged.
 */
export const TRANSITIONS: Readonly<Record<Status, Partial<Record<Status, readonly ActorKind[]>>>> = {
  // A sponsorship that never started: withdrawn by the board, its payment given up by Stripe, or
  // its meetups over before it was paid (the daily check).
  pending: { active: ['stripe', 'board'], ended: ['board', 'stripe', 'script'] },
  active: { past_due: ['stripe'], ending: ['sponsor', 'board'], ended: ['board', 'stripe', 'script'] },
  past_due: { active: ['stripe', 'board'], ending: ['sponsor', 'board'], ended: ['board', 'stripe'] },
  // Undo, while it still runs: back to active (Stripe moves it to past due if a payment is open).
  ending: { ended: ['board', 'stripe', 'script'], active: ['sponsor', 'board'], past_due: ['sponsor', 'board'] },
  ended: { pending: ['sponsor', 'board'] },
};

const REASONS_BY_ACTOR: Record<ActorKind, readonly EndedReason[]> = {
  board: ['cancelled', 'completed', 'lapsed', 'terminated', 'withdrawn'],
  stripe: ['cancelled', 'lapsed'],
  script: ['cancelled', 'completed', 'withdrawn'],
  sponsor: [],
};

type TransitionErrorCode = 'not_allowed' | 'wrong_actor' | 'reason_required' | 'reason_not_allowed' | 'conflict';

export class TransitionError extends Error {
  readonly code: TransitionErrorCode;
  constructor(message: string, code: TransitionErrorCode) {
    super(message);
    this.name = 'TransitionError';
    this.code = code;
  }
}

export const canTransition = (from: Status, to: Status, actor: ActorKind) => TRANSITIONS[from][to]?.includes(actor) ?? false;

export function checkTransition(
  s: Pick<Sponsor, 'status'> & Partial<Pick<Sponsor, 'endedReason'>>,
  to: Status,
  actor: ActorKind,
  reason?: EndedReason,
): { from: Status; to: Status; endedReason: EndedReason | null } {
  const from = s.status;
  const actors = TRANSITIONS[from][to];
  if (!actors) throw new TransitionError(`A sponsorship that is ${label(from)} cannot become ${label(to)}.`, 'not_allowed');
  if (!actors.includes(actor))
    throw new TransitionError(`Only ${actors.map(actorLabel).join(' or ')} can change a sponsorship from ${label(from)} to ${label(to)}.`, 'wrong_actor');
  if (!canRestart(s, actor) && to === 'pending') throw new TransitionError('ZurichJS ended this sponsorship. Write to hello@zurichjs.com to sponsor again.', 'wrong_actor');
  if (to === 'ended') {
    if (!reason) throw new TransitionError('Say why the sponsorship ends.', 'reason_required');
    if (!REASONS_BY_ACTOR[actor].includes(reason)) throw new TransitionError(`${actorLabel(actor)} cannot end a sponsorship as ${reason}.`, 'reason_not_allowed');
    return { from, to, endedReason: reason };
  }
  if (reason) throw new TransitionError('Only an ending has a reason.', 'reason_not_allowed');
  return { from, to, endedReason: null };
}

/**
 * Sponsoring again after it ended. The board ended it outright (`terminated`, for example a code of
 * conduct breach): only the board can start it again, after a review; the sponsor cannot alone.
 */
export const canRestart = (s: Partial<Pick<Sponsor, 'status' | 'endedReason'>>, actor: ActorKind) => s.status !== 'ended' || actor !== 'sponsor' || s.endedReason !== 'terminated';

/** Running: the sponsor gets the tier's benefits. */
export const isRunning = (s: Status) => s === 'active' || s === 'past_due' || s === 'ending';

/** The sponsor can change plan or end it themselves. */
export const canChange = (s: Pick<Sponsor, 'status' | 'cycle'>) => (s.status === 'active' || s.status === 'past_due') && s.cycle !== 'once';

const LABELS: Record<Status, string> = {
  pending: 'waiting for the first payment',
  active: 'active',
  past_due: 'payment overdue',
  ending: 'ending',
  ended: 'ended',
};

export const label = (s: Status) => LABELS[s];

const actorLabel = (a: ActorKind) => ({ sponsor: 'the sponsor', board: 'an organiser', stripe: 'Stripe', script: 'the daily check' })[a];

/** How sponsors read why it ended (docs/domains/sponsorship/overview.md, "Status machine"). */
export const ENDED_REASON_LABEL: Record<EndedReason, string> = {
  cancelled: 'you ended it',
  completed: 'completed',
  lapsed: 'unpaid',
  terminated: 'ended by ZurichJS',
  withdrawn: 'withdrawn before it started',
};
