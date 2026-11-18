/**
 * Email a change agreed with the sponsor; they confirm it on their sponsorship page, which the link
 * fills in (owner, 18th November 2026). Nothing changes until they do.
 *   POST { kind: 'plan', tier, cycle, message? } | { kind: 'end', message? } → 200 { ok, url, emailed } · 400 · 404 · 409
 */
import { isCycle, isTier } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { suggestChange } from '../../../../../../server/sponsor-lifecycle.ts';

export const prerender = false;

export const handleSuggest = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      const message = text(body.message, 2000);
      if (message === false) return fail(400, 'Keep the message under 2000 characters, without < or >.', { field: 'message' });
      if (body.kind === 'end') return json(200, { ok: true, ...(await suggestChange(s, { kind: 'end' }, message ?? null, BOARD, lifecycle)) });
      if (body.kind !== 'plan') return fail(400, 'Choose a new plan or the end.', { field: 'kind' });
      if (!isTier(body.tier)) return fail(400, 'Choose the tier.', { field: 'tier' });
      if (!isCycle(body.cycle) || body.cycle === 'once') return fail(400, 'Choose monthly, quarterly or yearly.', { field: 'cycle' });
      return json(200, { ok: true, ...(await suggestChange(s, { kind: 'plan', tier: body.tier, cycle: body.cycle }, message ?? null, BOARD, lifecycle)) });
    },
    'send the change',
  );

export const POST: APIRoute = ({ request, params }) => handleSuggest(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
