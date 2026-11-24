/** /api/sponsorship/me's pendingChange and pendingChangeUnknown for each answer Stripe can give. */
import type { SponsorStore } from '@zurichjs/sponsorship';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleSponsorMe } from '../src/pages/api/sponsorship/me.ts';

const user = { id: 'usr_1', email: 'ana@acme.example' };
const contact = { id: 'c1', sponsorId: 's1', userId: user.id, name: 'Ana', email: user.email, role: 'primary' };
const sponsor = { id: 's1', companyName: 'Acme AG', cycle: 'yearly', tier: 'friend', status: 'active', paymentMode: 'card', stripeSubscriptionId: 'sub_1' };
const store = {
  contactByUser: async () => contact,
  get: async () => sponsor,
  contacts: async () => [contact],
  agreements: async () => [],
  logos: async () => [],
  documents: async () => [],
  meetups: async () => [],
} as unknown as SponsorStore;
const NOW = new Date('2026-11-19T12:00:00Z');
const later = Math.floor(Date.parse('2027-02-18T00:00:00Z') / 1000);
const current = { items: { data: [{ id: 'si_1', price: { id: 'price_f', lookup_key: 'sponsor_friend_yearly' } }] } };

const answer = async (reply: () => Response) => {
  const res = await handleSponsorMe(new Request('https://zurichjs.com/api/sponsorship/me'), {
    store,
    session: async () => user as never,
    env: { STRIPE_SECRET_KEY: 'sk_test_x' },
    fetch: (async () => reply()) as typeof fetch,
    now: () => NOW,
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  return { pendingChange: body.pendingChange, pendingChangeUnknown: body.pendingChangeUnknown };
};

describe('the scheduled change on /api/sponsorship/me', () => {
  afterEach(() => vi.restoreAllMocks());
  const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  it('is none when no schedule is attached', async () => {
    expect(await answer(() => Response.json({ ...current, schedule: null }))).toEqual({ pendingChange: null, pendingChangeUnknown: false });
  });

  it('is the change a readable schedule holds', async () => {
    const schedule = { id: 'sub_sched_1', metadata: { plan: 'sponsor_builder_yearly' }, phases: [{ end_date: later }] };
    expect(await answer(() => Response.json({ ...current, schedule }))).toEqual({
      pendingChange: { tier: 'builder', cycle: 'yearly', from: '2027-02-18' },
      pendingChangeUnknown: false,
    });
  });

  it('is none once the scheduled plan is the one billed now', async () => {
    const schedule = { id: 'sub_sched_1', metadata: { plan: 'sponsor_friend_yearly' }, phases: [] };
    expect(await answer(() => Response.json({ ...current, schedule }))).toEqual({ pendingChange: null, pendingChangeUnknown: false });
  });

  it('is unknown when Stripe fails', async () => {
    quiet();
    expect(await answer(() => new Response('down', { status: 503 }))).toEqual({ pendingChange: null, pendingChangeUnknown: true });
  });

  it('is unknown when the attached schedule comes back as an id only', async () => {
    quiet();
    expect(await answer(() => Response.json({ ...current, schedule: 'sub_sched_1' }))).toEqual({ pendingChange: null, pendingChangeUnknown: true });
  });

  it('is unknown when the attached schedule has no plan or first phase this site wrote', async () => {
    quiet();
    const schedule = { id: 'sub_sched_1', metadata: { plan: 'sponsor_builder_yearly' }, phases: [] };
    expect(await answer(() => Response.json({ ...current, schedule }))).toEqual({ pendingChange: null, pendingChangeUnknown: true });
    expect(await answer(() => Response.json({ ...current, schedule: { id: 'sub_sched_2', metadata: {}, phases: [{ end_date: later }] } }))).toEqual({
      pendingChange: null,
      pendingChangeUnknown: true,
    });
  });
});
