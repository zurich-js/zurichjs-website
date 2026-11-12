/**
 * Confirms a member's resignation from the admin area (the same as Slack's
 * button). POST → 200 { ok, result } · 409 not resigning or dues open · 404.
 */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed } from '../../../../../../server/http.ts';
import { confirmResignation } from '../../../../../../server/membership-resignation.ts';
import { notify, who } from '../../../../../../server/membership-slack.ts';

export const prerender = false;

export const handleAdminConfirmResignation = (request: Request, id: string, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const r = await confirmResignation(id, 'admin', { env, store, origin, fetch: deps.fetch, log: deps.log, reference: `admin-${new Date().toISOString().slice(0, 16)}` });
      if (r.result === 'not_found') return fail(404, 'No such member.');
      if (r.result === 'not_resigning') return fail(409, `This member is not resigning (status: ${r.member.status.replace('_', ' ')}).`);
      if (r.result === 'already_confirmed') return fail(409, 'This resignation is already confirmed.');
      if (r.result === 'open_dues')
        return fail(409, `${r.member.name} has ${r.dues} open invoice${r.dues === 1 ? '' : 's'}. Under the bylaws the resignation takes effect once paid.`);
      await notify(`:white_check_mark: Resignation confirmed in the admin area: ${who(r.member)}.${r.lastPaidDay ? ` Ends ${r.lastPaidDay}.` : ''}`, {
        env,
        fetch: deps.fetch,
        log: deps.log,
      });
      return json(200, { ok: true, member: adminMember((await store.get(id)) ?? r.member), lastPaidDay: r.lastPaidDay, emailFailed: r.emailFailed });
    },
    'confirm the resignation',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminConfirmResignation(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
