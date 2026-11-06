import { memoryStore, type Member, type MemberStore, type NewMember } from '@zurichjs/membership';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleApply, parseApplication } from '../src/pages/api/membership/apply.ts';
import { APPROVE, REJECT, decide, reviewCard, type MembershipSlack, type SlackBlock } from '../src/server/membership-review.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const NADJA = 'U08NAFH955M';
const CHANNEL = 'CMEMBERS';
const env = {
  SUPABASE_URL: 'https://abc.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  RESEND_API_KEY: 're_test',
  SLACK_MEMBERSHIP_APPROVER_IDS: `${NADJA},U08NDGCRYPK,U08MMPMNLKZ`,
  SLACK_MEMBERSHIP_CHANNEL_ID: CHANNEL,
};
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';

/** Records Slack calls; `fail` makes post throw (Slack down or not set up). */
function fakeSlack(fail = false) {
  const calls: { method: string; args: unknown[] }[] = [];
  const slack: MembershipSlack = {
    post: async (text, blocks) => {
      calls.push({ method: 'post', args: [text, blocks] });
      if (fail) throw new Error('channel_not_found');
      return '1700000000.000100';
    },
    update: async (...args) => void calls.push({ method: 'update', args }),
    ephemeral: async (...args) => void calls.push({ method: 'ephemeral', args }),
  };
  return { slack, calls };
}

/** Supabase auth (/auth/v1/user) for one user, and Resend; records the emails. */
function fakeFetch(user = { id: 'u1', email: 'ada@example.com', email_confirmed_at: '2026-11-06T09:00:00Z' }) {
  const emails: Record<string, unknown>[] = [];
  const f = (async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/v1/user')) return new Response(JSON.stringify(user), { status: 200 });
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e1"}', { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as unknown as typeof fetch;
  return { f, emails };
}

const applyReq = (data: Record<string, unknown>) =>
  new Request('https://zurichjs.com/api/membership/apply', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(data),
  });

const application = { name: 'Ada Lovelace', level: 'supporter', cycle: 'yearly', message: 'Me & my team come to every meetup' };

const applicant: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: 'ada@example.com',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'applied',
  source: 'self_serve',
  joinedAt: null,
  paidUntil: null,
  paymentMode: 'automatic',
  notes: null,
  authUserId: 'u1',
};

const text = (blocks: SlackBlock[]) => JSON.stringify(blocks);

beforeEach(() => {
  resetRateLimits();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('parseApplication', () => {
  it.each([
    [{ ...application, kind: 'company' }, 'kind'],
    [{ ...application, name: '' }, 'name'],
    [{ ...application, kind: 'organisation' }, 'organisationName'],
    [{ ...application, level: 'advocate' }, 'level'],
    [{ ...application, cycle: 'monthly' }, 'cycle'],
    [{ ...application, message: 'x'.repeat(1001) }, 'message'],
    [{ ...application, name: '<b>Ada</b>' }, 'name'],
  ])('refuses %j (%s)', (body, field) => {
    expect(parseApplication(body)).toMatchObject({ ok: false, field });
  });

  it('drops the organisation name for a person', () => {
    expect(parseApplication({ ...application, organisationName: 'Acme' })).toMatchObject({ ok: true, data: { kind: 'person', organisationName: null } });
  });
});

describe('POST /api/membership/apply', () => {
  it('creates the request, posts the Slack card, and emails a copy; nothing else', async () => {
    const store = memoryStore();
    const { slack, calls } = fakeSlack();
    const { f, emails } = fakeFetch();
    const res = await handleApply(applyReq(application), { env, fetch: f, store, slack, log: () => {} });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { member: Member }).member).toMatchObject({ status: 'applied', statusLabel: 'waiting for approval', levelName: 'Supporter' });

    const m = (await store.byEmail('ada@example.com'))!;
    expect(m).toMatchObject({ status: 'applied', source: 'self_serve', authUserId: 'u1', paymentMode: 'automatic', category: 'passive', notes: null });
    // The message is in Slack only (escaped), never in the database.
    expect(JSON.stringify(m)).not.toContain('every meetup');
    expect(calls).toHaveLength(1);
    expect(text(calls[0]!.args[1] as SlackBlock[])).toContain('Me &amp; my team come to every meetup');
    expect(emails).toHaveLength(1);
    expect(emails[0]).toMatchObject({ to: ['ada@example.com'], subject: 'We received your ZurichJS membership request' });
    expect(String(emails[0]!.text)).toContain('Fee: CHF 250 a year');
  });

  it('refuses a second request while one is open', async () => {
    const store = memoryStore();
    const { f } = fakeFetch();
    await handleApply(applyReq(application), { env, fetch: f, store, slack: fakeSlack().slack, log: () => {} });
    const again = await handleApply(applyReq(application), { env, fetch: f, store, slack: fakeSlack().slack, log: () => {} });
    expect(again.status).toBe(409);
    expect(((await again.json()) as { error: string }).error).toBe('Your request is already with the organisers.');
  });

  it('refuses someone who is already a member', async () => {
    const store = memoryStore();
    await store.create({ ...applicant, status: 'imported_manual', source: 'imported', paidUntil: '2027-01-01', paymentMode: 'manual' }, { kind: 'script', id: 't' });
    const res = await handleApply(applyReq(application), { env, fetch: fakeFetch().f, store, slack: fakeSlack().slack, log: () => {} });
    expect(res.status).toBe(409);
  });

  it('re-opens a declined request with the new choices, on the same record', async () => {
    const store = memoryStore();
    const old = await store.create(applicant, { kind: 'member', id: 'u1' });
    await store.transition(old.id, { to: 'rejected', actor: { kind: 'board', id: NADJA } });
    const res = await handleApply(applyReq({ ...application, kind: 'organisation', organisationName: 'Acme AG', level: 'basic', cycle: 'quarterly' }), {
      env,
      fetch: fakeFetch().f,
      store,
      slack: fakeSlack().slack,
      log: () => {},
    });
    expect(res.status).toBe(200);
    expect(await store.get(old.id)).toMatchObject({ status: 'applied', kind: 'organisation', organisationName: 'Acme AG', level: 'basic', cycle: 'quarterly' });
    expect((await store.events(old.id)).map((e) => e.toStatus).filter(Boolean)).toEqual(['applied', 'rejected', 'applied']);
  });

  it('still takes the request when Slack fails, and emails the organisers instead', async () => {
    const store = memoryStore();
    const lines: string[] = [];
    const { f, emails } = fakeFetch();
    // The organisers' fallback uses the shared sendEmail (global fetch): keep it off the network.
    vi.stubGlobal('fetch', f);
    try {
      const res = await handleApply(applyReq(application), { env, fetch: f, store, slack: fakeSlack(true).slack, log: (l) => lines.push(l) });
      expect(res.status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(lines.some((l) => l.includes('review card') && l.includes('not posted'))).toBe(true);
    const fallback = emails.find((e) => String(e.subject).startsWith('Membership request from Ada Lovelace (not in Slack)'))!;
    expect(fallback).toMatchObject({ to: ['hello@zurichjs.com'], reply_to: 'ada@example.com' });
    expect(String(fallback.text)).toContain('pnpm membership:review');
    expect(String(fallback.text)).toContain('Message: Me & my team come to every meetup');
    expect(emails.map((e) => e.subject)).toContain('We received your ZurichJS membership request');
  });

  it('answers 401 when not signed in and 429 after 3 requests in 10 minutes', async () => {
    const anon = new Request('https://zurichjs.com/api/membership/apply', { method: 'POST', body: '{}' });
    expect((await handleApply(anon, { env, store: memoryStore() })).status).toBe(401);
    for (let i = 0; i < 2; i++) await handleApply(anon, { env, store: memoryStore() });
    expect((await handleApply(anon, { env, store: memoryStore() })).status).toBe(429);
  });
});

describe('Slack review card', () => {
  it('asks to confirm a rejection, and never shows buttons without the member id', async () => {
    const store = memoryStore();
    const m = await store.create(applicant, { kind: 'member', id: 'u1' });
    const card = reviewCard(m, 'Hi');
    const actions = card.blocks.find((b) => b.type === 'actions') as unknown as { elements: { action_id: string; value: string; confirm?: unknown }[] };
    expect(actions.elements.map((e) => [e.action_id, e.value])).toEqual([
      [APPROVE, m.id],
      [REJECT, m.id],
    ]);
    expect(actions.elements[1]!.confirm).toBeDefined();
    expect(actions.elements[0]!.confirm).toBeUndefined();
  });
});

describe('decide (Approve / Reject in Slack)', () => {
  let store: MemberStore;
  let member: Member;
  const now = () => new Date('2026-11-06T10:00:00Z');
  const click = (action: typeof APPROVE | typeof REJECT, user = NADJA) => ({ action, memberId: member.id, user, channel: CHANNEL, ts: '1700000000.000100' });

  beforeEach(async () => {
    store = memoryStore();
    member = await store.create(applicant, { kind: 'member', id: 'u1' });
  });

  it('approves: updates the record with who did it, replaces the buttons, and emails the member', async () => {
    const { slack, calls } = fakeSlack();
    const { f, emails } = fakeFetch();
    expect(await decide(click(APPROVE), { env, store, slack, origin: 'https://zurichjs.com', fetch: f, now })).toBe('approved');
    expect((await store.get(member.id))!.status).toBe('approved');
    expect((await store.events(member.id)).at(-1)).toMatchObject({ toStatus: 'approved', actor: { kind: 'board', id: NADJA }, payload: { slackTs: '1700000000.000100' } });
    const update = calls.find((c) => c.method === 'update')!;
    expect(text(update.args[3] as SlackBlock[])).toContain(`Approved by <@${NADJA}> on 6 November 2026.`);
    expect(text(update.args[3] as SlackBlock[])).not.toContain('"actions"');
    expect(emails[0]).toMatchObject({ to: ['ada@example.com'], subject: 'Your ZurichJS membership is approved' });
  });

  it('rejects with the neutral email', async () => {
    const { f, emails } = fakeFetch();
    expect(await decide(click(REJECT), { env, store, slack: fakeSlack().slack, origin: 'https://zurichjs.com', fetch: f, now })).toBe('rejected');
    expect(emails[0]!.subject).toBe('Your ZurichJS membership request');
  });

  it('lets only the approvers decide, and tells others privately', async () => {
    const { slack, calls } = fakeSlack();
    expect(await decide(click(APPROVE, 'U-SOMEONE-ELSE'), { env, store, slack, origin: 'https://zurichjs.com', fetch: fakeFetch().f })).toBe('not_allowed');
    expect((await store.get(member.id))!.status).toBe('applied');
    expect(calls).toEqual([{ method: 'ephemeral', args: [CHANNEL, 'U-SOMEONE-ELSE', expect.stringContaining(`<@${NADJA}>`)] }]);
  });

  it('ignores clicks from another channel', async () => {
    expect(await decide({ ...click(APPROVE), channel: 'C-OTHER' }, { env, store, slack: fakeSlack().slack, origin: 'https://zurichjs.com' })).toBe('not_allowed');
    expect((await store.get(member.id))!.status).toBe('applied');
  });

  it('refuses a second decision (double click, or two approvers at once) and sends one email', async () => {
    const { f, emails } = fakeFetch();
    await decide(click(APPROVE), { env, store, slack: fakeSlack().slack, origin: 'https://zurichjs.com', fetch: f, now });
    const second = fakeSlack();
    expect(await decide(click(REJECT, 'U08NDGCRYPK'), { env, store, slack: second.slack, origin: 'https://zurichjs.com', fetch: f, now })).toBe('already_decided');
    expect((await store.get(member.id))!.status).toBe('approved');
    expect(second.calls[0]!.args[2]).toBe('This request was already handled (it is now approved). Nothing changed.');
    expect(emails).toHaveLength(1);
  });

  it('tells the approver when the email failed, after recording the decision', async () => {
    const { slack, calls } = fakeSlack();
    const failing = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    expect(await decide(click(APPROVE), { env, store, slack, origin: 'https://zurichjs.com', fetch: failing, now, log: () => {} })).toBe('approved');
    expect(calls.at(-1)!.args[2]).toBe('Approved, but the email to ada@example.com failed. Please write to them by hand.');
  });
});
