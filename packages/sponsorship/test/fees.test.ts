import { describe, expect, it } from 'vitest';
import { FeeGateClosed, chfMinor, feeGate, francsToMinor, grossUp, percentToPpm, ppmLabel, quoteFigures, type Tariff } from '../src/index.ts';

const tariff: Tariff = { version: 't-1', method: 'card', currency: 'chf', ratePpm: 29_000, fixedMinor: 30, note: null, enteredBy: 'board', enteredAt: '2026-11-24T00:00:00Z' };

describe('fee quotes', () => {
  it('absorbs by default: no surcharge, no tariff, no policy', () => {
    expect(quoteFigures(150_000, 'absorb', feeGate(null, null))).toEqual({
      currency: 'chf',
      baseMinor: 150_000,
      surchargeMinor: 0,
      totalMinor: 150_000,
      feeChoice: 'absorb',
      tariffVersion: null,
      policyVersion: null,
      formula: 'none',
    });
  });

  it('refuses pass-through until a tariff and an approved policy exist', () => {
    expect(() => quoteFigures(150_000, 'pass_through', feeGate(null, 'p-1'))).toThrow(FeeGateClosed);
    expect(() => quoteFigures(150_000, 'pass_through', feeGate(tariff, ''))).toThrow(/surcharge policy/);
    expect(() => quoteFigures(150_000, 'pass_through', feeGate(tariff, '   '))).toThrow(FeeGateClosed);
  });

  it('grosses up so the base is left after the fee, rounded up to the rappen', () => {
    const q = quoteFigures(150_000, 'pass_through', feeGate(tariff, 'p-1'));
    // (150'000 + 30) / 0.971 = 154'510.81… → 154'511
    expect(q).toMatchObject({ baseMinor: 150_000, surchargeMinor: 4_511, totalMinor: 154_511, tariffVersion: 't-1', policyVersion: 'p-1', formula: 'gross-up-v1' });
    // What Stripe would keep at this tariff, rounded to the rappen, leaves at least the base.
    const fee = Math.round((q.totalMinor * tariff.ratePpm) / 1_000_000) + tariff.fixedMinor;
    expect(q.totalMinor - fee).toBeGreaterThanOrEqual(q.baseMinor);
    // Adding rate × base would under-recover.
    expect(150_000 + Math.round(150_000 * 0.029) + 30).toBeLessThan(q.totalMinor);
  });

  it('is exact at the edges', () => {
    expect(grossUp(1, 0, 0)).toBe(1);
    expect(grossUp(100, 0, 30)).toBe(130);
    expect(grossUp(97, 30_000, 0)).toBe(100);
    expect(grossUp(98, 30_000, 0)).toBe(102); // 101.03… rounds up
    expect(() => grossUp(1.5, 0, 0)).toThrow(RangeError);
    expect(() => grossUp(100, 100_001, 0)).toThrow(RangeError);
    expect(() => quoteFigures(0, 'absorb', feeGate(null, null))).toThrow(/more than zero/);
  });

  it('reads and shows decimals without floats', () => {
    expect(percentToPpm('2.9')).toBe(29_000);
    expect(percentToPpm('1,5')).toBe(15_000);
    expect(percentToPpm('3.25')).toBe(32_500);
    expect(percentToPpm('abc')).toBeNull();
    expect(francsToMinor('0.30')).toBe(30);
    expect(francsToMinor('0.305')).toBeNull();
    expect(francsToMinor('1')).toBe(100);
    expect(ppmLabel(29_000)).toBe('2.9%');
    expect(ppmLabel(32_500)).toBe('3.25%');
    expect(chfMinor(154_511)).toBe('CHF 1’545.11');
    expect(chfMinor(150_000)).toBe('CHF 1’500.00');
    expect(chfMinor(5)).toBe('CHF 0.05');
  });
});
