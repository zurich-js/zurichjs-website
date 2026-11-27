/**
 * Members for the admin area.
 *   GET ?q=&status=   → { ok, members, truncated, counts } (newest first, at most LIST_LIMIT, `truncated` when more
 *                       match; `counts` per status over every member, unfiltered lists only)
 *   POST { kind, name, organisationName?, email, level, cycle, startMonth: 'YYYY-MM', category?, notes?, sendEmail? }
 *     adds a member who paid manually, cash/bank (server/membership-manual.ts) → 200 { ok, member, certificate, emailed }
 *     · 400 { error, field } · 409 there is a record for that email (not one to record again)
 */
import { isMember, label, type Status } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../server/admin-route.ts';
import { adminMember, LIST_LIMIT } from '../../../../../server/admin-views.ts';
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
      const found = await store.search({ q, status, limit: LIST_LIMIT + 1 });
      // Every member, counted in its own query: a write in between can make it disagree with the list.
      const all = q || status ? null : await store.statusCounts();
      const counts = all && {
        members: STATUSES.filter(isMember).reduce((n, s) => n + (all[s] ?? 0), 0),
        ...Object.fromEntries(STATUSES.map((s) => [s, all[s] ?? 0])),
      };
      return json(200, { ok: true, members: found.slice(0, LIST_LIMIT).map(adminMember), truncated: found.length > LIST_LIMIT, counts });
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
      if (r.result === 'exists')
        return fail(409, `There is already a record for ${r.member.email} (${r.member.name}, ${label(r.member.status)}). Open it to see or change it.`, {
          field: 'email',
          memberId: r.member.id,
        });
      return json(200, { ok: true, member: adminMember(r.member), certificate: { number: r.certificate.number }, emailed: r.emailed });
    },
    'add the member',
  );

export const GET: APIRoute = ({ request }) => handleAdminMembers(request);
export const POST: APIRoute = ({ request }) => handleAddMember(request);
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
