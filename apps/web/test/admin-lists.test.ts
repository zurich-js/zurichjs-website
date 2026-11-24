/**
 * The admin lists past their row limit (counts over every row, `truncated`), and the admin
 * islands' fetch helper (admin-api.ts): its deadlines, error pages and older browsers.
 */
import { memoryStore as memberMemory, type NewMember } from '@zurichjs/membership';
import { memoryStore as sponsorMemory } from '@zurichjs/sponsorship';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { READ_DEADLINE_MS, UNKNOWN_WRITE, WRITE_DEADLINE_MS, api } from '../src/components/islands/admin-api.ts';
import { handleAdminMembers } from '../src/pages/api/membership/admin/members/index.ts';
import { handleAdminSponsors } from '../src/pages/api/membership/admin/sponsors/index.ts';
import { LIST_LIMIT } from '../src/server/admin-views.ts';

const ADMIN = 'admin-lists-password';
const env = { ADMIN_PASSWORD: ADMIN, BETTER_AUTH_URL: 'https://zurichjs.com' };
const get = (path: string) => new Request(`https://zurichjs.com${path}`, { headers: { authorization: `Bearer ${ADMIN}` } });
const board = { kind: 'board', id: 'admin' } as const;
const OVER = LIST_LIMIT + 20;

describe('admin lists with more rows than they show', () => {
  it('sponsors: counts every sponsorship and says the list stopped', async () => {
    const store = sponsorMemory();
    for (let i = 0; i < OVER; i++)
      await store.create(
        {
          companyName: `Company ${i}`,
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
        { email: `c${i}@company${i}.ch`, name: `C ${i}`, role: 'primary' },
        board,
      );
    const all = (await (await handleAdminSponsors(get('/api/membership/admin/sponsors'), { env, store })).json()) as {
      sponsors: unknown[];
      truncated: boolean;
      counts: Record<string, number>;
    };
    expect(all.sponsors).toHaveLength(LIST_LIMIT);
    expect(all.truncated).toBe(true);
    expect(all.counts).toEqual({ pending: OVER, active: 0, past_due: 0, ending: 0, ended: 0 });
    const some = (await (await handleAdminSponsors(get('/api/membership/admin/sponsors?q=Company%2051'), { env, store })).json()) as { truncated: boolean; counts: unknown };
    expect(some).toMatchObject({ truncated: false, counts: null });
  });

  it('members: the overview counts every member and the list says it stopped', async () => {
    const store = memberMemory();
    const base: NewMember = {
      kind: 'person',
      name: 'M',
      organisationName: null,
      email: 'x@example.com',
      level: 'supporter',
      cycle: 'yearly',
      category: 'active',
      status: 'imported_manual',
      source: 'imported',
      joinedAt: '2025-05-23',
      paidUntil: '2027-05-22',
      paymentMode: 'manual',
      notes: null,
    };
    for (let i = 0; i < OVER; i++) await store.create({ ...base, name: `Member ${i}`, email: `m${i}@example.com` }, { kind: 'script', id: 'test' });
    const body = (await (await handleAdminMembers(get('/api/membership/admin/members'), { env, store })).json()) as {
      members: unknown[];
      truncated: boolean;
      counts: Record<string, number>;
    };
    expect(body.members).toHaveLength(LIST_LIMIT);
    expect(body.truncated).toBe(true);
    expect(body.counts).toMatchObject({ members: OVER, imported_manual: OVER, active: 0 });
  });
});

describe('the admin fetch helper', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  /** A fetch that never answers, and rejects with the reason once its signal aborts. */
  const hang = () =>
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(init.signal!.reason))));

  it('settles with status 0 when the site cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => Promise.reject(new TypeError('Failed to fetch')));
    expect(await api('/api/membership/admin/session')).toEqual({ status: 0, body: { error: 'We couldn’t reach the site. Check your connection and try again.' } });
    expect((await api('/api/membership/admin/invite', { method: 'POST', body: '{}' })).body.error).toMatch(/don’t know whether this was saved/);
  });

  it('reads a platform error page as an empty body with its status', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    expect(await api('/api/membership/admin/session')).toEqual({ status: 502, body: {} });
  });

  it('says a write answered by a platform error page may have been saved', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>504 Gateway Timeout</html>', { status: 504 }));
    expect(await api('/api/membership/admin/members/m1/resign', { method: 'POST', body: '{}' })).toEqual({ status: 504, body: { error: UNKNOWN_WRITE } });
  });

  it('keeps the route’s own sentence on a write error', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ ok: false, error: 'Could not save.' }, { status: 502 }));
    expect((await api('/api/membership/admin/invite', { method: 'POST', body: '{}' })).body.error).toBe('Could not save.');
  });

  it('gives up on a read after READ_DEADLINE_MS and on a write after WRITE_DEADLINE_MS', async () => {
    vi.useFakeTimers();
    hang();
    let read: number | null = null;
    let write: { status: number; error?: string } | null = null;
    void api('/api/membership/admin/members').then((r) => (read = r.status));
    void api('/api/membership/admin/invite', { method: 'POST', body: '{}' }).then((r) => (write = { status: r.status, error: r.body.error }));
    await vi.advanceTimersByTimeAsync(READ_DEADLINE_MS);
    expect(read).toBe(0);
    expect(write).toBeNull();
    await vi.advanceTimersByTimeAsync(WRITE_DEADLINE_MS - READ_DEADLINE_MS);
    expect(write).toMatchObject({ status: 0, error: expect.stringMatching(/don’t know whether this was saved/) });
  });

  it('works in a browser without AbortSignal.timeout or AbortSignal.any', async () => {
    vi.stubGlobal('AbortSignal', Object.assign(Object.create(AbortSignal), { timeout: undefined, any: undefined }));
    vi.stubGlobal('fetch', async () => Response.json({ ok: true, signedIn: true }));
    expect(await api('/api/membership/admin/session')).toEqual({ status: 200, body: { ok: true, signedIn: true } });
  });

  it('passes on an abort of the caller’s own signal', async () => {
    hang();
    const own = new AbortController();
    const pending = api('/api/membership/admin/members', { signal: own.signal });
    own.abort();
    expect((await pending).status).toBe(0);
  });
});
