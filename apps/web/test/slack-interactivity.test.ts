/**
 * The Slack interactivity function: signed clicks only; the membership button
 * (Confirm resignation) goes to the membership handler, and only from the
 * membership channel; other buttons stay with the content agent.
 */
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../netlify/functions/slack-interactivity.mts';

const SECRET = 'slack-signing-secret';
const NADJA = 'U08NAFH955M';

function signed(payload: Record<string, unknown>, secret = SECRET) {
  const body = `payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = `v0=${createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`;
  return new Request('https://zurichjs.com/.netlify/functions/slack-interactivity', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-slack-request-timestamp': ts, 'x-slack-signature': sig },
    body,
  });
}

const click = (channel = 'CMEMBERS', action_id = 'member_confirm_resignation') => ({
  type: 'block_actions',
  user: { id: NADJA },
  channel: { id: channel },
  message: { ts: '1700000000.000100' },
  actions: [{ action_id, value: 'member-1' }],
});

let calls: { url: string; body: unknown }[];

beforeEach(() => {
  calls = [];
  vi.stubEnv('SLACK_SIGNING_SECRET', SECRET);
  vi.stubEnv('SLACK_AGENT_BOT_TOKEN', 'xoxb-test');
  vi.stubEnv('SLACK_AGENT_CHANNEL_ID', 'CAGENT');
  vi.stubEnv('SLACK_MEMBERSHIP_CHANNEL_ID', 'CMEMBERS');
  vi.stubEnv('SLACK_MEMBERSHIP_APPROVER_IDS', NADJA);
  vi.stubEnv('DATABASE_URL', '');
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body ? JSON.parse(String(init.body)) : undefined });
    return new Response('{"ok":true,"ts":"1"}');
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('slack-interactivity: membership button', () => {
  it('refuses a bad signature before doing anything', async () => {
    const res = await handler(signed(click(), 'wrong-secret'), {});
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('answers in Slack, privately, when the membership database is not reachable', async () => {
    const res = await handler(signed(click()), {});
    expect(res.status).toBe(200);
    const note = calls.find((c) => c.url === 'https://slack.com/api/chat.postEphemeral');
    expect(note?.body).toMatchObject({ channel: 'CMEMBERS', user: NADJA });
    expect((note?.body as { text?: string } | undefined)?.text ?? '').toContain('DATABASE_URL is not set');
  });

  it('sends Send email on a talk card to the speaker-email handler, and answers in the thread when Sanity is not set up', async () => {
    const res = await handler(signed({ ...click('CAGENT', 'talk_email_send'), actions: [{ action_id: 'talk_email_send', value: '{"s":"p1","e":"evt-nov"}' }] }), {});
    expect(res.status).toBe(200);
    expect(calls.some((c) => c.url.includes('api.resend.com'))).toBe(false);
    const post = calls.find((c) => c.url === 'https://slack.com/api/chat.postMessage');
    expect(post?.body).toMatchObject({ channel: 'CAGENT', thread_ts: '1700000000.000100' });
    expect((post?.body as { text?: string } | undefined)?.text ?? '').toContain('SANITY_AGENT_TOKEN is not set');
  });

  it('ignores talk card buttons outside the organisers’ channel', async () => {
    const res = await handler(signed({ ...click('CELSEWHERE', 'talk_email_send'), actions: [{ action_id: 'talk_email_send', value: '{"s":"p1","e":"evt-nov"}' }] }), {});
    expect(res.status).toBe(200);
    expect(calls).toEqual([]);
  });

  it('leaves other buttons to the content agent (unknown actions do nothing)', async () => {
    const res = await handler(signed(click('CAGENT', 'something_else')), {});
    expect(res.status).toBe(200);
    expect(calls).toEqual([]);
  });
});
