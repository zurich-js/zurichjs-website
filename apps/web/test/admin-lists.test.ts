/**
 * The admin lists past their row limit: counts cover every row, and the answer says the list
 * stopped (`truncated`). Also the admin islands' fetch helper (admin-api.ts), which always settles.
 */
import { memoryStore as memberMemory, type NewMember } from '@zurichjs/membership';
import { memoryStore as sponsorMemory } from '@zurichjs/sponsorship';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { READ_DEADLINE_MS, api } from '../src/components/islands/admin-api.ts';
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
  afterEach(() => vi.unstubAllGlobals());

  it('settles with status 0 when the site cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => Promise.reject(new TypeError('Failed to fetch')));
    expect(await api('/api/membership/admin/session')).toEqual({ status: 0, body: { error: 'We couldn’t reach the site. Check your connection and try again.' } });
    // A write may have reached the server: the message does not say nothing happened.
    expect((await api('/api/membership/admin/invite', { method: 'POST', body: '{}' })).body.error).toMatch(/don’t know whether this was saved/);
  });

  it('reads a platform error page as an empty body with its status', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>502 Bad Gateway</html>', { status: 502 }));
    expect(await api('/api/membership/admin/session')).toEqual({ status: 502, body: {} });
  });

  it('gives up on a read that never answers, but not on a write', async () => {
    const expire = new AbortController();
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(expire.signal);
    const signals: (AbortSignal | undefined)[] = [];
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      signals.push(init.signal ?? undefined);
      return new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(init.signal!.reason)));
    });
    const read = api('/api/membership/admin/members');
    void api('/api/membership/admin/members', { method: 'POST', body: '{}' });
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(timeout).toHaveBeenCalledWith(READ_DEADLINE_MS);
    expect(signals[1]).toBeUndefined();
    expire.abort();
    expect((await read).status).toBe(0);
    timeout.mockRestore();
  });
});
