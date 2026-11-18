/**
 * Answer the board's proposal. Accepting signs the agreement for the change and applies it.
 *
 * POST /api/sponsorship/proposals/:id   (session cookie)
 *   { decision: 'accept', signerName, signerTitle, agreementVersion } | { decision: 'decline' }
 *   200 { ok, sponsor } · 400 · 404 · 409 (already answered, expired) · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { sponsorView } from '../../../../server/sponsor.ts';
import { parseSigner } from '../../../../server/sponsor-input.ts';
import { acceptProposal, declineProposal } from '../../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleProposal = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, lifecycle }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      const p = await store.getProposal(id);
      if (!p || p.sponsorId !== sponsor.id) return fail(404, 'No such proposal.');
      const body = (await readJsonObject(request)) ?? {};
      if (body.decision === 'decline') {
        await declineProposal(p, sponsor, contact, lifecycle);
        return json(200, { ok: true, sponsor: sponsorView(sponsor) });
      }
      if (body.decision !== 'accept') return fail(400, 'Accept or decline the proposal.', { field: 'decision' });
      const signer = parseSigner(body, user.email);
      if (!signer.ok) return fail(400, signer.error, { field: signer.field });
      return json(200, { ok: true, sponsor: sponsorView(await acceptProposal(p, sponsor, contact, signer.value, lifecycle)) });
    },
    'answer the proposal',
  );

export const POST: APIRoute = ({ request, params }) => handleProposal(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
