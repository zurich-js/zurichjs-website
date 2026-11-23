/** Email the invitation again (all contacts, or one: { contactId }), with an optional { message }. POST → 200 { ok, emailed } · 404 · 409. */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { sendInvitation, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';

export const prerender = false;

export const handleResendInvite = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.status === 'ended') return fail(409, 'This sponsorship has ended.');
      const body = (await readJsonObject(request)) ?? {};
      const contacts = (await store.contacts(s.id)).filter((c) => !body.contactId || c.id === body.contactId);
      if (!contacts.length) return fail(404, 'No such contact.');
      const message = text(body.message, 2000);
      if (message === false) return fail(400, 'Keep the message under 2000 characters, without < or >.', { field: 'message' });
      return json(200, { ok: true, emailed: await sendInvitation(s, contacts, message ?? null, lifecycle, { again: true }) });
    },
    'send the invitation',
  );

export const POST: APIRoute = ({ request, params }) => handleResendInvite(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
