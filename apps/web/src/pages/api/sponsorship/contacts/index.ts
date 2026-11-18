/**
 * Add a colleague who can sign in for the sponsor (e.g. finance for invoices: role `billing`).
 * POST /api/sponsorship/contacts   (session cookie)   { name, email, role? } → 200 { ok, contact } · 400 · 404 · 409 · 401
 */
import { DuplicateContact } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { contactView, note, who } from '../../../../server/sponsor.ts';
import { parseContact } from '../../../../server/sponsor-input.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleAddContact = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, env }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      const parsed = parseContact((await readJsonObject(request)) ?? {});
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      try {
        const c = await store.addContact(sponsor.id, parsed.value, { kind: 'sponsor', id: user.id });
        await note(`:bust_in_silhouette: ${contact.name} added ${c.name} (${c.role}) to ${who(sponsor)}.`, { env, slack: deps.slack, fetch: deps.fetch, log: deps.log });
        return json(200, { ok: true, contact: contactView(c) });
      } catch (cause) {
        if (cause instanceof DuplicateContact) return fail(409, 'That email already belongs to a sponsor.', { field: 'email' });
        throw cause;
      }
    },
    'add the colleague',
  );

export const POST: APIRoute = ({ request }) => handleAddContact(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
