/** The one Stripe webhook: verification, and how it runs the parts (memberships, sponsorships, donations). */
import { createHmac } from 'node:crypto';
import { memoryStore as memoryMembers } from '@zurichjs/membership';
import { memoryStore as memorySponsors } from '@zurichjs/sponsorship';
import { describe, expect, it, vi } from 'vitest';
import { handleStripeWebhook } from '../src/pages/api/stripe/webhook.ts';
import type { DonationEvents } from '../src/server/donation-events.ts';
import { json } from '../src/server/http.ts';
import { dispatchStripeEvent, type StripeEvent } from '../src/server/stripe-webhook.ts';

const SECRET = 'whsec_shared_test';
const NOW = Date.parse('2026-11-18T10:00:00Z');

function signed(body: unknown, secret = SECRET) {
  const payload = JSON.stringify(body);
  const t = Math.floor(NOW / 1000);
  const sig = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': `t=${t},v1=${sig}` } });
}

const event: StripeEvent = { id: 'evt_1', type: 'customer.created', data: { object: {} } };
const deps = () => ({ env: { STRIPE_WEBHOOK_SECRET: SECRET }, memberStore: memoryMembers(), sponsorStore: memorySponsors(), now: NOW, log: () => {} });

describe('the shared Stripe webhook', () => {
  it('refuses without the secret or with a bad signature', async () => {
    expect((await handleStripeWebhook(signed(event), { ...deps(), env: {} })).status).toBe(503);
    expect((await handleStripeWebhook(signed(event, 'whsec_other'), deps())).status).toBe(400);
  });

  it('accepts an event no part handles, and the same event again', async () => {
    const d = deps();
    expect((await handleStripeWebhook(signed(event), d)).status).toBe(200);
    expect((await handleStripeWebhook(signed(event), d)).status).toBe(200);
  });

  it('runs every part in order and stops at the first failure, so Stripe retries', async () => {
    const ran: string[] = [];
    const part =
      (name: string, status = 200) =>
      async () => {
        ran.push(name);
        return json(status, {});
      };
    expect((await dispatchStripeEvent(event, [part('members'), part('sponsors'), part('donations')])).status).toBe(200);
    expect(ran).toEqual(['members', 'sponsors', 'donations']);
    ran.length = 0;
    expect((await dispatchStripeEvent(event, [part('members'), part('sponsors', 500), part('donations')])).status).toBe(500);
    expect(ran).toEqual(['members', 'sponsors']);
  });
});

function memoryDonationEvents(clock = { now: 0 }): DonationEvents & { clock: typeof clock } {
  const claims = new Map<string, { at: number; token: string; posted: boolean }>();
  let n = 0;
  const mine = (id: string, token: string) => (claims.get(id)?.token === token ? claims.get(id)! : null);
  return {
    clock,
    async claim(id) {
      const c = claims.get(id);
      if (c?.posted) return { state: 'posted' };
      if (c && clock.now - c.at < 5 * 60_000) return { state: 'in_progress' };
      const token = `t${++n}`;
      claims.set(id, { at: clock.now, token, posted: false });
      return { state: 'acquired', token };
    },
    async done(id, token) {
      const c = mine(id, token);
      if (c) c.posted = true;
      return !!c;
    },
    release: async (id, token) => !!mine(id, token) && !mine(id, token)!.posted && claims.delete(id),
  };
}

describe('donations on the shared webhook', () => {
  const donation: StripeEvent = {
    id: 'evt_d',
    type: 'checkout.session.completed',
    data: { object: { mode: 'payment', amount_total: 5000, currency: 'chf', metadata: { source: 'zurichjs.com/donate' } } },
  };
  const slack = (status = 200) => {
    const posts: string[] = [];
    const fetch = (async (_url: string, init: RequestInit = {}) => {
      posts.push(String(init.body));
      return new Response('x', { status });
    }) as typeof globalThis.fetch;
    return { posts, fetch };
  };
  const env = { STRIPE_WEBHOOK_SECRET: SECRET, SLACK_WEBHOOK_URL: 'https://hooks.slack.invalid/T/B/x' };

  it('posts one note; a delivery while another is posting is answered 409, so Stripe retries it', async () => {
    const { posts, fetch } = slack();
    const events = memoryDonationEvents();
    const d = { ...deps(), env, fetch, donationEvents: events };
    const [a, b] = await Promise.all([handleStripeWebhook(signed(donation), d), handleStripeWebhook(signed(donation), d)]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const again = await handleStripeWebhook(signed(donation), d);
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ duplicate: true });
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain('New donation on zurichjs.com: CHF 50.00, one-time.');
  });

  it('a claim abandoned before posting is not answered as done, and is taken over after five minutes', async () => {
    const { posts, fetch } = slack();
    const events = memoryDonationEvents();
    expect(await events.claim(donation.id, donation.type)).toMatchObject({ state: 'acquired' }); // the first delivery stops here
    const d = { ...deps(), env, fetch, donationEvents: events };
    events.clock.now = 5 * 60_000 - 1;
    expect((await handleStripeWebhook(signed(donation), d)).status).toBe(409);
    expect(posts).toHaveLength(0);
    events.clock.now = 5 * 60_000;
    expect((await handleStripeWebhook(signed(donation), d)).status).toBe(200);
    expect(posts).toHaveLength(1);
  });

  it('answers 500 when Slack fails, and the redelivery posts the note', async () => {
    const events = memoryDonationEvents();
    const down = slack(500);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await handleStripeWebhook(signed(donation), { ...deps(), env, fetch: down.fetch, donationEvents: events })).status).toBe(500);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('[donate] webhook checkout.session.completed evt_d failed; Stripe will retry'), expect.any(Error));
    error.mockRestore();
    const up = slack();
    expect((await handleStripeWebhook(signed(donation), { ...deps(), env, fetch: up.fetch, donationEvents: events })).status).toBe(200);
    expect(up.posts).toHaveLength(1);
  });

  it('records nothing when Slack is not configured, so a replay after setting it up posts', async () => {
    const events = memoryDonationEvents();
    const { posts, fetch } = slack();
    const first = await handleStripeWebhook(signed(donation), { ...deps(), env: { STRIPE_WEBHOOK_SECRET: SECRET }, fetch, donationEvents: events });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ posted: false });
    expect((await handleStripeWebhook(signed(donation), { ...deps(), env, fetch, donationEvents: events })).status).toBe(200);
    expect(posts).toHaveLength(1);
  });

  it('answers 200 when the note went out but marking it posted failed, so Stripe does not post it again', async () => {
    const { posts, fetch } = slack();
    const events = memoryDonationEvents();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = { ...events, done: async () => Promise.reject(new Error('database gone')) };
    expect((await handleStripeWebhook(signed(donation), { ...deps(), env, fetch, donationEvents: failing })).status).toBe(200);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('posted to Slack but not recorded as posted'), expect.any(Error));
    error.mockRestore();
    expect(posts).toHaveLength(1);
  });

  it('needs no membership or sponsorship database', async () => {
    const { posts, fetch } = slack();
    const r = await handleStripeWebhook(signed(donation), { env, fetch, now: NOW, log: () => {} });
    expect(r.status).toBe(200);
    expect(posts).toHaveLength(1);
  });
});
