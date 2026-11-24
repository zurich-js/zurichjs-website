/**
 * The database pool's per-query limits (db-url.ts DB_TIMEOUTS), the shared fetch deadline
 * (deadline.ts), the sponsorship routes that use it, and the daily sponsorship check's budget
 * (sponsor-daily.ts).
 */
import net from 'node:net';
import { memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { handleSponsorMe } from '../src/pages/api/sponsorship/me.ts';
import { handleAdminMembers } from '../src/pages/api/membership/admin/members/index.ts';
import { ADMIN_COOKIE, signSession } from '../src/server/admin-auth.ts';
import { DeadlineExceeded, deadline } from '../src/server/deadline.ts';
import { dailyCheck, PER_SPONSOR_MS } from '../src/server/sponsor-daily.ts';
import { lifecycleDeps } from '../src/server/sponsor-route.ts';

const PASSWORD = 'correct-horse-battery-staple';
const SITE = 'https://zurichjs.com';

describe('a database that accepts the connection and never answers', () => {
  const sockets: net.Socket[] = [];
  const server = net.createServer((socket) => void sockets.push(socket.on('error', () => {})));
  afterAll(() => {
    for (const s of sockets) s.destroy();
    server.close();
  });

  it('fails the admin request with its own 502 within the connect limit', async () => {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as net.AddressInfo;
    const env = { ADMIN_PASSWORD: PASSWORD, BETTER_AUTH_URL: SITE, MEMBERSHIP_DB_URL: `postgres://u:p@127.0.0.1:${port}/db` };
    const request = new Request(`${SITE}/api/membership/admin/members`, { headers: { cookie: `${ADMIN_COOKIE}=${signSession(PASSWORD)}` } });
    const started = Date.now();
    const error = console.error;
    console.error = () => {};
    const res = await handleAdminMembers(request, { env }).finally(() => (console.error = error));
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'Could not load the members. Try again; details are in the function log.' });
    expect(Date.now() - started).toBeLessThan(7_000);
  }, 15_000);
});

describe('the fetch deadline', () => {
  it('shares one budget across calls and sends nothing once it has passed', async () => {
    let now = 0;
    const budget = deadline(1_000, () => now);
    const sent: string[] = [];
    const f = budget.fetch((async (url: string, init?: RequestInit) => {
      sent.push(url);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Response('{}');
    }) as typeof fetch);
    await f('https://api.stripe.com/v1/customers', { method: 'POST' });
    now = 1_000;
    await expect(f('https://api.resend.com/emails', { method: 'POST' })).rejects.toBeInstanceOf(DeadlineExceeded);
    expect(sent).toEqual(['https://api.stripe.com/v1/customers']);
  });

  it('aborts a call still waiting when the budget runs out', async () => {
    const hang = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))) as typeof fetch;
    const started = Date.now();
    await expect(deadline(50).fetch(hang)('https://api.stripe.com/v1/prices')).rejects.toBeInstanceOf(DeadlineExceeded);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('keeps the abort signal of a Request passed without init', async () => {
    const f = deadline(50_000).fetch((async (_input: RequestInfo | URL, init?: RequestInit) => Response.json({ aborted: init?.signal?.aborted })) as typeof fetch);
    const request = new Request('https://api.stripe.com/v1/prices', { signal: AbortSignal.abort() });
    expect(await (await f(request)).json()).toEqual({ aborted: true });
  });
});

describe('sponsorship route callbacks', () => {
  afterEach(() => vi.restoreAllMocks());

  it('make no Stripe call once the request budget is used up', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(0);
    const user = { id: 'usr_1', email: 'grace@example.org' };
    const contact = { id: 'c1', sponsorId: 's1', userId: user.id, name: 'Grace', email: user.email, role: 'primary' };
    const sponsor = { id: 's1', companyName: 'A AG', cycle: 'yearly', tier: 'friend', status: 'active', paymentMode: 'card', stripeSubscriptionId: 'sub_1' };
    const store = {
      contactByUser: async () => contact,
      get: async () => sponsor,
      contacts: async () => [contact],
      agreements: async () => [],
      logos: async () => [],
      documents: async () => [],
      meetups: async () => [],
      events: async () => [],
    } as unknown as SponsorStore;
    const stripe = vi.fn(async () => Response.json({}));
    const res = await handleSponsorMe(new Request(`${SITE}/api/sponsorship/me`), {
      store,
      env: { STRIPE_SECRET_KEY: 'sk_test_x' },
      fetch: stripe as unknown as typeof fetch,
      session: async () => {
        clock.mockReturnValue(51_000);
        return user as never;
      },
    });
    expect(res.status).toBe(200);
    expect(stripe).not.toHaveBeenCalled();
  });
});

describe('the daily sponsorship check under a time budget', () => {
  const board = { kind: 'board', id: 'admin' } as const;
  const TODAY = new Date('2026-11-24T08:00:00Z');
  const sponsor = (companyName: string, over: Record<string, unknown> = {}) => ({
    companyName,
    legalName: null,
    billingAddress: null,
    vatId: null,
    website: null,
    tier: 'friend' as const,
    cycle: 'once' as const,
    paymentMode: 'card' as const,
    status: 'pending' as const,
    source: 'invited' as const,
    startedAt: null,
    paidUntil: null,
    pricePerMeetup: null,
    notes: null,
    ...over,
  });
  /** A store whose meetup reads move the clock by `readMs`, and sponsors made in the given order (the newest is listed first). */
  async function slowStore(readMs: number, clock: { ms: number }) {
    const store = memoryStore();
    const add = async (name: string, over: Record<string, unknown> = {}, meetupDate = '2027-01-13') => {
      const { sponsor: s } = await store.create(sponsor(name, over), { email: `${name.replace(/\W/g, '')}@example.org`, name: 'C', role: 'primary' }, board);
      await store.setMeetups(s.id, [{ eventId: `ev-${name}`, title: 'Meetup', date: meetupDate }], board);
      return s;
    };
    const read: string[] = [];
    const slow: SponsorStore = {
      ...store,
      meetups: async (id) => {
        read.push(id);
        clock.ms += readMs;
        return store.meetups(id);
      },
    };
    return { store, slow, add, read };
  }
  const run = (slow: SponsorStore, clock: { ms: number }, day = TODAY, env: Record<string, string> = {}, fetch?: typeof globalThis.fetch) => {
    clock.ms = 0;
    const budget = deadline(25_000, () => clock.ms);
    return dailyCheck({
      ...lifecycleDeps(env, slow, SITE, {
        fetch: budget.fetch(fetch),
        slack: { post: async () => '1.1', update: async () => {}, reply: async () => {}, ephemeral: async () => {} },
        now: () => day,
      }),
      deadline: budget,
    });
  };

  it('starts no sponsor once too little time is left, and names the ones left for the next run', async () => {
    const clock = { ms: 0 };
    const { slow, add } = await slowStore(0, clock);
    await add('A AG');
    await add('B AG');
    const budget = deadline(PER_SPONSOR_MS - 1);
    const result = await dailyCheck({ ...lifecycleDeps({}, slow, SITE, {}), deadline: budget });
    expect(result.deferred).toHaveLength(2);
  });

  it('ends what is due from the row alone before reading the meetups of unpaid sponsorships', async () => {
    const clock = { ms: 0 };
    const { store, slow, add } = await slowStore(6_000, clock);
    const done = await add('Done AG', { status: 'active', paidUntil: '2026-11-20' }, '2026-11-19');
    for (const name of ['New 1', 'New 2', 'New 3']) await add(name);
    const result = await run(slow, clock);
    expect(result.completed).toBe(1);
    expect(await store.get(done.id)).toMatchObject({ status: 'ended', endedReason: 'completed' });
  });

  it('starts the unpaid ones at a different sponsor each day, so slow reads cannot hold back the same one', async () => {
    const clock = { ms: 0 };
    const { slow, add, read } = await slowStore(9_000, clock);
    const ids = [(await add('U1')).id, (await add('U2')).id, (await add('U3')).id];
    for (const day of ['2026-11-24', '2026-11-25', '2026-11-26']) {
      const result = await run(slow, clock, new Date(`${day}T08:00:00Z`));
      expect(result.deferred).toHaveLength(1);
    }
    expect(new Set(read)).toEqual(new Set(ids));
  });

  it('does not end an unpaid sponsorship when its meetup read left too little time to close its payment page', async () => {
    const clock = { ms: 0 };
    const { store, slow, add } = await slowStore(18_000, clock);
    const s = await add('Late AG', {}, '2026-11-10');
    await store.linkStripe(s.id, { checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open', paymentLinkUrl: 'https://buy.stripe.com/x' }, board);
    const stripe = vi.fn(async () => Response.json({}));
    const result = await run(slow, clock, TODAY, { STRIPE_SECRET_KEY: 'sk_test_x' }, stripe as unknown as typeof fetch);
    expect(result).toMatchObject({ closed: 0, deferred: [s.id] });
    expect(stripe).not.toHaveBeenCalled();
    expect(await store.get(s.id)).toMatchObject({ status: 'pending', checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open' });
  });

  it('sends a reminder the budget deferred on the next run, once', async () => {
    const clock = { ms: 0 };
    const { store, add } = await slowStore(0, clock);
    for (const name of ['Done 1', 'Done 2', 'Done 3']) await add(name, { status: 'active', paidUntil: '2026-11-20' }, '2026-11-19');
    await add('Bank AG', { cycle: 'monthly', status: 'active', paymentMode: 'manual', source: 'imported', startedAt: '2026-10-24', paidUntil: '2026-12-24' });
    const slowEnds: SponsorStore = { ...store, transition: async (id, input) => ((clock.ms += 7_000), store.transition(id, input)) };
    const posts: string[] = [];
    const runWith = (day: string) => {
      clock.ms = 0;
      const budget = deadline(25_000, () => clock.ms);
      const slack = { post: async (t: string) => (posts.push(t), '1.1'), update: async () => {}, reply: async () => {}, ephemeral: async () => {} };
      return dailyCheck({ ...lifecycleDeps({}, slowEnds, SITE, { fetch: budget.fetch(), slack, now: () => new Date(`${day}T08:00:00Z`) }), deadline: budget });
    };
    expect(await runWith('2026-11-24')).toMatchObject({ completed: 3, deferred: [expect.any(String)] });
    expect(await runWith('2026-11-25')).toMatchObject({ reminded: 1 });
    await runWith('2026-11-26');
    expect(posts.filter((p) => p.includes(':calendar:'))).toEqual([expect.stringContaining('29 days left')]);
  });

  it('keeps the ids of a close Stripe refused, and closes them on a later run', async () => {
    const clock = { ms: 0 };
    const { store, slow, add } = await slowStore(0, clock);
    const s = await add('Down AG', {}, '2026-11-10');
    await store.linkStripe(s.id, { checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open', paymentLinkUrl: 'https://buy.stripe.com/x' }, board);
    const down = (async () => Response.json({ error: { message: 'unavailable' } }, { status: 503 })) as typeof fetch;
    const up = (async () => Response.json({})) as typeof fetch;
    expect(await run(slow, clock, TODAY, { STRIPE_SECRET_KEY: 'sk_test_x' }, down)).toMatchObject({ closed: 1, stripeOpen: [s.id] });
    expect(await store.get(s.id)).toMatchObject({ status: 'ended', checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open' });
    expect(await run(slow, clock, new Date('2026-11-25T08:00:00Z'), { STRIPE_SECRET_KEY: 'sk_test_x' }, up)).toMatchObject({ stripeClosed: 1, stripeOpen: [] });
    expect(await store.get(s.id)).toMatchObject({ checkoutSessionId: null, paymentLinkId: null });
  });

  it('keeps the Stripe ids and reports the sponsor when the budget cuts off its close', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    try {
      const clock = { ms: 0 };
      const { store, slow, add } = await slowStore(0, clock);
      const s = await add('Cut AG', {}, '2026-11-10');
      await store.linkStripe(s.id, { checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open', paymentLinkUrl: 'https://buy.stripe.com/x' }, board);
      const hang = ((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason)))) as typeof fetch;
      const pending = run(slow, clock, TODAY, { STRIPE_SECRET_KEY: 'sk_test_x' }, hang);
      await vi.advanceTimersByTimeAsync(25_000);
      const result = await pending;
      expect(result).toMatchObject({ closed: 1, stripeOpen: [s.id] });
      expect(await store.get(s.id)).toMatchObject({ status: 'ended', checkoutSessionId: 'cs_open', paymentLinkId: 'plink_open' });
    } finally {
      vi.useRealTimers();
    }
  });
});
