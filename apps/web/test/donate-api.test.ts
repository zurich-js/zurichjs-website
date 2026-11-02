import { createHmac } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCheckout, trustedOrigin } from '../src/pages/api/donate/checkout.ts';
import { handleSession } from '../src/pages/api/donate/session.ts';
import { handleWebhook } from '../src/pages/api/donate/webhook.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';
import { parseDonation, stripeApiBase, stripeForm, verifyStripeSignature } from '../src/server/stripe.ts';
import { startMockStripe, type MockStripe } from '../../../tools/mock-stripe.mjs';

const req = (data: unknown, headers: Record<string, string> = {}) =>
  new Request('https://zurichjs.com/api/donate/checkout', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
const env = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_SUPPORT_PRODUCT_ID: 'prod_support', CONTEXT: 'production', URL: 'https://zurichjs.com' };

describe('donations: input', () => {
  it('accepts CHF 5 to 1000, one-time or monthly', () => {
    expect(parseDonation({ amount: 20, recurrence: 'monthly' })).toEqual({ ok: true, data: { amount: 20, recurrence: 'monthly', email: undefined } });
    expect(parseDonation({ amount: '12,50' })).toMatchObject({ ok: true, data: { amount: 12.5, recurrence: 'once' } });
    expect(parseDonation({ amount: 4 })).toMatchObject({ ok: false, field: 'amount' });
    expect(parseDonation({ amount: 1001 })).toMatchObject({ ok: false, field: 'amount' });
    expect(parseDonation({ amount: 10.123 })).toMatchObject({ ok: false, field: 'amount' });
    expect(parseDonation({ amount: 10, recurrence: 'weekly' })).toMatchObject({ ok: false, field: 'recurrence' });
    expect(parseDonation({ amount: 10, email: 'nope' })).toMatchObject({ ok: false, field: 'email' });
  });
  it('encodes nested params the way Stripe expects', () => {
    expect(stripeForm({ a: [{ b: { c: 1 } }], d: undefined }).toString()).toBe('a%5B0%5D%5Bb%5D%5Bc%5D=1');
  });
});

describe('POST /api/donate/checkout', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('creates a monthly subscription session in CHF with safe return URLs', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }));
    const res = await handleCheckout(req({ amount: 20, recurrence: 'monthly', attempt: 'abcdefgh12' }, { host: 'evil.example' }), { env, fetch: fetchMock });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect((init.headers as Record<string, string>)['idempotency-key']).toBe('donate-abcdefgh12');
    const p = new URLSearchParams(String(init.body));
    expect(p.get('mode')).toBe('subscription');
    expect(p.get('line_items[0][price_data][currency]')).toBe('chf');
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('2000');
    expect(p.get('line_items[0][price_data][recurring][interval]')).toBe('month');
    expect(p.get('line_items[0][price_data][product]')).toBe('prod_support');
    expect(p.get('success_url')).toBe('https://zurichjs.com/donate/thanks?session_id={CHECKOUT_SESSION_ID}');
    expect(p.get('cancel_url')).toBe('https://zurichjs.com/donate?canceled=1#donate');
  });
  it('one-time donations are payments, not subscriptions', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'cs_test_2', url: 'https://checkout.stripe.com/x' }));
    await handleCheckout(req({ amount: 50, recurrence: 'once' }), { env, fetch: fetchMock });
    const p = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(p.get('mode')).toBe('payment');
    expect(p.get('line_items[0][price_data][recurring][interval]')).toBeNull();
  });
  it('one-time donations say "Donate" on Stripe and pass the receipt email', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'cs_test_2', url: 'https://checkout.stripe.com/x' }));
    await handleCheckout(req({ amount: 12.5, recurrence: 'once', email: 'anna@example.com' }), { env, fetch: fetchMock });
    const p = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(p.get('submit_type')).toBe('donate');
    expect(p.get('customer_email')).toBe('anna@example.com');
    expect(p.get('line_items[0][price_data][unit_amount]')).toBe('1250');
    expect(p.get('metadata[source]')).toBe('zurichjs.com/donate');
  });
  it('monthly donations send no submit_type (Stripe allows it only for payments) and tag the subscription', async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: 'cs_test_2', url: 'https://checkout.stripe.com/x' }));
    await handleCheckout(req({ amount: 20, recurrence: 'monthly' }), { env, fetch: fetchMock });
    const p = new URLSearchParams(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(p.get('submit_type')).toBeNull();
    expect(p.get('customer_email')).toBeNull();
    expect(p.get('subscription_data[metadata][source]')).toBe('zurichjs.com/donate');
  });
  it.each([
    ['no secret key', { STRIPE_SUPPORT_PRODUCT_ID: 'prod_support' }],
    ['no product', { STRIPE_SECRET_KEY: 'sk_test_123' }],
    ['nothing', {}],
  ])('answers 503 with %s, and names no alternative (the page adds the ones it shows)', async (_, e) => {
    const f = vi.fn();
    const res = await handleCheckout(req({ amount: 20 }), { env: e, fetch: f });
    expect(res.status).toBe(503);
    const b = (await res.json()) as { error: string; reason: string };
    expect(b).toMatchObject({ ok: false, reason: 'unavailable' });
    expect(b.error).toContain('Nothing was charged');
    expect(b.error).not.toMatch(/Twint|email/i);
    expect(f).not.toHaveBeenCalled();
  });
  it('answers 502 and says nothing was charged when Stripe fails', async () => {
    const res = await handleCheckout(req({ amount: 20 }), { env, fetch: vi.fn(async () => Response.json({ error: { message: 'boom' } }, { status: 500 })) });
    expect(res.status).toBe(502);
    const b = (await res.json()) as { error: string; reason: string };
    expect(b.reason).toBe('stripe');
    expect(b.error).toContain('Nothing was charged');
    expect(b.error).not.toMatch(/Twint/);
  });
  it('rejects bad input and bots, and rate-limits', async () => {
    expect((await handleCheckout(req({ amount: 1 }), { env, fetch: vi.fn() })).status).toBe(400);
    expect((await handleCheckout(req({ amount: 10, website_url: 'x' }), { env, fetch: vi.fn() })).status).toBe(400);
    const ok = vi.fn(async () => Response.json({ id: 'cs_test_3', url: 'https://checkout.stripe.com/x' }));
    for (let i = 0; i < 6; i++) await handleCheckout(req({ amount: 10 }), { env, fetch: ok });
    expect((await handleCheckout(req({ amount: 10 }), { env, fetch: ok })).status).toBe(429);
  });
  it('previews use their own deploy URL; production never trusts the Host header', () => {
    const r = new Request('https://evil.example/api/donate/checkout');
    expect(trustedOrigin(r, { CONTEXT: 'production' })).toBe('https://zurichjs.com');
    expect(trustedOrigin(r, { CONTEXT: 'deploy-preview', DEPLOY_PRIME_URL: 'https://deploy-preview-70--zurichjs.netlify.app' })).toBe(
      'https://deploy-preview-70--zurichjs.netlify.app',
    );
  });
});

describe('GET /api/donate/session', () => {
  it('returns amount and recurrence for our own sessions only', async () => {
    const ours = vi.fn(async () =>
      Response.json({ amount_total: 2000, currency: 'chf', mode: 'subscription', payment_status: 'paid', metadata: { source: 'zurichjs.com/donate' } }),
    );
    const res = await handleSession(new Request('https://zurichjs.com/api/donate/session?session_id=cs_test_abc'), { env, fetch: ours });
    expect(await res.json()).toEqual({ ok: true, status: 'paid', amount: 20, currency: 'CHF', recurrence: 'monthly' });
    const theirs = vi.fn(async () => Response.json({ amount_total: 2000, metadata: {} }));
    expect((await handleSession(new Request('https://zurichjs.com/api/donate/session?session_id=cs_test_abc'), { env, fetch: theirs })).status).toBe(404);
    expect((await handleSession(new Request('https://zurichjs.com/api/donate/session?session_id=../../x'), { env, fetch: ours })).status).toBe(404);
  });
});

describe('POST /api/donate/webhook', () => {
  const secret = 'whsec_test';
  const sign = (payload: string, t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
  it('verifies the Stripe signature and its age', () => {
    const p = '{"a":1}';
    expect(verifyStripeSignature(p, sign(p), secret)).toBe(true);
    expect(verifyStripeSignature(p, sign(p), 'other')).toBe(false);
    expect(verifyStripeSignature(p, sign(p, Math.floor(Date.now() / 1000) - 600), secret)).toBe(false);
    expect(verifyStripeSignature(p, null, secret)).toBe(false);
  });
  it('posts new donations to Slack and refuses unsigned calls', async () => {
    const log = vi.fn();
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: { object: { amount_total: 2500, currency: 'chf', mode: 'payment', metadata: { source: 'zurichjs.com/donate' } } },
    });
    const ok = await handleWebhook(new Request('https://zurichjs.com/api/donate/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': sign(payload) } }), {
      env: { STRIPE_WEBHOOK_SECRET: secret },
      log,
    });
    expect(ok.status).toBe(200);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('New donation on zurichjs.com: CHF 25.00, one-time.'));
    const bad = await handleWebhook(new Request('https://zurichjs.com/api/donate/webhook', { method: 'POST', body: payload }), { env: { STRIPE_WEBHOOK_SECRET: secret }, log });
    expect(bad.status).toBe(400);
    const off = await handleWebhook(new Request('https://zurichjs.com/api/donate/webhook', { method: 'POST', body: payload }), { env: {}, log });
    expect(off.status).toBe(503);
  });
});

import { handleProfile } from '../src/pages/api/speaker-profile.ts';
import { profileLink, profileSpeaker } from '../src/server/profile-token.ts';
import { parseProfile } from '../src/server/speaker-profile.ts';

describe('speaker profile links', () => {
  const env = { JWT_SECRET: 's3cret' };
  const tokenOf = (link: string) => new URL(link).searchParams.get('token');
  it('accepts a fresh link for that speaker only, and rejects expired or foreign tokens', () => {
    const t = tokenOf(profileLink('anna-beispiel', env.JWT_SECRET, 'https://zurichjs.com', 30, Date.parse('2026-11-01')));
    expect(profileSpeaker(t, env, Date.parse('2026-11-02'))).toBe('anna-beispiel');
    expect(profileSpeaker(t, env, Date.parse('2026-12-15'))).toBeNull();
    expect(profileSpeaker(t, { JWT_SECRET: 'other' }, Date.parse('2026-11-02'))).toBeNull();
    expect(profileSpeaker(null, env)).toBeNull();
  });
  it('validates fields: name required, plain-text bio, links normalised, at most 8 topics', () => {
    expect(parseProfile({ name: '' })).toMatchObject({ ok: false, field: 'name' });
    expect(parseProfile({ name: 'Anna', bio: '<b>x</b>' })).toMatchObject({ ok: false, field: 'bio' });
    const ok = parseProfile({ name: ' Anna ', github: 'github.com/anna', interests: 'a, b, c, d, e, f, g, h, i' });
    expect(ok).toMatchObject({ ok: true, data: { name: 'Anna', github: 'https://github.com/anna' } });
    expect(ok.ok && ok.data.interests).toHaveLength(8);
  });
  it('answers 401 without a valid token and 503 without a Sanity write token', async () => {
    expect((await handleProfile(new Request('https://zurichjs.com/api/speaker-profile?token=x'), { env, client: null })).status).toBe(401);
    const t = tokenOf(profileLink('anna-beispiel', env.JWT_SECRET));
    expect((await handleProfile(new Request(`https://zurichjs.com/api/speaker-profile?token=${t}`), { env, client: null })).status).toBe(503);
  });
});

describe('STRIPE_API_BASE: a local mock Stripe over HTTP', () => {
  let mock: MockStripe;
  const local = () => ({ STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_SUPPORT_PRODUCT_ID: 'prod_mock', STRIPE_API_BASE: mock.url });
  beforeAll(async () => {
    mock = await startMockStripe(0);
  });
  afterAll(() => mock.close());
  beforeEach(() => resetRateLimits());

  it('is used only outside production, and only as a plain origin', () => {
    expect(stripeApiBase({})).toBe('https://api.stripe.com');
    expect(stripeApiBase({ STRIPE_API_BASE: 'http://localhost:4533/' })).toBe('http://localhost:4533');
    expect(stripeApiBase({ STRIPE_API_BASE: 'http://localhost:4533', CONTEXT: 'production' })).toBe('https://api.stripe.com');
    expect(stripeApiBase({ STRIPE_API_BASE: 'javascript:alert(1)' })).toBe('https://api.stripe.com');
  });

  it.each([
    ['once', 30, 'payment', 3000],
    ['monthly', 14.5, 'subscription', 1450],
  ] as const)('%s CHF %s: checkout, payment, then the thanks page reads it back', async (recurrence, amount, mode, cents) => {
    const res = await handleCheckout(new Request('http://localhost:4531/api/donate/checkout', { method: 'POST', body: JSON.stringify({ amount, recurrence }) }), { env: local() });
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    const id = url.split('/').pop()!;
    const created = mock.requests.at(-1)!;
    expect(created).toMatchObject({ method: 'POST', path: '/v1/checkout/sessions', auth: 'Bearer sk_test_mock', version: '2025-08-27.basil' });
    expect(created.form).toMatchObject({ mode, 'line_items[0][price_data][currency]': 'chf', 'line_items[0][price_data][unit_amount]': String(cents) });
    expect(created.form.success_url).toBe('http://localhost:4531/donate/thanks?session_id={CHECKOUT_SESSION_ID}');
    expect(created.form.cancel_url).toBe('http://localhost:4531/donate?canceled=1#donate');

    const lookup = () => handleSession(new Request(`http://localhost:4531/api/donate/session?session_id=${id}`), { env: local() });
    expect(await (await lookup()).json()).toMatchObject({ ok: true, status: 'open', amount, recurrence });
    const paid = await fetch(`${mock.url}/pay/${id}/complete`, { redirect: 'manual' });
    expect(paid.headers.get('location')).toBe(`http://localhost:4531/donate/thanks?session_id=${id}`);
    expect(await (await lookup()).json()).toEqual({ ok: true, status: 'paid', amount, currency: 'CHF', recurrence });
  });

  it('a Stripe error becomes 502, and an unknown session 404', async () => {
    const res = await handleCheckout(new Request('http://localhost:4531/api/donate/checkout', { method: 'POST', body: JSON.stringify({ amount: 999 }) }), { env: local() });
    expect(res.status).toBe(502);
    expect((await handleSession(new Request('http://localhost:4531/api/donate/session?session_id=cs_test_nope'), { env: local() })).status).toBe(404);
  });
});
