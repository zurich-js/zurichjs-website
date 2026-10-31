/**
 * Pro-meetup tickets through Stripe Checkout (Netlify Function).
 *
 * POST /api/stripe/checkout-sessions  JSON, same fields as production:
 *   { priceId, eventId, quantity?: 1–10, couponCode?, email?, ticketType?: 'event' }
 *   200 { ok: true, url }             Stripe Checkout URL; the island redirects there
 *   400 { ok: false, error, field? }  invalid input, unknown coupon, or the event does not sell this price
 *   503 { ok: false, error }          STRIPE_SECRET_KEY missing: nothing is charged
 *   502 { ok: false, error }          Stripe or Sanity failed
 *
 * GET /api/stripe/checkout-sessions?session_id=cs_...  (the /success page)
 *   200 { ok: true, status, paymentStatus, eventId, quantity, amountTotal, currency }
 *   The first time a paid session is read, the organisers get a Slack message
 *   (as production's /api/notify/purchase-success did) and the session is
 *   marked `metadata.notified=yes` so reloads do not notify again.
 *
 * The price must be the one the event has in Sanity (`events.stripePriceId`),
 * and the event must not have started. Workshop tickets are not sold here.
 */
import { postSlack } from '@zurichjs/integrations';
import type { APIRoute } from 'astro';
import { CHECKOUT_SESSION_ID, CONTACT_EMAIL, COUPON_CODE, SLUG, STRIPE_ID, fail, isEmail, json, methodNotAllowed, readJsonObject, text, type Env } from '../../../server/http';
import { groqQuery } from '../../../server/sanity';
import { StripeError, stripeClient } from '../../../server/stripe';

export const prerender = false;

const NOT_SWITCHED_ON = `Online ticket sales aren’t switched on yet, so nothing was charged. Email ${CONTACT_EMAIL} to book a place.`;
const STRIPE_DOWN = `We couldn’t open the payment page. Nothing was charged. Please try again, or email ${CONTACT_EMAIL}.`;

export interface CheckoutInput {
  priceId: string;
  eventId: string;
  quantity: number;
  couponCode?: string;
  email?: string;
}

/** Validates the production payload. Returns the clean input or a human error with the field name. */
export function parseCheckout(body: Record<string, unknown>): { ok: true; data: CheckoutInput } | { ok: false; error: string; field: string } {
  if (body.workshopId !== undefined && body.workshopId !== '') return { ok: false, error: 'Workshop tickets aren’t sold on this site.', field: 'workshopId' };
  if (body.ticketType !== undefined && body.ticketType !== 'event') return { ok: false, error: 'Only meetup tickets are sold here.', field: 'ticketType' };
  const priceId = text(body.priceId, 120);
  if (!priceId || !STRIPE_ID.test(priceId)) return { ok: false, error: 'This ticket has no valid price.', field: 'priceId' };
  const eventId = text(body.eventId, 160);
  if (!eventId || !SLUG.test(eventId)) return { ok: false, error: 'Choose an event to buy a ticket for.', field: 'eventId' };
  const rawQty = body.quantity ?? 1;
  const quantity = typeof rawQty === 'string' && rawQty.trim() !== '' ? Number(rawQty) : rawQty;
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 10)
    return { ok: false, error: 'Choose between 1 and 10 tickets.', field: 'quantity' };
  const couponCode = text(body.couponCode, 80);
  if (couponCode === false || (couponCode && !COUPON_CODE.test(couponCode))) return { ok: false, error: 'That discount code isn’t valid.', field: 'couponCode' };
  const email = text(body.email, 254);
  if (email === false || (email && !isEmail(email))) return { ok: false, error: 'Enter an email like name@example.com.', field: 'email' };
  return { ok: true, data: { priceId, eventId, quantity, couponCode: couponCode || undefined, email: email ? email.toLowerCase() : undefined } };
}

interface EventTicketInfo {
  title?: string;
  datetime?: string;
  stripePriceId?: string;
}

const EVENT_TICKET_QUERY = `*[_type == "events" && id.current == $id][0]{ title, datetime, stripePriceId }`;

export interface CheckoutDeps {
  env?: Env;
  fetch?: typeof fetch;
  now?: () => Date;
  log?: (msg: string) => void;
}

export async function handlePost(request: Request, deps: CheckoutDeps = {}): Promise<Response> {
  const { env = process.env, fetch: fetchImpl = fetch, now = () => new Date(), log = console.log } = deps;
  const body = await readJsonObject(request);
  if (!body) return fail(400, 'Send the order as JSON.');
  const parsed = parseCheckout(body);
  if (!parsed.ok) return fail(400, parsed.error, { field: parsed.field });
  const { priceId, eventId, quantity, couponCode, email } = parsed.data;

  if (!env.STRIPE_SECRET_KEY) {
    log(`[tickets] STRIPE_SECRET_KEY missing; no checkout session for ${quantity} × ${eventId}`);
    return fail(503, NOT_SWITCHED_ON);
  }

  // The price must belong to the event, and the event must still be ahead.
  if (env.CONTENT_SOURCE === 'sample') {
    log(`[tickets] CONTENT_SOURCE=sample; skipping the Sanity check for ${eventId}`);
  } else {
    let ev: EventTicketInfo | null;
    try {
      ev = await groqQuery(env, fetchImpl)<EventTicketInfo | null>(EVENT_TICKET_QUERY, { id: eventId });
    } catch (cause) {
      console.error('[tickets] event lookup failed', cause);
      return fail(502, STRIPE_DOWN);
    }
    if (!ev || ev.stripePriceId !== priceId) return fail(400, 'This event doesn’t sell tickets on this site.', { field: 'priceId' });
    if (ev.datetime && new Date(ev.datetime).getTime() <= now().getTime()) return fail(400, 'Ticket sales for this event have closed.', { field: 'eventId' });
  }

  const stripe = stripeClient(env.STRIPE_SECRET_KEY, fetchImpl);
  const origin = new URL(request.url).origin;
  try {
    let discounts: { coupon: string }[] | undefined;
    if (couponCode) {
      const coupon = await stripe.getCoupon(couponCode).catch((e: unknown) => {
        if (e instanceof StripeError && e.status === 404) return null;
        throw e;
      });
      if (!coupon?.valid) return fail(400, 'That discount code isn’t valid.', { field: 'couponCode' });
      discounts = [{ coupon: coupon.id }];
    }
    const slug = encodeURIComponent(eventId);
    const session = await stripe.createCheckoutSession({
      mode: 'payment',
      line_items: [{ price: priceId, quantity }],
      // Stripe replaces {CHECKOUT_SESSION_ID}; it must stay unencoded.
      success_url: `${origin}/success?type=ticket&event=${slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/events/${slug}?canceled=true${couponCode ? `&coupon=${encodeURIComponent(couponCode)}` : ''}#tickets`,
      customer_email: email,
      discounts,
      metadata: { source: 'zurichjs-website', kind: 'ticket', eventId, ticketType: 'event', couponCode: couponCode ?? '' },
    });
    if (!session.url) throw new Error('Stripe returned no checkout URL');
    return json(200, { ok: true, url: session.url });
  } catch (cause) {
    console.error('[tickets] checkout failed', cause);
    if (cause instanceof StripeError && cause.status === 404) return fail(400, 'This ticket isn’t on sale right now.', { field: 'priceId' });
    return fail(502, STRIPE_DOWN);
  }
}

export async function handleGet(url: URL, deps: CheckoutDeps = {}): Promise<Response> {
  const { env = process.env, fetch: fetchImpl = fetch, log = console.log } = deps;
  const sessionId = url.searchParams.get('session_id') ?? '';
  if (!CHECKOUT_SESSION_ID.test(sessionId)) return fail(400, 'This payment link is incomplete.');
  if (!env.STRIPE_SECRET_KEY) {
    log('[tickets] STRIPE_SECRET_KEY missing; cannot look up a checkout session');
    return fail(503, 'We can’t check payments right now.');
  }
  const stripe = stripeClient(env.STRIPE_SECRET_KEY, fetchImpl);
  try {
    const s = await stripe.getCheckoutSession(sessionId);
    const meta = s.metadata ?? {};
    const quantity = s.line_items?.data.reduce((n, li) => n + (li.quantity ?? 0), 0) ?? null;
    const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
    if (paid && meta.kind === 'ticket' && meta.notified !== 'yes' && !env.SLACK_WEBHOOK_URL) {
      log(`[tickets] SLACK_WEBHOOK_URL missing; organisers not told about paid session ${s.id}`);
    } else if (paid && meta.kind === 'ticket' && meta.notified !== 'yes') {
      const amount = s.amount_total !== null && s.currency ? `${(s.amount_total / 100).toFixed(2)} ${s.currency.toUpperCase()}` : 'unknown amount';
      const buyer = s.customer_details?.email ?? s.customer_email ?? 'not provided';
      try {
        await postSlack(
          env,
          [
            `New ticket purchase: ${meta.eventId || 'unknown event'}`,
            `Tickets: ${quantity ?? '?'} · Paid: ${amount}`,
            `Email: ${buyer}`,
            `Coupon: ${meta.couponCode || 'none'}`,
            `Session: ${s.id}`,
          ].join('\n'),
          log,
        );
        await stripe.updateCheckoutSession(s.id, { metadata: { notified: 'yes' } });
      } catch (cause) {
        console.error('[tickets] purchase notification failed', cause);
      }
    }
    return json(200, {
      ok: true,
      status: s.status,
      paymentStatus: s.payment_status,
      kind: meta.kind ?? null,
      eventId: meta.eventId || null,
      quantity,
      amountTotal: s.amount_total,
      currency: s.currency,
    });
  } catch (cause) {
    if (cause instanceof StripeError && cause.status === 404) return fail(404, 'We couldn’t find this payment.');
    console.error('[tickets] session lookup failed', cause);
    return fail(502, 'We can’t check payments right now.');
  }
}

export const POST: APIRoute = ({ request }) => handlePost(request);
export const GET: APIRoute = ({ request }) => handleGet(new URL(request.url));
export const ALL: APIRoute = () => methodNotAllowed('GET, POST');
