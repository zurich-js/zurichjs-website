/**
 * A Stripe payment link for a one-time sponsorship that has a signed contract on file: one card
 * payment for its meetups, usable once. Send it to the sponsor however you like; paying it starts
 * the sponsorship (webhook).
 *
 * Every link belongs to a frozen quote (docs/domains/sponsorship/fees.md): base, surcharge and total
 * in rappen, who covers the fees, and the tariff and policy versions. "Sponsor covers the fees"
 * needs the fee gate open (a tariff and SPONSOR_FEE_POLICY_VERSION). The board previews the figures
 * first and confirms the total it saw; a new link switches every earlier one off first, and is
 * published only while its quote still owns the offer (sponsor-offers.ts).
 *   GET ?feeChoice=absorb|pass_through → 200 { ok, preview: { purpose, base, surcharge, total, totalMinor, feeChoice, tariffVersion, policyVersion, estimate } }
 *     estimate: { tariffVersion, fee, net } from the board's tariff, or null without one
 *   POST { feeChoice?: 'absorb' | 'pass_through' (default absorb), expectTotalMinor }
 *     → 200 { ok, url, quote } · 400 · 404 · 409 (not one-time, already paid, no contract, fee gate
 *       closed, the amounts changed since the preview, a newer offer at the same time) · 502 (an
 *       earlier link is still on at Stripe: nothing new was made) · 503
 */
import { FEE_CHOICE_LABEL, chfMinor, isFeeChoice, type FeeChoice, type Sponsor, type SponsorStore } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { note, who, zurichDay } from '../../../../../../server/sponsor.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { feeStore, quoteView } from '../../../../../../server/sponsor-fees.ts';
import { LinkStillOpen, OfferReplaced, PreviewChanged, previewOffer, publishOffer } from '../../../../../../server/sponsor-offers.ts';

export const prerender = false;

export const handlePaymentLink = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, origin, lifecycle, env }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const refused = await refusal(s, store);
      if (refused) return refused;
      const meetups = await store.meetups(s.id);
      if (meetups.some((m) => m.date < zurichDay(new Date(deps.now ?? Date.now())))) return fail(409, 'A meetup is already over. Update the meetups first.');
      const fees = deps.fees ?? feeStore(env);

      if (request.method === 'GET') {
        const choice = new URL(request.url).searchParams.get('feeChoice') ?? 'absorb';
        if (!isFeeChoice(choice)) return fail(400, 'Choose who covers the fees.', { field: 'feeChoice' });
        const p = await previewOffer(s, meetups, choice, fees, env);
        return json(200, { ok: true, preview: previewView(p.figures, p.purpose, p.estimate) });
      }

      const body = (await readJsonObject(request)) ?? {};
      const choice = body.feeChoice ?? 'absorb';
      if (!isFeeChoice(choice)) return fail(400, 'Choose who covers the fees.', { field: 'feeChoice' });
      const requestId = body.requestId;
      if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) return fail(400, 'Reload the offer and try again.');
      const expect = body.expectTotalMinor;
      if (typeof expect !== 'number' || !Number.isSafeInteger(expect)) return fail(400, 'Check the amounts first.', { field: 'expectTotalMinor' });
      try {
        const { quote, url, reused } = await publishOffer(s, meetups, choice, expect, { fees, store, stripe: lifecycle.stripe, origin, env, requestId });
        if (!reused) await note(`:link: Payment link created for ${who(s)}${quote.surchargeMinor ? ' (sponsor covers the fees)' : ''}: ${chfMinor(quote.totalMinor)}.`, lifecycle);
        return json(200, { ok: true, url, quote: quoteView(quote) });
      } catch (cause) {
        if (cause instanceof PreviewChanged || cause instanceof OfferReplaced) return fail(409, cause.message);
        if (cause instanceof LinkStillOpen) return fail(502, cause.message);
        throw cause;
      }
    },
    'create the payment link',
  );

async function refusal(s: Sponsor, store: SponsorStore): Promise<Response | null> {
  if (s.cycle !== 'once') return fail(409, 'Payment links are for one-time sponsorships. Recurring ones pay on their sponsorship page.');
  if (s.status !== 'pending') return fail(409, 'This sponsorship is already paid or has ended.');
  if (!(await store.documents(s.id)).length) return fail(409, 'Attach the signed contract first: without it they sign and pay on their sponsorship page.');
  if (!(await store.meetups(s.id)).length) return fail(409, 'Choose the meetups first.');
  return null;
}

const previewView = (
  f: { baseMinor: number; surchargeMinor: number; totalMinor: number; feeChoice: FeeChoice; tariffVersion: string | null; policyVersion: string | null },
  purpose: string,
  estimate: { tariffVersion: string; feeMinor: number; netMinor: number } | null,
) => ({
  purpose,
  feeChoice: f.feeChoice,
  feeChoiceLabel: FEE_CHOICE_LABEL[f.feeChoice],
  base: chfMinor(f.baseMinor),
  surcharge: f.surchargeMinor ? chfMinor(f.surchargeMinor) : null,
  total: chfMinor(f.totalMinor),
  totalMinor: f.totalMinor,
  tariffVersion: f.tariffVersion,
  policyVersion: f.policyVersion,
  estimate: estimate ? { tariffVersion: estimate.tariffVersion, fee: chfMinor(estimate.feeMinor), net: chfMinor(estimate.netMinor) } : null,
});

export type PaymentLinkPreview = ReturnType<typeof previewView>;

export const GET: APIRoute = ({ request, params }) => handlePaymentLink(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handlePaymentLink(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
