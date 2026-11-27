import { renderEmail } from '@zurichjs/emails';
import { tryMembershipNotices } from './membership-delivery.ts';
import { DuplicateEmail, normaliseEmail, type Member, type MemberStore } from '@zurichjs/membership';
import { isEmail, type Env } from './http.ts';
import { membershipProps } from './membership.ts';
import { who, type MembershipSlack } from './membership-slack.ts';

export interface EmailChangeDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: (m: string) => void;
}

export type EmailChangeResult =
  | { result: 'changed'; member: Member; stripeUpdated: boolean; notified: { previous: boolean; next: boolean } }
  | { result: 'invalid'; error: string }
  | { result: 'taken' }
  | { result: 'not_found' };

export async function changeMemberEmail(memberId: string, input: unknown, deps: EmailChangeDeps): Promise<EmailChangeResult> {
  const { store } = deps;
  const email = normaliseEmail(typeof input === 'string' ? input : '');
  if (!isEmail(email)) return { result: 'invalid', error: 'Enter an email like name@example.com.' };
  const operation = `email-change:${memberId}`;
  let change;
  try {
    change = await store.transaction(async (tx) => {
      const before = await tx.get(memberId);
      if (!before) return { result: 'not_found' } as const;
      if (before.email === email) {
        const last = await tx.lastEmailChange(memberId);
        if (!last) return { result: 'invalid', error: 'That is their email already.' } as const;
        return { result: 'changed', member: before, version: last } as const;
      }
      const member = await tx.changeEmail(memberId, email, { kind: 'board', id: 'admin' });
      const change = await tx.lastEmailChange(memberId);
      if (!change) throw new Error('Missing membership email change history.');
      const version = change;
      if (member.stripeCustomerId) await tx.enqueue(memberId, operation, `customer:${memberId}:${version}`, { kind: 'billing-email', version, email });
      for (const which of ['previous', 'next'] as const) {
        const rendered = renderEmail('membership-email-changed', { ...membershipProps(member, deps.origin), previousEmail: before.email, newEmail: email, to: which });
        await tx.enqueue(memberId, operation, `${which}:${memberId}:${version}`, { kind: 'email', to: which === 'previous' ? before.email : email, ...rendered });
      }
      await tx.enqueue(memberId, operation, `board:${memberId}:${version}`, {
        kind: 'board',
        text: `:email: Email changed by the board: ${who(member)} (was ${before.email}). They sign in with the new address.`,
      });
      return { result: 'changed', member, version } as const;
    });
  } catch (error) {
    if (error instanceof DuplicateEmail) return { result: 'taken' };
    throw error;
  }
  if (change.result !== 'changed') return change;
  const pending = new Set((await tryMembershipNotices(operation, deps)).map((d) => d.key));
  const sent = (purpose: string) => !pending.has(`${purpose}:${memberId}:${change.version}`);
  return { result: 'changed', member: change.member, stripeUpdated: sent('customer'), notified: { previous: sent('previous'), next: sent('next') } };
}
