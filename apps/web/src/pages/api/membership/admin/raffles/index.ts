/**
 * Raffle add-ons for the board.
 *   GET ?sponsorId= → { ok, raffles: AdminRaffleView[], terms: { open, version?, reason? }, rules: { open, version?, reason? }, fees: gate }
 */
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../../../server/http.ts';
import { loadAdminView, raffleStore, rulesGate, termsGate } from '../../../../../server/raffle.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../server/sponsor-admin.ts';
import { currentGate, feeStore, gateView } from '../../../../../server/sponsor-fees.ts';

export const prerender = false;

export const handleAdminRaffles = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, origin }) => {
      const raffles = deps.raffles ?? raffleStore(env);
      const fees = deps.fees ?? feeStore(env);
      const sponsorId = new URL(request.url).searchParams.get('sponsorId');
      const list = sponsorId ? await raffles.bySponsor(sponsorId) : await raffles.list();
      const views = await Promise.all(list.map((r) => loadAdminView(r, raffles, fees, origin)));
      const gate = termsGate(env);
      const rules = rulesGate(env);
      return json(200, {
        ok: true,
        raffles: views,
        terms: gate.open ? { open: true, version: gate.version } : gate,
        rules: rules.open ? { open: true, version: rules.version } : rules,
        fees: gateView(await currentGate(fees, env)),
      });
    },
    'load the raffles',
  );

export const GET: APIRoute = ({ request }) => handleAdminRaffles(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
