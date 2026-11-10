/**
 * Members for the admin area.
 *   GET ?q=&status=   → { ok, members, counts } (newest first, at most 500)
 *   POST { kind, name, organisationName?, email, level, cycle, startMonth: 'YYYY-MM', category?, notes?, sendEmail? }
 *     adds a member who paid manually, cash/bank (server/membership-manual.ts) → 200 { ok, member, certificate, emailed }
 *     · 400 { error, field } · 409 already a member
 */
import { isMember, type Status } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../server/http.ts';
import { addManualMember, parseManualMember, type ManualDeps } from '../../../../../server/membership-manual.ts';

export const prerender = false;

const STATUSES: Status[] = ['pending', 'active', 'past_due', 'imported_manual', 'resigning', 'ended'];

export const handleAdminMembers = (request: Request, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ store }) => {
      const url = new URL(request.url);
      const q = url.searchParams.get('q')?.trim().slice(0, 200) || undefined;
      const status = STATUSES.find((s) => s === url.searchParams.get('status'));
      const members = await store.search({ q, status, limit: 500 });
      // Totals for the overview, only when the list is not filtered.
      const counts =
        q || status
          ? null
          : { members: members.filter((m) => isMember(m.status)).length, ...Object.fromEntries(STATUSES.map((s) => [s, members.filter((m) => m.status === s).length])) };
      return json(200, { ok: true, members: members.map(adminMember), counts });
    },
    'load the members',
  );

export const handleAddMember = (request: Request, deps: AdminDeps & Pick<ManualDeps, 'slack' | 'signature'> = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the member as JSON.');
      const parsed = parseManualMember(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const r = await addManualMember(parsed.value, { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log, signature: deps.signature });
      if (r.result === 'exists') return fail(409, `${r.member.email} is already a member (${r.member.name}).`, { field: 'email', memberId: r.member.id });
      return json(200, { ok: true, member: adminMember(r.member), certificate: { number: r.certificate.number }, emailed: r.emailed });
    },
    'add the member',
  );

export const GET: APIRoute = ({ request }) => handleAdminMembers(request);
export const POST: APIRoute = ({ request }) => handleAddMember(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
