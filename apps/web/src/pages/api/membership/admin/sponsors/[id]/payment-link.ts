/**
 * A Stripe payment link for a one-time sponsorship that has a signed contract on file: one card
 * payment for its meetups, usable once. Send it to the sponsor however you like; paying it starts
 * the sponsorship (webhook). Creating a new one switches the old one off.
 *   POST → 200 { ok, url } · 404 · 409 (not one-time, already paid, no contract) · 503 (sponsorship not switched on)
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../../../server/http.ts';
import { note, who } from '../../../../../../server/sponsor.ts';
import { sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { createPaymentLink } from '../../../../../../server/sponsor-stripe.ts';

export const prerender = false;

export const handlePaymentLink = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, origin, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      if (s.cycle !== 'once') return fail(409, 'Payment links are for one-time sponsorships. Recurring ones pay on their sponsorship page.');
      if (s.status !== 'pending') return fail(409, 'This sponsorship is already paid or has ended.');
      if (!(await store.documents(s.id)).length) return fail(409, 'Attach the signed contract first: without it they sign and pay on their sponsorship page.');
      const meetups = await store.meetups(s.id);
      if (!meetups.length) return fail(409, 'Choose the meetups first.');
      const url = await createPaymentLink(s, meetups, store, origin, lifecycle.stripe);
      await note(`:link: Payment link created for ${who(s)}.`, lifecycle);
      return json(200, { ok: true, url });
    },
    'create the payment link',
  );

export const POST: APIRoute = ({ request, params }) => handlePaymentLink(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
