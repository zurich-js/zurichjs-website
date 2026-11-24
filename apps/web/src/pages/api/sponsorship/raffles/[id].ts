/**
 * The sponsor's answer to a raffle offer.
 *   POST { action: 'accept', termsVersion, confirm: true }
 *     Records acceptance of the offer's raffle terms version by this contact, checks eligibility
 *     again, and (when ZurichJS buys the prize) opens the payment link for the frozen quote.
 *     → 200 { ok, raffle (with payUrl) } · 400 · 404 · 409 (not offered, terms changed, not eligible)
 *   POST { action: 'withdraw' }  a proposal or an unpaid offer → cancelled
 */
import { RaffleRuleError } from '@zurichjs/raffle';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { assertEligible, closeRafflePaymentLink, createRafflePaymentLink, raffleStore, raffleView, termsGate } from '../../../../server/raffle.ts';
import { note, slackText } from '../../../../server/sponsor.ts';
import { feeStore } from '../../../../server/sponsor-fees.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../../server/sponsor-route.ts';

export const prerender = false;

export const handleRaffleAnswer = (request: Request, id: string, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor: s, contact, env, user, origin, lifecycle }) => {
      if (!s || !contact) return fail(404, 'No sponsorship for this email.');
      const raffles = deps.raffles ?? raffleStore(env);
      const fees = deps.fees ?? feeStore(env);
      const r = await raffles.get(id);
      if (!r || r.sponsorId !== s.id) return fail(404, 'No such raffle.');
      const actor = { kind: 'sponsor', id: user.id } as const;
      const body = (await readJsonObject(request)) ?? {};

      if (body.action === 'withdraw') {
        if (r.funding !== 'unpaid') return fail(409, 'It is paid already. Write to us to change it.');
        const done = await raffles.moveStage(r.id, { from: r.stage, to: 'cancelled', actor, reason: 'Withdrawn by the sponsor' });
        await closeRafflePaymentLink(r, lifecycle.stripe);
        if (r.paymentLinkId) await raffles.linkPayment(r.id, null, actor);
        if (r.quoteId) await fees.voidQuote(r.quoteId);
        return json(200, { ok: true, raffle: raffleView(done, null) });
      }
      if (body.action !== 'accept') return fail(400, 'Unknown action.', { field: 'action' });
      if (body.confirm !== true) return fail(400, 'Tick the box to accept the raffle terms.', { field: 'confirm' });
      if (r.stage !== 'offered') throw new RaffleRuleError('There is no offer to accept for this raffle.');
      const gate = termsGate(env);
      if (!gate.open || gate.version !== r.termsVersion || body.termsVersion !== r.termsVersion)
        throw new RaffleRuleError('The raffle terms changed since this offer. We will send you a new offer.');
      assertEligible(s, deps.now?.() ?? new Date());

      let out = await raffles.accept(r.id, { version: r.termsVersion, contactId: contact.id, actor });
      if (out.fulfilment === 'zurichjs' && out.funding === 'unpaid' && !out.paymentLinkUrl) {
        const quote = out.quoteId ? await fees.quote(out.quoteId) : null;
        if (!quote || quote.status !== 'open') throw new RaffleRuleError('This offer has no open price. We will send you a new offer.');
        const link = await createRafflePaymentLink(out, quote, origin, lifecycle.stripe);
        out = await raffles.linkPayment(out.id, link, actor);
      }
      await note(`:handshake: *${slackText(s.companyName)}* accepted the raffle terms for ${slackText(r.eventTitle)}.`, lifecycle);
      return json(200, { ok: true, raffle: raffleView(out, out.quoteId ? await fees.quote(out.quoteId) : null) });
    },
    'answer the raffle offer',
  );

export const POST: APIRoute = ({ request, params }) => handleRaffleAnswer(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
