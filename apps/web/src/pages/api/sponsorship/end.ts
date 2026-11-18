/**
 * End the sponsorship with the paid period, signed under the agreement. Nothing more is
 * charged; it can be taken back until then (POST /api/sponsorship/end/undo).
 *
 * POST /api/sponsorship/end   (session cookie)   { signerName, signerTitle, agreementVersion }
 *   200 { ok, sponsor } · 400 · 404 · 409 · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parseSigner } from '../../../server/sponsor-input.ts';
import { endSponsorship } from '../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleEnd = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      const signer = parseSigner((await readJsonObject(request)) ?? {}, user.email);
      if (!signer.ok) return fail(400, signer.error, { field: signer.field });
      const s = await endSponsorship(sponsor, { kind: 'sponsor', id: user.id }, lifecycle, signer.value);
      return json(200, { ok: true, sponsor: sponsorView(s) });
    },
    'end the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handleEnd(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
