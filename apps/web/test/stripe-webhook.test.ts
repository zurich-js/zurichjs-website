/** The one Stripe webhook: verification, and how it runs the parts (memberships, sponsorships, donations). */
import { createHmac } from 'node:crypto';
import { memoryStore as memoryMembers } from '@zurichjs/membership';
import { memoryStore as memorySponsors } from '@zurichjs/sponsorship';
import { describe, expect, it } from 'vitest';
import { handleStripeWebhook } from '../src/pages/api/stripe/webhook.ts';
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
