/** Record a payment made outside Stripe. POST { paidUntil: 'YYYY-MM-DD' } (the first day not paid for) → 200 { ok, sponsor } · 400 · 404. */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../../server/sponsor.ts';
import { recordPayment, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';

export const prerender = false;

export const handleRecordPayment = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      return json(200, { ok: true, sponsor: adminSponsorView(await recordPayment(s, String(body.paidUntil ?? ''), lifecycle)) });
    },
    'record the payment',
  );

export const POST: APIRoute = ({ request, params }) => handleRecordPayment(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
