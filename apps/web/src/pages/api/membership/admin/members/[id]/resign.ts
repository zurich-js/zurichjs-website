/**
 * The board records a resignation for a member who resigned to it directly (by email, in person),
 * the same as resigning on the account page (owner, 11th November 2026): renewal stops, the member
 * gets their written copy, the board the Slack card and email. Reasons are optional.
 *
 * POST /api/membership/admin/members/:id/resign   { reasons?: string[], note?: string }
 *   200 { ok: true, member } · 404 · 409 not a running membership · 401 · 403 · 503
 */
import type { APIRoute } from 'astro';
import { parseResignReasons } from '../../../../../../lib/membership.ts';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { startResignation } from '../../../../../../server/membership-resignation.ts';
import type { MembershipSlack } from '../../../../../../server/membership-slack.ts';

export const prerender = false;

export const handleAdminResign = (request: Request, id: string, deps: AdminDeps & { slack?: MembershipSlack } = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const member = await store.get(id);
      if (!member) return fail(404, 'No such member.');
      const why = parseResignReasons(await readJsonObject(request).catch(() => null));
      const r = await startResignation(member, { kind: 'board', id: 'admin' }, why, { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log });
      if (r.result === 'not_member') return fail(409, 'Only a running membership can be resigned.');
      if (r.result === 'changed') return fail(409, 'The membership changed in the meantime. Reload.');
      return json(200, { ok: true, member: adminMember(r.member) });
    },
    'record the resignation',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminResign(request, params.id ?? '');
export const ALL: APIRoute = () => methodNotAllowed('POST');
