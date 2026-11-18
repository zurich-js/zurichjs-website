/**
 * Start a sponsorship, finish an invited one, or move one paid directly to Stripe:
 * accept the agreement, then pay by card (Stripe Checkout) or by invoice.
 *
 * POST /api/sponsorship/start   (session cookie)
 *   { companyName, legalName?, billingAddress?, vatId?, website?, tier, cycle, eventId? (one meetup),
 *     paymentMode: 'card' | 'invoice', signerName, signerTitle, agreementVersion }
 *   200 { ok, checkoutUrl | null, invoiceUrl | null, sponsor }
 *   400 { error, field } · 409 · 401 · 429 · 503 · 502
 *
 * Someone without a sponsor yet creates one and becomes its primary contact. An invited
 * sponsor keeps the plan the board set unless they choose another here. Invoices need a
 * billing address.
 */
import { DuplicateContact, type Sponsor } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parseDetails, parsePlan, parseSigner } from '../../../server/sponsor-input.ts';
import { startSponsorship } from '../../../server/sponsor-lifecycle.ts';
import { upcomingMeetups } from '../../../server/sponsor-meetups.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleStart = (request: Request, deps: SponsorRouteDeps = {}) => {
  if (rateLimited('sponsorship-start', clientKey(request), 5, 10 * 60_000)) return Promise.resolve(fail(429, 'Too many attempts. Wait a few minutes, then try again.'));
  return signedInSponsor(
    request,
    deps,
    async ({ user, contact, sponsor, store, env, lifecycle }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const signer = parseSigner(body, user.email);
      if (!signer.ok) return fail(400, signer.error, { field: signer.field });
      const paymentMode = body.paymentMode;
      if (paymentMode !== 'card' && paymentMode !== 'invoice') return fail(400, 'Choose to pay by card or by invoice.', { field: 'paymentMode' });
      const actor = { kind: 'sponsor', id: user.id } as const;

      // Moving a sponsorship paid directly to Stripe: nothing else changes.
      if (sponsor?.status === 'active' && sponsor.paymentMode === 'manual') {
        if (paymentMode === 'invoice' && !sponsor.billingAddress) return fail(400, 'Add the billing address for the invoices first.', { field: 'billingAddress' });
        const r = await startSponsorship(sponsor, signer.value, paymentMode, actor, lifecycle);
        return json(200, { ok: true, checkoutUrl: r.checkoutUrl, invoiceUrl: r.invoiceUrl, sponsor: sponsorView(r.sponsor) });
      }
      if (sponsor && sponsor.status !== 'pending' && sponsor.status !== 'ended') return fail(409, 'Your sponsorship is already running. See it on this page.');

      const details = parseDetails(body, !sponsor);
      if (!details.ok) return fail(400, details.error, { field: details.field });
      const plan = parsePlan({ tier: body.tier ?? sponsor?.tier, cycle: body.cycle ?? sponsor?.cycle });
      if (!plan.ok) return fail(400, plan.error, { field: plan.field });
      const billingAddress = 'billingAddress' in details.value ? details.value.billingAddress : sponsor?.billingAddress;
      if (paymentMode === 'invoice' && !billingAddress) return fail(400, 'Add the billing address for the invoices.', { field: 'billingAddress' });

      let event: Pick<Sponsor, 'eventId' | 'eventTitle' | 'eventDate'> = { eventId: null, eventTitle: null, eventDate: null };
      if (plan.value.cycle === 'once') {
        const id = typeof body.eventId === 'string' ? body.eventId : sponsor?.eventId;
        const meetup = (await (deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)))()).find((m) => m.id === id);
        if (!meetup) return fail(400, 'Choose an upcoming meetup to sponsor.', { field: 'eventId' });
        event = { eventId: meetup.id, eventTitle: meetup.title, eventDate: meetup.date };
      }

      let s: Sponsor;
      if (!sponsor || !contact) {
        try {
          ({ sponsor: s } = await store.create(
            {
              companyName: details.value.companyName!,
              legalName: details.value.legalName ?? null,
              billingAddress: details.value.billingAddress ?? null,
              vatId: details.value.vatId ?? null,
              website: details.value.website ?? null,
              ...plan.value,
              paymentMode,
              status: 'pending',
              source: 'self_serve',
              startedAt: null,
              paidUntil: null,
              ...event,
              notes: null,
            },
            { email: user.email, name: signer.value.name, role: 'primary' },
            actor,
          ));
        } catch (cause) {
          if (cause instanceof DuplicateContact) return fail(409, 'Your email already belongs to a sponsor. Reload the page to see it.');
          throw cause;
        }
        const created = await store.contactByEmail(user.email);
        if (created && !created.userId) await store.linkContact(created.id, user.id);
      } else {
        s = sponsor;
        if (s.status === 'ended') s = await store.transition(s.id, { from: 'ended', to: 'pending', actor });
        s = await store.update(s.id, { ...details.value, ...plan.value, ...event, paymentMode }, actor);
      }
      const r = await startSponsorship(s, signer.value, paymentMode, actor, lifecycle);
      return json(200, { ok: true, checkoutUrl: r.checkoutUrl, invoiceUrl: r.invoiceUrl, sponsor: sponsorView(r.sponsor) });
    },
    'start the sponsorship',
  );
};

export const POST: APIRoute = ({ request }) => handleStart(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
