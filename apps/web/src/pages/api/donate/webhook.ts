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
import { donationEvents, type DonationEvents } from '../../../server/donation-events.ts';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { DONATION_SOURCE } from '../../../server/stripe.ts';
import { readStripeEvent, type StripeEvent } from '../../../server/stripe-webhook.ts';

export const prerender = false;

interface DonationObject {
  amount_total?: number;
  currency?: string;
  mode?: string;
  metadata?: Record<string, string>;
}

type DonateDeps = { env?: Env; log?: (m: string) => void; now?: number; fetch?: typeof fetch; events?: DonationEvents | null };

/** The Slack note for a donation event, or null when the event is not one the organisers hear about. */
function noteFor(event: StripeEvent): string | null {
  const o = event.data.object as DonationObject;
  if (o.metadata?.source !== DONATION_SOURCE) return null;
  if (event.type === 'checkout.session.completed') {
    const amount = `${(o.currency ?? 'chf').toUpperCase()} ${((o.amount_total ?? 0) / 100).toFixed(2)}`;
    return `New donation on zurichjs.com: ${amount}${o.mode === 'subscription' ? ' every month' : ', one-time'}.`;
  }
  if (event.type === 'customer.subscription.deleted') return 'A monthly donation from zurichjs.com was cancelled.';
  return null;
}

/**
 * One verified Stripe event for donations; anything else is skipped. Each event posts its note
 * once (donation-events.ts). When Slack fails, the claim is given back and the answer is 500, so
 * Stripe delivers the event again.
 */
export async function processDonationEvent(event: StripeEvent, deps: DonateDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const text = noteFor(event);
  if (!text) return json(200, { ok: true });
  try {
    const events = deps.events === undefined ? donationEvents(env) : deps.events;
    if (!events) log(`[donate] no database: ${event.id} is not recorded, so a redelivery posts again`);
    else if (!(await events.claim(event.id, event.type))) return json(200, { ok: true, duplicate: true });
    try {
      await postSlack(env, text, log, deps.fetch);
    } catch (cause) {
      await events?.release(event.id);
      throw cause;
    }
    await events?.done(event.id);
    return json(200, { ok: true });
  } catch (cause) {
    console.error(`[donate] webhook ${event.type} ${event.id} failed; Stripe will retry`, cause);
    return fail(500, 'Webhook handling failed; Stripe will retry.');
  }
}

export async function handleWebhook(request: Request, deps: DonateDeps = {}): Promise<Response> {
  const read = await readStripeEvent(request, deps.env ?? process.env, 'STRIPE_WEBHOOK_SECRET', 'donate', deps);
  return 'response' in read ? read.response : processDonationEvent(read.event, deps);
}

export const POST: APIRoute = ({ request }) => handleWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
