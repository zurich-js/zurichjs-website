/**
 * The sponsorship migration on a real (local) Postgres, after every earlier migration,
 * and the Postgres store against it. Skips when Postgres is not installed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { DuplicateContact, NotFound, ProposalOpen, TransitionError, postgresStore, type NewSponsor, type SponsorStore } from '../src/index.ts';

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;

const board = { kind: 'board', id: 'admin' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;
const sponsorActor = { kind: 'sponsor', id: 'u-ada' } as const;

const acme: NewSponsor = {
  companyName: 'Acme',
  legalName: 'Acme Switzerland AG',
  billingAddress: 'Hardstrasse 1\n8005 Zürich',
  vatId: null,
  website: 'https://acme.ch',
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
  notes: 'Met at the conference',
};

d('sponsorship database', () => {
  const pgdb = db as Pg;
  let pool: pg.Pool;
  let store: SponsorStore;

  beforeAll(() => {
    for (const f of readdirSync(migrations).sort()) pgdb.sql(readFileSync(join(migrations, f), 'utf8'));
    pool = new pg.Pool({ ...pgdb.connection, max: 2 });
    store = postgresStore(pool);
  });
  afterAll(async () => {
    await pool?.end();
    pgdb.stop();
  });

  it('creates a sponsor and its first contact with an audit row, in one statement', async () => {
    const { sponsor, contact } = await store.create(acme, { email: 'Ada@Acme.ch', name: 'Ada', role: 'primary' }, board);
    expect(sponsor).toMatchObject({ companyName: 'Acme', status: 'pending', paidUntil: null, endsAt: null });
    expect(sponsor).not.toHaveProperty('sponsorRef');
    expect(contact).toMatchObject({ email: 'ada@acme.ch', sponsorId: sponsor.id, role: 'primary' });
    expect((await store.events(sponsor.id)).map((e) => e.type)).toEqual(['created']);
    await expect(store.create(acme, { email: 'ADA@acme.ch', name: 'Ada', role: 'primary' }, board)).rejects.toBeInstanceOf(DuplicateContact);
    // The failed create left no sponsor behind.
    expect(await store.search({ q: 'acme' })).toHaveLength(1);
  });

  it('links a contact to a sign-in user and finds the sponsor by user, email and search', async () => {
    pgdb.sql(`insert into "user" (id, name, email, "emailVerified") values ('u-ada', '', 'ada@acme.ch', true)`);
    const c = (await store.contactByEmail('ada@acme.ch'))!;
    await store.linkContact(c.id, 'u-ada');
    expect((await store.contactByUser('u-ada'))?.id).toBe(c.id);
    expect(await store.search({ q: 'Ada' })).toHaveLength(1);
    expect(await store.search({ q: 'nobody' })).toHaveLength(0);
    expect(await store.get('not-a-uuid')).toBeNull();
  });

  it('updates fields and dates, and moves through the statuses with compare-and-set', async () => {
    const s = (await store.search({ q: 'acme' }))[0]!;
    await store.linkStripe(s.id, { customerId: 'cus_acme', subscriptionId: 'sub_acme' }, stripe);
    const updated = await store.update(s.id, { paidUntil: '2027-02-18', startedAt: '2026-11-18' }, stripe);
    expect(updated).toMatchObject({ paidUntil: '2027-02-18', startedAt: '2026-11-18', stripeSubscriptionId: 'sub_acme' });
    await store.transition(s.id, { from: 'pending', to: 'active', actor: stripe });
    await expect(store.transition(s.id, { from: 'pending', to: 'active', actor: stripe })).rejects.toBeInstanceOf(TransitionError);
    const ending = await store.transition(s.id, { to: 'ending', actor: sponsorActor, endsAt: '2027-02-18' });
    expect(ending).toMatchObject({ status: 'ending', endsAt: '2027-02-18' });
    const ended = await store.transition(s.id, { to: 'ended', actor: stripe, reason: 'cancelled' });
    expect(ended).toMatchObject({ status: 'ended', endedReason: 'cancelled', endsAt: '2027-02-18' });
    expect((await store.byStripeSubscription('sub_acme'))?.id).toBe(s.id);
    const types = (await store.events(s.id)).map((e) => e.type);
    expect(types).toEqual(['created', 'stripe_linked', 'updated', 'status_changed', 'status_changed', 'status_changed']);
    const last = (await store.events(s.id)).at(-1)!;
    expect(last).toMatchObject({ fromStatus: 'ending', toStatus: 'ended', actor: stripe, payload: { reason: 'cancelled' } });
  });

  it('keeps the audit log append-only', () => {
    expect(pgdb.fails('delete from sponsor_events')).toMatch(/append-only/);
  });

  it('records agreements, one open proposal at a time, and logos', async () => {
    const s = (await store.search({ q: 'acme' }))[0]!;
    const ag = await store.acceptAgreement(
      s.id,
      { version: '2026-11-18', signerName: 'Ada', signerTitle: 'CTO', signerEmail: 'ada@acme.ch', context: 'start', summary: 'Community Friend, quarterly' },
      sponsorActor,
    );
    expect(ag.acceptedAt).toMatch(/T/);
    expect((await store.agreements(s.id))[0]?.version).toBe('2026-11-18');

    const p = await store.propose(s.id, { kind: 'plan', tier: 'builder', cycle: 'quarterly', message: 'As discussed', expiresAt: '2026-12-02T00:00:00Z' }, board);
    await expect(store.propose(s.id, { kind: 'end', tier: null, cycle: null, message: null, expiresAt: '2026-12-02T00:00:00Z' }, board)).rejects.toBeInstanceOf(ProposalOpen);
    const decided = await store.decideProposal(p.id, 'accepted', 'ada@acme.ch', sponsorActor);
    expect(decided.status).toBe('accepted');
    await expect(store.decideProposal(p.id, 'declined', 'ada@acme.ch', sponsorActor)).rejects.toBeInstanceOf(TransitionError);
    await expect(store.decideProposal('00000000-0000-0000-0000-000000000000', 'declined', 'x', sponsorActor)).rejects.toBeInstanceOf(NotFound);

    const logo = await store.addLogo(
      s.id,
      { blobKey: `logos/${s.id}/1.svg`, contentType: 'image/svg+xml', bytes: 1200, filename: 'acme.svg', uploadedBy: 'ada@acme.ch' },
      sponsorActor,
    );
    expect(logo.review).toBe('pending');
    expect((await store.reviewLogo(logo.id, 'approved', null, board)).review).toBe('approved');
    expect(pgdb.fails(`insert into sponsor_logos (sponsor_id, blob_key, content_type, bytes, filename, uploaded_by) values ('${s.id}', 'x', 'text/html', 10, 'x', 'x')`)).toMatch(
      /check/,
    );
  });

  it('handles each Stripe event once, separately from memberships', async () => {
    expect(await store.stripeEventSeen('evt_9')).toBe(false);
    await store.markStripeEvent('evt_9', 'invoice.paid');
    await store.markStripeEvent('evt_9', 'invoice.paid');
    expect(await store.stripeEventSeen('evt_9')).toBe(true);
    expect(pgdb.sql(`select count(*) from stripe_events where id = 'evt_9'`)).toBe('0');
  });
});
