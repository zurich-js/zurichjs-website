import { describe, expect, it } from 'vitest';
import {
  TransitionError,
  changeTiming,
  checkTransition,
  chf,
  feeLabel,
  fromLookupKey,
  memoryStore,
  priceLookupKey,
  ProposalOpen,
  DuplicateContact,
  TIERS,
  type NewSponsor,
} from '../src/index.ts';

const acme: NewSponsor = {
  companyName: 'Acme',
  legalName: null,
  billingAddress: null,
  vatId: null,
  website: null,
  tier: 'friend',
  cycle: 'quarterly',
  paymentMode: 'invoice',
  status: 'pending',
  source: 'invited',
  startedAt: null,
  paidUntil: null,
  eventId: null,
  eventTitle: null,
  eventDate: null,
  notes: null,
};
const board = { kind: 'board', id: 'admin' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;
const sponsor = { kind: 'sponsor', id: 'u1' } as const;

describe('tiers and fees', () => {
  it('has the owner’s quarterly prices and production’s others', () => {
    expect(TIERS.map((t) => [t.key, t.fees.quarterly])).toEqual([
      ['supporter', 420],
      ['friend', 840],
      ['builder', 1400],
      ['champion', 2100],
    ]);
    for (const t of TIERS) expect(t.fees.yearly).toBe(t.fees.monthly * 10);
  });
  it('writes amounts like /partners and round-trips lookup keys', () => {
    expect(chf(7500)).toBe('CHF 7’500');
    expect(feeLabel('champion', 'once')).toBe('CHF 1’000 for one meetup');
    expect(feeLabel('friend', 'quarterly')).toBe('CHF 840 a quarter');
    expect(fromLookupKey(priceLookupKey('builder', 'yearly'))).toEqual({ tier: 'builder', cycle: 'yearly' });
    expect(fromLookupKey('member_basic_yearly')).toBeNull();
  });
  it('applies upgrades on the same cycle now, everything else at renewal', () => {
    expect(changeTiming({ tier: 'friend', cycle: 'monthly' }, { tier: 'builder', cycle: 'monthly' })).toBe('now');
    expect(changeTiming({ tier: 'builder', cycle: 'monthly' }, { tier: 'friend', cycle: 'monthly' })).toBe('renewal');
    expect(changeTiming({ tier: 'friend', cycle: 'monthly' }, { tier: 'builder', cycle: 'yearly' })).toBe('renewal');
    expect(changeTiming({ tier: 'friend', cycle: 'monthly' }, { tier: 'friend', cycle: 'monthly' })).toBe('none');
  });
});

describe('status machine', () => {
  it('lets only Stripe or the board start a sponsorship, and needs a reason to end one', () => {
    expect(() => checkTransition({ status: 'pending' }, 'active', 'sponsor')).toThrow(TransitionError);
    expect(checkTransition({ status: 'pending' }, 'active', 'board').to).toBe('active');
    expect(() => checkTransition({ status: 'active' }, 'ended', 'board')).toThrow(/why/);
    expect(() => checkTransition({ status: 'active' }, 'ended', 'stripe', 'terminated')).toThrow(/cannot end/);
    expect(checkTransition({ status: 'active' }, 'ended', 'script', 'completed').endedReason).toBe('completed');
  });
  it('lets the sponsor end and undo, never end outright', () => {
    expect(checkTransition({ status: 'active' }, 'ending', 'sponsor').to).toBe('ending');
    expect(checkTransition({ status: 'ending' }, 'active', 'sponsor').to).toBe('active');
    expect(() => checkTransition({ status: 'active' }, 'ended', 'sponsor', 'cancelled')).toThrow(TransitionError);
  });
});

describe('memory store', () => {
  it('creates a sponsor with its contact, and keeps emails unique', async () => {
    const store = memoryStore();
    const { sponsor: s, contact } = await store.create(acme, { email: ' Ada@Acme.ch ', name: 'Ada', role: 'primary' }, board);
    expect(contact.email).toBe('ada@acme.ch');
    expect((await store.contactByEmail('ADA@acme.ch'))?.sponsorId).toBe(s.id);
    await expect(store.addContact(s.id, { email: 'ada@acme.ch', name: 'x', role: 'other' }, board)).rejects.toBeInstanceOf(DuplicateContact);
    expect((await store.search({ q: 'ada' })).map((x) => x.id)).toEqual([s.id]);
  });
  it('records ending dates and clears them on undo', async () => {
    const store = memoryStore();
    const { sponsor: s } = await store.create(acme, { email: 'a@acme.ch', name: 'A', role: 'primary' }, board);
    await store.transition(s.id, { from: 'pending', to: 'active', actor: stripe });
    const ending = await store.transition(s.id, { to: 'ending', actor: sponsor, endsAt: '2027-01-01' });
    expect(ending).toMatchObject({ status: 'ending', endsAt: '2027-01-01' });
    expect(ending.endRequestedAt).not.toBeNull();
    const back = await store.transition(s.id, { from: 'ending', to: 'active', actor: sponsor });
    expect(back).toMatchObject({ endsAt: null, endRequestedAt: null });
    await expect(store.transition(s.id, { from: 'ending', to: 'active', actor: sponsor })).rejects.toThrow(/changed/);
  });
  it('allows one open proposal, answered once', async () => {
    const store = memoryStore();
    const { sponsor: s } = await store.create(acme, { email: 'a@acme.ch', name: 'A', role: 'primary' }, board);
    const p = await store.propose(s.id, { kind: 'plan', tier: 'builder', cycle: 'quarterly', message: null, expiresAt: '2026-12-02T00:00:00Z' }, board);
    await expect(store.propose(s.id, { kind: 'end', tier: null, cycle: null, message: null, expiresAt: '2026-12-02T00:00:00Z' }, board)).rejects.toBeInstanceOf(ProposalOpen);
    await store.decideProposal(p.id, 'accepted', 'a@acme.ch', sponsor);
    await expect(store.decideProposal(p.id, 'declined', 'a@acme.ch', sponsor)).rejects.toThrow(/changed/);
  });
});
