/**
 * Who covers card processing fees on a recurring sponsorship (docs/domains/sponsorship/fees.md).
 *   GET  → { ok, inForce: QuoteView | null, open: QuoteView | null, gate }
 *   POST { feeChoice } → 200 { ok, inForce, open, url? } · 400 · 404 · 409
 *
 * Not paying yet (pending): a new offer, frozen as a quote for the current plan. "Sponsor covers the
 * fees" adds a recurring fee line at Checkout once the sponsor ticked that they agree; an open
 * Checkout page is closed so it cannot be paid without it.
 * Running by card: "Sponsor covers the fees" waits for the sponsor to confirm on their page (`url`
 * goes there) and applies from the next renewal. "ZurichJS covers the fees" removes the fee line
 * from the next renewal at once: it only lowers what they pay. Nothing is refunded or prorated.
 * One-time sponsorships use the payment link; bank-transfer ones pay no card fees.
 */
import { fee, isFeeChoice, isRecurring, quoteFigures, type Sponsor } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { accountUrl, note, who } from '../../../../../../server/sponsor.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { INTERVAL_OF, currentGate, feeStore, gateView, quoteView } from '../../../../../../server/sponsor-fees.ts';
import { closeCheckout, removeSurchargeItem } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

const refusal = (s: Sponsor): string | null => {
  if (!isRecurring(s.cycle)) return 'A one-time sponsorship chooses who covers the fees on its payment link.';
  if (s.status === 'ended') return 'This sponsorship has ended.';
  if (s.status !== 'pending' && (s.paymentMode !== 'card' || !s.stripeSubscriptionId)) return 'It is paid by bank transfer: there are no card fees to pass on.';
  return null;
};

export const handleSponsorFees = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ env, store, origin, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const fees = deps.fees ?? feeStore(env);
      const answer = async (extra: object = {}) => {
        const [inForce, open] = await Promise.all([fees.acceptedQuote(s.id), fees.openQuote(s.id, 'sponsorship', null)]);
        return json(200, {
          ok: true,
          inForce: inForce ? quoteView(inForce) : null,
          open: open?.interval ? quoteView(open) : null,
          gate: gateView(await currentGate(fees, env)),
          locked: refusal(s),
          ...extra,
        });
      };
      if (request.method === 'GET') return answer();

      const why = refusal(s);
      if (why) return fail(409, why);
      const body = (await readJsonObject(request)) ?? {};
      if (!isFeeChoice(body.feeChoice)) return fail(400, 'Choose who covers the fees.', { field: 'feeChoice' });
      const cycle = s.cycle as Exclude<Sponsor['cycle'], 'once'>;
      const figures = quoteFigures(fee(s.tier, cycle) * 100, body.feeChoice, await currentGate(fees, env));
      const { quote } = await fees.createQuote({
        ...figures,
        interval: INTERVAL_OF[cycle],
        sponsorId: s.id,
        subject: 'sponsorship',
        subjectId: null,
        purpose: `Sponsorship, ${cycle}`,
        createdBy: 'board',
      });

      if (s.status === 'pending') {
        await closeCheckout(s, store, lifecycle.stripe);
        return answer();
      }
      if (quote.feeChoice === 'absorb') {
        const removed = await removeSurchargeItem(s.stripeSubscriptionId!, lifecycle.stripe);
        await fees.acceptQuote(quote.id, 'board', null);
        if (removed) await note(`:receipt: ${who(s)} no longer pays a processing fee, from the next renewal.`, lifecycle);
        return answer();
      }
      await note(`:receipt: A processing fee for ${who(s)} waits for them to confirm it on their sponsorship page.`, lifecycle);
      return answer({ url: `${accountUrl(origin)}?change=fees` });
    },
    'change who covers the fees',
  );

export const GET: APIRoute = ({ request, params }) => handleSponsorFees(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleSponsorFees(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
