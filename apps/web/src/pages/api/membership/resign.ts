/**
 * The member resigns (bylaws Art. 5: at any time, in writing to the board,
 * provided no dues are open). A resignation from the account counts as in
 * writing (owner, 6th November 2026); the member gets an email copy. The board
 * confirms it in Slack, and the membership ends with the paid period.
 *
 * POST /api/membership/resign   (session cookie)
 *   200 { ok: true, member } · 409 nothing to resign from · 401 · 503 · 502
 */
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { TransitionError } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed } from '../../../server/http.ts';
import { memberView, membershipProps } from '../../../server/membership.ts';
import { membershipSlack, notify, resignationCard } from '../../../server/membership-slack.ts';
import { openInvoices } from '../../../server/membership-stripe.ts';
import { signedIn, type RouteDeps } from '../../../server/membership-route.ts';

export const prerender = false;

export const handleResign = (request: Request, deps: RouteDeps = {}) =>
  signedIn(
    request,
    deps,
    async ({ user, member, store, origin, env }) => {
      if (!member || !['active', 'past_due', 'imported_manual'].includes(member.status)) return fail(409, 'There is no membership to resign from.');
      const log = deps.log ?? console.log;
      let updated;
      try {
        updated = await store.transition(member.id, { from: member.status, to: 'resigning', actor: { kind: 'member', id: user.id } });
      } catch (cause) {
        if (cause instanceof TransitionError) return fail(409, 'Your membership changed in the meantime. Reload the page.');
        throw cause;
      }
      const dues = await openInvoices(updated, { env, fetch: deps.fetch }).catch(() => 0);
      const card = resignationCard(updated, dues);
      try {
        await (deps.slack ?? membershipSlack(env, deps.fetch)).post(card.text, card.blocks);
      } catch (e) {
        log(`[membership] resignation card for ${updated.id} not posted: ${(e as Error).message}`);
        await notify(`Resignation from ${updated.name} (${updated.email}) could not be posted with its button. Confirm it by hand.`, {
          env,
          slack: deps.slack,
          fetch: deps.fetch,
          log,
        });
      }
      const email = renderEmail('resignation-received', { ...membershipProps(updated, origin), openDues: dues > 0 });
      await sendMemberEmail(env, { to: updated.email, ...email }, { idempotencyKey: `member-resignation:${updated.id}:${updated.updatedAt}`, log, fetch: deps.fetch }).catch(
        (e: Error) => log(`[membership] resignation copy to ${updated.id} failed: ${e.message}`),
      );
      return json(200, { ok: true, member: memberView(updated) });
    },
    'send your resignation',
  );

export const POST: APIRoute = ({ request }) => handleResign(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
