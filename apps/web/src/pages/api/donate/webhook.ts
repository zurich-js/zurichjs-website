/**
 * Stripe webhook (optional): tells the organisers in Slack about a new
 * donation or a cancelled monthly donation. Configure in Stripe › Developers ›
 * Webhooks: https://zurichjs.com/api/donate/webhook, events
 * checkout.session.completed and customer.subscription.deleted, and set
 * STRIPE_WEBHOOK_SECRET. Without the secret every call is refused.
 */
import { postSlack } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { verifyStripeSignature } from '../../../server/stripe.ts';

export const prerender = false;

interface StripeEvent {
  type: string;
  data: { object: { amount_total?: number; currency?: string; mode?: string; metadata?: Record<string, string>; items?: unknown } };
}

export async function handleWebhook(request: Request, deps: { env?: Env; log?: (m: string) => void; now?: number } = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const secret = env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();
  if (!secret) {
    log('[donate] STRIPE_WEBHOOK_SECRET missing; webhook refused');
    return fail(503, 'Webhook not configured.');
  }
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret, deps.now)) return fail(400, 'Bad signature.');
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return fail(400, 'Invalid JSON.');
  }
  const o = event.data.object;
  if (event.type === 'checkout.session.completed' && o.metadata?.source === 'zurichjs.com/donate') {
    const amount = `${(o.currency ?? 'chf').toUpperCase()} ${((o.amount_total ?? 0) / 100).toFixed(2)}`;
    await postSlack(env, `New donation on zurichjs.com: ${amount}${o.mode === 'subscription' ? ' every month' : ', one-time'}.`, log);
  } else if (event.type === 'customer.subscription.deleted' && o.metadata?.source === 'zurichjs.com/donate') {
    await postSlack(env, 'A monthly donation from zurichjs.com was cancelled.', log);
  }
  return json(200, { ok: true });
}

export const POST: APIRoute = ({ request }) => handleWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
