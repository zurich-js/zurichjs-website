/**
 * The meetups the signed-in contact's sponsorship covers, for the dashboard on /partners/account.
 * Loaded on its own, so a billing problem never hides them.
 *
 * GET (session cookie) → 200 { ok, meetups: [{ eventId, title, date, state }], checked } · 401 · 404 (no sponsorship) · 503 · 502
 *   state: upcoming · past · cancelled · moved (postponed) · unknown (no longer published)
 *   checked: false when Sanity could not be reached (stored title and date, state from the date)
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { coveredMeetups, sanityMeetups, type LiveLookup } from '../../../server/sponsor-coverage.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleCoverage = (request: Request, deps: SponsorRouteDeps & { live?: LiveLookup } = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, store, env }) => {
      if (!sponsor) return fail(404, 'No sponsorship for this email.');
      const r = await coveredMeetups(await store.meetups(sponsor.id), deps.live ?? sanityMeetups(env, deps.fetch), deps.now?.());
      return json(200, { ok: true, ...r });
    },
    'load your meetups',
  );

export const GET: APIRoute = ({ request }) => handleCoverage(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
