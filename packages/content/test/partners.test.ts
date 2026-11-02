import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { eventSupporters, eventThanks, groupPartners, type Event, type Partner } from '@zurichjs/events';
import { EVENT_SUPPORTERS, PARTNERS, PARTNER_RECORDS, REACH_STATS, SPONSORSHIP_TIERS, isDelisted, venueHost, withPartnerFallback } from '../src/index.ts';

const ev = (slug: string, venue?: string, extra: Partial<Event> = {}): Event => ({
  id: slug,
  slug,
  title: slug,
  status: 'scheduled',
  description: '',
  agenda: [],
  practical: [],
  photos: [],
  venue: venue ? { name: venue } : undefined,
  hosts: [],
  supporters: [],
  ...extra,
});

describe('production partner record', () => {
  it('every entry has a source and a logo that exists', () => {
    const pub = fileURLToPath(new URL('../../../apps/web/public', import.meta.url));
    for (const p of PARTNER_RECORDS) {
      expect(p.source, p.id).toMatch(/^old-/);
      expect(p.logo && existsSync(`${pub}${p.logo}`), `${p.id} logo ${p.logo}`).toBe(true);
    }
  });
  it('ids are unique and event supporters only name listed partners', () => {
    const ids = PARTNERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const list of Object.values(EVENT_SUPPORTERS)) for (const s of list) expect(ids).toContain(s.partnerId);
  });
  it('has no em dashes in copy', () => {
    const text = JSON.stringify([PARTNER_RECORDS, SPONSORSHIP_TIERS]);
    expect(text).not.toContain('—');
  });
  it('keeps production’s tier prices', () => {
    const price = (id: string, label: string) => SPONSORSHIP_TIERS.find((t) => t.id === id)?.prices.find((p) => p.label === label)?.amount;
    expect(price('champion', 'Yearly')).toBe('CHF 7’500');
    expect(price('builder', 'Monthly')).toBe('CHF 500');
    expect(price('friend', 'One-time')).toBe('CHF 400');
    expect(price('supporter', 'Yearly')).toBe('CHF 1’500');
    expect(price('host', 'Venue only')).toBe('Free');
  });
});

describe('withPartnerFallback', () => {
  it('uses Sanity partners whenever there are any, untouched', () => {
    const sanity: Partner[] = [{ id: 'acme', name: 'Acme', kinds: ['venue'], current: false }];
    const events = [ev('sep-2026', 'GetYourGuide')];
    const r = withPartnerFallback(sanity, events);
    expect(r.source).toBe('sanity');
    expect(r.partners).toEqual(sanity);
    expect(r.events).toBe(events);
  });

  it('withdraws Vercel, Ginetta and Code Blossom even when Sanity marks them current', () => {
    const sanity: Partner[] = [
      { id: 'vercel', name: 'Vercel', kinds: ['sponsor'], tier: 'champion', current: true },
      { id: 'abc123', name: 'Code Blossom', kinds: ['community'], current: true },
      { id: 'stripe', name: 'Stripe', kinds: ['sponsor'], tier: 'builder', current: true },
    ];
    const r = withPartnerFallback(sanity, []);
    expect(r.partners.map((p) => [p.name, p.current, !!p.delisted])).toEqual([
      ['Vercel', false, true],
      ['Code Blossom', false, true],
      ['Stripe', true, false],
    ]);
    expect(groupPartners(r.partners).currentSponsors.map((p) => p.name)).toEqual(['Stripe']);
  });

  it('falls back to the production record when Sanity has no partners', () => {
    const r = withPartnerFallback([], [ev('sep-2026', 'GetYourGuide'), ev('july-2026', 'Smallpdf AG'), ev('zurichjs-2nd-anniversary', 'SAE Institute Zurich')]);
    expect(r.source).toBe('code');
    expect(r.partners).toBe(PARTNERS);
    const [sep, july, nov] = r.events;
    expect(sep!.hosts).toEqual(['getyourguide']);
    expect(sep!.supporters?.map((s) => `${s.partnerId}:${s.role}`)).toEqual(['getyourguide:venue', 'gyff:sponsor', 'fin:sponsor']);
    expect(july!.hosts).toEqual(['smallpdf']);
    expect(july!.supporters).toEqual([]);
    // A venue that is not a partner gets no host: nothing is guessed.
    expect(nov!.hosts).toEqual([]);
  });

  it('never overrides hosts or supporters an event already has', () => {
    const own = ev('sep-2026', 'GetYourGuide', { hosts: ['novu'], supporters: [{ partnerId: 'stripe', role: 'food' }] });
    const [e] = withPartnerFallback([], [own]).events;
    expect(e!.hosts).toEqual(['novu']);
    expect(e!.supporters).toEqual([{ partnerId: 'stripe', role: 'food' }]);
  });

  it('feeds the event page and Tonight page supporter lists', () => {
    const r = withPartnerFallback([], [ev('sep-2026', 'GetYourGuide')]);
    expect(eventSupporters(r.events[0]!, r.partners).map((s) => s.partner.name)).toEqual(['GetYourGuide', 'GYFF', 'FIN']);
  });
});

describe('venueHost', () => {
  it('matches the venue partner named in an event location', () => {
    expect(venueHost('novu ag – Webagentur Zürich', PARTNERS)).toBe('novu');
    expect(venueHost('ORBIZ Josef, Zürich', PARTNERS)).toBe('orbiz-josef');
    expect(venueHost('GetYourGuide Zurich', PARTNERS)).toBe('getyourguide');
    expect(venueHost('Ginetta, Zurich', PARTNERS)).toBe('ginetta');
    expect(venueHost('Josefwiese Park', PARTNERS)).toBeUndefined();
    expect(venueHost(undefined, PARTNERS)).toBeUndefined();
  });
});

describe('groupPartners on the production record', () => {
  const g = groupPartners(PARTNERS);
  const names = (l: Partner[]) => l.map((p) => p.name);
  it('lists current sponsors by tier, highest first', () => {
    expect(g.sponsorsByTier.map((t) => [t.tier, names(t.partners)])).toEqual([
      ['builder', ['Stripe']],
      ['supporter', ['FIN', 'GYFF']],
    ]);
  });
  it('separates venues, conference, community and supporting partners as production does', () => {
    expect(names(g.venues)).toEqual(['GetYourGuide', 'novu AG', 'Orbiz Josef Zurich', 'Smallpdf'].sort((a, b) => a.localeCompare(b)));
    expect(names(g.conferences)).toEqual(['CityJS', 'Grusp', 'iJS Munich', 'WhatTheStack']);
    expect(names(g.communities)).toEqual(['Web Zurich']);
    expect(names(g.supporting)).toEqual(['JetBrains', 'Swiss Dev Jobs']);
  });
  it('keeps previous supporters out of the current lists', () => {
    expect(names([...g.pastSponsors, ...g.pastPartners])).toEqual(['Dynatrace', 'DotJS', 'React Paris', 'Voxxed Days Zurich']);
    expect(names(g.currentSponsors)).not.toContain('Dynatrace');
  });
});

describe('owner decision of 2nd November 2026: Vercel, Ginetta and Code Blossom are not promoted', () => {
  const WITHDRAWN = ['Vercel', 'Ginetta', 'Code Blossom'];
  it('are marked withdrawn and not current in the record', () => {
    for (const name of WITHDRAWN) {
      const p = PARTNERS.find((x) => x.name === name)!;
      expect(p.current, name).toBe(false);
      expect(isDelisted(p), name).toBe(true);
    }
  });
  it('appear in no partner list, current or previous', () => {
    const g = groupPartners(PARTNERS);
    const all = Object.values(g)
      .flatMap((v) => (Array.isArray(v) ? v : []))
      .flatMap((x: Partner | { partners: Partner[] }) => ('partners' in x ? x.partners : [x]));
    for (const name of WITHDRAWN) expect(all.map((p) => p.name)).not.toContain(name);
  });
  it('a past event they hosted still names them; an upcoming one does not', () => {
    const { events, partners } = withPartnerFallback([], [ev('early', 'Ginetta, Zurich'), ev('soon', 'Ginetta, Zurich')]);
    expect(eventThanks(events[0]!, partners, { past: true }).own.map((s) => s.partner.name)).toEqual(['Ginetta']);
    expect(eventThanks(events[1]!, partners, { past: false }).own).toEqual([]);
  });
});

describe('eventThanks', () => {
  const { events, partners } = withPartnerFallback([], [ev('sep-2026', 'GetYourGuide'), ev('july-2026', 'Smallpdf AG')]);
  it('an upcoming event adds this season’s sponsors after its own supporters, once each', () => {
    const t = eventThanks(events[0]!, partners, { past: false });
    expect(t.own.map((s) => s.partner.name)).toEqual(['GetYourGuide', 'GYFF', 'FIN']);
    expect(t.season.map((p) => p.name)).toEqual(['Stripe']);
  });
  it('a past event thanks only its own hosts and supporters', () => {
    const t = eventThanks(events[1]!, partners, { past: true });
    expect(t.own.map((s) => s.partner.name)).toEqual(['Smallpdf']);
    expect(t.season).toEqual([]);
  });
});

describe('the offering', () => {
  it('no longer promises a workshop (workshops are discontinued)', () => {
    expect(JSON.stringify(SPONSORSHIP_TIERS)).not.toMatch(/workshop/i);
  });
  it('yearly is ten times monthly for every tier (2 months free)', () => {
    const n = (s?: string) => Number(s?.replace(/\D/g, ''));
    for (const t of SPONSORSHIP_TIERS.filter((x) => x.id !== 'host')) {
      const yearly = t.prices.find((p) => p.label === 'Yearly')!;
      expect(n(yearly.amount), t.id).toBe(10 * n(t.prices.find((p) => p.label === 'Monthly')?.amount));
      expect(yearly.note).toBe('2 months free');
    }
  });
  it('calls the peak a count of RSVPs, not a rate', () => {
    expect(REACH_STATS.find((r) => r.value === '114')?.label).not.toMatch(/rate/);
  });
});
