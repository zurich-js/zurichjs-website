/**
 * A signed-in person asks to join (docs/v2/MEMBERSHIP.md, phase 3). Nothing
 * is charged: the request waits for an organiser in Slack.
 *
 * POST /api/membership/apply   Authorization: Bearer <Supabase access token>
 *   JSON { kind?: 'person' | 'organisation', name, organisationName?, level, cycle, message?, termsVersion }
 *   termsVersion: the membership terms version the person ticked (must be the current one).
 *   200 { ok: true, member }          the request is in (member: the /me view)
 *   400 { ok: false, error, field? }  invalid fields
 *   401 { ok: false, error }          not signed in
 *   409 { ok: false, error }          already a member, or a request is already open
 *   429 { ok: false, error }          more than 3 requests in 10 minutes
 *   503 / 502                         not configured / Supabase failed
 *
 * The free-text message goes to Slack only: it is not stored, so the database
 * holds no free text about a person (data minimisation, one-year retention).
 * If the Slack card cannot be posted, the organisers get an email instead and
 * `pnpm membership:review` posts the cards for every open request.
 */
import { renderEmail } from '@zurichjs/emails';
import { sendEmail, sendMemberEmail } from '@zurichjs/integrations';
import {
  DuplicateEmail,
  TERMS,
  canApply,
  isCycle,
  isLevel,
  supabaseStore,
  SupabaseUnavailable,
  type Cycle,
  type Level,
  type Member,
  type MemberKind,
  type MemberStore,
} from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, fail, json, methodNotAllowed, readJsonObject, text, type Env } from '../../../server/http.ts';
import { authUser, memberFor } from '../../../server/member-auth.ts';
import { applicationProps, postReviewCard, type MembershipSlack } from '../../../server/membership-review.ts';
import { clientKey, rateLimited } from '../../../server/rateLimit.ts';
import { memberView } from './me.ts';

export const prerender = false;

export interface Application {
  kind: MemberKind;
  name: string;
  organisationName: string | null;
  level: Level;
  cycle: Cycle;
  message?: string;
}

export function parseApplication(body: Record<string, unknown>): { ok: true; data: Application } | { ok: false; error: string; field: string } {
  const kind = body.kind === undefined || body.kind === 'person' ? 'person' : body.kind === 'organisation' ? 'organisation' : null;
  if (!kind) return { ok: false, error: 'Choose a person or an organisation.', field: 'kind' };
  const name = text(body.name, 200);
  if (!name) return { ok: false, error: kind === 'organisation' ? 'Add the name of the person who signs for the organisation.' : 'Add your full name.', field: 'name' };
  const org = text(body.organisationName, 200);
  if (org === false) return { ok: false, error: 'Keep the organisation name under 200 characters, without HTML.', field: 'organisationName' };
  if (kind === 'organisation' && !org) return { ok: false, error: 'Add the organisation’s name.', field: 'organisationName' };
  if (!isLevel(body.level)) return { ok: false, error: 'Choose Basic Member or Supporter.', field: 'level' };
  if (!isCycle(body.cycle)) return { ok: false, error: 'Choose quarterly or yearly.', field: 'cycle' };
  const message = text(body.message, 1000);
  if (message === false) return { ok: false, error: 'Keep the message under 1000 characters, without HTML.', field: 'message' };
  // No declaration to sign: accepting the membership terms (based on the bylaws) is the agreement.
  if (body.termsVersion !== TERMS.version)
    return {
      ok: false,
      error: body.termsVersion ? 'The membership terms changed. Reload the page and accept the current terms.' : 'Accept the membership terms to send your request.',
      field: 'terms',
    };
  return { ok: true, data: { kind, name, organisationName: kind === 'organisation' ? (org as string) : null, level: body.level, cycle: body.cycle, message } };
}

export async function handleApply(
  request: Request,
  deps: { env?: Env; fetch?: typeof fetch; store?: MemberStore; slack?: MembershipSlack; log?: (m: string) => void } = {},
): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  if (rateLimited('membership-apply', clientKey(request), 3, 10 * 60_000)) return fail(429, `Too many requests. Please wait a few minutes, or write to ${CONTACT_EMAIL}.`);
  try {
    const user = await authUser(request, env, deps.fetch);
    if (!user) return fail(401, 'Your session has ended. Sign in again.');
    const body = await readJsonObject(request);
    if (!body) return fail(400, 'Send the form as JSON.');
    const parsed = parseApplication(body);
    if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
    const a = parsed.data;
    const store = deps.store ?? supabaseStore(env, deps.fetch);
    const actor = { kind: 'member', id: user.id } as const;

    const existing = await memberFor(user, store);
    if (existing && !canApply(existing.status))
      return fail(409, existing.status === 'applied' ? 'Your request is already with the organisers.' : 'You already have a membership. See it on your account page.');
    let member: Member;
    try {
      if (existing) {
        await store.update(existing.id, { kind: a.kind, name: a.name, organisationName: a.organisationName, level: a.level, cycle: a.cycle, paymentMode: 'automatic' }, actor);
        member = await store.transition(existing.id, { to: 'applied', actor });
      } else {
        member = await store.create(
          {
            kind: a.kind,
            name: a.name,
            organisationName: a.organisationName,
            email: user.email,
            level: a.level,
            cycle: a.cycle,
            category: 'passive',
            status: 'applied',
            source: 'self_serve',
            joinedAt: null,
            paidUntil: null,
            paymentMode: 'automatic',
            notes: null,
            authUserId: user.id,
          },
          actor,
        );
      }
      await store.acceptTerms(member.id, TERMS.version, actor);
    } catch (cause) {
      // Two tabs submitting at once: the second finds the first.
      if (cause instanceof DuplicateEmail) return fail(409, 'Your request is already with the organisers.');
      throw cause;
    }

    const origin = new URL(request.url).origin;
    const props = applicationProps(member, origin);
    const posted = await postReviewCard(member, a.message, { env, fetch: deps.fetch, log, slack: deps.slack });
    if (!posted) {
      // Nobody would see the request otherwise.
      await sendEmail(
        env,
        `Membership request from ${member.name} (not in Slack)`,
        [
          `The Slack review card could not be posted. Run \`pnpm membership:review\` to post it, then approve or reject in Slack.`,
          '',
          `Member: ${member.id}`,
          `Name: ${member.name}`,
          `Email: ${member.email}`,
          `Membership: ${props.levelName}, ${props.feeLabel}`,
          `Message: ${a.message ?? 'No message'}`,
        ].join('\n'),
        member.email,
        log,
      ).catch((e: Error) => log(`[membership] fallback email failed: ${e.message}`));
    }
    await sendMemberEmail(
      env,
      { to: member.email, ...renderEmail('application-received', props) },
      { idempotencyKey: `member-applied:${member.id}:${member.updatedAt}`, log, fetch: deps.fetch },
    ).catch((e: Error) => log(`[membership] confirmation to ${member.id} failed: ${e.message}`));
    return json(200, { ok: true, member: memberView(member) });
  } catch (cause) {
    if (cause instanceof SupabaseUnavailable) return fail(503, `Member accounts are not available yet. Write to ${CONTACT_EMAIL}.`);
    console.error('[membership] apply failed', cause);
    return fail(502, `We couldn’t send your request. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}

export const POST: APIRoute = ({ request }) => handleApply(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
