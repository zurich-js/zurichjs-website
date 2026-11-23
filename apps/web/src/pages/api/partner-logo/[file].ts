/**
 * One partner logo straight from the database: what the dev server's pages and the admin area's
 * previews show (a build writes the same files out as /partner-logos/*, pages/partner-logos/[file].ts).
 * Logos are public; the file is sandboxed and, as its id changes with every upload, cached for good.
 *
 * GET /api/partner-logo/<logo id>.<ext> → the image · 404
 */
import type { APIRoute } from 'astro';
import { partnerLogoFile } from '@zurichjs/sponsorship';
import { fail, methodNotAllowed, type Env } from '../../../server/http.ts';
import { MembershipUnavailable } from '../../../server/membership-db.ts';
import { partnerStore, type PartnerDeps } from '../../../server/partner-admin.ts';
import { fileHeaders } from '../../../server/sponsor-logo.ts';

export const prerender = false;

export async function handlePartnerLogo(file: string, deps: PartnerDeps = {}, env: Env = process.env): Promise<Response> {
  try {
    const logo = await (deps.partners ?? partnerStore(env)).logoFile(file.replace(/\.[a-z]+$/, ''));
    if (!logo || partnerLogoFile(logo) !== file) return fail(404, 'No such logo.');
    return new Response(logo.data as Uint8Array<ArrayBuffer>, {
      headers: { ...fileHeaders(logo.contentType, logo.filename), 'cache-control': 'public, max-age=31536000, immutable' },
    });
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(404, 'No such logo.');
    console.error('[partners] loading a logo failed', cause);
    return fail(502, 'Could not load the logo.');
  }
}

export const GET: APIRoute = ({ params }) => handlePartnerLogo(String(params.file ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
