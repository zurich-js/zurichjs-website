import { describe, expect, it } from 'vitest';
import { HONEYPOT, isFormKind, validate } from '../src';

describe('form schemas (V2 payload contract)', () => {
  it('accepts the V2 required fields and keeps extra fields', () => {
    const r = validate('cfp', { name: 'Ada', email: 'ada@example.com', title: 'Typed forms', format: 'Standard talk', abstract: 'More' });
    expect(r.ok && r.data.abstract).toBe('More');
  });
  it('reports each missing field once, for inline errors', () => {
    const r = validate('contact', { name: 'Ada', email: 'nope' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields).sort()).toEqual(['email', 'message', 'topic']);
  });
  it('rejects filled honeypots', () => {
    expect(validate('partners', { org: 'X', name: 'Ada', email: 'a@b.ch', way: 'host', [HONEYPOT]: 'spam' }).ok).toBe(false);
  });
  it('coerces numbers for ratings and donations', () => {
    expect(validate('rating', { eventId: 'e', target: 't1', stars: '4' }).ok).toBe(true);
    expect(validate('rating', { eventId: 'e', target: 't1', stars: 6 }).ok).toBe(false);
    expect(validate('donate', { amountChf: '20', method: 'twint' }).ok).toBe(true);
  });
  it('does not accept the de-scoped workshop kinds', () => {
    expect(isFormKind('checkout')).toBe(false);
    expect(isFormKind('waitlist')).toBe(false);
    expect(isFormKind('feedback')).toBe(true);
  });
});

describe('browser validator agrees with the server schemas', async () => {
  const { fieldErrors, REQUIRED } = await import('../src/client');
  it('requires the same fields', () => {
    for (const kind of Object.keys(REQUIRED) as (keyof typeof REQUIRED)[]) {
      const server = validate(kind, {});
      const client = fieldErrors(kind, {});
      expect(Object.keys(client).sort(), kind).toEqual(
        server.ok
          ? []
          : Object.keys(server.fields)
              .filter((k) => k !== HONEYPOT)
              .sort(),
      );
    }
  });
});
