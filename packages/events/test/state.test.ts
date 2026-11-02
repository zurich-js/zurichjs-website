import { describe, expect, it } from 'vitest';
import {
  FEEDBACK_WINDOW_MS,
  buildIcs,
  chainTicketing,
  meetupTicketing,
  nextMeetup,
  pastEvents,
  presentEvent,
  resolveState,
  stateChangeTimes,
  upcomingEvents,
  type Event,
} from '../src/index.ts';

const DOORS = '2026-11-18T18:30:00+01:00';
const doors = Date.parse(DOORS);
const at = (ms: number) => new Date(ms);
const HOUR = 3600_000;

const ev = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  slug: 'forms-types',
  title: 'Forms, types and design systems',
  status: 'scheduled',
  startsAt: DOORS,
  endsAt: '2026-11-18T21:30:00+01:00',
  venue: { name: 'Venue AG', street: 'Strasse 1', zip: '8005', city: 'Zürich' },
  meetupUrl: 'https://www.meetup.com/zurich-js/events/1/',
  description: 'Two talks.',
  agenda: [],
  practical: [],
  photos: [],
  ...over,
});

describe('resolveState', () => {
  it('is open before doors for a scheduled event', () => {
    expect(resolveState(ev(), at(doors - HOUR))).toBe('open');
  });
  it('maps rsvp-soon to notopen and full to full before doors', () => {
    expect(resolveState(ev({ status: 'rsvp-soon' }), at(doors - HOUR))).toBe('notopen');
    expect(resolveState(ev({ status: 'full' }), at(doors - HOUR))).toBe('full');
  });
  it('turns live exactly at doors, whatever the RSVP status', () => {
    for (const status of ['scheduled', 'rsvp-soon', 'full'] as const) {
      expect(resolveState(ev({ status }), at(doors))).toBe('live');
    }
  });
  it('stays live until just before doors + 48 h, then becomes past', () => {
    expect(resolveState(ev(), at(doors + FEEDBACK_WINDOW_MS - 1))).toBe('live');
    expect(resolveState(ev(), at(doors + FEEDBACK_WINDOW_MS))).toBe('past');
  });
  it('lets cancelled and postponed win over the clock', () => {
    for (const t of [doors - HOUR, doors + HOUR, doors + FEEDBACK_WINDOW_MS + HOUR]) {
      expect(resolveState(ev({ status: 'cancelled' }), at(t))).toBe('cancelled');
      expect(resolveState(ev({ status: 'postponed' }), at(t))).toBe('postponed');
    }
  });
  it('is tbc when the status says so or the date is missing', () => {
    expect(resolveState(ev({ status: 'tbc' }), at(doors - HOUR))).toBe('tbc');
    expect(resolveState(ev({ startsAt: undefined }), at(doors - HOUR))).toBe('tbc');
  });
});

describe('lists', () => {
  const a = ev({ id: 'a', slug: 'a', startsAt: '2026-09-16T18:30:00+02:00' });
  const b = ev({ id: 'b', slug: 'b' });
  const c = ev({ id: 'c', slug: 'c', status: 'cancelled', startsAt: '2026-10-20T18:30:00+02:00' });
  const d = ev({ id: 'd', slug: 'd', status: 'tbc', startsAt: undefined, dateText: 'January 2027' });
  const now = at(Date.parse('2026-11-01T12:00:00Z'));
  it('splits upcoming (soonest first, undated last) and past (latest first)', () => {
    expect(upcomingEvents([a, b, c, d], now).map((e) => e.id)).toEqual(['c', 'b', 'd']);
    expect(pastEvents([a, b, c, d], now).map((e) => e.id)).toEqual(['a']);
  });
  it('skips cancelled events for the next meetup', () => {
    expect(nextMeetup([a, b, c, d], now)?.id).toBe('b');
  });
  it('lists the next doors and doors + 48 h as rebuild times', () => {
    expect(stateChangeTimes([a, b, c, d], now).map((d) => d.getTime())).toEqual([doors, doors + FEEDBACK_WINDOW_MS]);
  });
});

describe('presentEvent', () => {
  const ticketing = meetupTicketing('https://www.meetup.com/zurich-js/');
  it('offers the Meetup RSVP handoff while open', () => {
    const p = presentEvent(ev(), { now: at(doors - HOUR), ticketing });
    expect(p.cta).toMatchObject({ kind: 'rsvp', label: 'RSVP on Meetup', external: true });
    expect(p.pills).toEqual([{ text: 'Meetup' }, { text: 'RSVP open', yellow: true }]);
    expect(p.whenShort).toBe('Wed 18 Nov 2026, 18:30–21:30');
  });
  it('chains providers so a later one (Sane) can take over single events', () => {
    const sane = { id: 'sane', actionFor: (e: Event) => (e.slug === 'paid' ? { kind: 'buy' as const, label: 'Get a ticket', href: 'https://example.com', note: '' } : undefined) };
    const chained = chainTicketing(sane, ticketing);
    expect(presentEvent(ev({ slug: 'paid' }), { now: at(doors - HOUR), ticketing: chained }).cta).toMatchObject({ kind: 'buy' });
    expect(presentEvent(ev(), { now: at(doors - HOUR), ticketing: chained }).cta).toMatchObject({ kind: 'rsvp' });
  });
  it('switches to feedback mode during the window and names when it closes', () => {
    const p = presentEvent(ev(), { now: at(doors + HOUR), ticketing });
    expect(p.state).toBe('live');
    expect(p.cta.kind).toBe('feedback');
    expect(p.banner?.title).toContain('Fri 20 Nov, 18:30');
  });
  it('shows the cancelled banner and points to upcoming events', () => {
    const p = presentEvent(ev({ status: 'cancelled' }), { now: at(doors - HOUR), ticketing });
    expect(p.banner?.tone).toBe('danger');
    expect(p.cta).toMatchObject({ kind: 'next', href: '/events' });
  });
  it('describes tbc events without a date', () => {
    const p = presentEvent(ev({ status: 'tbc', startsAt: undefined, dateText: 'January 2027', venue: undefined }), { now: at(doors), ticketing });
    expect(p.dateLineShort).toBe('January 2027, date to be confirmed');
    expect(p.venueShort).toBe('Venue to be confirmed');
    expect(p.cta.kind).toBe('follow');
  });
  it('shows a grey banner for past events without a recap, none with one', () => {
    const later = at(doors + FEEDBACK_WINDOW_MS + HOUR);
    expect(presentEvent(ev(), { now: later }).banner?.tone).toBe('grey');
    expect(presentEvent(ev({ recap: { talks: [] } }), { now: later }).banner).toBeUndefined();
  });
  it('honours a preview override', () => {
    expect(presentEvent(ev(), { now: at(doors - HOUR), override: 'postponed' }).crumb).toBe('Postponed');
  });
});

describe('buildIcs', () => {
  it('escapes text and uses UTC times', () => {
    const ics = buildIcs(ev({ title: 'A; B, C' }), 'https://zurichjs.com/events/forms-types', at(0))!;
    expect(ics).toContain('DTSTART:20261118T173000Z');
    expect(ics).toContain('SUMMARY:ZurichJS: A\\; B\\, C');
  });
  it('never doubles the ZurichJS prefix', () => {
    expect(buildIcs(ev({ title: 'ZurichJS: 2nd Anniversary' }), 'u', at(0))).toContain('SUMMARY:ZurichJS: 2nd Anniversary\r\n');
    expect(buildIcs(ev({ title: 'ZurichJS 2nd Anniversary' }), 'u', at(0))).toContain('SUMMARY:ZurichJS 2nd Anniversary\r\n');
  });
  it('uses the public slug as UID, so a second download updates the same calendar entry', () => {
    const a = buildIcs(ev({ id: 'drafts.abc' }), 'u', at(0))!;
    const b = buildIcs(ev({ id: 'abc', updatedAt: '2026-11-02T10:00:00Z' }), 'u', at(1000))!;
    expect(a).toContain('UID:forms-types@zurichjs.com');
    expect(b).toContain('UID:forms-types@zurichjs.com');
    expect(a).not.toContain('drafts.');
  });
  it('gives the exact instant in winter and in summer (UTC, no floating times)', () => {
    expect(buildIcs(ev({ startsAt: '2026-09-10T18:00:00+02:00', endsAt: undefined }), 'u', at(0))).toContain('DTSTART:20260910T160000Z');
    expect(buildIcs(ev({ startsAt: '2026-11-12T18:00:00+01:00', endsAt: undefined }), 'u', at(0))).toContain('DTSTART:20261112T170000Z');
  });
  it('folds long lines at 75 octets', () => {
    const ics = buildIcs(ev({ description: 'ä'.repeat(200) }), 'u', at(0))!;
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it('returns null without a date', () => {
    expect(buildIcs(ev({ startsAt: undefined }), 'u')).toBeNull();
  });
});
