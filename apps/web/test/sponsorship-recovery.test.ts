/**
 * Board actions on sponsorships that fail half-way: what is saved, what Stripe still accepts, and
 * whether the same request again finishes the job. Real handlers on the in-memory store, Stripe
 * and Resend faked with state and injected failures (sponsor-faults.ts).
 */
import { AGREEMENT, memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAddSponsor } from '../src/pages/api/membership/admin/sponsors/index.ts';
import { handleUpdateSponsor } from '../src/pages/api/membership/admin/sponsors/[id]/index.ts';
import { handleBoardEnd } from '../src/pages/api/membership/admin/sponsors/[id]/end.ts';
import { handleBundle } from '../src/pages/api/membership/admin/sponsors/[id]/bundle.ts';
import { handleAttachContract } from '../src/pages/api/membership/admin/sponsors/[id]/contracts/index.ts';
import { handleAdminAddContact } from '../src/pages/api/membership/admin/sponsors/[id]/contacts/index.ts';
import { handlePaymentLink } from '../src/pages/api/membership/admin/sponsors/[id]/payment-link.ts';
import { handleRecordPayment } from '../src/pages/api/membership/admin/sponsors/[id]/payment.ts';
import { handleInvitedPlan } from '../src/pages/api/membership/admin/sponsors/[id]/plan.ts';
import { handleStart } from '../src/pages/api/sponsorship/start.ts';
import { dailyCheck } from '../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../src/server/sponsor-route.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';
import { MEETUPS, NOW, answer, asAdmin, asAdminForm, env, faulty, newSponsor, pdf, post, world } from './sponsor-faults.ts';

const BOARD = { kind: 'board', id: 'admin' } as const;
const grace = { id: 'user-grace', email: 'grace@acme.ch' };
const contact = { email: 'grace@acme.ch', name: 'Grace Hopper', role: 'primary', addedBy: 'board' } as const;

describe('sponsorship board actions that fail half-way', () => {
  let w: ReturnType<typeof world>;
  let fs: ReturnType<typeof faulty>;
  let store: SponsorStore;
  const deps = () => ({ env, store, fetch: w.f, slack: w.slack, logos: w.logos, meetups: async () => MEETUPS, now: NOW.getTime() });

  async function runningCard() {
    const { sponsor } = await store.create(newSponsor({ status: 'active', startedAt: '2026-11-18', paidUntil: '2027-02-18' }), contact, BOARD);
    await store.linkStripe(sponsor.id, { customerId: 'cus_acme', subscriptionId: 'sub_acme' }, BOARD);
    w.live.add('sub_acme');
    return sponsor.id;
  }

  async function pendingBundle(meetups = MEETUPS, email = 'ada@umbrella.com') {
    const { sponsor } = await store.create(newSponsor({ companyName: 'Umbrella', cycle: 'once', pricePerMeetup: 500 }), { ...contact, email }, BOARD, {
      meetups: meetups.map((m) => ({ eventId: m.id, title: m.title, date: m.date })),
    });
    await store.addDocument(sponsor.id, { blobKey: 'contracts/x.pdf', filename: 'contract.pdf', bytes: 10, signedOn: null, uploadedBy: 'board' }, BOARD);
    return sponsor.id;
  }

  beforeEach(() => {
    w = world();
    fs = faulty(memoryStore({ now: () => NOW }));
    store = fs.store;
    resetRateLimits();
  });

  it('invites and imports a one-time bundle with the email on (the form default)', async () => {
    const invite = {
      mode: 'invite',
      companyName: 'Umbrella',
      contactName: 'Alice',
      contactEmail: 'alice@umbrella.com',
      tier: 'builder',
      cycle: 'once',
      eventIds: ['event-dec', 'event-jan'],
      pricePerMeetup: 500,
    };
    expect(await answer(await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', invite), deps()))).toMatchObject({ status: 200, body: { emailed: 1 } });
    expect(w.emails.at(-1)!.text).toContain('ZurichJS Meetup December');
    const imported = {
      mode: 'import',
      companyName: 'Hooli',
      contactName: 'Gavin',
      contactEmail: 'gavin@hooli.com',
      tier: 'friend',
      cycle: 'once',
      eventIds: ['event-dec'],
      startedAt: '2026-11-01',
    };
    expect(await answer(await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', imported), deps()))).toMatchObject({ status: 200, body: { emailed: 1 } });
    expect((await store.search({ q: 'Hooli' }))[0]).toMatchObject({ status: 'active', paidUntil: '2026-12-10' });
  });

  it('adds a sponsor in one write: a failure leaves nothing, and the same form again works', async () => {
    fs.failNext('create');
    const body = {
      mode: 'import',
      companyName: 'Acme',
      contactName: 'Grace',
      contactEmail: 'grace@acme.ch',
      tier: 'friend',
      cycle: 'yearly',
      startedAt: '2026-06-01',
      paidUntil: '2027-06-01',
    };
    expect((await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', body), deps())).status).toBe(502);
    expect(await store.search({})).toHaveLength(0);
    expect((await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', body), deps())).status).toBe(200);
    const [s] = await store.search({});
    // Imported as running and paid by transfer, so the card is charged only when that period ends.
    expect(s).toMatchObject({ status: 'active', paymentMode: 'manual', source: 'imported', paidUntil: '2027-06-01' });
    const start = await answer(
      await handleStart(post('/api/sponsorship/start', { signerName: 'Grace', signerTitle: 'CEO', agreementVersion: AGREEMENT.version }), {
        ...deps(),
        session: async () => grace,
        now: () => NOW,
      }),
    );
    expect(start.status).toBe(200);
    expect(w.calls.find((c) => c.path === 'checkout/sessions')!.params.get('subscription_data[trial_end]')).toBe(String(Date.parse('2027-06-01T00:00:00Z') / 1000));
  });

  it('a one-time invitation saves its meetups with the sponsor; an email failure still answers 200 and says no email was sent', async () => {
    fs.failNext('documents');
    const body = {
      mode: 'invite',
      companyName: 'Umbrella',
      contactName: 'Alice',
      contactEmail: 'alice@umbrella.com',
      tier: 'builder',
      cycle: 'once',
      eventIds: ['event-dec'],
      pricePerMeetup: 500,
    };
    expect(await answer(await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', body), deps()))).toMatchObject({ status: 200, body: { emailed: 0 } });
    const [s] = await store.search({});
    expect(await store.meetups(s!.id)).toHaveLength(1);
    expect(w.slackPosts.at(-1)).toContain('No email sent.');
  });

  it('inviting an email a colleague added elsewhere moves that contact; a failed insert keeps it where it was', async () => {
    const { sponsor: globex } = await store.create(newSponsor({ companyName: 'Globex' }), { email: 'hank@globex.com', name: 'Hank', role: 'primary' }, BOARD);
    await store.addContact(globex.id, { email: 'pat@initech.com', name: 'Pat', role: 'other', addedBy: 'sponsor' }, BOARD);
    const body = { mode: 'invite', companyName: 'Initech', contactName: 'Pat', contactEmail: 'pat@initech.com', tier: 'friend', cycle: 'yearly', sendEmail: false };
    fs.failNext('create');
    expect((await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', body), deps())).status).toBe(502);
    expect((await store.contacts(globex.id)).map((c) => c.email)).toEqual(['hank@globex.com', 'pat@initech.com']);
    expect((await handleAddSponsor(asAdmin('/api/membership/admin/sponsors', body), deps())).status).toBe(200);
    expect((await store.contacts(globex.id)).map((c) => c.email)).toEqual(['hank@globex.com']);
    expect(await store.contactByEmail('pat@initech.com')).toMatchObject({ role: 'primary', addedBy: 'board' });
  });

  it('terminating: when Stripe fails, the same request again cancels the subscription, then emails and posts', async () => {
    const id = await runningCard();
    w.failNext('DELETE', /^subscriptions\/sub_acme$/);
    expect((await handleBoardEnd(asAdmin('/x', { reason: 'terminated' }), id, deps())).status).toBe(502);
    expect(await store.get(id)).toMatchObject({ status: 'ended', stripeSubscriptionId: 'sub_acme' });
    expect(w.live.has('sub_acme')).toBe(true);
    expect((await handleBoardEnd(asAdmin('/x', { reason: 'terminated' }), id, deps())).status).toBe(200);
    expect(w.live.has('sub_acme')).toBe(false);
    expect(await store.get(id)).toMatchObject({ stripeSubscriptionId: null });
    expect(w.emails.filter((e) => /ended/i.test(e.subject))).toHaveLength(1);
    expect(w.slackPosts.filter((t) => t.includes('ended by ZurichJS'))).toHaveLength(1);
    // Once Stripe is closed, it is a plain "already ended".
    expect((await handleBoardEnd(asAdmin('/x', { reason: 'terminated' }), id, deps())).status).toBe(200);
    expect(w.slackPosts.filter((t) => t.includes('ended by ZurichJS'))).toHaveLength(1);
  });

  it('withdrawing: a payment link Stripe failed to switch off stays known and is switched off on retry', async () => {
    const id = await pendingBundle();
    await handlePaymentLink(asAdmin('/x', {}), id, deps());
    const link = (await store.get(id))!.paymentLinkId!;
    w.failNext('POST', /^payment_links\/plink_/);
    expect((await handleBoardEnd(asAdmin('/x', { reason: 'withdrawn' }), id, deps())).status).toBe(502);
    expect((await store.get(id))!.paymentLinkId).toBe(link);
    expect((await handleBoardEnd(asAdmin('/x', { reason: 'withdrawn' }), id, deps())).status).toBe(200);
    expect(w.activeLinks.has(link)).toBe(false);
    expect((await store.get(id))!.paymentLinkId).toBeNull();
  });

  it('a new payment link is refused while the old one cannot be switched off: never two payable links', async () => {
    const id = await pendingBundle();
    await handlePaymentLink(asAdmin('/x', {}), id, deps());
    w.failNext('POST', /^payment_links\/plink_/);
    expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
    expect(w.activeLinks.size).toBe(1);
    expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(200);
    expect(w.activeLinks.size).toBe(1);
    expect([...w.activeLinks]).toEqual([(await store.get(id))!.paymentLinkId]);
  });

  it('two payment link requests at once keep one link; the other is switched off', async () => {
    const id = await pendingBundle();
    const results = await Promise.all([handlePaymentLink(asAdmin('/x', {}), id, deps()), handlePaymentLink(asAdmin('/x', {}), id, deps())]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect([...w.activeLinks]).toEqual([(await store.get(id))!.paymentLinkId]);
  });

  describe('a payment link Stripe made is never lost', () => {
    const daily = () => dailyCheck(lifecycleDeps(env, store, 'https://zurichjs.com', { fetch: w.f, slack: w.slack, now: () => NOW, log: () => {} }));
    const attempts = (id: string) => store.unsettledLinkAttempts({ sponsorId: id, limit: 10 });

    it("Stripe's answer lost: the retry asks again with the same key, gets the same link and switches it off", async () => {
      const id = await pendingBundle();
      w.loseNext('POST', /^payment_links$/);
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      expect(w.activeLinks.size).toBe(1);
      expect(await attempts(id)).toMatchObject([{ state: 'open', linkId: null }]);
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(200);
      expect([...w.activeLinks]).toEqual([(await store.get(id))!.paymentLinkId]);
      expect(await attempts(id)).toEqual([]);
    });

    it('saving the link failed: the daily check switches it off, also for a sponsorship nobody retried', async () => {
      const id = await pendingBundle();
      fs.failNext('linkStripeIf');
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      expect(w.activeLinks.size).toBe(1);
      expect(await daily()).toMatchObject({ linksClosed: 1 });
      expect(w.activeLinks.size).toBe(0);
      expect(await daily()).toMatchObject({ linksClosed: 0 });
    });

    it('makes zero provider calls with an expired budget and recovers the outstanding link on the next run', async () => {
      const id = await pendingBundle();
      fs.failNext('linkStripeIf');
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      const before = w.calls.length;
      const lifecycle = lifecycleDeps(env, store, 'https://zurichjs.com', { fetch: w.f, slack: w.slack, now: () => NOW });
      const result = await dailyCheck({ ...lifecycle, deadline: { remaining: () => 0 } });
      expect(w.calls).toHaveLength(before);
      expect(result).toMatchObject({ linksClosed: 0, notices: { sent: 0, failed: 0, waiting: 0, unrecorded: 0 } });
      expect(await attempts(id)).toHaveLength(1);
      expect(await daily()).toMatchObject({ linksClosed: 1 });
      expect(w.activeLinks.size).toBe(0);
    });

    it('delivers notices before recovering payment links and leaves the link open when delivery uses the remaining time', async () => {
      const id = await pendingBundle();
      fs.failNext('linkStripeIf');
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      await store.queueNotices(id, [{ key: 'board-reminder', body: { kind: 'slack', text: 'Board reminder' } }]);
      const deadline = { remaining: () => (w.slackPosts.includes('Board reminder') ? 0 : 25_000) };
      const lifecycle = lifecycleDeps(env, store, 'https://zurichjs.com', { fetch: w.f, slack: w.slack, now: () => NOW });
      expect(await dailyCheck({ ...lifecycle, deadline })).toMatchObject({ linksClosed: 0, notices: { sent: 1, failed: 0, waiting: 0, unrecorded: 0 } });
      expect(w.activeLinks.size).toBe(1);
      expect(await daily()).toMatchObject({ linksClosed: 1, notices: { sent: 0, failed: 0, waiting: 0, unrecorded: 0 } });
      expect(w.activeLinks.size).toBe(0);
    });

    it('the losing request of two could not switch its link off: the daily check does, and keeps the saved one', async () => {
      const id = await pendingBundle();
      w.failNext('POST', /^payment_links\/plink_/);
      const replies = await Promise.all([1, 2].map(() => handlePaymentLink(asAdmin('/x', {}), id, deps())));
      expect(replies.map((r) => r.status).sort()).toEqual([200, 502]);
      expect(w.activeLinks.size).toBe(2);
      expect(await daily()).toMatchObject({ linksClosed: 1 });
      expect([...w.activeLinks]).toEqual([(await store.get(id))!.paymentLinkId]);
    });

    it('reconciles an expired create by its event before allowing a replacement', async () => {
      let clock = NOW.getTime();
      store = memoryStore({ now: () => new Date(clock) });
      const id = await pendingBundle();
      w.loseNext('POST', /^payment_links$/);
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      const [original] = w.activeLinks;
      const [attempt] = await attempts(id);
      expect(w.calls.find((c) => c.path === 'payment_links')?.params.get('metadata[attemptId]')).toBe(attempt!.key);
      clock += 25 * 3_600_000;
      const late = { ...deps(), now: clock };
      const retry = (events: object[]) =>
        handlePaymentLink(asAdmin('/x', {}), id, {
          ...late,
          fetch: async (url, init) => (new URL(String(url)).pathname === '/v1/events' ? Response.json({ data: events, has_more: false }) : w.f(url, init)),
        });
      expect((await retry([])).ok).toBe(false);
      expect(w.calls.filter((c) => c.path === 'payment_links')).toHaveLength(1);
      expect(w.activeLinks.has(original!)).toBe(true);
      expect((await retry([{ id: 'evt_fixture', data: { object: { id: original, metadata: { attemptId: attempt!.key, sponsorId: id } } } }])).status).toBe(200);
      expect(w.activeLinks.has(original!)).toBe(false);
      expect(await attempts(id)).toEqual([]);
    });

    it('an ambiguous recovery rejection keeps the attempt pending', async () => {
      const id = await pendingBundle();
      w.failNext('POST', /^payment_links$/, 2, 400);
      expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(502);
      expect(await daily()).toMatchObject({ linksClosed: 0 });
      expect(await attempts(id)).toHaveLength(1);
      expect(w.activeLinks.size).toBe(0);
    });
  });

  it('a payment link is refused for a bundle with a meetup that is over', async () => {
    const id = await pendingBundle([{ id: 'event-nov', title: 'ZurichJS Meetup November', date: '2026-11-11' }, MEETUPS[0]!]);
    expect(await answer(await handlePaymentLink(asAdmin('/x', {}), id, deps()))).toMatchObject({ status: 409, body: { error: expect.stringContaining('already over') } });
    expect(w.activeLinks.size).toBe(0);
  });

  it('changing an invited plan or bundle closes the old payment page first; a Stripe failure saves nothing', async () => {
    const { sponsor } = await store.create(newSponsor(), contact, BOARD);
    await store.linkStripe(sponsor.id, { checkoutSessionId: 'cs_old' }, BOARD);
    w.openSessions.add('cs_old');
    w.failNext('POST', /^checkout\/sessions\/cs_old\/expire$/);
    expect((await handleInvitedPlan(asAdmin('/x', { tier: 'builder', cycle: 'quarterly' }), sponsor.id, deps())).status).toBe(502);
    expect(await store.get(sponsor.id)).toMatchObject({ tier: 'friend', checkoutSessionId: 'cs_old' });
    expect((await handleInvitedPlan(asAdmin('/x', { tier: 'builder', cycle: 'quarterly' }), sponsor.id, deps())).status).toBe(200);
    expect(await store.get(sponsor.id)).toMatchObject({ tier: 'builder', checkoutSessionId: null });
    expect(w.openSessions.has('cs_old')).toBe(false);

    const bundle = await pendingBundle();
    await handlePaymentLink(asAdmin('/x', {}), bundle, deps());
    w.failNext('POST', /^payment_links\/plink_/);
    expect((await handleBundle(asAdmin('/x', { eventIds: ['event-dec'], pricePerMeetup: 400 }), bundle, deps())).status).toBe(502);
    expect(await store.get(bundle)).toMatchObject({ pricePerMeetup: 500 });
    expect(await store.meetups(bundle)).toHaveLength(2);
  });

  it('an expired or paid page counts as closed', async () => {
    const { sponsor } = await store.create(newSponsor(), contact, BOARD);
    await store.linkStripe(sponsor.id, { checkoutSessionId: 'cs_old' }, BOARD);
    w.failNext('POST', /^checkout\/sessions\/cs_old\/expire$/, 1, 400);
    expect((await handleInvitedPlan(asAdmin('/x', { tier: 'builder', cycle: 'quarterly' }), sponsor.id, deps())).status).toBe(502);
    // The fake answers 400 with a generic message: only Stripe's "not open" or "No such" count as closed.
    const notOpen = new Response(JSON.stringify({ error: { message: 'Only Checkout Sessions with a status in ["open"] can be expired.' } }), { status: 400 });
    const f = w.f;
    const gone = (async (url: string, init?: RequestInit) => (String(url).includes('cs_old/expire') ? notOpen : f(url, init))) as typeof fetch;
    expect((await handleInvitedPlan(asAdmin('/x', { tier: 'builder', cycle: 'quarterly' }), sponsor.id, { ...deps(), fetch: gone })).status).toBe(200);
  });

  it('recording a bank transfer: the same form again after a failure half-way finishes it', async () => {
    const { sponsor } = await store.create(newSponsor({ paymentMode: 'manual' }), contact, BOARD);
    fs.failNext('transition');
    const body = { paidUntil: '2027-11-18', amount: 3000 };
    expect((await handleRecordPayment(asAdmin('/x', body), sponsor.id, deps())).status).toBe(502);
    expect(await store.get(sponsor.id)).toMatchObject({ status: 'pending', paidUntil: '2027-11-18' });
    expect((await handleRecordPayment(asAdmin('/x', body), sponsor.id, deps())).status).toBe(200);
    expect(await store.get(sponsor.id)).toMatchObject({ status: 'active', paidUntil: '2027-11-18' });
    expect((await store.events(sponsor.id)).filter((e) => e.type === 'payment_recorded')).toHaveLength(1);
    expect(w.emails.filter((e) => /payment/i.test(e.subject))).toHaveLength(1);
    expect(await answer(await handleRecordPayment(asAdmin('/x', body), sponsor.id, deps()))).toMatchObject({ status: 200, body: { alreadyRecorded: true } });
    expect((await handleRecordPayment(asAdmin('/x', { ...body, amount: 4000 }), sponsor.id, deps())).status).toBe(409);
    expect((await store.events(sponsor.id)).filter((e) => e.type === 'payment_recorded')).toHaveLength(1);
  });

  it('recording the date an imported sponsorship already has is refused, with no email', async () => {
    const { sponsor } = await store.create(
      newSponsor({ paymentMode: 'manual', source: 'imported', status: 'active', startedAt: '2026-06-01', paidUntil: '2027-06-01' }),
      contact,
      BOARD,
    );
    expect((await handleRecordPayment(asAdmin('/x', { paidUntil: '2027-06-01' }), sponsor.id, deps())).status).toBe(400);
    expect(w.emails).toHaveLength(0);
    expect(w.slackPosts).toHaveLength(0);
    expect((await store.events(sponsor.id)).some((e) => e.type === 'payment_recorded')).toBe(false);
  });

  it.each([false, true])('a transfer closes a link saved after its initial cleanup (closure fails: %s)', async (failClosure) => {
    const id = await pendingBundle();
    const original = store.update.bind(store);
    let interleaved = false;
    store.update = async (...args) => {
      if (!interleaved && args[1].paymentMode === 'manual') {
        interleaved = true;
        expect((await handlePaymentLink(asAdmin('/x', {}), id, deps())).status).toBe(200);
        if (failClosure) w.failNext('POST', /^payment_links\/plink_/);
      }
      return original(...args);
    };
    const body = { paidUntil: '2027-11-18' };
    const response = await handleRecordPayment(asAdmin('/x', body), id, deps());
    if (failClosure) {
      expect(response.status).toBe(502);
      expect(w.activeLinks.size).toBe(1);
      expect(w.emails).toHaveLength(0);
      expect(w.slackPosts.filter((text) => text.includes('Payment recorded'))).toHaveLength(0);
      expect((await handleRecordPayment(asAdmin('/x', body), id, deps())).status).toBe(200);
    } else expect(response.status).toBe(200);
    expect(w.activeLinks.size).toBe(0);
    expect(await store.get(id)).toMatchObject({ status: 'active', paymentLinkId: null });
    expect((await store.events(id)).filter((e) => e.type === 'payment_recorded')).toHaveLength(1);
  });

  it.each([false, true])('a past-due date resumes only a proven transfer (proof: %s)', async (proven) => {
    const { sponsor } = await store.create(newSponsor({ paymentMode: 'manual', status: 'past_due', startedAt: '2026-06-01', paidUntil: '2026-10-01' }), contact, BOARD);
    if (proven) await store.log(sponsor.id, 'payment_recording', BOARD, { paidUntil: '2026-10-01' });
    expect((await handleRecordPayment(asAdmin('/x', { paidUntil: '2026-10-01' }), sponsor.id, deps())).status).toBe(proven ? 200 : 400);
    expect(await store.get(sponsor.id)).toMatchObject({ status: proven ? 'active' : 'past_due' });
    expect(w.emails).toHaveLength(proven ? 1 : 0);
    expect(w.slackPosts).toHaveLength(proven ? 1 : 0);
  });

  it('a payment link is not kept when a bank transfer is recorded while Stripe creates it', async () => {
    const id = await pendingBundle();
    const f = w.f;
    const transferMeanwhile = (async (url: string, init?: RequestInit) => {
      if (new URL(url).pathname === '/v1/payment_links') await store.transition(id, { from: 'pending', to: 'active', actor: BOARD });
      return f(url, init);
    }) as typeof fetch;
    expect((await handlePaymentLink(asAdmin('/x', {}), id, { ...deps(), fetch: transferMeanwhile })).status).toBe(409);
    expect(w.activeLinks.size).toBe(0);
    expect(await store.get(id)).toMatchObject({ paymentLinkId: null });
  });

  it('saving details logs only what changed, and a Stripe failure is a warning, not an error', async () => {
    const id = await runningCard();
    const form = { companyName: 'Acme', legalName: '', billingAddress: '', vatId: '', website: '', notes: 'Met at JSConf', partnerId: '' };
    w.failNext('POST', /^customers\//);
    expect(await answer(await handleUpdateSponsor(asAdmin('/x', form), id, deps()))).toMatchObject({ status: 200, body: { sponsor: { notes: 'Met at JSConf' } } });
    expect((await store.events(id)).filter((e) => e.type === 'updated').at(-1)!.payload.fields).toEqual(['notes']);
    expect(w.calls.some((c) => c.path.startsWith('customers/'))).toBe(false);
    expect(await answer(await handleUpdateSponsor(asAdmin('/x', { ...form, legalName: 'Acme AG' }), id, deps()))).toMatchObject({
      status: 200,
      body: { warning: expect.stringContaining('Stripe') },
    });
    expect(await store.get(id)).toMatchObject({ legalName: 'Acme AG' });
    // The next save, with nothing changed, sends the details to Stripe again; after that it stops.
    expect(await answer(await handleUpdateSponsor(asAdmin('/x', { ...form, legalName: 'Acme AG' }), id, deps()))).toMatchObject({
      status: 200,
      body: { sponsor: { legalName: 'Acme AG' } },
    });
    expect(
      w.calls
        .filter((c) => c.path === 'customers/cus_acme')
        .at(-1)!
        .params.get('name'),
    ).toBe('Acme AG');
    const calls = w.calls.length;
    await handleUpdateSponsor(asAdmin('/x', { ...form, legalName: 'Acme AG' }), id, deps());
    expect(w.calls.length).toBe(calls);
    expect(await answer(await handleUpdateSponsor(asAdmin('/x', { ...form, partnerId: 'drafts.partner-acme' }), id, deps()))).toMatchObject({
      status: 400,
      body: { field: 'partnerId' },
    });
  });

  it('an ended sponsorship takes no new contract or contact', async () => {
    const { sponsor } = await store.create(newSponsor(), contact, BOARD);
    await store.transition(sponsor.id, { from: 'pending', to: 'ended', actor: BOARD, reason: 'withdrawn' });
    const form = new FormData();
    form.set('file', new File([pdf()], 'contract.pdf', { type: 'application/pdf' }));
    expect((await handleAttachContract(asAdminForm('/x', form), sponsor.id, deps())).status).toBe(409);
    expect((await handleAdminAddContact(asAdmin('/x', { name: 'Pat', email: 'pat@acme.ch' }), sponsor.id, deps())).status).toBe(409);
  });

  it('the daily check closes what an ended sponsorship still has open in Stripe, and keeps going after a Stripe failure', async () => {
    const a = await pendingBundle();
    await handlePaymentLink(asAdmin('/x', {}), a, deps());
    w.failNext('POST', /^payment_links\/plink_/);
    await handleBoardEnd(asAdmin('/x', { reason: 'withdrawn' }), a, deps());
    const lifecycle = lifecycleDeps(env, store, 'https://zurichjs.com', { fetch: w.f, slack: w.slack, now: () => NOW });
    expect(await dailyCheck(lifecycle)).toMatchObject({ stripeClosed: 1 });
    expect(w.activeLinks.size).toBe(0);
    expect(await dailyCheck(lifecycle)).toMatchObject({ stripeClosed: 0 });
  });
});
