/**
 * Change tier or how often you pay, confirmed under the agreement (one tick once it is signed): a
 * higher tier on the same billing applies now and Stripe charges the prorated difference; anything
 * else applies from the next renewal. Paid by bank transfer: at once, we bill the difference.
 * Choosing the current plan drops a waiting change. Opening /partners/account?change=builder-yearly
 * (the link in our "please confirm" email) fills this in.
 *
 * POST /api/sponsorship/plan   (session cookie)   { tier, cycle, replaces? (tier-cycle@date shown at confirmation), confirm? | signerName?, signerTitle?, agreementVersion }
 *   200 { ok, sponsor, timing: 'none' | 'now' | 'renewal', from } · 400 · 404 · 409 · 401 · 503 · 502
 */
import { AGREEMENT } from '@zurichjs/sponsorship';
import { feeStore } from '../../../server/sponsor-fees.ts';
import { applyFeePlan, UnappliedPlanExpired, UpgradeDeclined } from '../../../server/sponsor-stripe.ts';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parsePlan, parseSignature } from '../../../server/sponsor-input.ts';
import { changePlan, resolveSigner, SponsorshipError } from '../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handlePlan = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, contact, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const plan = parsePlan(body);
      if (!plan.ok) return fail(400, plan.error, { field: plan.field });
      if (sponsor.status === 'pending') return fail(409, 'Choose the plan when you pay.');
      if (body.replaces != null && typeof body.replaces !== 'string') return fail(400, 'Reload the page to check the renewal plan.');
      const same = plan.value.tier === sponsor.tier && plan.value.cycle === sponsor.cycle;
      let signer = null;
      if (!same || body.quoteId !== undefined) {
        const sig = parseSignature(body);
        if (!sig.ok) return fail(400, sig.error, { field: sig.field });
        signer = await resolveSigner(sponsor, contact, sig.value, user.email, lifecycle);
        if (!signer) return fail(400, 'Confirm the change under the sponsorship agreement.', { field: 'agreement' });
      }
      if (body.quoteId !== undefined) {
        if (typeof body.quoteId !== 'string' || !contact || !signer || body.acceptFee !== true) return fail(400, 'Confirm the displayed plan and fee.');
        const fees = deps.fees ?? feeStore(lifecycle.env);
        const q = await fees.quote(body.quoteId);
        const terms = q?.planChange;
        if (
          !q ||
          !terms ||
          q.sponsorId !== sponsor.id ||
          terms.subscription !== sponsor.stripeSubscriptionId ||
          terms.tier !== plan.value.tier ||
          terms.cycle !== plan.value.cycle ||
          !['active', 'past_due'].includes(sponsor.status)
        )
          return fail(409, 'This plan offer no longer applies.');
        const response = (s: typeof sponsor) =>
          json(200, {
            ok: true,
            sponsor: sponsorView(s),
            timing: terms.charge.timing,
            from: terms.charge.timing === 'renewal' ? new Date(terms.periodEnd * 1000).toISOString().slice(0, 10) : null,
          });
        if (q.status === 'accepted') return response(sponsor);
        if ((body.confirmationAttempt ?? null) !== (q.confirmationAttempt ?? null))
          return fail(409, 'This confirmation has ended. Review the offer again.', { field: 'confirmationAttempt' });
        if (q.applyingBy && q.applyingBy !== contact.id) return fail(409, 'Another contact is confirming this quote.');
        if (q.status === 'void') return fail(409, 'This offer is no longer available. Review the current quote.', { field: 'quoteId' });
        if (q.status !== 'open' || (await fees.acceptedQuote(sponsor.id))?.id !== terms.previousQuote) return fail(409, 'This offer was replaced. Review the current quote.');
        const signature = { ...signer, version: AGREEMENT.version, attempt: q.confirmationAttempt ?? null };
        const applied = await applyFeePlan(q, terms, lifecycle.stripe, async () => {
          if (!(await fees.claimRecurring(q.id, contact.id, signature)))
            throw new SponsorshipError('The confirmation changed. Review the current quote.', 409, 'confirmationAttempt');
        }).catch(async (cause: unknown) => {
          if (cause instanceof UnappliedPlanExpired) {
            if (await fees.voidExpiredPlan(q.id, contact.id, signature.attempt)) throw new SponsorshipError('This offer expired. Ask the board for a new one.', 409, 'quoteId');
            throw new SponsorshipError('This confirmation has ended. Review the current offer.', 409, 'quoteId');
          }
          if (!(cause instanceof UpgradeDeclined)) throw cause;
          if (!(await fees.releaseDeclinedPlan(q.id, contact.id, signature.attempt)))
            throw new SponsorshipError('The confirmation changed. Review the current quote.', 409, 'confirmationAttempt');
          throw new SponsorshipError('Stripe could not complete the payment. Update your payment method, then review and confirm the offer again.', 402, 'confirmationAttempt');
        });
        if ('schedule' in applied) {
          if (!(await fees.savePlanSchedule(q.id, applied.schedule))) throw new Error('The confirmed schedule needs reconciliation.');
          return response(sponsor);
        }
        const updated = await lifecycle.store.update(sponsor.id, plan.value, { kind: 'sponsor', id: user.id });
        if (!(await fees.acceptQuote(q.id, contact.id, applied.item))) throw new Error('The confirmed Stripe change needs reconciliation.');
        return response(updated);
      }
      const r = await changePlan(sponsor, plan.value, { kind: 'sponsor', id: user.id }, lifecycle, signer, body.replaces ?? null);
      return json(200, { ok: true, sponsor: sponsorView(r.sponsor), timing: r.timing, from: r.from, droppedChange: r.droppedChange ?? null });
    },
    'change the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handlePlan(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
