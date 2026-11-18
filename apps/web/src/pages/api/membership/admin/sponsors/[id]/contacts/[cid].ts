/** Remove a contact (not the last one). DELETE → 200 { ok } · 404 · 409. */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../../server/http.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';

export const prerender = false;

export const handleAdminRemoveContact = (request: Request, id: string, cid: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      const contacts = await store.contacts(id);
      if (!contacts.some((c) => c.id === cid)) return fail(404, 'No such contact.');
      if (contacts.length === 1) return fail(409, 'A sponsor needs at least one contact.');
      await store.removeContact(cid, BOARD);
      return json(200, { ok: true });
    },
    'remove the contact',
  );

export const DELETE: APIRoute = ({ request, params }) => handleAdminRemoveContact(request, String(params.id ?? ''), String(params.cid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('DELETE');
