/**
 * Slack plumbing for the content agent: request signatures, the Web API calls we use,
 * thread → model messages, and Block Kit for the "here is what I changed" reply.
 */
import type { ModelMessage } from 'ai';
import { formatZurich } from './time.ts';
import type { DraftChange } from './tools.ts';

type Env = Record<string, string | undefined>;

/* ---------------------------------------------------------------- signatures */

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

/** Slack's v0 request signature (`x-slack-signature`, `x-slack-request-timestamp`), 5-minute window. */
export async function verifySlackRequest(headers: Headers, rawBody: string, secret: string | undefined, now = Date.now()): Promise<boolean> {
  if (!secret) return false;
  const ts = headers.get('x-slack-request-timestamp');
  const sig = headers.get('x-slack-signature');
  if (!ts || !sig || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  return safeEqual(`v0=${await hmacHex(secret, `v0:${ts}:${rawBody}`)}`, sig);
}

/** Signs the hand-off from slack-events to the background function, so nobody else can trigger runs. */
export const signInternal = (secret: string, body: string) => hmacHex(secret, `internal:${body}`);
export const verifyInternal = async (secret: string | undefined, body: string, sig: string | null) => !!secret && !!sig && safeEqual(await signInternal(secret, body), sig);

/* ---------------------------------------------------------------- web API */

export interface SlackMessage {
  ts: string;
  user?: string;
  bot_id?: string;
  text?: string;
  thread_ts?: string;
}

export interface SlackApi {
  botUserId(): Promise<string>;
  replies(channel: string, ts: string): Promise<SlackMessage[]>;
  post(channel: string, threadTs: string, text: string, blocks?: unknown[]): Promise<void>;
  react(channel: string, ts: string, name: string): Promise<void>;
}

export function slackApi(env: Env, fetchImpl: typeof fetch = fetch): SlackApi {
  const token = env.SLACK_AGENT_BOT_TOKEN;
  if (!token) throw new Error('SLACK_AGENT_BOT_TOKEN is not set');
  // Slack's read methods (conversations.replies) reject JSON bodies with invalid_arguments; they take form fields.
  const call = async <T>(method: string, body: Record<string, unknown>, form = false): Promise<T> => {
    const res = await fetchImpl(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': form ? 'application/x-www-form-urlencoded' : 'application/json; charset=utf-8' },
      body: form ? new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)])).toString() : JSON.stringify(body),
    });
    const json = (await res.json()) as T & { ok: boolean; error?: string };
    if (!json.ok) throw new Error(`Slack ${method}: ${json.error}`);
    return json;
  };
  let me: string | undefined;
  return {
    botUserId: async () => (me ??= (await call<{ user_id: string }>('auth.test', {})).user_id),
    replies: async (channel, ts) => (await call<{ messages: SlackMessage[] }>('conversations.replies', { channel, ts, limit: 50 }, true)).messages,
    post: async (channel, thread_ts, text, blocks) => void (await call('chat.postMessage', { channel, thread_ts, text, ...(blocks ? { blocks } : {}), unfurl_links: false })),
    react: async (channel, timestamp, name) => void (await call('reactions.add', { channel, timestamp, name }).catch(() => undefined)),
  };
}

/** Marks a thread message the bot was not asked in: people talking to each other. */
export const CONTEXT_ONLY = '[Context only, not addressed to you]';

/**
 * The thread as model messages, up to the message that mentioned the bot (`upToTs`). The bot's own
 * posts are the assistant. People's messages that mention the bot are requests; the others are
 * people talking to each other in the thread, kept as context and marked so the model never acts
 * on them (owner, 10th November 2026: the bot acts only when mentioned, also in threads).
 * Consecutive people's messages are joined into one user message.
 */
export function threadToMessages(thread: SlackMessage[], botUserId: string, upToTs?: string): ModelMessage[] {
  const mention = new RegExp(`<@${botUserId}>`, 'g');
  const out: ModelMessage[] = [];
  for (const m of thread) {
    if (!m.text?.trim()) continue;
    if (upToTs && Number(m.ts) > Number(upToTs)) break;
    if (m.user === botUserId || m.bot_id) {
      out.push({ role: 'assistant', content: m.text });
      continue;
    }
    const asked = m.text.includes(`<@${botUserId}>`);
    const line = `${asked ? '' : `${CONTEXT_ONLY} `}<@${m.user}>: ${m.text.replace(mention, '').trim()}`;
    const last = out.at(-1);
    if (last?.role === 'user' && typeof last.content === 'string') last.content = `${last.content}\n\n${line}`;
    else out.push({ role: 'user', content: line });
  }
  return out;
}

/* ---------------------------------------------------------------- Block Kit */

const LABELS: Record<string, string> = {
  title: 'Title',
  status: 'Status',
  datetime: 'Starts',
  endsAt: 'Ends',
  dateText: 'Month',
  venue: 'Venue',
  location: 'Venue (legacy)',
  address: 'Address (legacy)',
  venueNote: 'Venue note',
  description: 'Description',
  meetupUrl: 'Meetup link',
  practical: 'Good to know',
  agenda: 'Programme',
  twintNote: 'Twint note',
  talks: 'Running order',
  durationMinutes: 'Length (minutes)',
  type: 'Kind',
  speakers: 'Speakers',
  talkReference: 'Talk',
  reviewNotes: 'Review notes',
  isVisible: 'On the site',
  legacySlugs: 'Old URLs (redirect)',
  talkReferences: 'Talks',
  name: 'Name',
  bio: 'Bio',
  image: 'Photo',
  tags: 'Topics',
  level: 'Level',
};
/** Legacy mirrors of the venue are kept in sync but not worth showing twice. */
const HIDDEN = new Set(['location', 'address', 'id', '_type', 'reviewedAt', 'convertedToTalk', 'language']);

function show(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if ((field === 'datetime' || field === 'endsAt') && typeof v === 'string') return formatZurich(v);
  if (field === 'venue' && typeof v === 'object') {
    const x = v as Record<string, string | undefined>;
    return [x.name, x.street, [x.zip, x.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }
  if (Array.isArray(v))
    return (
      v
        .map((i) =>
          typeof i === 'object' && i
            ? Object.entries(i)
                .filter(([k]) => !k.startsWith('_'))
                .map(([, x]) => x)
                .join(' · ')
            : String(i),
        )
        .join('\n') || '—'
    );
  const s = String(v);
  return s.length > 280 ? `${s.slice(0, 277)}…` : s;
}

export interface BlockOptions {
  studioUrl: string;
  /** Draft preview site (SANITY_PERSPECTIVE=drafts); optional. */
  previewUrl?: string;
}

/** One section per changed document: field lines and Publish / Discard buttons. */
export function changeBlocks(text: string, changes: DraftChange[], o: BlockOptions): unknown[] {
  const blocks: unknown[] = [{ type: 'section', text: { type: 'mrkdwn', text } }];
  // Slack allows 50 blocks per message: show the first changes in full; Publish all covers every one.
  const SHOWN = 12;
  const many = changes.length > 1;
  for (const c of changes.slice(0, SHOWN)) {
    const lines = c.fields
      .filter((f) => !HIDDEN.has(f.field))
      .map((f) => `*${LABELS[f.field] ?? f.field}:* ${c.created ? show(f.field, f.after) : `${show(f.field, f.before)} → ${show(f.field, f.after)}`}`);
    const links = [
      `<${o.studioUrl}/intent/edit/id=${c.id};type=${c.type}|Open in Studio>`,
      o.previewUrl && c.slug ? `<${o.previewUrl}/events/${c.slug}|Preview draft>` : null,
    ].filter(Boolean);
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${c.created ? 'New draft' : 'Draft changes'}: ${c.title}*${c.slug ? ` (\`/events/${c.slug}\`)` : ''}\n${lines.join('\n')}`.slice(0, 2900) },
      },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `${links.join(' · ')} · Not live until published.` }] },
    );
    if (!many)
      blocks.push({
        type: 'actions',
        elements: [
          { type: 'button', style: 'primary', text: { type: 'plain_text', text: 'Publish' }, action_id: 'publish', value: JSON.stringify({ id: c.id, type: c.type }) },
          { type: 'button', text: { type: 'plain_text', text: 'Discard draft' }, action_id: 'discard', value: JSON.stringify({ id: c.id, type: c.type }) },
        ],
      });
  }
  if (many) {
    const value = JSON.stringify({ items: changes.map((c) => ({ id: c.id, type: c.type })) });
    if (changes.length > SHOWN) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `…and ${changes.length - SHOWN} more drafts, all in Publish all.` }] });
    blocks.push(
      { type: 'divider' },
      {
        type: 'actions',
        elements: [
          { type: 'button', style: 'primary', text: { type: 'plain_text', text: `Publish all ${changes.length}` }, action_id: 'publish', value },
          { type: 'button', text: { type: 'plain_text', text: 'Discard all' }, action_id: 'discard', value },
        ],
      },
    );
  }
  return blocks;
}

export const allowlist = (v: string | undefined) => new Set((v ?? '').split(/[\s,]+/).filter(Boolean));
