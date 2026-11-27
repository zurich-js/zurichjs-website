/**
 * The board changes a member's email (server/membership-email.ts).
 *
 * POST /api/membership/admin/members/:id/email   { email }
 *   200 { ok, member, stripeUpdated, notified: { previous, next } } · 400 { error, field } · 404
 *   409 another member has that email · 401 · 403 · 503
 */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../../../server/http.ts';
import { changeMemberEmail } from '../../../../../../server/membership-email.ts';
import type { MembershipSlack } from '../../../../../../server/membership-slack.ts';

export const prerender = false;

export const handleChangeEmail = (request: Request, id: string, deps: AdminDeps & { slack?: MembershipSlack } = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const body = await readJsonObject(request);
      const r = await changeMemberEmail(id, body?.email, { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log });
      if (r.result === 'not_found') return fail(404, 'No such member.');
      if (r.result === 'invalid') return fail(400, r.error, { field: 'email' });
      if (r.result === 'taken') return fail(409, 'Another member has that email. Each email belongs to one member.', { field: 'email' });
      return json(200, { ok: true, member: adminMember(r.member), stripeUpdated: r.stripeUpdated, notified: r.notified });
    },
    'change the email',
  );

export const POST: APIRoute = ({ request, params }) => handleChangeEmail(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
