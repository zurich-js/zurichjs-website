/**
 * Change tier or how often you pay, confirmed under the agreement (one tick once it is signed): a
 * higher tier on the same billing applies now and Stripe charges the prorated difference; anything
 * else applies from the next renewal. Paid by bank transfer: at once, we bill the difference.
 * Choosing the current plan drops a waiting change. Opening /partners/account?change=builder-yearly
 * (the link in our "please confirm" email) fills this in.
 *
 * POST /api/sponsorship/plan   (session cookie)   { tier, cycle, confirm? | signerName?, signerTitle?, agreementVersion }
 *   200 { ok, sponsor, timing: 'none' | 'now' | 'renewal', from } · 400 · 404 · 409 · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parsePlan, parseSignature } from '../../../server/sponsor-input.ts';
import { changePlan, resolveSigner } from '../../../server/sponsor-lifecycle.ts';
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
      const same = plan.value.tier === sponsor.tier && plan.value.cycle === sponsor.cycle;
      let signer = null;
      if (!same) {
        const sig = parseSignature(body);
        if (!sig.ok) return fail(400, sig.error, { field: sig.field });
        signer = await resolveSigner(sponsor, contact, sig.value, user.email, lifecycle);
        if (!signer) return fail(400, 'Confirm the change under the sponsorship agreement.', { field: 'agreement' });
      }
      const r = await changePlan(sponsor, plan.value, { kind: 'sponsor', id: user.id }, lifecycle, signer);
      return json(200, { ok: true, sponsor: sponsorView(r.sponsor), timing: r.timing, from: r.from });
    },
    'change the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handlePlan(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
