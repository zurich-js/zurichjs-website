/**
 * Add a colleague to the sponsorship (e.g. finance for receipts: role `billing`). They get no email
 * from us: they sign in at /partners/account with that address and accept the invitation, and
 * only then join (and receive emails). At most 10 contacts per sponsorship, 10 additions an hour.
 *
 * POST /api/sponsorship/contacts   (session cookie)   { name, email, role? } → 200 { ok, contact } · 400 · 404 · 409 · 429 · 401
 */
import { DuplicateContact } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { clientKey, rateLimited } from '../../../../server/rateLimit.ts';
import { contactView, note, slackText, who } from '../../../../server/sponsor.ts';
import { parseContact } from '../../../../server/sponsor-input.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const MAX_CONTACTS = 10;

export const handleAddContact = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, env, deps }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      if (rateLimited('sponsorship-contacts', `${user.id}:${clientKey(request)}`, 10, 60 * 60_000)) return fail(429, 'Too many changes. Try again in an hour.');
      const parsed = parseContact((await readJsonObject(request)) ?? {});
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      if ((await store.contacts(sponsor.id)).length >= MAX_CONTACTS) return fail(409, `A sponsorship can have up to ${MAX_CONTACTS} people. Remove someone first.`);
      try {
        const c = await store.addContact(sponsor.id, { ...parsed.value, addedBy: 'sponsor' }, { kind: 'sponsor', id: user.id });
        await note(`:bust_in_silhouette: ${slackText(contact.name)} added ${slackText(c.name)} to ${who(sponsor)}'s sponsorship page (not joined yet).`, {
          env,
          slack: deps.slack,
          fetch: deps.fetch,
          log: deps.log,
        });
        return json(200, { ok: true, contact: contactView(c) });
      } catch (cause) {
        if (cause instanceof DuplicateContact)
          return fail(409, 'That email is already a contact of a sponsorship. Use another address, or write to hello@zurichjs.com.', { field: 'email' });
        throw cause;
      }
    },
    'add the colleague',
  );

export const POST: APIRoute = ({ request }) => handleAddContact(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
