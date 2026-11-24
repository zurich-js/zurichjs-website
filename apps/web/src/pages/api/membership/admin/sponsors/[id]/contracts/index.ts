/**
 * Attach a contract signed outside the site (multipart: `file` PDF up to 10 MB, `signedOn` YYYY-MM-DD
 * optional). It replaces signing the agreement online, and the sponsor can download it from their page.
 *   POST → 200 { ok, contract } · 400 { error, field } · 404
 */
import { randomUUID } from 'node:crypto';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../../server/http.ts';
import { documentView, note, who } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { isDate } from '../../../../../../../server/sponsor-input.ts';
import { blobLogos, checkContract } from '../../../../../../../server/sponsor-logo.ts';

export const prerender = false;

export const handleAttachContract = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.status === 'ended') return fail(409, 'This sponsorship has ended.');
      const form = await request.formData().catch(() => null);
      const file = form?.get('file');
      if (!file || typeof file === 'string') return fail(400, 'Choose the signed contract (PDF).', { field: 'file' });
      const signedOn = form?.get('signedOn');
      if (signedOn && !isDate(signedOn)) return fail(400, 'Give the date as YYYY-MM-DD, or leave it empty.', { field: 'signedOn' });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const checked = checkContract(bytes);
      if (!checked.ok) return fail(400, checked.error, { field: 'file' });
      const key = `contracts/${s.id}/${randomUUID()}.pdf`;
      await (deps.logos ?? blobLogos()).set(key, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
      const doc = await store.addDocument(
        s.id,
        {
          blobKey: key,
          filename: file.name.slice(0, 200) || 'contract.pdf',
          bytes: bytes.length,
          signedOn: typeof signedOn === 'string' && signedOn ? signedOn : null,
          uploadedBy: 'board',
        },
        BOARD,
      );
      await note(`:page_facing_up: Signed contract attached to ${who(s)}; they pay without signing online.`, lifecycle);
      return json(200, { ok: true, contract: documentView(doc) });
    },
    'attach the contract',
  );

export const POST: APIRoute = ({ request, params }) => handleAttachContract(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
