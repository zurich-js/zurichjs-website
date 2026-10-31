import { describe, expect, it } from 'vitest';
import type { Event } from '@zurichjs/events';
import { buildMeta, canonicalUrl, eventSchema, llmsTxt, sitemapXml } from '../src';

const ev: Event = {
  id: 'e1',
  slug: 'forms-types',
  title: 'Forms & types',
  status: 'scheduled',
  startsAt: '2026-11-18T18:30:00+01:00',
  venue: { name: 'Venue AG', city: 'Zürich' },
  meetupUrl: 'https://www.meetup.com/zurich-js/events/1/',
  description: 'Two talks.',
  agenda: [{ time: '18:30', title: 'Typed forms', talk: { title: 'Typed forms', speakerIds: ['ada'], format: 'talk', durationMin: 25 } }],
  practical: [],
  photos: [{ src: '/images/a.jpg', alt: 'a' }],
};

describe('seo', () => {
  it('builds absolute canonical and OG URLs without query strings', () => {
    expect(canonicalUrl('/events/?tab=past')).toBe('https://zurichjs.com/events');
    expect(canonicalUrl('/')).toBe('https://zurichjs.com');
    const m = buildMeta({ title: 'T', description: 'D', path: '/speakers/ada', image: '/og/ada.png' });
    expect(m.meta).toContainEqual({ property: 'og:url', content: 'https://zurichjs.com/speakers/ada' });
    expect(m.meta).toContainEqual({ property: 'og:image', content: 'https://zurichjs.com/og/ada.png' });
  });
  it('emits Event JSON-LD with a free offer and performers', () => {
    const j = eventSchema(ev, [{ id: 'ada', name: 'Ada', role: '', initials: 'A', bio: '', topics: [], tagline: '', links: [], talks: [] }])!;
    expect(j['@type']).toBe('Event');
    expect(j.offers).toMatchObject({ price: 0, priceCurrency: 'CHF' });
    expect(j.performer).toEqual([{ '@type': 'Person', name: 'Ada', url: 'https://zurichjs.com/speakers/ada' }]);
    expect(eventSchema({ ...ev, startsAt: undefined }, [])).toBeNull();
  });
  it('escapes sitemap URLs', () => {
    expect(sitemapXml([{ path: '/a&b', priority: 0.5 }])).toContain('<loc>https://zurichjs.com/a&amp;b</loc>');
  });
  it('writes llms.txt with upcoming events', () => {
    const t = llmsTxt({ events: [ev], speakers: [], pages: [{ title: 'Events', path: '/events', summary: 'All meetups' }], now: new Date('2026-11-01') });
    expect(t.startsWith('# ZurichJS\n')).toBe(true);
    expect(t).toContain('- [Forms & types](https://zurichjs.com/events/forms-types): Wed 18 Nov 2026 · Venue AG, Zürich');
  });
});
