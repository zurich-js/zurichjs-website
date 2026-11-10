/**
 * The membership admin area's API: the shared password from
 * MEMBERSHIP_ADMIN_PASSWORD, the signed session cookie, the attempt limit, the
 * same-origin rule for writes, and what signed-in admins can see and do.
 */
import { memoryStore, type MemberStore, type NewMember } from '@zurichjs/membership';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAdminExport } from '../src/pages/api/membership/admin/export.csv.ts';
import { handleImport } from '../src/pages/api/membership/admin/import.ts';
import { handleAdminLogin } from '../src/pages/api/membership/admin/login.ts';
import { handleAdminLogout } from '../src/pages/api/membership/admin/logout.ts';
import { handleAdminMember } from '../src/pages/api/membership/admin/members/[id]/index.ts';
import { handleAdminConfirmResignation } from '../src/pages/api/membership/admin/members/[id]/confirm-resignation.ts';
import { handleAdminUndoResignation } from '../src/pages/api/membership/admin/members/[id]/undo-resignation.ts';
import { handleAdminMembers } from '../src/pages/api/membership/admin/members/index.ts';
import { handleAdminSession } from '../src/pages/api/membership/admin/session.ts';
import { ADMIN_COOKIE, MAX_FAILURES, SESSION_SECONDS, isAdmin, memoryAttempts, signSession, verifySession } from '../src/server/admin-auth.ts';
import { membersCsv } from '../src/server/admin-views.ts';

const PASSWORD = 'correct-horse-battery-staple';
const SITE = 'https://zurichjs.com';
const env = { MEMBERSHIP_ADMIN_PASSWORD: PASSWORD, BETTER_AUTH_URL: SITE, STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_test' };

const login = (password: string, headers: Record<string, string> = { origin: SITE }) =>
  new Request(`${SITE}/api/membership/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-nf-client-connection-ip': '203.0.113.9', ...headers },
    body: JSON.stringify({ password }),
  });

/** A request carrying the admin session cookie (as the browser sends it). */
const asAdmin = (path: string, init: { method?: string; body?: unknown; origin?: string | null; cookie?: string } = {}) =>
  new Request(`${SITE}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      cookie: `${ADMIN_COOKIE}=${init.cookie ?? signSession(PASSWORD)}`,
      ...(init.origin === null ? {} : { origin: init.origin ?? SITE }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

const ada: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: 'ada@example.com',
  level: 'supporter',
  cycle: 'yearly',
  category: 'active',
  status: 'imported_manual',
  source: 'imported',
  joinedAt: '2025-05-23',
  paidUntil: '2027-05-22',
  paymentMode: 'manual',
  notes: '=SUM(A1) paid by Twint',
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('admin sign-in', () => {
  it('is closed when no password (or a short one) is configured', async () => {
    expect((await handleAdminLogin(login('x'), { env: {}, attempts: memoryAttempts() })).status).toBe(503);
    expect((await handleAdminLogin(login('short'), { env: { MEMBERSHIP_ADMIN_PASSWORD: 'short' }, attempts: memoryAttempts() })).status).toBe(503);
    expect(await (await handleAdminSession(asAdmin('/api/membership/admin/session'), {})).json()).toEqual({ ok: true, configured: false, signedIn: false });
  });

  it('sets an httpOnly, SameSite=Strict, Secure session cookie scoped to the admin API for the right password', async () => {
    const res = await handleAdminLogin(login(PASSWORD), { env, attempts: memoryAttempts() });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(
      new RegExp(`^${ADMIN_COOKIE}=v1\\.\\d+\\.[A-Za-z0-9_-]{43}; Path=/api/membership/admin; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}; Secure$`),
    );
    const value = cookie.split(';')[0]!.split('=')[1]!;
    expect(verifySession(value, PASSWORD)).toBe(true);
  });

  it('refuses a wrong password and counts it; after 10 failures even the right one waits', async () => {
    const attempts = memoryAttempts();
    expect((await handleAdminLogin(login('wrong-password-attempt'), { env, attempts })).status).toBe(401);
    for (let i = 1; i < MAX_FAILURES; i++) await handleAdminLogin(login('wrong-password-attempt'), { env, attempts });
    expect(attempts.list.every((a) => a.ip === '203.0.113.9')).toBe(true);
    const blocked = await handleAdminLogin(login(PASSWORD), { env, attempts });
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a sign-in posted from another site', async () => {
    expect((await handleAdminLogin(login(PASSWORD, { origin: 'https://evil.example' }), { env, attempts: memoryAttempts() })).status).toBe(403);
  });

  it('signs out by clearing the cookie', () => {
    expect(handleAdminLogout(asAdmin('/api/membership/admin/logout', { method: 'POST', body: {} })).headers.get('set-cookie')).toMatch(/Max-Age=0/);
  });
});

describe('admin session', () => {
  it('expires, and a new password ends every session', () => {
    const now = Date.parse('2026-11-11T10:00:00Z');
    const value = signSession(PASSWORD, now);
    expect(verifySession(value, PASSWORD, now + 1000)).toBe(true);
    expect(verifySession(value, PASSWORD, now + SESSION_SECONDS * 1000 + 1)).toBe(false);
    expect(verifySession(value, 'a-completely-new-password', now + 1000)).toBe(false);
    expect(
      verifySession(
        value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')),
        PASSWORD,
        now + 1000,
      ),
    ).toBe(false);
  });

  it('accepts the password as a Bearer token for scripts, and nothing else', () => {
    const bearer = (t: string) => new Request(`${SITE}/x`, { headers: { authorization: `Bearer ${t}` } });
    expect(isAdmin(bearer(PASSWORD), env)).toBe(true);
    expect(isAdmin(bearer(`${PASSWORD}x`), env)).toBe(false);
    expect(isAdmin(new Request(`${SITE}/x`), env)).toBe(false);
  });
});

describe('admin API', () => {
  let store: MemberStore;
  let id: string;
  beforeEach(async () => {
    store = memoryStore();
    id = (await store.create(ada, { kind: 'script', id: 't' })).id;
    await store.create(
      {
        ...ada,
        email: 'grace@example.com',
        name: 'Grace Hopper',
        organisationName: 'Acme AG',
        kind: 'organisation',
        status: 'pending',
        source: 'self_serve',
        paidUntil: null,
        paymentMode: 'automatic',
        notes: null,
      },
      { kind: 'member', id: 'u2' },
    );
  });

  it('needs a session for everything', async () => {
    const anon = new Request(`${SITE}/api/membership/admin/members`);
    expect((await handleAdminMembers(anon, { env, store })).status).toBe(401);
    expect((await handleAdminMember(anon, id, { env, store })).status).toBe(401);
    expect((await handleAdminExport(anon, { env, store })).status).toBe(401);
    expect((await handleAdminMembers(asAdmin('/api/membership/admin/members', { cookie: signSession('another-password-entirely') }), { env, store })).status).toBe(401);
  });

  it('lists and searches members, with totals for the overview', async () => {
    const all = (await (await handleAdminMembers(asAdmin('/api/membership/admin/members'), { env, store })).json()) as {
      members: { email: string }[];
      counts: Record<string, number>;
    };
    expect(all.members.map((m) => m.email).sort()).toEqual(['ada@example.com', 'grace@example.com']);
    expect(all.counts).toMatchObject({ members: 1, imported_manual: 1, pending: 1, active: 0 });
    const found = (await (await handleAdminMembers(asAdmin('/api/membership/admin/members?q=acme'), { env, store })).json()) as { members: { email: string }[]; counts: null };
    expect(found.members.map((m) => m.email)).toEqual(['grace@example.com']);
    expect(found.counts).toBeNull();
    const pending = (await (await handleAdminMembers(asAdmin('/api/membership/admin/members?status=pending'), { env, store })).json()) as { members: unknown[] };
    expect(pending.members).toHaveLength(1);
  });

  it('shows one member with terms, certificates and history', async () => {
    await store.acceptTerms(id, '2026-11-10', { kind: 'member', id: 'u1' });
    const body = (await (await handleAdminMember(asAdmin(`/api/membership/admin/members/${id}`), id, { env, store })).json()) as {
      member: { email: string; notes: string };
      termsVersion: string;
      events: { type: string }[];
    };
    expect(body.member).toMatchObject({ email: 'ada@example.com', notes: '=SUM(A1) paid by Twint' });
    expect(body.termsVersion).toBe('2026-11-10');
    expect(body.events.map((e) => e.type)).toEqual(['terms_accepted', 'created']);
    expect((await handleAdminMember(asAdmin('/api/membership/admin/members/nope'), 'nope', { env, store })).status).toBe(404);
  });

  it('confirms a resignation of a member who paid by hand (ends now), and only for resigning members', async () => {
    expect(
      (
        await handleAdminConfirmResignation(asAdmin(`/api/membership/admin/members/${id}/confirm-resignation`, { method: 'POST', body: {} }), id, {
          env,
          store,
          fetch: okFetch(),
          log: () => {},
        })
      ).status,
    ).toBe(409);
    await store.transition(id, { to: 'resigning', actor: { kind: 'member', id: 'u1' } });
    const res = await handleAdminConfirmResignation(asAdmin(`/api/membership/admin/members/${id}/confirm-resignation`, { method: 'POST', body: {} }), id, {
      env,
      store,
      fetch: okFetch(),
      log: () => {},
    });
    expect(res.status).toBe(200);
    expect(await store.get(id)).toMatchObject({ status: 'ended', endedReason: 'resigned' });
    expect((await store.events(id)).at(-1)).toMatchObject({ actor: { kind: 'board', id: 'admin' } });
  });

  it('undoes a resignation for a member who asked the board, back to where they were', async () => {
    const undo = () =>
      handleAdminUndoResignation(asAdmin(`/api/membership/admin/members/${id}/undo-resignation`, { method: 'POST', body: {} }), id, {
        env,
        store,
        fetch: okFetch(),
        log: () => {},
      });
    expect((await undo()).status).toBe(409);
    const before = (await store.get(id))!.status;
    await store.transition(id, { to: 'resigning', actor: { kind: 'member', id: 'u1' } });
    expect((await undo()).status).toBe(200);
    expect((await store.get(id))!.status).toBe(before);
    expect((await store.events(id)).at(-1)).toMatchObject({ actor: { kind: 'board', id: 'admin' }, payload: { undo: true } });
  });

  it('refuses writes from another site (CSRF), even with a valid session', async () => {
    await store.transition(id, { to: 'resigning', actor: { kind: 'member', id: 'u1' } });
    const res = await handleAdminConfirmResignation(asAdmin(`/x`, { method: 'POST', body: {}, origin: 'https://evil.example' }), id, { env, store });
    expect(res.status).toBe(403);
    const noOrigin = await handleImport(asAdmin('/x', { method: 'POST', body: { csv: '' }, origin: null }), { env, store });
    expect(noOrigin.status).toBe(403);
    expect((await store.get(id))!.status).toBe('resigning');
  });

  it('imports from the admin area with the session cookie', async () => {
    const csv = ['kind,name,organisation,email,level,cycle,category,joined_at,paid_until,notes', 'person,Linus,,linus@example.com,basic,quarterly,,,2027-01-01,'].join('\n');
    const res = await handleImport(asAdmin('/api/membership/admin/import', { method: 'POST', body: { csv, apply: true } }), { env, store });
    expect(await res.json()).toMatchObject({ ok: true, applied: true, imported: 1 });
  });

  it('exports CSV, neutralising spreadsheet formulas', async () => {
    const res = await handleAdminExport(asAdmin('/api/membership/admin/export.csv'), { env, store });
    expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="zurichjs-members-\d{4}-\d{2}-\d{2}\.csv"$/);
    const text = await res.text();
    expect(text.split('\r\n')[0]).toBe('name,organisationName,email,levelName,cycle,category,status,paymentMode,joinedAt,paidUntil,source,createdAt');
    expect(text).toContain('Grace Hopper,Acme AG,grace@example.com,Supporter,yearly');
    expect(membersCsv([{ ...(await store.get(id))!, name: '=HYPERLINK("x")' }])).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

/** Stripe (no open invoices) and Resend, answering OK. */
function okFetch() {
  return (async (url: string) => new Response(url.includes('/v1/invoices') ? '{"data":[]}' : '{"id":"e"}')) as unknown as typeof fetch;
}
