/**
 * A raffle's public page data, once entries opened (docs/domains/sponsorship/raffles.md).
 *   GET ?r=<raffle id> → 200 { ok, raffle: PublicRaffleView } · 404 (no such raffle, or not public yet)
 * Winners are shown by claim code only. No entrant data.
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { PUBLIC_STAGES, publicRaffleView } from '../../../server/raffle.ts';
import { raffleRoute, type RaffleRouteDeps } from '../../../server/raffle-route.ts';

export const prerender = false;

export const handleRaffleInfo = (request: Request, deps: RaffleRouteDeps = {}) =>
  raffleRoute(
    request,
    deps,
    async ({ raffles, sponsors, now }) => {
      const id = new URL(request.url).searchParams.get('r') ?? '';
      const r = await raffles.get(id);
      if (!r || !PUBLIC_STAGES.includes(r.stage) || !r.openedAt) return fail(404, 'No such raffle.');
      const [s, draws] = await Promise.all([sponsors.get(r.sponsorId), raffles.draws(r.id)]);
      const entries = draws.length ? await raffles.entries(r.id) : [];
      const last = draws.at(-1);
      const code = last ? entries.find((e) => e.id === last.entryId)?.claimCode : undefined;
      return json(200, { ok: true, raffle: publicRaffleView(r, s?.companyName ?? 'a sponsor', code ? [code] : [], now) });
    },
    'load the raffle',
  );

export const GET: APIRoute = ({ request }) => handleRaffleInfo(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
