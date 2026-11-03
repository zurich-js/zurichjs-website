import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CYCLES, TIERS, TIER_KEYS, feeLabel, perYear, tierByName, type Cycle } from '../src/lib/membership.ts';
import { handleInquiry, parseInquiry } from '../src/pages/api/verein-inquiry.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

/** Production's quarterly and yearly fees (origin/main src/pages/membership.tsx); monthly is no longer offered (owner, 3rd November 2026). */
const PRODUCTION = {
  'Basic Member': { quarterly: 50, yearly: 175 },
  Supporter: { quarterly: 75, yearly: 250 },
} as const;

const combos = TIER_KEYS.flatMap((k) => CYCLES.map((c) => [TIERS[k].name, c.value] as const));

describe('membership fees', () => {
  it('match production for every tier and billing cycle', () => {
    for (const [name, cycle] of combos) expect(tierByName(name)!.fees[cycle]).toBe(PRODUCTION[name][cycle]);
    expect(combos).toHaveLength(4);
  });

  it('labels each fee as its own price', () => {
    expect(feeLabel(TIERS.basic, 'quarterly')).toBe('CHF 50 a quarter');
    expect(feeLabel(TIERS.supporter, 'yearly')).toBe('CHF 250 a year');
  });

  it('per-year totals are plain arithmetic, and paying yearly costs less', () => {
    const totals = (k: 'basic' | 'supporter') => Object.fromEntries(CYCLES.map((c) => [c.value, perYear(TIERS[k], c.value)])) as Record<Cycle, number>;
    expect(totals('basic')).toEqual({ quarterly: 200, yearly: 175 });
    expect(totals('supporter')).toEqual({ quarterly: 300, yearly: 250 });
  });

  it('only quarterly and yearly are offered; the monthly figure is the comparison line only', () => {
    expect(CYCLES.map((c) => c.value)).toEqual(['quarterly', 'yearly']);
    expect(TIERS.basic.perMonth).toBe(14.5);
    expect(TIERS.supporter.perMonth).toBe(21);
  });

  it('keeps production benefits, including the workshop line and the voting wording', () => {
    expect(TIERS.basic.benefits).toContain('Stay informed and vote on small decisions');
    expect(TIERS.supporter.benefits).toEqual(expect.arrayContaining(['Free or discounted workshops', 'Voting rights']));
  });
});

describe('POST /api/verein-inquiry for every tier and billing cycle', () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => vi.unstubAllGlobals());

  it.each(combos)('%s, %s: accepted, and the stubbed email states the fee', async (tier, billingCycle) => {
    expect(parseInquiry({ name: 'Anna', email: 'a@b.ch', tier, billingCycle })).toMatchObject({ ok: true, data: { tier, billingCycle } });
    // Stubbed delivery: Resend and Slack are fetch calls that never leave the test.
    const sent: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        sent.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> });
        return new Response('{"ok":true}', { status: 200 });
      }),
    );
    const res = await handleInquiry(
      new Request('https://zurichjs.com/api/verein-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Anna', email: 'a@b.ch', tier, billingCycle }),
      }),
      { env: { RESEND_API_KEY: 're_test', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x' }, log: () => {} },
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(2);
    const log = sent
      .map((c) => JSON.stringify(c.body))
      .join('\n')
      .replaceAll('\\n', '\n');
    expect(log).toContain(`Tier: ${tier}`);
    expect(log).toContain(`Billing: ${billingCycle}`);
    expect(log).toContain(`Fee shown: ${feeLabel(tierByName(tier)!, billingCycle)}`);
  });
});
