import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL, handleGet, handlePost, parseCheckout } from '../src/pages/api/stripe/checkout-sessions';
import { handleGetPrice } from '../src/pages/api/stripe/get-price';
import { handleValidateCoupon } from '../src/pages/api/stripe/validate-coupon';
import { encodeForm } from '../src/server/stripe';

const log = () => {};
const NOW = () => new Date('2026-11-01T12:00:00Z');
const post = (data: unknown) =>
  new Request('https://zurichjs.com/api/stripe/checkout-sessions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof data === 'string' ? data : JSON.stringify(data),
  });
const body = async (res: Response) => (await res.json()) as Record<string, unknown>;
const jsonRes = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/** A fetch stub that answers Sanity and Stripe calls and records them. */
function stubFetch(routes: { sanity?: unknown; coupon?: [number, unknown]; session?: [number, unknown]; getSession?: [number, unknown]; price?: [number, unknown] }) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('.api.sanity.io/')) return jsonRes(200, { result: routes.sanity ?? null });
    if (url.includes('/v1/coupons/')) return jsonRes(...(routes.coupon ?? [404, { error: { message: 'No such coupon' } }]));
    if (url.includes('/v1/prices/')) return jsonRes(...(routes.price ?? [404, { error: { message: 'No such price' } }]));
    if (url.includes('/v1/checkout/sessions/') && (!init?.method || init.method === 'GET')) return jsonRes(...(routes.getSession ?? [404, {}]));
    if (url.includes('/v1/checkout/sessions')) return jsonRes(...(routes.session ?? [200, { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }]));
    if (url.includes('hooks.slack.com')) return new Response('ok');
    throw new Error(`unexpected fetch ${url}`);
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const VALID = { priceId: 'price_123', eventId: 'pro-meetup-nov', quantity: 2 };
const ENV = { STRIPE_SECRET_KEY: 'sk_test_x' };

describe('POST /api/stripe/checkout-sessions', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('answers 405 with an Allow header for other methods', async () => {
    const res = await ALL({} as never);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, POST');
  });

  it('rejects invalid JSON', async () => {
    const res = await handlePost(post('{nope'), { env: ENV, log });
    expect(res.status).toBe(400);
    expect((await body(res)).ok).toBe(false);
  });

  it.each([
    [{ ...VALID, priceId: '' }, 'priceId'],
    [{ ...VALID, priceId: 'price_<script>' }, 'priceId'],
    [{ ...VALID, eventId: undefined }, 'eventId'],
    [{ ...VALID, quantity: 0 }, 'quantity'],
    [{ ...VALID, quantity: 11 }, 'quantity'],
    [{ ...VALID, quantity: 1.5 }, 'quantity'],
    [{ ...VALID, couponCode: 'BAD CODE' }, 'couponCode'],
    [{ ...VALID, email: 'nope' }, 'email'],
    [{ ...VALID, workshopId: 'react-performance' }, 'workshopId'],
    [{ ...VALID, ticketType: 'workshop' }, 'ticketType'],
  ])('rejects %o with a human error on %s', async (input, field) => {
    const res = await handlePost(post(input), { env: ENV, log });
    const b = await body(res);
    expect(res.status).toBe(400);
    expect(b.field).toBe(field);
    expect(typeof b.error).toBe('string');
  });

  it('accepts the production payload and coerces a string quantity', () => {
    const r = parseCheckout({ priceId: 'price_1', eventId: 'x', quantity: '3', couponCode: '', ticketType: 'event', email: ' A@B.ch ' });
    expect(r).toEqual({ ok: true, data: { priceId: 'price_1', eventId: 'x', quantity: 3, couponCode: undefined, email: 'a@b.ch' } });
  });

  it('answers 503 and logs when STRIPE_SECRET_KEY is missing', async () => {
    const lines: string[] = [];
    const res = await handlePost(post(VALID), { env: {}, log: (m) => lines.push(m) });
    expect(res.status).toBe(503);
    expect(String((await body(res)).error)).toMatch(/nothing was charged/);
    expect(lines.join()).toMatch(/STRIPE_SECRET_KEY missing/);
  });

  it('refuses a price the event does not sell', async () => {
    const { impl } = stubFetch({ sanity: { title: 'Pro', datetime: '2026-12-01T18:00:00Z', stripePriceId: 'price_other' } });
    const res = await handlePost(post(VALID), { env: ENV, fetch: impl, now: NOW, log });
    expect(res.status).toBe(400);
    expect((await body(res)).field).toBe('priceId');
  });

  it('refuses events that have started', async () => {
    const { impl } = stubFetch({ sanity: { datetime: '2026-10-01T18:00:00Z', stripePriceId: 'price_123' } });
    const res = await handlePost(post(VALID), { env: ENV, fetch: impl, now: NOW, log });
    expect(res.status).toBe(400);
    expect(String((await body(res)).error)).toMatch(/closed/);
  });

  it('refuses an unknown coupon instead of silently charging full price', async () => {
    const { impl } = stubFetch({ sanity: { datetime: '2026-12-01T18:00:00Z', stripePriceId: 'price_123' } });
    const res = await handlePost(post({ ...VALID, couponCode: 'NOPE' }), { env: ENV, fetch: impl, now: NOW, log });
    expect(res.status).toBe(400);
    expect((await body(res)).field).toBe('couponCode');
  });

  it('creates a Checkout Session and returns its URL', async () => {
    const { impl, calls } = stubFetch({
      sanity: { datetime: '2026-12-01T18:00:00Z', stripePriceId: 'price_123' },
      coupon: [200, { id: 'SPRING', valid: true, percent_off: 20, amount_off: null }],
    });
    const res = await handlePost(post({ ...VALID, couponCode: 'SPRING' }), { env: ENV, fetch: impl, now: NOW, log });
    expect(res.status).toBe(200);
    expect(await body(res)).toEqual({ ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const create = calls.find((c) => c.url.endsWith('/v1/checkout/sessions'))!;
    const sent = new URLSearchParams(String(create.init?.body));
    expect(sent.get('line_items[0][price]')).toBe('price_123');
    expect(sent.get('line_items[0][quantity]')).toBe('2');
    expect(sent.get('discounts[0][coupon]')).toBe('SPRING');
    expect(sent.get('metadata[eventId]')).toBe('pro-meetup-nov');
    expect(sent.get('success_url')).toBe('https://zurichjs.com/success?type=ticket&event=pro-meetup-nov&session_id={CHECKOUT_SESSION_ID}');
    expect(sent.get('cancel_url')).toBe('https://zurichjs.com/events/pro-meetup-nov?canceled=true&coupon=SPRING#tickets');
    expect((create.init?.headers as Record<string, string> | undefined)?.authorization).toBe('Bearer sk_test_x');
  });

  it('answers 502 when Stripe fails', async () => {
    const { impl } = stubFetch({ sanity: { stripePriceId: 'price_123' }, session: [500, { error: { message: 'boom' } }] });
    const res = await handlePost(post(VALID), { env: ENV, fetch: impl, now: NOW, log });
    expect(res.status).toBe(502);
    expect(String((await body(res)).error)).toMatch(/Nothing was charged/);
  });
});

describe('GET /api/stripe/checkout-sessions', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());
  const url = (id: string) => new URL(`https://zurichjs.com/api/stripe/checkout-sessions?session_id=${id}`);

  it('rejects a malformed session id', async () => {
    expect((await handleGet(url('nope'), { env: ENV, log })).status).toBe(400);
  });

  it('answers 503 without STRIPE_SECRET_KEY', async () => {
    expect((await handleGet(url('cs_test_1'), { env: {}, log })).status).toBe(503);
  });

  it('reports a paid session and notifies the organisers once', async () => {
    const paid = {
      id: 'cs_test_1',
      status: 'complete',
      payment_status: 'paid',
      amount_total: 5000,
      currency: 'chf',
      customer_details: { email: 'a@b.ch' },
      metadata: { kind: 'ticket', eventId: 'pro-meetup-nov', couponCode: '' },
      line_items: { data: [{ quantity: 2 }] },
    };
    const { impl, calls } = stubFetch({ getSession: [200, paid], session: [200, paid] });
    // postSlack (@zurichjs/integrations) uses the global fetch.
    const slack = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', slack);
    const res = await handleGet(url('cs_test_1'), { env: { ...ENV, SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x' }, fetch: impl, log });
    vi.unstubAllGlobals();
    expect(await body(res)).toMatchObject({ ok: true, paymentStatus: 'paid', eventId: 'pro-meetup-nov', quantity: 2, amountTotal: 5000, currency: 'chf' });
    expect(String((slack.mock.calls[0] as unknown as [string, RequestInit])[1].body)).toContain('pro-meetup-nov');
    const update = calls.find((c) => c.url.endsWith('/v1/checkout/sessions/cs_test_1') && c.init?.method === 'POST');
    expect(new URLSearchParams(String(update?.init?.body)).get('metadata[notified]')).toBe('yes');

    // Already notified: no second Slack message.
    const again = stubFetch({ getSession: [200, { ...paid, metadata: { ...paid.metadata, notified: 'yes' } }] });
    const slack2 = vi.fn(async () => new Response('ok'));
    vi.stubGlobal('fetch', slack2);
    await handleGet(url('cs_test_1'), { env: { ...ENV, SLACK_WEBHOOK_URL: 'https://hooks.slack.com/x' }, fetch: again.impl, log });
    vi.unstubAllGlobals();
    expect(slack2).not.toHaveBeenCalled();
  });

  it('does not mark a session as notified when Slack is not configured', async () => {
    const paid = { id: 'cs_test_2', status: 'complete', payment_status: 'paid', amount_total: 2500, currency: 'chf', metadata: { kind: 'ticket', eventId: 'x' } };
    const { impl, calls } = stubFetch({ getSession: [200, paid] });
    const lines: string[] = [];
    await handleGet(url('cs_test_2'), { env: ENV, fetch: impl, log: (m) => lines.push(m) });
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    expect(lines.join()).toMatch(/SLACK_WEBHOOK_URL missing/);
  });
});

describe('GET /api/stripe/get-price and validate-coupon', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('validates the price id and stubs without a key', async () => {
    expect((await handleGetPrice(new URL('https://x/api?priceId='), { env: ENV, log })).status).toBe(400);
    const lines: string[] = [];
    expect((await handleGetPrice(new URL('https://x/api?priceId=price_1'), { env: {}, log: (m) => lines.push(m) })).status).toBe(503);
    expect(lines.join()).toMatch(/STRIPE_SECRET_KEY missing/);
  });

  it('returns the production price shape', async () => {
    const { impl } = stubFetch({ price: [200, { id: 'price_1', active: true, unit_amount: 2500, currency: 'chf', type: 'one_time' }] });
    const res = await handleGetPrice(new URL('https://x/api?priceId=price_1'), { env: ENV, fetch: impl, log });
    expect(await body(res)).toEqual({ ok: true, id: 'price_1', unitAmount: 2500, currency: 'chf', type: 'one_time' });
  });

  it('checks coupons', async () => {
    expect((await handleValidateCoupon(new URL('https://x/api?code=bad%20code'), { env: ENV, log })).status).toBe(400);
    const { impl } = stubFetch({});
    expect((await handleValidateCoupon(new URL('https://x/api?code=NOPE'), { env: ENV, fetch: impl, log })).status).toBe(404);
    const ok = stubFetch({ coupon: [200, { id: 'SPRING', name: 'Spring', valid: true, percent_off: 20, amount_off: null, currency: null }] });
    const res = await handleValidateCoupon(new URL('https://x/api?code=SPRING'), { env: ENV, fetch: ok.impl, log });
    expect(await body(res)).toMatchObject({ ok: true, code: 'SPRING', percentOff: 20, isValid: true });
  });
});

describe('encodeForm', () => {
  it('encodes nested objects and arrays the way Stripe expects', () => {
    expect(String(encodeForm({ a: 1, b: { c: 'x' }, d: [{ e: 2 }], skip: undefined, empty: '' }))).toBe('a=1&b%5Bc%5D=x&d%5B0%5D%5Be%5D=2');
  });
});
