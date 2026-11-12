/**
 * Invite someone who asked to join (server/membership-invite.ts).
 *   POST { kind, name, organisationName?, email, level, cycle, notes? }
 *     → 200 { ok, member, result: 'invited' | 'reinvited', emailed }
 *     · 400 { error, field } · 409 already a member
 */
import type { APIRoute } from 'astro';
import { adminRoute, type AdminDeps } from '../../../../server/admin-route.ts';
import { adminMember } from '../../../../server/admin-views.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../../server/http.ts';
import { inviteMember, type InviteDeps } from '../../../../server/membership-invite.ts';
import { parseMemberDetails } from '../../../../server/membership-manual.ts';

export const prerender = false;

export const handleInvite = (request: Request, deps: AdminDeps & Pick<InviteDeps, 'slack'> = {}) =>
  adminRoute(
    request,
    deps,
    async ({ env, store, origin }) => {
      const body = await readJsonObject(request);
      if (!body) return fail(400, 'Send the invitation as JSON.');
      const parsed = parseMemberDetails(body);
      if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
      const r = await inviteMember(parsed.value, {
        env,
        store,
        origin,
        fetch: deps.fetch,
        slack: deps.slack,
        log: deps.log,
        now: deps.now === undefined ? undefined : () => new Date(deps.now!),
      });
      if (r.result === 'member') return fail(409, `${r.member.email} is already a member (${r.member.name}).`, { field: 'email', memberId: r.member.id });
      return json(200, { ok: true, member: adminMember(r.member), result: r.result, emailed: r.emailed });
    },
    'send the invitation',
  );

export const POST: APIRoute = ({ request }) => handleInvite(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
