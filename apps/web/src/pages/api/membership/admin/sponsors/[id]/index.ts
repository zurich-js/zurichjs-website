/**
 * One sponsor for the admin area.
 *   GET → { ok, sponsor, attention, contacts, agreements, logos, contracts, events, pendingChange }
 *   POST { companyName?, legalName?, billingAddress?, vatId?, website?, notes?, partnerId? } → { ok, sponsor } (details; synced to Stripe)
 */
import type { SponsorPatch } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { adminSponsorView, agreementView, contactView, documentView, logoView, zurichDay } from '../../../../../../server/sponsor.ts';
import { BOARD, attention, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { parseDetails } from '../../../../../../server/sponsor-input.ts';
import { ensureCustomer, pendingChange } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

/** What Stripe's customer holds (sponsor-stripe.ts, ensureCustomer). */
const STRIPE_FIELDS: (keyof SponsorPatch)[] = ['companyName', 'legalName', 'billingAddress', 'vatId'];

export const handleAdminSponsor = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const today = zurichDay(deps.now ? new Date(deps.now) : new Date());
      const [contacts, agreements, logos, documents, meetups, events, needs, pending] = await Promise.all([
        store.contacts(s.id),
        store.agreements(s.id),
        store.logos(s.id),
        store.documents(s.id),
        store.meetups(s.id),
        store.events(s.id),
        attention(s, store, today),
        s.stripeSubscriptionId && s.status !== 'ended' ? pendingChange(s.stripeSubscriptionId, lifecycle.stripe).catch(() => null) : null,
      ]);
      return json(200, {
        ok: true,
        sponsor: adminSponsorView(s, meetups, documents.length > 0),
        attention: needs,
        contacts: contacts.map(contactView),
        agreements: agreements.map(agreementView),
        logos: logos.map(logoView),
        contracts: documents.map(documentView),
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
        if (pid === false) return fail(400, 'Use the id of the partner record: letters, numbers, dots and hyphens.', { field: 'partnerId' });
        if (pid?.startsWith('drafts.')) return fail(400, 'Use the published partner’s id, without drafts.', { field: 'partnerId' });
        patch.partnerId = pid;
      }
      // The form sends every field: save and log only the ones that changed.
      const changed = Object.fromEntries(Object.entries(patch).filter(([k, v]) => s[k as keyof SponsorPatch] !== v)) as SponsorPatch;
      const updated = await store.update(s.id, changed, BOARD);
      // Stripe gets the billing details when they changed, or when the last update to Stripe failed
      // (logged as stripe_sync_failed until one succeeds). A Stripe failure does not undo the save.
      let warning: string | undefined;
      const lastSync = (await store.events(s.id)).filter((e) => e.type === 'stripe_sync_failed' || e.type === 'stripe_synced').at(-1);
      if (updated.stripeCustomerId && (STRIPE_FIELDS.some((k) => k in changed) || lastSync?.type === 'stripe_sync_failed')) {
        const ok = await ensureCustomer(updated, await store.contacts(s.id), store, lifecycle.stripe).then(
          () => true,
          (cause: unknown) => {
            console.error(`[sponsorship-admin] Stripe customer ${updated.stripeCustomerId} not updated`, cause);
            return false;
          },
        );
        if (!ok) warning = 'Saved. Stripe could not be updated now; it gets the details again at the next save.';
        if (!ok || lastSync?.type === 'stripe_sync_failed') await store.log(s.id, ok ? 'stripe_synced' : 'stripe_sync_failed', BOARD);
      }
      return json(200, { ok: true, sponsor: adminSponsorView(updated, await store.meetups(s.id), (await store.documents(s.id)).length > 0), ...(warning ? { warning } : {}) });
    },
    'save the sponsor',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminSponsor(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleUpdateSponsor(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
