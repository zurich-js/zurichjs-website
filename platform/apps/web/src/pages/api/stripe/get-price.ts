/**
 * Ticket price for the event page (Netlify Function). Same contract as production.
 *
 * GET /api/stripe/get-price?priceId=price_...
 *   200 { ok: true, id, unitAmount, currency, type }   unitAmount in the smallest unit (rappen)
 *   400 { ok: false, error }   missing or malformed priceId
 *   404 { ok: false, error }   unknown or inactive price
 *   503 { ok: false, error }   STRIPE_SECRET_KEY missing (the island then shows "Price shown at checkout")
 *   502 { ok: false, error }   Stripe failed
 */
import type { APIRoute } from 'astro';
import { STRIPE_ID, fail, json, methodNotAllowed, type Env } from '../../../server/http';
import { StripeError, stripeClient } from '../../../server/stripe';

export const prerender = false;

export async function handleGetPrice(url: URL, deps: { env?: Env; fetch?: typeof fetch; log?: (m: string) => void } = {}): Promise<Response> {
  const { env = process.env, fetch: fetchImpl = fetch, log = console.log } = deps;
  const priceId = url.searchParams.get('priceId')?.trim() ?? '';
  if (!STRIPE_ID.test(priceId)) return fail(400, 'Add the price to look up.');
  if (!env.STRIPE_SECRET_KEY) {
    log(`[tickets] STRIPE_SECRET_KEY missing; price ${priceId} not looked up`);
    return fail(503, 'The price isn’t available right now.');
  }
  try {
    const p = await stripeClient(env.STRIPE_SECRET_KEY, fetchImpl).getPrice(priceId);
    if (!p.active) return fail(404, 'This ticket isn’t on sale right now.');
    // Short public cache: the price rarely changes and every event page asks for it.
    return json(200, { ok: true, id: p.id, unitAmount: p.unit_amount, currency: p.currency, type: p.type }, { 'cache-control': 'public, max-age=300' });
  } catch (cause) {
    if (cause instanceof StripeError && cause.status === 404) return fail(404, 'This ticket isn’t on sale right now.');
    console.error('[tickets] price lookup failed', cause);
    return fail(502, 'The price isn’t available right now.');
  }
}

export const GET: APIRoute = ({ request }) => handleGetPrice(new URL(request.url));
export const ALL: APIRoute = () => methodNotAllowed('GET');
