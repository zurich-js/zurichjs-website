/**
 * One sponsor for the admin area.
 *   GET → { ok, sponsor, contacts, agreements, proposals, logos, events, pendingChange }
 *   POST { companyName?, legalName?, billingAddress?, vatId?, website?, notes?, partnerId? } → { ok, sponsor } (details; synced to Stripe)
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { adminSponsorView, agreementView, contactView, logoView, proposalView } from '../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { parseDetails } from '../../../../../../server/sponsor-input.ts';
import { ensureCustomer, pendingChange } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handleAdminSponsor = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const [contacts, agreements, proposals, logos, events, pending] = await Promise.all([
        store.contacts(s.id),
        store.agreements(s.id),
        store.proposals(s.id),
        store.logos(s.id),
        store.events(s.id),
        s.stripeSubscriptionId && s.status !== 'ended' ? pendingChange(s.stripeSubscriptionId, lifecycle.stripe).catch(() => null) : null,
      ]);
      return json(200, {
        ok: true,
        sponsor: adminSponsorView(s),
        contacts: contacts.map(contactView),
        agreements: agreements.map(agreementView),
        proposals: proposals.map(proposalView),
        logos: logos.map(logoView),
        events: events.reverse(),
        pendingChange: pending,
      });
    },
    'load the sponsor',
  );

export const handleUpdateSponsor = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the changes as JSON.');
      const parsed = parseDetails(body, false);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const patch = { ...parsed.value };
      if ('notes' in body) {
        const notes = text(body.notes, 4000);
        if (notes === false) return fail(400, 'Keep the notes under 4000 characters, without < or >.', { field: 'notes' });
        patch.notes = notes ?? null;
      }
      if ('partnerId' in body) {
        const pid = typeof body.partnerId === 'string' && /^[\w.-]{1,128}$/.test(body.partnerId) ? body.partnerId : body.partnerId ? false : null;
        if (pid === false) return fail(400, 'Use the Sanity document id of the partner.', { field: 'partnerId' });
        patch.partnerId = pid;
      }
      const updated = await store.update(s.id, patch, BOARD);
      if (updated.stripeCustomerId && Object.keys(parsed.value).length) await ensureCustomer(updated, await store.contacts(s.id), store, lifecycle.stripe);
      return json(200, { ok: true, sponsor: adminSponsorView(updated) });
    },
    'save the sponsor',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminSponsor(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleUpdateSponsor(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
