import { describe, expect, it } from 'vitest';
import { HONEYPOT, isFormKind, validate } from '../src/index.ts';

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
  it('coerces numbers for ratings', () => {
    expect(validate('rating', { eventId: 'e', target: 't1', stars: '4' }).ok).toBe(true);
    expect(validate('rating', { eventId: 'e', target: 't1', stars: 6 }).ok).toBe(false);
  });
  it('requires a rating from 1 to 5 and the event and talk', () => {
    for (const stars of [undefined, 0, 2.5, '']) expect(validate('rating', { eventId: 'e', target: 't1', stars }).ok).toBe(false);
    expect(validate('rating', { target: 't1', stars: 4 }).ok).toBe(false);
    expect(validate('rating', { eventId: 'e', stars: 4 }).ok).toBe(false);
    expect(validate('feedback', { eventId: 'e' }).ok).toBe(false);
  });
  it('does not accept the de-scoped workshop kinds', () => {
    expect(isFormKind('checkout')).toBe(false);
    expect(isFormKind('donate')).toBe(false);
    expect(isFormKind('waitlist')).toBe(false);
    expect(isFormKind('feedback')).toBe(true);
  });
});

describe('browser validator agrees with the server schemas', async () => {
  const { fieldErrors, REQUIRED } = await import('../src/client.ts');
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

describe('volunteer applications (production /cfv fields)', async () => {
  const { fieldErrors, VOLUNTEER_INTERESTS } = await import('../src/client.ts');
  const ok = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    linkedinProfile: 'https://www.linkedin.com/in/ada',
    githubProfile: '',
    availability: 'monthly',
    interests: ['Community management', 'Photography and video'],
    message: 'I organise things.',
  };
  const both = (data: object) => ({ server: validate('volunteer', data), client: fieldErrors('volunteer', data) });

  it('accepts a complete application, with or without GitHub, on both sides', () => {
    for (const githubProfile of ['', 'ada-l', '@ada', 'https://github.com/ada']) {
      const { server, client } = both({ ...ok, githubProfile });
      expect(server.ok, githubProfile).toBe(true);
      expect(client, githubProfile).toEqual({});
    }
    expect(both({ ...ok, linkedinProfile: 'linkedin.com/in/ada' }).server.ok).toBe(true);
    expect(both({ ...ok, linkedinProfile: 'https://ch.linkedin.com/in/ada' }).server.ok).toBe(true);
  });
  it('requires LinkedIn on linkedin.com, at least one listed interest and a motivation', () => {
    const cases: [object, string][] = [
      [{ ...ok, linkedinProfile: '' }, 'linkedinProfile'],
      [{ ...ok, linkedinProfile: 'https://example.com/ada' }, 'linkedinProfile'],
      [{ ...ok, linkedinProfile: 'https://notlinkedin.com/in/ada' }, 'linkedinProfile'],
      [{ ...ok, interests: [] }, 'interests'],
      [{ ...ok, interests: undefined }, 'interests'],
      [{ ...ok, interests: ['Workshop organisation'] }, 'interests'],
      [{ ...ok, message: ' ' }, 'message'],
      [{ ...ok, availability: 'daily' }, 'availability'],
      [{ ...ok, availability: undefined }, 'availability'],
      [{ ...ok, githubProfile: 'not a handle!' }, 'githubProfile'],
    ];
    for (const [data, field] of cases) {
      const { server, client } = both(data);
      expect(server.ok, field).toBe(false);
      if (!server.ok) expect(Object.keys(server.fields), field).toEqual([field]);
      expect(Object.keys(client), field).toEqual([field]);
    }
  });
  it('asks for a short text when availability is "Other"', () => {
    const { server, client } = both({ ...ok, availability: 'other' });
    expect(!server.ok && Object.keys(server.fields)).toEqual(['availabilityOther']);
    expect(Object.keys(client)).toEqual(['availabilityOther']);
    expect(both({ ...ok, availability: 'other', availabilityOther: 'Saturdays' }).server.ok).toBe(true);
  });
  it('does not offer workshop organisation, and keeps photography and video', () => {
    expect(VOLUNTEER_INTERESTS.some((i) => /workshop/i.test(i))).toBe(false);
    expect(VOLUNTEER_INTERESTS).toContain('Photography and video');
    expect(VOLUNTEER_INTERESTS).toHaveLength(8);
  });
});
