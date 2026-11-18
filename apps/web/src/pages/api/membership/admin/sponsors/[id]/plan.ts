/**
 * Change the plan of an invitation nobody has paid yet (after another call): no confirmation
 * needed, they confirm by paying. Optionally email the invitation again.
 *   POST { tier, cycle, resend?: boolean, message? } → 200 { ok, sponsor, emailed } · 400 · 404 · 409
 */
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, readJsonObject, text } from '../../../../../../server/http.ts';
import { adminSponsorView } from '../../../../../../server/sponsor.ts';
import { changeInvitedPlan, sendInvitation, sponsorAdminRoute, type SponsorAdminDeps } from '../../../../../../server/sponsor-admin.ts';
import { parsePlan } from '../../../../../../server/sponsor-input.ts';

export const prerender = false;

export const handleInvitedPlan = (request: Request, id: string, deps: SponsorAdminDeps = {}) =>
  sponsorAdminRoute(
    request,
    deps,
    async ({ store, lifecycle }) => {
      const s = await store.get(id);
      if (!s) return fail(404, 'No such sponsor.');
      const body = (await readJsonObject(request)) ?? {};
      const plan = parsePlan(body);
      if (!plan.ok) return fail(400, plan.error, { field: plan.field });
      const message = text(body.message, 2000);
      if (message === false) return fail(400, 'Keep the message under 2000 characters, without < or >.', { field: 'message' });
      const updated = await changeInvitedPlan(s, plan.value, lifecycle);
      const emailed = body.resend === true ? await sendInvitation(updated, await store.contacts(s.id), message ?? null, lifecycle) : 0;
      return json(200, { ok: true, sponsor: adminSponsorView(updated, await store.meetups(s.id)), emailed });
    },
    'change the invitation',
  );

export const POST: APIRoute = ({ request, params }) => handleInvitedPlan(request, String(params.id ?? ''));
export const ALL: APIRoute = () => methodNotAllowed('POST');
