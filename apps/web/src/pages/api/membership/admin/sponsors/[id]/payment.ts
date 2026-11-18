/**
 * Record a bank transfer received (sponsorships paid outside Stripe, or not started yet). The
 * sponsor's billing contact gets a written confirmation.
 *   POST { paidUntil: 'YYYY-MM-DD' (the first day not paid for), amount? (CHF), reference? } → 200 { ok, sponsor } · 400 · 404 · 409
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../../server/sponsor.ts';
import { BOARD, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { isDate, parsePrice } from '../../../../../../server/sponsor-input.ts';
import { recordPayment } from '../../../../../../server/sponsor-lifecycle.ts';

export const prerender = false;

export const handleRecordPayment = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      if (!isDate(body.paidUntil)) return fail(400, 'Give the first day not paid for, as YYYY-MM-DD.', { field: 'paidUntil' });
      const amount = parsePrice(body.amount);
      if (!amount.ok) return fail(400, 'Give the amount in whole francs, or leave it empty.', { field: 'amount' });
      const reference = text(body.reference, 100);
      if (reference === false) return fail(400, 'Keep the reference under 100 characters.', { field: 'reference' });
      const updated = await recordPayment(s, { paidUntil: body.paidUntil, amount: amount.value, reference: reference ?? null }, BOARD, lifecycle);
      return json(200, { ok: true, sponsor: adminSponsorView(updated, await store.meetups(s.id)) });
    },
    'record the payment',
  );

export const POST: APIRoute = ({ request, params }) => handleRecordPayment(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
