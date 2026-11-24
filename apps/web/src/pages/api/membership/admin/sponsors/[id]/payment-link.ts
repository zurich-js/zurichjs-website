/**
 * A Stripe payment link for a one-time sponsorship that has a signed contract on file: one card
 * payment for its meetups, usable once. Send it to the sponsor however you like; paying it starts
 * the sponsorship (webhook). Creating a new one switches the old one off and supersedes its quote.
 *
 * Every link freezes a quote (docs/domains/sponsorship/fees.md): base, surcharge and total in rappen,
 * who covers the fees, and the tariff and policy versions. "Sponsor covers the fees" needs the fee
 * gate open (a tariff and SPONSOR_FEE_POLICY_VERSION).
 *   POST { feeChoice?: 'absorb' | 'pass_through' (default absorb) }
 *     → 200 { ok, url, quote } · 400 · 404 · 409 (not one-time, already paid, no contract, fee gate closed) · 503
 */
import { isFeeChoice, quoteFigures } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { bundleTotal, note, who } from '../../../../../../server/sponsor.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { currentGate, feeStore, quoteView } from '../../../../../../server/sponsor-fees.ts';
import { closePaymentLink, createPaymentLink } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handlePaymentLink = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, origin, lifecycle, env }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.cycle !== 'once') return fail(409, 'Payment links are for one-time sponsorships. Recurring ones pay on their sponsorship page.');
      if (s.status !== 'pending') return fail(409, 'This sponsorship is already paid or has ended.');
      if (!(await store.documents(s.id)).length) return fail(409, 'Attach the signed contract first: without it they sign and pay on their sponsorship page.');
      const meetups = await store.meetups(s.id);
      if (!meetups.length) return fail(409, 'Choose the meetups first.');
      const body = (await readJsonObject(request)) ?? {};
      const choice = body.feeChoice ?? 'absorb';
      if (!isFeeChoice(choice)) return fail(400, 'Choose who covers the fees.', { field: 'feeChoice' });

      const fees = deps.fees ?? feeStore(env);
      const figures = quoteFigures(bundleTotal(s, meetups) * 100, choice, await currentGate(fees, env));
      // The old link goes first, so nobody pays the superseded quote.
      await closePaymentLink(s, store, lifecycle.stripe);
      const { quote } = await fees.createQuote({
        ...figures,
        sponsorId: s.id,
        subject: 'sponsorship',
        subjectId: null,
        purpose: `Sponsorship of ${meetups.length === 1 ? 'one meetup' : `${meetups.length} meetups`}`,
        createdBy: 'board',
      });
      const url = await createPaymentLink({ ...s, paymentLinkId: null }, meetups, store, origin, lifecycle.stripe, quote);
      await note(`:link: Payment link created for ${who(s)}${quote.surchargeMinor ? ' (sponsor covers the fees)' : ''}.`, lifecycle);
      return json(200, { ok: true, url, quote: quoteView(quote) });
    },
    'create the payment link',
  );

export const POST: APIRoute = ({ request, params }) => handlePaymentLink(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
