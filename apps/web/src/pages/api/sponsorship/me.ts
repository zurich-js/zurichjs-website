/**
 * The signed-in contact's sponsorship, for /partners/account.
 *
 * GET /api/sponsorship/me   (session cookie)
 *   200 {
 *     ok, email,
 *     contact, sponsor | null, contacts, agreements, logos, contracts, pendingChange,
 *     agreementVersion, signedCurrent (an agreement on the current version exists: one tick is enough),
 *     signer: { name, title } | null (this person's last signature, to prefill),
 *     invitation: { company, tierName } | null (a colleague added this email; accept or decline),
 *     offer: { quote, payUrl, preparing } | null (pending: the board's open offer, with base, fee and total;
 *       payUrl only once its link is published, `preparing` while it is not)
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
import { feeStore, quoteView } from '../../../server/sponsor-fees.ts';
import { tierInfo } from '@zurichjs/sponsorship';

export const prerender = false;

const changeOf = (s: Sponsor, deps: SponsorRouteDeps, env: Record<string, string | undefined>) =>
  s.stripeSubscriptionId && (s.status === 'active' || s.status === 'past_due')
    ? pendingChange(s.stripeSubscriptionId, { env, fetch: deps.fetch, now: deps.now }).catch(() => null)
    : null;

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
      // Waiting for payment: the offer the board froze (fees.ts), so they see base, fee and total first.
      const quote = s.status === 'pending' ? await (deps.fees ?? feeStore(env)).openQuote(s.id, 'sponsorship', null) : null;
      const mine = agreements.find((a) => a.signerEmail === user.email);
      return json(200, {
        ...base,
        contact: contactView(contact),
        sponsor: sponsorView(s, meetups, documents.length > 0),
        contacts: contacts.map(contactView),
        agreements: agreements.map(agreementView),
        logos: logos.slice(0, 5).map(logoView),
        contracts: documents.map(documentView),
        pendingChange: pending,
        signedCurrent: agreements.some((a) => a.version === AGREEMENT.version) || documents.length > 0,
        signer: mine ? { name: mine.signerName, title: mine.signerTitle } : null,
        invitation: null,
        offer: quote ? { quote: quoteView(quote), payUrl: quote.linkState === 'live' ? quote.linkUrl : null, preparing: quote.linkState !== 'live' } : null,
      });
    },
    'load your sponsorship',
  );

export const GET: APIRoute = ({ request }) => handleSponsorMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
