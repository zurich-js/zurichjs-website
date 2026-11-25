/**
 * Start a sponsorship, finish one we set up with you, or move one paid by bank transfer to card.
 * Signs the agreement (unless a contract is on file, or it is already signed on this version: then
 * one tick is enough) and opens Stripe Checkout.
 *
 * POST /api/sponsorship/start   (session cookie)
 *   { companyName, legalName?, billingAddress?, vatId?, website?, tier, cycle, eventId? (one-time, one meetup),
 *     signerName?, signerTitle?, confirm?, agreementVersion,
 *     acceptFee? (true: agrees to the processing fee of the board's recurring offer, shown first) }
 *   200 { ok, checkoutUrl, sponsor } · 400 { error, field } · 409 · 401 · 429 · 503 · 502
 *
 * Someone without a sponsorship creates one and becomes its primary contact (one meetup at the
 * list price, or monthly/quarterly/yearly). A sponsorship we set up keeps our plan, meetups and
 * price unless they choose another plan here (not for bundles we priced).
 */
import { DuplicateContact, canRestart, type Sponsor } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { feeStore } from '../../../server/sponsor-fees.ts';
import { CONTACT_EMAIL, fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parseDetails, parsePlan, parseSignature } from '../../../server/sponsor-input.ts';
import { resolveSigner, startSponsorship } from '../../../server/sponsor-lifecycle.ts';
import { checkPrices } from '../../../server/sponsor-stripe.ts';
import { upcomingMeetups } from '../../../server/sponsor-meetups.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handleStart = (request: Request, deps: SponsorRouteDeps = {}) => {
  if (rateLimited('sponsorship-start', clientKey(request), 5, 10 * 60_000)) return Promise.resolve(fail(429, 'Too many attempts. Wait a few minutes, then try again.'));
  return signedInSponsor(
    request,
    deps,
    async ({ user, contact, sponsor, invitation, store, env, lifecycle, deps }) => {
      if (invitation) return fail(409, `A colleague added you to ${invitation.sponsor.companyName}'s sponsorship. Accept or decline that first.`);
      // The board sent an offer: it owns the payment, so it is paid through its link only and never
      // a second page as well. Its total is the total they pay.
      const offer = sponsor?.status === 'pending' ? await (deps.fees ?? feeStore(env)).openQuote(sponsor.id, 'sponsorship', null) : null;
      if (offer && !offer.interval)
        return fail(
          409,
          offer.linkState === 'live'
            ? 'Pay with the payment link of our offer: it is on this page and in our email.'
            : `We are preparing the payment link for our offer. It shows on this page once it is ready. Questions: ${CONTACT_EMAIL}.`,
        );
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const feeOffer = offer?.interval ? offer : null;
      if (feeOffer && body.acceptFee !== true) return fail(400, 'Confirm the amount and processing fee shown in the offer.', { field: 'acceptFee' });
      if ((feeOffer || body.quoteId !== undefined) && feeOffer?.id !== body.quoteId) return fail(409, 'The offer changed. Reload to review the current fee.');
      const sig = parseSignature(body);
      if (!sig.ok) return fail(400, sig.error, { field: sig.field });
      const actor = { kind: 'sponsor', id: user.id } as const;
      const needSignature = () => fail(400, 'Add your full name and role to sign the agreement.', { field: 'signerName' });

      // Moving a sponsorship paid by bank transfer to card: nothing else changes.
      if (sponsor?.status === 'active' && sponsor.paymentMode === 'manual') {
        const who = await resolveSigner(sponsor, contact, sig.value, user.email, lifecycle);
        if (!who) return needSignature();
        const r = await startSponsorship(sponsor, who, actor, lifecycle);
        return json(200, { ok: true, checkoutUrl: r.checkoutUrl, sponsor: sponsorView(r.sponsor) });
      }
      if (sponsor && sponsor.status !== 'pending' && sponsor.status !== 'ended') return fail(409, 'Your sponsorship is already running. See it on this page.');

      const details = parseDetails(body, !sponsor);
      if (!details.ok) return fail(400, details.error, { field: details.field });
      const bundle = sponsor?.status === 'pending' && sponsor.source !== 'self_serve' && sponsor.cycle === 'once';
      const plan = bundle
        ? { ok: true as const, value: { tier: sponsor.tier, cycle: sponsor.cycle } }
        : parsePlan({ tier: body.tier ?? sponsor?.tier, cycle: body.cycle ?? sponsor?.cycle });
      if (!plan.ok) return fail(400, plan.error, { field: plan.field });

      let meetup = null as { eventId: string; title: string; date: string } | null;
      // The fee was worked out for the offered plan: another plan needs a new offer.
      if (feeOffer && sponsor && (plan.value.tier !== sponsor.tier || plan.value.cycle !== sponsor.cycle))
        return fail(409, 'The processing fee we offered is for your current plan. Keep that plan, or write to us for a new offer.', { field: 'tier' });
      if (plan.value.cycle === 'once' && !bundle) {
        const id = typeof body.eventId === 'string' ? body.eventId : null;
        const found = (await (deps.meetups ?? (() => upcomingMeetups(env, deps.fetch)))()).find((m) => m.id === id);
        if (!found) return fail(400, 'Choose an upcoming meetup to sponsor.', { field: 'eventId' });
        meetup = { eventId: found.id, title: found.title, date: found.date };
      }

      let s: Sponsor;
      if (!sponsor || !contact) {
        // A full signature is needed to start from scratch.
        if (!sig.value.name) return needSignature();
        try {
          ({ sponsor: s } = await store.create(
            {
              companyName: details.value.companyName!,
              legalName: details.value.legalName ?? null,
              billingAddress: details.value.billingAddress ?? null,
              vatId: details.value.vatId ?? null,
              website: details.value.website ?? null,
              ...plan.value,
              paymentMode: 'card',
              status: 'pending',
              source: 'self_serve',
              startedAt: null,
              paidUntil: null,
              pricePerMeetup: null,
              notes: null,
            },
            { email: user.email, name: sig.value.name, role: 'primary', addedBy: 'self' },
            actor,
          ));
        } catch (cause) {
          if (cause instanceof DuplicateContact) return fail(409, 'Your email already belongs to a sponsorship. Reload the page to see it.');
          throw cause;
        }
        const created = await store.contactByEmail(user.email);
        if (created && !created.userId) await store.linkContact(created.id, user.id);
      } else {
        s = sponsor;
        if (s.status === 'ended') {
          // Sponsoring again: everything is checked before the ended record changes, so a refusal leaves it as it was.
          if (!canRestart(s, 'sponsor')) return fail(409, `ZurichJS ended this sponsorship. Write to ${CONTACT_EMAIL} to sponsor again.`);
          if (!(await resolveSigner(s, contact, sig.value, user.email, lifecycle))) return needSignature();
          await checkPrices(plan.value, lifecycle.stripe);
          s = await store.transition(s.id, { from: 'ended', to: 'pending', actor });
          s = await store.update(s.id, { startedAt: null, paidUntil: null, pricePerMeetup: null }, actor);
          await store.linkStripe(s.id, { subscriptionId: null, checkoutSessionId: null, paymentLinkId: null, paymentLinkUrl: null }, actor);
        }
        s = await store.update(s.id, { ...details.value, ...plan.value, paymentMode: 'card' }, actor);
      }
      if (meetup) await store.setMeetups(s.id, [meetup], actor);
      const who = await resolveSigner(s, contact, sig.value, user.email, lifecycle);
      if (!who) return needSignature();
      const r = await startSponsorship(s, who, actor, lifecycle, feeOffer && contact ? { quote: feeOffer, contactId: contact.id } : undefined);
      return json(200, { ok: true, checkoutUrl: r.checkoutUrl, sponsor: sponsorView(r.sponsor, await store.meetups(s.id)) });
    },
    'start the sponsorship',
  );
};

export const POST: APIRoute = ({ request }) => handleStart(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
