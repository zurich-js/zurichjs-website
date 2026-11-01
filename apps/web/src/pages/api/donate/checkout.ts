/**
 * Starts an online donation (Stripe Checkout). Owner decision 2026-11-01.
 *
 * POST /api/donate/checkout  JSON { amount: CHF 5–1000, recurrence: 'once' | 'monthly', email?, website_url? }
 *   200 { ok: true, url }       redirect the browser to url (Stripe-hosted page)
 *   400 { ok: false, error, field }
 *   429 { ok: false, error }    too many attempts
 *   503 { ok: false, error }    payments not configured (no Stripe key): the page offers Twint and email
 *   502 { ok: false, error }    Stripe failed
 */
import type { APIRoute } from 'astro';
import { fail, isBot, json, methodNotAllowed, readJsonObject, type Env } from '../../../server/http';
import { clientKey, rateLimited } from '../../../server/rateLimit';
import { StripeUnavailable, createDonationCheckout, parseDonation } from '../../../server/stripe';

export const prerender = false;

/** Never trust the Host header for redirect URLs: production uses the site URL, previews their own deploy URL. */
export const trustedOrigin = (request: Request, env: Env) =>
  env.CONTEXT === 'production' ? (env.URL ?? 'https://zurichjs.com') : (env.DEPLOY_PRIME_URL ?? env.DEPLOY_URL ?? new URL(request.url).origin);

export async function handleCheckout(request: Request, deps: { env?: Env; fetch?: typeof fetch } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  if (rateLimited('donate', clientKey(request), 8, 10 * 60_000)) return fail(429, 'Too many attempts. Please wait a few minutes and try again.');
  const body = await readJsonObject(request);
  if (!body) return fail(400, 'Send the form as JSON.');
  if (isBot(body)) return fail(400, 'Leave the hidden field empty.', { field: 'website_url' });
  const parsed = parseDonation(body);
  if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
  try {
    const { url } = await createDonationCheckout(parsed.data, {
      env,
      origin: trustedOrigin(request, env),
      fetch: deps.fetch,
      idempotencyKey: typeof body.attempt === 'string' && /^[a-z0-9-]{8,64}$/i.test(body.attempt) ? `donate-${body.attempt}` : undefined,
    });
    return json(200, { ok: true, url });
  } catch (cause) {
    if (cause instanceof StripeUnavailable) {
      console.log(`[donate] ${cause.message}; online payments are off`);
      return fail(503, 'Online payments are not available right now. You can still give by Twint or by email below.');
    }
    console.error('[donate] checkout failed', cause);
    return fail(502, 'We couldn’t start the payment. Nothing was charged. Please try again, or give by Twint or email below.');
  }
}

export const POST: APIRoute = ({ request }) => handleCheckout(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
