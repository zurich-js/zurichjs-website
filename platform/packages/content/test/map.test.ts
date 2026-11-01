import { describe, expect, it } from 'vitest';
import { isPreview, loadContent, mapEvent, mapRating, mapSpeaker, mapSupport, parseAddress, perspective, resetContentCache, talkFormat, type RawEvent } from '../src';

describe('mapEvent (production document shape)', () => {
  const raw: RawEvent = {
    _id: 'abc',
    _updatedAt: '2026-10-01T10:00:00Z',
    id: 'zurichjs-meetup-november-2026',
    title: 'Forms, types and design systems',
    datetime: '2026-11-18T17:30:00.000Z',
    location: 'Venue AG',
    address: 'Hardstrasse 201, 8005 Zürich',
    description: 'Two talks.',
    meetupUrl: 'https://www.meetup.com/zurich-js/events/1/',
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

describe('draft preview (SANITY_PERSPECTIVE)', () => {
  it('reads published content unless drafts are asked for', () => {
    expect(perspective({})).toBe('published');
    expect(perspective({ SANITY_PERSPECTIVE: 'published' })).toBe('published');
    expect(isPreview({})).toBe(false);
  });
  it('reads drafts with a token and marks the build as a preview', () => {
    expect(perspective({ SANITY_PERSPECTIVE: 'drafts', SANITY_READ_TOKEN: 'sk' })).toBe('drafts');
    expect(isPreview({ SANITY_PERSPECTIVE: 'drafts' })).toBe(true);
  });
  it('fails the build instead of falling back when drafts have no token', async () => {
    expect(() => perspective({ SANITY_PERSPECTIVE: 'drafts' })).toThrow('SANITY_READ_TOKEN');
    resetContentCache();
    await expect(loadContent({ SANITY_PERSPECTIVE: 'drafts' }, () => Promise.reject(new Error('unreachable')))).rejects.toThrow('SANITY_READ_TOKEN');
    resetContentCache();
  });
});

describe('singletons', () => {
  it('drops a rating without a score (the award sentence stays)', () => {
    expect(mapRating({ score: null, count: 3, url: 'https://meetup.com', checkedAt: '2026-10-01' })).toBeNull();
    expect(mapRating({ score: '4.9', count: 199, url: 'https://meetup.com', checkedAt: '2026-10-01' })).toMatchObject({ score: '4.9', scale: 5, source: 'Meetup' });
  });
  it('shows the Twint QR only when an image was uploaded', () => {
    expect(mapSupport(null)).toEqual({ twintQr: undefined, twintNote: undefined });
    expect(mapSupport({ twintQr: { alt: 'Twint', src: null } })).toEqual({ twintQr: undefined, twintNote: undefined });
    expect(mapSupport({ twintQr: { alt: '', src: 'https://cdn.sanity.io/qr.png', width: 600, height: 600 }, twintNote: 'Any amount helps.' })).toEqual({
      twintQr: { src: 'https://cdn.sanity.io/qr.png', alt: 'Twint QR code for a contribution to ZurichJS', width: 600, height: 600 },
      twintNote: 'Any amount helps.',
    });
  });
  it('never ships a sample payment code', async () => {
    resetContentCache();
    expect((await loadContent({ CONTENT_SOURCE: 'sample' })).support).toEqual({});
    resetContentCache();
  });
});
