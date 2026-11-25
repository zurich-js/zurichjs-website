/**
 * The sponsor confirms a processing fee the board offered on a running recurring sponsorship
 * (docs/domains/sponsorship/fees.md). It applies from the next renewal: a fee line is added to the
 * subscription without proration, and the quote is in force from then on.
 *
 * POST { quoteId, confirm: true } (session cookie) → 200 { ok, inForce } · 400 · 401 · 404 · 409
 */
import { SponsorshipError } from '../../../server/sponsor-lifecycle.ts';
import { fee, isRecurring } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { note, who } from '../../../server/sponsor.ts';
import { feeStore, quoteView } from '../../../server/sponsor-fees.ts';
import { signedInSponsor, type SponsorRouteDeps } from '../../../server/sponsor-route.ts';
import { setSurchargeItem } from '../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handleConfirmFee = (request: Request, deps: SponsorRouteDeps = {}) =>
  signedInSponsor(
    request,
    deps,
    async ({ sponsor: s, contact, env, lifecycle }) => {
      if (!s || !contact) return fail(404, 'No sponsorship for this email.');
      const body = (await readJsonObject(request)) ?? {};
      if (body.confirm !== true) return fail(400, 'Tick the box to agree to the processing fee.', { field: 'confirm' });
      const fees = deps.fees ?? feeStore(env);
      const q = typeof body.quoteId === 'string' ? await fees.quote(body.quoteId) : null;
      if (!q || q.sponsorId !== s.id || q.subject !== 'sponsorship' || !q.interval) return fail(404, 'No such offer.');
      if (q.planChange) return fail(409, 'Review and confirm this plan change on the sponsorship page.');
      if (q.status === 'accepted') return json(200, { ok: true, inForce: quoteView(q) });
      if (q.status !== 'open') throw new SponsorshipError('This offer was replaced or already confirmed. Reload the page.');
      if (!isRecurring(s.cycle) || !s.stripeSubscriptionId || (s.status !== 'active' && s.status !== 'past_due'))
        throw new SponsorshipError('This sponsorship cannot take a processing fee now. Write to us.');
      // The fee was worked out for one plan: after a plan change it needs a new offer.
      if (q.baseMinor !== fee(s.tier, s.cycle) * 100) throw new SponsorshipError('Your plan changed since this offer. We will send you a new one.');
      if (!(await fees.claimRecurring(q.id, contact.id))) throw new SponsorshipError('The offer changed. Reload to review it.');
      const item = await setSurchargeItem(s.stripeSubscriptionId, q, lifecycle.stripe);
      const inForce = await fees.acceptQuote(q.id, contact.id, item);
      if (!inForce) throw new SponsorshipError('The fee confirmation needs review.');
      await note(`:receipt: ${who(s)} confirmed the processing fee; it applies from the next renewal.`, lifecycle);
      return json(200, { ok: true, inForce: inForce ? quoteView(inForce) : null });
    },
    'confirm the processing fee',
  );

export const POST: APIRoute = ({ request }) => handleConfirmFee(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
