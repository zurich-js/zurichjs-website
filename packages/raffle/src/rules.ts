/**
 * The rules of raffle add-ons: which stage changes are allowed and by whom, who may buy one, and
 * the money picture of a raffle. Pure; the store applies them.
 */
import type { ActorKind, Funding, LedgerEntry, Raffle, Stage } from './types.ts';

/** Stage changes, with who may make each. Entry and draw stages are added by the entry part. */
const STAGE_MOVES: Partial<Record<Stage, Partial<Record<Stage, ActorKind[]>>>> = {
  proposed: { offered: ['board'], declined: ['board'], cancelled: ['board', 'sponsor'] },
  offered: { ready: ['board'], proposed: ['board'], cancelled: ['board', 'sponsor'], on_hold: ['board', 'script', 'stripe'] },
  ready: { open: ['board'], cancelled: ['board'], on_hold: ['board', 'script', 'stripe'] },
  open: { closed: ['board', 'script'], on_hold: ['board', 'script', 'stripe'], cancelled: ['board'] },
  closed: { drawn: ['board'], on_hold: ['board', 'script', 'stripe'], cancelled: ['board'] },
  drawn: { fulfilled: ['board'], on_hold: ['board', 'script', 'stripe'] },
  on_hold: { offered: ['board'], ready: ['board'], open: ['board'], closed: ['board'], drawn: ['board'], cancelled: ['board'] },
};

/** Stages only the store's own methods reach: opening freezes the rules, drawing records the draw. */
export const GUARDED_STAGES: readonly Stage[] = ['open', 'drawn'];

/**
 * A uniform random index in [0, n) from 32-bit random words, by rejection sampling, so no entry is
 * more likely than another. `random` defaults to crypto.getRandomValues.
 */
export function uniformIndex(n: number, random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]!): number {
  if (!Number.isInteger(n) || n < 1 || n > 2 ** 31) throw new RangeError('Need at least one entry.');
  const limit = 2 ** 32 - (2 ** 32 % n);
  for (;;) {
    const x = random();
    if (x < limit) return x % n;
  }
}

/** Claim codes: six characters without look-alikes (no 0, O, 1, I, L). */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function claimCode(random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]!): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[uniformIndex(CODE_ALPHABET.length, random)]).join('');
}
export const isClaimCode = (v: string) => /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/.test(v);

export class RaffleRuleError extends Error {
  readonly code: 'not_allowed' | 'conflict' | 'not_eligible' | 'gate' | 'invalid';
  constructor(message: string, code: RaffleRuleError['code'] = 'not_allowed') {
    super(message);
    this.name = 'RaffleRuleError';
    this.code = code;
  }
}

export function checkStage(from: Stage, to: Stage, by: ActorKind): void {
  if (!STAGE_MOVES[from]?.[to]?.includes(by)) throw new RaffleRuleError(`A raffle cannot go from ${from} to ${to} that way.`);
}

const FUNDING_MOVES: Partial<Record<Funding, Funding[]>> = {
  unpaid: ['paid', 'in_kind'],
  paid: ['refund_pending'],
  refund_pending: ['refunded', 'paid'],
};

export function checkFunding(from: Funding, to: Funding): void {
  if (!FUNDING_MOVES[from]?.includes(to)) throw new RaffleRuleError(`Funding cannot go from ${from} to ${to}.`);
}

/** The sponsorship as the eligibility rule needs it (from @zurichjs/sponsorship, without importing it). */
export interface Sponsorship {
  status: 'pending' | 'active' | 'past_due' | 'ending' | 'ended';
  /** While ending: the first day without the sponsorship. */
  endsAt: string | null;
  /** The first day not paid for. */
  paidUntil: string | null;
}

/**
 * Only an existing sponsor may buy a raffle: `active`, or `ending` and still inside its paid term.
 * Pending, past due and ended sponsorships cannot. Checked on the server when the sponsor proposes,
 * when the board offers, when the payment link is made and when the payment arrives.
 */
export function eligibility(s: Sponsorship, today: string): { ok: true } | { ok: false; reason: string } {
  if (s.status === 'active') return { ok: true };
  if (s.status === 'ending') {
    const last = [s.endsAt, s.paidUntil].filter((d): d is string => !!d).sort()[0];
    return last && today < last ? { ok: true } : { ok: false, reason: 'The sponsorship’s paid term is over.' };
  }
  const reasons: Record<Exclude<Sponsorship['status'], 'active' | 'ending'>, string> = {
    pending: 'A raffle is an add-on for a running sponsorship. Start the sponsorship first.',
    past_due: 'The sponsorship has an overdue payment. Settle it first.',
    ended: 'The sponsorship has ended.',
  };
  return { ok: false, reason: reasons[s.status] };
}

/**
 * Gift accounting for one raffle: money in (payments, less refunds) against money spent (prize
 * and delivery). The difference is shown to the board as underspend or overspend; what happens
 * with it is the board's decision, never automatic.
 */
export function settlement(r: Pick<Raffle, 'funding' | 'amountMinor'>, ledger: LedgerEntry[]) {
  const sum = (kinds: LedgerEntry['kind'][]) => ledger.filter((e) => kinds.includes(e.kind)).reduce((a, e) => a + e.amountMinor, 0);
  const received = sum(['payment']) - sum(['refund']);
  const spent = sum(['prize_purchase', 'delivery']);
  const budget = r.amountMinor ?? 0;
  const state =
    r.funding === 'in_kind'
      ? 'in_kind'
      : received === 0 && spent === 0
        ? 'nothing_yet'
        : spent === 0
          ? 'not_spent'
          : spent < budget
            ? 'underspend'
            : spent > budget
              ? 'overspend'
              : 'balanced';
  return { received, spent, budget, difference: budget - spent, state } as const;
}

export type Settlement = ReturnType<typeof settlement>;
