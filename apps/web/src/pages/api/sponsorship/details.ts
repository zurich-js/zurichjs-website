/**
 * Company and billing details (name, legal name, billing address, VAT number, website).
 * Kept in step with the Stripe customer, so the next invoice shows them.
 *
 * POST /api/sponsorship/details   (session cookie)   { companyName?, legalName?, billingAddress?, vatId?, website? }
 *   200 { ok, sponsor } · 400 { error, field } · 404 · 409 ended · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parseDetails } from '../../../server/sponsor-input.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { ensureCustomer } from '../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handleDetails = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, store, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      if (sponsor.status === 'ended') return fail(409, 'This sponsorship has ended. Start a new one to change the details.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const parsed = parseDetails(body, false);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const s = await store.update(sponsor.id, parsed.value, { kind: 'sponsor', id: user.id });
      if (s.stripeCustomerId) await ensureCustomer(s, await store.contacts(s.id), store, lifecycle.stripe);
      return json(200, { ok: true, sponsor: sponsorView(s) });
    },
    'save the details',
  );

export const POST: APIRoute = ({ request }) => handleDetails(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
