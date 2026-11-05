import { LEVELS, priceLookupKey } from '@zurichjs/membership';
import { describe, expect, it } from 'vitest';
import { CYCLES, TIERS, TIER_KEYS } from '../src/lib/membership.ts';

describe('fee table and membership levels', () => {
  it('offers on /membership exactly the levels the membership package offers, by the bylaws names', () => {
    expect(TIER_KEYS).toEqual(LEVELS.filter((l) => l.offered).map((l) => l.key));
    for (const k of TIER_KEYS) expect(TIERS[k].name).toBe(LEVELS.find((l) => l.key === k)!.name);
  });

  it('has a Stripe price lookup key for every fee shown', () => {
    const keys = TIER_KEYS.flatMap((k) => CYCLES.map((c) => priceLookupKey(k, c.value)));
    expect(keys).toEqual(['member_basic_quarterly', 'member_basic_yearly', 'member_supporter_quarterly', 'member_supporter_yearly']);
  });
});
