import { LEVELS, priceLookupKey } from '@zurichjs/membership';
import { describe, expect, it } from 'vitest';
import { CYCLES, TIERS, TIER_KEYS } from '../src/lib/membership.ts';
import { fromLookupKey } from '../src/server/membership-stripe.ts';
import { MEMBER_FEES } from '../../../tools/mock-stripe.mjs';

describe('fee table and membership levels', () => {
  it('offers on /membership exactly the membership levels, by their bylaw names', () => {
    expect(TIER_KEYS).toEqual(LEVELS.map((l) => l.key));
    for (const k of TIER_KEYS) expect(TIERS[k].name).toBe(LEVELS.find((l) => l.key === k)!.name);
  });

  it('has a Stripe price lookup key for every fee shown', () => {
    const keys = TIER_KEYS.flatMap((k) => CYCLES.map((c) => priceLookupKey(k, c.value)));
    expect(keys).toEqual([
      'member_basic_quarterly',
      'member_basic_yearly',
      'member_supporter_quarterly',
      'member_supporter_yearly',
      'member_enthusiast_quarterly',
      'member_enthusiast_yearly',
      'member_advocate_quarterly',
      'member_advocate_yearly',
    ]);
  });

  it('reads every level back from its Stripe lookup key, and nothing else', () => {
    for (const k of TIER_KEYS) for (const c of CYCLES) expect(fromLookupKey(priceLookupKey(k, c.value))).toEqual({ level: k, cycle: c.value });
    expect(fromLookupKey('member_patron_yearly')).toBeNull();
    expect(fromLookupKey('member_advocate_monthly')).toBeNull();
    expect(fromLookupKey('sponsor_friend_yearly')).toBeNull();
  });

  it('prices the local Stripe mock exactly like the fee table', () => {
    expect(MEMBER_FEES).toEqual(Object.fromEntries(TIER_KEYS.flatMap((k) => CYCLES.map((c) => [priceLookupKey(k, c.value), Math.round(TIERS[k].fees[c.value] * 100)]))));
  });
});
