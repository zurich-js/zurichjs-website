/**
 * Membership in Slack (docs/v2/MEMBERSHIP.md). Nobody approves new members
 * (owner, 10th November 2026): Slack gets a note when someone joins, renews
 * or a payment fails. Resignations go to the board (bylaws Art. 5): the card
 * has one button, Confirm resignation, for SLACK_MEMBERSHIP_APPROVER_IDS only
 * (Nadja, Bogdan, Faris). Confirming schedules the end of the Stripe
 * subscription at the end of the paid period; the board cannot refuse a
 * resignation, only wait for open dues.
 *
 * Slack: the content agent's app (SLACK_AGENT_BOT_TOKEN, one interactivity URL
 * per app), in SLACK_MEMBERSHIP_CHANNEL_ID or else SLACK_AGENT_CHANNEL_ID.
 */
import { levelInfo, type Member, type MemberStore } from '@zurichjs/membership';
import { lastDay, longDate } from './certificate.ts';
import type { Env } from './http.ts';
import { confirmResignation } from './membership-resignation.ts';
import type { StripeDeps } from './membership-stripe.ts';

type Fetch = typeof fetch;
type Log = (m: string) => void;

export const CONFIRM_RESIGNATION = 'member_confirm_resignation';
export const isMembershipAction = (id: string) => id === CONFIRM_RESIGNATION;

export const membershipChannel = (env: Env) => env.SLACK_MEMBERSHIP_CHANNEL_ID || env.SLACK_AGENT_CHANNEL_ID || undefined;
export const approvers = (env: Env) => new Set((env.SLACK_MEMBERSHIP_APPROVER_IDS ?? '').split(/[\s,]+/).filter(Boolean));

export interface SlackBlock {
  type: string;
  [k: string]: unknown;
}

export interface MembershipSlack {
  /** Posts to the membership channel; returns the message ts. */
  post(text: string, blocks?: SlackBlock[]): Promise<string>;
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
    post: async (text, blocks) => (await call<{ ts: string }>('chat.postMessage', { channel, text, ...(blocks ? { blocks } : {}), unfurl_links: false })).ts,
    update: async (ch, ts, text, blocks) => void (await call('chat.update', { channel: ch, ts, text, blocks })),
    ephemeral: async (ch, user, text) => void (await call('chat.postEphemeral', { channel: ch, user, text })),
  };
}

/** Slack mrkdwn needs &, < and > escaped in user text. */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const who = (m: Member) => `*${esc(m.name)}*${m.organisationName ? ` for *${esc(m.organisationName)}*` : ''} (${esc(m.email)})`;

/** Posts a plain note; never throws (logs instead), so Slack never blocks a payment or a sign-up. */
export async function notify(text: string, deps: { env: Env; slack?: MembershipSlack; fetch?: Fetch; log?: Log }): Promise<boolean> {
  try {
    await (deps.slack ?? membershipSlack(deps.env, deps.fetch)).post(text);
    return true;
  } catch (cause) {
    (deps.log ?? console.log)(`[membership] Slack note not posted: ${(cause as Error).message}`);
    return false;
  }
}

export function resignationCard(m: Member, openDues: number): { text: string; blocks: SlackBlock[] } {
  const level = levelInfo(m.level).name;
  return {
    text: `Resignation from ${m.name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:wave: *Resignation* (bylaws Art. 5)\n${who(m)}\n${level}, ${m.cycle}${m.paidUntil ? `, paid until ${longDate(lastDay(m.paidUntil))}` : ''}`,
        },
      },
      openDues
        ? {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `:warning: ${openDues} open invoice${openDues === 1 ? '' : 's'}. The resignation takes effect once paid; press Confirm after that.` },
            ],
          }
        : { type: 'context', elements: [{ type: 'mrkdwn', text: 'No open dues. Confirming ends the membership with the paid period; nothing more is charged.' }] },
      {
        type: 'actions',
        block_id: 'membership_resignation',
        elements: [
          {
            type: 'button',
            action_id: CONFIRM_RESIGNATION,
            value: m.id,
            style: 'primary',
            text: { type: 'plain_text', text: 'Confirm resignation' },
            confirm: {
              title: { type: 'plain_text', text: 'Confirm this resignation?' },
              text: { type: 'plain_text', text: `${m.name}'s membership ends with the paid period. They get an email.` },
              confirm: { type: 'plain_text', text: 'Confirm' },
              deny: { type: 'plain_text', text: 'Cancel' },
            },
          },
        ],
      },
    ],
  };
}

export interface ClickDeps {
  env: Env;
  store: MemberStore;
  slack: MembershipSlack;
  origin: string;
  stripe?: StripeDeps;
  fetch?: Fetch;
  log?: Log;
  now?: () => Date;
}

export interface Click {
  action: string;
  memberId: string;
  user: string;
  channel: string;
  ts: string;
}

/** Applies a Confirm resignation press. Expected cases are answered in Slack, never thrown. */
export async function handleMembershipClick(click: Click, deps: ClickDeps): Promise<'confirmed' | 'not_allowed' | 'not_resigning' | 'open_dues' | 'not_found'> {
  const { env, store, slack } = deps;
  const log = deps.log ?? console.log;
  if (click.channel !== membershipChannel(env) || click.action !== CONFIRM_RESIGNATION) return 'not_allowed';
  if (!approvers(env).has(click.user)) {
    const names = [...approvers(env)].map((id) => `<@${id}>`).join(', ');
    await slack.ephemeral(
      click.channel,
      click.user,
      `Only the membership approvers can confirm resignations${names ? `: ${names}` : ' (SLACK_MEMBERSHIP_APPROVER_IDS is empty)'}.`,
    );
    return 'not_allowed';
  }
  const r = await confirmResignation(click.memberId, click.user, { env, store, origin: deps.origin, stripe: deps.stripe, fetch: deps.fetch, log, reference: click.ts });
  if (r.result === 'not_found') {
    await slack.ephemeral(click.channel, click.user, 'That member no longer exists. Nothing changed.');
    return 'not_found';
  }
  if (r.result === 'not_resigning') {
    await slack.ephemeral(click.channel, click.user, `This resignation was already handled (the membership is now ${r.member.status.replace('_', ' ')}). Nothing changed.`);
    return 'not_resigning';
  }
  if (r.result === 'open_dues') {
    await slack.ephemeral(
      click.channel,
      click.user,
      `${r.member.name} still has ${r.dues} open invoice${r.dues === 1 ? '' : 's'}. Under the bylaws the resignation takes effect once paid. Nothing changed.`,
    );
    return 'open_dues';
  }
  const outcome = `:white_check_mark: Confirmed by <@${click.user}> on ${longDate((deps.now?.() ?? new Date()).toISOString())}.${r.lastPaidDay ? ` Ends ${r.lastPaidDay}.` : ''}`;
  await slack
    .update(click.channel, click.ts, `Resignation from ${r.member.name}: confirmed`, [
      { type: 'section', text: { type: 'mrkdwn', text: `*Resignation* (bylaws Art. 5)\n${who(r.member)}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: outcome }] },
    ])
    .catch((e: Error) => log(`[membership] card not updated: ${e.message}`));
  if (r.emailFailed) await slack.ephemeral(click.channel, click.user, `Confirmed, but the email to ${r.member.email} failed. Please write to them by hand.`).catch(() => undefined);
  return 'confirmed';
}
