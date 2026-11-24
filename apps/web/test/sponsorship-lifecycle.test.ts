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
import { boardEnd, endSponsorship } from '../src/server/sponsor-lifecycle.ts';
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
    const r = await handlePlan(post('/api/sponsorship/plan', { confirm: true, agreementVersion: AGREEMENT.version, tier: 'builder', cycle: 'quarterly' }), {
      ...user(),
      fetch: scheduled,
    });
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
});
