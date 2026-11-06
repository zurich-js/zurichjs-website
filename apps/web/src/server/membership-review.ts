/**
 * Membership applications reviewed in Slack (docs/v2/MEMBERSHIP.md, phase 3).
 *
 * A new application posts a card with Approve and Reject to the organisers'
 * channel. Only the people in SLACK_MEMBERSHIP_APPROVER_IDS can press them
 * (Nadja, Bogdan and Faris; owner, 6th November 2026); anyone else gets a note
 * only they can see. A decision replaces the buttons on the card, so it cannot
 * be pressed twice, and the database refuses a second decision anyway
 * (compare-and-set in member_transition).
 *
 * Slack: the content agent's app (SLACK_AGENT_BOT_TOKEN, one interactivity URL
 * per app), in SLACK_MEMBERSHIP_CHANNEL_ID or else SLACK_AGENT_CHANNEL_ID. The
 * bot must be a member of that channel.
 */
import { renderEmail, type ApplicationProps } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { levelInfo, TransitionError, type Member, type MemberStore } from '@zurichjs/membership';
import { CYCLES, TIERS, feeLabel } from '../lib/membership.ts';
import type { Env } from './http.ts';

type Fetch = typeof fetch;
type Log = (m: string) => void;

export const APPROVE = 'member_approve';
export const REJECT = 'member_reject';
export type ReviewAction = typeof APPROVE | typeof REJECT;
export const isReviewAction = (id: string): id is ReviewAction => id === APPROVE || id === REJECT;

export const membershipChannel = (env: Env) => env.SLACK_MEMBERSHIP_CHANNEL_ID || env.SLACK_AGENT_CHANNEL_ID || undefined;
export const approvers = (env: Env) => new Set((env.SLACK_MEMBERSHIP_APPROVER_IDS ?? '').split(/[\s,]+/).filter(Boolean));

/** The account page on this deploy (production, preview or local). */
export const accountUrl = (origin: string) => new URL('/membership/account', origin).toString();

export function applicationProps(m: Member, origin: string): ApplicationProps {
  return {
    name: m.name,
    organisationName: m.organisationName,
    levelName: levelInfo(m.level).name,
    cycleLabel: CYCLES.find((c) => c.value === m.cycle)!.label,
    feeLabel: feeLabel(TIERS[m.level], m.cycle),
    accountUrl: accountUrl(origin),
  };
}

/* ---------------------------------------------------------------- Slack */

export interface SlackBlock {
  type: string;
  [k: string]: unknown;
}

export interface MembershipSlack {
  /** Posts to the membership channel; returns the message ts. */
  post(text: string, blocks: SlackBlock[]): Promise<string>;
  update(channel: string, ts: string, text: string, blocks: SlackBlock[]): Promise<void>;
  /** Visible only to `user`. */
  ephemeral(channel: string, user: string, text: string): Promise<void>;
}

export class SlackUnavailable extends Error {}

export function membershipSlack(env: Env, fetchImpl: Fetch = fetch): MembershipSlack {
  const token = env.SLACK_AGENT_BOT_TOKEN;
  const channel = membershipChannel(env);
  if (!token || !channel) throw new SlackUnavailable('SLACK_AGENT_BOT_TOKEN and SLACK_MEMBERSHIP_CHANNEL_ID (or SLACK_AGENT_CHANNEL_ID) are needed');
  const call = async <T>(method: string, body: Record<string, unknown>): Promise<T> => {
    const res = await fetchImpl(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    });
    const json = (await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) as T & { ok: boolean; error?: string };
    if (!json.ok) throw new Error(`Slack ${method}: ${json.error}`);
    return json;
  };
  return {
    post: async (text, blocks) => (await call<{ ts: string }>('chat.postMessage', { channel, text, blocks, unfurl_links: false })).ts,
    update: async (ch, ts, text, blocks) => void (await call('chat.update', { channel: ch, ts, text, blocks })),
    ephemeral: async (ch, user, text) => void (await call('chat.postEphemeral', { channel: ch, user, text })),
  };
}

/** Slack mrkdwn needs &, < and > escaped in user text. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function details(m: Member, message?: string): string {
  const p = applicationProps(m, 'https://zurichjs.com');
  return [
    `*${esc(m.name)}*${m.organisationName ? ` for *${esc(m.organisationName)}*` : ''} (${esc(m.email)})`,
    `${p.levelName}, ${p.cycleLabel.toLowerCase()}: ${p.feeLabel}`,
    ...(message ? [`> ${esc(message).replace(/\n/g, '\n> ')}`] : []),
  ].join('\n');
}

export function reviewCard(m: Member, message?: string): { text: string; blocks: SlackBlock[] } {
  return {
    text: `Membership request from ${m.name}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `:wave: *Membership request*\n${details(m, message)}` } },
      {
        type: 'actions',
        block_id: 'membership_review',
        elements: [
          { type: 'button', action_id: APPROVE, value: m.id, style: 'primary', text: { type: 'plain_text', text: 'Approve' } },
          {
            type: 'button',
            action_id: REJECT,
            value: m.id,
            style: 'danger',
            text: { type: 'plain_text', text: 'Reject' },
            confirm: {
              title: { type: 'plain_text', text: 'Reject this request?' },
              text: { type: 'plain_text', text: `${m.name} gets a short email that the request was not approved. No reason is given.` },
              confirm: { type: 'plain_text', text: 'Reject' },
              deny: { type: 'plain_text', text: 'Cancel' },
            },
          },
        ],
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Member ${m.id}. Nothing is charged until they sign and pay.` }] },
    ],
  };
}

function decidedCard(m: Member, outcome: string): { text: string; blocks: SlackBlock[] } {
  return {
    text: `Membership request from ${m.name}: ${outcome}`,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*Membership request*\n${details(m)}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: outcome }] },
    ],
  };
}

/** Posts the review card. Returns false (and logs) when Slack is not set up or fails, so the caller can fall back. */
export async function postReviewCard(m: Member, message: string | undefined, deps: { env: Env; fetch?: Fetch; log?: Log; slack?: MembershipSlack }): Promise<boolean> {
  const log = deps.log ?? console.log;
  try {
    const slack = deps.slack ?? membershipSlack(deps.env, deps.fetch);
    const card = reviewCard(m, message);
    await slack.post(card.text, card.blocks);
    return true;
  } catch (cause) {
    log(`[membership] review card for ${m.id} not posted: ${(cause as Error).message}`);
    return false;
  }
}

/* ---------------------------------------------------------------- decisions */

export interface ReviewClick {
  action: ReviewAction;
  memberId: string;
  /** Slack user who pressed. */
  user: string;
  channel: string;
  /** The card's ts. */
  ts: string;
}

export interface ReviewDeps {
  env: Env;
  store: MemberStore;
  slack: MembershipSlack;
  origin: string;
  fetch?: Fetch;
  log?: Log;
  now?: () => Date;
}

const zurichDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' });

/**
 * Applies an Approve or Reject press. Returns what happened, for logs and tests.
 * Never throws for expected cases: the person who pressed is told in Slack.
 */
export async function decide(click: ReviewClick, deps: ReviewDeps): Promise<'approved' | 'rejected' | 'not_allowed' | 'already_decided' | 'not_found'> {
  const { env, store, slack } = deps;
  const log = deps.log ?? console.log;
  if (click.channel !== membershipChannel(env)) return 'not_allowed';
  if (!approvers(env).has(click.user)) {
    const names = [...approvers(env)].map((id) => `<@${id}>`).join(', ');
    await slack.ephemeral(click.channel, click.user, `Only the membership approvers can decide on requests${names ? `: ${names}` : ' (SLACK_MEMBERSHIP_APPROVER_IDS is empty)'}.`);
    return 'not_allowed';
  }
  const member = await store.get(click.memberId);
  if (!member) {
    await slack.ephemeral(click.channel, click.user, `There is no member ${click.memberId} any more. Nothing changed.`);
    return 'not_found';
  }
  const to = click.action === APPROVE ? 'approved' : 'rejected';
  let updated: Member;
  try {
    // `from`: the card is about the request. A stale card cannot flip an approved member to rejected.
    updated = await store.transition(member.id, { from: 'applied', to, actor: { kind: 'board', id: click.user }, payload: { slackTs: click.ts } });
  } catch (cause) {
    if (!(cause instanceof TransitionError)) throw cause;
    // Someone else decided first, or the member moved on: show where it stands.
    const current = (await store.get(member.id)) ?? member;
    await slack.ephemeral(click.channel, click.user, `This request was already handled (it is now ${current.status.replace('_', ' ')}). Nothing changed.`);
    return 'already_decided';
  }
  const verb = to === 'approved' ? 'Approved' : 'Rejected';
  const outcome = `${to === 'approved' ? ':white_check_mark:' : ':no_entry_sign:'} ${verb} by <@${click.user}> on ${zurichDate(deps.now?.() ?? new Date())}.`;
  const card = decidedCard(updated, outcome);
  await slack.update(click.channel, click.ts, card.text, card.blocks).catch((e: Error) => log(`[membership] card not updated: ${e.message}`));
  const email = renderEmail(to === 'approved' ? 'application-approved' : 'application-declined', applicationProps(updated, deps.origin));
  try {
    // One email per decision, even if Slack retries the click.
    await sendMemberEmail(env, { to: updated.email, ...email }, { idempotencyKey: `member-${to}:${updated.id}:${click.ts}`, log, fetch: deps.fetch });
  } catch (cause) {
    log(`[membership] ${to} email to ${updated.id} failed: ${(cause as Error).message}`);
    await slack.ephemeral(click.channel, click.user, `${verb}, but the email to ${updated.email} failed. Please write to them by hand.`).catch(() => undefined);
  }
  return to;
}
