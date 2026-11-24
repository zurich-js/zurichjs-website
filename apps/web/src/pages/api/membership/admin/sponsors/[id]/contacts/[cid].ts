/** Remove a contact (not the last one, and not the last confirmed primary: payment emails go to the primary without a billing contact). DELETE → 200 { ok } · 404 · 409. */
import { ContactRequired } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../../server/http.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../../server/sponsor-admin.ts';

export const prerender = false;

export const handleAdminRemoveContact = (request: Request, id: string, cid: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store }) => {
      if (!(await store.contacts(id)).some((c) => c.id === cid)) return fail(404, 'No such contact.');
      try {
        await store.removeContact(cid, BOARD);
      } catch (cause) {
        if (!(cause instanceof ContactRequired)) throw cause;
        return fail(
          409,
          cause.reason === 'last_contact'
            ? 'A sponsor needs at least one contact.'
            : 'Keep a confirmed primary contact: add one, or wait until the invited one accepts. Payment emails go to the primary contact when there is no billing contact.',
        );
      }
      return json(200, { ok: true });
    },
    'remove the contact',
  );

export const DELETE: APIRoute = ({ request, params }) => handleAdminRemoveContact(request, String(params.id ?? ''), String(params.cid ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('DELETE');
