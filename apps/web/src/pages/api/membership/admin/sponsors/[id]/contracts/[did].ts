/** A sponsor's attached contract (PDF), to download. GET → the file · 404. */
import type { APIRoute } from 'astro';
import { fail, methodNotAllowed } from '../../../../../../../server/http.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { blobLogos, fileHeaders } from '../../../../../../../server/sponsor-logo.ts';

export const prerender = false;

export const handleAdminContractFile = (request: Request, id: string, did: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const doc = await store.getDocument(did);
      if (!doc || doc.sponsorId !== id) return fail(404, 'No such contract.');
      const data = await (deps.logos ?? blobLogos()).get(doc.blobKey);
      if (!data) return fail(404, 'The file is missing from storage.');
      return new Response(data, { headers: fileHeaders('application/pdf', doc.filename, 'attachment') });
    },
    'load the contract',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminContractFile(request, String(params.id ?? ''), String(params.did ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
