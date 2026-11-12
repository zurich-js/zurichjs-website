/**
 * Inviting someone who asked to join, from the admin area (owner, 12th November 2026).
 * The board chooses the level and cycle they asked for, and they get an email to finish
 * joining online: sign in with that email, accept the membership terms, pay with Stripe
 * (automatic payment from the start). Nothing is charged until they do.
 *
 *   1. A `pending` member record (source `invited`) holds who they are and the choice. Their
 *      first sign-in links it by email (member-auth.ts), and the account page opens on
 *      "Finish joining" with everything filled in (MemberJoin.tsx). The first payment makes
 *      them a member (Stripe webhook), as for anyone who joins online.
 *   2. Inviting again (someone still pending, or whose membership ended) updates the choice
 *      and sends the email again. Someone who is a member already is refused.
 *   3. The board gets a Slack note.
 */
import { DuplicateEmail, canJoin, levelInfo, type Member, type MemberStore } from '@zurichjs/membership';
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { CYCLES } from '../lib/membership.ts';
import type { Env } from './http.ts';
import type { MemberDetails } from './membership-manual.ts';
import { accountUrl, membershipProps } from './membership.ts';
import { notify, who, type MembershipSlack } from './membership-slack.ts';

export interface InviteDeps {
  env: Env;
  store: MemberStore;
  origin: string;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  log?: (m: string) => void;
  now?: () => Date;
}

export type InviteResult = { result: 'invited' | 'reinvited'; member: Member; emailed: boolean } | { result: 'member'; member: Member };

/** The account page with the invited level and cycle, so a new browser opens on the right choice too. */
export const inviteUrl = (m: Pick<Member, 'level' | 'cycle'>, origin: string) => `${accountUrl(origin)}?level=${m.level}&cycle=${m.cycle}`;

export async function inviteMember(input: MemberDetails, deps: InviteDeps): Promise<InviteResult> {
  const { store } = deps;
  const log = deps.log ?? console.log;
  const actor = { kind: 'board', id: 'admin' } as const;
  const details = { kind: input.kind, name: input.name, organisationName: input.organisationName, level: input.level, cycle: input.cycle };

  let member = await store.byEmail(input.email);
  let result: 'invited' | 'reinvited' = 'reinvited';
  if (member && member.status !== 'pending' && !canJoin(member.status)) return { result: 'member', member };
  if (member) {
    member = await store.update(member.id, { ...details, paymentMode: 'automatic', ...(input.notes ? { notes: input.notes } : {}) }, actor);
  } else {
    try {
      member = await store.create(
        {
          ...details,
          email: input.email,
          category: 'passive',
          status: 'pending',
          source: 'invited',
          joinedAt: null,
          paidUntil: null,
          paymentMode: 'automatic',
          notes: input.notes,
        },
        actor,
      );
      result = 'invited';
    } catch (cause) {
      // Invited at the same moment from another tab.
      if (!(cause instanceof DuplicateEmail)) throw cause;
      return inviteMember(input, deps);
    }
  }

  const email = renderEmail('membership-invite', { ...membershipProps(member, deps.origin), accountUrl: inviteUrl(member, deps.origin) });
  const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const emailed = await sendMemberEmail(
    deps.env,
    { to: member.email, ...email },
    // One invitation per choice and day: a double click sends one email, a changed choice sends another.
    { idempotencyKey: `member-invite:${member.id}:${member.level}-${member.cycle}:${day}`, log, fetch: deps.fetch },
  )
    .then((r) => r.sent)
    .catch((cause: Error) => {
      log(`[membership] invitation email to member ${member.id} not sent: ${cause.message}`);
      return false;
    });

  const cycle = CYCLES.find((c) => c.value === member.cycle)!.label.toLowerCase();
  await notify(
    `:envelope: ${result === 'invited' ? 'Invited' : 'Invited again'} to join: ${who(member)}, ${levelInfo(member.level).name}, ${cycle}. ${emailed ? 'Emailed to finish joining online.' : 'The email was not sent (see the function log).'}`,
    { env: deps.env, slack: deps.slack, fetch: deps.fetch, log },
  );
  return { result, member, emailed };
}
