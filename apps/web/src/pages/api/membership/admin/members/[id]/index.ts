/**
 * One member for the admin area.
 *   GET → { ok, member, termsVersion, certificates, events }: details, accepted terms, certificates, audit log.
 *   PATCH { birthDate?, street?, postalCode?, city?, phone? } → { ok, member }: the member register
 *     details, backfilled by the board (owner, 19th November 2026). Only the fields sent change;
 *     an empty string clears one. · 400 { error, field }
 */
import { CONTACT_FIELDS, parseContactDetails, type ContactDetails } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
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

export const handleAdminMemberDetails = (request: Request, id: string, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) => {
      const m = await store.get(id);
      if (!m) return fail(404, 'No such member.');
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the details as JSON.');
      const sent = CONTACT_FIELDS.filter((k) => k in body);
      if (!sent.length) return fail(400, 'Send at least one of the details.');
      // An organisation has no date of birth; saying so beats dropping it silently.
      if (m.kind === 'organisation' && typeof body.birthDate === 'string' && body.birthDate.trim())
        return fail(400, 'An organisation has no date of birth.', { field: 'birthDate' });
      const parsed = parseContactDetails(body, { kind: m.kind, required: false });
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const patch: Partial<ContactDetails> = Object.fromEntries(sent.map((k) => [k, parsed.value[k]]));
      const updated = await store.update(m.id, patch, { kind: 'board', id: 'admin' });
      return json(200, { ok: true, member: adminMember(updated) });
    },
    'save the details',
  );

export const GET: APIRoute = ({ request, params }) => handleAdminMember(request, String(params.id ?? ''));
export const PATCH: APIRoute = ({ request, params }) => handleAdminMemberDetails(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('GET, PATCH');
