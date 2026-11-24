/**
 * The card payments made against a sponsor's offers (docs/domains/sponsorship/fees.md, "Payments"):
 * each Stripe session once, whether it paid its quote or waits for review, with the processor's
 * actual fee once Stripe reports it.
 *
 * A payment waits for review when it does not match the open offer (another amount, a replaced
 * offer, a second payment). It started nothing. The board decides:
 *   accept   the sponsorship starts on this payment (a one-time sponsorship still waiting), and the
 *            open offer, if any, is withdrawn so it cannot be paid again
 *   dismiss  nothing starts; the board settles it in Stripe (a refund is never made from here)
 *
 *   GET → { ok, payments: [...] }
 *   POST { action: 'accept' | 'dismiss', sessionId, note? } · { action: 'reconcile' } (reads missing actual fees from Stripe)
 *     → 200 { ok, payments } · 400 · 404 · 409 (not waiting for review)
 */
import { chfMinor, type QuotePayment } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { note, who, zurichDay } from '../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { feeStore } from '../../../../../../server/sponsor-fees.ts';
import { reconcileFee, withdrawOffer } from '../../../../../../server/sponsor-offers.ts';
import { startOnce } from '../../../../../../server/sponsor-webhook.ts';

export const prerender = false;

export const paymentView = (p: QuotePayment) => ({
  sessionId: p.sessionId,
  quoteId: p.quoteId,
  amount: p.currency === 'chf' ? chfMinor(p.amountMinor) : `${p.amountMinor} minor units (${p.currency.toUpperCase()})`,
  currency: p.currency,
  outcome: p.outcome,
  reason: p.reason,
  fee: p.feeMinor === null ? null : chfMinor(p.feeMinor),
  net: p.netMinor === null ? null : chfMinor(p.netMinor),
  resolution: p.resolution,
  resolvedAt: p.resolvedAt,
  resolutionNote: p.resolutionNote,
  receivedAt: p.receivedAt,
});

export const handleSponsorPayments = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, env, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const fees = deps.fees ?? feeStore(env);
      const answer = async () => json(200, { ok: true, payments: (await fees.payments(s.id)).filter((p) => p.subject === 'sponsorship').map(paymentView) });
      if (request.method === 'GET') return answer();

      const body = (await readJsonObject(request)) ?? {};
      if (body.action === 'reconcile') {
        for (const p of await fees.payments(s.id)) if (p.feeMinor === null) await reconcileFee(p, fees, lifecycle.stripe);
        return answer();
      }
      if (body.action !== 'accept' && body.action !== 'dismiss') return fail(400, 'Unknown action.', { field: 'action' });
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
      const words = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
      const payment = sessionId ? await fees.payment(sessionId) : null;
      if (!payment || payment.sponsorId !== s.id || payment.subject !== 'sponsorship') return fail(404, 'No such payment for this sponsor.');
      if (body.action === 'dismiss' && !words) return fail(400, 'Say how it was settled (a refund in Stripe, say).', { field: 'note' });
      if (body.action === 'accept' && !payment.resolution && (s.cycle !== 'once' || s.status !== 'pending'))
        return fail(409, 'Only a pending one-time sponsorship can start on this payment. Record its settlement instead.');
      const decided =
        payment.resolution === 'accepted' && body.action === 'accept'
          ? payment
          : await fees.resolvePayment(sessionId, body.action === 'accept' ? 'accepted' : 'dismissed', 'board', words || null);
      if (!decided) return fail(409, 'This payment is not waiting for a decision.');
      await store.log(s.id, body.action === 'accept' ? 'payment_review_accepted' : 'payment_review_dismissed', BOARD, { sessionId, note: words || null });
      if (body.action === 'accept') {
        if (s.cycle === 'once' && s.status === 'pending') {
          await withdrawOffer(s, fees, store, lifecycle.stripe);
          const today = zurichDay(deps.now === undefined ? new Date() : new Date(deps.now));
          await startOnce((await store.get(s.id)) ?? s, BOARD, today, lifecycle, fees);
        }
        await reconcileFee(decided, fees, lifecycle.stripe).catch(() => false);
      }
      await note(`:white_check_mark: The board ${body.action === 'accept' ? 'accepted' : 'dismissed'} a payment of ${chfMinor(payment.amountMinor)} from ${who(s)}.`, lifecycle);
      return answer();
    },
    'change the payment',
  );

export const GET: APIRoute = ({ request, params }) => handleSponsorPayments(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleSponsorPayments(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
