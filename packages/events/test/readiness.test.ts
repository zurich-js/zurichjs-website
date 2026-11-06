import { describe, expect, it } from 'vitest';
import { isReady, readiness, type EventDocumentForReadiness } from '../src/index.ts';

/** Shared cases: the Studio's lib/readiness.ts must give the same missing labels for each. */
const CASES: { name: string; ev: EventDocumentForReadiness; missing: string[] }[] = [
  {
    name: 'complete scheduled meetup',
    ev: {
      title: 'Forms',
      id: { current: 'nov' },
      status: 'scheduled',
      datetime: '2026-11-18T17:30:00Z',
      venue: { name: 'Venue AG' },
      description: 'x'.repeat(60),
      meetupUrl: 'https://meetup.com/x',
      talks: [{}],
    },
    missing: [],
  },
  {
    name: 'empty draft',
    ev: {},
    missing: ['Title', 'URL (ID)', 'Description (50+ characters)', 'Date and doors time', 'Venue', 'Programme (talks or agenda)', 'Meetup event link'],
  },
  { name: 'tbc needs month text only', ev: { title: 'T', id: { current: 't' }, status: 'tbc', description: 'x'.repeat(60) }, missing: ['Month text (e.g. “January 2027”)'] },
  {
    name: 'rsvp-soon has no Meetup link yet',
    ev: { title: 'T', id: { current: 't' }, status: 'rsvp-soon', datetime: '2026-12-01T17:30:00Z', location: 'Office', description: 'x'.repeat(60), agenda: [{}] },
    missing: [],
  },
  { name: 'cancelled only needs the basics', ev: { title: 'T', id: { current: 't' }, status: 'cancelled', description: 'short' }, missing: ['Description (50+ characters)'] },
];

describe('event readiness (same rules as the Studio)', () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(
        readiness(c.ev)
          .filter((x) => !x.ok)
          .map((x) => x.label),
      ).toEqual(c.missing);
      expect(isReady(c.ev)).toBe(c.missing.length === 0);
    });
  }
});
