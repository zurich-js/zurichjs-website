/**
 * Better Auth's routes (sign in by email link, verify, session, sign out),
 * mounted at /api/auth/* as its Astro integration describes. Configuration:
 * src/server/auth.ts.
 */
import type { APIRoute } from 'astro';
import { fail } from '../../../server/http.ts';
import { auth } from '../../../server/auth.ts';
import { MembershipUnavailable } from '../../../server/membership-db.ts';

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  try {
    return await auth().handler(request);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Member accounts are not available yet. Write to hello@zurichjs.com.');
    console.error('[auth] failed', cause);
    return fail(500, 'Sign-in failed. Try again in a minute.');
  }
};
