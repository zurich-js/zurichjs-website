/**
 * Processing-fee settings for the board: the fee gate and the card tariffs.
 *   GET → { ok, gate: { open, reason? , policyVersion?, tariff? }, tariffs: [...] }
 *   POST { version, ratePercent ("2.9"), fixedChf ("0.30"), note? } → 200 { ok, gate, tariffs } · 400 · 409 (version exists)
 * A tariff is never changed: a new one is a new version. The surcharge policy is approved by the
 * owner through SPONSOR_FEE_POLICY_VERSION, never here.
 */
import { DuplicateTariff, MAX_FIXED_MINOR, MAX_RATE_PPM, francsToMinor, percentToPpm } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../server/sponsor-admin.ts';
import { currentGate, feeStore, gateView, tariffView } from '../../../../server/sponsor-fees.ts';

export const prerender = false;

const VERSION = /^[A-Za-z0-9._-]{1,40}$/;

export const handleFees = (request: Request, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env }) => {
      const fees = deps.fees ?? feeStore(env);
      const answer = async () => json(200, { ok: true, gate: gateView(await currentGate(fees, env)), tariffs: (await fees.tariffs()).map(tariffView) });
      if (request.method === 'GET') return answer();
      const body = (await readJsonObject(request)) ?? {};
      const version = typeof body.version === 'string' ? body.version.trim() : '';
      if (!VERSION.test(version)) return fail(400, 'Give the tariff a version: letters, digits, dots, dashes, up to 40.', { field: 'version' });
      const rate = typeof body.ratePercent === 'string' ? percentToPpm(body.ratePercent) : null;
      if (rate === null || rate > MAX_RATE_PPM) return fail(400, 'Enter the rate as a percentage from 0 to 10, like 2.9.', { field: 'ratePercent' });
      const fixed = typeof body.fixedChf === 'string' ? francsToMinor(body.fixedChf) : null;
      if (fixed === null || fixed > MAX_FIXED_MINOR) return fail(400, 'Enter the fixed fee in francs from 0 to 10, like 0.30.', { field: 'fixedChf' });
      const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;
      try {
        await fees.addTariff({ version, method: 'card', currency: 'chf', ratePpm: rate, fixedMinor: fixed, note, enteredBy: 'board' });
      } catch (cause) {
        if (cause instanceof DuplicateTariff) return fail(409, cause.message, { field: 'version' });
        throw cause;
      }
      return answer();
    },
    'save the fee settings',
  );

export const GET: APIRoute = ({ request }) => handleFees(request);
export const POST: APIRoute = ({ request }) => handleFees(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
