/**
 * One partner record for the admin area.
 *   GET  → { ok, partner, sponsorships: [{ id, companyName, status, tierName }] } (the sponsorships linked to it)
 *   POST { name?, url?, kinds?, tier?, current?, delisted?, description?, blurb?, allowReferrer?, logoBackground? } → { ok, partner }
 */
import { tierInfo } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { parsePartner, partnerAdminRoute, partnerView, type PartnerDeps } from '../../../../../../server/partner-admin.ts';

export const prerender = false;

export const handleAdminPartner = (request: Request, id: string, deps: PartnerDeps = {}) =>
  partnerAdminRoute(
    request,
    deps,
    async ({ partners, store }) => {
      const p = await partners.get(id);
      if (!p) return fail(404, 'No such partner.');
      const linked = (await store.search({ limit: 5000 })).filter((s) => s.partnerId === p.id);
      return json(200, {
        ok: true,
        partner: partnerView(p),
        sponsorships: linked.map((s) => ({ id: s.id, companyName: s.companyName, status: s.status, tierName: tierInfo(s.tier).name })),
      });
    },
    'load the partner',
  );

export const handleUpdatePartner = (request: Request, id: string, deps: PartnerDeps = {}) =>
  partnerAdminRoute(
    request,
    deps,
    async ({ partners, changed }) => {
      if (!(await partners.get(id))) return fail(404, 'No such partner.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the changes as JSON.');
      const parsed = parsePartner(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      await partners.update(id, parsed.value);
      await changed('partner changed');
      return json(200, { ok: true, partner: partnerView((await partners.get(id))!) });
    },
    'save the partner',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminPartner(request, String(params.id ?? ''));
export const POST: APIRoute = ({ request, params }) => handleUpdatePartner(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
