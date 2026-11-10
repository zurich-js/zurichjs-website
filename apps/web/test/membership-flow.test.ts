/**
 * The whole membership flow through the API handlers, on the in-memory store,
 * with Stripe, Resend and Slack mocked at fetch: join (terms) → Stripe Checkout
 * → webhook (active, certificate emailed) → renewal → portal → resignation →
 * board confirms in Slack → subscription ends. Plus imported members switching
 * to automatic payment, the admin import, and the safety checks.
 */
import { createHmac } from 'node:crypto';
import { TERMS, memoryStore, type MemberStore, type NewMember } from '@zurichjs/membership';
import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleImport } from '../src/pages/api/membership/admin/import.ts';
import { handleCertificate } from '../src/pages/api/membership/certificates/[id].ts';
import { handleCheckout } from '../src/pages/api/membership/checkout.ts';
import { handleMe } from '../src/pages/api/membership/me.ts';
import { handlePortal } from '../src/pages/api/membership/portal.ts';
import { handleResign } from '../src/pages/api/membership/resign.ts';
import { handleMembershipWebhook } from '../src/pages/api/membership/webhook.ts';
import { CONFIRM_RESIGNATION, handleMembershipClick, type MembershipSlack, type SlackBlock } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const NADJA = 'U08NAFH955M';
const CHANNEL = 'CMEMBERS';
const WHSEC = 'whsec_test_secret';
const ADMIN = 'admin-password-for-tests';
const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_MEMBER_PORTAL_CONFIG: 'bpc_1',
  STRIPE_MEMBERSHIP_WEBHOOK_SECRET: WHSEC,
  RESEND_API_KEY: 're_test',
  SLACK_MEMBERSHIP_APPROVER_IDS: `${NADJA},U08NDGCRYPK,U08MMPMNLKZ`,
  SLACK_MEMBERSHIP_CHANNEL_ID: CHANNEL,
  BETTER_AUTH_URL: 'https://zurichjs.com',
  MEMBERSHIP_ADMIN_PASSWORD: ADMIN,
};
const ada = { id: 'user-ada', email: 'ada@example.com' };
const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);

/** Stripe, Resend: records calls; `openInvoices` makes the dues check find some. */
function world(opts: { openInvoices?: number } = {}) {
  const calls: { method: string; path: string; params: URLSearchParams }[] = [];
  const emails: Record<string, unknown>[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const params = new URLSearchParams(init.method === 'POST' ? String(init.body ?? '') : u.search);
    calls.push({ method: init.method ?? 'GET', path, params });
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    if (path === 'prices') return ok({ data: [{ id: `price_${params.get('lookup_keys[0]')}` }] });
    if (path === 'customers') return ok({ id: 'cus_ada' });
    if (path === 'checkout/sessions') return ok({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' });
    if (path === 'billing_portal/sessions') return ok({ url: 'https://billing.stripe.com/p/session/1' });
    if (path === 'invoices') return ok({ data: params.get('status') === 'open' ? Array.from({ length: opts.openInvoices ?? 0 }, (_, i) => ({ id: `in_open_${i}` })) : [] });
    if (path.startsWith('subscriptions/')) return ok({ id: path.split('/')[1], cancel_at: unix('2027-11-10T00:00:00Z') });
    throw new Error(`unexpected ${init.method} ${url}`);
  }) as unknown as typeof fetch;
  const slackPosts: { text: string; blocks?: SlackBlock[] }[] = [];
  const slackCalls: { method: string; args: unknown[] }[] = [];
  const slack: MembershipSlack = {
    post: async (text, blocks) => {
      slackPosts.push({ text, blocks });
      return '1700000000.000100';
    },
    update: async (...args) => void slackCalls.push({ method: 'update', args }),
    ephemeral: async (...args) => void slackCalls.push({ method: 'ephemeral', args }),
  };
  return { f, calls, emails, slack, slackPosts, slackCalls };
}

const req = (path: string, body?: unknown) =>
  body === undefined
    ? new Request(`https://zurichjs.com${path}`)
    : new Request(`https://zurichjs.com${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

function stripeEvent(id: string, type: string, object: unknown) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', WHSEC).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/membership/webhook', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
}

const paidInvoice = (id: string, memberId: string, start: string, end: string, amount = 25000) => ({
  id,
  amount_paid: amount,
  customer: 'cus_ada',
  lines: { data: [{ period: { start: unix(`${start}T00:00:00Z`), end: unix(`${end}T00:00:00Z`) } }] },
  parent: { subscription_details: { subscription: 'sub_ada', metadata: { source: 'zurichjs.com/membership', memberId } } },
});

const join = { name: 'Ada Lovelace', level: 'supporter', cycle: 'yearly', termsVersion: TERMS.version };

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('joining', () => {
  it('answers 401 when not signed in', async () => {
    expect((await handleMe(req('/api/membership/me'), { env, store: memoryStore(), session: async () => null })).status).toBe(401);
    expect((await handleCheckout(req('/api/membership/checkout', join), { env, store: memoryStore(), session: async () => null })).status).toBe(401);
  });

  it('shows someone new that they can join', async () => {
    const res = await handleMe(req('/api/membership/me'), { env, store: memoryStore(), session: async () => ada });
    expect(await res.json()).toEqual({
      ok: true,
      email: 'ada@example.com',
      member: null,
      certificates: [],
      canJoin: true,
      termsVersion: TERMS.version,
      acceptedCurrentTerms: false,
    });
  });

  it.each([
    [{ ...join, termsVersion: undefined }, 'terms', 'Accept the membership terms to continue.'],
    [{ ...join, termsVersion: '2020-01-01' }, 'terms', 'The membership terms changed. Reload the page and accept the current terms.'],
    [{ ...join, level: 'advocate' }, 'level', 'Choose Basic Member or Supporter.'],
    [{ ...join, cycle: 'monthly' }, 'cycle', 'Choose quarterly or yearly.'],
    [{ ...join, kind: 'organisation' }, 'organisationName', 'Add the organisation’s name.'],
    [{ ...join, name: '<b>Ada</b>' }, 'name', 'Add your full name.'],
  ])('refuses %j', async (body, field, error) => {
    const store = memoryStore();
    const res = await handleCheckout(req('/api/membership/checkout', body), { env, store, session: async () => ada, fetch: world().f });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ field, error });
    expect(store.all()).toEqual([]);
  });

  it('records the member as pending with the accepted terms, and sends them to Stripe Checkout', async () => {
    const store = memoryStore();
    const w = world();
    const res = await handleCheckout(req('/api/membership/checkout', join), { env, store, session: async () => ada, fetch: w.f });
    expect(await res.json()).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_1' });
    const m = (await store.byEmail('ada@example.com'))!;
    expect(m).toMatchObject({ status: 'pending', userId: 'user-ada', level: 'supporter', cycle: 'yearly', stripeCustomerId: 'cus_ada', source: 'self_serve' });
    expect(await store.acceptedTerms(m.id)).toBe(TERMS.version);
    const checkout = w.calls.find((c) => c.path === 'checkout/sessions')!.params;
    expect(Object.fromEntries(checkout)).toMatchObject({
      mode: 'subscription',
      customer: 'cus_ada',
      'line_items[0][price]': 'price_member_supporter_yearly',
      'metadata[memberId]': m.id,
      'subscription_data[metadata][memberId]': m.id,
      'subscription_data[metadata][source]': 'zurichjs.com/membership',
      success_url: 'https://zurichjs.com/membership/account?checkout=done',
    });
    expect(checkout.has('subscription_data[trial_end]')).toBe(false);
  });

  it('reuses the record when someone comes back to an unfinished checkout, with new choices', async () => {
    const store = memoryStore();
    const w = world();
    await handleCheckout(req('/api/membership/checkout', join), { env, store, session: async () => ada, fetch: w.f });
    await handleCheckout(req('/api/membership/checkout', { ...join, level: 'basic', cycle: 'quarterly' }), { env, store, session: async () => ada, fetch: w.f });
    expect(store.all()).toHaveLength(1);
    expect(store.all()[0]).toMatchObject({ level: 'basic', cycle: 'quarterly', status: 'pending' });
    expect(w.calls.filter((c) => c.path === 'customers')).toHaveLength(1);
  });
});

describe('payments (Stripe webhook)', () => {
  let store: MemberStore;
  let memberId: string;
  let w: ReturnType<typeof world>;
  const deps = () => ({ env, store, fetch: w.f, slack: w.slack, log: () => {}, signature: async () => null });

  beforeEach(async () => {
    store = memoryStore();
    w = world();
    await handleCheckout(req('/api/membership/checkout', join), { env, store, session: async () => ada, fetch: w.f });
    memberId = (await store.byEmail('ada@example.com'))!.id;
  });

  it('refuses a bad signature and an unconfigured secret', async () => {
    const bad = new Request('https://zurichjs.com/api/membership/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=00' }, body: '{}' });
    expect((await handleMembershipWebhook(bad, deps())).status).toBe(400);
    expect((await handleMembershipWebhook(stripeEvent('evt_x', 'invoice.paid', {}), { ...deps(), env: { ...env, STRIPE_MEMBERSHIP_WEBHOOK_SECRET: undefined } })).status).toBe(503);
  });

  it('activates on the first payment, issues the certificate and emails it as a PDF', async () => {
    const res = await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    expect(res.status).toBe(200);
    const m = (await store.get(memberId))!;
    expect(m).toMatchObject({ status: 'active', paidUntil: '2027-11-10', joinedAt: '2026-11-10', stripeSubscriptionId: 'sub_ada', paymentMode: 'automatic' });
    const certs = await store.certificates(memberId);
    expect(certs).toMatchObject([{ number: 'ZJS-2026-0001', periodStart: '2026-11-10', periodEnd: '2027-11-10', stripeInvoiceId: 'in_1' }]);
    const email = w.emails.at(-1)!;
    expect(email).toMatchObject({ to: ['ada@example.com'], subject: 'Welcome to the Swiss JavaScript Group' });
    expect(String(email.text)).toContain('Term: 10 November 2026 to 9 November 2027');
    const [att] = email.attachments as { filename: string; content: string }[];
    expect(att!.filename).toBe('ZurichJS-membership-ZJS-2026-0001.pdf');
    expect((await PDFDocument.load(Buffer.from(att!.content, 'base64'))).getTitle()).toBe('Certificate of membership ZJS-2026-0001');
    expect(w.slackPosts.at(-1)!.text).toContain(':tada: New member: *Ada Lovelace* (ada@example.com), Supporter, yearly. Certificate ZJS-2026-0001.');
  });

  it('handles the same event twice only once', async () => {
    const ev = () => stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10'));
    await handleMembershipWebhook(ev(), deps());
    const res = await handleMembershipWebhook(ev(), deps());
    expect(await res.json()).toEqual({ ok: true, duplicate: true });
    expect(await store.certificates(memberId)).toHaveLength(1);
    expect(w.emails.filter((e) => String(e.subject).startsWith('Welcome'))).toHaveLength(1);
  });

  it('renews: new paid-until, a new certificate, the renewal email', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    await handleMembershipWebhook(stripeEvent('evt_2', 'invoice.paid', paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10')), deps());
    expect((await store.get(memberId))!.paidUntil).toBe('2028-11-10');
    expect((await store.certificates(memberId)).map((c) => c.number)).toEqual(['ZJS-2027-0002', 'ZJS-2026-0001']);
    expect(w.emails.at(-1)!.subject).toBe('Your ZurichJS membership is renewed');
  });

  it('marks a failed payment, emails the member, and recovers on the next payment', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    await handleMembershipWebhook(stripeEvent('evt_f', 'invoice.payment_failed', paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10', 0)), deps());
    expect((await store.get(memberId))!.status).toBe('past_due');
    expect(w.emails.at(-1)!.subject).toBe('Your ZurichJS membership payment did not go through');
    await handleMembershipWebhook(stripeEvent('evt_2', 'invoice.paid', paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10')), deps());
    expect((await store.get(memberId))!.status).toBe('active');
  });

  it('emails the payment page and the next retry for a declined renewal, once per attempt', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    const declined = (attempt: number) => ({
      ...paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10', 0),
      attempt_count: attempt,
      next_payment_attempt: unix('2027-11-14T09:00:00Z'),
      hosted_invoice_url: 'https://invoice.stripe.com/i/acct_x/test_in_2',
    });
    await handleMembershipWebhook(stripeEvent('evt_f1', 'invoice.payment_failed', declined(1)), deps());
    await handleMembershipWebhook(stripeEvent('evt_f2', 'invoice.payment_failed', declined(2)), deps());
    const failed = w.emails.filter((e) => e.subject === 'Your ZurichJS membership payment did not go through');
    expect(failed).toHaveLength(2);
    expect(String(failed[0]!.text)).toContain('Stripe tries again on 14 November 2027.');
    expect(String(failed[0]!.html)).toContain('https://invoice.stripe.com/i/acct_x/test_in_2');
    expect(w.slackPosts.at(-1)!.text).toContain('(attempt 2). Stripe tries again on 14 November 2027');
    expect((await store.get(memberId))!.status).toBe('past_due');
  });

  it('asks the member to confirm a payment their bank holds (3D Secure)', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    const held = { ...paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10', 0), hosted_invoice_url: 'https://invoice.stripe.com/i/acct_x/test_in_2' };
    await handleMembershipWebhook(stripeEvent('evt_a', 'invoice.payment_action_required', held), deps());
    expect((await store.get(memberId))!.status).toBe('past_due');
    const email = w.emails.at(-1)!;
    expect(email.subject).toBe('Please confirm your ZurichJS membership payment');
    expect(String(email.html)).toContain('Confirm the payment');
    expect(w.slackPosts.at(-1)!.text).toContain('3D Secure');
  });

  it('leaves a payment page that is not Stripe out of the email', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    const odd = { ...paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10', 0), hosted_invoice_url: 'https://evil.example/pay' };
    await handleMembershipWebhook(stripeEvent('evt_f', 'invoice.payment_failed', odd), deps());
    expect(String(w.emails.at(-1)!.html)).not.toContain('evil.example');
  });

  it('does not email someone whose first payment is still in Checkout', async () => {
    const before = w.emails.length;
    await handleMembershipWebhook(stripeEvent('evt_f', 'invoice.payment_failed', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10', 0)), deps());
    expect(w.emails).toHaveLength(before);
    expect((await store.get(memberId))!.status).toBe('pending');
  });

  it('reads invoices in the shape of API versions before basil', async () => {
    const { parent: _parent, ...rest } = paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10');
    const legacy = { ...rest, subscription: 'sub_ada', subscription_details: { metadata: { source: 'zurichjs.com/membership', memberId } } };
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', legacy), deps());
    expect(await store.get(memberId)).toMatchObject({ status: 'active', stripeSubscriptionId: 'sub_ada', paidUntil: '2027-11-10' });
  });

  it('marks an active member behind when Stripe reports the subscription past due', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    const sub = {
      id: 'sub_ada',
      status: 'past_due',
      metadata: { source: 'zurichjs.com/membership', memberId },
      items: { data: [{ price: { lookup_key: 'member_supporter_yearly' } }] },
    };
    await handleMembershipWebhook(stripeEvent('evt_u', 'customer.subscription.updated', sub), deps());
    expect((await store.get(memberId))!.status).toBe('past_due');
  });

  it('ends a membership as lapsed when Stripe cancels after the last retry', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    await handleMembershipWebhook(stripeEvent('evt_f', 'invoice.payment_failed', paidInvoice('in_2', memberId, '2027-11-10', '2028-11-10', 0)), deps());
    const sub = { id: 'sub_ada', status: 'canceled', metadata: { source: 'zurichjs.com/membership', memberId } };
    await handleMembershipWebhook(stripeEvent('evt_d', 'customer.subscription.deleted', sub), deps());
    expect(await store.get(memberId)).toMatchObject({ status: 'ended', endedReason: 'lapsed' });
  });

  it('follows a switch of level or cycle made in the billing portal', async () => {
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', memberId, '2026-11-10', '2027-11-10')), deps());
    const sub = { id: 'sub_ada', metadata: { source: 'zurichjs.com/membership', memberId }, items: { data: [{ price: { lookup_key: 'member_basic_quarterly' } }] } };
    await handleMembershipWebhook(stripeEvent('evt_u', 'customer.subscription.updated', sub), deps());
    expect(await store.get(memberId)).toMatchObject({ level: 'basic', cycle: 'quarterly' });
  });

  it('ignores donation events', async () => {
    const donation = {
      ...paidInvoice('in_d', memberId, '2026-11-10', '2026-12-10'),
      parent: { subscription_details: { subscription: 'sub_d', metadata: { source: 'zurichjs.com/donate' } } },
    };
    await handleMembershipWebhook(stripeEvent('evt_d', 'invoice.paid', donation), deps());
    expect((await store.get(memberId))!.status).toBe('pending');
  });
});

describe('the portal', () => {
  it('opens the Stripe billing portal with the no-cancel configuration', async () => {
    const store = memoryStore();
    const w = world();
    await handleCheckout(req('/api/membership/checkout', join), { env, store, session: async () => ada, fetch: w.f });
    const res = await handlePortal(req('/api/membership/portal', {}), { env, store, session: async () => ada, fetch: w.f });
    expect(await res.json()).toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/1' });
    expect(Object.fromEntries(w.calls.find((c) => c.path === 'billing_portal/sessions')!.params)).toEqual({
      customer: 'cus_ada',
      configuration: 'bpc_1',
      return_url: 'https://zurichjs.com/membership/account',
    });
  });

  it('serves a member only their own certificates', async () => {
    const store = memoryStore();
    const m = await store.create({ ...(await importedAda()), status: 'imported_manual' }, { kind: 'script', id: 't' });
    await store.update(m.id, { userId: 'user-ada' }, { kind: 'script', id: 't' });
    const c = await store.issueCertificate(m.id, { periodStart: '2026-01-01', periodEnd: '2027-01-01', stripeInvoiceId: null }, { kind: 'board', id: NADJA });
    const res = await handleCertificate(req(`/api/membership/certificates/${c.id}`), c.id, { env, store, session: async () => ada, signature: async () => null });
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="ZurichJS-membership-ZJS-2026-0001.pdf"');
    const other = await handleCertificate(req('/api/membership/certificates/x'), c.id, {
      env,
      store,
      session: async () => ({ id: 'user-eve', email: 'eve@example.com' }),
      signature: async () => null,
    });
    expect(other.status).toBe(404);
  });
});

async function importedAda(): Promise<NewMember> {
  return {
    kind: 'person',
    name: 'Ada Lovelace',
    organisationName: null,
    email: 'ada@example.com',
    level: 'supporter',
    cycle: 'yearly',
    category: 'active',
    status: 'imported_manual',
    source: 'imported',
    joinedAt: '2025-05-23',
    paidUntil: '2027-05-22',
    paymentMode: 'manual',
    notes: null,
  };
}

describe('imported members', () => {
  it('link on first sign-in, accept the terms, and are not charged before their paid period ends', async () => {
    const store = memoryStore();
    await store.create(await importedAda(), { kind: 'script', id: 'import' });
    const w = world();
    const me = (await (await handleMe(req('/api/membership/me'), { env, store, session: async () => ada })).json()) as { member: { status: string }; canJoin: boolean };
    expect(me).toMatchObject({ member: { status: 'imported_manual' }, canJoin: false });

    expect((await handleCheckout(req('/api/membership/checkout', {}), { env, store, session: async () => ada, fetch: w.f })).status).toBe(400);
    const res = await handleCheckout(req('/api/membership/checkout', { termsVersion: TERMS.version }), {
      env,
      store,
      session: async () => ada,
      fetch: w.f,
      now: () => new Date('2026-11-10T10:00:00Z'),
    });
    expect(res.status).toBe(200);
    const params = w.calls.find((c) => c.path === 'checkout/sessions')!.params;
    expect(params.get('subscription_data[trial_end]')).toBe(String(unix('2027-05-22T00:00:00Z')));
    expect(params.get('line_items[0][price]')).toBe('price_member_supporter_yearly');

    const m = (await store.byEmail('ada@example.com'))!;
    expect(await store.acceptedTerms(m.id)).toBe(TERMS.version);
    // Checkout finished: automatic from now on, no charge yet (the trial invoice is CHF 0 and issues no certificate).
    const d = { env, store, fetch: w.f, slack: w.slack, log: () => {}, signature: async () => null };
    await handleMembershipWebhook(
      stripeEvent('evt_c', 'checkout.session.completed', { metadata: { source: 'zurichjs.com/membership', memberId: m.id }, subscription: 'sub_ada' }),
      d,
    );
    await handleMembershipWebhook(stripeEvent('evt_0', 'invoice.paid', paidInvoice('in_0', m.id, '2026-11-10', '2027-05-22', 0)), d);
    expect(await store.get(m.id)).toMatchObject({ status: 'active', paymentMode: 'automatic', stripeSubscriptionId: 'sub_ada', paidUntil: '2027-05-22' });
    expect(await store.certificates(m.id)).toEqual([]);
  });
});

describe('resigning (bylaws Art. 5)', () => {
  async function activeMember(openInvoices = 0) {
    const store = memoryStore();
    const w = world({ openInvoices });
    await handleCheckout(req('/api/membership/checkout', join), { env, store, session: async () => ada, fetch: w.f });
    const id = (await store.byEmail('ada@example.com'))!.id;
    await handleMembershipWebhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_1', id, '2026-11-10', '2027-11-10')), {
      env,
      store,
      fetch: w.f,
      slack: w.slack,
      log: () => {},
      signature: async () => null,
    });
    return { store, w, id };
  }

  it('records the resignation, posts the board card and emails a written copy', async () => {
    const { store, w, id } = await activeMember();
    const res = await handleResign(req('/api/membership/resign', {}), { env, store, session: async () => ada, fetch: w.f, slack: w.slack });
    expect(res.status).toBe(200);
    expect((await store.get(id))!.status).toBe('resigning');
    const card = w.slackPosts.at(-1)!;
    expect(card.text).toBe('Resignation from Ada Lovelace');
    expect(JSON.stringify(card.blocks)).toContain(CONFIRM_RESIGNATION);
    expect(w.emails.at(-1)).toMatchObject({ subject: 'We received your resignation' });
    expect((await handleResign(req('/api/membership/resign', {}), { env, store, session: async () => ada, fetch: w.f, slack: w.slack })).status).toBe(409);
  });

  it('lets only approvers confirm, ends the subscription with the paid period, and emails the member', async () => {
    const { store, w, id } = await activeMember();
    await handleResign(req('/api/membership/resign', {}), { env, store, session: async () => ada, fetch: w.f, slack: w.slack });
    const click = (user: string) => ({ action: CONFIRM_RESIGNATION, memberId: id, user, channel: CHANNEL, ts: '1700000000.000200' });
    const d = { env, store, slack: w.slack, origin: 'https://zurichjs.com', fetch: w.f, log: () => {}, now: () => new Date('2026-12-01T10:00:00Z') };
    expect(await handleMembershipClick(click('U-SOMEONE'), d)).toBe('not_allowed');
    expect(await handleMembershipClick(click(NADJA), d)).toBe('confirmed');
    expect(Object.fromEntries(w.calls.find((c) => c.path === 'subscriptions/sub_ada')!.params)).toEqual({ cancel_at_period_end: 'true' });
    expect(JSON.stringify(w.slackCalls.find((c) => c.method === 'update')!.args)).toContain(`Confirmed by <@${NADJA}> on 1 December 2026. Ends 9 November 2027.`);
    expect(w.emails.at(-1)).toMatchObject({ subject: 'Your resignation is confirmed' });
    // Stripe ends the subscription at the period end:
    await handleMembershipWebhook(stripeEvent('evt_end', 'customer.subscription.deleted', { id: 'sub_ada', metadata: { source: 'zurichjs.com/membership', memberId: id } }), {
      env,
      store,
      fetch: w.f,
      slack: w.slack,
      log: () => {},
    });
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'resigned' });
  });

  it('waits while dues are open, as the bylaws say', async () => {
    const { store, w, id } = await activeMember(1);
    await handleResign(req('/api/membership/resign', {}), { env, store, session: async () => ada, fetch: w.f, slack: w.slack });
    expect(w.emails.at(-1)!.text).toContain('takes effect once it is paid');
    const res = await handleMembershipClick(
      { action: CONFIRM_RESIGNATION, memberId: id, user: NADJA, channel: CHANNEL, ts: '1.2' },
      { env, store, slack: w.slack, origin: 'https://zurichjs.com', fetch: w.f, log: () => {} },
    );
    expect(res).toBe('open_dues');
    expect(w.calls.some((c) => c.path.startsWith('subscriptions/'))).toBe(false);
  });

  it('lapses a membership whose subscription ends without a resignation', async () => {
    const { store, w, id } = await activeMember();
    await handleMembershipWebhook(stripeEvent('evt_end', 'customer.subscription.deleted', { id: 'sub_ada', metadata: { source: 'zurichjs.com/membership', memberId: id } }), {
      env,
      store,
      fetch: w.f,
      slack: w.slack,
      log: () => {},
    });
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'lapsed' });
  });
});

describe('admin import', () => {
  const csv = [
    'kind,name,organisation,email,level,cycle,category,joined_at,paid_until,notes',
    'person,Ada Lovelace,,ada@example.com,supporter,yearly,active,2025-05-23,2027-05-22,',
  ].join('\n');
  const call = (body: unknown, token = ADMIN, store = memoryStore()) =>
    handleImport(
      new Request('https://zurichjs.com/api/membership/admin/import', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { env, store },
    );

  it('needs the admin password (Bearer, for the CLI)', async () => {
    expect((await call({ csv }, 'wrong-password-for-tests')).status).toBe(401);
    expect((await handleImport(new Request('https://x/api', { method: 'POST', body: '{}' }), { env: {}, store: memoryStore() })).status).toBe(503);
  });

  it('checks without writing, then imports with apply, and refuses duplicates', async () => {
    const store = memoryStore();
    expect(await (await call({ csv }, ADMIN, store)).json()).toMatchObject({ ok: true, applied: false, rows: [{ line: 2, email: 'ada@example.com' }] });
    expect(store.all()).toEqual([]);
    expect(await (await call({ csv, apply: true }, ADMIN, store)).json()).toMatchObject({ ok: true, applied: true, imported: 1 });
    expect(store.all()[0]).toMatchObject({ status: 'imported_manual', paymentMode: 'manual', paidUntil: '2027-05-22' });
    const again = await call({ csv, apply: true }, ADMIN, store);
    expect(again.status).toBe(400);
    expect(await again.json()).toMatchObject({ problems: [{ line: 2, message: 'ada@example.com is already a member.' }] });
  });
});
