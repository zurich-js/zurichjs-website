import { memoryStore, type NewMember } from '@zurichjs/membership';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAuthEmail, redirectFor, verifyLink } from '../src/pages/api/membership/auth-email.ts';
import { handleMe } from '../src/pages/api/membership/me.ts';
import { signWebhook, verifyWebhook, webhookKey } from '../src/server/standard-webhooks.ts';

// A secret in Supabase's format: "v1,whsec_" + base64 of 32 bytes.
const SECRET = `v1,whsec_${Buffer.alloc(32, 7).toString('base64')}`;
const NOW = Date.parse('2026-11-06T10:00:00Z');
const ts = Math.floor(NOW / 1000);

const hookBody = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    user: { id: 'u1', email: 'ada@example.com' },
    email_data: {
      token: '123456',
      token_hash: 'abc123',
      redirect_to: 'https://zurichjs.com/membership/account',
      email_action_type: 'magiclink',
      site_url: 'https://zurichjs.com',
      ...over,
    },
  });

const hookReq = (body: string, { id = 'msg_1', t = ts, secret = SECRET, sig }: { id?: string; t?: number; secret?: string; sig?: string } = {}) =>
  new Request('https://zurichjs.com/api/membership/auth-email', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(t), 'webhook-signature': sig ?? signWebhook(id, t, body, secret) },
    body,
  });

describe('Standard Webhooks signatures', () => {
  const body = '{"a":1}';
  const headers = (sig: string, t = ts) => new Headers({ 'webhook-id': 'msg_1', 'webhook-timestamp': String(t), 'webhook-signature': sig });

  it('accepts a valid signature, also among several', () => {
    const sig = signWebhook('msg_1', ts, body, SECRET);
    expect(verifyWebhook(body, headers(sig), SECRET, NOW)).toBe(true);
    expect(verifyWebhook(body, headers(`v1,AAAA ${sig}`), SECRET, NOW)).toBe(true);
    // The same secret without the "v1," prefix works too.
    expect(verifyWebhook(body, headers(sig), SECRET.slice(3), NOW)).toBe(true);
  });

  it('refuses a changed body, an old or future timestamp, another secret, or no secret', () => {
    const sig = signWebhook('msg_1', ts, body, SECRET);
    expect(verifyWebhook('{"a":2}', headers(sig), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(body, headers(signWebhook('msg_1', ts - 301, body, SECRET), ts - 301), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(body, headers(signWebhook('msg_1', ts + 301, body, SECRET), ts + 301), SECRET, NOW)).toBe(false);
    expect(verifyWebhook(body, headers(sig), `v1,whsec_${Buffer.alloc(32, 8).toString('base64')}`, NOW)).toBe(false);
    expect(verifyWebhook(body, headers(sig), undefined, NOW)).toBe(false);
    expect(webhookKey('v1,whsec_short')).toBeNull();
  });
});

describe('POST /api/membership/auth-email (Supabase Send Email Hook)', () => {
  const env = { SUPABASE_AUTH_HOOK_SECRET: SECRET, SUPABASE_URL: 'https://abc.supabase.co', RESEND_API_KEY: 're_test' };
  let sent: { headers: Record<string, string>; body: Record<string, unknown> }[];
  const fakeFetch = (status = 200) =>
    (async (_url: string, init: RequestInit) => {
      sent.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      return new Response('{"id":"e1"}', { status });
    }) as unknown as typeof fetch;

  beforeEach(() => {
    sent = [];
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('sends the ZurichJS sign-in email with the Supabase verification link', async () => {
    const body = hookBody();
    const res = await handleAuthEmail(hookReq(body), { env, fetch: fakeFetch(), now: NOW, log: () => {} });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{}');
    expect(sent).toHaveLength(1);
    const email = sent[0]!.body;
    expect(email).toMatchObject({ to: ['ada@example.com'], subject: 'Your ZurichJS sign-in link', from: 'ZurichJS <hello@zurichjs.com>' });
    const link = 'https://abc.supabase.co/auth/v1/verify?token=abc123&type=magiclink&redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount';
    expect(email.text).toContain(link);
    expect(sent[0]!.headers['idempotency-key']).toBe('auth-email:msg_1');
  });

  it('welcomes a first sign-in (signup) with the signup link type', async () => {
    await handleAuthEmail(hookReq(hookBody({ email_action_type: 'signup' })), { env, fetch: fakeFetch(), now: NOW, log: () => {} });
    expect(sent[0]!.body.text).toMatch(/^Welcome to your ZurichJS account/);
    expect(sent[0]!.body.text).toContain('type=signup');
  });

  it('refuses a bad signature, and anything that is not a sign-in email', async () => {
    const body = hookBody();
    expect((await handleAuthEmail(hookReq(body, { sig: 'v1,AAAA' }), { env, fetch: fakeFetch(), now: NOW })).status).toBe(401);
    const recovery = await handleAuthEmail(hookReq(hookBody({ email_action_type: 'recovery' })), { env, fetch: fakeFetch(), now: NOW, log: () => {} });
    expect(recovery.status).toBe(400);
    expect(await recovery.json()).toEqual({ error: { http_code: 400, message: 'Only sign-in links are sent for member accounts.' } });
    expect(sent).toHaveLength(0);
  });

  // Supabase checks redirect_to against its Redirect URLs list (that is where origins are controlled) and
  // site_url is its own signed setting. The hook only makes sure the link leads to the account page.
  it('only links back to /membership/account', async () => {
    await handleAuthEmail(hookReq(hookBody({ redirect_to: 'https://zurichjs.com/donate' })), { env, fetch: fakeFetch(), now: NOW, log: () => {} });
    expect(sent[0]!.body.text).toContain('redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount');
    const res = await handleAuthEmail(hookReq(hookBody({ redirect_to: 'ftp://zurichjs.com/membership/account', site_url: '' })), { env, fetch: fakeFetch(), now: NOW });
    expect(res.status).toBe(400);
    expect(redirectFor('https://evil.example/', 'https://zurichjs.com')).toBe('https://zurichjs.com/membership/account');
    expect(redirectFor('javascript:alert(1)', undefined)).toBeNull();
    expect(redirectFor('http://localhost:4321/membership/account', undefined)).toBe('http://localhost:4321/membership/account');
    expect(verifyLink('https://abc.supabase.co/', 'h', 'magiclink', 'https://zurichjs.com/membership/account')).toBe(
      'https://abc.supabase.co/auth/v1/verify?token=h&type=magiclink&redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount',
    );
  });

  it('tells Supabase when the email could not be sent, so the sign-in shows as failed', async () => {
    const res = await handleAuthEmail(hookReq(hookBody()), { env, fetch: fakeFetch(500), now: NOW, log: () => {} });
    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('refuses everything without the hook secret, and stubs the email without a Resend key', async () => {
    const lines: string[] = [];
    expect((await handleAuthEmail(hookReq(hookBody()), { env: { SUPABASE_URL: env.SUPABASE_URL }, now: NOW, log: (l) => lines.push(l) })).status).toBe(500);
    const stub = await handleAuthEmail(hookReq(hookBody()), { env: { ...env, RESEND_API_KEY: undefined }, fetch: fakeFetch(), now: NOW, log: (l) => lines.push(l) });
    expect(stub.status).toBe(200);
    expect(sent).toHaveLength(0);
    expect(lines.at(-1)).toBe('[email] RESEND_API_KEY missing; not sent to ***@example.com: Your ZurichJS sign-in link');
  });
});

describe('GET /api/membership/me', () => {
  const env = { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' };
  const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
  const me = (token?: string) => new Request('https://zurichjs.com/api/membership/me', { headers: token ? { authorization: `Bearer ${token}` } : {} });
  const authFetch = (user: Record<string, unknown> | null, status = 200) =>
    (async (url: string, init: RequestInit) => {
      expect(url).toBe('https://abc.supabase.co/auth/v1/user');
      expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${TOKEN}`);
      return new Response(JSON.stringify(user ?? { msg: 'invalid JWT' }), { status: user ? status : 401 });
    }) as unknown as typeof fetch;
  const imported: NewMember = {
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
    paidUntil: '2026-05-22',
    paymentMode: 'manual',
    notes: 'Paid by Twint',
  };

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('answers 401 without a token or with an expired one', async () => {
    expect((await handleMe(me(), { env })).status).toBe(401);
    expect((await handleMe(me(TOKEN), { env, fetch: authFetch(null), store: memoryStore() })).status).toBe(401);
  });

  it('answers 401 for an unconfirmed email', async () => {
    const res = await handleMe(me(TOKEN), { env, fetch: authFetch({ id: 'u1', email: 'ada@example.com', email_confirmed_at: null }), store: memoryStore() });
    expect(res.status).toBe(401);
  });

  it('links an imported member on the first sign-in, and shows only member-facing fields', async () => {
    const store = memoryStore();
    const m = await store.create(imported, { kind: 'script', id: 'import' });
    const res = await handleMe(me(TOKEN), { env, fetch: authFetch({ id: 'u1', email: 'Ada@Example.com', email_confirmed_at: '2026-11-06T09:00:00Z' }), store });
    const body = (await res.json()) as { member: Record<string, unknown>; email: string };
    expect(res.status).toBe(200);
    expect(body.email).toBe('ada@example.com');
    expect(body.member).toEqual({
      name: 'Ada Lovelace',
      organisationName: null,
      level: 'supporter',
      levelName: 'Supporter',
      cycle: 'yearly',
      category: 'active',
      status: 'imported_manual',
      statusLabel: 'paid by hand',
      paidUntil: '2026-05-22',
      paymentMode: 'manual',
      joinedAt: '2025-05-23',
    });
    expect((await store.get(m.id))?.authUserId).toBe('u1');
    expect((await store.events(m.id)).at(-1)).toMatchObject({ type: 'updated', actor: { kind: 'member', id: 'u1' } });
  });

  it('never hands a record linked to another account to a new sign-in with the same email', async () => {
    const store = memoryStore();
    await store.create({ ...imported, authUserId: 'u-original' }, { kind: 'script', id: 'import' });
    const res = await handleMe(me(TOKEN), { env, fetch: authFetch({ id: 'u-new', email: 'ada@example.com', email_confirmed_at: '2026-11-06T09:00:00Z' }), store });
    expect(((await res.json()) as { member: unknown }).member).toBeNull();
  });

  it('answers null for someone who is not a member', async () => {
    const res = await handleMe(me(TOKEN), { env, fetch: authFetch({ id: 'u2', email: 'new@example.com', email_confirmed_at: '2026-11-06T09:00:00Z' }), store: memoryStore() });
    expect(await res.json()).toEqual({ ok: true, email: 'new@example.com', member: null, canApply: true });
  });

  it('answers 503 when member accounts are not configured', async () => {
    expect((await handleMe(me(TOKEN), { env: {} })).status).toBe(503);
  });
});
