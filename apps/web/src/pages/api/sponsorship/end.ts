/**
 * End the sponsorship with the paid period, confirmed under the agreement (one tick once it is
 * signed). Nothing more is charged; it can be taken back until then (POST /api/sponsorship/end/undo).
 * /partners/account?change=end (our "please confirm" email) fills this in.
 *
 * POST /api/sponsorship/end   (session cookie)   { confirm? | signerName?, signerTitle?, agreementVersion }
 *   200 { ok, sponsor } · 400 · 404 · 409 · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parseSignature } from '../../../server/sponsor-input.ts';
import { endSponsorship, resolveSigner } from '../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleEnd = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      const sig = parseSignature((await readJsonObject(request)) ?? {});
      if (!sig.ok) return fail(400, sig.error, { field: sig.field });
      const signer = await resolveSigner(sponsor, contact, sig.value, user.email, lifecycle);
      if (!signer) return fail(400, 'Confirm the end under the sponsorship agreement.', { field: 'agreement' });
      const s = await endSponsorship(sponsor, { kind: 'sponsor', id: user.id }, lifecycle, signer);
      return json(200, { ok: true, sponsor: sponsorView(s) });
    },
    'end the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handleEnd(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
