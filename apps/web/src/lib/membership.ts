/**
 * Membership of the Swiss JavaScript Group: tiers, fees and benefits. The
 * /membership page and /api/verein-inquiry both read this table, so the form,
 * the request and the organisers' email always agree on the fee.
 *
 * Members pay quarterly or yearly (owner, 3rd November 2026: the monthly option
 * is gone). `perMonth` is only the "That's CHF … a month" line on each card.
 */
export type TierKey = 'basic' | 'supporter';
export type Cycle = 'quarterly' | 'yearly';
export type TierName = 'Basic Member' | 'Supporter';

export interface Tier {
  name: TierName;
  tagline: string;
  fees: Record<Cycle, number>;
  /** What membership comes to per month, for the comparison line. */
  perMonth: number;
  /** "That's about…" comparisons (owner's copy). */
  comparisons: string[];
  /** Heading over the benefits, when they build on another tier. */
  benefitsTitle?: string;
  benefits: string[];
}

export const TIERS: Record<TierKey, Tier> = {
  basic: {
    name: 'Basic Member',
    tagline: 'For curious Zurchers who want in.',
    fees: { quarterly: 50, yearly: 175 },
    perMonth: 14.5,
    comparisons: ['a simple bouquet of tulips', 'a 250 g coffee refill from MAME', 'less than an AI tool subscription', 'less than 3 Halbtax trips in Zurich'],
    // Production's wording (voting rules: owner to confirm, docs/v2/CONTENT-SOURCES.md).
    benefits: ['Cancel anytime', 'Stay informed and vote on small decisions'],
  },
  supporter: {
    name: 'Supporter',
    tagline: 'For tech-scene shapers.',
    fees: { quarterly: 75, yearly: 250 },
    perMonth: 21,
    comparisons: ['still cheaper than Netflix in 4K', 'one takeaway lunch', '30% less than what we pay for meetup.com'],
    benefitsTitle: 'Everything in Basic, and you also get',
    benefits: ['Exclusive events access', 'Free or discounted workshops', 'Voting rights'],
  },
};

export const TIER_KEYS = Object.keys(TIERS) as TierKey[];

export const CYCLES: { value: Cycle; label: string; unit: string; perYear: number }[] = [
  { value: 'quarterly', label: 'Quarterly', unit: 'quarter', perYear: 4 },
  { value: 'yearly', label: 'Yearly', unit: 'year', perYear: 1 },
];

export const chf = (n: number) => `CHF ${Number.isInteger(n) ? n : n.toFixed(2)}`;

const cycleOf = (c: Cycle) => CYCLES.find((x) => x.value === c)!;

/** "CHF 50 a quarter". */
export const feeLabel = (t: Tier, c: Cycle) => `${chf(t.fees[c])} a ${cycleOf(c).unit}`;

/** What a year costs on a cycle: 4 × 50 = 200. */
export const perYear = (t: Tier, c: Cycle) => Math.round(t.fees[c] * cycleOf(c).perYear * 100) / 100;

/** The tier with this display name (what the form sends and the API accepts). */
export const tierByName = (name: string): Tier | undefined => TIER_KEYS.map((k) => TIERS[k]).find((t) => t.name === name);

/**
 * Why members leave (owner, 10th November 2026): the account page asks before sending a
 * resignation. Several can be chosen; "Something else" needs a few words. Giving a reason is
 * never a condition: the bylaws (Art. 5) and the Swiss Civil Code (Art. 70) let a member resign
 * at any time, so the form always offers to resign without one.
 */
export const RESIGN_REASONS = [
  { value: 'moving', label: 'I am moving away from Zurich' },
  { value: 'time', label: 'I do not have time for the meetups' },
  { value: 'cost', label: 'The fee is too much for me' },
  { value: 'value', label: 'The membership does not give me enough' },
  { value: 'relevance', label: 'The topics are not relevant to me any more' },
  { value: 'employer', label: 'My employer no longer pays for it' },
  { value: 'other', label: 'Something else' },
] as const;
export type ResignReason = (typeof RESIGN_REASONS)[number]['value'];
export const RESIGN_NOTE_MAX = 1000;

/** What the member told us, cleaned: known reasons only, a trimmed note. Never a reason to refuse. */
export function parseResignReasons(body: unknown): { reasons: ResignReason[]; note: string } {
  const b = (body && typeof body === 'object' ? body : {}) as { reasons?: unknown; note?: unknown };
  const known = new Set<string>(RESIGN_REASONS.map((r) => r.value));
  const reasons = Array.isArray(b.reasons) ? [...new Set(b.reasons.filter((r): r is ResignReason => typeof r === 'string' && known.has(r)))] : [];
  const note = typeof b.note === 'string' ? b.note.trim().slice(0, RESIGN_NOTE_MAX) : '';
  return { reasons, note };
}

export const resignReasonLabels = (reasons: readonly ResignReason[]) => reasons.map((r) => RESIGN_REASONS.find((x) => x.value === r)!.label);

/**
 * A term paid manually, cash/bank (owner, 11th November 2026): from the first of the start month (YYYY-MM),
 * one cycle long. `end` is the first unpaid day (paid_until); the last paid day is the day before.
 */
export function manualTerm(startMonth: string, cycle: Cycle): { start: string; end: string } {
  const [y, m] = startMonth.split('-').map(Number);
  const start = new Date(Date.UTC(y!, m! - 1, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + (cycle === 'yearly' ? 12 : 3), 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
