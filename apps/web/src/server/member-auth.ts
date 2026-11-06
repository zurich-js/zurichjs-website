/**
 * Who is calling a membership API: the Supabase access token from the
 * Authorization header, checked with Supabase (`GET /auth/v1/user`). This
 * works whatever key type the project signs with; one call per request is
 * fine at membership volumes.
 *
 * Then the member record: by auth user, or on the first sign-in by the
 * (confirmed) email, which links imported members to their account.
 */
import { supabaseConfig, type Member, type MemberStore } from '@zurichjs/membership';
import type { Env } from './http.ts';

export interface AuthUser {
  id: string;
  email: string;
}

type Fetch = typeof fetch;

export function bearer(request: Request): string | null {
  const h = request.headers.get('authorization') ?? '';
  const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(h);
  return m ? m[1]! : null;
}

/** The signed-in user, or null when the token is missing, expired or not confirmed. Throws when Supabase cannot be reached. */
export async function authUser(request: Request, env: Env, fetchImpl: Fetch = fetch): Promise<AuthUser | null> {
  const token = bearer(request);
  if (!token) return null;
  const { url, key } = supabaseConfig(env);
  const res = await fetchImpl(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`Supabase auth HTTP ${res.status}`);
  const u = (await res.json()) as { id?: string; email?: string; email_confirmed_at?: string | null };
  if (!u.id || !u.email || !u.email_confirmed_at) return null;
  return { id: u.id, email: u.email.toLowerCase() };
}

/**
 * The member for this user. A record without an account yet (imported, or
 * applied before signing in) is linked the first time its email signs in.
 * A record already linked to another account is never taken over.
 */
export async function memberFor(user: AuthUser, store: MemberStore): Promise<Member | null> {
  const linked = await store.byAuthUser(user.id);
  if (linked) return linked;
  const byEmail = await store.byEmail(user.email);
  if (!byEmail || byEmail.authUserId) return null;
  return store.update(byEmail.id, { authUserId: user.id }, { kind: 'member', id: user.id });
}
