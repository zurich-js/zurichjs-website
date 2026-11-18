/**
 * Sponsorship tiers and fees: the single source for the portal, the admin area, Stripe
 * (lookup keys) and the emails. /partners shows the same monthly, yearly and one-time
 * prices (packages/content/src/partners.ts); a test keeps the two equal.
 *
 *   monthly, yearly, one-time   production's prices (yearly is ten months: 2 months free)
 *   quarterly                   owner, 18th November 2026: round numbers, about 7% off monthly
 *   one-time                    covers one meetup (owner, 18th November 2026)
 */
import type { Cycle, RecurringCycle, Tier } from './types.ts';

export interface TierInfo {
  key: Tier;
  name: string;
  /** CHF. */
  fees: Record<Cycle, number>;
}

/** Lowest first: the order decides what is an upgrade. */
export const TIERS: readonly TierInfo[] = [
  { key: 'supporter', name: 'Community Supporter', fees: { monthly: 150, quarterly: 420, yearly: 1500, once: 250 } },
  { key: 'friend', name: 'Community Friend', fees: { monthly: 300, quarterly: 840, yearly: 3000, once: 400 } },
  { key: 'builder', name: 'Community Builder', fees: { monthly: 500, quarterly: 1400, yearly: 5000, once: 700 } },
  { key: 'champion', name: 'Community Champion', fees: { monthly: 750, quarterly: 2100, yearly: 7500, once: 1000 } },
];

export const TIER_KEYS = TIERS.map((t) => t.key);

export const CYCLES: readonly { key: Cycle; label: string; unit: string; months: number }[] = [
  { key: 'monthly', label: 'Monthly', unit: 'month', months: 1 },
  { key: 'quarterly', label: 'Quarterly', unit: 'quarter', months: 3 },
  { key: 'yearly', label: 'Yearly', unit: 'year', months: 12 },
  { key: 'once', label: 'One meetup', unit: 'meetup', months: 0 },
];

export const CYCLE_KEYS = CYCLES.map((c) => c.key);
export const RECURRING: readonly RecurringCycle[] = ['monthly', 'quarterly', 'yearly'];

export const isTier = (v: unknown): v is Tier => typeof v === 'string' && (TIER_KEYS as string[]).includes(v);
export const isCycle = (v: unknown): v is Cycle => typeof v === 'string' && (CYCLE_KEYS as string[]).includes(v);
export const isRecurring = (c: Cycle): c is RecurringCycle => c !== 'once';

export const tierInfo = (t: Tier): TierInfo => TIERS.find((x) => x.key === t)!;
export const cycleInfo = (c: Cycle) => CYCLES.find((x) => x.key === c)!;
export const tierRank = (t: Tier) => TIER_KEYS.indexOf(t);

export const fee = (t: Tier, c: Cycle) => tierInfo(t).fees[c];

/** CHF 7’500, as /partners writes amounts. */
export const chf = (n: number) => `CHF ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '’')}`;

/** "CHF 840 a quarter", "CHF 400 for one meetup". */
export const feeLabel = (t: Tier, c: Cycle) => (c === 'once' ? `${chf(fee(t, c))} for one meetup` : `${chf(fee(t, c))} a ${cycleInfo(c).unit}`);

/** The Stripe Price lookup key: sponsor_builder_quarterly, sponsor_friend_once. */
export const priceLookupKey = (t: Tier, c: Cycle) => `sponsor_${t}_${c}`;

export function fromLookupKey(key: string | null | undefined): { tier: Tier; cycle: Cycle } | null {
  const m = /^sponsor_(supporter|friend|builder|champion)_(monthly|quarterly|yearly|once)$/.exec(key ?? '');
  return m ? { tier: m[1] as Tier, cycle: m[2] as Cycle } : null;
}

/**
 * When a plan change applies (owner, 18th November 2026): a higher tier on the same
 * billing cycle applies now, and only the difference for the rest of the term is
 * charged (prorated). Everything else (a lower tier, another cycle) applies from the
 * next renewal, so nothing is refunded or charged twice.
 */
export function changeTiming(from: { tier: Tier; cycle: Cycle }, to: { tier: Tier; cycle: Cycle }): 'none' | 'now' | 'renewal' {
  if (from.tier === to.tier && from.cycle === to.cycle) return 'none';
  if (from.cycle === to.cycle && tierRank(to.tier) > tierRank(from.tier)) return 'now';
  return 'renewal';
}
