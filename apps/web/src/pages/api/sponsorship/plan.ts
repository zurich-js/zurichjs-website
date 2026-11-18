/**
 * Change tier or billing, signed under the agreement (owner, 18th November 2026): a higher
 * tier on the same billing applies now and Stripe charges the prorated difference; anything
 * else applies from the next renewal. Choosing the current plan drops a waiting change.
 *
 * POST /api/sponsorship/plan   (session cookie)   { tier, cycle, signerName, signerTitle, agreementVersion }
 *   200 { ok, sponsor, timing: 'none' | 'now' | 'renewal', from } · 400 · 404 · 409 · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { sponsorView } from '../../../server/sponsor.ts';
import { parsePlan, parseSigner } from '../../../server/sponsor-input.ts';
import { changePlan } from '../../../server/sponsor-lifecycle.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';

export const prerender = false;

export const handlePlan = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, sponsor, lifecycle }) => {
      if (!sponsor) return fail(404, 'There is no sponsorship on this account yet.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the form as JSON.');
      const plan = parsePlan(body);
      if (!plan.ok) return fail(400, plan.error, { field: plan.field });
      if (sponsor.status === 'pending') return fail(409, 'Choose the plan when you set up payment.');
      const same = plan.value.tier === sponsor.tier && plan.value.cycle === sponsor.cycle;
      const signer = same ? null : parseSigner(body, user.email);
      if (signer && !signer.ok) return fail(400, signer.error, { field: signer.field });
      const r = await changePlan(sponsor, plan.value, { kind: 'sponsor', id: user.id }, lifecycle, signer?.value ?? null);
      return json(200, { ok: true, sponsor: sponsorView(r.sponsor), timing: r.timing, from: r.from });
    },
    'change the sponsorship',
  );

export const POST: APIRoute = ({ request }) => handlePlan(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
