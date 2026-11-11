/**
 * Plumbing for the membership API routes: who is signed in, which member that
 * is, and one place that turns "not configured" into a 503 and failures into a
 * 502 with a sentence a person can read. Every dependency is injectable, so the
 * handlers are tested without a database, Stripe or Slack.
 */
import type { Member, MemberStore } from '@zurichjs/membership';
import { sessionUser, siteOrigin, type AuthUser } from './auth.ts';
import { CONTACT_EMAIL, fail, type Env } from './http.ts';
import { memberFor } from './member-auth.ts';
import { MembershipUnavailable, memberStore } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { StripeUnavailable } from './stripe.ts';

export interface RouteDeps {
  env?: Env;
  store?: MemberStore;
  session?: (request: Request) => Promise<AuthUser | null>;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: () => Date;
  log?: (m: string) => void;
  signature?: () => Promise<Uint8Array | null>;
}

export interface Ctx {
  env: Env;
  store: MemberStore;
  user: AuthUser;
  member: Member | null;
  origin: string;
  deps: RouteDeps;
}

/** Runs `fn` for a signed-in user, with their member record (or null). */
export async function signedIn(request: Request, deps: RouteDeps, fn: (ctx: Ctx) => Promise<Response>, what = 'that'): Promise<Response> {
  const env = deps.env ?? process.env;
  try {
    const user = await (deps.session ?? ((r: Request) => sessionUser(r, env)))(request);
    if (!user) return fail(401, 'Your session has ended. Sign in again.');
    const store = deps.store ?? memberStore(env);
    const member = await memberFor(user, store);
    return await fn({ env, store, user, member, origin: siteOrigin(env), deps });
  } catch (cause) {
    if (cause instanceof MembershipUnavailable || cause instanceof StripeUnavailable) {
      console.error('[membership] not configured:', (cause as Error).message);
      return fail(503, `Member accounts are not available yet. Write to ${CONTACT_EMAIL}.`);
    }
    console.error(`[membership] ${what} failed`, cause);
    return fail(502, `We couldn’t ${what} right now. Try again, or write to ${CONTACT_EMAIL}.`);
  }
}
