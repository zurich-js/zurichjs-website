import { describe, expect, it } from 'vitest';
import { memoryStore, type Actor, type NewSponsor } from '@zurichjs/sponsorship';
import { sponsorshipRow } from '../src/server/sponsor-public.ts';
import { patchIsPublic, statusChangeIsPublic, withRebuilds } from '../src/server/sponsor-rebuild.ts';

const BOARD: Actor = { kind: 'board', id: 'test' };
const NEW: NewSponsor = {
  companyName: 'GYFF',
  legalName: null,
  billingAddress: null,
  vatId: null,
  website: null,
  tier: 'friend',
  cycle: 'yearly',
  paymentMode: 'manual',
  status: 'pending',
  source: 'imported',
  startedAt: null,
  paidUntil: null,
  pricePerMeetup: null,
  notes: null,
};

async function setup(queue?: (reason: string) => Promise<void>) {
  const queued: string[] = [];
  const store = withRebuilds(memoryStore(), queue ?? (async (r) => void queued.push(r)));
  const { sponsor } = await store.create(NEW, { email: 'a@example.com', name: 'A', role: 'primary' }, BOARD);
  return { store, id: sponsor.id, queued };
}

describe('a rebuild when a sponsorship changes what the site shows', () => {
  it('only running or not is a public status change', () => {
    expect(statusChangeIsPublic('pending', 'active')).toBe(true);
    expect(statusChangeIsPublic('active', 'ended')).toBe(true);
    expect(statusChangeIsPublic('ending', 'ended')).toBe(true);
    expect(statusChangeIsPublic('active', 'ending')).toBe(false);
    expect(statusChangeIsPublic('active', 'past_due')).toBe(false);
    expect(statusChangeIsPublic('pending', 'ended')).toBe(false);
    expect(statusChangeIsPublic('ended', 'pending')).toBe(false);
  });

  it('only the fields the site shows are a public change, and never while pending', () => {
    expect(patchIsPublic({ tier: 'builder' }, { status: 'active' })).toBe(true);
    expect(patchIsPublic({ partnerId: 'gyff' }, { status: 'ended' })).toBe(true);
    expect(patchIsPublic({ notes: 'x', paidUntil: '2027-01-01' }, { status: 'active' })).toBe(false);
    expect(patchIsPublic({ tier: 'builder' }, { status: 'pending' })).toBe(false);
  });

  it('queues when a sponsorship starts, changes tier and ends, and not in between', async () => {
    const { store, id, queued } = await setup();
    await store.update(id, { tier: 'builder', partnerId: 'gyff' }, BOARD);
    expect(queued).toHaveLength(0);
    await store.transition(id, { from: 'pending', to: 'active', actor: BOARD });
    expect(queued).toHaveLength(1);
    await store.update(id, { notes: 'called them' }, BOARD);
    expect(queued).toHaveLength(1);
    await store.update(id, { tier: 'champion' }, BOARD);
    expect(queued).toHaveLength(2);
    await store.transition(id, { from: 'active', to: 'ending', actor: BOARD, endsAt: '2027-01-01' });
    expect(queued).toHaveLength(2);
    await store.transition(id, { from: 'ending', to: 'ended', actor: BOARD, reason: 'cancelled' });
    expect(queued).toHaveLength(3);
  });

  it('a queue that fails never fails the change', async () => {
    const { store, id } = await setup(async () => Promise.reject(new Error('no blobs here')));
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      expect((await store.transition(id, { from: 'pending', to: 'active', actor: BOARD })).status).toBe('active');
    } finally {
      console.warn = warn;
    }
  });
});

describe('the build-time reader', () => {
  it('maps a row of the sponsors table', () => {
    expect(
      sponsorshipRow({ id: 'a', company_name: 'GYFF', website: null, tier: 'builder', status: 'active', partner_id: 'gyff', cycle: 'once', event_ids: ['event-dec'] }),
    ).toEqual({
      id: 'a',
      companyName: 'GYFF',
      website: null,
      tier: 'builder',
      status: 'active',
      partnerId: 'gyff',
      cycle: 'once',
      eventIds: ['event-dec'],
    });
  });
});
