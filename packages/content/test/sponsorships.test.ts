import { describe, expect, it } from 'vitest';
import { eventThanks, groupPartners, type Event, type Partner } from '@zurichjs/events';
import { PARTNERS, applySponsorships, loadContent, resetContentCache, withSponsorships, type SiteContent, type SponsorshipRow } from '../src/index.ts';

const row = (over: Partial<SponsorshipRow> = {}): SponsorshipRow => ({
  id: '0b0e4c1e-0000-4000-8000-000000000001',
  companyName: 'GYFF',
  website: 'https://www.gyffted.com',
  tier: 'builder',
  status: 'active',
  partnerId: 'gyff',
  ...over,
});
const find = (list: Partner[], id: string) => list.find((p) => p.id === id)!;
const content = (partners: Partner[] = PARTNERS) => ({ source: 'sanity', partners }) as SiteContent;

describe('applySponsorships', () => {
  it('without sponsorships the partner list stands', () => {
    expect(applySponsorships(PARTNERS, [])).toEqual({ partners: PARTNERS, events: [], notes: [] });
  });

  it('a running sponsorship sets the tier and current, and keeps the logo, colour, link and words', () => {
    const before = find(PARTNERS, 'gyff');
    const { partners, notes } = applySponsorships(PARTNERS, [row({ tier: 'champion' })]);
    const { tier, current, ...rest } = find(partners, 'gyff');
    const { tier: _t, current: _c, ...restBefore } = before;
    expect({ tier, current }).toEqual({ tier: 'champion', current: true });
    expect(rest).toEqual(restBefore);
    expect(notes).toEqual([]);
    // Everyone else is untouched, and GYFF is listed with the Champions.
    expect(partners.filter((p) => p.id !== 'gyff')).toEqual(PARTNERS.filter((p) => p.id !== 'gyff'));
    expect(groupPartners(partners).sponsorsByTier[0]).toMatchObject({ tier: 'champion', partners: [{ id: 'gyff' }] });
  });

  it.each(['active', 'past_due', 'ending'])('%s counts as running', (status) => {
    expect(find(applySponsorships(PARTNERS, [row({ status })]).partners, 'gyff')).toMatchObject({ tier: 'builder', current: true });
  });

  it('a pending sponsorship changes nothing', () => {
    expect(applySponsorships(PARTNERS, [row({ status: 'pending' })]).partners).toEqual(PARTNERS);
  });

  it('makes a past sponsor current again, and a host a sponsor too', () => {
    const { partners } = applySponsorships(PARTNERS, [
      row({ partnerId: 'vercel', companyName: 'Vercel', tier: 'friend' }),
      row({ id: 'x', partnerId: 'novu', companyName: 'novu', tier: 'supporter' }),
    ]);
    expect(find(partners, 'vercel')).toMatchObject({ tier: 'friend', current: true });
    expect(find(partners, 'novu')).toMatchObject({ tier: 'supporter', current: true, kinds: ['sponsor', 'venue'] });
    expect(groupPartners(partners).currentSponsors.map((p) => p.id)).toEqual(expect.arrayContaining(['vercel', 'novu']));
  });

  it('an ended sponsorship makes the partner a past sponsor without a tier', () => {
    const { partners } = applySponsorships(PARTNERS, [row({ status: 'ended' })]);
    const gyff = find(partners, 'gyff');
    expect(gyff.current).toBe(false);
    expect(gyff.tier).toBeUndefined();
    expect(gyff.logo).toBe(find(PARTNERS, 'gyff').logo);
    const g = groupPartners(partners);
    expect(g.currentSponsors.map((p) => p.id)).not.toContain('gyff');
    expect(g.pastSponsors.map((p) => p.id)).toContain('gyff');
  });

  it('a running sponsorship wins over an ended one, and the highest running tier counts', () => {
    const rows = [row({ id: 'a', status: 'ended', tier: 'champion' }), row({ id: 'b', tier: 'supporter' }), row({ id: 'c', tier: 'builder', status: 'ending' })];
    expect(find(applySponsorships(PARTNERS, rows).partners, 'gyff')).toMatchObject({ tier: 'builder', current: true });
  });

  it('an ended sponsorship leaves a host a current host', () => {
    const sae = find(applySponsorships(PARTNERS, [row({ partnerId: 'sae-institute', status: 'ended' })]).partners, 'sae-institute');
    expect(sae).toMatchObject({ current: true, kinds: ['venue'] });
  });

  it('never brings back a partner withdrawn from promotion', () => {
    const { partners, notes } = applySponsorships(PARTNERS, [
      row({ partnerId: 'ginetta', companyName: 'Ginetta' }),
      row({ id: 'x', partnerId: null, companyName: 'Code Blossom' }),
    ]);
    expect(partners).toEqual(PARTNERS);
    expect(notes).toHaveLength(1);
    expect(groupPartners(partners).currentSponsors.map((p) => p.name)).not.toContain('Code Blossom');
  });

  it('a running sponsor without a partner record is listed by name, without a logo', () => {
    const acme = row({ id: 'abc', companyName: 'Acme AG', website: 'https://acme.example', partnerId: null, tier: 'friend' });
    const other = row({ id: 'def', companyName: 'Initech', website: 'javascript:alert(1)', partnerId: 'initech', tier: 'supporter' });
    const { partners, notes } = applySponsorships(PARTNERS, [acme, other]);
    expect(find(partners, 'sponsor-abc')).toEqual({ id: 'sponsor-abc', name: 'Acme AG', url: 'https://acme.example/', kinds: ['sponsor'], tier: 'friend', current: true });
    // An id that matches no partner record is kept as the id; a website that is not a web address is dropped.
    expect(find(partners, 'initech')).toEqual({ id: 'initech', name: 'Initech', url: undefined, kinds: ['sponsor'], tier: 'supporter', current: true });
    expect(notes).toHaveLength(2);
    expect(
      groupPartners(partners)
        .sponsorsByTier.find((g) => g.tier === 'friend')!
        .partners.map((p) => p.id),
    ).toContain('sponsor-abc');
  });

  it('an ended or pending sponsor without a partner record is not listed', () => {
    const rows = [row({ id: 'a', companyName: 'Acme AG', partnerId: null, status: 'ended' }), row({ id: 'b', companyName: 'Initech', partnerId: null, status: 'pending' })];
    expect(applySponsorships(PARTNERS, rows)).toEqual({ partners: PARTNERS, events: [], notes: [] });
  });

  it('a sponsor named like a partner but not linked is not added a second time, and never matched by name', () => {
    const { partners, notes } = applySponsorships(PARTNERS, [row({ partnerId: null, tier: 'champion' })]);
    expect(partners).toEqual(PARTNERS);
    expect(notes[0]).toContain('Partner id');
  });

  it('ignores a tier it does not know', () => {
    expect(applySponsorships(PARTNERS, [row({ tier: 'platinum' })]).partners).toEqual(PARTNERS);
  });
});

describe('one-time sponsorships', () => {
  const ev = (id: string) => ({ id, slug: id, title: id, status: 'scheduled', supporters: [] }) as unknown as Event;
  const once = row({ cycle: 'once', eventIds: ['event-dec'] });

  it('are current for their paid term and thanked on their meetups, not as season sponsors of the others', () => {
    const { partners, events } = applySponsorships(PARTNERS, [once], [ev('event-dec'), ev('event-jan')]);
    expect(find(partners, 'gyff')).toMatchObject({ current: true, tier: 'builder', coverage: ['event-dec'] });
    const [dec, jan] = events;
    expect(dec!.supporters).toEqual([{ partnerId: 'gyff', role: 'sponsor' }]);
    expect(eventThanks(dec!, partners, { past: false }).own.map((s) => s.partner.id)).toContain('gyff');
    expect(eventThanks(jan!, partners, { past: false }).season.map((p) => p.id)).not.toContain('gyff');
    expect(eventThanks(jan!, partners, { past: false }).own.map((s) => s.partner.id)).not.toContain('gyff');
  });

  it('a recurring sponsorship next to a one-time one makes a season sponsor', () => {
    const { partners, events } = applySponsorships(PARTNERS, [once, row({ cycle: 'yearly' })], [ev('event-jan')]);
    expect(find(partners, 'gyff').coverage).toBeUndefined();
    expect(eventThanks(events[0]!, partners, { past: false }).season.map((p) => p.id)).toContain('gyff');
  });

  it('an unlinked one-time sponsor is listed by name on its meetup', () => {
    const { partners, events } = applySponsorships(PARTNERS, [row({ partnerId: null, companyName: 'Umbrella', cycle: 'once', eventIds: ['event-dec'] })], [ev('event-dec')]);
    const id = `sponsor-${once.id}`;
    expect(find(partners, id)).toMatchObject({ name: 'Umbrella', coverage: ['event-dec'] });
    expect(events[0]!.supporters).toEqual([{ partnerId: id, role: 'sponsor' }]);
  });
});

describe('a sponsor that also hosted', () => {
  it('is listed with the sponsors only while current', () => {
    const host = { id: 'globex', name: 'Globex', kinds: ['sponsor', 'venue'], tier: 'friend', current: true } as Partner;
    const groups = groupPartners([host]);
    expect(groups.currentSponsors.map((p) => p.id)).toEqual(['globex']);
    expect(groups.venues).toEqual([]);
  });
});

describe('withSponsorships (the fallback)', () => {
  const logs: string[] = [];
  const log = (m: string) => logs.push(m);

  it('applies the database', async () => {
    const c = await withSponsorships(content(), {}, async () => [row({ tier: 'champion' })], { log });
    expect(find(c.partners, 'gyff').tier).toBe('champion');
  });

  it('keeps the partner list without a reader or without a database', async () => {
    const c = content();
    expect(await withSponsorships(c, {}, undefined)).toBe(c);
    expect(await withSponsorships(c, {}, async () => null)).toBe(c);
  });

  it('keeps the partner list and warns when the database cannot be read', async () => {
    logs.length = 0;
    const c = content();
    const failing = async () => Promise.reject(new Error('connect ECONNREFUSED'));
    expect(await withSponsorships(c, { CONTEXT: 'production' }, failing, { log })).toBe(c);
    expect(logs.join()).toContain('ECONNREFUSED');
    expect(find(c.partners, 'gyff').tier).toBe('friend');
  });

  it('keeps the partner list when the database does not answer in time', async () => {
    logs.length = 0;
    const c = content();
    const hanging = () => new Promise<SponsorshipRow[]>(() => undefined);
    expect(await withSponsorships(c, {}, hanging, { log, timeoutMs: 10 })).toBe(c);
    expect(logs.join()).toContain('no answer');
  });
});

describe('loadContent with sponsorships', () => {
  it('sample content never reads the database', async () => {
    resetContentCache();
    let read = false;
    const c = await loadContent({ CONTENT_SOURCE: 'sample' }, undefined, async () => {
      read = true;
      return [row({ tier: 'champion' })];
    });
    expect(read).toBe(false);
    expect(find(c.partners, 'gyff').tier).toBe('friend');
    resetContentCache();
  });

  it('applies the database to content from Sanity, and a failing database does not fail the build', async () => {
    resetContentCache();
    const viaDb = await loadContent(
      { CONTEXT: 'production' },
      async () => content(),
      async () => [row({ tier: 'champion' })],
    );
    expect(find(viaDb.partners, 'gyff').tier).toBe('champion');
    resetContentCache();
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      const without = await loadContent(
        { CONTEXT: 'production' },
        async () => content(),
        async () => Promise.reject(new Error('down')),
      );
      expect(find(without.partners, 'gyff').tier).toBe('friend');
    } finally {
      console.warn = warn;
      resetContentCache();
    }
  });
});
