/** A sponsor's uploaded logo, to preview and download for Sanity. GET → the file (sandboxed headers) · 404. */
import type { APIRoute } from 'astro';
import { fail, methodNotAllowed } from '../../../../../../../server/http.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { blobLogos, fileHeaders } from '../../../../../../../server/sponsor-logo.ts';

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
      return new Response(data, { headers: fileHeaders(logo.contentType, logo.filename) });
    },
    'load the logo',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminLogoFile(request, String(params.id ?? ''), String(params.lid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
