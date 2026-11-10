/**
 * A member changes level or cycle (owner, 11th November 2026). It only applies from the next
 * renewal; nothing is charged now (server/membership-stripe.ts, "plan changes").
 *
 *   paying with Stripe            the switch is scheduled for the renewal date; choosing the current
 *                                 plan again drops a pending switch
 *   no Stripe subscription        refused (owner, 11th November 2026): members paying manually
 *                                 (cash/bank) set up automatic payment first
 *
 * POST /api/membership/plan   (session cookie)   { level, cycle }
 *   200 { ok: true, member, pendingPlan: { level, cycle, from } | null } · 400 · 409 · 401 · 503 · 502
 */
import { isCycle, isLevel, levelInfo } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { longDate } from '../../../server/dates.ts';
import { fail, json, methodNotAllowed, readJsonObject } from '../../../server/http.ts';
import { memberView } from '../../../server/membership.ts';
import { notify, who } from '../../../server/membership-slack.ts';
import { cancelPlanChange, pendingPlanChange, schedulePlanChange } from '../../../server/membership-stripe.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';

export const prerender = false;

export const handlePlan = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ member, env }) => {
      const body = await readJsonObject(request);
      const level = body?.level;
      const cycle = body?.cycle;
      if (!isLevel(level) || !isCycle(cycle)) return fail(400, 'Choose a membership level and quarterly or yearly.');
      if (!member || member.status === 'ended') return fail(409, 'There is no membership to change.');
      if (member.status === 'resigning') return fail(409, 'Your membership is ending. Resubscribe first to change it.');
      const stripe = { env, fetch: deps.fetch };
      const log = deps.log ?? console.log;

      if (!member.stripeSubscriptionId) return fail(409, 'Set up automatic payment first; then you can change your membership level or billing.');

      const plan = `${levelInfo(level).name}, ${cycle}`;
      if (level === member.level && cycle === member.cycle) {
        if (await pendingPlanChange(member.stripeSubscriptionId, stripe)) {
          await cancelPlanChange(member.stripeSubscriptionId, stripe);
          await notify(`:leftwards_arrow_with_hook: ${who(member)} kept ${plan}; the pending switch is cancelled.`, { env, slack: deps.slack, fetch: deps.fetch, log });
        }
        return json(200, { ok: true, member: memberView(member), pendingPlan: null });
      }
      const { from } = await schedulePlanChange(member.stripeSubscriptionId, { level, cycle }, stripe);
      await notify(`:arrows_counterclockwise: ${who(member)} switches to ${plan} from ${longDate(from)} (their next renewal).`, { env, slack: deps.slack, fetch: deps.fetch, log });
      return json(200, { ok: true, member: memberView(member), pendingPlan: { level, cycle, from } });
    },
    'change your membership',
  );

export const POST: APIRoute = ({ request }) => handlePlan(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
