/**
 * Time limits that keep a request inside Netlify's 60 s and a scheduled run inside its 30 s:
 * the database pool (db-url.ts DB_TIMEOUTS), the shared fetch deadline (deadline.ts) and the
 * daily sponsorship check's budget (sponsor-daily.ts).
 */
import net from 'node:net';
import { memoryStore } from '@zurichjs/sponsorship';
import { afterAll, describe, expect, it } from 'vitest';
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
    await expect(deadline(50).fetch(hang)('https://api.stripe.com/v1/prices')).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1_000);
  });
});

describe('the daily sponsorship check under a time budget', () => {
  it('starts no sponsor once too little time is left, and names the ones left for the next run', async () => {
    const store = memoryStore();
    const board = { kind: 'board', id: 'admin' } as const;
    for (const companyName of ['A AG', 'B AG'])
      await store.create(
        {
          companyName,
          legalName: null,
          billingAddress: null,
          vatId: null,
          website: null,
          tier: 'friend',
          cycle: 'monthly',
          paymentMode: 'card',
          status: 'pending',
          source: 'invited',
          startedAt: null,
          paidUntil: null,
          pricePerMeetup: null,
          notes: null,
        },
        { email: `${companyName[0]}@example.org`, name: 'C', role: 'primary' },
        board,
      );
    const budget = deadline(PER_SPONSOR_MS - 1);
    const result = await dailyCheck({ ...lifecycleDeps({}, store, SITE, {}), deadline: budget });
    expect(result.deferred).toHaveLength(2);
  });
});
