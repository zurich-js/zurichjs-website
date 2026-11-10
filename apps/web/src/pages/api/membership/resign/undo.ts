/**
 * The member undoes their resignation while the membership still runs (owner,
 * 10th November 2026): back to the status they had before. If the board had already
 * confirmed it, the subscription renews again. The member and the board are told.
 *
 * POST /api/membership/resign/undo   (session cookie)
 *   200 { ok: true, member } · 409 not resigning · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../../server/http.ts';
import { memberView } from '../../../../server/membership.ts';
import { withdrawResignation } from '../../../../server/membership-resignation.ts';
import { signedIn, type RouteDeps } from '../../../../server/membership-route.ts';

export const prerender = false;

export const handleUndoResignation = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ user, member, store, origin, env }) => {
      if (!member || member.status !== 'resigning') return fail(409, 'Your membership is not ending, so there is nothing to resubscribe to.');
      const r = await withdrawResignation(member.id, { kind: 'member', id: user.id }, { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log });
      if (r.result !== 'withdrawn') return fail(409, 'Your membership changed in the meantime. Reload the page.');
      return json(200, { ok: true, member: memberView(r.member) });
    },
    'resubscribe',
  );

export const POST: APIRoute = ({ request }) => handleUndoResignation(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
