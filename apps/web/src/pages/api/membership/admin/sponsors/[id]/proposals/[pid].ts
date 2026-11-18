/** Withdraw a proposal that waits for the sponsor. POST → 200 { ok, proposal } · 404 · 409 already answered. */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../../server/http.ts';
import { note, proposalView, who } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';

export const prerender = false;

export const handleWithdrawProposal = (request: Request, id: string, pid: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      const p = await store.getProposal(pid);
      if (!s || !p || p.sponsorId !== s.id) return fail(404, 'No such proposal.');
      const withdrawn = await store.decideProposal(p.id, 'withdrawn', 'board', BOARD);
      await note(`:leftwards_arrow_with_hook: Proposal to ${who(s)} withdrawn.`, lifecycle);
      return json(200, { ok: true, proposal: proposalView(withdrawn) });
    },
    'withdraw the proposal',
  );

export const POST: APIRoute = ({ request, params }) => handleWithdrawProposal(request, String(params.id ?? ''), String(params.pid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
