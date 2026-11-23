/**
 * A partner's logo file, by variant: `colour` (the logo as the company wants it) or `mono` (a
 * one-colour version, for the moving rows and the hover colour). A new file replaces the one before.
 *
 *   POST multipart `file` (SVG, PNG or WebP up to 2 MB, checked like a sponsor's upload)
 *        or JSON { sponsorId, logoId }: a file that sponsor uploaded, copied as it is
 *        → 200 { ok, partner } · 400 { error, field: 'file' } · 404
 *   DELETE → 200 { ok, partner }
 */
import { isLogoVariant } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../../server/http.ts';
import { logoMeta } from '../../../../../../../server/logo-meta.ts';
import { partnerAdminRoute, partnerView, type PartnerDeps } from '../../../../../../../server/partner-admin.ts';
import { blobLogos, checkLogo, logoExtension } from '../../../../../../../server/sponsor-logo.ts';

export const prerender = false;

export const handlePartnerLogoUpload = (request: Request, id: string, variant: string, deps: PartnerDeps = {}) =>
  partnerAdminRoute(
    request,
    deps,
    async ({ partners, store, changed }) => {
      if (!isLogoVariant(variant) || !(await partners.get(id))) return fail(404, 'No such partner.');
      let bytes: Uint8Array;
      let filename: string;
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await readJsonObject(request);
        const logo = typeof body?.logoId === 'string' ? await store.getLogo(body.logoId) : null;
        if (!logo || logo.sponsorId !== body?.sponsorId) return fail(404, 'No such uploaded logo.', { field: 'file' });
        const data = await (deps.logos ?? blobLogos()).get(logo.blobKey);
        if (!data) return fail(404, 'The file is missing from storage.', { field: 'file' });
        bytes = new Uint8Array(data);
        filename = logo.filename;
      } else {
        const form = await request.formData().catch(() => null);
        const file = form?.get('file');
        if (!file || typeof file === 'string') return fail(400, 'Choose a logo file.', { field: 'file' });
        bytes = new Uint8Array(await file.arrayBuffer());
        filename = file.name;
      }
      const checked = checkLogo(bytes);
      if (!checked.ok) return fail(400, checked.error, { field: 'file' });
      await partners.setLogo(id, variant, {
        contentType: checked.type,
        filename: filename.slice(0, 200) || `logo.${logoExtension(checked.type)}`,
        data: bytes,
        ...logoMeta(bytes, checked.type),
      });
      await changed('partner logo changed');
      return json(200, { ok: true, partner: partnerView((await partners.get(id))!) });
    },
    'save the logo',
  );

export const handlePartnerLogoRemove = (request: Request, id: string, variant: string, deps: PartnerDeps = {}) =>
  partnerAdminRoute(
    request,
    deps,
    async ({ partners, changed }) => {
      if (!isLogoVariant(variant) || !(await partners.get(id))) return fail(404, 'No such partner.');
      await partners.removeLogo(id, variant);
      await changed('partner logo removed');
      return json(200, { ok: true, partner: partnerView((await partners.get(id))!) });
    },
    'remove the logo',
  );

export const POST: APIRoute = ({ request, params }) => handlePartnerLogoUpload(request, String(params.id ?? ''), String(params.variant ?? ''));
export const DELETE: APIRoute = ({ request, params }) => handlePartnerLogoRemove(request, String(params.id ?? ''), String(params.variant ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST, DELETE');
