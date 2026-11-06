/**
 * The signed-in person's membership, for /membership/account.
 *
 * GET /api/membership/me   Authorization: Bearer <Supabase access token>
 *   200 { ok: true, email, member: null | MemberView, canApply }
 *   401 { ok: false, error }   not signed in, or the session expired
 *   503 { ok: false, error }   member accounts are not configured (no Supabase variables)
 *   502 { ok: false, error }   Supabase failed
 *
 * Only what the member may see: no Stripe ids, notes or audit log.
 */
import { canApply, levelInfo, label, supabaseStore, SupabaseUnavailable, type Member, type MemberStore } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { CONTACT_EMAIL, fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { authUser, memberFor } from '../../../server/member-auth.ts';

export const prerender = false;

export interface MemberView {
  name: string;
  organisationName: string | null;
  level: Member['level'];
  levelName: string;
  cycle: Member['cycle'];
  category: Member['category'];
  status: Member['status'];
  statusLabel: string;
  paidUntil: string | null;
  paymentMode: Member['paymentMode'];
  joinedAt: string | null;
}

export const memberView = (m: Member): MemberView => ({
  name: m.name,
  organisationName: m.organisationName,
  level: m.level,
  levelName: levelInfo(m.level).name,
  cycle: m.cycle,
  category: m.category,
  status: m.status,
  statusLabel: label(m.status),
  paidUntil: m.paidUntil,
  paymentMode: m.paymentMode,
  joinedAt: m.joinedAt,
});

export async function handleMe(request: Request, deps: { env?: Env; fetch?: typeof fetch; store?: MemberStore } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  try {
    const user = await authUser(request, env, deps.fetch);
    if (!user) return fail(401, 'Your session has ended. Sign in again.');
    const store = deps.store ?? supabaseStore(env, deps.fetch);
    const member = await memberFor(user, store);
    return json(200, { ok: true, email: user.email, member: member ? memberView(member) : null, canApply: canApply(member?.status ?? null) });
  } catch (cause) {
    if (cause instanceof SupabaseUnavailable) return fail(503, `Member accounts are not available yet. Write to ${CONTACT_EMAIL}.`);
    console.error('[membership] me failed', cause);
    return fail(502, `We couldn’t load your membership. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}

export const GET: APIRoute = ({ request }) => handleMe(request);
export const ALL: APIRoute = () => methodNotAllowed('GET');
