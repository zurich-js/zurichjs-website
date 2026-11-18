/**
 * Remove a colleague. Not yourself, and not the last primary contact. The board sees it in Slack.
 * DELETE /api/sponsorship/contacts/:id   (session cookie) → 200 { ok } · 404 · 409 · 429 · 401
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { clientKey, rateLimited } from '../../../../server/rateLimit.ts';
import { note, slackText, who } from '../../../../server/sponsor.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleRemoveContact = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, store, lifecycle }) => {
      if (!sponsor || !contact) return fail(404, 'There is no sponsorship on this account yet.');
      if (rateLimited('sponsorship-contacts', `${user.id}:${clientKey(request)}`, 10, 60 * 60_000)) return fail(429, 'Too many changes. Try again in an hour.');
      const contacts = await store.contacts(sponsor.id);
      const target = contacts.find((c) => c.id === id);
      if (!target) return fail(404, 'No such colleague.');
      if (target.id === contact.id) return fail(409, 'You cannot remove yourself. Ask a colleague, or write to hello@zurichjs.com.');
      if (target.role === 'primary' && contacts.filter((c) => c.role === 'primary').length === 1) return fail(409, 'Keep at least one primary contact.');
      await store.removeContact(target.id, { kind: 'sponsor', id: user.id });
      await note(`:bust_in_silhouette: ${slackText(contact.name)} removed ${slackText(target.name)} from ${who(sponsor)}'s sponsorship page.`, lifecycle);
      return json(200, { ok: true });
    },
    'remove the colleague',
  );

export const DELETE: APIRoute = ({ request, params }) => handleRemoveContact(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('DELETE');
