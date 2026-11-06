/**
 * The Slack interactivity function end to end: a signed click goes to the
 * membership review (Supabase and Slack mocked at fetch), and a bad signature
 * or another channel changes nothing.
 */
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../netlify/functions/slack-interactivity.mts';

const SECRET = 'slack-signing-secret';
const NADJA = 'U08NAFH955M';
const MEMBER_ID = '6a1b2c3d-0000-4000-8000-000000000001';

const row = {
  id: MEMBER_ID,
  auth_user_id: 'u1',
  email: 'ada@example.com',
  kind: 'person',
  name: 'Ada Lovelace',
  organisation_name: null,
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'applied',
  ended_reason: null,
  source: 'self_serve',
  joined_at: null,
  paid_until: null,
  payment_mode: 'automatic',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  notes: null,
  created_at: '2026-11-06T09:00:00Z',
  updated_at: '2026-11-06T09:00:00Z',
};

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

const click = (channel = 'CMEMBERS', action_id = 'member_approve') => ({
  type: 'block_actions',
  user: { id: NADJA },
  channel: { id: channel },
  message: { ts: '1700000000.000100' },
  actions: [{ action_id, value: MEMBER_ID }],
});

let calls: { url: string; body: unknown }[];

beforeEach(() => {
  calls = [];
  vi.stubEnv('SLACK_SIGNING_SECRET', SECRET);
  vi.stubEnv('SLACK_AGENT_BOT_TOKEN', 'xoxb-test');
  vi.stubEnv('SLACK_AGENT_CHANNEL_ID', 'CAGENT');
  vi.stubEnv('SLACK_MEMBERSHIP_CHANNEL_ID', 'CMEMBERS');
  vi.stubEnv('SLACK_MEMBERSHIP_APPROVER_IDS', NADJA);
  vi.stubEnv('SUPABASE_URL', 'https://abc.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('URL', 'https://zurichjs.com');
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body ? (String(init.body).startsWith('{') ? JSON.parse(String(init.body)) : String(init.body)) : undefined });
    if (url.includes('/rest/v1/members?')) return new Response(JSON.stringify([row]));
    if (url.endsWith('/rest/v1/rpc/member_transition')) return new Response(JSON.stringify({ ...row, status: 'approved' }));
    if (url.startsWith('https://slack.com/api/')) return new Response('{"ok":true,"ts":"1"}');
    if (url === 'https://api.resend.com/emails') return new Response('{"id":"e1"}');
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('slack-interactivity: membership buttons', () => {
  it('approves through Supabase, updates the card and emails the member', async () => {
    const res = await handler(signed(click()), {});
    expect(res.status).toBe(200);
    expect(calls.find((c) => c.url.endsWith('/rpc/member_transition'))?.body).toMatchObject({
      p_id: MEMBER_ID,
      p_from: 'applied',
      p_to: 'approved',
      p_actor_kind: 'board',
      p_actor_id: NADJA,
    });
    expect(calls.some((c) => c.url === 'https://slack.com/api/chat.update')).toBe(true);
    expect(calls.find((c) => c.url === 'https://api.resend.com/emails')?.body).toMatchObject({ to: ['ada@example.com'], subject: 'Your ZurichJS membership is approved' });
  });

  it('refuses a bad signature before doing anything', async () => {
    const res = await handler(signed(click(), 'wrong-secret'), {});
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it('ignores a membership button pressed in another channel', async () => {
    await handler(signed(click('C-ELSEWHERE')), {});
    expect(calls.filter((c) => c.url.includes('supabase'))).toEqual([]);
  });

  it('leaves other buttons to the content agent (unknown actions do nothing)', async () => {
    const res = await handler(signed(click('CAGENT', 'something_else')), {});
    expect(res.status).toBe(200);
    expect(calls).toEqual([]);
  });
});
