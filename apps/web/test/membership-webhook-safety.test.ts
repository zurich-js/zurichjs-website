import { createHmac } from 'node:crypto';
import { TERMS, memoryStore, type MemberStore } from '@zurichjs/membership';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCheckout } from '../src/pages/api/membership/checkout.ts';
import { handleMembershipWebhook } from '../src/pages/api/membership/webhook.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const WHSEC = 'whsec_test_secret';
const SOURCE = 'zurichjs.com/membership';
const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_MEMBERSHIP_WEBHOOK_SECRET: WHSEC,
  RESEND_API_KEY: 're_test',
  SLACK_MEMBERSHIP_CHANNEL_ID: 'CMEMBERS',
  BETTER_AUTH_URL: 'https://zurichjs.com',
};
const ada = { id: 'user-ada', email: 'ada@example.com' };
const unix = (day: string) => Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000);
const quiet = () => {};

function world() {
  const sessions: { id: string; open: boolean }[] = [];
  const subscriptionStatus: Record<string, string> = {};
  const emails: { to: string[]; subject: string }[] = [];
  const slackPosts: string[] = [];
  let emailGate: Promise<void> | null = null;
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      await emailGate;
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const method = init.method ?? 'GET';
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    if (path === 'customers') return ok({ id: 'cus_ada' });
    if (path === 'prices') return ok({ data: [{ id: 'price_member_supporter_yearly' }] });
    if (path === 'subscriptions') return ok({ data: [] });
    if (path === 'checkout/sessions' && method === 'GET') return ok({ data: sessions.filter((s) => s.open).map((s) => ({ id: s.id, metadata: { source: SOURCE } })) });
    if (path === 'checkout/sessions') {
      const id = `cs_${sessions.length + 1}`;
      sessions.push({ id, open: true });
      return ok({ id, url: `https://checkout.stripe.com/c/pay/${id}` });
    }
    const expire = /^checkout\/sessions\/(cs_\d+)\/expire$/.exec(path);
    if (expire) {
      sessions.find((s) => s.id === expire[1])!.open = false;
      return ok({ id: expire[1], status: 'expired' });
    }
    if (path.startsWith('subscriptions/')) {
      const id = path.split('/')[1]!;
      return ok({ id, status: subscriptionStatus[id] ?? 'active', items: { data: [{ price: { lookup_key: 'member_supporter_yearly' } }] } });
    }
    if (path === 'charges/ch_1') return ok({ id: 'ch_1', customer: 'cus_ada' });
    throw new Error(`unexpected ${method} ${url}`);
  }) as unknown as typeof fetch;
  const slack: MembershipSlack = {
    post: async (text) => {
      slackPosts.push(text);
      return '1';
    },
    update: async () => {},
    reply: async () => {},
    ephemeral: async () => {},
  };
  const holdEmails = () => {
    let open!: () => void;
    emailGate = new Promise((r) => (open = r));
    return () => {
      emailGate = null;
      open();
    };
  };
  return { f, sessions, subscriptionStatus, emails, slackPosts, slack, holdEmails };
}

function signed(id: string, type: string, object: unknown) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', WHSEC).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/membership/webhook', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
}

const invoice = (id: string, memberId: string, from: string, to: string, sub = 'sub_A') => ({
  id,
  amount_paid: 25000,
  customer: 'cus_ada',
  lines: { data: [{ period: { start: unix(from), end: unix(to) } }] },
  parent: { subscription_details: { subscription: sub, metadata: { source: SOURCE, memberId } } },
});

const subscription = (id: string, memberId: string, extra: Record<string, unknown> = {}) => ({ id, status: 'canceled', metadata: { source: SOURCE, memberId }, ...extra });

const subjects = (w: ReturnType<typeof world>) => w.emails.map((e) => e.subject);

function failOnce<K extends keyof MemberStore>(store: MemberStore, method: K): MemberStore {
  let failed = false;
  const proxy: MemberStore = new Proxy(store, {
    get(target, key) {
      const v = target[key as K];
      if (key !== method || typeof v !== 'function') return typeof v === 'function' ? v.bind(proxy) : v;
      return (...args: unknown[]) => {
        if (failed) return (v as (...a: unknown[]) => unknown).apply(target, args);
        failed = true;
        return Promise.reject(new Error('connection terminated'));
      };
    },
  });
  return proxy;
}

async function setup() {
  const w = world();
  const store = memoryStore();
  const deps = { env, store, fetch: w.f, slack: w.slack, log: quiet, signature: async () => null };
  const hook = (id: string, type: string, object: unknown, over: { store?: MemberStore } = {}) => handleMembershipWebhook(signed(id, type, object), { ...deps, ...over });
  const checkout = () =>
    handleCheckout(new Request('https://zurichjs.com/api/membership/checkout', { method: 'POST', body: JSON.stringify(join) }), { ...deps, session: async () => ada });
  return { w, store, hook, checkout };
}

const join = { kind: 'person', name: 'Ada Lovelace', level: 'supporter', cycle: 'yearly', termsVersion: TERMS.version };

async function paidMember() {
  const t = await setup();
  expect((await t.checkout()).status).toBe(200);
  const id = (await t.store.byUser(ada.id))!.id;
  expect((await t.hook('evt_1', 'invoice.paid', invoice('in_1', id, '2026-11-10', '2027-11-10'))).status).toBe(200);
  t.w.emails.length = 0;
  t.w.slackPosts.length = 0;
  return { ...t, id };
}

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, 'error').mockImplementation(quiet);
});

describe('one subscription per member', () => {
  it('reuses the reserved Checkout page across retries', async () => {
    const { w, checkout } = await setup();
    await checkout();
    await checkout();
    expect(w.sessions).toEqual([{ id: 'cs_1', open: true }]);
  });

  it('reports a second paid subscription to the board instead of calling it a renewal', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_cs_B', 'checkout.session.completed', { metadata: { source: SOURCE, memberId: id }, subscription: 'sub_B' });
    await hook('evt_B', 'invoice.paid', invoice('in_B', id, '2026-11-10', '2027-11-10', 'sub_B'));
    expect(await store.get(id)).toMatchObject({ status: 'active', stripeSubscriptionId: 'sub_A' });
    expect(await store.certificates(id)).toHaveLength(1);
    expect(w.emails).toEqual([]);
    expect(w.slackPosts).toEqual([expect.stringMatching(/paid a second subscription for their membership \(sub_B\) next to the current one \(sub_A\).*refund/)]);
  });

  it('reports a payment for a membership that ended, and issues nothing', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_del', 'customer.subscription.deleted', subscription('sub_A', id, { cancellation_details: { reason: 'payment_failed' } }));
    w.emails.length = 0;
    w.slackPosts.length = 0;
    await hook('evt_late', 'invoice.paid', invoice('in_2', id, '2027-11-10', '2028-11-10'));
    expect((await store.get(id))!.status).toBe('ended');
    expect(await store.certificates(id)).toHaveLength(1);
    expect(w.emails).toEqual([]);
    expect(w.slackPosts).toEqual([expect.stringMatching(/payment arrived for .*whose membership has ended \(invoice in_2\)/)]);
  });
});

describe('retries after a failure', () => {
  it('a first payment that failed after activating the member still welcomes them on the retry', async () => {
    const { w, store, hook, checkout } = await setup();
    await checkout();
    const id = (await store.byUser(ada.id))!.id;
    const paid = invoice('in_1', id, '2026-11-10', '2027-11-10');
    expect((await hook('evt_1', 'invoice.paid', paid, { store: failOnce(store, 'issueCertificate') })).status).toBe(500);
    expect((await store.get(id))!.status).toBe('pending');
    expect((await hook('evt_1', 'invoice.paid', paid)).status).toBe(200);
    expect(subjects(w)).toEqual(['Welcome to the Swiss JavaScript Group']);
    expect(w.slackPosts).toEqual([expect.stringMatching(/^:tada: New member/)]);
  });

  it('a retried payment for an earlier term never moves paid until back', async () => {
    const { store, hook, id } = await paidMember();
    const term2 = invoice('in_2', id, '2027-11-10', '2028-11-10');
    expect((await hook('evt_2', 'invoice.paid', term2, { store: failOnce(store, 'issueCertificate') })).status).toBe(500);
    await hook('evt_3', 'invoice.paid', invoice('in_3', id, '2028-11-10', '2029-11-10'));
    await hook('evt_2', 'invoice.paid', term2);
    expect((await store.get(id))!.paidUntil).toBe('2029-11-10');
    expect(await store.certificates(id)).toHaveLength(3);
  });

  it('runs an event once when two deliveries arrive together, and answers the late one as a duplicate', async () => {
    const { w, store, hook, checkout } = await setup();
    await checkout();
    const id = (await store.byUser(ada.id))!.id;
    const paid = invoice('in_1', id, '2026-11-10', '2027-11-10');
    const release = w.holdEmails();
    const first = hook('evt_1', 'invoice.paid', paid);
    await vi.waitFor(() => expect(store.all()[0]!.status).toBe('active'));
    expect((await hook('evt_1', 'invoice.paid', paid)).status).toBe(409);
    release();
    expect((await first).status).toBe(200);
    expect(await (await hook('evt_1', 'invoice.paid', paid)).json()).toEqual({ ok: true, duplicate: true });
    expect(w.slackPosts).toHaveLength(1);
    expect(subjects(w)).toEqual(['Welcome to the Swiss JavaScript Group']);
  });
});

describe('events out of order', () => {
  const failed = (id: string, inv = 'in_2') => ({ ...invoice(inv, id, '2027-11-10', '2028-11-10'), amount_paid: 0, attempt_count: 1, next_payment_attempt: unix('2027-11-14') });

  it('ignores a payment failure that arrives after the same invoice was paid', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_2', 'invoice.paid', invoice('in_2', id, '2027-11-10', '2028-11-10'));
    w.emails.length = 0;
    w.slackPosts.length = 0;
    await hook('evt_f', 'invoice.payment_failed', failed(id));
    expect((await store.get(id))!.status).toBe('active');
    expect(w.emails).toEqual([]);
    expect(w.slackPosts).toEqual([]);
  });

  it('still marks a member past due for a failure on an open invoice', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_f', 'invoice.payment_failed', failed(id));
    expect((await store.get(id))!.status).toBe('past_due');
    expect(subjects(w)).toEqual(['Your ZurichJS membership payment did not go through']);
  });

  it('checks with Stripe before a "past due" subscription update marks a member who has paid since', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_f', 'invoice.payment_failed', failed(id));
    await hook('evt_2', 'invoice.paid', invoice('in_2', id, '2027-11-10', '2028-11-10'));
    const stale = subscription('sub_A', id, { status: 'past_due', items: { data: [{ price: { lookup_key: 'member_supporter_yearly' } }] } });
    await hook('evt_u_old', 'customer.subscription.updated', stale);
    expect((await store.get(id))!.status).toBe('active');
    w.subscriptionStatus.sub_A = 'past_due';
    await hook('evt_u_new', 'customer.subscription.updated', stale);
    expect((await store.get(id))!.status).toBe('past_due');
  });
});

describe('how a membership ends', () => {
  it('lapses when the payment retries run out, and tells the member', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_del', 'customer.subscription.deleted', subscription('sub_A', id, { cancellation_details: { reason: 'payment_failed' } }));
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'lapsed' });
    expect(subjects(w)).toEqual(['Your ZurichJS membership has ended']);
    expect(w.slackPosts).toEqual([expect.stringMatching(/Membership ended \(lapsed\)/)]);
  });

  it('lapses a resignation the board could not confirm because dues were open', async () => {
    const { store, hook, id } = await paidMember();
    await store.transition(id, { from: 'active', to: 'resigning', actor: { kind: 'member', id: ada.id } });
    await hook('evt_del', 'customer.subscription.deleted', subscription('sub_A', id, { cancellation_details: { reason: 'payment_failed' } }));
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'lapsed' });
  });

  it('ends a resignation as resigned when Stripe ends the renewal it stopped, without the lapsed email', async () => {
    const { w, store, hook, id } = await paidMember();
    await store.transition(id, { from: 'active', to: 'resigning', actor: { kind: 'member', id: ada.id } });
    await hook('evt_del', 'customer.subscription.deleted', subscription('sub_A', id, { cancellation_details: { reason: 'cancellation_requested' } }));
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'resigned' });
    expect(w.emails).toEqual([]);
  });
});

describe('refunds and disputes', () => {
  it('records a refund in the history and tells the board, leaving the membership as it is', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_r', 'charge.refunded', { id: 'ch_1', customer: 'cus_ada', amount_refunded: 25000, currency: 'chf' });
    expect((await store.get(id))!.status).toBe('active');
    expect((await store.events(id)).at(-1)).toMatchObject({ type: 'payment_refunded', payload: { charge: 'ch_1', amount: 'CHF 250.00' } });
    expect(w.slackPosts).toEqual([expect.stringMatching(/CHF 250.00 of a membership payment by .* was refunded\. The membership is unchanged/)]);
  });

  it('records a dispute, found through its charge', async () => {
    const { w, store, hook, id } = await paidMember();
    await hook('evt_d', 'charge.dispute.created', { id: 'dp_1', charge: 'ch_1', amount: 25000, currency: 'chf', reason: 'fraudulent' });
    expect((await store.get(id))!.status).toBe('active');
    expect((await store.events(id)).at(-1)).toMatchObject({ type: 'payment_disputed', payload: { charge: 'ch_1', reason: 'fraudulent' } });
    expect(w.slackPosts).toEqual([expect.stringMatching(/disputed a membership payment of CHF 250.00 with their bank \(fraudulent\)/)]);
  });

  it('ignores refunds for customers that are not members (sponsors, donors)', async () => {
    const { w, hook } = await paidMember();
    expect((await hook('evt_r', 'charge.refunded', { id: 'ch_9', customer: 'cus_sponsor', amount_refunded: 100, currency: 'chf' })).status).toBe(200);
    expect(w.slackPosts).toEqual([]);
  });
});
