/**
 * Remove a colleague. Not yourself, and not the last primary contact.
 * DELETE /api/sponsorship/contacts/:id   (session cookie) → 200 { ok } · 404 · 409 · 401
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleRemoveContact = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      const contacts = await store.contacts(sponsor.id);
      const target = contacts.find((c) => c.id === id);
      if (!target) return fail(404, 'No such colleague.');
      if (target.id === contact.id) return fail(409, 'You cannot remove yourself. Ask a colleague, or write to us.');
      if (target.role === 'primary' && contacts.filter((c) => c.role === 'primary').length === 1) return fail(409, 'Keep at least one primary contact.');
      await store.removeContact(target.id, { kind: 'sponsor', id: user.id });
      return json(200, { ok: true });
    },
    'remove the colleague',
  );

export const DELETE: APIRoute = ({ request, params }) => handleRemoveContact(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('DELETE');
