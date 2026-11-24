/**
 * Upload the sponsor's logo (multipart/form-data, field `file`): SVG, PNG or WebP up to 2 MB.
 * At most 10 uploads an hour per person. Slack tells the board, who add it to the sponsor's partner
 * record once the sponsorship runs. An ended sponsorship uploads nothing.
 *
 * POST /api/sponsorship/logo   (session cookie)   → 200 { ok, logo } · 400 { error, field: 'file' } · 404 · 409 · 401 · 503 · 502
 */
import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { clientKey, rateLimited } from '../../../../server/rateLimit.ts';
import { isRunning } from '@zurichjs/sponsorship';
import { adminUrl, logoView, note, who } from '../../../../server/sponsor.ts';
import { blobLogos, checkLogo, logoExtension } from '../../../../server/sponsor-logo.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleLogoUpload = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, env, origin, deps }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      if (sponsor.status === 'ended') return fail(409, 'This sponsorship has ended.', { field: 'file' });
      if (rateLimited('sponsorship-logo', `${user.id}:${clientKey(request)}`, 10, 60 * 60_000)) return fail(429, 'Too many uploads. Try again in an hour.', { field: 'file' });
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
      await note(
        `:frame_with_picture: ${who(sponsor)} uploaded a logo (${checked.type.replace('image/', '').replace('+xml', '')}). ${
          isRunning(sponsor.status) ? 'Add it to their partner record so the site shows it' : 'Nothing to publish yet: the sponsorship has not started'
        }: ${adminUrl(origin, sponsor.id)}`,
        {
          env,
          slack: deps.slack,
          fetch: deps.fetch,
          log: deps.log,
        },
      );
      return json(200, { ok: true, logo: logoView(logo) });
    },
    'upload the logo',
  );

export const POST: APIRoute = ({ request }) => handleLogoUpload(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
