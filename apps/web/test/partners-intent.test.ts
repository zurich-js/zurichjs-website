import { describe, expect, it } from 'vitest';
import { validate } from '@zurichjs/forms';
import { intentFromQuery, intentLabel, partnerPayload } from '../src/components/islands/forms/partners-intent.ts';

const q = (s: string) => new URLSearchParams(s);

describe('partner form intent', () => {
  it('reads every way and tier from the URL', () => {
    for (const tier of ['champion', 'builder', 'friend', 'supporter'] as const) expect(intentFromQuery(q(`way=partner&tier=${tier}`))).toEqual({ way: 'partner', tier });
    for (const way of ['host', 'food', 'community', 'unsure'] as const) expect(intentFromQuery(q(`way=${way}`))).toEqual({ way, tier: '' });
  });
  it('a tier alone means sponsorship; a tier with another way is dropped; unknown values are ignored', () => {
    expect(intentFromQuery(q('tier=friend'))).toEqual({ way: 'partner', tier: 'friend' });
    expect(intentFromQuery(q('way=host&tier=friend'))).toEqual({ way: 'host', tier: '' });
    expect(intentFromQuery(q('way=sponsorship&tier=gold'))).toEqual({ way: 'partner', tier: '' });
    expect(intentFromQuery(q('way=nope'))).toBeNull();
  });
  it('a click on the page wins over the URL', () => {
    expect(intentFromQuery(q('way=host'), { way: 'partner', tier: 'champion' })).toEqual({ way: 'partner', tier: 'champion' });
  });
  it('labels the intent', () => {
    expect(intentLabel('partner', 'builder')).toBe('Sponsorship: Community Builder');
    expect(intentLabel('partner', '')).toBe('Sponsorship');
    expect(intentLabel('food', '')).toBe('Food and drinks');
  });
});

describe('partner form payload', () => {
  const base = { org: ' Acme ', name: 'Ada', email: 'a@b.ch', phone: '', way: 'partner' as const, tier: 'builder' as const, capacity: '', msg: '' };
  it('sends every filled field and passes the shared schema', () => {
    const p = partnerPayload({ ...base, phone: '+41 1', msg: 'Hi' });
    expect(p).toEqual({
      org: 'Acme',
      name: 'Ada',
      email: 'a@b.ch',
      phone: '+41 1',
      way: 'partner',
      interest: 'Sponsorship: Community Builder',
      tier: 'Community Builder',
      msg: 'Hi',
    });
    expect(validate('partners', p).ok).toBe(true);
  });
  it('leaves out empty optional fields and fields for another way', () => {
    expect(partnerPayload({ ...base, way: 'host', capacity: '60' })).toEqual({ org: 'Acme', name: 'Ada', email: 'a@b.ch', way: 'host', interest: 'Host a meetup', capacity: '60' });
    expect(partnerPayload({ ...base, way: 'food', capacity: '60' })).not.toHaveProperty('capacity');
  });
});
