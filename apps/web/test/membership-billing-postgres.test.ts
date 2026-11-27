import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { postgresStore, type Member, type MemberStore, type Queryable } from '@zurichjs/membership';
import { startPg } from '../../../packages/membership/test/pg.ts';
import { processMembershipEvent } from '../src/pages/api/membership/webhook.ts';
import { addManualMember, recordManualPayment } from '../src/server/membership-manual.ts';
import { confirmResignation, withdrawResignation } from '../src/server/membership-resignation.ts';
import { membershipDailyCheck } from '../src/server/membership-daily.ts';
import { createCheckout, MEMBERSHIP_SOURCE } from '../src/server/membership-stripe.ts';
import type { StripeEvent } from '../src/server/stripe-webhook.ts';

const db = startPg();
const migrations = join(import.meta.dirname, '../database/migrations');
describe.skipIf(!db)('membership payments on Postgres', () => {
  let pool: pg.Pool;
  let store: MemberStore;
  beforeAll(() => {
    for (const name of readdirSync(migrations).sort()) db!.sql(readFileSync(join(migrations, name), 'utf8'));
    pool = new pg.Pool({ ...db!.connection, max: 8, query_timeout: 10000 });
    store = postgresStore(pool);
  });
  afterAll(async () => {
    await pool.end();
    db!.stop();
  });

  async function member(status: Member['status'] = 'pending') {
    return store.create(
      {
        name: 'Local fixture',
        email: `${crypto.randomUUID()}@example.invalid`,
        kind: 'person',
        organisationName: null,
        level: 'supporter',
        cycle: 'yearly',
        category: 'passive',
        status,
        source: 'self_serve',
        paidUntil: null,
        joinedAt: null,
        paymentMode: 'automatic',
        notes: null,
      },
      { kind: 'board', id: 'fixture' },
    );
  }
  const event = (type: string, object: Record<string, unknown>): StripeEvent => ({ id: `evt_${crypto.randomUUID()}`, type, data: { object } });
  const meta = (m: Member) => ({ source: MEMBERSHIP_SOURCE, memberId: m.id });
  const invoice = (m: Member, sub: string, year = 2026) => ({
    id: `in_${crypto.randomUUID()}`,
    amount_paid: 25000,
    lines: { data: [{ period: { start: Date.UTC(year, 0) / 1000, end: Date.UTC(year + 1, 0) / 1000 } }] },
    parent: { subscription_details: { subscription: sub, metadata: meta(m) } },
  });
  function fixture() {
    const emails: string[] = [];
    const renewals: string[] = [];
    const sessions = new Map<string, { id: string; url: string }>();
    const fail = { mail: false, board: false };
    const post = vi.fn(async () => {
      if (fail.board) throw new Error('Offline board fixture');
      return '1';
    });
    const f: typeof fetch = async (input, init) => {
      const u = new URL(String(input));
      if (u.hostname === 'api.resend.com') {
        if (fail.mail) return new Response('Unavailable', { status: 503 });
        emails.push(JSON.parse(String(init?.body)).subject);
        return Response.json({ id: 'fixture' });
      }
      if (u.hostname !== 'api.stripe.com') throw new Error('Unexpected transport');
      const path = u.pathname.replace('/v1/', '');
      if (path === 'checkout/sessions' && init?.method === 'POST') {
        const key = new Headers(init.headers).get('idempotency-key');
        if (!key) throw new Error('Missing attempt key');
        const id = `cs_${sessions.size + 1}`;
        const session = sessions.get(key) ?? { id, url: `https://fixture.invalid/${id}` };
        sessions.set(key, session);
        return Response.json(session);
      }
      if (path === 'subscriptions' || path === 'checkout/sessions') return Response.json({ data: [] });
      if (path === 'prices') return Response.json({ data: [{ id: 'price_fixture' }] });
      if (path === 'customers') return Response.json({ id: `cus_${crypto.randomUUID()}` });
      if (path.startsWith('subscriptions/') && init?.method === 'POST') renewals.push(new URLSearchParams(String(init.body)).get('cancel_at_period_end')!);
      if (path === 'invoices') return Response.json({ data: [] });
      if (path.startsWith('subscriptions/')) return Response.json({ status: 'active', items: { data: [{ price: { lookup_key: 'member_supporter_yearly' } }] } });
      throw new Error(`Unexpected fixture path ${path}`);
    };
    const deps = {
      env: { STRIPE_SECRET_KEY: 'sk_test_fixture', RESEND_API_KEY: 're_fixture' },
      fetch: f,
      store,
      slack: { post, update: vi.fn(), reply: vi.fn(), ephemeral: vi.fn() },
      signature: async () => null,
    };
    const send = async (e: StripeEvent, dbStore = store) => (await processMembershipEvent(e, { ...deps, store: dbStore })).status;
    return { emails, sessions, fail, post, deps, send, renewals };
  }
  it('uses one Checkout and classifies competing invoices under the member lock', async () => {
    const w = fixture(),
      m = await member();
    const open = () => createCheckout(m, store, 'https://fixture.invalid', w.deps);
    const urls = await Promise.all([open(), open()]);
    expect(new Set(urls).size).toBe(1);
    expect(w.sessions.size).toBe(1);
    const pay = (sub: string) => w.send(event('invoice.paid', invoice(m, sub)));
    expect(await Promise.all([pay('sub_a'), pay('sub_b')])).toEqual([200, 200]);
    expect(await store.certificates(m.id)).toHaveLength(1);
    expect(w.emails).toEqual(['Welcome to the Swiss JavaScript Group']);
    expect(w.post).toHaveBeenCalledWith(expect.stringContaining('paid a second subscription'));
    const sub = (await store.get(m.id))!.stripeSubscriptionId!;
    const later = invoice(m, sub, 2028),
      earlier = invoice(m, sub, 2027);
    await Promise.all([w.send(event('invoice.paid', later)), w.send(event('invoice.paid', earlier))]);
    await w.send(event('invoice.payment_failed', later));
    await w.send(
      event('customer.subscription.updated', { id: sub, metadata: meta(m), status: 'past_due', items: { data: [{ price: { lookup_key: 'member_basic_quarterly' } }] } }),
    );
    expect(await store.get(m.id)).toMatchObject({ status: 'active', paidUntil: '2029-01-01', level: 'supporter', cycle: 'yearly' });
  });
  it('records both charges for a term, issues one certificate and preserves the invoice owner', async () => {
    const w = fixture();
    const payer = await member('active');
    const other = await member('active');
    const first = invoice(payer, 'sub_term');
    const second = invoice(payer, 'sub_term');
    expect(await Promise.all([w.send(event('invoice.paid', first)), w.send(event('invoice.paid', second))])).toEqual([200, 200]);
    expect(await store.certificates(payer.id)).toHaveLength(1);
    expect(w.emails).toHaveLength(1);
    expect(w.post).toHaveBeenCalledWith(expect.stringContaining('Reconcile both payments'));
    const renewal = invoice(payer, 'sub_term', 2027);
    expect(await w.send(event('invoice.payment_failed', renewal))).toBe(200);
    const otherInvoice = { ...invoice(other, 'sub_other', 2027), id: renewal.id };
    expect(await w.send(event('invoice.paid', otherInvoice))).toBe(200);
    expect(await store.certificates(other.id)).toHaveLength(0);
    expect(await store.get(other.id)).toMatchObject({ paidUntil: null, stripeSubscriptionId: null });
    expect(w.post).toHaveBeenCalledWith(expect.stringContaining('Check the owner'));
    expect(await Promise.all([w.send(event('invoice.paid', renewal)), w.send(event('invoice.payment_failed', renewal))])).toEqual([200, 200]);
    expect(await store.get(payer.id)).toMatchObject({ status: 'active', paidUntil: '2028-01-01' });
    expect(await store.certificates(payer.id)).toHaveLength(2);
  });
  it('recovers a lost Checkout response and uses a fresh attempt after Stripe forgets the key', async () => {
    const w = fixture(),
      m = await member();
    let now = Date.UTC(2026, 0, 1),
      loseResponse = true;
    const keys: string[] = [];
    const f: typeof fetch = async (input, init) => {
      const response = await w.deps.fetch(input, init);
      if (String(input).endsWith('/checkout/sessions') && init?.method === 'POST') {
        keys.push(new Headers(init.headers).get('idempotency-key')!);
        if (loseResponse) {
          loseResponse = false;
          throw new Error('Checkout response lost');
        }
      }
      return response;
    };
    const open = () => createCheckout(m, store, 'https://fixture.invalid', { ...w.deps, fetch: f, now: () => new Date(now) });
    await expect(open()).rejects.toThrow();
    const prior = (await store.checkoutAttempt(m.id))!;
    expect(prior.url).toBeNull();
    expect(await Promise.all([open(), open()])).toEqual(['https://fixture.invalid/cs_1', 'https://fixture.invalid/cs_1']);
    expect(new Set(keys).size).toBe(1);
    now += 25 * 60 * 60 * 1000;
    expect(prior.expiresAt * 1000).toBeLessThan(now);
    w.sessions.clear();
    await open();
    expect(new Set(keys).size).toBe(2);
    expect((await store.checkoutAttempt(m.id))?.id).not.toBe(prior.id);
  });
  it('finishes only outstanding deliveries after provider recovery', async () => {
    const m = await member();
    const w = fixture();
    const paid = event('invoice.paid', invoice(m, 'sub_mail'));
    w.fail.mail = true;
    expect(await w.send(paid)).toBe(500);
    w.fail.mail = false;
    expect(await w.send(paid)).toBe(200);
    expect(w.emails).toHaveLength(1);
    expect(w.post).toHaveBeenCalledTimes(1);
    expect(await store.certificates(m.id)).toHaveLength(1);
    await store.linkStripe(m.id, { customerId: 'cus_refund' }, { kind: 'board', id: 'fixture' });
    const refund = event('charge.refunded', { id: 'ch_fixture', customer: 'cus_refund', amount_refunded: 25000 });
    w.fail.board = true;
    expect(await w.send(refund)).toBe(500);
    w.fail.board = false;
    expect(await w.send(refund)).toBe(200);
    expect((await store.events(m.id)).filter((e) => e.type === 'payment_refunded')).toHaveLength(1);
    expect(w.post).toHaveReturnedTimes(3);
  });
  it('records a manual term once and finishes undelivered notices on retry', async () => {
    const w = fixture();
    const deps = { ...w.deps, origin: 'https://fixture.invalid' };
    const paid = await addManualMember(
      {
        kind: 'person',
        name: 'Manual fixture',
        email: 'manual@example.invalid',
        organisationName: null,
        level: 'basic',
        cycle: 'yearly',
        category: 'passive',
        notes: null,
        startMonth: '2026-01',
        sendEmail: false,
      },
      deps,
    );
    const m = paid.member;
    w.fail.mail = true;
    const record = () => recordManualPayment(m.id, { startMonth: '2027-01', sendEmail: true }, deps);
    expect((await Promise.all([record(), record()])).map((r) => r.result).sort()).toEqual(['exists', 'recorded']);
    w.fail.mail = false;
    await record();
    expect(await store.certificates(m.id)).toHaveLength(2);
    expect(w.emails).toHaveLength(1);
    expect(w.post).toHaveBeenCalledTimes(2);
    await w.send(event('invoice.paid', invoice(m, 'sub_mixed', 2027)));
    expect(await store.certificates(m.id)).toHaveLength(2);
    expect((await store.events(m.id)).filter((r) => r.type === 'manual_payment_overlap')).toHaveLength(1);
    expect(w.post).toHaveBeenCalledWith(expect.stringContaining('Reconcile both payments'));
  });
  it('keeps a former member ended when the board re-enters a term already paid by card', async () => {
    const w = fixture();
    const m = await member();
    const paid = invoice(m, 'sub_readmission', 2027);
    expect(await w.send(event('invoice.paid', paid))).toBe(200);
    await store.transition(m.id, { from: 'active', to: 'ended', reason: 'resigned', actor: { kind: 'board', id: 'fixture' } });
    const enter = () => addManualMember({ ...m, startMonth: '2027-01', sendEmail: true }, { ...w.deps, origin: 'https://fixture.invalid' });
    const results = await Promise.all([enter(), enter()]);
    expect(results.map((r) => r.result)).toEqual(['exists', 'exists']);
    expect(await store.get(m.id)).toMatchObject({ status: 'ended', paidUntil: '2028-01-01' });
    expect(await store.certificates(m.id)).toHaveLength(1);
    expect((await store.events(m.id)).filter((e) => e.type === 'manual_payment_overlap')).toHaveLength(1);
    expect(w.post).toHaveBeenCalledTimes(2);
    expect(w.emails).toHaveLength(1);
  });
  it('retires a former subscription and ends confirmed manual resignations outside the list limit', async () => {
    const w = fixture(),
      original = await member('active'),
      actor = { kind: 'board', id: 'fixture' } as const;
    const deps = { ...w.deps, origin: 'https://fixture.invalid' };
    await store.linkStripe(original.id, { subscriptionId: 'sub_retired' }, actor);
    await store.transition(original.id, { from: 'active', to: 'ended', reason: 'lapsed', actor });
    const added = await addManualMember({ ...original, startMonth: '2027-01', sendEmail: false }, deps);
    expect(added.member.stripeSubscriptionId).toBeNull();
    await w.send(event('invoice.paid', invoice(original, 'sub_retired', 2029)));
    expect(await store.get(original.id)).toMatchObject({ status: 'imported_manual', paidUntil: '2028-01-01' });
    await store.transition(original.id, { from: 'imported_manual', to: 'resigning', actor });
    await confirmResignation(original.id, 'fixture', { ...deps, reference: 'fixture', now: () => new Date('2027-03-01') });
    await pool.query(`insert into members(email,name,level,cycle,category,status,source,payment_mode,created_at)
       select 'future-'||g||'@example.invalid','Fixture','basic','yearly','passive','resigning','imported','manual',now()-interval '1 year' from generate_series(1,501) g`);
    expect((await store.byStatus('resigning')).some((m) => m.id === original.id)).toBe(false);
    expect(await membershipDailyCheck({ ...deps, now: () => new Date('2028-01-01T12:00:00Z') })).toEqual({ ended: 1 });
    expect(await store.get(original.id)).toMatchObject({ status: 'ended', endedReason: 'resigned' });
  });
  it('finishes add, confirmation, withdrawal and daily notices after their committed responses are lost', async () => {
    const w = fixture(),
      deps = { ...w.deps, origin: 'https://fixture.invalid' },
      actor = { kind: 'board', id: 'fixture' } as const;
    function loseFirstCommit(): MemberStore {
      let lose = true;
      return {
        ...store,
        async transaction(work) {
          const result = await store.transaction(work);
          if (lose) {
            lose = false;
            throw new Error('Lost committed response');
          }
          return result;
        },
      };
    }
    const input = {
      kind: 'person',
      name: 'Recovery fixture',
      email: 'recover@example.invalid',
      organisationName: null,
      level: 'basic',
      cycle: 'yearly',
      category: 'passive',
      notes: null,
      startMonth: '2030-01',
      sendEmail: true,
    } as const;
    await expect(addManualMember(input, { ...deps, store: loseFirstCommit() })).rejects.toThrow('Lost committed response');
    const { member: m } = await addManualMember(input, deps);
    expect(await store.certificates(m.id)).toHaveLength(1);
    expect(w.emails).toHaveLength(1);
    await store.transition(m.id, { from: 'imported_manual', to: 'resigning', actor });
    const confirm = { ...deps, reference: 'fixture', now: () => new Date('2030-06-01') };
    await expect(confirmResignation(m.id, 'admin', { ...confirm, store: loseFirstCommit() })).rejects.toThrow('Lost committed response');
    await confirmResignation(m.id, 'admin', confirm);
    expect(w.emails).toHaveLength(2);
    await expect(withdrawResignation(m.id, actor, { ...deps, store: loseFirstCommit() })).rejects.toThrow('Lost committed response');
    await withdrawResignation(m.id, actor, deps);
    expect(w.emails).toHaveLength(4);
    await store.transition(m.id, { from: 'imported_manual', to: 'resigning', actor });
    await confirmResignation(m.id, 'admin', confirm);
    const before = w.post.mock.calls.length,
      daily = { ...deps, now: () => new Date('2032-01-01') };
    await expect(membershipDailyCheck({ ...daily, store: loseFirstCommit() })).rejects.toThrow('Lost committed response');
    expect((await store.get(m.id))?.status).toBe('ended');
    await membershipDailyCheck(daily);
    expect(w.post.mock.calls.length).toBe(before + 1);
  });
  it('concurrent withdrawals leave billing renewed', async () => {
    const w = fixture(),
      m = await member('active'),
      actor = { kind: 'board', id: 'fixture' } as const;
    await store.linkStripe(m.id, { subscriptionId: 'sub_undo' }, actor);
    await store.transition(m.id, { from: 'active', to: 'resigning', actor });
    const undo = () => withdrawResignation(m.id, actor, { ...w.deps, origin: 'https://fixture.invalid' });
    expect((await Promise.all([undo(), undo()])).map((r) => r.result).sort()).toEqual(['not_resigning', 'withdrawn']);
    expect(w.renewals).toEqual(['false']);
    expect((await store.get(m.id))?.status).toBe('active');
  });
  it('resumes both lapse notices after the client misses the committed result for ten seconds', async () => {
    const m = await member('active');
    const w = fixture();
    const end = event('customer.subscription.deleted', { id: 'sub_lapse', metadata: meta(m) });
    let commitStarted!: () => void;
    const observer = new Promise<void>((resolve) => {
      commitStarted = resolve;
    });
    let timedOut = false;
    const transport = {
      totalCount: 0,
      query: pool.query.bind(pool),
      async connect() {
        const client = await pool.connect();
        const stream = (client as unknown as { connection: { stream: NodeJS.ReadableStream } }).connection.stream;
        return {
          release: (destroy?: boolean) => client.release(destroy),
          async query(sql: string, params?: unknown[]) {
            if (sql !== 'commit' || timedOut) return client.query(sql, params);
            stream.pause();
            commitStarted();
            try {
              return await client.query(sql, params);
            } catch (error) {
              timedOut = error instanceof Error && error.message === 'Query read timeout';
              throw error;
            } finally {
              stream.resume();
            }
          },
        };
      },
    };
    const first = w.send(end, postgresStore(transport as Queryable));
    await observer;
    await vi.waitFor(async () => expect((await store.get(m.id))?.status).toBe('ended'));
    expect(w.emails).toHaveLength(0);
    expect(await first).toBe(500);
    expect(timedOut).toBe(true);
    expect(await w.send(end)).toBe(200);
    expect(await w.send(end)).toBe(200);
    expect(w.emails).toEqual(['Your ZurichJS membership has ended']);
    expect(w.post).toHaveBeenCalledTimes(1);
  }, 25000);
});
