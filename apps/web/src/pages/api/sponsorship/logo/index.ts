/**
 * Upload the sponsor's logo (multipart/form-data, field `file`): SVG, PNG or WebP up to 2 MB.
 * The board reviews it before it goes on the site (Slack note).
 *
 * POST /api/sponsorship/logo   (session cookie)   → 200 { ok, logo } · 400 { error, field: 'file' } · 404 · 401 · 503 · 502
 */
import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { adminUrl, logoView, note, who } from '../../../../server/sponsor.ts';
import { blobLogos, checkLogo, logoExtension } from '../../../../server/sponsor-logo.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleLogoUpload = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, env, origin }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!file || typeof file === 'string') return fail(400, 'Choose a logo file.', { field: 'file' });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const checked = checkLogo(bytes);
      if (!checked.ok) return fail(400, checked.error, { field: 'file' });
      const key = `logos/${sponsor.id}/${randomUUID()}.${logoExtension(checked.type)}`;
      await (deps.logos ?? blobLogos()).set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      const logo = await store.addLogo(
        sponsor.id,
        { blobKey: key, contentType: checked.type, bytes: bytes.length, filename: file.name.slice(0, 200) || `logo.${logoExtension(checked.type)}`, uploadedBy: contact.email },
        { kind: 'sponsor', id: user.id },
      );
      await note(`:frame_with_picture: ${who(sponsor)} uploaded a logo (${checked.type.replace('image/', '').replace('+xml', '')}). Review it: ${adminUrl(origin, sponsor.id)}`, {
        env,
        slack: deps.slack,
        fetch: deps.fetch,
        log: deps.log,
      });
      return json(200, { ok: true, logo: logoView(logo) });
    },
    'upload the logo',
  );

export const POST: APIRoute = ({ request }) => handleLogoUpload(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
