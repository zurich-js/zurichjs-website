/** One member for the admin area: details, accepted terms, certificates, audit log. GET → { ok, member, ... }. */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed } from '../../../../../../server/http.ts';
import { certificateView } from '../../../../../../server/membership.ts';

export const prerender = false;

export const handleAdminMember = (request: Request, id: string, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) => {
      const m = await store.get(id);
      if (!m) return fail(404, 'No such member.');
      const [terms, certificates, events] = await Promise.all([store.acceptedTerms(m.id), store.certificates(m.id), store.events(m.id)]);
      return json(200, { ok: true, member: adminMember(m), termsVersion: terms, certificates: certificates.map(certificateView), events: events.reverse() });
    },
    'load the member',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminMember(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET');
