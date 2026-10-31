/**
 * Minimal Stripe REST client over `fetch` for the ticket functions: prices,
 * coupons and Checkout Sessions. Plain fetch keeps the functions small and
 * lets tests stub the network. Same API version as production
 * (src/lib/stripe.ts).
 */
const API = 'https://api.stripe.com/v1';
const STRIPE_VERSION = '2025-08-27.basil';

export class StripeError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

type Params = Record<string, unknown>;

/** Stripe's form encoding: nested objects as a[b], arrays as a[0][b]. */
export function encodeForm(params: Params, prefix = '', out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (item && typeof item === 'object' ? encodeForm(item as Params, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') encodeForm(v as Params, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export function stripeClient(secretKey: string, fetchImpl: typeof fetch = fetch) {
  async function request<T>(method: 'GET' | 'POST', path: string, params?: Params): Promise<T> {
    const body = params ? encodeForm(params) : undefined;
    const url = method === 'GET' && body?.size ? `${API}${path}?${body}` : `${API}${path}`;
    const res = await fetchImpl(url, {
      method,
      headers: {
        authorization: `Bearer ${secretKey}`,
        'stripe-version': STRIPE_VERSION,
        ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      ...(method === 'POST' && body ? { body } : {}),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: string } };
    if (!res.ok) throw new StripeError(res.status, data.error?.message ?? `Stripe HTTP ${res.status}`, data.error?.code);
    return data as T;
  }
  const id = (s: string) => encodeURIComponent(s);
  return {
    getPrice: (priceId: string) => request<StripePrice>('GET', `/prices/${id(priceId)}`),
    getCoupon: (code: string) => request<StripeCoupon>('GET', `/coupons/${id(code)}`),
    createCheckoutSession: (params: Params) => request<{ id: string; url: string | null }>('POST', '/checkout/sessions', params),
    getCheckoutSession: (sessionId: string) => request<StripeCheckoutSession>('GET', `/checkout/sessions/${id(sessionId)}`, { expand: ['line_items'] }),
    updateCheckoutSession: (sessionId: string, params: Params) => request<StripeCheckoutSession>('POST', `/checkout/sessions/${id(sessionId)}`, params),
  };
}

export interface StripePrice {
  id: string;
  active: boolean;
  unit_amount: number | null;
  currency: string;
  type: 'one_time' | 'recurring';
}

export interface StripeCoupon {
  id: string;
  name: string | null;
  valid: boolean;
  percent_off: number | null;
  amount_off: number | null;
  currency: string | null;
}

export interface StripeCheckoutSession {
  id: string;
  status: 'open' | 'complete' | 'expired' | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number | null;
  currency: string | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
  line_items?: { data: { quantity: number | null; description?: string | null }[] };
}
