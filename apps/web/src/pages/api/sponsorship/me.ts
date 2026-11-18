/**
 * The signed-in contact's sponsorship, for /partners/account.
 *
 * GET /api/sponsorship/me   (session cookie)
 *   200 { ok, email, contact, sponsor, contacts, agreements, proposals, logos, pendingChange, agreementVersion, acceptedCurrent }
 *   401 · 503 · 502
 *
 * No Stripe ids, notes or audit log: those are for the board.
 */
import { AGREEMENT, type Sponsor } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../server/http.ts';
import { agreementView, contactView, logoView, proposalView, sponsorView } from '../../../server/sponsor.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { pendingChange } from '../../../server/sponsor-stripe.ts';

export const prerender = false;

const changeOf = (s: Sponsor, deps: SponsorRouteDeps, env: Record<string, string | undefined>) =>
  s.stripeSubscriptionId && (s.status === 'active' || s.status === 'past_due') ? pendingChange(s.stripeSubscriptionId, { env, fetch: deps.fetch }).catch(() => null) : null;

export const handleSponsorMe = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, contact, sponsor: s, store, env }) => {
      if (!s || !contact) return json(200, { ok: true, email: user.email, contact: null, sponsor: null, agreementVersion: AGREEMENT.version });
      const [contacts, agreements, proposals, logos, pending] = await Promise.all([
        store.contacts(s.id),
        store.agreements(s.id),
        store.proposals(s.id),
        store.logos(s.id),
        changeOf(s, deps, env),
      ]);
      return json(200, {
        ok: true,
        email: user.email,
        contact: contactView(contact),
        sponsor: sponsorView(s),
        contacts: contacts.map(contactView),
        agreements: agreements.map(agreementView),
        proposals: proposals.filter((p) => p.status === 'open').map(proposalView),
        logos: logos.slice(0, 5).map(logoView),
        pendingChange: pending,
        agreementVersion: AGREEMENT.version,
        acceptedCurrent: agreements[0]?.version === AGREEMENT.version,
      });
    },
    'load your sponsorship',
  );

export const GET: APIRoute = ({ request }) => handleSponsorMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
