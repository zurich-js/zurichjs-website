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
    async ({ user, member, store, env }) => {
      const ref = new URL(request.url).searchParams.get('attempt');
      const attempt = ref && member ? await store.checkoutAttempt(member.id) : null;
      const [certificates, acceptedTerms, pendingPlan] = await Promise.all([
        member ? store.certificates(member.id) : [],
        member ? store.acceptedTerms(member.id) : null,
        // A Stripe failure leaves the rest of the account available.
        member?.stripeSubscriptionId && member.status !== 'resigning' && member.status !== 'ended'
          ? pendingPlanChange(member.stripeSubscriptionId, { env, fetch: deps.fetch }).catch(() => null)
          : null,
      ]);
      return json(200, {
        ...(ref ? { attemptState: attempt?.id === ref ? (attempt.confirmation ?? 'waiting') : 'superseded' } : {}),
        ok: true,
        email: user.email,
        member: member ? memberView(member) : null,
        certificates: certificates.map(certificateView),
        canJoin: canJoin(member?.status ?? null),
        termsVersion: TERMS.version,
        acceptedCurrentTerms: member ? acceptedCurrent(acceptedTerms) : false,
        pendingPlan,
      });
    },
    'load your membership',
  );

export const GET: APIRoute = ({ request }) => handleMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
