/**
 * Admin sign-in (/membership/admin). POST { password } → sets the admin session
 * cookie. At most 10 failed attempts per IP in 15 minutes (429 after that).
 *   200 { ok: true } · 401 wrong password · 403 not from this site · 429 · 503 not set up
 */
import type { APIRoute } from 'astro';
import {
  FAILURE_WINDOW_MS,
  MAX_FAILURES,
  adminPassword,
  clientIp,
  databaseAttempts,
  sameOrigin,
  sessionCookie,
  signSession,
  type LoginAttempts,
} from '../../../../server/admin-auth.ts';
import { fail, json, methodNotAllowed, readJsonObject, type Env } from '../../../../server/http.ts';
import { MembershipUnavailable, membershipDb } from '../../../../server/membership-db.ts';
import { timingSafeEqual } from 'node:crypto';

export const prerender = false;

export async function handleAdminLogin(request: Request, deps: { env?: Env; attempts?: LoginAttempts; now?: number } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const password = adminPassword(env);
  if (!password) return fail(503, 'The admin area is not set up yet (MEMBERSHIP_ADMIN_PASSWORD, 16+ characters).');
  if (!sameOrigin(request)) return fail(403, 'Refused: the request did not come from this site.');
  let attempts: LoginAttempts;
  try {
    attempts = deps.attempts ?? databaseAttempts(membershipDb(env));
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'The membership database is not configured.');
    throw cause;
  }
  const ip = clientIp(request);
  const now = deps.now ?? Date.now();
  if ((await attempts.failures(ip, now - FAILURE_WINDOW_MS)) >= MAX_FAILURES) return fail(429, 'Too many wrong passwords. Wait 15 minutes.');
  const body = await readJsonObject(request);
  const given = typeof body?.password === 'string' ? body.password : '';
  const a = Buffer.from(given);
  const b = Buffer.from(password);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await attempts.fail(ip);
    return fail(401, 'Wrong password.');
  }
  return json(200, { ok: true }, { 'set-cookie': sessionCookie(request, signSession(password, now)) });
}

export const POST: APIRoute = ({ request }) => handleAdminLogin(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
