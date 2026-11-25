/**
 * Sponsorship lifecycle under retries, out-of-order Stripe events and outages: sponsoring again,
 * first payments, overdue payments, refunds and disputes, and the notices every change owes
 * (sponsor-notices.ts). Real handlers on the in-memory store; Stripe, Resend and Slack faked
 * (sponsor-faults.ts).
 */
import { memoryStore as memoryMembers } from '@zurichjs/membership';
import { AGREEMENT, memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handlePlan } from '../src/pages/api/sponsorship/plan.ts';
import { handleStart } from '../src/pages/api/sponsorship/start.ts';
import { handleSponsorMe } from '../src/pages/api/sponsorship/me.ts';
import { handleStripeWebhook } from '../src/pages/api/stripe/webhook.ts';
import { dailyCheck } from '../src/server/sponsor-daily.ts';
import { boardEnd, endSponsorship, recordPayment } from '../src/server/sponsor-lifecycle.ts';
import { sendNotices, slackNotice } from '../src/server/sponsor-notices.ts';
import { lifecycleDeps } from '../src/server/sponsor-route.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';
import { MEETUPS, NOW, env, faulty, newSponsor, post, stripeEvent, unix, world } from './sponsor-faults.ts';

const BOARD = { kind: 'board', id: 'admin' } as const;
const SRC = 'zurichjs.com/partners';
const grace = { id: 'user-grace', email: 'grace@acme.ch' };
const full = { signerName: 'Grace Hopper', signerTitle: 'CTO', agreementVersion: AGREEMENT.version };
const WELCOME = 'Welcome, Acme: your ZurichJS sponsorship is active';

const invoice = (id: string, sponsorId: string, o: { start?: string; end?: string; reason?: string } = {}) => ({
  id,
  amount_paid: 84000,
  billing_reason: o.reason ?? 'subscription_create',
  lines: { data: [{ period: { start: unix(o.start ?? '2026-11-18T00:00:00Z'), end: unix(o.end ?? '2027-02-18T00:00:00Z') }, price: { lookup_key: 'sponsor_friend_quarterly' } }] },
  parent: { subscription_details: { subscription: 'sub_acme', metadata: { source: SRC, sponsorId } } },
});

describe('sponsorship lifecycle', () => {
  let w: ReturnType<typeof world>;
  let fs: ReturnType<typeof faulty>;
  let store: SponsorStore;
  const user = () => ({ env, store, fetch: w.f, slack: w.slack, logos: w.logos, meetups: async () => MEETUPS, session: async () => grace, now: () => NOW });
  const hook = (req: Request) =>
    handleStripeWebhook(req, { env, sponsorStore: store, memberStore: memoryMembers({ now: () => NOW }), fetch: w.f, slack: w.slack, now: NOW.getTime(), log: () => {} });
  const lifecycle = () => lifecycleDeps(env, store, 'https://zurichjs.com', { fetch: w.f, slack: w.slack, now: () => NOW, log: () => {} });
  const subjects = () => w.emails.map((e) => e.subject);
  const notes = (re: RegExp) => w.slackPosts.filter((t) => re.test(t));

  async function sponsor(over: Parameters<typeof newSponsor>[0] = {}) {
    const { sponsor: s } = await store.create(newSponsor(over), { email: 'grace@acme.ch', name: 'Grace Hopper', role: 'primary', addedBy: 'board' }, BOARD);
    const c = (await store.contactByEmail('grace@acme.ch'))!;
    await store.linkContact(c.id, grace.id);
    return s.id;
  }
  async function running() {
    const id = await sponsor({ status: 'active', startedAt: '2026-11-18', paidUntil: '2027-02-18' });
    await store.linkStripe(id, { customerId: 'cus_acme', subscriptionId: 'sub_acme' }, BOARD);
    w.live.add('sub_acme');
    return id;
  }
  async function ended(reason: 'cancelled' | 'terminated', contract = false) {
    const id = await running();
    await store.acceptAgreement(
      id,
      { version: AGREEMENT.version, signerName: 'Grace Hopper', signerTitle: 'CTO', signerEmail: 'grace@acme.ch', context: 'start', summary: 'x' },
      BOARD,
    );
    if (contract) await store.addDocument(id, { blobKey: 'contracts/old.pdf', filename: 'old.pdf', bytes: 10, signedOn: null, uploadedBy: 'board' }, BOARD);
    await store.transition(id, { from: 'active', to: 'ended', actor: BOARD, reason });
    await store.linkStripe(id, { subscriptionId: null }, BOARD);
    w.live.delete('sub_acme');
    return id;
  }

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    w = world();
    fs = faulty(memoryStore({ now: () => NOW }));
    store = fs.store;
    resetRateLimits();
  });

  describe('sponsoring again', () => {
    it('needs a new full signature: an earlier agreement or contract covered another offer, and a refusal changes nothing', async () => {
      const id = await ended('cancelled', true);
      const before = await store.get(id);
      expect(await (await handleSponsorMe(new Request('https://zurichjs.com/api/sponsorship/me'), user())).json()).toMatchObject({
        signedCurrent: false,
        sponsor: { hasContract: false },
      });
      const tick = await handleStart(post('/api/sponsorship/start', { confirm: true, agreementVersion: AGREEMENT.version, tier: 'builder', cycle: 'yearly' }), user());
      expect(tick.status).toBe(400);
      expect(await store.get(id)).toEqual(before);
      // A missing Stripe price is found before anything changes too.
      w.failNext('GET', /^prices$/, 1, 503);
      const noPrice = await handleStart(post('/api/sponsorship/start', { ...full, tier: 'builder', cycle: 'yearly' }), user());
      expect(noPrice.status).toBeGreaterThanOrEqual(500);
      expect(await store.get(id)).toEqual(before);
      const signed = await handleStart(post('/api/sponsorship/start', { ...full, tier: 'builder', cycle: 'yearly' }), user());
      expect(signed.status).toBe(200);
      expect(await store.get(id)).toMatchObject({ status: 'pending', tier: 'builder', cycle: 'yearly' });
      expect((await store.agreements(id)).filter((a) => a.context === 'start')).toHaveLength(2);
    });

    it('a sponsorship ZurichJS ended is not restarted by the sponsor alone', async () => {
      const id = await ended('terminated');
      const r = await handleStart(post('/api/sponsorship/start', { ...full, tier: 'friend', cycle: 'quarterly' }), user());
      expect(r.status).toBe(409);
      expect(((await r.json()) as { error: string }).error).toContain('ZurichJS ended this sponsorship');
      expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'terminated' });
    });

    it('a late "subscription deleted" for the old subscription does not close the new one', async () => {
      const id = await ended('cancelled');
      await handleStart(post('/api/sponsorship/start', { ...full, tier: 'friend', cycle: 'quarterly' }), user());
      const r = await hook(stripeEvent('evt_old', 'customer.subscription.deleted', { id: 'sub_acme', status: 'canceled', metadata: { source: SRC, sponsorId: id } }));
      expect(r.status).toBe(200);
      expect(await store.get(id)).toMatchObject({ status: 'pending' });
      expect(notes(/never paid/)).toHaveLength(0);
    });
  });

  describe('first payments', () => {
    it('a failure after activation: the retry sends the welcome and the new-sponsor note once, never a renewal note', async () => {
      const id = await sponsor();
      fs.failNext('markStripeEvent');
      expect((await hook(stripeEvent('evt_1', 'invoice.paid', invoice('in_1', id)))).status).toBe(500);
      expect(await store.get(id)).toMatchObject({ status: 'active' });
      expect((await hook(stripeEvent('evt_1', 'invoice.paid', invoice('in_1', id)))).status).toBe(200);
      expect(subjects().filter((t) => t === WELCOME)).toHaveLength(1);
      expect(notes(/New sponsor/)).toHaveLength(1);
      expect(notes(/:repeat:/)).toHaveLength(0);
    });

    it('one-time: a payment link Stripe failed to switch off is switched off by the retry', async () => {
      const { sponsor: s } = await store.create(newSponsor({ cycle: 'once' }), { email: 'grace@acme.ch', name: 'Grace', role: 'primary' }, BOARD, {
        meetups: [{ eventId: MEETUPS[0]!.id, title: MEETUPS[0]!.title, date: MEETUPS[0]!.date }],
      });
      await store.linkStripe(s.id, { paymentLinkId: 'plink_9', paymentLinkUrl: 'https://buy.stripe.com/9' }, BOARD);
      w.activeLinks.add('plink_9');
      w.failNext('POST', /^payment_links\/plink_9$/);
      const paid = { id: 'cs_9', mode: 'payment', payment_status: 'paid', payment_link: 'plink_9', invoice: 'in_9', metadata: { source: SRC, sponsorId: s.id } };
      expect((await hook(stripeEvent('evt_9', 'checkout.session.completed', paid))).status).toBe(500);
      expect((await hook(stripeEvent('evt_9', 'checkout.session.completed', paid))).status).toBe(200);
      expect(await store.get(s.id)).toMatchObject({ status: 'active', paymentLinkId: null });
      expect(w.activeLinks.has('plink_9')).toBe(false);
      expect(subjects().filter((t) => t === WELCOME)).toHaveLength(1);
      // Its receipt is the same payment; a second Checkout payment is flagged once.
      await hook(stripeEvent('evt_10', 'invoice.paid', { id: 'in_9', amount_paid: 50000, metadata: { source: SRC, sponsorId: s.id } }));
      expect(notes(/already paid/)).toHaveLength(0);
      const second = { ...paid, id: 'cs_10', payment_link: null, invoice: 'in_10' };
      await hook(stripeEvent('evt_11', 'checkout.session.completed', second));
      await hook(stripeEvent('evt_12', 'checkout.session.completed', second));
      expect(notes(/already paid/)).toHaveLength(1);
    });
  });

  describe('payments out of order', () => {
    it('a failure reported after the same invoice was paid, and an older "past due", change nothing', async () => {
      const id = await running();
      const paidAt = unix('2026-11-18T10:00:00Z');
      await hook(stripeEvent('evt_p', 'invoice.paid', invoice('in_2', id, { reason: 'subscription_cycle' }), paidAt));
      await hook(stripeEvent('evt_f', 'invoice.payment_failed', { ...invoice('in_2', id), attempt_count: 1 }, paidAt - 60));
      await hook(stripeEvent('evt_u', 'customer.subscription.updated', { id: 'sub_acme', status: 'past_due', metadata: { source: SRC, sponsorId: id } }, paidAt - 30));
      expect(await store.get(id)).toMatchObject({ status: 'active' });
      expect(subjects().some((t) => /did not go through/.test(t))).toBe(false);
      expect(notes(/Payment failed/)).toHaveLength(0);
    });

    it('paying the overdue upgrade invoice ends "payment overdue" once Stripe has the subscription paid up', async () => {
      const id = await running();
      await hook(stripeEvent('evt_f', 'invoice.payment_failed', { ...invoice('in_up', id, { reason: 'subscription_update' }), attempt_count: 1 }));
      expect(await store.get(id)).toMatchObject({ status: 'past_due' });
      await hook(stripeEvent('evt_p', 'invoice.paid', invoice('in_up', id, { reason: 'subscription_update' })));
      expect(await store.get(id)).toMatchObject({ status: 'active', paidUntil: '2027-02-18' });
    });

    it('the same renewal delivered twice at once posts one note', async () => {
      const id = await running();
      const ev = () =>
        hook(stripeEvent('evt_r', 'invoice.paid', invoice('in_3', id, { start: '2027-02-18T00:00:00Z', end: '2027-05-18T00:00:00Z', reason: 'subscription_cycle' })));
      await Promise.all([ev(), ev()]);
      expect(notes(/:repeat: Paid/)).toHaveLength(1);
    });
  });

  it('refunds and disputes are recorded and flagged; the sponsorship does not change', async () => {
    const id = await running();
    await hook(stripeEvent('evt_rf', 'charge.refunded', { id: 'ch_1', customer: 'cus_acme', amount: 84000, amount_refunded: 84000 }));
    await hook(stripeEvent('evt_dp', 'charge.dispute.created', { id: 'dp_1', charge: 'ch_2', amount: 84000, reason: 'fraudulent' }));
    expect(await store.get(id)).toMatchObject({ status: 'active' });
    expect((await store.events(id)).map((e) => e.type)).toEqual(expect.arrayContaining(['charge_refunded', 'charge_disputed']));
    expect(notes(/CHF 840 of a CHF 840 card payment by \*Acme\*.*was refunded/)).toHaveLength(1);
    expect(notes(/disputed \(fraudulent\)/)).toHaveLength(1);
  });

  it('an upgrade that replaces a change waiting for the renewal tells the sponsor', async () => {
    const id = await running();
    await store.acceptAgreement(
      id,
      { version: AGREEMENT.version, signerName: 'Grace Hopper', signerTitle: 'CTO', signerEmail: 'grace@acme.ch', context: 'start', summary: 'x' },
      BOARD,
    );
    const f = w.f;
    // Stripe has a yearly switch scheduled for the renewal.
    const scheduled = (async (url: string, init?: RequestInit) => {
      const u = new URL(url);
      if (u.pathname === '/v1/subscriptions/sub_acme' && (init?.method ?? 'GET') === 'GET' && !w.calls.some((c) => c.path.endsWith('/release')))
        return Response.json({
          id: 'sub_acme',
          status: 'active',
          schedule: u.search.includes('expand')
            ? { id: 'sub_sched_1', metadata: { plan: 'sponsor_friend_yearly' }, phases: [{ end_date: unix('2027-02-18T00:00:00Z') }] }
            : 'sub_sched_1',
          items: {
            data: [{ id: 'si_1', price: { id: 'price_sponsor_friend_quarterly', lookup_key: 'sponsor_friend_quarterly' }, current_period_end: unix('2027-02-18T00:00:00Z') }],
          },
        });
      if (u.pathname === '/v1/subscription_schedules/sub_sched_1/release') {
        w.calls.push({ method: 'POST', path: 'subscription_schedules/sub_sched_1/release', params: new URLSearchParams() });
        return Response.json({ id: 'sub_sched_1' });
      }
      return f(url, init);
    }) as typeof fetch;
    const r = await handlePlan(
      post('/api/sponsorship/plan', { confirm: true, agreementVersion: AGREEMENT.version, tier: 'builder', cycle: 'quarterly', replaces: 'friend-yearly@2027-02-18' }),
      {
        ...user(),
        fetch: scheduled,
      },
    );
    expect(await r.json()).toMatchObject({ timing: 'now', droppedChange: 'Community Friend, CHF 3’000 a year' });
    expect(w.emails.at(-1)!.text).toContain('The change to Community Friend, CHF 3’000 a year that was waiting for your renewal no longer applies.');
  });

  describe('notices', () => {
    it('an email that fails after the change is saved is sent by the daily check, once', async () => {
      const id = await running();
      w.failEmails(1);
      await endSponsorship((await store.get(id))!, { kind: 'sponsor', id: grace.id }, lifecycle(), null);
      expect(await store.get(id)).toMatchObject({ status: 'ending' });
      expect(subjects().filter((t) => /ends on/.test(t))).toHaveLength(0);
      expect(await dailyCheck(lifecycle())).toMatchObject({ notices: { sent: 1, failed: 0 } });
      expect(subjects().filter((t) => /ends on/.test(t))).toHaveLength(1);
      expect(await dailyCheck(lifecycle())).toMatchObject({ notices: { sent: 0 } });
    });

    it('a termination whose Stripe call failed still emails and posts once, after the daily check closes Stripe', async () => {
      const id = await running();
      w.failNext('DELETE', /^subscriptions\/sub_acme$/);
      await expect(boardEnd((await store.get(id))!, 'terminated', BOARD, lifecycle())).rejects.toThrow();
      expect(subjects().filter((t) => /has ended/.test(t))).toHaveLength(0);
      expect(await dailyCheck(lifecycle())).toMatchObject({ stripeClosed: 1, notices: { sent: 2, failed: 0 } });
      expect(w.live.has('sub_acme')).toBe(false);
      expect(subjects().filter((t) => /has ended/.test(t))).toHaveLength(1);
      expect(notes(/ended by ZurichJS/)).toHaveLength(1);
      // The board pressing it again changes nothing more.
      await boardEnd((await store.get(id))!, 'terminated', BOARD, lifecycle());
      expect(notes(/ended by ZurichJS/)).toHaveLength(1);
    });

    it('a bank-transfer reminder the check did not reach on its day is sent once, with the most urgent one due', async () => {
      // Five days left: the 30-day reminder was missed; the 7-day one is due.
      await sponsor({ status: 'active', paymentMode: 'manual', source: 'imported', cycle: 'yearly', startedAt: '2025-11-23', paidUntil: '2026-11-23' });
      expect(await dailyCheck(lifecycle())).toMatchObject({ reminded: 1 });
      expect(notes(/5 days left/)).toHaveLength(1);
      expect(await dailyCheck(lifecycle())).toMatchObject({ reminded: 0 });
      expect(notes(/:calendar:/)).toHaveLength(1);
    });
  });

  describe('what a change owes is saved with it (independent review, 24th November 2026)', () => {
    it('termination: neither the email nor the note says Stripe stopped until it has', async () => {
      const id = await running();
      w.failNext('DELETE', /^subscriptions\/sub_acme$/, 2);
      await expect(boardEnd((await store.get(id))!, 'terminated', BOARD, lifecycle())).rejects.toThrow();
      expect(await dailyCheck(lifecycle())).toMatchObject({ stripeClosed: 0, notices: { sent: 0, waiting: 2 } });
      expect(w.live.has('sub_acme')).toBe(true);
      expect(notes(/Stripe stopped/)).toHaveLength(0);
      expect(subjects().filter((t) => /has ended/.test(t))).toHaveLength(0);
      expect(await dailyCheck(lifecycle())).toMatchObject({ stripeClosed: 1, notices: { sent: 2, waiting: 0 } });
      expect(notes(/Stripe stopped/)).toHaveLength(1);
      expect(subjects().filter((t) => /has ended/.test(t))).toHaveLength(1);
    });

    it('a bank transfer: when the write that marks it recorded fails, the same form again records it once and sends one receipt', async () => {
      const id = await sponsor({ paymentMode: 'manual' });
      const pay = async () => recordPayment((await store.get(id))!, { paidUntil: '2027-11-18', amount: 3000, reference: null }, BOARD, lifecycle());
      fs.failNext('queueNotices');
      await expect(pay()).rejects.toThrow();
      expect((await store.events(id)).filter((e) => e.type === 'payment_recorded')).toHaveLength(0);
      await pay();
      await expect(pay()).resolves.toBeDefined();
      expect((await store.events(id)).filter((e) => e.type === 'payment_recorded')).toHaveLength(1);
      expect(subjects().filter((t) => /Payment received/.test(t))).toHaveLength(1);
      expect(notes(/Payment recorded/)).toHaveLength(1);
    });

    it('a signature and its signed copy are one write: a failed write signs nothing, a saved one always sends the copy', async () => {
      const id = await sponsor();
      const start = (body: Record<string, unknown>) => handleStart(post('/api/sponsorship/start', { tier: 'friend', cycle: 'quarterly', ...body }), user());
      fs.failNext('acceptAgreement');
      expect((await start(full)).status).toBe(502);
      expect(await store.agreements(id)).toHaveLength(0);
      expect((await start({ confirm: true, agreementVersion: AGREEMENT.version })).status).toBe(400);
      // Saved, then Stripe fails: the copy is still owed and sent.
      w.failNext('POST', /^checkout\/sessions$/);
      expect((await start(full)).status).toBe(502);
      await dailyCheck(lifecycle());
      expect(await store.agreements(id)).toHaveLength(1);
      expect(subjects().filter((t) => /Your copy/.test(t))).toHaveLength(1);
    });

    it('a failure for the subscription a sponsorship held before it started again changes nothing', async () => {
      const id = await ended('cancelled');
      await handleStart(post('/api/sponsorship/start', { ...full, tier: 'friend', cycle: 'quarterly' }), user());
      const fresh = invoice('in_new', id);
      fresh.parent.subscription_details.subscription = 'sub_new';
      await hook(stripeEvent('evt_new', 'invoice.paid', fresh));
      expect((await hook(stripeEvent('evt_old_failure', 'invoice.payment_failed', invoice('in_old', id)))).status).toBe(200);
      expect(await store.get(id)).toMatchObject({ status: 'active', stripeSubscriptionId: 'sub_new' });
      expect(notes(/Payment failed/)).toHaveLength(0);
    });

    it('a failure handled while the same invoice is paid: the payment wins, in either order', async () => {
      const id = await running();
      const row = invoice('in_crossed', id, { reason: 'subscription_cycle' });
      // The payment lands between the failure's first look and its change.
      const inner = store;
      store = {
        ...inner,
        overdueInvoice: async (...args) => {
          await hook(stripeEvent('evt_paid_meanwhile', 'invoice.paid', row));
          return inner.overdueInvoice(...args);
        },
      };
      expect((await hook(stripeEvent('evt_failed', 'invoice.payment_failed', row))).status).toBe(200);
      store = inner;
      expect(await store.get(id)).toMatchObject({ status: 'active' });
      expect(notes(/Payment failed/)).toHaveLength(0);
      // The other order: overdue first, then the payment clears it.
      const next = invoice('in_next', id, { reason: 'subscription_cycle', start: '2027-02-18T00:00:00Z', end: '2027-05-18T00:00:00Z' });
      await hook(stripeEvent('evt_failed_2', 'invoice.payment_failed', next));
      expect(await store.get(id)).toMatchObject({ status: 'past_due' });
      await hook(stripeEvent('evt_paid_2', 'invoice.paid', next));
      expect(await store.get(id)).toMatchObject({ status: 'active', paidUntil: '2027-05-18' });
    });

    it('"payment overdue" and its email and note are one write: a failed write is retried by Stripe and sends both once', async () => {
      const id = await running();
      const decline = (n: string) => hook(stripeEvent(`evt_declined_${n}`, 'invoice.payment_failed', invoice('in_problem', id)));
      fs.failNext('overdueInvoice');
      expect((await decline('a')).status).toBe(500);
      expect(await store.get(id)).toMatchObject({ status: 'active' });
      expect((await decline('a')).status).toBe(200);
      // Stripe sends the same failure again (another event id): nothing more.
      expect((await decline('b')).status).toBe(200);
      await dailyCheck(lifecycle());
      expect(await store.get(id)).toMatchObject({ status: 'past_due' });
      expect(subjects().filter((t) => /did not go through/.test(t))).toHaveLength(1);
      expect(notes(/Payment failed/)).toHaveLength(1);
    });

    it('each first payment after sponsoring again has its own welcome; the same payment twice has one', async () => {
      const id = await sponsor();
      await hook(stripeEvent('evt_first', 'invoice.paid', invoice('in_first', id)));
      await store.transition(id, { from: 'active', to: 'ended', actor: BOARD, reason: 'cancelled' });
      await store.linkStripe(id, { subscriptionId: null }, BOARD);
      await handleStart(post('/api/sponsorship/start', { ...full, tier: 'friend', cycle: 'quarterly' }), user());
      const fresh = invoice('in_new', id);
      fresh.parent.subscription_details.subscription = 'sub_new';
      await hook(stripeEvent('evt_new', 'invoice.paid', fresh));
      await hook(stripeEvent('evt_new_again', 'invoice.paid', fresh));
      expect(subjects().filter((t) => t === WELCOME)).toHaveLength(2);
      expect(notes(/New sponsor/)).toHaveLength(2);
      expect(notes(/:repeat: Paid/)).toHaveLength(0);
    });

    it('a partial dispute keeps the disputed amount apart from the card payment', async () => {
      await running();
      await hook(stripeEvent('evt_partial', 'charge.dispute.created', { id: 'dp_partial', charge: 'ch_2', amount: 10000, reason: 'duplicate' }));
      const s = (await store.search({ q: 'Acme' }))[0]!;
      expect((await store.events(s.id)).find((e) => e.type === 'charge_disputed')?.payload).toMatchObject({ amount: 84000, disputed: 10000 });
    });
  });

  describe('Slack accepted a note but the database could not record it', () => {
    let clock: Date;
    beforeEach(() => {
      clock = NOW;
      fs = faulty(memoryStore({ now: () => clock }));
      store = fs.store;
    });
    const send = () => sendNotices({ env, store, origin: 'https://zurichjs.com', fetch: w.f, slack: w.slack, log: () => {} });

    it('one failed write is retried at once: delivered and recorded, never sent twice', async () => {
      const id = await running();
      await store.queueNotices(id, [slackNotice('ack-1', 'Fixture delivery')]);
      fs.failNext('noticeDone');
      expect(await send()).toMatchObject({ sent: 1, unrecorded: 0 });
      expect(await send()).toMatchObject({ sent: 0 });
      expect(notes(/Fixture delivery/)).toHaveLength(1);
    });

    it('still failing: the claim is kept, nobody sends it for five minutes, then it is sent again (at least once)', async () => {
      const id = await running();
      await store.queueNotices(id, [slackNotice('ack-2', 'Fixture delivery')]);
      fs.failNext('noticeDone', 2);
      expect(await send()).toMatchObject({ sent: 0, failed: 0, unrecorded: 1 });
      expect(await send()).toMatchObject({ sent: 0 });
      expect(notes(/Fixture delivery/)).toHaveLength(1);
      clock = new Date(NOW.getTime() + 6 * 60_000);
      expect(await send()).toMatchObject({ sent: 1 });
      expect(notes(/Fixture delivery/)).toHaveLength(2);
    });
  });
});
