/**
 * Donations from the shared Stripe webhook (server/stripe-webhook.ts): tells the organisers in
 * Slack about a new donation or a cancelled monthly donation.
 *
 * This route is the old donations-only endpoint (https://zurichjs.com/api/donate/webhook), kept so
 * production keeps working until Stripe sends to /api/stripe/webhook; then delete the route. Both
 * read STRIPE_WEBHOOK_SECRET: today it holds this endpoint's secret, after the switch the shared one's.
 */
import { postSlack } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { readStripeEvent, type StripeEvent } from '../../../server/stripe-webhook.ts';

export const prerender = false;

interface DonationObject {
  amount_total?: number;
  currency?: string;
  mode?: string;
  metadata?: Record<string, string>;
}

type DonateDeps = { env?: Env; log?: (m: string) => void; now?: number };

/** One verified Stripe event for donations; anything else is skipped. */
export async function processDonationEvent(event: StripeEvent, deps: DonateDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const o = event.data.object as DonationObject;
  if (event.type === 'checkout.session.completed' && o.metadata?.source === 'zurichjs.com/donate') {
    const amount = `${(o.currency ?? 'chf').toUpperCase()} ${((o.amount_total ?? 0) / 100).toFixed(2)}`;
    await postSlack(env, `New donation on zurichjs.com: ${amount}${o.mode === 'subscription' ? ' every month' : ', one-time'}.`, log);
  } else if (event.type === 'customer.subscription.deleted' && o.metadata?.source === 'zurichjs.com/donate') {
    await postSlack(env, 'A monthly donation from zurichjs.com was cancelled.', log);
  }
  return json(200, { ok: true });
}

export async function handleWebhook(request: Request, deps: DonateDeps = {}): Promise<Response> {
  const read = await readStripeEvent(request, deps.env ?? process.env, 'STRIPE_WEBHOOK_SECRET', 'donate', deps);
  return 'response' in read ? read.response : processDonationEvent(read.event, deps);
}

export const POST: APIRoute = ({ request }) => handleWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
