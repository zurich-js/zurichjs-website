/**
 * The member resigns (bylaws Art. 5: at any time, in writing to the board,
 * provided no dues are open). A resignation from the account counts as in
 * writing (owner, 6th November 2026); the member gets an email copy. The board
 * hears in Slack (with the Confirm button) and by email to hello@zurichjs.com,
 * confirms it, and the membership ends with the paid period. Undo:
 * /api/membership/resign/undo.
 *
 * Why they leave (owner, 10th November 2026): the body may carry { reasons, note } from the
 * account page. It is recorded and passed to the board, but never required: a resignation
 * without a reason is just as valid (bylaws Art. 5, Swiss Civil Code Art. 70).
 *
 * POST /api/membership/resign   (session cookie)  { reasons?: string[], note?: string }
 *   200 { ok: true, member } · 409 nothing to resign from · 401 · 503 · 502
 */
import type { APIRoute } from 'astro';
import { parseResignReasons } from '../../../lib/membership.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { memberView } from '../../../server/membership.ts';
import { startResignation } from '../../../server/membership-resignation.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';

export const prerender = false;

export const handleResign = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ user, member, store, origin, env }) => {
      if (!member) return fail(409, 'There is no membership to resign from.');
      const why = parseResignReasons(await readJsonObject(request.clone()).catch(() => null));
      const r = await startResignation(member, { kind: 'member', id: user.id }, why, { env, store, origin, fetch: deps.fetch, slack: deps.slack, log: deps.log });
      if (r.result === 'not_member') return fail(409, 'There is no membership to resign from.');
      if (r.result === 'changed') return fail(409, 'Your membership changed in the meantime. Reload the page.');
      return json(200, { ok: true, member: memberView(r.member) });
    },
    'send your resignation',
  );

export const POST: APIRoute = ({ request }) => handleResign(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
