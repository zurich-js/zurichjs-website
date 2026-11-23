/**
 * Covered meetups: the board confirms the meetups a recurring sponsorship covers, the sponsor sees
 * them with their state from Sanity, and nothing is deleted. In-memory store, Sanity faked.
 */
import { memoryStore, type NewSponsor, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAdminCoverage } from '../src/pages/api/membership/admin/sponsors/[id]/coverage.ts';
import { handleCoverage } from '../src/pages/api/sponsorship/coverage.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import type { LiveLookup } from '../src/server/sponsor-coverage.ts';

const ADMIN = 'admin-password-for-tests';
const env = { ADMIN_PASSWORD: ADMIN, BETTER_AUTH_URL: 'https://zurichjs.com', SLACK_SPONSORSHIP_CHANNEL_ID: 'C1' };
const NOW = new Date('2026-11-24T10:00:00Z');
const UPCOMING = [
  { id: 'event-dec', title: 'ZurichJS Meetup December', date: '2026-12-09' },
  { id: 'event-jan', title: 'ZurichJS Meetup January', date: '2027-01-13' },
];
const board = { kind: 'board', id: 'admin' } as const;
const grace = { id: 'user-grace', email: 'grace@acme.ch' };

const sponsor = (over: Partial<NewSponsor> = {}): NewSponsor => ({
  companyName: 'Acme',
  legalName: null,
  billingAddress: null,
  vatId: null,
  website: null,
  tier: 'builder',
  cycle: 'yearly',
  paymentMode: 'card',
  status: 'active',
  source: 'invited',
  startedAt: '2026-11-01',
  paidUntil: '2027-11-01',
  pricePerMeetup: null,
  notes: null,
  ...over,
});

const post = (path: string, body: unknown) =>
  new Request(`https://zurichjs.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://zurichjs.com', authorization: `Bearer ${ADMIN}` },
    body: JSON.stringify(body),
  });
const get = (path: string) => new Request(`https://zurichjs.com${path}`, { headers: { authorization: `Bearer ${ADMIN}` } });

describe('covered meetups', () => {
  let store: SponsorStore;
  let posts: string[];
  const slack: MembershipSlack = { post: async (t) => (posts.push(t), '1'), update: async () => undefined, reply: async () => undefined, ephemeral: async () => undefined };
  const admin = () => ({ env, store, slack, meetups: async () => UPCOMING, now: NOW.getTime() });
  const asSponsor = (live: LiveLookup) => ({ env, store, session: async () => grace, live, now: () => NOW });
  const path = (id: string) => `/api/membership/admin/sponsors/${id}/coverage`;

  beforeEach(() => {
    store = memoryStore({ now: () => NOW });
    posts = [];
  });

  it('confirms meetups for a recurring sponsorship, shows them to the sponsor with their state, and keeps history', async () => {
    const { sponsor: s } = await store.create(sponsor(), { email: grace.email, name: 'Grace', role: 'primary' }, board);
    // A past meetup the board confirmed earlier (directly, as an import would).
    await store.cover(s.id, { eventId: 'event-nov', title: 'ZurichJS Meetup November', date: '2026-11-12' }, board);

    const added = await handleAdminCoverage(post(path(s.id), { action: 'add', eventId: 'event-dec' }), s.id, admin());
    expect(added.status).toBe(200);
    await handleAdminCoverage(post(path(s.id), { action: 'add', eventId: 'event-jan' }), s.id, admin());
    expect(posts.at(-1)).toContain('now covers ZurichJS Meetup January');

    // Only upcoming, published meetups can be added.
    expect((await handleAdminCoverage(post(path(s.id), { action: 'add', eventId: 'event-unknown' }), s.id, admin())).status).toBe(400);

    const live: LiveLookup = async () => [
      { id: 'event-nov', title: 'ZurichJS Meetup November', datetime: '2026-11-12T17:30:00Z', status: 'scheduled' },
      { id: 'event-dec', title: 'ZurichJS Meetup December', datetime: '2026-12-09T17:30:00Z', status: 'cancelled' },
      { id: 'event-jan', title: 'ZurichJS Meetup January (new venue)', datetime: '2027-01-20T17:30:00Z', status: 'scheduled' },
    ];
    const seen = (await (await handleCoverage(new Request('https://zurichjs.com/api/sponsorship/coverage'), asSponsor(live))).json()) as Record<string, any>;
    expect(seen.checked).toBe(true);
    expect(seen.meetups.map((m: Record<string, string>) => [m.eventId, m.state, m.date])).toEqual([
      ['event-nov', 'past', '2026-11-12'],
      ['event-dec', 'cancelled', '2026-12-09'],
      ['event-jan', 'upcoming', '2027-01-20'],
    ]);
    expect(seen.meetups[2].title).toBe('ZurichJS Meetup January (new venue)');

    // A meetup that happened stays; an upcoming one is taken off but kept in the history.
    const past = await handleAdminCoverage(post(path(s.id), { action: 'remove', eventId: 'event-nov' }), s.id, admin());
    expect(past.status).toBe(409);
    expect(((await past.json()) as { error: string }).error).toMatch(/has happened/);
    expect((await handleAdminCoverage(post(path(s.id), { action: 'remove', eventId: 'event-dec' }), s.id, admin())).status).toBe(200);
    const history = (await (await handleAdminCoverage(get(path(s.id)), s.id, admin())).json()) as Record<string, any>;
    expect(history.coverage.map((r: Record<string, unknown>) => [r.eventId, r.removedBy])).toEqual([
      ['event-nov', null],
      ['event-dec', 'board'],
      ['event-jan', null],
    ]);
    expect(history.locked).toBeNull();
  });

  it('falls back to the stored meetups when Sanity cannot be reached', async () => {
    const { sponsor: s } = await store.create(sponsor(), { email: grace.email, name: 'Grace', role: 'primary' }, board);
    await store.cover(s.id, { eventId: 'event-dec', title: 'ZurichJS Meetup December', date: '2026-12-09' }, board);
    const down: LiveLookup = async () => {
      throw new Error('Sanity query failed: HTTP 503');
    };
    const r = (await (await handleCoverage(new Request('https://zurichjs.com/api/sponsorship/coverage'), asSponsor(down))).json()) as Record<string, any>;
    expect(r).toMatchObject({ ok: true, checked: false, meetups: [{ eventId: 'event-dec', state: 'upcoming', title: 'ZurichJS Meetup December' }] });
  });

  it('leaves one-time and ended sponsorships to their own rules, and refuses unknown sponsors and other sites', async () => {
    const { sponsor: once } = await store.create(sponsor({ cycle: 'once', status: 'pending' }), { email: 'o@acme.ch', name: 'O', role: 'primary' }, board);
    const r = await handleAdminCoverage(post(path(once.id), { action: 'add', eventId: 'event-dec' }), once.id, admin());
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toMatch(/one-time/);
    const { sponsor: ended } = await store.create(sponsor({ status: 'pending' }), { email: 'e@acme.ch', name: 'E', role: 'primary' }, board);
    await store.transition(ended.id, { to: 'ended', actor: board, reason: 'withdrawn' });
    expect((await handleAdminCoverage(post(path(ended.id), { action: 'add', eventId: 'event-dec' }), ended.id, admin())).status).toBe(409);
    expect((await handleAdminCoverage(get(path('nope')), 'nope', admin())).status).toBe(404);
    const foreign = new Request(`https://zurichjs.com${path(once.id)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example', authorization: `Bearer ${ADMIN}` },
      body: JSON.stringify({ action: 'add', eventId: 'event-dec' }),
    });
    expect((await handleAdminCoverage(foreign, once.id, admin())).status).toBe(403);
    // A signed-in person without a sponsorship gets no one's meetups.
    const stranger = { env, store, session: async () => ({ id: 'u-x', email: 'x@else.ch' }), live: async () => [] };
    expect((await handleCoverage(new Request('https://zurichjs.com/api/sponsorship/coverage'), stranger)).status).toBe(404);
  });
});
