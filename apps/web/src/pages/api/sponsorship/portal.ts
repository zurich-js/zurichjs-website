/**
 * Stripe's billing portal for the sponsor: payment method, billing email and invoices.
 * No plan changes or cancelling there (they go through this site and the agreement).
 *
 * POST /api/sponsorship/portal   (session cookie)   → 200 { ok, url } · 404 · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { createPortalSession } from '../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handleSponsorPortal = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, origin, lifecycle }) => {
      if (!sponsor?.stripeCustomerId) return fail(404, 'There are no payments for this sponsorship yet.');
      return json(200, { ok: true, url: await createPortalSession(sponsor, origin, lifecycle.stripe) });
    },
    'open the payment details',
  );

export const POST: APIRoute = ({ request }) => handleSponsorPortal(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
