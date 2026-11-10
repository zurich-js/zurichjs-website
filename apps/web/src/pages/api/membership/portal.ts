/**
 * Opens the Stripe billing portal for the signed-in member: payment method,
 * invoices, and switching between quarterly and yearly (or the level). No
 * cancellation there: members resign through the board (bylaws Art. 5).
 *
 * POST /api/membership/portal   (session cookie)
 *   200 { ok: true, url } · 404 no paying membership · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { createPortalSession } from '../../../server/membership-stripe.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';

export const prerender = false;

export const handlePortal = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ member, origin, env }) => {
      if (!member?.stripeCustomerId) return fail(404, 'There is no payment set up for your membership yet.');
      return json(200, { ok: true, url: await createPortalSession(member, origin, { env, fetch: deps.fetch }) });
    },
    'open the payment settings',
  );

export const POST: APIRoute = ({ request }) => handlePortal(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
