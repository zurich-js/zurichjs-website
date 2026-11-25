/**
 * Test helpers for sponsorship failures half-way: Stripe and Resend faked at fetch with state
 * (live subscriptions, active payment links, open Checkout sessions) and "the next n calls fail",
 * and an in-memory store whose next n calls of one method throw (a database or network error).
 * Resend is modelled as documented (resend.com/docs/dashboard/emails/idempotency-keys): the same
 * key with the same body replays the first answer and sends nothing; a different body is a 409.
 * Stripe's idempotency keys the same way (docs.stripe.com/api/idempotent_requests): a POST with a
 * key seen before replays its first answer (a different body is a 400). `loseNext` makes Stripe do
 * the call and then lose the answer (a timeout after Stripe acted).
 * From the sponsorship audit's harness (24th November 2026).
 */
import { createHmac } from 'node:crypto';
import { memoryStore, type NewSponsor, type SponsorStore } from '@zurichjs/sponsorship';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import type { LogoStore } from '../src/server/sponsor-logo.ts';

export const ADMIN = 'admin-password-for-tests';
export const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_MEMBER_PORTAL_CONFIG: 'bpc_members',
  STRIPE_WEBHOOK_SECRET: 'whsec_sponsor_test',
  RESEND_API_KEY: 're_test',
  SLACK_SPONSORSHIP_CHANNEL_ID: 'CSPONSORS',
  BETTER_AUTH_URL: 'https://zurichjs.com',
  ADMIN_PASSWORD: ADMIN,
};
export const NOW = new Date('2026-11-18T10:00:00Z');
export const MEETUPS = [
  { id: 'event-dec', title: 'ZurichJS Meetup December', date: '2026-12-09' },
  { id: 'event-jan', title: 'ZurichJS Meetup January', date: '2027-01-13' },
];
export const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);

export interface Delivered {
  to: string[];
  subject: string;
  text: string;
  key: string | null;
}

export function world() {
  const calls: { method: string; path: string; params: URLSearchParams }[] = [];
  const emails: Delivered[] = [];
  const resendAttempts: { key: string | null; status: number }[] = [];
  const idem = new Map<string, string>();
  const live = new Set<string>();
  const activeLinks = new Set<string>();
  const openSessions = new Set<string>();
  const failures: { method: string; re: RegExp; n: number; status: number }[] = [];
  const subscriptionStatus = new Map<string, string>();
  let emailFailures = 0;
  const losses: { method: string; re: RegExp; n: number }[] = [];
  const stripeIdem = new Map<string, { body: string; status: number; text: Promise<string> }>();
  let n = 0;

  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      if (emailFailures > 0) {
        emailFailures--;
        return new Response('{"name":"internal_server_error"}', { status: 500 });
      }
      const body = String(init.body);
      const key = (init.headers as Record<string, string> | undefined)?.['idempotency-key'] ?? null;
      if (key && idem.has(key)) {
        const same = idem.get(key) === body;
        resendAttempts.push({ key, status: same ? 200 : 409 });
        return same ? new Response('{"id":"replayed"}', { headers: { 'idempotent-replayed': 'true' } }) : new Response('{"name":"invalid_idempotent_request"}', { status: 409 });
      }
      if (key) idem.set(key, body);
      const parsed = JSON.parse(body) as { to: string[]; subject: string; text: string };
      emails.push({ to: parsed.to, subject: parsed.subject, text: parsed.text, key });
      resendAttempts.push({ key, status: 200 });
      return new Response('{"id":"e"}');
    }
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const method = init.method ?? 'GET';
    const params = new URLSearchParams(method === 'POST' ? String(init.body ?? '') : u.search);
    calls.push({ method, path, params });
    const failure = failures.find((x) => x.n > 0 && x.method === method && x.re.test(path));
    if (failure) {
      failure.n--;
      return new Response(JSON.stringify({ error: { message: 'Injected failure (api_connection_error)' } }), { status: failure.status });
    }
    const key = method === 'POST' ? ((init.headers as Record<string, string> | undefined)?.['idempotency-key'] ?? null) : null;
    const seen = key ? stripeIdem.get(key) : undefined;
    if (seen)
      return seen.body === String(init.body ?? '')
        ? new Response(await seen.text, { status: seen.status, headers: { 'idempotent-replayed': 'true' } })
        : new Response(JSON.stringify({ error: { message: 'Keys for idempotent requests can only be used with the same parameters' } }), { status: 400 });
    const res = stripe(method, path, params);
    if (key) stripeIdem.set(key, { body: String(init.body ?? ''), status: res.status, text: res.clone().text() });
    const loss = losses.find((x) => x.n > 0 && x.method === method && x.re.test(path));
    if (loss) {
      loss.n--;
      throw new Error('Injected failure: the answer was lost after Stripe acted (timeout)');
    }
    return res;
  }) as unknown as typeof fetch;

  function stripe(method: string, path: string, params: URLSearchParams): Response {
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    const subscription = (id: string) => ({
      id,
      status: subscriptionStatus.get(id) ?? (live.has(id) ? 'active' : 'canceled'),
      cancel_at: unix('2027-02-18T00:00:00Z'),
      metadata: { source: 'zurichjs.com/partners' },
      items: { data: [{ id: 'si_1', price: { id: 'price_sponsor_friend_quarterly', lookup_key: 'sponsor_friend_quarterly' }, current_period_end: unix('2027-02-18T00:00:00Z') }] },
      schedule: null,
    });
    if (path === 'prices' && method === 'GET')
      return ok({ data: [{ id: `price_${params.get('lookup_keys[0]')}`, product: `prod_${params.get('lookup_keys[0]')?.split('_')[1]}` }] });
    if (path === 'prices') return ok({ id: `price_custom_${++n}` });
    if (path === 'customers') return ok({ id: 'cus_acme' });
    if (path.startsWith('customers/')) return ok({ id: path.split('/')[1] });
    if (path === 'checkout/sessions') {
      const id = `cs_test_${++n}`;
      openSessions.add(id);
      return ok({ id, url: `https://checkout.stripe.com/c/pay/${id}` });
    }
    if (/^checkout\/sessions\/.+\/expire$/.test(path)) {
      openSessions.delete(path.split('/')[2]!);
      return ok({ status: 'expired' });
    }
    if (path === 'payment_links') {
      const id = `plink_${++n}`;
      activeLinks.add(id);
      return ok({ id, url: `https://buy.stripe.com/test_${id}` });
    }
    if (path.startsWith('payment_links/')) {
      const id = path.split('/')[1]!;
      if (params.get('active') === 'false') activeLinks.delete(id);
      return ok({ id, active: activeLinks.has(id) });
    }
    if (path === 'subscriptions' && method === 'GET') return ok({ data: [...live].map((id) => ({ id, status: 'active', metadata: { source: 'zurichjs.com/partners' } })) });
    if (path.startsWith('subscriptions/')) {
      const id = path.split('/')[1]!;
      if (method === 'DELETE') {
        live.delete(id);
        return ok({ id, status: 'canceled' });
      }
      return ok(subscription(id));
    }
    if (path === 'subscription_schedules') return ok({ id: 'sub_sched_1', phases: [] });
    if (path.startsWith('charges/')) return ok({ id: path.split('/')[1], customer: 'cus_acme', amount: 84000, amount_refunded: 0 });
    throw new Error(`unexpected ${method} ${path}`);
  }

  const slackPosts: string[] = [];
  const slack: MembershipSlack = {
    post: async (text) => {
      slackPosts.push(text);
      return '1';
    },
    update: async () => undefined,
    reply: async () => undefined,
    ephemeral: async () => undefined,
  };
  const blobs = new Map<string, ArrayBuffer>();
  const logos: LogoStore = { set: async (k, d) => void blobs.set(k, d), get: async (k) => blobs.get(k) ?? null };
  return {
    f,
    calls,
    emails,
    resendAttempts,
    slack,
    slackPosts,
    logos,
    blobs,
    live,
    activeLinks,
    openSessions,
    failNext: (method: string, re: RegExp, count = 1, status = 500) => failures.push({ method, re, n: count, status }),
    /** The next n emails fail at Resend (500). */
    failEmails: (count = 1) => void (emailFailures = count),
    /** What Stripe reports as the subscription's status (default: active while live). */
    subscriptionStatus,
    loseNext: (method: string, re: RegExp, count = 1) => losses.push({ method, re, n: count }),
  };
}

/** The in-memory store, with "the next n calls of this method throw" (a database or network error). */
export function faulty(inner: SponsorStore = memoryStore({ now: () => NOW })) {
  const pending = new Map<string, number>();
  const counts = new Map<string, number>();
  const store = new Proxy(inner, {
    get(target, prop, recv) {
      const v = Reflect.get(target, prop, recv);
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        const name = String(prop);
        counts.set(name, (counts.get(name) ?? 0) + 1);
        const left = pending.get(name) ?? 0;
        if (left > 0) {
          pending.set(name, left - 1);
          return Promise.reject(new Error(`Injected failure in store.${name} (connection terminated unexpectedly)`));
        }
        return v.apply(target, args);
      };
    },
  }) as SponsorStore;
  return { store, counts, failNext: (method: keyof SponsorStore, n = 1) => pending.set(String(method), n) };
}

export const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://zurichjs.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://zurichjs.com', ...headers },
    body: JSON.stringify(body),
  });
export const asAdmin = (path: string, body?: unknown) =>
  body === undefined ? new Request(`https://zurichjs.com${path}`, { headers: { authorization: `Bearer ${ADMIN}` } }) : post(path, body, { authorization: `Bearer ${ADMIN}` });
export const asAdminDelete = (path: string) =>
  new Request(`https://zurichjs.com${path}`, { method: 'DELETE', headers: { authorization: `Bearer ${ADMIN}`, origin: 'https://zurichjs.com' } });
export const asAdminForm = (path: string, form: FormData) =>
  new Request(`https://zurichjs.com${path}`, { method: 'POST', headers: { authorization: `Bearer ${ADMIN}`, origin: 'https://zurichjs.com' }, body: form });

export const pdf = () => new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');

export function stripeEvent(id: string, type: string, object: unknown, created = Math.floor(NOW.getTime() / 1000)) {
  const payload = JSON.stringify({ id, type, created, data: { object } });
  const t = Math.floor(NOW.getTime() / 1000);
  const sig = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
}

export const answer = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, any> });

export function newSponsor(over: Partial<NewSponsor> = {}): NewSponsor {
  return {
    companyName: 'Acme',
    legalName: null,
    billingAddress: null,
    vatId: null,
    website: null,
    tier: 'friend',
    cycle: 'quarterly',
    paymentMode: 'card',
    status: 'pending',
    source: 'invited',
    startedAt: null,
    paidUntil: null,
    pricePerMeetup: null,
    notes: null,
    ...over,
  };
}
