import { describe, expect, it } from 'vitest';
import {
  buildSchedule,
  directionsUrl,
  eventEndsAt,
  eventSupporters,
  groupPartners,
  itemStartsAt,
  mapEmbedUrl,
  pickTodayEvent,
  recapSummary,
  scheduleFacts,
  talkAnchor,
  timesLine,
  todayPhase,
  untimedNote,
  zoneLabel,
  zurichWallTime,
  normalizeSearch,
  speakerSearchText,
  speakerTopics,
  type Event,
  type TalkRef,
} from '../src/index.ts';

const talk = (title: string, over: Partial<TalkRef> = {}): TalkRef => ({
  id: `t-${title}`,
  slug: title.toLowerCase(),
  title,
  speakerIds: ['ada'],
  format: 'talk',
  durationMin: 25,
  ...over,
});

const ev = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  slug: 'anniversary',
  title: '2nd Anniversary',
  status: 'scheduled',
  // Sanity stores UTC: 18:00 in Zurich in November.
  startsAt: '2026-11-12T17:00:00.000Z',
  venue: { name: 'Venue AG', street: 'Hardstrasse 201', zip: '8005', city: 'Zürich' },
  description: '',
  agenda: [],
  practical: [],
  photos: [],
  ...over,
});

describe('buildSchedule', () => {
  it('never gives every talk the start time (regression): talks without an agenda have no time', () => {
    const items = buildSchedule({ talks: [talk('Retro'), talk('Babel'), talk('Signals')] });
    expect(items.map((i) => [i.kind, i.time])).toEqual([
      ['talk', ''],
      ['talk', ''],
      ['talk', ''],
    ]);
  });
  it('never synthesises doors, welcome, break or networking without an agenda', () => {
    expect(buildSchedule({ talks: [talk('A'), talk('B'), talk('C')] }).every((i) => i.kind === 'talk')).toBe(true);
    expect(buildSchedule({ talks: [] })).toEqual([]);
  });
  it('keeps the organisers’ order, times and non-talk lines', () => {
    const items = buildSchedule({
      agenda: [
        { time: '17:00', title: 'Doors open & badge pickup' },
        { time: '17:30', title: 'Welcome' },
        { time: '17:40', talk: talk('Babel') },
        { time: '18:05', talk: talk('Streams') },
        { time: '18:30', title: 'Pizza break' },
        { time: '18:45', talk: talk('Signals') },
        { time: '19:15', title: 'Networking & drinks' },
      ],
      talks: [],
    });
    expect(items.map((i) => `${i.time} ${i.kind}`)).toEqual(['17:00 doors', '17:30 intro', '17:40 talk', '18:05 talk', '18:30 break', '18:45 talk', '19:15 networking']);
  });
  it('adds talks the agenda forgot, untimed, at the end', () => {
    const items = buildSchedule({ agenda: [{ time: '18:50', talk: talk('A') }], talks: [talk('A'), talk('B')] });
    expect(items.map((i) => [i.title, i.time])).toEqual([
      ['A', '18:50'],
      ['B', ''],
    ]);
  });
  it('ignores malformed times instead of showing them', () => {
    expect(buildSchedule({ agenda: [{ time: 'ca. 7pm', talk: talk('A') }], talks: [] })[0]!.time).toBe('');
  });
});

describe('times in Zurich', () => {
  it('labels winter CET and summer CEST', () => {
    expect(zoneLabel('2026-11-12T17:00:00.000Z')).toBe('CET');
    expect(zoneLabel('2026-09-10T16:00:00.000Z')).toBe('CEST');
  });
  it('switches CET/CEST on the right side of each summer-time change', () => {
    // Summer time starts on Sun 29 Mar 2026 and ends on Sun 25 Oct 2026.
    const at = (startsAt: string) => ev({ startsAt });
    expect(timesLine(at('2026-03-26T17:00:00.000Z'))).toBe('Starts 18:00 CET');
    expect(timesLine(at('2026-03-30T16:00:00.000Z'))).toBe('Starts 18:00 CEST');
    expect(timesLine(at('2026-10-24T16:00:00.000Z'))).toBe('Starts 18:00 CEST');
    expect(timesLine(at('2026-10-26T17:00:00.000Z'))).toBe('Starts 18:00 CET');
    // The same agenda time maps to different UTC instants on either side.
    expect(zurichWallTime('2026-03-26', '18:50').toISOString()).toBe('2026-03-26T17:50:00.000Z');
    expect(zurichWallTime('2026-03-30', '18:50').toISOString()).toBe('2026-03-30T16:50:00.000Z');
    expect(zurichWallTime('2026-10-24', '18:50').toISOString()).toBe('2026-10-24T16:50:00.000Z');
    expect(zurichWallTime('2026-10-26', '18:50').toISOString()).toBe('2026-10-26T17:50:00.000Z');
  });
  it('turns an agenda time into the right instant across the summer-time change', () => {
    expect(zurichWallTime('2026-11-12', '18:50').toISOString()).toBe('2026-11-12T17:50:00.000Z');
    expect(zurichWallTime('2026-09-10', '18:50').toISOString()).toBe('2026-09-10T16:50:00.000Z');
    // A UTC-stored event: "18:30" in the agenda is 18:30 in Zurich, not 18:30 UTC.
    expect(itemStartsAt(ev(), { time: '18:30' })?.toISOString()).toBe('2026-11-12T17:30:00.000Z');
    expect(itemStartsAt(ev(), { time: '' })).toBeUndefined();
  });
  it('separates doors, programme start and first talk', () => {
    const e = ev({
      agenda: buildSchedule({
        agenda: [
          { time: '18:00', title: 'Doors' },
          { time: '18:30', title: 'Welcome' },
          { time: '18:50', talk: talk('Retro') },
        ],
        talks: [],
      }),
    });
    expect(scheduleFacts(e)).toEqual({ starts: '18:00', doors: '18:00', programmeStarts: '18:30', firstTalk: '18:50', ends: undefined, zone: 'CET' });
    expect(timesLine(e)).toBe('Doors 18:00 · Talks from 18:50 CET');
  });
  it('calls datetime the start, never doors, when the agenda has no doors line', () => {
    const e = ev({ agenda: buildSchedule({ talks: [talk('Retro')] }) });
    expect(scheduleFacts(e).doors).toBeUndefined();
    expect(timesLine(e)).toBe('Starts 18:00 CET');
    // September: datetime 15:00Z is 17:00 in summer time.
    expect(timesLine(ev({ startsAt: '2026-09-10T15:00:00.000Z' }))).toBe('Starts 17:00 CEST');
    // Doors from the agenda win over the Meetup start, and the first talk is shown.
    const timed = ev({
      agenda: buildSchedule({
        agenda: [
          { time: '17:30', kind: 'doors', title: 'Doors' },
          { time: '18:50', talk: talk('A') },
        ],
        talks: [],
      }),
    });
    expect(timesLine(timed)).toBe('Doors 17:30 · Talks from 18:50 CET');
    const startThenTalks = ev({
      agenda: buildSchedule({
        agenda: [
          { time: '18:30', title: 'Welcome' },
          { time: '18:50', talk: talk('A') },
        ],
        talks: [],
      }),
    });
    expect(timesLine(startThenTalks)).toBe('Starts 18:00 · Talks from 18:50 CET');
  });
  it('knows the end only from endsAt or a timed close line', () => {
    expect(eventEndsAt(ev())).toBeUndefined();
    expect(eventEndsAt(ev({ endsAt: '2026-11-12T20:30:00.000Z' }))?.toISOString()).toBe('2026-11-12T20:30:00.000Z');
    const closing = ev({ agenda: buildSchedule({ agenda: [{ time: '21:00', title: 'Close' }], talks: [] }) });
    expect(eventEndsAt(closing)?.toISOString()).toBe('2026-11-12T20:00:00.000Z');
    expect(scheduleFacts(closing).ends).toBe('21:00');
  });
  it('shows one truthful note for untimed talks, by moment', () => {
    const untimed = ev({ agenda: buildSchedule({ talks: [talk('A'), talk('B')] }) });
    expect(untimedNote(untimed, 'past')).toBeUndefined();
    expect(untimedNote(untimed, 'future')).toBe('Talks in running order. Talk times follow closer to the day.');
    expect(untimedNote(untimed, 'now')).toBe('Talks in running order.');
    const timed = ev({ agenda: buildSchedule({ agenda: [{ time: '18:50', talk: talk('A') }], talks: [] }) });
    expect(untimedNote(timed, 'past')).toBeUndefined();
    expect(untimedNote(ev(), 'future')).toBeUndefined();
  });
});

describe('recapSummary', () => {
  it('counts the programme’s talks, so a full programme never says "No talks"', () => {
    const e = ev({ agenda: buildSchedule({ talks: ['A', 'B', 'C', 'D', 'E'].map((t) => talk(t)) }) });
    expect(recapSummary(e)).toBe('Thu 12th Nov 2026 · Venue AG, Zürich. Five talks.');
    expect(recapSummary(e, { photos: 12 })).toContain('Five talks and photos from the evening.');
    expect(recapSummary(ev())).toBe('Thu 12th Nov 2026 · Venue AG, Zürich.');
  });
});

describe('talk anchors and directions', () => {
  it('builds stable anchors from the talk ID', () => {
    expect(talkAnchor(talk('Agentic Commerce', { slug: 'agentic-commerce' }))).toBe('talk-agentic-commerce');
    expect(talkAnchor({ title: 'Ünïcode & Co!' })).toBe('talk-unicode-co');
  });
  it('links directions without an API key', () => {
    expect(directionsUrl(ev().venue!)).toBe('https://www.google.com/maps/dir/?api=1&destination=Venue%20AG%2C%20Hardstrasse%20201%2C%208005%20Z%C3%BCrich');
  });
  it('embeds the map with the Embed API when there is a key, and keyless by address otherwise', () => {
    expect(mapEmbedUrl(ev().venue!, 'k&1')).toBe('https://www.google.com/maps/embed/v1/place?key=k%261&q=Venue%20AG%2C%20Hardstrasse%20201%2C%208005%20Z%C3%BCrich');
    expect(mapEmbedUrl(ev().venue!)).toBe('https://www.google.com/maps?q=Hardstrasse%20201%2C%208005%20Z%C3%BCrich&output=embed');
    expect(mapEmbedUrl({ name: 'Somewhere', city: '' })).toBe('https://www.google.com/maps?q=Somewhere&output=embed');
  });
});

describe('Tonight', () => {
  const nov12 = ev();
  const later = ev({ id: 'e2', slug: 'dec', startsAt: '2026-12-10T17:00:00.000Z' });
  it('on 1 November the 12 November meetup is upcoming, never tonight', () => {
    const now = new Date('2026-11-01T12:00:00+01:00');
    expect(pickTodayEvent([later, nov12], now)?.slug).toBe('anniversary');
    expect(todayPhase(nov12, now)).toBe('upcoming');
  });
  it('the day itself, before doors, is "today"', () => {
    expect(todayPhase(nov12, new Date('2026-11-12T08:00:00+01:00'))).toBe('today');
    // 00:30 in Zurich is still the 11th in UTC: the Zurich calendar decides.
    expect(todayPhase(nov12, new Date('2026-11-12T00:30:00+01:00'))).toBe('today');
    expect(todayPhase(nov12, new Date('2026-11-11T23:30:00+01:00'))).toBe('upcoming');
  });
  it('is live from doors, then after, then moves on once feedback closes', () => {
    expect(todayPhase(nov12, new Date('2026-11-12T18:05:00+01:00'))).toBe('live');
    expect(todayPhase(nov12, new Date('2026-11-12T23:00:00+01:00'))).toBe('after');
    expect(pickTodayEvent([later, nov12], new Date('2026-11-13T12:00:00+01:00'))?.slug).toBe('anniversary');
    expect(pickTodayEvent([later, nov12], new Date('2026-11-15T12:00:00+01:00'))?.slug).toBe('dec');
  });
  it('has a "nothing planned" state', () => {
    expect(pickTodayEvent([nov12], new Date('2027-01-01'))).toBeUndefined();
    expect(todayPhase(undefined, new Date())).toBe('none');
    expect(pickTodayEvent([ev({ status: 'cancelled' })], new Date('2026-11-01'))).toBeUndefined();
  });
  it('lists event supporters once, venue first', () => {
    const partners = [
      { id: 'gyff', name: 'GYFF', kinds: ['sponsor' as const], current: true },
      { id: 'gyg', name: 'GetYourGuide', kinds: ['venue' as const], current: false },
    ];
    const list = eventSupporters(
      {
        hosts: ['gyg'],
        supporters: [
          { partnerId: 'gyff', role: 'sponsor' },
          { partnerId: 'gyg', role: 'venue' },
          { partnerId: 'missing', role: 'food' },
        ],
      },
      partners,
    );
    expect(list.map((s) => `${s.partner.name}:${s.role}`)).toEqual(['GetYourGuide:venue', 'GYFF:sponsor']);
  });
  it('groups partners: tiered sponsors once, current-only categories, past supporters apart', () => {
    const g = groupPartners([
      { id: 'a', name: 'A', kinds: ['sponsor', 'supporting'], tier: 'supporter', current: true },
      { id: 'b', name: 'B', kinds: ['sponsor'], tier: 'champion', current: true },
      { id: 'c', name: 'C', kinds: ['sponsor'], current: true },
      { id: 'd', name: 'D', kinds: ['sponsor'], tier: 'builder', current: false },
      { id: 'e', name: 'E', kinds: ['conference'], current: true },
      { id: 'f', name: 'F', kinds: ['conference'], current: false },
      { id: 'g', name: 'G', kinds: ['community'], current: true },
      { id: 'h', name: 'H', kinds: ['venue'], current: false },
    ]);
    expect(g.sponsorsByTier.map((t) => [t.tier, t.partners.map((p) => p.id)])).toEqual([
      ['champion', ['b']],
      ['supporter', ['a']],
      [undefined, ['c']],
    ]);
    expect(g.supporting).toEqual([]);
    expect(g.conferences.map((p) => p.id)).toEqual(['e']);
    expect(g.communities.map((p) => p.id)).toEqual(['g']);
    expect(g.venues.map((p) => p.id)).toEqual(['h']);
    expect(g.pastSponsors.map((p) => p.id)).toEqual(['d']);
    expect(g.pastPartners.map((p) => p.id)).toEqual(['f']);
  });
});

describe('speaker search', () => {
  const faris = {
    name: 'Faris Example',
    role: 'Staff engineer',
    tagline: '',
    bio: '',
    topics: [],
    talks: [
      { title: 'Agentic Commerce', tags: ['AI', 'React'] },
      { title: 'Resilient frontends', description: 'Error boundaries in React apps.', tags: ['TypeScript'] },
    ],
  };
  it('indexes talk titles, descriptions and topics, without accents or case', () => {
    const hay = speakerSearchText(faris);
    for (const q of ['agentic', 'react', 'typescript', 'error boundaries']) expect(hay).toContain(normalizeSearch(q));
    expect(normalizeSearch('  Nicolò   BABEL ')).toBe('nicolo babel');
  });
  it('lists topics from talk tags, counted once per speaker', () => {
    const other = { talks: [{ tags: ['react', 'Testing'] }, { tags: ['React'] }] };
    expect(speakerTopics([faris, other])).toEqual([{ topic: 'React', count: 2 }]);
  });
});

describe('an evening estimated from the start time (no agenda; owner, 4th November 2026)', () => {
  const talk = (title: string, durationMin: number) => ({ title, speakerIds: [], format: 'talk' as const, durationMin });
  it('runs doors, welcome, talks with 5-minute gaps, a break after the second talk, then networking', () => {
    const items = buildSchedule({ talks: [talk('A', 25), talk('B', 20), talk('C', 25)], startsAt: '2026-11-12T16:30:00.000Z' });
    expect(items.map((i) => [i.time, i.kind, i.title])).toEqual([
      ['17:30', 'doors', 'Doors open'],
      ['18:30', 'intro', 'Welcome and intro'],
      ['18:50', 'talk', 'A'],
      ['19:20', 'talk', 'B'],
      ['19:40', 'break', 'Food break'],
      ['19:55', 'talk', 'C'],
      ['20:25', 'networking', 'Networking and drinks'],
    ]);
    expect(items.every((i) => i.estimated)).toBe(true);
    expect(untimedNote({ agenda: items }, 'past')).toBe('Times are approximate.');
  });
  it('a talk without a length counts as 20 minutes; an agenda from Sanity always wins', () => {
    expect(buildSchedule({ talks: [talk('A', 0)], startsAt: '2026-11-12T16:30:00.000Z' }).at(-1)!.time).toBe('19:15');
    expect(buildSchedule({ agenda: [{ time: '18:00', title: 'Doors' }], talks: [], startsAt: '2026-11-12T16:30:00.000Z' })[0]!.estimated).toBeUndefined();
  });
});
