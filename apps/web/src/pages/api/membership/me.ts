/**
 * The signed-in person's membership, for /membership/account.
 *
 * GET /api/membership/me   (session cookie)
 *   200 { ok: true, email, member: null | MemberView, certificates, canJoin, termsVersion, acceptedCurrentTerms }
 *   401 not signed in · 503 not configured · 502 failed
 *
 * Only what the member may see: no Stripe ids, notes or audit log.
 */
import { TERMS, acceptedCurrent, canJoin } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../server/http.ts';
import { certificateView, memberView } from '../../../server/membership.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';

export const prerender = false;

export const handleMe = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ user, member, store }) =>
      json(200, {
        ok: true,
        email: user.email,
        member: member ? memberView(member) : null,
        certificates: member ? (await store.certificates(member.id)).map(certificateView) : [],
        canJoin: canJoin(member?.status ?? null),
        termsVersion: TERMS.version,
        acceptedCurrentTerms: member ? acceptedCurrent(await store.acceptedTerms(member.id)) : false,
      }),
    'load your membership',
  );

export const GET: APIRoute = ({ request }) => handleMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
