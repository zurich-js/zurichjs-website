/** Take back an end that has not happened yet. POST /api/sponsorship/end/undo → 200 { ok, sponsor } · 404 · 409. */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { sponsorView } from '../../../../server/sponsor.ts';
import { undoEnd } from '../../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleUndoEnd = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      return json(200, { ok: true, sponsor: sponsorView(await undoEnd(sponsor, { kind: 'sponsor', id: user.id }, lifecycle)) });
    },
    'keep the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handleUndoEnd(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
