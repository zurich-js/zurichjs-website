import { describe, expect, it } from 'vitest';
import {
  isPreview,
  loadContent,
  sanityReadToken,
  mapEvent,
  mapRating,
  mapSpeaker,
  mapSupport,
  parseAddress,
  perspective,
  resetContentCache,
  talkFormat,
  speakersWithTalks,
  visibleSpeakers,
  type RawEvent,
} from '../src/index.ts';

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
  it('lists the talks without inventing times when there is no agenda, and never turns datetime into a doors line', () => {
    expect(ev.agenda).toEqual([{ time: '', kind: 'talk', title: 'Typed forms', talk: expect.objectContaining({ speakerIds: ['ada'], format: 'talk' }) }]);
  });
  it('keeps the agenda times and order as organisers wrote them, including non-talk lines', () => {
    const withAgenda = mapEvent({
      ...raw,
      agenda: [
        { time: '18:00', title: 'Doors open' },
        { time: '18:30', title: 'Welcome & Intro' },
        { time: '18:50', talk: { _id: 't1', id: 'retro', title: 'Retrospective', durationMinutes: 25, speakerIds: ['ada'] } },
        { time: '19:15', title: 'Pizza break' },
        { time: '20:20', title: 'Networking & drinks' },
      ],
    });
    expect(withAgenda.agenda.map((a) => [a.time, a.kind, a.title])).toEqual([
      ['18:00', 'doors', 'Doors open'],
      ['18:30', 'intro', 'Welcome & Intro'],
      ['18:50', 'talk', 'Retrospective'],
      ['19:15', 'break', 'Pizza break'],
      ['20:20', 'networking', 'Networking & drinks'],
    ]);
  });
  it('never presents the promotional artwork as a photo from the evening', () => {
    expect(ev.photos).toEqual([]);
    expect(ev.cover?.src).toContain('cdn.sanity.io');
  });
});

describe('mapSpeaker talks', () => {
  it('lists each talk once with all its events, tags and description', () => {
    const s = mapSpeaker({
      id: 'faris',
      name: 'Faris',
      legacySlugs: ['Faris_Aziz', 'faris'],
      talks: [
        {
          _id: 't1',
          id: 'agentic',
          title: 'Agentic Commerce',
          type: 'talk',
          durationMinutes: 25,
          tags: ['AI', null],
          description: 'D',
          eventIds: ['2026-09-warmup', '2026-11-anniversary'],
          legacyEventId: '2026-09-warmup',
        },
        { _id: 't2', title: 'Old talk', eventIds: [], legacyEventId: '2025-03-x' },
      ],
    });
    expect(s.talks).toEqual([
      expect.objectContaining({ id: 't1', slug: 'agentic', tags: ['AI'], description: 'D', durationMin: 25, eventSlugs: ['2026-09-warmup', '2026-11-anniversary'] }),
      expect.objectContaining({ title: 'Old talk', eventSlugs: ['2025-03-x'] }),
    ]);
    // The current ID is never a redirect source.
    expect(s.legacySlugs).toEqual(['Faris_Aziz']);
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
    expect(s.talks).toEqual([expect.objectContaining({ eventSlugs: ['e1'], title: 'Typed forms', format: 'Talk', tags: [] })]);
    expect(JSON.stringify(s)).not.toContain('@');
  });
  it('keeps only speakers explicitly marked visible', () => {
    const raw = [{ id: 'yes', isVisible: true }, { id: 'blank', isVisible: null }, { id: 'missing' }, { id: 'no', isVisible: false }];
    expect(visibleSpeakers(raw).map((s) => s.id)).toEqual(['yes']);
  });
  it('lists only speakers with a talk at an event', () => {
    const talk = (eventSlugs: string[]) => ({ id: 't', title: 'T', eventSlugs }) as never;
    const list = [
      { id: 'spoke', talks: [talk(['jan-2026'])] },
      { id: 'none', talks: [] },
      { id: 'unscheduled', talks: [talk([])] },
    ];
    expect(speakersWithTalks(list).map((s) => s.id)).toEqual(['spoke']);
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

describe('Sanity read token', () => {
  it('falls back to the production SANITY_TOKEN', () => {
    expect(sanityReadToken({})).toBeUndefined();
    expect(sanityReadToken({ SANITY_TOKEN: 'a' })).toBe('a');
    expect(sanityReadToken({ SANITY_READ_TOKEN: 'b', SANITY_TOKEN: 'a' })).toBe('b');
    expect(perspective({ SANITY_PERSPECTIVE: 'drafts', SANITY_TOKEN: 'a' })).toBe('drafts');
  });
});
