import { memoryStore, type MemberStore, type NewMember } from '@zurichjs/membership';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAdminConfirmResignation } from '../src/pages/api/membership/admin/members/[id]/confirm-resignation.ts';
import { handleManualPayment } from '../src/pages/api/membership/admin/members/[id]/manual-payment.ts';
import { handleAdminResign } from '../src/pages/api/membership/admin/members/[id]/resign.ts';
import { handleAddMember, handleAdminMembers } from '../src/pages/api/membership/admin/members/index.ts';
import { handleInvite } from '../src/pages/api/membership/admin/invite.ts';
import { ADMIN_COOKIE, signSession } from '../src/server/admin-auth.ts';
import { membershipDailyCheck } from '../src/server/membership-daily.ts';
import { withdrawResignation } from '../src/server/membership-resignation.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';

const PASSWORD = 'correct-horse-battery-staple';
const SITE = 'https://zurichjs.com';
const env = { ADMIN_PASSWORD: PASSWORD, BETTER_AUTH_URL: SITE, STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_test', FORMS_TO: 'board@example.org' };
const quiet = () => {};

const asAdmin = (path: string, body?: unknown) =>
  new Request(`${SITE}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', origin: SITE, cookie: `${ADMIN_COOKIE}=${signSession(PASSWORD)}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const grace: NewMember = {
  kind: 'person',
  name: 'Grace Hopper',
  organisationName: null,
  email: 'grace@example.com',
  level: 'basic',
  cycle: 'yearly',
  category: 'passive',
  status: 'imported_manual',
  source: 'imported',
  joinedAt: '2026-05-01',
  paidUntil: '2027-05-01',
  paymentMode: 'manual',
  notes: null,
};
const addBody = { kind: 'person', name: 'Grace Hopper', email: 'grace@example.com', level: 'basic', cycle: 'yearly', startMonth: '2026-05', sendEmail: true };

function world(opts: { invoicesFail?: boolean } = {}) {
  const emails: { to: string[]; subject: string; text: string }[] = [];
  const stripe: { method: string; path: string; body: string }[] = [];
  const slackPosts: string[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const method = init.method ?? 'GET';
    stripe.push({ method, path, body: String(init.body ?? u.search) });
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    if (path === 'invoices') return opts.invoicesFail ? new Response('{"error":{"message":"down"}}', { status: 500 }) : ok({ data: [] });
    if (path === 'checkout/sessions' && method === 'GET') return ok({ data: [{ id: 'cs_open', metadata: { source: 'zurichjs.com/membership' } }] });
    if (path === 'checkout/sessions/cs_open/expire') return ok({ id: 'cs_open', status: 'expired' });
    if (path.startsWith('subscriptions/')) return ok({ id: path.split('/')[1], cancel_at: null, items: { data: [] } });
    throw new Error(`unexpected ${method} ${url}`);
  }) as unknown as typeof fetch;
  const slack: MembershipSlack = {
    post: async (text) => {
      slackPosts.push(text);
      return '1';
    },
    update: async () => {},
    reply: async () => {},
    ephemeral: async () => {},
  };
  return { f, emails, stripe, slackPosts, slack, subjects: () => emails.map((e) => e.subject) };
}

function setup(store: MemberStore = memoryStore(), opts: Parameters<typeof world>[0] = {}) {
  const w = world(opts);
  const deps = { env, store, fetch: w.f, slack: w.slack, log: quiet, signature: async () => null };
  return { w, store, deps };
}

const board = { kind: 'board', id: 'admin' } as const;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(quiet);
});

describe('adding a member who paid by cash or bank transfer', () => {
  it('records a former member again on the same record, with a certificate', async () => {
    const { w, store, deps } = setup();
    const old = await store.create({ ...grace, joinedAt: '2024-05-01', paidUntil: '2025-05-01' }, board);
    await store.transition(old.id, { from: 'imported_manual', to: 'ended', actor: board, reason: 'lapsed' });
    const res = await handleAddMember(asAdmin('/api/membership/admin/members', addBody), deps);
    expect(res.status).toBe(200);
    expect(await store.get(old.id)).toMatchObject({ status: 'imported_manual', paidUntil: '2027-05-01', endedReason: null, joinedAt: '2024-05-01' });
    expect((await store.certificates(old.id)).map((c) => c.periodStart)).toEqual(['2026-05-01']);
    expect(w.subjects()).toEqual(['Your ZurichJS membership is now online']);
    expect(w.slackPosts).toEqual([expect.stringMatching(/^:inbox_tray: Recorded again/)]);
  });

  it('records someone whose online joining was never paid, and closes their open Checkout page', async () => {
    const { w, store, deps } = setup();
    const pending = await store.create({ ...grace, status: 'pending', source: 'self_serve', joinedAt: null, paidUntil: null, paymentMode: 'automatic' }, board);
    await store.linkStripe(pending.id, { customerId: 'cus_grace' }, board);
    expect((await handleAddMember(asAdmin('/api/membership/admin/members', addBody), deps)).status).toBe(200);
    expect(await store.get(pending.id)).toMatchObject({ status: 'imported_manual', paymentMode: 'manual', source: 'imported', joinedAt: '2026-05-01' });
    expect(w.stripe.some((c) => c.method === 'POST' && c.path === 'checkout/sessions/cs_open/expire')).toBe(true);
  });

  it('finishes an add that failed after the member was recorded when the board sends it again', async () => {
    const { w, store, deps } = setup();
    let failed = false;
    const flaky: MemberStore = {
      ...store,
      issueCertificate: (...args) => {
        if (failed) return store.issueCertificate(...args);
        failed = true;
        return Promise.reject(new Error('connection terminated'));
      },
    };
    expect((await handleAddMember(asAdmin('/api/membership/admin/members', addBody), { ...deps, store: flaky })).status).toBe(502);
    expect((await handleAddMember(asAdmin('/api/membership/admin/members', addBody), deps)).status).toBe(200);
    const m = (await store.byEmail('grace@example.com'))!;
    expect(await store.certificates(m.id)).toHaveLength(1);
    expect(w.subjects()).toEqual(['Your ZurichJS membership is now online']);
    expect((await handleAddMember(asAdmin('/api/membership/admin/members', addBody), deps)).status).toBe(409);
    expect(await store.certificates(m.id)).toHaveLength(1);
  });

  it('refuses someone who is a member, naming their status and the record', async () => {
    const { store, deps } = setup();
    const m = await store.create({ ...grace, status: 'pending', paymentMode: 'automatic', paidUntil: null }, board);
    await store.transition(m.id, { from: 'pending', to: 'active', actor: { kind: 'stripe', id: 'evt' } });
    const res = await handleAddMember(asAdmin('/api/membership/admin/members', addBody), deps);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      error: 'There is already a record for grace@example.com (Grace Hopper, active). Open it to see or change it.',
      memberId: m.id,
    });
  });
});

describe('recording the next term', () => {
  it('extends paid until, issues and emails the certificate, and refuses the same term twice', async () => {
    const { w, store, deps } = setup();
    const m = await store.create(grace, board);
    const record = () => handleManualPayment(asAdmin(`/api/membership/admin/members/${m.id}/manual-payment`, { startMonth: '2027-05' }), m.id, deps);
    const res = await record();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ certificate: { number: expect.stringMatching(/^ZJS-2027-/) }, emailed: true });
    expect((await store.get(m.id))!.paidUntil).toBe('2028-05-01');
    expect(w.subjects()).toEqual(['Your ZurichJS membership payment is recorded']);
    expect(w.emails[0]!.text).toContain('1st May 2027 to 30th April 2028, paid by cash or bank transfer');
    expect(w.slackPosts).toEqual([expect.stringMatching(/^:moneybag: Payment recorded \(cash\/bank\)/)]);
    const again = await record();
    expect(again.status).toBe(409);
    expect(await store.certificates(m.id)).toHaveLength(1);
  });

  it('never moves paid until back when an earlier term is recorded late', async () => {
    const { store, deps } = setup();
    const m = await store.create({ ...grace, paidUntil: '2029-05-01' }, board);
    await handleManualPayment(asAdmin(`/api/membership/admin/members/${m.id}/manual-payment`, { startMonth: '2027-05', sendEmail: false }), m.id, deps);
    expect((await store.get(m.id))!.paidUntil).toBe('2029-05-01');
  });

  it('is only for members paying by cash or bank transfer', async () => {
    const { store, deps } = setup();
    const m = await store.create({ ...grace, status: 'pending', paymentMode: 'automatic', paidUntil: null }, board);
    const res = await handleManualPayment(asAdmin(`/api/membership/admin/members/${m.id}/manual-payment`, { startMonth: '2027-05' }), m.id, deps);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Only a membership paid by cash or bank transfer can be recorded here. This one is waiting for the first payment.');
  });
});

describe('resignations the board handles', () => {
  it('keeps a confirmed manual resignation running to its paid-until day, then the daily check ends it', async () => {
    const { w, store, deps } = setup();
    const m = await store.create(grace, board);
    await handleAdminResign(asAdmin(`/api/membership/admin/members/${m.id}/resign`, {}), m.id, deps);
    const res = await handleAdminConfirmResignation(asAdmin(`/api/membership/admin/members/${m.id}/confirm-resignation`, {}), m.id, deps);
    expect(await res.json()).toMatchObject({ lastPaidDay: '30th April 2027' });
    expect(w.emails.at(-1)!.text).toContain('Your membership ends on 30th April 2027');
    expect((await store.get(m.id))!.status).toBe('resigning');

    expect(await membershipDailyCheck({ ...deps, now: () => new Date('2027-04-30T12:00:00+02:00') })).toEqual({ ended: 0 });
    expect(await membershipDailyCheck({ ...deps, now: () => new Date('2027-05-01T08:00:00+02:00') })).toEqual({ ended: 1 });
    expect(await store.get(m.id)).toMatchObject({ status: 'ended', endedReason: 'resigned' });
    expect(w.slackPosts.at(-1)).toMatch(/Resignation took effect: .*Grace Hopper.*paid term ended on 30th April 2027/);
  });

  it('ends a confirmed manual resignation at once when its paid term is already over', async () => {
    const { store, deps } = setup();
    const m = await store.create({ ...grace, paidUntil: '2025-05-01' }, board);
    await handleAdminResign(asAdmin(`/api/membership/admin/members/${m.id}/resign`, {}), m.id, deps);
    await handleAdminConfirmResignation(asAdmin(`/api/membership/admin/members/${m.id}/confirm-resignation`, {}), m.id, deps);
    expect((await store.get(m.id))!.status).toBe('ended');
  });

  it('never ends a manual membership whose paid term ran out unpaid (the board decides)', async () => {
    const { store, deps } = setup();
    const m = await store.create({ ...grace, paidUntil: '2025-05-01' }, board);
    expect(await membershipDailyCheck(deps)).toEqual({ ended: 0 });
    expect((await store.get(m.id))!.status).toBe('imported_manual');
  });

  it('tells a member the board recorded their resignation, not that they resigned on the account page', async () => {
    const { w, store, deps } = setup();
    const m = await store.create(grace, board);
    await handleAdminResign(asAdmin(`/api/membership/admin/members/${m.id}/resign`, {}), m.id, deps);
    const copy = w.emails.find((e) => e.subject === 'We received your resignation')!;
    expect(copy.text).toContain('The board recorded your resignation from the Swiss JavaScript Group.');
    expect(copy.text).not.toContain('You resigned');
  });

  it('says the open invoices are unknown when Stripe does not answer', async () => {
    const { w, store, deps } = setup(memoryStore(), { invoicesFail: true });
    const m = await store.create({ ...grace, status: 'pending', paymentMode: 'automatic', paidUntil: null }, board);
    await store.linkStripe(m.id, { customerId: 'cus_grace' }, board);
    await store.transition(m.id, { from: 'pending', to: 'active', actor: { kind: 'stripe', id: 'evt' } });
    await handleAdminResign(asAdmin(`/api/membership/admin/members/${m.id}/resign`, {}), m.id, deps);
    const notice = w.emails.find((e) => e.subject === 'Resignation from Grace Hopper')!;
    expect(notice.text).toMatch(/Open invoices:?\s+Could not check Stripe/i);
    expect(notice.text).not.toMatch(/Open invoices:?\s+None/i);
  });

  it('stops the renewal again when an undo is refused because the membership changed meanwhile', async () => {
    const { w, store } = setup();
    const m = await store.create({ ...grace, status: 'pending', paymentMode: 'automatic', paidUntil: '2027-05-01' }, board);
    await store.linkStripe(m.id, { customerId: 'cus_grace', subscriptionId: 'sub_grace' }, board);
    await store.transition(m.id, { from: 'pending', to: 'active', actor: { kind: 'stripe', id: 'evt' } });
    await store.transition(m.id, { from: 'active', to: 'resigning', actor: board });
    const racing: MemberStore = {
      ...store,
      transition: async (id, input) => {
        if (input.from === 'resigning' && input.to !== 'ended')
          await store.transition(id, { from: 'resigning', to: 'ended', actor: { kind: 'stripe', id: 'evt_del' }, reason: 'resigned' });
        return store.transition(id, input);
      },
    };
    const r = await withdrawResignation(m.id, board, { env, store: racing, origin: SITE, fetch: w.f, log: quiet });
    expect(r.result).toBe('not_resigning');
    const cancels = w.stripe.filter((c) => c.path === 'subscriptions/sub_grace').map((c) => new URLSearchParams(c.body).get('cancel_at_period_end'));
    expect(cancels).toEqual([]);
    expect((await store.get(m.id))?.status).toBe('ended');
  });
});

describe('the board inviting a former member', () => {
  it('opens their record again as an invitation to finish joining', async () => {
    const { w, store, deps } = setup();
    const old = await store.create(grace, board);
    await store.transition(old.id, { from: 'imported_manual', to: 'ended', actor: board, reason: 'lapsed' });
    const res = await handleInvite(
      asAdmin('/api/membership/admin/invite', { kind: 'person', name: 'Grace Hopper', email: 'grace@example.com', level: 'supporter', cycle: 'yearly' }),
      deps,
    );
    expect(await res.json()).toMatchObject({ result: 'reinvited' });
    expect(await store.get(old.id)).toMatchObject({ status: 'pending', source: 'invited', level: 'supporter' });
    expect(w.subjects()).toEqual(['Your invitation to join ZurichJS']);
  });
});

describe('the overview counts', () => {
  it('counts every member, not only the 500 the list shows', async () => {
    const { store, deps } = setup();
    for (let i = 0; i < 520; i++) await store.create({ ...grace, email: `m${i}@example.com` }, board);
    const body = await (await handleAdminMembers(asAdmin('/api/membership/admin/members'), deps)).json();
    expect(body.members).toHaveLength(500);
    expect(body.counts).toMatchObject({ members: 520, imported_manual: 520, active: 0 });
  });
});
