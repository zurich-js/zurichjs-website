/**
 * A sponsor's uploaded logo.
 *   GET → the file (sandboxed headers), for review and download
 *   POST { review: 'approved' | 'rejected', note? } → 200 { ok, logo }; the sponsor is emailed
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../../server/http.ts';
import { emailSponsor, logoView, note, who } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { blobLogos, logoHeaders } from '../../../../../../../server/sponsor-logo.ts';

export const prerender = false;

export const handleAdminLogoFile = (request: Request, id: string, lid: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const logo = await store.getLogo(lid);
      if (!logo || logo.sponsorId !== id) return fail(404, 'No such logo.');
      const data = await (deps.logos ?? blobLogos()).get(logo.blobKey);
      if (!data) return fail(404, 'The file is missing from storage.');
      return new Response(data, { headers: logoHeaders(logo.contentType, logo.filename) });
    },
    'load the logo',
  );

export const handleReviewLogo = (request: Request, id: string, lid: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      const logo = await store.getLogo(lid);
      if (!s || !logo || logo.sponsorId !== s.id) return fail(404, 'No such logo.');
      const body = (await readJsonObject(request)) ?? {};
      const review = body.review === 'approved' || body.review === 'rejected' ? body.review : null;
      if (!review) return fail(400, 'Approve or reject the logo.', { field: 'review' });
      const reason = text(body.note, 1000);
      if (reason === false) return fail(400, 'Keep the note under 1000 characters, without < or >.', { field: 'note' });
      if (review === 'rejected' && !reason) return fail(400, 'Tell them what to change.', { field: 'note' });
      const reviewed = await store.reviewLogo(logo.id, review, reason ?? null, BOARD);
      await emailSponsor(s, 'sponsor-logo', (base) => ({ ...base, approved: review === 'approved', note: reason ?? null }), {
        ...lifecycle,
        key: `sponsor-logo:${logo.id}:${review}`,
      });
      await note(
        review === 'approved' ? `:white_check_mark: Logo approved for ${who(s)}. Add it to their partner document in Sanity and publish.` : `:x: Logo for ${who(s)} sent back.`,
        lifecycle,
      );
      return json(200, { ok: true, logo: logoView(reviewed) });
    },
    'review the logo',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminLogoFile(request, String(params.id ?? ''), String(params.lid ?? ''));
export const POST: APIRoute = ({ request, params }) => handleReviewLogo(request, String(params.id ?? ''), String(params.lid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
