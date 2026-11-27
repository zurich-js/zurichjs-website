import { memoryStore, type NewMember } from '@zurichjs/membership';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleChangeEmail } from '../src/pages/api/membership/admin/members/[id]/email.ts';
import { handleCertificate } from '../src/pages/api/membership/certificates/[id].ts';
import { handleMe } from '../src/pages/api/membership/me.ts';
import { ADMIN_COOKIE, signSession } from '../src/server/admin-auth.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';

const PASSWORD = 'correct-horse-battery-staple';
const SITE = 'https://zurichjs.com';
const env = { ADMIN_PASSWORD: PASSWORD, BETTER_AUTH_URL: SITE, STRIPE_SECRET_KEY: 'sk_test_x', RESEND_API_KEY: 're_test' };
const quiet = () => {};

const asAdmin = (path: string, body: unknown) =>
  new Request(`${SITE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: SITE, cookie: `${ADMIN_COOKIE}=${signSession(PASSWORD)}` },
    body: JSON.stringify(body),
  });

const ada: NewMember = {
  kind: 'person',
  name: 'Ada Lovelace',
  organisationName: null,
  email: 'ada@old.example',
  level: 'supporter',
  cycle: 'yearly',
  category: 'passive',
  status: 'imported_manual',
  source: 'imported',
  joinedAt: '2026-05-01',
  paidUntil: '2027-05-01',
  paymentMode: 'manual',
  notes: null,
  userId: 'user-old',
};

function world(opts: { stripeFails?: boolean } = {}) {
  const emails: { to: string[]; subject: string; text: string }[] = [];
  const stripe: { path: string; body: string }[] = [];
  const slackPosts: string[] = [];
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    const path = new URL(url).pathname.replace('/v1/', '');
    stripe.push({ path, body: String(init.body ?? '') });
    if (opts.stripeFails) return new Response('{"error":{"message":"down"}}', { status: 500 });
    if (path === 'customers/cus_ada') return new Response('{"id":"cus_ada"}');
    throw new Error(`unexpected ${url}`);
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
  return { f, emails, stripe, slackPosts, slack };
}

async function setup(opts: Parameters<typeof world>[0] = {}) {
  const w = world(opts);
  const store = memoryStore();
  const m = await store.create(ada, { kind: 'board', id: 'admin' });
  await store.linkStripe(m.id, { customerId: 'cus_ada' }, { kind: 'board', id: 'admin' });
  const change = (email: string) =>
    handleChangeEmail(asAdmin(`/api/membership/admin/members/${m.id}/email`, { email }), m.id, { env, store, fetch: w.f, slack: w.slack, log: quiet });
  const me = async (user: { id: string; email: string }) =>
    (await handleMe(new Request(`${SITE}/api/membership/me`), { env, store, session: async () => user, fetch: w.f })).json();
  return { w, store, m, change, me };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(quiet);
});

describe('the board changes a member’s email', () => {
  it('moves the membership to an address someone proves by signing in with it, and tells both addresses', async () => {
    const { w, store, m, change, me } = await setup();
    const res = await change(' Ada@New.example ');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ stripeUpdated: true, notified: { previous: true, next: true } });
    expect(await store.get(m.id)).toMatchObject({ email: 'ada@new.example', userId: null, status: 'imported_manual' });

    expect((await me({ id: 'user-old', email: 'ada@old.example' })).member).toBeNull();
    expect((await me({ id: 'user-new', email: 'ada@new.example' })).member).toMatchObject({ name: 'Ada Lovelace', status: 'imported_manual' });
    expect((await store.get(m.id))!.userId).toBe('user-new');

    expect(new URLSearchParams(w.stripe.find((c) => c.path === 'customers/cus_ada')!.body).get('email')).toBe('ada@new.example');
    expect(w.emails.map((e) => [e.to[0], e.subject])).toEqual([
      ['ada@old.example', 'The email of your ZurichJS membership changed'],
      ['ada@new.example', 'The email of your ZurichJS membership changed'],
    ]);
    expect(w.emails[0]!.text).toContain('This address no longer opens your membership.');
    const changed = (await store.events(m.id)).find((e) => e.type === 'email_changed')!;
    expect(JSON.stringify(changed.payload)).not.toContain('@');
    expect(w.slackPosts).toEqual([expect.stringMatching(/Email changed by the board: .*\(was ada@old\.example\)/)]);
  });

  it('refuses an address another member has, and nothing changes', async () => {
    const { store, m, change } = await setup();
    await store.create({ ...ada, email: 'grace@example.com', userId: 'user-grace' }, { kind: 'board', id: 'admin' });
    const res = await change('Grace@example.com');
    expect(res.status).toBe(409);
    expect(await store.get(m.id)).toMatchObject({ email: 'ada@old.example', userId: 'user-old' });
  });

  it('refuses an address that is not one, or the same one', async () => {
    const { change } = await setup();
    expect((await change('not an email')).status).toBe(400);
    expect(await (await change('ada@old.example')).json()).toMatchObject({ error: 'That is their email already.', field: 'email' });
  });

  it('keeps the change and the billing update when Stripe is unavailable', async () => {
    const { w, store, m, change } = await setup({ stripeFails: true });
    expect(await (await change('ada@new.example')).json()).toMatchObject({ ok: true, stripeUpdated: false });
    expect((await store.get(m.id))!.email).toBe('ada@new.example');
    expect(w.slackPosts.at(-1)).toContain('Email changed by the board');
    expect((await store.pendingDeliveries(`email-change:${m.id}`)).map((d) => d.payload.kind)).toEqual(['billing-email']);
  });
});

describe('certificates keep who they were issued to', () => {
  it('downloads an old certificate with the name it was issued to after a name change', async () => {
    const { store, m } = await setup();
    const cert = await store.issueCertificate(m.id, { periodStart: '2026-05-01', periodEnd: '2027-05-01', stripeInvoiceId: null }, { kind: 'board', id: 'admin' });
    await store.update(m.id, { name: 'Ada King', kind: 'organisation', organisationName: 'Analytical Engines AG' }, { kind: 'board', id: 'admin' });
    expect((await store.certificates(m.id))[0]).toMatchObject({ id: cert.id, name: 'Ada Lovelace', organisationName: null });
    const res = await handleCertificate(new Request(`${SITE}/api/membership/certificates/${cert.id}`), cert.id, {
      env,
      store,
      session: async () => ({ id: 'user-old', email: 'ada@old.example' }),
      signature: async () => null,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
  });
});
