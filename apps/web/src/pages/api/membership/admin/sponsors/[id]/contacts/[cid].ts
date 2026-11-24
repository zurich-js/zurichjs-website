/** Remove a contact (not the last one, and not the last primary: payment emails go to the primary without a billing contact). DELETE → 200 { ok } · 404 · 409. */
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
      const gone = contacts.find((c) => c.id === cid)!;
      if (gone.role === 'primary' && !contacts.some((c) => c.id !== cid && c.role === 'primary'))
        return fail(409, 'Add another primary contact first: payment emails go to the primary contact when there is no billing contact.');
      await store.removeContact(cid, BOARD);
      return json(200, { ok: true });
    },
    'remove the contact',
  );

export const DELETE: APIRoute = ({ request, params }) => handleAdminRemoveContact(request, String(params.id ?? ''), String(params.cid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('DELETE');
