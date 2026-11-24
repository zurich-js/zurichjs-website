/**
 * Stripe's billing portal for the sponsor: payment method, billing email and invoices.
 * No plan changes or cancelling there (they go through this site and the agreement).
 *
 * POST /api/sponsorship/portal   (session cookie)   → 200 { ok, url } · 404 · 401 · 503 · 502
 * A missing portal configuration is a 503 about card and receipts only; the rest of the page works.
 */
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, fail, json, methodNotAllowed } from '../../../server/http.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { createPortalSession } from '../../../server/sponsor-stripe.ts';
import { StripeUnavailable } from '../../../server/stripe.ts';

export const prerender = false;

export const handleSponsorPortal = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, origin, lifecycle }) => {
      if (!sponsor?.stripeCustomerId) return fail(404, 'There are no payments for this sponsorship yet.');
      try {
        return json(200, { ok: true, url: await createPortalSession(sponsor, origin, lifecycle.stripe) });
      } catch (cause) {
        if (!(cause instanceof StripeUnavailable)) throw cause;
        console.error('[sponsorship] billing portal not configured:', cause.message);
        return fail(503, `Card and receipts are not available right now. Write to ${CONTACT_EMAIL}.`);
      }
    },
    'open the payment details',
  );

export const POST: APIRoute = ({ request }) => handleSponsorPortal(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
