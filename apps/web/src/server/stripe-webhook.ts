/**
 * The one Stripe webhook (POST /api/stripe/webhook): one endpoint in Stripe, one signing secret
 * (STRIPE_WEBHOOK_SECRET), every event the site handles. Each part (memberships, sponsorships,
 * donations) gets every event and skips the ones that are not its own, by the `source` metadata
 * set when the payment was created.
 *
 * Memberships and sponsorships record the events they handled, and donations claim theirs
 * (donation-events.ts), so a retry after one part failed (answered 500) does not redo a part that
 * finished. A donation event (its object carries the donation `source`) goes to the donation part
 * alone: it is never a membership or sponsorship event, so it does not wait for their database.
 */
import { fail, json, type Env } from './http.ts';
import { DONATION_SOURCE, verifyStripeSignature } from './stripe.ts';

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

export const isDonationEvent = (event: StripeEvent) => (event.data.object.metadata as Record<string, string> | undefined)?.source === DONATION_SOURCE;

/** Every event any part handles; `pnpm membership:stripe-setup --webhook-url …` subscribes the endpoint to these. */
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

/** Reads and verifies the request against the secret in `env[secretName]`: the event, or the answer to send. */
export async function readStripeEvent(
  request: Request,
  env: Env,
  secretName: string,
  tag: string,
  deps: { log?: (m: string) => void; now?: number } = {},
): Promise<{ event: StripeEvent } | { response: Response }> {
  const secret = env[secretName];
  const payload = await request.text();
  if (!secret) {
    (deps.log ?? console.log)(`[${tag}] ${secretName} missing; webhook refused`);
    return { response: fail(503, 'Webhook not configured.') };
  }
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret, deps.now)) return { response: fail(400, 'Bad signature.') };
  try {
    return { event: JSON.parse(payload) as StripeEvent };
  } catch {
    return { response: fail(400, 'Invalid JSON.') };
  }
}

/** One part of the webhook: handles a verified event, or skips it, and answers like a webhook would. */
export type EventHandler = (event: StripeEvent) => Promise<Response>;

/** Runs the parts in order and stops at the first that did not answer 2xx (Stripe then retries). */
export async function dispatchStripeEvent(event: StripeEvent, handlers: EventHandler[]): Promise<Response> {
  for (const handle of handlers) {
    const r = await handle(event);
    if (r.status >= 300) return r;
  }
  return json(200, { ok: true });
}
