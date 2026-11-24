/**
 * Email the invitation again (all contacts, or one: { contactId }), with an optional { message } and
 * the click's { requestId } (each click sends, a double click once). A running sponsorship sends
 * access to its page instead. A colleague who has not accepted yet gets nothing (409).
 * POST → 200 { ok, emailed } · 404 · 409.
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { sendInvitation, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { confirmed } from '../../../../../../server/sponsor-stripe.ts';

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
      if (body.contactId && !confirmed(contacts[0]!)) return fail(409, `A colleague added ${contacts[0]!.name}. They get emails once they sign in and accept; nothing was sent.`);
      const message = text(body.message, 2000);
      if (message === false) return fail(400, 'Keep the message under 2000 characters, without < or >.', { field: 'message' });
      const requestId = typeof body.requestId === 'string' && /^[\w-]{8,64}$/.test(body.requestId) ? body.requestId : undefined;
      return json(200, { ok: true, emailed: await sendInvitation(s, contacts, message ?? null, lifecycle, { requestId }) });
    },
    'send the invitation',
  );

export const POST: APIRoute = ({ request, params }) => handleResendInvite(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
