import { describe, expect, it } from 'vitest';
import { HONEYPOT, isFormKind, validate } from '../src/index.ts';

const proposal = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Engineer',
  bio: 'Writes programs.',
  linkedin: 'https://www.linkedin.com/in/ada',
  title: 'Typed forms',
  abstract: 'What you learn',
  format: 'Standard',
  level: 'beginner',
  topics: ['TypeScript', 'Testing'],
};

describe('talk proposals (production fields)', () => {
  it('requires a description, a length, a level and at least one topic', () => {
    const r = validate('cfp', { ...proposal, abstract: '', format: 'Deep dive', level: 'expert', topics: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields).sort()).toEqual(['abstract', 'format', 'level', 'topics']);
  });
  it('offers 5 and 25 minutes, as production does', async () => {
    const { TALK_LENGTHS } = await import('../src/client.ts');
    expect(TALK_LENGTHS.map((l) => l.minutes)).toEqual([5, 25]);
    expect(validate('cfp', { ...proposal, format: 'Lightning' }).ok).toBe(true);
  });
  it('accepts only topics from the list, at most eight', () => {
    expect(validate('cfp', { ...proposal, topics: ['Cooking'] }).ok).toBe(false);
    const nine = ['React', 'Vue', 'Angular', 'Svelte', 'Node.js', 'TypeScript', 'Testing', 'Tooling', 'DevOps'];
    const r = validate('cfp', { ...proposal, topics: nine });
    expect(!r.ok && r.fields.topics).toBe('Choose up to 8 topics.');
  });
  it('asks new speakers for job title, bio and a LinkedIn link', () => {
    const r = validate('cfp', { ...proposal, jobTitle: '', bio: ' ', linkedin: 'ada' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fields).sort()).toEqual(['bio', 'jobTitle', 'linkedin']);
    expect(validate('cfp', { ...proposal, linkedin: 'linkedin.com/in/ada' }).ok).toBe(true);
  });
  it('lets returning speakers leave their profile out (their speaker page is matched by email)', () => {
    expect(validate('cfp', { ...proposal, returning: true, jobTitle: '', bio: '', linkedin: '' }).ok).toBe(true);
    // A LinkedIn link they do give must still be one.
    expect(validate('cfp', { ...proposal, returning: true, linkedin: 'not a link' }).ok).toBe(false);
  });
  it('the browser validator gives the same answers', async () => {
    const { fieldErrors } = await import('../src/client.ts');
    expect(fieldErrors('cfp', proposal)).toEqual({});
    expect(Object.keys(fieldErrors('cfp', { ...proposal, jobTitle: '', topics: [] })).sort()).toEqual(['jobTitle', 'topics']);
    expect(fieldErrors('cfp', { ...proposal, returning: true, jobTitle: '', bio: '', linkedin: '' })).toEqual({});
  });
});

describe('form schemas (V2 payload contract)', () => {
  it('accepts a complete talk proposal and keeps extra fields', () => {
    const r = validate('cfp', { ...proposal, note: 'extra' });
    expect(r.ok && r.data.abstract).toBe('What you learn');
    expect(r.ok && (r.data as Record<string, unknown>).note).toBe('extra');
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
