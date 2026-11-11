/**
 * Membership for the Slack agent (owner, 10th November 2026): organisers ask the bot
 * about members in the organisers' channel ("who is resigning?", "is Ada paid up?").
 *
 *   - Read-only tools. The model can look members up; it cannot change a membership.
 *     Changes are buttons on member cards (Confirm resignation, Undo), deterministic
 *     code in membership-slack.ts that only the approvers can press.
 *   - What the model sees is kept small, because it goes to the model provider: name,
 *     organisation, level, cycle, status and dates. No email addresses, no notes, no
 *     Stripe ids. The cards under the reply (built here, not by the model) show the email.
 */
import { tool, z, type ToolSet } from '@zurichjs/agent';
import { isMember, levelInfo, resignationState, type Member, type MemberStore, type Status } from '@zurichjs/membership';
import { lastDay, longDate, shortDateTime } from './dates.ts';
import { resignationLabel } from './membership.ts';
import { CONFIRM_RESIGNATION, UNDO_RESIGNATION, type SlackBlock } from './membership-slack.ts';

const STATUSES = ['pending', 'active', 'past_due', 'imported_manual', 'resigning', 'ended'] as const satisfies readonly Status[];
const MAX_RESULTS = 15;
/** Cards under one reply; more would bury the answer. */
const MAX_CARDS = 5;

export const MEMBERSHIP_INSTRUCTIONS = `Membership (the Swiss JavaScript Group, the association behind ZurichJS):
- You can also answer organisers' questions about members with membershipOverview and findMembers. These only read. You cannot change a membership: confirming or undoing a resignation is done with the buttons on the member cards that appear under your reply, and only the membership approvers can press them. Never claim you changed a membership.
- Statuses: pending (signed up, not paid yet), active, past due (a payment failed; Stripe retries), paid manually (cash/bank; pays outside Stripe), resignation with the board (waiting for the board to confirm), resignation confirmed (ends with the paid period), ended.
- You do not see email addresses or notes, on purpose. If someone asks for an email, say it is on the member card under your reply, or in the admin area at /admin/memberships.
- Keep member answers short: names, status and the relevant date. Do not list more members than asked for. Membership data is personal: only discuss it here, in the organisers' channel.`;

/** What the model may see of a member. */
const forModel = (m: Member) => ({
  ref: m.id,
  name: m.name,
  organisation: m.organisationName,
  level: levelInfo(m.level).name,
  cycle: m.cycle,
  status: resignationLabel(m) ?? m.status.replace('_', ' '),
  paidUntil: m.paidUntil ? longDate(lastDay(m.paidUntil)) : null,
  memberSince: m.joinedAt ? longDate(m.joinedAt) : null,
  payment: m.paymentMode === 'manual' ? 'manually (cash/bank)' : 'automatic (Stripe)',
  resignedOn: m.resignedAt ? longDate(m.resignedAt) : null,
  resignationConfirmedOn: m.resignationConfirmedAt ? longDate(m.resignationConfirmedAt) : null,
});

/** Members the tools surfaced, for the cards under the reply (resigning ones get the buttons). */
export class MemberCards {
  private readonly seen = new Map<string, Member>();
  add(members: Member[]) {
    for (const m of members) this.seen.set(m.id, m);
  }
  /** The resigning members found this turn: the ones a card with buttons helps with. */
  list = () => [...this.seen.values()].filter((m) => m.status === 'resigning').slice(0, MAX_CARDS);
}

export function membershipTools(store: MemberStore, cards: MemberCards): ToolSet {
  return {
    membershipOverview: tool({
      description: 'How many members there are, and how many in each status (including resignations waiting for the board and confirmed ones).',
      inputSchema: z.object({}),
      execute: async () => {
        const all = await store.search({ limit: 5000 });
        const byStatus = Object.fromEntries(STATUSES.map((s) => [s, all.filter((m) => m.status === s).length]));
        const resigning = all.filter((m) => m.status === 'resigning');
        return {
          members: all.filter((m) => isMember(m.status)).length,
          byStatus,
          resignationsWaitingForBoard: resigning.filter((m) => resignationState(m) === 'waiting').length,
          resignationsConfirmed: resigning.filter((m) => resignationState(m) === 'confirmed').length,
          note: 'Members = active, past due, paid manually (cash/bank) and resigning (still members until their paid period ends).',
        };
      },
    }),
    findMembers: tool({
      description: `Finds members by name, organisation or email (query), and/or by status. Newest first, at most ${MAX_RESULTS}. Resigning members found here get a card with Confirm and Undo buttons under your reply.`,
      inputSchema: z.object({
        query: z.string().min(2).optional().describe('Part of a name, organisation or email address'),
        status: z.enum(STATUSES).optional().describe('Only members in this status'),
      }),
      execute: async ({ query, status }) => {
        const found = await store.search({ q: query, status, limit: MAX_RESULTS + 1 });
        cards.add(found.slice(0, MAX_RESULTS));
        return { count: Math.min(found.length, MAX_RESULTS), more: found.length > MAX_RESULTS, members: found.slice(0, MAX_RESULTS).map(forModel) };
      },
    }),
  };
}

/** Slack mrkdwn needs &, < and > escaped in user text. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The cards under the agent's reply: one per resigning member, with Confirm resignation
 * (while it waits for the board) and Undo. Button values are `agent:<member id>`, so
 * the click handler answers in the thread instead of rewriting this message.
 */
export function memberCardBlocks(members: Member[]): SlackBlock[] {
  return members.flatMap((m) => {
    const state = resignationState(m);
    const when =
      state === 'confirmed'
        ? `Confirmed ${m.resignationConfirmedAt ? shortDateTime(m.resignationConfirmedAt) : ''}`.trim()
        : `Requested ${m.resignedAt ? shortDateTime(m.resignedAt) : ''}, waiting for the board`.replace(/ ,/, ',');
    const paid = m.paidUntil ? `, paid until ${longDate(lastDay(m.paidUntil))}` : '';
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${esc(m.name)}*${m.organisationName ? ` for *${esc(m.organisationName)}*` : ''} (${esc(m.email)})\n${levelInfo(m.level).name}, ${m.cycle}${paid}\n_${when}_`,
        },
      },
      {
        type: 'actions',
        block_id: `member_${m.id}`,
        elements: [
          ...(state === 'waiting'
            ? [
                {
                  type: 'button',
                  style: 'primary',
                  action_id: CONFIRM_RESIGNATION,
                  value: `agent:${m.id}`,
                  text: { type: 'plain_text', text: 'Confirm resignation' },
                  confirm: {
                    title: { type: 'plain_text', text: 'Confirm this resignation?' },
                    text: { type: 'mrkdwn', text: `${esc(m.name)}'s membership then ends with the paid period. They are emailed.` },
                    confirm: { type: 'plain_text', text: 'Confirm' },
                    deny: { type: 'plain_text', text: 'Cancel' },
                  },
                },
              ]
            : []),
          {
            type: 'button',
            action_id: UNDO_RESIGNATION,
            value: `agent:${m.id}`,
            text: { type: 'plain_text', text: 'Undo resignation' },
            confirm: {
              title: { type: 'plain_text', text: 'Undo this resignation?' },
              text: {
                type: 'mrkdwn',
                text: `Only when ${esc(m.name)} asked for it. The membership continues${m.stripeSubscriptionId ? ' and renews as before' : ''}. They are emailed.`,
              },
              confirm: { type: 'plain_text', text: 'Undo' },
              deny: { type: 'plain_text', text: 'Cancel' },
            },
          },
        ],
      },
    ];
  });
}
