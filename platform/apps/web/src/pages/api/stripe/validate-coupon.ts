/**
 * Checks a discount code before checkout (Netlify Function). Same contract as production.
 *
 * GET /api/stripe/validate-coupon?code=SPRING
 *   200 { ok: true, id, code, percentOff, amountOff, currency, name, isValid: true }   amountOff in rappen
 *   400 { ok: false, error }   missing or malformed code, or the coupon has expired
 *   404 { ok: false, error }   no such coupon
 *   503 { ok: false, error }   STRIPE_SECRET_KEY missing
 *   502 { ok: false, error }   Stripe failed
 */
import type { APIRoute } from 'astro';
import { COUPON_CODE, fail, json, methodNotAllowed, type Env } from '../../../server/http';
import { StripeError, stripeClient } from '../../../server/stripe';

export const prerender = false;

const NOT_VALID = 'That discount code isn’t valid.';

export async function handleValidateCoupon(url: URL, deps: { env?: Env; fetch?: typeof fetch; log?: (m: string) => void } = {}): Promise<Response> {
  const { env = process.env, fetch: fetchImpl = fetch, log = console.log } = deps;
  const code = url.searchParams.get('code')?.trim() ?? '';
  if (!COUPON_CODE.test(code)) return fail(400, code ? NOT_VALID : 'Enter a discount code.');
  if (!env.STRIPE_SECRET_KEY) {
    log(`[tickets] STRIPE_SECRET_KEY missing; coupon ${code} not checked`);
    return fail(503, 'Discount codes can’t be checked right now.');
  }
  try {
    const c = await stripeClient(env.STRIPE_SECRET_KEY, fetchImpl).getCoupon(code);
    if (!c.valid) return fail(400, NOT_VALID);
    return json(200, { ok: true, id: c.id, code: c.id, percentOff: c.percent_off, amountOff: c.amount_off, currency: c.currency, name: c.name, isValid: true });
  } catch (cause) {
    if (cause instanceof StripeError && cause.status === 404) return fail(404, NOT_VALID);
    console.error('[tickets] coupon lookup failed', cause);
    return fail(502, 'Discount codes can’t be checked right now.');
  }
}

export const GET: APIRoute = ({ request }) => handleValidateCoupon(new URL(request.url));
export const ALL: APIRoute = () => methodNotAllowed('GET');
