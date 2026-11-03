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
