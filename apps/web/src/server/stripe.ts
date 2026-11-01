/**
 * Online donations through Stripe Checkout (owner decision 2026-11-01:
 * donations stay online, one-time and monthly). Plain fetch to Stripe's REST
 * API, no SDK: small, and testable with an injected fetch.
 *
 * Environment (the production site's existing names):
 *   STRIPE_SECRET_KEY            sk_live_… in production, sk_test_… for tests
 *   STRIPE_SUPPORT_PRODUCT_ID    the "Support ZurichJS" product
 *   STRIPE_WEBHOOK_SECRET        optional: posts new donations to Slack
 *   PUBLIC_STRIPE_PORTAL_URL     optional: Stripe customer-portal login link
 *                                ("Manage or cancel your monthly support")
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from './http';

export const MIN_CHF = 5;
export const MAX_CHF = 1000;

export type Recurrence = 'once' | 'monthly';

export interface DonationRequest {
  amount: number;
  recurrence: Recurrence;
  email?: string;
}

type Fetch = typeof fetch;

/** Stripe's form encoding for nested params: line_items[0][price_data][currency]=chf. */
export function stripeForm(params: Record<string, unknown>, prefix = ''): URLSearchParams {
  const out = new URLSearchParams();
  const walk = (value: unknown, key: string) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${key}[${i}]`));
    else if (typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, key ? `${key}[${k}]` : k);
    else out.append(key, String(value));
  };
  walk(params, prefix);
  return out;
}

export function parseDonation(body: Record<string, unknown>): { ok: true; data: DonationRequest } | { ok: false; error: string; field: string } {
  const amount = typeof body.amount === 'number' ? body.amount : typeof body.amount === 'string' ? Number(body.amount.replace(',', '.')) : NaN;
  if (!Number.isFinite(amount) || amount < MIN_CHF || amount > MAX_CHF) return { ok: false, error: `Choose an amount from CHF ${MIN_CHF} to CHF ${MAX_CHF}.`, field: 'amount' };
  if (Math.round(amount * 100) !== amount * 100) return { ok: false, error: 'Use whole francs or rappen (two decimals at most).', field: 'amount' };
  const recurrence = body.recurrence === 'monthly' ? 'monthly' : body.recurrence === 'once' || body.recurrence === undefined ? 'once' : null;
  if (!recurrence) return { ok: false, error: 'Choose one-time or monthly.', field: 'recurrence' };
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : undefined;
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return { ok: false, error: 'Check the email, or leave it empty.', field: 'email' };
  return { ok: true, data: { amount, recurrence, email } };
}

export class StripeUnavailable extends Error {}

async function stripe<T>(env: Env, fetchImpl: Fetch, method: 'GET' | 'POST', path: string, params?: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeUnavailable('STRIPE_SECRET_KEY is not set');
  const url = `https://api.stripe.com/v1/${path}${method === 'GET' && params ? `?${params}` : ''}`;
  const res = await fetchImpl(url, {
    method,
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/x-www-form-urlencoded',
      'stripe-version': '2025-08-27.basil',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: method === 'POST' ? params?.toString() : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe ${path} failed: HTTP ${res.status} ${json.error?.message ?? ''}`.trim());
  return json;
}

/** Creates a Checkout Session and returns the URL to send the visitor to. */
export async function createDonationCheckout(d: DonationRequest, deps: { env: Env; origin: string; fetch?: Fetch; idempotencyKey?: string }): Promise<{ url: string; id: string }> {
  const { env, origin, fetch: f = fetch } = deps;
  if (!env.STRIPE_SUPPORT_PRODUCT_ID) throw new StripeUnavailable('STRIPE_SUPPORT_PRODUCT_ID is not set');
  const monthly = d.recurrence === 'monthly';
  const params = stripeForm({
    mode: monthly ? 'subscription' : 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'chf',
          product: env.STRIPE_SUPPORT_PRODUCT_ID,
          unit_amount: Math.round(d.amount * 100),
          ...(monthly ? { recurring: { interval: 'month' } } : {}),
        },
      },
    ],
    success_url: `${origin}/donate/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/donate?canceled=1#donate`,
    customer_email: d.email,
    submit_type: monthly ? undefined : 'donate',
    metadata: { source: 'zurichjs.com/donate', recurrence: d.recurrence, amount_chf: String(d.amount) },
    ...(monthly ? { subscription_data: { metadata: { source: 'zurichjs.com/donate' } } } : {}),
  });
  const s = await stripe<{ id: string; url: string }>(env, f, 'POST', 'checkout/sessions', params, deps.idempotencyKey);
  return { url: s.url, id: s.id };
}

export interface DonationSummary {
  status: 'paid' | 'open' | 'unpaid';
  amount: number;
  currency: string;
  recurrence: Recurrence;
}

/** What the thanks page shows: amount and whether it is monthly. No personal data. */
export async function getDonationSession(id: string, deps: { env: Env; fetch?: Fetch }): Promise<DonationSummary | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return null;
  const s = await stripe<{ amount_total?: number; currency?: string; mode?: string; payment_status?: string; status?: string; metadata?: Record<string, string> }>(
    deps.env,
    deps.fetch ?? fetch,
    'GET',
    `checkout/sessions/${id}`,
  );
  if (s.metadata?.source !== 'zurichjs.com/donate') return null;
  return {
    status: s.payment_status === 'paid' || s.payment_status === 'no_payment_required' ? 'paid' : s.status === 'open' ? 'open' : 'unpaid',
    amount: (s.amount_total ?? 0) / 100,
    currency: (s.currency ?? 'chf').toUpperCase(),
    recurrence: s.mode === 'subscription' ? 'monthly' : 'once',
  };
}

/** Verifies a Stripe-Signature header (`t=…,v1=…`) within a 5-minute tolerance. */
export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(now / 1000 - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return header
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .some((p) => {
      const sig = Buffer.from(p.slice(3), 'hex');
      const exp = Buffer.from(expected, 'hex');
      return sig.length === exp.length && timingSafeEqual(sig, exp);
    });
}
