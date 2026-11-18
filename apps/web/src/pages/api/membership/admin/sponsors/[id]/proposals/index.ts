/**
 * Propose a change agreed with the sponsor; they confirm it in the portal (owner, 18th November 2026).
 *   POST { kind: 'plan', tier, cycle, message? } | { kind: 'end', message? } → 200 { ok, proposal } · 400 · 404 · 409
 */
import { ProposalOpen, isCycle, isTier } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../../server/http.ts';
import { proposalView } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { propose } from '../../../../../../../server/sponsor-lifecycle.ts';

export const prerender = false;

export const handlePropose = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      const kind = body.kind === 'end' ? 'end' : body.kind === 'plan' ? 'plan' : null;
      if (!kind) return fail(400, 'Propose a plan change or an end.', { field: 'kind' });
      const message = text(body.message, 2000);
      if (message === false) return fail(400, 'Keep the message under 2000 characters, without < or >.', { field: 'message' });
      try {
        const p = await propose(
          s,
          { kind, tier: kind === 'plan' && isTier(body.tier) ? body.tier : null, cycle: kind === 'plan' && isCycle(body.cycle) ? body.cycle : null, message: message ?? null },
          BOARD,
          lifecycle,
        );
        return json(200, { ok: true, proposal: proposalView(p) });
      } catch (cause) {
        if (cause instanceof ProposalOpen) return fail(409, cause.message);
        throw cause;
      }
    },
    'send the proposal',
  );

export const POST: APIRoute = ({ request, params }) => handlePropose(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
