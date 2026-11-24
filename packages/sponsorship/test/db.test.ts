/**
 * The sponsorship migration on a real (local) Postgres, after every earlier migration,
 * and the Postgres store against it. Skips when Postgres is not installed.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { DuplicateContact, TransitionError, postgresStore, type NewSponsor, type SponsorStore } from '../src/index.ts';

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
  paymentMode: 'card',
  status: 'pending',
  source: 'invited',
  startedAt: null,
  paidUntil: null,
  pricePerMeetup: null,
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
    expect(await store.search({ q: 'Ada' })).toHaveLength(0);
    expect(await store.search({ q: 'switzerland' })).toHaveLength(1);
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

  it('replaces a bundle of meetups, and links and clears Stripe ids', async () => {
    const s = (await store.search({ q: 'acme' }))[0]!;
    await store.setMeetups(
      s.id,
      [
        { eventId: 'e1', title: 'December', date: '2026-12-09' },
        { eventId: 'e2', title: 'January', date: '2027-01-13' },
      ],
      board,
    );
    const moved = await store.setMeetups(
      s.id,
      [
        { eventId: 'e2', title: 'January (moved)', date: '2027-01-20' },
        { eventId: 'e3', title: 'February', date: '2027-02-10' },
      ],
      board,
    );
    expect(moved).toEqual([
      { eventId: 'e2', title: 'January (moved)', date: '2027-01-20' },
      { eventId: 'e3', title: 'February', date: '2027-02-10' },
    ]);
    const linked = await store.linkStripe(s.id, { checkoutSessionId: 'cs_test_1', paymentLinkId: 'plink_1', paymentLinkUrl: 'https://buy.stripe.com/x' }, stripe);
    expect(linked).toMatchObject({ checkoutSessionId: 'cs_test_1', stripeSubscriptionId: 'sub_acme', paymentLinkId: 'plink_1' });
    expect((await store.byPaymentLink('plink_1'))?.id).toBe(s.id);
    const cleared = await store.linkStripe(s.id, { subscriptionId: null, checkoutSessionId: null }, stripe);
    expect(cleared).toMatchObject({ stripeSubscriptionId: null, checkoutSessionId: null, stripeCustomerId: 'cus_acme' });
    await store.log(s.id, 'payment_recorded', board, { amount: 840 });
    expect((await store.events(s.id)).at(-1)).toMatchObject({ type: 'payment_recorded', payload: { amount: 840 } });
  });

  it('creates a running import with its meetups, and moves a contact nobody accepted, in one statement', async () => {
    const { sponsor: globex } = await store.create({ ...acme, companyName: 'Globex' }, { email: 'hank@globex.com', name: 'Hank', role: 'primary' }, board);
    const pat = await store.addContact(globex.id, { email: 'pat@initech.com', name: 'Pat', role: 'other', addedBy: 'sponsor' }, sponsorActor);
    const { sponsor, contact } = await store.create(
      { ...acme, companyName: 'Initech', cycle: 'once', status: 'active', source: 'imported', paymentMode: 'manual', startedAt: '2026-11-01', paidUntil: '2026-12-10' },
      { email: 'pat@initech.com', name: 'Pat Doe', role: 'primary', addedBy: 'board' },
      board,
      { meetups: [{ eventId: 'e1', title: 'December', date: '2026-12-09' }], claimUnconfirmed: true },
    );
    expect(sponsor).toMatchObject({ status: 'active', paidUntil: '2026-12-10' });
    expect(contact).toMatchObject({ id: pat.id, sponsorId: sponsor.id, addedBy: 'board' });
    expect((await store.contacts(globex.id)).map((c) => c.email)).toEqual(['hank@globex.com']);
    expect(await store.meetups(sponsor.id)).toEqual([{ eventId: 'e1', title: 'December', date: '2026-12-09' }]);
    expect((await store.events(sponsor.id)).map((e) => e.type).sort()).toEqual(['created', 'meetups_set']);
    expect((await store.events(globex.id)).at(-1)).toMatchObject({ type: 'contact_removed', payload: { contactId: pat.id, movedTo: sponsor.id } });
    // A contact someone accepted (or the board added) is never moved.
    await expect(
      store.create({ ...acme, companyName: 'Other' }, { email: 'hank@globex.com', name: 'Hank', role: 'primary' }, board, { claimUnconfirmed: true }),
    ).rejects.toBeInstanceOf(DuplicateContact);
    expect(await store.search({ q: 'Other' })).toHaveLength(0);
  });

  it('writes a Stripe link only while the expected value is still there', async () => {
    const s = (await store.search({ q: 'Globex' }))[0]!;
    expect(await store.linkStripeIf(s.id, { paymentLinkId: null }, { paymentLinkId: 'plink_a', paymentLinkUrl: 'https://buy.stripe.com/a' }, stripe)).toMatchObject({
      paymentLinkId: 'plink_a',
    });
    expect(await store.linkStripeIf(s.id, { paymentLinkId: null }, { paymentLinkId: 'plink_b', paymentLinkUrl: 'https://buy.stripe.com/b' }, stripe)).toBeNull();
    expect(await store.linkStripeIf(s.id, { paymentLinkId: 'plink_a' }, { paymentLinkId: null, paymentLinkUrl: null }, stripe)).toMatchObject({ paymentLinkId: null });
    expect(await store.linkStripeIf(s.id, { paymentLinkId: null, status: 'active' }, { paymentLinkId: 'plink_c', paymentLinkUrl: 'https://buy.stripe.com/c' }, stripe)).toBeNull();
    expect(
      await store.linkStripeIf(s.id, { paymentLinkId: null, status: s.status }, { paymentLinkId: 'plink_c', paymentLinkUrl: 'https://buy.stripe.com/c' }, stripe),
    ).toMatchObject({
      paymentLinkId: 'plink_c',
    });
  });

  it('keeps a payment link attempt or switches it off, never both, even at the same time', async () => {
    const { sponsor: s } = await store.create({ ...acme, companyName: 'Initech', cycle: 'once' }, { email: 'ada@initech.ch', name: 'Ada', role: 'primary' }, board);
    const keep = (key: string, id: string) =>
      store.linkStripeIf(s.id, { paymentLinkId: null, status: 'pending', attempt: key }, { paymentLinkId: id, paymentLinkUrl: `https://buy.stripe.com/${id}` }, stripe);
    const a = await store.beginLinkAttempt(s.id, 'line_items[0][price]=price_1');
    const b = await store.beginLinkAttempt(s.id, 'line_items[0][price]=price_1');
    expect(a).toMatchObject({ sponsorId: s.id, state: 'open', linkId: null });
    await store.linkAttemptCreated(a.key, 'plink_a');
    await store.linkAttemptCreated(b.key, 'plink_b');
    // Kept and claimed for cleanup at the same moment: exactly one wins.
    const [kept, claimed] = await Promise.all([keep(a.key, 'plink_a'), store.claimLinkCleanup(a.key)]);
    expect([!!kept, claimed].filter(Boolean)).toHaveLength(1);
    const unsettled = await store.unsettledLinkAttempts({ sponsorId: s.id, limit: 10 });
    expect(unsettled.map((x) => x.key).sort()).toEqual((kept ? [b.key] : [a.key, b.key]).sort());
    // A second link is never kept over the first, and a kept one is never claimed.
    if (kept) {
      expect(await keep(b.key, 'plink_b')).toBeNull();
      expect(await store.claimLinkCleanup(a.key)).toBe(false);
    }
    expect(await store.claimLinkCleanup(b.key)).toBe(true);
    await store.linkAttemptClosed(b.key);
    expect(await store.unsettledLinkAttempts({ sponsorId: s.id, limit: 10 })).toHaveLength(kept ? 0 : 1);
    expect(await store.unsettledLinkAttempts({ sponsorId: 'not-a-uuid', limit: 10 })).toEqual([]);
  });

  it('keeps the audit log append-only', () => {
    expect(pgdb.fails('delete from sponsor_events')).toMatch(/append-only/);
  });

  it('records agreements, logos and contracts', async () => {
    const s = (await store.search({ q: 'acme' }))[0]!;
    const ag = await store.acceptAgreement(
      s.id,
      { version: '2026-11-18', signerName: 'Ada', signerTitle: 'CTO', signerEmail: 'ada@acme.ch', context: 'start', summary: 'Community Friend, quarterly' },
      sponsorActor,
    );
    expect(ag.acceptedAt).toMatch(/T/);
    expect((await store.agreements(s.id))[0]?.version).toBe('2026-11-18');

    const logo = await store.addLogo(
      s.id,
      { blobKey: `logos/${s.id}/1.svg`, contentType: 'image/svg+xml', bytes: 1200, filename: 'acme.svg', uploadedBy: 'ada@acme.ch' },
      sponsorActor,
    );
    expect((await store.getLogo(logo.id))?.filename).toBe('acme.svg');
    const doc = await store.addDocument(s.id, { blobKey: `contracts/${s.id}/1.pdf`, filename: 'contract.pdf', bytes: 5000, signedOn: '2026-11-10', uploadedBy: 'board' }, board);
    expect(doc).toMatchObject({ kind: 'contract', signedOn: '2026-11-10' });
    expect((await store.documents(s.id)).map((d) => d.id)).toEqual([doc.id]);
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
