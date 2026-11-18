/** The portal's fee table (packages/sponsorship) and the prices /partners shows must agree. */
import { SPONSORSHIP_TIERS } from '@zurichjs/content';
import { TIERS, chf } from '@zurichjs/sponsorship';
import { describe, expect, it } from 'vitest';

describe('sponsorship fees', () => {
  it('match /partners for every tier and payment option it shows', () => {
    const LABEL = { Monthly: 'monthly', Yearly: 'yearly', 'One-time': 'once' } as const;
    for (const t of TIERS) {
      const offer = SPONSORSHIP_TIERS.find((o) => o.id === t.key)!;
      expect(offer.name).toBe(t.name);
      for (const p of offer.prices) expect(p.amount, `${t.key} ${p.label}`).toBe(chf(t.fees[LABEL[p.label as keyof typeof LABEL]]));
    }
  });
});
