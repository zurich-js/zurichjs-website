/**
 * The meetups the signed-in contact's sponsorship covers, for the dashboard on /partners/account.
 * Loaded on its own, and also shown when /api/sponsorship/me fails, so a billing problem never hides them.
 *
 * GET (session cookie) → 200 { ok, once, meetups: [{ eventId, title, date, state, url }], checked } · 401 · 404 (no sponsorship) · 503 · 502
 *   once: a one-time sponsorship (its meetups are chosen in its plan)
 *   url: the public meetup page, or null when Sanity was not reached or no longer lists it
 *   state: upcoming · past · cancelled · moved (postponed) · unknown (no longer published)
 *   checked: false when Sanity could not be reached (stored title and date, state from the date)
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { raffleStore } from '../../../server/raffle.ts';
import { coveredMeetups, sanityMeetups, type LiveLookup } from '../../../server/sponsor-coverage.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleCoverage = (request: Request, deps: SponsorRouteDeps & { live?: LiveLookup } = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, store, env }) => {
      if (!sponsor) return fail(404, 'No sponsorship for this email.');
      const [r, raffles] = await Promise.all([
        coveredMeetups(await store.meetups(sponsor.id), deps.live ?? sanityMeetups(env, deps.fetch), deps.now?.()),
        (async () => (deps.raffles ?? raffleStore(env)).bySponsor(sponsor.id))().catch(() => null),
      ]);
      const meetups = r.meetups.map((m) => ({ ...m, raffles: (raffles ?? []).filter((x) => x.eventId === m.eventId).map((x) => ({ id: x.id, prize: x.prize })) }));
      return json(200, { ok: true, once: sponsor.cycle === 'once', checked: r.checked, rafflesChecked: raffles !== null, meetups });
    },
    'load your meetups',
  );

export const GET: APIRoute = ({ request }) => handleCoverage(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
