/**
 * The signed-in person's membership, for /membership/account.
 *
 * GET /api/membership/me   (session cookie)
 *   200 { ok: true, email, member: null | MemberView, certificates, canJoin, termsVersion, acceptedCurrentTerms, pendingPlan }
 *   401 not signed in · 503 not configured · 502 failed
 *
 * Only what the member may see: no Stripe ids, notes or audit log.
 */
import { TERMS, acceptedCurrent, canJoin } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../server/http.ts';
import { certificateView, memberView } from '../../../server/membership.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';
import { pendingPlanChange } from '../../../server/membership-stripe.ts';

export const prerender = false;

export const handleMe = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ user, member, store, env }) =>
      json(200, {
        ok: true,
        email: user.email,
        member: member ? memberView(member) : null,
        certificates: member ? (await store.certificates(member.id)).map(certificateView) : [],
        canJoin: canJoin(member?.status ?? null),
        termsVersion: TERMS.version,
        acceptedCurrentTerms: member ? acceptedCurrent(await store.acceptedTerms(member.id)) : false,
        // A level or cycle switch waiting for the next renewal. Stripe being slow never breaks the page.
        pendingPlan:
          member?.stripeSubscriptionId && member.status !== 'resigning' && member.status !== 'ended'
            ? await pendingPlanChange(member.stripeSubscriptionId, { env, fetch: deps.fetch }).catch(() => null)
            : null,
      }),
    'load your membership',
  );

export const GET: APIRoute = ({ request }) => handleMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
