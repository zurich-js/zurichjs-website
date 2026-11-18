/**
 * A colleague added this email to their company's sponsorship. The person accepts (and from then
 * on signs in for that sponsorship and gets its emails) or declines (the contact is removed).
 *
 * POST /api/sponsorship/invitation   (session cookie)   { decision: 'accept' | 'decline' }
 *   200 { ok } · 400 · 404 no invitation · 401
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { note, slackText, who } from '../../../server/sponsor.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleInvitation = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, invitation, store, lifecycle }) => {
      if (!invitation) return fail(404, 'There is no invitation for this email.');
      const decision = ((await readJsonObject(request)) ?? {}).decision;
      if (decision === 'accept') {
        await store.linkContact(invitation.contact.id, user.id);
        await note(`:bust_in_silhouette: ${slackText(invitation.contact.name)} joined ${who(invitation.sponsor)}'s sponsorship page.`, lifecycle);
        return json(200, { ok: true });
      }
      if (decision !== 'decline') return fail(400, 'Accept or decline the invitation.', { field: 'decision' });
      await store.removeContact(invitation.contact.id, { kind: 'sponsor', id: user.id });
      await note(`:bust_in_silhouette: ${slackText(invitation.contact.name)} declined to join ${who(invitation.sponsor)}'s sponsorship page.`, lifecycle);
      return json(200, { ok: true });
    },
    'answer the invitation',
  );

export const POST: APIRoute = ({ request }) => handleInvitation(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
