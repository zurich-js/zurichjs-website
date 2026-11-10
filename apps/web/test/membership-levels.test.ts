import { LEVELS, priceLookupKey } from '@zurichjs/membership';
import { describe, expect, it } from 'vitest';
import { CYCLES, TIERS, TIER_KEYS } from '../src/lib/membership.ts';
import { MEMBER_FEES } from '../../../tools/mock-stripe.mjs';

describe('fee table and membership levels', () => {
  it('offers on /membership exactly the membership levels, by their bylaw names', () => {
    expect(TIER_KEYS).toEqual(LEVELS.map((l) => l.key));
    for (const k of TIER_KEYS) expect(TIERS[k].name).toBe(LEVELS.find((l) => l.key === k)!.name);
  });

  it('has a Stripe price lookup key for every fee shown', () => {
    const keys = TIER_KEYS.flatMap((k) => CYCLES.map((c) => priceLookupKey(k, c.value)));
    expect(keys).toEqual(['member_basic_quarterly', 'member_basic_yearly', 'member_supporter_quarterly', 'member_supporter_yearly']);
  });

  it('prices the local Stripe mock exactly like the fee table', () => {
    expect(MEMBER_FEES).toEqual(Object.fromEntries(TIER_KEYS.flatMap((k) => CYCLES.map((c) => [priceLookupKey(k, c.value), Math.round(TIERS[k].fees[c.value] * 100)]))));
  });
});
