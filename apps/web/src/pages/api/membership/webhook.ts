/**
 * Stripe webhook for memberships (separate from the donations webhook).
 * Configure in Stripe › Developers › Webhooks: https://zurichjs.com/api/membership/webhook,
 * events checkout.session.completed, invoice.paid, invoice.payment_failed,
 * invoice.payment_action_required, customer.subscription.updated,
 * customer.subscription.deleted; secret in STRIPE_MEMBERSHIP_WEBHOOK_SECRET.
 * Without the secret every call is refused. `pnpm membership:stripe-setup`
 * creates the endpoint (docs/v2/MEMBERSHIP.md, "Stripe").
 *
 *   invoice.paid (amount > 0)          the first payment and every renewal: pending/past_due/imported → active;
 *                                       paid until the period end; certificate for the term, emailed
 *                                       (welcome or renewal); Slack note
 *   checkout.session.completed          links the subscription; an imported member switching to automatic
 *                                       payment (trial until their paid period ends) becomes active
 *   invoice.payment_failed              a declined renewal: active → past_due; email with Stripe's payment
 *                                       page and the next retry; Slack note. Stripe retries (Smart Retries);
 *                                       when the retries run out it cancels the subscription (below)
 *   invoice.payment_action_required     the bank wants the member to confirm (3D Secure): the same, with
 *                                       "confirm the payment" wording
 *   customer.subscription.updated       level or cycle switched in the billing portal; a subscription Stripe
 *                                       reports as past_due or unpaid marks an active member past_due
 *   customer.subscription.deleted       ended: resigned (after the board confirmed) or lapsed (retries ran out)
 *
 * Events come in the endpoint's API version. Invoices are read in both shapes
 * (2025-03-31.basil and later: `parent.subscription_details`; before:
 * `subscription` and `subscription_details`), so an endpoint or a `stripe listen`
 * on an older version still works.
 *
 * Safe to receive twice: handled events are skipped, every status change names
 * the status it expects, certificates are one per invoice, emails carry
 * idempotency keys. An event is marked handled only after it succeeded, so
 * Stripe's retries still work after a failure (answered 500).
 */
import { renderEmail } from '@zurichjs/emails';
import { sendMemberEmail } from '@zurichjs/integrations';
import { TransitionError, levelInfo, type Member, type MemberStore, type Status } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { siteOrigin } from '../../../server/auth.ts';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { lastDay, longDate } from '../../../server/dates.ts';
import { issueAndSendCertificate } from '../../../server/membership-certificate.ts';
import { membershipProps } from '../../../server/membership.ts';
import { MembershipUnavailable, memberStore } from '../../../server/membership-db.ts';
import { notify, who, type MembershipSlack } from '../../../server/membership-slack.ts';
import { currentPlan, fromLookupKey, MEMBERSHIP_SOURCE } from '../../../server/membership-stripe.ts';
import { verifyStripeSignature } from '../../../server/stripe.ts';

export const prerender = false;

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface SubscriptionDetails {
  subscription?: string | { id: string };
  metadata?: Record<string, string> | null;
}

interface Invoice {
  id: string;
  amount_paid?: number;
  customer?: string;
  attempt_count?: number;
  next_payment_attempt?: number | null;
  hosted_invoice_url?: string | null;
  lines?: { data?: { period?: { start: number; end: number } }[] };
  parent?: { subscription_details?: SubscriptionDetails | null } | null;
  /** Before API version 2025-03-31.basil. */
  subscription?: string | { id: string } | null;
  subscription_details?: { metadata?: Record<string, string> | null } | null;
}

/** The invoice's subscription and that subscription's metadata, in either API shape. */
function subscriptionOf(inv: Invoice): { subscription?: string; metadata?: Record<string, string> } | null {
  const details = inv.parent?.subscription_details ?? (inv.subscription ? { subscription: inv.subscription, metadata: inv.subscription_details?.metadata } : null);
  if (!details) return null;
  const sub = details.subscription;
  return { subscription: typeof sub === 'string' ? sub : sub?.id, metadata: details.metadata ?? undefined };
}

/** The term an invoice pays for: the line that reaches furthest (a switch can add proration lines). */
function termOf(inv: Invoice): { start: number; end: number } | undefined {
  return (inv.lines?.data ?? []).map((l) => l.period).reduce<{ start: number; end: number } | undefined>((best, p) => (p && (!best || p.end > best.end) ? p : best), undefined);
}

interface Subscription {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { lookup_key?: string | null } }[] };
}

export interface WebhookDeps {
  env?: Env;
  store?: MemberStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: number;
  log?: (m: string) => void;
  signature?: () => Promise<Uint8Array | null>;
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

/** Stripe's hosted invoice page, and nothing else, goes into the email. */
const safeStripeUrl = (url: string | null | undefined) => (url?.startsWith('https://invoice.stripe.com/') ? url : null);

/** Moves the member to `to` from whatever they are in now, when that is allowed; otherwise leaves them. */
async function moveTo(
  store: MemberStore,
  m: Member,
  to: Status,
  eventId: string,
  extra: { reason?: 'resigned' | 'lapsed'; payload?: Record<string, unknown> } = {},
): Promise<Member> {
  if (m.status === to) return m;
  try {
    return await store.transition(m.id, { from: m.status, to, actor: { kind: 'stripe', id: eventId }, reason: extra.reason, payload: extra.payload });
  } catch (cause) {
    if (cause instanceof TransitionError) return (await store.get(m.id)) ?? m;
    throw cause;
  }
}

/** An event about a subscription other than the member's current one (a duplicate, or one replaced). */
const isStale = (m: Member, subscriptionId: string) => !!m.stripeSubscriptionId && m.stripeSubscriptionId !== subscriptionId;

async function memberOf(store: MemberStore, ids: { memberId?: string; subscriptionId?: string }): Promise<Member | null> {
  if (ids.memberId) {
    const m = await store.get(ids.memberId);
    if (m) return m;
  }
  return ids.subscriptionId ? store.byStripeSubscription(ids.subscriptionId) : null;
}

export async function handleMembershipWebhook(request: Request, deps: WebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const secret = env.STRIPE_MEMBERSHIP_WEBHOOK_SECRET;
  const payload = await request.text();
  if (!secret) {
    log('[membership] STRIPE_MEMBERSHIP_WEBHOOK_SECRET missing; webhook refused');
    return fail(503, 'Webhook not configured.');
  }
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret, deps.now)) return fail(400, 'Bad signature.');
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return fail(400, 'Invalid JSON.');
  }

  let store: MemberStore;
  try {
    store = deps.store ?? memberStore(env);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Membership database not configured.');
    throw cause;
  }
  const origin = siteOrigin(env);
  const say = (text: string) => notify(text, { env, slack: deps.slack, fetch: deps.fetch, log });

  try {
    if (await store.stripeEventSeen(event.id)) return json(200, { ok: true, duplicate: true });
    const o = event.data.object;

    switch (event.type) {
      case 'invoice.paid': {
        const inv = o as unknown as Invoice;
        const sub = subscriptionOf(inv);
        if (!sub || sub.metadata?.source !== MEMBERSHIP_SOURCE) break;
        // The trial invoice of an imported member (nothing charged) is not a paid term.
        if (!inv.amount_paid) break;
        let m = await memberOf(store, { memberId: sub.metadata.memberId, subscriptionId: sub.subscription });
        const period = termOf(inv);
        if (!m || !period) {
          log(`[membership] invoice ${inv.id}: no member or period; skipped`);
          break;
        }
        const first = m.status === 'pending';
        if (sub.subscription && m.stripeSubscriptionId !== sub.subscription)
          m = await store.linkStripe(m.id, { subscriptionId: sub.subscription }, { kind: 'stripe', id: event.id });
        // A switch scheduled for this renewal: the certificate shows the level now paid for, even
        // if customer.subscription.updated has not arrived yet.
        const plan = sub.subscription ? await currentPlan(sub.subscription, { env, fetch: deps.fetch }).catch(() => null) : null;
        const switched = plan && (plan.level !== m.level || plan.cycle !== m.cycle) ? plan : null;
        m = await store.update(
          m.id,
          { paidUntil: day(period.end), paymentMode: 'automatic', ...(m.joinedAt ? {} : { joinedAt: day(period.start) }), ...switched },
          { kind: 'stripe', id: event.id },
        );
        if (m.status === 'pending' || m.status === 'past_due' || m.status === 'imported_manual') m = await moveTo(store, m, 'active', event.id, { payload: { invoice: inv.id } });
        const cert = await issueAndSendCertificate(m, { periodStart: day(period.start), periodEnd: day(period.end), stripeInvoiceId: inv.id }, first, {
          env,
          store,
          origin,
          actor: { kind: 'stripe', id: event.id },
          fetch: deps.fetch,
          log,
          signature: deps.signature,
        });
        await say(`${first ? ':tada: New member' : ':repeat: Renewed'}: ${who(m)}, ${levelInfo(m.level).name}, ${m.cycle}. Certificate ${cert.number}.`);
        break;
      }

      case 'checkout.session.completed': {
        const meta = o.metadata as Record<string, string> | undefined;
        if (meta?.source !== MEMBERSHIP_SOURCE) break;
        let m = await memberOf(store, { memberId: meta.memberId });
        const subscriptionId = typeof o.subscription === 'string' ? o.subscription : undefined;
        if (!m || !subscriptionId) break;
        if (m.stripeSubscriptionId !== subscriptionId) m = await store.linkStripe(m.id, { subscriptionId }, { kind: 'stripe', id: event.id });
        if (m.status === 'imported_manual') {
          // Switched to automatic payment; the first charge comes when the paid period ends.
          m = await store.update(m.id, { paymentMode: 'automatic' }, { kind: 'stripe', id: event.id });
          m = await moveTo(store, m, 'active', event.id, { payload: { switchedToAutomatic: true } });
          await say(`:credit_card: ${who(m)} switched to automatic payment (first charge when the paid period ends).`);
          if (m.paidUntil) {
            const email = renderEmail('automatic-payment-set-up', {
              ...membershipProps(m, origin),
              paidThrough: longDate(lastDay(m.paidUntil)),
              firstPayment: longDate(m.paidUntil),
            });
            await sendMemberEmail(env, { to: m.email, ...email }, { idempotencyKey: `member-automatic:${m.id}:${subscriptionId}`, log, fetch: deps.fetch }).catch((e: Error) =>
              log(`[membership] automatic payment email to ${m!.id} failed: ${e.message}`),
            );
          }
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        const inv = o as unknown as Invoice;
        const sub = subscriptionOf(inv);
        if (!sub || sub.metadata?.source !== MEMBERSHIP_SOURCE) break;
        let m = await memberOf(store, { memberId: sub.metadata.memberId, subscriptionId: sub.subscription });
        // Someone still in Checkout (pending) fixes the card there; only renewals concern members.
        if (!m || !(m.status === 'active' || m.status === 'past_due' || m.status === 'resigning')) break;
        if (m.status === 'active') m = await moveTo(store, m, 'past_due', event.id, { payload: { invoice: inv.id, event: event.type } });
        const needsConfirmation = event.type === 'invoice.payment_action_required';
        const nextAttempt = inv.next_payment_attempt ? longDate(day(inv.next_payment_attempt)) : null;
        await sendMemberEmail(
          env,
          {
            to: m.email,
            ...renderEmail('payment-failed', { ...membershipProps(m, origin), payUrl: safeStripeUrl(inv.hosted_invoice_url), needsConfirmation, nextAttempt }),
          },
          // One email per attempt: Stripe sends a new event for each retry.
          { idempotencyKey: `member-payment-failed:${inv.id}:${inv.attempt_count ?? 0}:${needsConfirmation ? 'confirm' : 'declined'}`, log, fetch: deps.fetch },
        ).catch((e: Error) => log(`[membership] payment-failed email to ${m!.id} failed: ${e.message}`));
        const retry = nextAttempt ? `Stripe tries again on ${nextAttempt}` : 'No retry scheduled; the subscription ends if it stays unpaid';
        await say(
          needsConfirmation
            ? `:lock: ${who(m)} has to confirm their payment with their bank (3D Secure). They were emailed the payment page.`
            : `:warning: Payment failed for ${who(m)} (attempt ${inv.attempt_count ?? 1}). ${retry}; they were emailed.`,
        );
        break;
      }

      case 'customer.subscription.updated': {
        const s = o as unknown as Subscription;
        if (s.metadata?.source !== MEMBERSHIP_SOURCE) break;
        let m = await memberOf(store, { memberId: s.metadata.memberId, subscriptionId: s.id });
        if (!m || isStale(m, s.id)) break;
        // Catches a missed payment_failed event: Stripe says the subscription is behind.
        if ((s.status === 'past_due' || s.status === 'unpaid') && m.status === 'active')
          m = await moveTo(store, m, 'past_due', event.id, { payload: { subscriptionStatus: s.status } });
        const plan = fromLookupKey(s.items?.data?.[0]?.price?.lookup_key);
        if (!plan || (plan.level === m.level && plan.cycle === m.cycle)) break;
        await store.update(m.id, { level: plan.level, cycle: plan.cycle }, { kind: 'stripe', id: event.id });
        await say(`:arrows_counterclockwise: ${who(m)} switched to ${levelInfo(plan.level).name}, ${plan.cycle}.`);
        break;
      }

      case 'customer.subscription.deleted': {
        const s = o as unknown as Subscription;
        if (s.metadata?.source !== MEMBERSHIP_SOURCE) break;
        const m = await memberOf(store, { memberId: s.metadata.memberId, subscriptionId: s.id });
        // A duplicate or replaced subscription ending says nothing about the membership.
        if (!m || m.status === 'ended' || isStale(m, s.id)) break;
        const reason = m.status === 'resigning' ? 'resigned' : 'lapsed';
        const ended = await moveTo(store, m, 'ended', event.id, { reason });
        if (ended.status === 'ended') await say(`:wave: Membership ended (${reason}): ${who(ended)}.`);
        break;
      }
    }

    await store.markStripeEvent(event.id, event.type);
    return json(200, { ok: true });
  } catch (cause) {
    console.error(`[membership] webhook ${event.type} ${event.id} failed`, cause);
    return fail(500, 'Webhook handling failed; Stripe will retry.');
  }
}

export const POST: APIRoute = ({ request }) => handleMembershipWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
