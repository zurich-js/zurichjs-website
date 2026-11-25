/** Add a contact to a sponsor. POST { name, email, role? } → 200 { ok, contact } · 400 · 404 · 409. */
import { DuplicateContact } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../../server/http.ts';
import { contactView } from '../../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';
import { parseContact } from '../../../../../../../server/sponsor-input.ts';

export const prerender = false;

export const handleAdminAddContact = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.status === 'ended') return fail(409, 'This sponsorship has ended.');
      const parsed = parseContact((await readJsonObject(request)) ?? {});
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      try {
        return json(200, { ok: true, contact: contactView(await store.addContact(s.id, parsed.value, BOARD)) });
      } catch (cause) {
        if (cause instanceof DuplicateContact) return fail(409, 'That email already belongs to a sponsor.', { field: 'email' });
        throw cause;
      }
    },
    'add the contact',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminAddContact(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
