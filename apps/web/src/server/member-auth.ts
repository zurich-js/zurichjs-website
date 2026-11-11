/**
 * The signed-in member for a membership API request: the Better Auth session
 * (src/server/auth.ts), then the member record, by user or, on the first
 * sign-in, by the (verified) email, which links imported members to their
 * account.
 */
import type { Member, MemberStore } from '@zurichjs/membership';
import type { AuthUser } from './auth.ts';

export type { AuthUser };

/**
 * The member for this user. A record without an account yet (imported) is
 * linked the first time its email signs in. A record already linked to another
 * account is never taken over.
 */
export async function memberFor(user: AuthUser, store: MemberStore): Promise<Member | null> {
  const linked = await store.byUser(user.id);
  if (linked) return linked;
  const byEmail = await store.byEmail(user.email);
  if (!byEmail || byEmail.userId) return null;
  return store.update(byEmail.id, { userId: user.id }, { kind: 'member', id: user.id });
}
