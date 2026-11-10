/**
 * Downloads one of the signed-in member's certificates as a PDF.
 *
 * GET /api/membership/certificates/:id   (session cookie)
 *   200 application/pdf · 404 not one of yours · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, methodNotAllowed } from '../../../../server/http.ts';
import { certificateFilename, certificatePdf, loadSignature } from '../../../../server/membership-certificate.ts';
import { signedIn, type RouteDeps } from '../../../../server/membership-route.ts';

export const prerender = false;

export const handleCertificate = (request: Request, id: string, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ member, store }) => {
      const cert = member ? (await store.certificates(member.id)).find((c) => c.id === id) : undefined;
      if (!member || !cert) return fail(404, 'There is no such certificate on your membership.');
      const pdf = await certificatePdf(member, cert, await (deps.signature ?? (() => loadSignature(deps.log)))());
      return new Response(pdf as BodyInit, {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-disposition': `attachment; filename="${certificateFilename(cert)}"`, 'cache-control': 'private, no-store' },
      });
    },
    'prepare your certificate',
  );

export const GET: APIRoute = ({ request, params }) => handleCertificate(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
