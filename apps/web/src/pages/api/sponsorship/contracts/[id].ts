/** The sponsor's own signed contract (PDF), as attached by us. GET → the file · 404. */
import type { APIRoute } from 'astro';
import { fail, methodNotAllowed } from '../../../../server/http.ts';
import { blobLogos, fileHeaders } from '../../../../server/sponsor-logo.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleContractFile = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor, store }) => {
      const doc = await store.getDocument(id);
      if (!sponsor || !doc || doc.sponsorId !== sponsor.id) return fail(404, 'No such contract.');
      const data = await (deps.logos ?? blobLogos()).get(doc.blobKey);
      if (!data) return fail(404, 'No such contract.');
      return new Response(data, { headers: fileHeaders('application/pdf', doc.filename, 'attachment') });
    },
    'load the contract',
  );

export const GET: APIRoute = ({ request, params }) => handleContractFile(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
