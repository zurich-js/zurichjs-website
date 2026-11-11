/**
 * Undoes a member's resignation from the admin area, for a member who asked the board
 * (owner, 10th November 2026). The same as the member's own undo: back to the status
 * they had before, and a confirmed resignation's scheduled end is taken back in Stripe.
 * POST → 200 { ok, member } · 409 not resigning · 404.
 */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../../../server/admin-route.ts';
import { adminMember } from '../../../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed } from '../../../../../../server/http.ts';
import { withdrawResignation } from '../../../../../../server/membership-resignation.ts';

export const prerender = false;

export const handleAdminUndoResignation = (request: Request, id: string, deps: AdminDeps = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const r = await withdrawResignation(id, { kind: 'board', id: 'admin' }, { env, store, origin, fetch: deps.fetch, log: deps.log });
      if (r.result === 'not_found') return fail(404, 'No such member.');
      if (r.result === 'not_resigning') return fail(409, `This member is not resigning (status: ${r.member.status.replace('_', ' ')}).`);
      return json(200, { ok: true, member: adminMember(r.member), emailFailed: r.emailFailed });
    },
    'undo the resignation',
  );

export const POST: APIRoute = ({ request, params }) => handleAdminUndoResignation(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
