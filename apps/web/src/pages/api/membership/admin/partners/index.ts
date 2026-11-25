/**
 * Partner records for the admin area (server/partner-admin.ts).
 *   GET  → { ok, partners: [PartnerView] } (by name)
 *   POST { name, id?, url?, kinds?, tier?, current?, delisted?, description?, blurb?, allowReferrer?, logoBackground? }
 *        → 200 { ok, partner } · 400 { error, field } · 409 the id is taken
 */
import { DuplicatePartner } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../server/http.ts';
import { parseNewPartner, partnerAdminRoute, partnerView, type PartnerDeps } from '../../../../../server/partner-admin.ts';

export const prerender = false;

export const handleAdminPartners = (request: Request, deps: PartnerDeps = {}) =>
  partnerAdminRoute(request, deps, async ({ partners }) => json(200, { ok: true, partners: (await partners.list()).map(partnerView) }), 'load the partners');

export const handleAddPartner = (request: Request, deps: PartnerDeps = {}) =>
  partnerAdminRoute(
    request,
    deps,
    async ({ partners, changed }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the partner as JSON.');
      const parsed = parseNewPartner(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      try {
        const created = await partners.create(parsed.value);
        await changed('partner added');
        return json(200, { ok: true, partner: partnerView({ ...created, logos: {} }) });
      } catch (cause) {
        if (cause instanceof DuplicatePartner)
          return fail(409, `There is already a partner with the id ${parsed.value.id}. Open that one, or give this one another id.`, { field: 'id' });
        throw cause;
      }
    },
    'add the partner',
  );

export const GET: APIRoute = ({ request }) => handleAdminPartners(request);
export const POST: APIRoute = ({ request }) => handleAddPartner(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
