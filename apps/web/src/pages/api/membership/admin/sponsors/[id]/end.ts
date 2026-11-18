/**
 * End a sponsorship outright, without the sponsor's confirmation: `terminated` (e.g. a breach of
 * the agreement) for one that is running, `withdrawn` for an invitation nobody paid. For an end the
 * sponsor agreed to, send them the change to confirm instead. Stripe stops at once; logged.
 *   POST { reason } → 200 { ok, sponsor } · 400 · 404 · 409
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { boardEnd } from '../../../../../../server/sponsor-lifecycle.ts';

export const prerender = false;

const REASONS = ['terminated', 'withdrawn'] as const;

export const handleBoardEnd = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = ((await readJsonObject(request)) ?? {}) as { reason?: unknown };
      const reason = REASONS.find((r) => r === body.reason);
      if (!reason) return fail(400, 'Say why: terminated or withdrawn.', { field: 'reason' });
      return json(200, { ok: true, sponsor: adminSponsorView(await boardEnd(s, reason, BOARD, lifecycle)) });
    },
    'end the sponsorship',
  );

export const POST: APIRoute = ({ request, params }) => handleBoardEnd(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
