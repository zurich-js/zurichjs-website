/**
 * Plumbing for the admin API (/api/membership/admin/*): configured, signed in
 * (cookie or Bearer password), same-origin for writes; errors as readable
 * sentences. Dependencies are injectable for tests.
 */
import type { MemberStore } from '@zurichjs/membership';
import { siteOrigin } from './auth.ts';
import { adminPassword, isAdmin, sameOrigin } from './admin-auth.ts';
import { fail, type Env } from './http.ts';
import { MembershipUnavailable, memberStore } from './membership-db.ts';
import { StripeUnavailable } from './stripe.ts';

export interface AdminDeps {
  env?: Env;
  store?: MemberStore;
  fetch?: typeof fetch;
  log?: (m: string) => void;
  now?: number;
}

export interface AdminCtx {
  env: Env;
  store: MemberStore;
  origin: string;
}

export async function adminRoute(request: Request, deps: AdminDeps, fn: (ctx: AdminCtx) => Promise<Response>, what: string): Promise<Response> {
  const env = deps.env ?? process.env;
  if (!adminPassword(env)) return fail(503, 'The admin area is not set up yet (MEMBERSHIP_ADMIN_PASSWORD, 16+ characters).');
  if (!isAdmin(request, env, deps.now)) return fail(401, 'Sign in to the admin area.');
  if (request.method !== 'GET' && !sameOrigin(request)) return fail(403, 'Refused: the request did not come from this site.');
  try {
    return await fn({ env, store: deps.store ?? memberStore(env), origin: siteOrigin(env) });
  } catch (cause) {
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) return fail(503, `Not configured: ${(cause as Error).message}`);
    console.error(`[membership-admin] ${what} failed`, cause);
    return fail(502, `Could not ${what}. Try again; details are in the function log.`);
  }
}
