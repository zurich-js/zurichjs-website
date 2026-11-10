/**
 * The Slack agent's membership side: read-only tools that keep emails away from the model,
 * member cards with Confirm / Undo buttons, the button handling, and the local Socket Mode
 * bridge signing requests the way the functions verify them.
 */
import { verifySlackRequest } from '@zurichjs/agent';
import { memoryStore, type MemberStore, type NewMember } from '@zurichjs/membership';
import { describe, expect, it } from 'vitest';
import { signSlack, toRequest } from '../../../tools/slack-dev.mjs';
import { MemberCards, memberCardBlocks, membershipTools } from '../src/server/membership-agent.ts';
import { CONFIRM_RESIGNATION, UNDO_RESIGNATION, handleMembershipClick, parseMemberButton, type MembershipSlack } from '../src/server/membership-slack.ts';

const NADJA = 'U08NAFH955M';
const CHANNEL = 'CAGENT';
const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  RESEND_API_KEY: 're_test',
  SLACK_AGENT_CHANNEL_ID: CHANNEL,
  SLACK_MEMBERSHIP_APPROVER_IDS: NADJA,
  BETTER_AUTH_URL: 'https://zurichjs.com',
};
const script = { kind: 'script', id: 'test' } as const;
const base: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: 'ada@example.com',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'active',
  source: 'self_serve',
  joinedAt: '2026-01-10',
  paidUntil: '2027-01-10',
  paymentMode: 'manual',
  notes: 'private note',
};

async function members() {
  const store = memoryStore();
  const ada = await store.create(base, script);
  const grace = await store.create({ ...base, name: 'Grace Hopper', email: 'grace@example.com' }, script);
  await store.create({ ...base, name: 'Alan Turing', email: 'alan@example.com', status: 'pending', paidUntil: null }, script);
  await store.transition(grace.id, { to: 'resigning', actor: { kind: 'member', id: 'u' } });
  return { store, ada, grace };
}

const run = (store: MemberStore, cards: MemberCards, name: 'findMembers' | 'membershipOverview', input: object) =>
  membershipTools(store, cards)[name]!.execute!(input as never, { toolCallId: 't', messages: [] } as never) as Promise<Record<string, unknown>>;

/** Records Slack calls; Stripe and Resend answer OK. */
function world() {
  const calls: { method: string; args: unknown[] }[] = [];
  const slack: MembershipSlack = {
    post: async (...args) => (calls.push({ method: 'post', args }), '1.1'),
    update: async (...args) => void calls.push({ method: 'update', args }),
    reply: async (...args) => void calls.push({ method: 'reply', args }),
    ephemeral: async (...args) => void calls.push({ method: 'ephemeral', args }),
  };
  const fetch = (async (url: string) => new Response(String(url).includes('invoices') ? '{"data":[]}' : '{"id":"x"}')) as unknown as typeof globalThis.fetch;
  return { calls, slack, fetch };
}

describe('membership tools for the Slack agent', () => {
  it('counts members by status, with waiting and confirmed resignations apart', async () => {
    const { store } = await members();
    const o = await run(store, new MemberCards(), 'membershipOverview', {});
    expect(o).toMatchObject({ members: 2, resignationsWaitingForBoard: 1, resignationsConfirmed: 0, byStatus: { active: 1, resigning: 1, pending: 1 } });
  });

  it('finds members without giving the model their email, notes or Stripe ids', async () => {
    const { store } = await members();
    const found = await run(store, new MemberCards(), 'findMembers', { query: 'ada@example' });
    expect(found.count).toBe(1);
    const text = JSON.stringify(found);
    expect(text).toContain('Ada Lovelace');
    expect(text).not.toContain('ada@example.com');
    expect(text).not.toContain('private note');
    expect(found.members).toEqual([expect.objectContaining({ status: 'active', paidUntil: '9th January 2027', payment: 'by hand' })]);
  });

  it('puts the resigning members it found on cards, with Confirm while waiting and Undo always', async () => {
    const { store, grace } = await members();
    const cards = new MemberCards();
    await run(store, cards, 'findMembers', { status: 'resigning' });
    await run(store, cards, 'findMembers', { query: 'Ada' });
    expect(cards.list().map((m) => m.id)).toEqual([grace.id]);
    const waiting = JSON.stringify(memberCardBlocks(cards.list()));
    expect(waiting).toContain('grace@example.com');
    expect(waiting).toContain(CONFIRM_RESIGNATION);
    expect(waiting).toContain(`"value":"agent:${grace.id}"`);
    await store.confirmResignation(grace.id, { kind: 'board', id: NADJA });
    const confirmed = JSON.stringify(memberCardBlocks([(await store.get(grace.id))!]));
    expect(confirmed).not.toContain(CONFIRM_RESIGNATION);
    expect(confirmed).toContain(UNDO_RESIGNATION);
  });
});

describe('membership buttons', () => {
  it('reads button values from both kinds of card', () => {
    expect(parseMemberButton('agent:m_1')).toEqual({ memberId: 'm_1', fromAgent: true });
    expect(parseMemberButton('m_1')).toEqual({ memberId: 'm_1', fromAgent: false });
  });

  it('undoes from an agent card, answering in the thread; only approvers may', async () => {
    const { store, grace } = await members();
    const w = world();
    const deps = { env, store, slack: w.slack, origin: 'https://zurichjs.com', fetch: w.fetch, log: () => {} };
    const click = (user: string) => ({ action: UNDO_RESIGNATION, memberId: grace.id, user, channel: CHANNEL, ts: '2.2', threadTs: '2.0', fromAgent: true });
    expect(await handleMembershipClick(click('U-SOMEONE'), deps)).toBe('not_allowed');
    expect((await store.get(grace.id))!.status).toBe('resigning');
    expect(await handleMembershipClick(click(NADJA), deps)).toBe('withdrawn');
    expect((await store.get(grace.id))!.status).toBe('active');
    const reply = w.calls.find((c) => c.method === 'reply')!;
    expect(reply.args.slice(0, 2)).toEqual([CHANNEL, '2.0']);
    expect(String(reply.args[2])).toContain('Resignation undone by <@U08NAFH955M>');
    expect(w.calls.some((c) => c.method === 'update')).toBe(false);
  });

  it('confirms from an agent card without rewriting the agent’s reply', async () => {
    const { store, grace } = await members();
    const w = world();
    const r = await handleMembershipClick(
      { action: CONFIRM_RESIGNATION, memberId: grace.id, user: NADJA, channel: CHANNEL, ts: '3.3', threadTs: '3.0', fromAgent: true },
      { env, store, slack: w.slack, origin: 'https://zurichjs.com', fetch: w.fetch, log: () => {} },
    );
    expect(r).toBe('confirmed');
    expect(w.calls.some((c) => c.method === 'update')).toBe(false);
    expect(String(w.calls.find((c) => c.method === 'reply')!.args[2])).toContain('Confirmed by <@U08NAFH955M>');
  });

  it('ignores buttons pressed in other channels', async () => {
    const { store, grace } = await members();
    const w = world();
    const r = await handleMembershipClick(
      { action: UNDO_RESIGNATION, memberId: grace.id, user: NADJA, channel: 'C-ELSEWHERE', ts: '1' },
      { env, store, slack: w.slack, origin: 'https://zurichjs.com', fetch: w.fetch },
    );
    expect(r).toBe('not_allowed');
  });
});

describe('the local Socket Mode bridge (tools/slack-dev.mjs)', () => {
  const secret = 'dev-signing-secret';

  it('signs events and button presses so the functions accept them', async () => {
    const event = toRequest({ type: 'events_api', envelope_id: 'e1', payload: { type: 'event_callback', event: { type: 'app_mention' } } }, secret)!;
    expect(event.path).toBe('/.netlify/functions/slack-events');
    expect(await verifySlackRequest(new Headers(event.headers), event.body, secret)).toBe(true);
    const click = toRequest({ type: 'interactive', envelope_id: 'e2', payload: { type: 'block_actions', actions: [] } }, secret)!;
    expect(click.path).toBe('/.netlify/functions/slack-interactivity');
    expect(JSON.parse(new URLSearchParams(click.body).get('payload')!)).toEqual({ type: 'block_actions', actions: [] });
    expect(await verifySlackRequest(new Headers(click.headers), click.body, secret)).toBe(true);
    expect(await verifySlackRequest(new Headers(click.headers), click.body, 'another-secret')).toBe(false);
  });

  it('skips envelope kinds the site does not handle', () => {
    expect(toRequest({ type: 'slash_commands', envelope_id: 'e3', payload: {} }, secret)).toBeNull();
    expect(Object.keys(signSlack(secret, '{}'))).toEqual(['x-slack-request-timestamp', 'x-slack-signature']);
  });
});
