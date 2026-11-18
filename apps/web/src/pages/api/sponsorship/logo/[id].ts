/** One of the sponsor's own logos, for the portal preview. GET → the image (sandboxed) · 404. */
import type { APIRoute } from 'astro';
import { fail, methodNotAllowed } from '../../../../server/http.ts';
import { blobLogos, fileHeaders } from '../../../../server/sponsor-logo.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleLogoFile = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, store }) => {
      const logo = await store.getLogo(id);
      if (!sponsor || !logo || logo.sponsorId !== sponsor.id) return fail(404, 'No such logo.');
      const data = await (deps.logos ?? blobLogos()).get(logo.blobKey);
      if (!data) return fail(404, 'No such logo.');
      return new Response(data, { headers: fileHeaders(logo.contentType, logo.filename) });
    },
    'load the logo',
  );

export const GET: APIRoute = ({ request, params }) => handleLogoFile(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
