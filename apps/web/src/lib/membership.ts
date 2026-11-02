/**
 * Membership of the Swiss JavaScript Group: tiers, fees and benefits, as on
 * production (`origin/main` `src/pages/membership.tsx`). The /membership page
 * and /api/verein-inquiry both read this table, so the form, the request and
 * the organisers' email always agree on the fee.
 *
 * The three billing cycles are separate prices, not one price split three
 * ways: over a year, paying quarterly costs the most (see `perYear`).
 */
export type TierKey = 'basic' | 'supporter';
export type Cycle = 'monthly' | 'quarterly' | 'yearly';
export type TierName = 'Basic Member' | 'Supporter';

export interface Tier {
  name: TierName;
  tagline: string;
  fees: Record<Cycle, number>;
  benefits: string[];
}

export const TIERS: Record<TierKey, Tier> = {
  basic: {
    name: 'Basic Member',
    tagline: 'For curious Zurchers who want in.',
    fees: { monthly: 14.5, quarterly: 50, yearly: 175 },
    // Production's wording, unchanged (voting rules: owner to confirm, docs/v2/CONTENT-SOURCES.md).
    benefits: ['Cancel anytime', 'Stay informed and vote on small decisions'],
  },
  supporter: {
    name: 'Supporter',
    tagline: 'For people shaping the tech scene.',
    fees: { monthly: 21, quarterly: 75, yearly: 250 },
    // Production listed these under "You also get". The workshop line stays unchanged (owner).
    benefits: ['Everything in Basic', 'Access to exclusive events', 'Free or discounted workshops', 'Voting rights'],
  },
};

export const TIER_KEYS = Object.keys(TIERS) as TierKey[];

export const CYCLES: { value: Cycle; label: string; unit: string; perYear: number }[] = [
  { value: 'monthly', label: 'Monthly', unit: 'month', perYear: 12 },
  { value: 'quarterly', label: 'Quarterly', unit: 'quarter', perYear: 4 },
  { value: 'yearly', label: 'Yearly', unit: 'year', perYear: 1 },
];

export const chf = (n: number) => `CHF ${Number.isInteger(n) ? n : n.toFixed(2)}`;

const cycleOf = (c: Cycle) => CYCLES.find((x) => x.value === c)!;

/** "CHF 50 a quarter". */
export const feeLabel = (t: Tier, c: Cycle) => `${chf(t.fees[c])} a ${cycleOf(c).unit}`;

/** What a year costs on a cycle, in whole rappen: 12 × 14.50 = 174. Plain arithmetic on the fees above. */
export const perYear = (t: Tier, c: Cycle) => Math.round(t.fees[c] * cycleOf(c).perYear * 100) / 100;

/** The tier with this display name (what the form sends and the API accepts). */
export const tierByName = (name: string): Tier | undefined => TIER_KEYS.map((k) => TIERS[k]).find((t) => t.name === name);
