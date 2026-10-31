import { describe, expect, it } from 'vitest';
import { loadContent, mapEvent, mapSpeaker, parseAddress, resetContentCache, talkFormat } from '../src';

describe('mapEvent (production document shape)', () => {
  const raw = {
    _id: 'abc',
    _updatedAt: '2026-10-01T10:00:00Z',
    id: 'zurichjs-meetup-november-2026',
    title: 'Forms, types and design systems',
    datetime: '2026-11-18T17:30:00.000Z',
    location: 'Venue AG',
    address: 'Hardstrasse 201, 8005 Zürich',
    description: 'Two talks.',
    meetupUrl: 'https://www.meetup.com/zurich-js/events/1/',
    isProMeetup: false,
    stripePriceId: 'price_should_be_ignored',
    image: 'https://cdn.sanity.io/images/x/production/a.jpg',
    talks: [{ id: 't1', title: 'Typed forms', type: 'talk', durationMinutes: 25, speakerIds: ['ada', null] }],
  };
  const ev = mapEvent(raw);
  it('keeps the production URL slug and defaults the status', () => {
    expect(ev.slug).toBe('zurichjs-meetup-november-2026');
    expect(ev.status).toBe('scheduled');
    expect(ev.startsAt).toBe('2026-11-18T17:30:00.000Z');
  });
  it('builds a venue from location and address', () => {
    expect(ev.venue).toEqual({ name: 'Venue AG', street: 'Hardstrasse 201', zip: '8005', city: 'Zürich' });
  });
  it('derives the agenda from talks when there is none, at doors time in Zurich', () => {
    expect(ev.agenda).toEqual([{ time: '18:30', title: 'Typed forms', talk: expect.objectContaining({ speakerIds: ['ada'], format: 'talk' }) }]);
  });
  it('uses the single event image as the first photo', () => {
    expect(ev.photos[0]?.src).toContain('cdn.sanity.io');
  });
  it('only keeps a Stripe price for pro meetups', () => {
    expect(ev.stripePriceId).toBeUndefined();
    expect(mapEvent({ ...raw, isProMeetup: true }).stripePriceId).toBe('price_should_be_ignored');
  });
});

describe('helpers', () => {
  it('parses Swiss addresses and keeps unparseable ones', () => {
    expect(parseAddress('Bahnhofstrasse 1, 8001 Zürich, Switzerland')).toEqual({ street: 'Bahnhofstrasse 1', zip: '8001', city: 'Zürich' });
    expect(parseAddress('Somewhere in town')).toEqual({ street: 'Somewhere in town', city: 'Zürich' });
  });
  it('maps free-text talk types', () => {
    expect(talkFormat('Lightning Talk')).toBe('lightning');
    expect(talkFormat(undefined, 5)).toBe('lightning');
    expect(talkFormat('deep dive')).toBe('deep-dive');
    expect(talkFormat('talk', 25)).toBe('talk');
  });
  it('builds speaker links and initials, never exposing email', () => {
    const s = mapSpeaker({
      id: 'ada',
      name: 'Ada Lovelace',
      title: 'Engineer',
      github: 'https://github.com/ada',
      talks: [{ title: 'Typed forms', type: 'talk', eventIds: ['e1'] }],
    });
    expect(s.initials).toBe('AL');
    expect(s.links).toEqual([{ label: 'GitHub', url: 'https://github.com/ada' }]);
    expect(s.talks).toEqual([{ eventId: 'e1', title: 'Typed forms', format: 'Talk' }]);
    expect(JSON.stringify(s)).not.toContain('@');
  });
});

describe('loadContent', () => {
  it('returns sample content when forced', async () => {
    resetContentCache();
    const c = await loadContent({ CONTENT_SOURCE: 'sample' });
    expect(c.source).toBe('sample');
    expect(c.events.length).toBeGreaterThan(3);
    resetContentCache();
  });
  const down = () => Promise.reject(new Error('Sanity down'));
  it('refuses to fall back to sample content on production deploys', async () => {
    resetContentCache();
    await expect(loadContent({ CONTEXT: 'production' }, down)).rejects.toThrow('Sanity down');
    resetContentCache();
  });
  it('falls back to sample content outside production', async () => {
    resetContentCache();
    const warn = console.warn;
    console.warn = () => {};
    expect((await loadContent({ CONTEXT: 'deploy-preview' }, down)).source).toBe('sample');
    console.warn = warn;
    resetContentCache();
  });
});
