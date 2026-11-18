/**
 * The board uploads a logo on the sponsor's behalf (multipart: `file`, SVG, PNG or WebP up to 2 MB,
 * checked like the sponsor's own uploads). It becomes their latest logo, which their page previews.
 *   POST → 200 { ok, logo } · 400 { error, field: 'file' } · 404 · 409 ended
 */
import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../../server/http.ts';
import { logoView } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { blobLogos, checkLogo, logoExtension } from '../../../../../../../server/sponsor-logo.ts';

export const prerender = false;

export const handleAdminLogoUpload = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.status === 'ended') return fail(409, 'This sponsorship has ended.');
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!file || typeof file === 'string') return fail(400, 'Choose a logo file.', { field: 'file' });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const checked = checkLogo(bytes);
      if (!checked.ok) return fail(400, checked.error, { field: 'file' });
      const key = `logos/${s.id}/${randomUUID()}.${logoExtension(checked.type)}`;
      await (deps.logos ?? blobLogos()).set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      const logo = await store.addLogo(
        s.id,
        { blobKey: key, contentType: checked.type, bytes: bytes.length, filename: file.name.slice(0, 200) || `logo.${logoExtension(checked.type)}`, uploadedBy: 'board' },
        BOARD,
      );
      return json(200, { ok: true, logo: logoView(logo) });
    },
    'upload the logo',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminLogoUpload(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
