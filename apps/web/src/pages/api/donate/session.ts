/**
 * The thanks page asks what was given, to say it back ("CHF 20 every month").
 * GET /api/donate/session?session_id=cs_…  → { ok: true, status, amount, currency, recurrence } or 404.
 * Returns no personal data.
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { StripeUnavailable, getDonationSession } from '../../../server/stripe.ts';

export const prerender = false;

export async function handleSession(request: Request, deps: { env?: Env; fetch?: typeof fetch } = {}): Promise<Response> {
  const id = new URL(request.url).searchParams.get('session_id') ?? '';
  try {
    const s = await getDonationSession(id, { env: deps.env ?? process.env, fetch: deps.fetch });
    return s ? json(200, { ok: true, ...s }) : fail(404, 'Unknown payment.');
  } catch (cause) {
    if (!(cause instanceof StripeUnavailable)) console.error('[donate] session lookup failed', cause);
    return fail(404, 'Unknown payment.');
  }
}

export const GET: APIRoute = ({ request }) => handleSession(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
