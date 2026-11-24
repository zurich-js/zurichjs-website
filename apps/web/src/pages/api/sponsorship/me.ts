/**
 * The signed-in contact's sponsorship, for /partners/account.
 *
 * GET /api/sponsorship/me   (session cookie)
 *   200 {
 *     ok, email,
 *     contact, sponsor | null, contacts, agreements, logos, contracts, pendingChange,
 *     pendingChangeUnknown (Stripe could not be asked, or its schedule could not be read: pendingChange says nothing),
 *     agreementVersion, signedCurrent (an agreement on the current version exists: one tick is enough),
 *     signer: { name, title } | null (this person's last signature, to prefill),
 *     invitation: { company, tierName } | null (a colleague added this email; accept or decline)
 *   }
 *   401 · 503 · 502
 *
 * No Stripe ids, notes or audit log: those are for the board.
 */
import { AGREEMENT, type Sponsor } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { json, methodNotAllowed } from '../../../server/http.ts';
import { agreementView, contactView, documentView, logoView, sponsorView } from '../../../server/sponsor.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { pendingChange } from '../../../server/sponsor-stripe.ts';
import { tierInfo } from '@zurichjs/sponsorship';

export const prerender = false;

/** A change waiting for the renewal; `unknown` when Stripe failed or answered with a schedule pendingChange cannot read. */
const changeOf = async (s: Sponsor, deps: SponsorRouteDeps, env: Record<string, string | undefined>) => {
  if (!s.stripeSubscriptionId || !(s.status === 'active' || s.status === 'past_due')) return { change: null, unknown: false };
  try {
    return { change: await pendingChange(s.stripeSubscriptionId, { env, fetch: deps.fetch, now: deps.now }), unknown: false };
  } catch (cause) {
    console.error(`[sponsorship] could not read the scheduled change of ${s.id}`, cause);
    return { change: null, unknown: true };
  }
};

export const handleSponsorMe = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ user, contact, sponsor: s, invitation, store, env }) => {
      const base = { ok: true, email: user.email, agreementVersion: AGREEMENT.version };
      if (!s || !contact)
        return json(200, {
          ...base,
          contact: null,
          sponsor: null,
          invitation: invitation ? { company: invitation.sponsor.companyName, tierName: tierInfo(invitation.sponsor.tier).name } : null,
        });
      const [contacts, agreements, logos, documents, meetups, pending] = await Promise.all([
        store.contacts(s.id),
        store.agreements(s.id),
        store.logos(s.id),
        store.documents(s.id),
        store.meetups(s.id),
        changeOf(s, deps, env),
      ]);
      const mine = agreements.find((a) => a.signerEmail === user.email);
      return json(200, {
        ...base,
        contact: contactView(contact),
        sponsor: sponsorView(s, meetups, documents.length > 0),
        contacts: contacts.map(contactView),
        agreements: agreements.map(agreementView),
        logos: logos.slice(0, 5).map(logoView),
        contracts: documents.map(documentView),
        pendingChange: pending.change,
        pendingChangeUnknown: pending.unknown,
        signedCurrent: agreements.some((a) => a.version === AGREEMENT.version) || documents.length > 0,
        signer: mine ? { name: mine.signerName, title: mine.signerTitle } : null,
        invitation: null,
      });
    },
    'load your sponsorship',
  );

export const GET: APIRoute = ({ request }) => handleSponsorMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
