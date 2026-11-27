/**
 * Membership events. They arrive on the site's one Stripe webhook, /api/stripe/webhook
 * (server/stripe-webhook.ts), which verifies the signature and calls processMembershipEvent.
 * This route is the old membership-only endpoint (STRIPE_MEMBERSHIP_WEBHOOK_SECRET), kept until
 * production's Stripe sends to the shared one (docs/systems/stripe.md); then delete the route.
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
 *   customer.subscription.deleted       ended: resigned, or lapsed (the retries ran out; the member is emailed)
 *   charge.refunded, charge.dispute.created
 *                                       a member's payment refunded or disputed: an audit row and a Slack note
 *                                       for the board; the membership itself is unchanged (no policy yet)
 *
 * Events come in the endpoint's API version. Invoices are read in both shapes
 * (2025-03-31.basil and later: `parent.subscription_details`; before:
 * `subscription` and `subscription_details`), so an endpoint or a `stripe listen`
 * on an older version still works.
 *
 */
import { renderEmail } from '@zurichjs/emails';
import { deliverMembershipNotices } from '../../../server/membership-delivery.ts';
import { TransitionError, levelInfo, type Member, type MemberStore, type Status } from '@zurichjs/membership';
import type { APIRoute } from 'astro';
import { siteOrigin } from '../../../server/auth.ts';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { lastDay, longDate } from '../../../server/dates.ts';
import { membershipProps } from '../../../server/membership.ts';
import { MembershipUnavailable, memberStore } from '../../../server/membership-db.ts';
import { who, type MembershipSlack } from '../../../server/membership-slack.ts';
import { chargeCustomer, currentPlan, MEMBERSHIP_SOURCE, subscriptionSnapshot } from '../../../server/membership-stripe.ts';
import { readStripeEvent, type StripeEvent } from '../../../server/stripe-webhook.ts';

export const prerender = false;

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
  /** Why Stripe ended it: `cancellation_requested` (renewal stopped) or `payment_failed` (retries ran out). */
  cancellation_details?: { reason?: string | null } | null;
}

/** charge.refunded (a Charge) or charge.dispute.created (a Dispute, which names its charge). */
interface ChargeOrDispute {
  id: string;
  charge?: string;
  customer?: string | null;
  amount?: number;
  amount_refunded?: number;
  currency?: string;
  reason?: string | null;
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

const RUNNING: readonly Status[] = ['active', 'past_due', 'resigning'];

const activatedBy = async (store: MemberStore, m: Member, invoiceId: string) =>
  (await store.events(m.id)).some((e) => e.type === 'status_changed' && e.fromStatus === 'pending' && e.toStatus === 'active' && e.payload.invoice === invoiceId);

const money = (minor: number | undefined, currency: string | undefined) => `${(currency ?? 'chf').toUpperCase()} ${((minor ?? 0) / 100).toFixed(2)}`;

async function memberOf(store: MemberStore, ids: { memberId?: string; subscriptionId?: string }): Promise<Member | null> {
  if (ids.memberId) {
    const m = await store.get(ids.memberId);
    if (m) return m;
  }
  return ids.subscriptionId ? store.byStripeSubscription(ids.subscriptionId) : null;
}

/**
 * The old membership-only endpoint, with its own secret (STRIPE_MEMBERSHIP_WEBHOOK_SECRET). Kept so
 * production keeps working until Stripe sends to /api/stripe/webhook; then delete this route.
 */
export async function handleMembershipWebhook(request: Request, deps: WebhookDeps = {}): Promise<Response> {
  const read = await readStripeEvent(request, deps.env ?? process.env, 'STRIPE_MEMBERSHIP_WEBHOOK_SECRET', 'membership', deps);
  return 'response' in read ? read.response : processMembershipEvent(read.event, deps);
}

/** One verified Stripe event for memberships (the shared webhook, server/stripe-webhook.ts, calls it). */
export async function processMembershipEvent(event: StripeEvent, deps: WebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;

  let store: MemberStore;
  try {
    store = deps.store ?? memberStore(env);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Membership database not configured.');
    throw cause;
  }
  const origin = siteOrigin(env);
  let lease: string | undefined;
  try {
    const claim = await store.claimStripeEvent(event.id, event.type);
    if (claim === 'done') return json(200, { ok: true, duplicate: true });
    if (claim === 'busy') return fail(409, 'This event is being handled; Stripe will retry.');
    lease = claim.lease;
    await store.transaction(async (tx) => {
      if (await tx.stripePrepared(event.id, claim.lease)) return;
      await prepareMembershipEvent(event, tx, env, origin, log, deps);
      await tx.prepareStripeEvent(event.id, claim.lease);
    });
    await deliverMembershipNotices(event.id, { ...deps, store, env, origin }, (tx) => tx.stripePrepared(event.id, claim.lease));
    await store.markStripeEvent(event.id, claim.lease);
    return json(200, { ok: true });
  } catch (cause) {
    if (lease) await store.releaseStripeEvent(event.id, lease).catch(() => {});
    console.error(`[membership] webhook ${event.type} ${event.id} failed`, cause);
    return fail(500, 'Webhook handling failed; Stripe will retry.');
  }
}

async function confirmAttempt(store: MemberStore, memberId: string, ref: string | undefined, outcome: 'paid' | 'automatic') {
  if (!ref) return;
  const attempt = await store.checkoutAttempt(memberId);
  if (attempt?.id === ref && !attempt.confirmation && (outcome === 'paid' || attempt.trialEnd)) await store.saveCheckoutAttempt(memberId, { ...attempt, confirmation: outcome });
}

async function prepareMembershipEvent(event: StripeEvent, store: MemberStore, env: Env, origin: string, log: (s: string) => void, deps: WebhookDeps) {
  const say = (m: Member, text: string, key = event.id) => store.enqueue(m.id, event.id, `board:${key}`, { kind: 'board', text });
  const mail = (m: Member, key: string, email: ReturnType<typeof renderEmail>) => store.enqueue(m.id, event.id, key, { kind: 'email', to: m.email, ...email });
  const applyInvoice = async (m: Member, inv: Invoice, subscription: string, outcome: 'paid' | 'failed') => {
    const result = inv.customer && m.stripeCustomerId && inv.customer !== m.stripeCustomerId ? 'conflict' : await store.recordInvoice(m.id, inv.id, subscription, outcome);
    if (result === 'conflict') await say(m, `:warning: Check the owner of invoice ${inv.id} in Stripe. Its billing identifiers disagree with the membership record.`);
    return result === 'apply';
  };
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
      if (!sub.subscription) throw new Error('Missing membership subscription on a paid invoice.');
      if (!(await applyInvoice(m, inv, sub.subscription, 'paid'))) break;
      if (m.status === 'ended') {
        await say(
          m,
          `:rotating_light: A membership payment arrived for ${who(m)}, whose membership has ended (invoice ${inv.id}). Nothing was issued. Check it in Stripe and refund it if it was not meant.`,
        );
        break;
      }
      if (isStale(m, sub.subscription) || (await store.retiredSubscription(m.id, sub.subscription))) {
        await say(
          m,
          `:rotating_light: ${who(m)} paid a second subscription for their membership (${sub.subscription}) next to the current one (${m.stripeSubscriptionId}). Nothing was issued for it. Cancel and refund one of them in Stripe.`,
        );
        break;
      }
      const covered = (await store.certificates(m.id)).find((c) => c.periodStart === day(period.start) && c.periodEnd === day(period.end) && c.stripeInvoiceId !== inv.id);
      if (covered) {
        const source = covered.stripeInvoiceId ?? 'a manual payment';
        await store.logEvent(
          m.id,
          covered.stripeInvoiceId ? 'invoice_payment_overlap' : 'manual_payment_overlap',
          { kind: 'stripe', id: event.id },
          { invoice: inv.id, certificate: covered.number },
        );
        await say(m, `:warning: Invoice ${inv.id} and ${source} both cover certificate ${covered.number} for ${who(m)}. Reconcile both payments.`, inv.id);
        break;
      }
      const first = m.status === 'pending' || (await activatedBy(store, m, inv.id));
      if (sub.subscription && m.stripeSubscriptionId !== sub.subscription) m = await store.linkStripe(m.id, { subscriptionId: sub.subscription }, { kind: 'stripe', id: event.id });
      // A switch scheduled for this renewal: the certificate shows the level now paid for, even
      // if customer.subscription.updated has not arrived yet.
      const plan = sub.subscription ? await currentPlan(sub.subscription, { env, fetch: deps.fetch }).catch(() => null) : null;
      const switched = plan && (plan.level !== m.level || plan.cycle !== m.cycle) ? plan : null;
      const paidUntil = m.paidUntil && m.paidUntil > day(period.end) ? m.paidUntil : day(period.end);
      m = await store.update(m.id, { paidUntil, paymentMode: 'automatic', ...(m.joinedAt ? {} : { joinedAt: day(period.start) }), ...switched }, { kind: 'stripe', id: event.id });
      if (m.status === 'pending' || m.status === 'past_due' || m.status === 'imported_manual') m = await moveTo(store, m, 'active', event.id, { payload: { invoice: inv.id } });
      await confirmAttempt(store, m.id, sub.metadata.attempt, 'paid');
      const cert = await store.issueCertificate(m.id, { periodStart: day(period.start), periodEnd: day(period.end), stripeInvoiceId: inv.id }, { kind: 'stripe', id: event.id });
      await store.enqueue(m.id, event.id, `member-certificate:${cert.id}`, {
        kind: 'certificate',
        certificateId: cert.id,
        template: first ? 'membership-welcome' : 'membership-renewed',
      });
      await say(m, `${first ? ':tada: New member' : ':repeat: Renewed'}: ${who(m)}, ${levelInfo(m.level).name}, ${m.cycle}. Certificate ${cert.number}.`, inv.id);
      break;
    }

    case 'checkout.session.completed': {
      const meta = o.metadata as Record<string, string> | undefined;
      if (meta?.source !== MEMBERSHIP_SOURCE) break;
      let m = await memberOf(store, { memberId: meta.memberId });
      const subscriptionId = typeof o.subscription === 'string' ? o.subscription : undefined;
      if (!m || !subscriptionId || (await store.retiredSubscription(m.id, subscriptionId))) break;
      const attempt = await store.checkoutAttempt(m.id);
      if (meta.attempt && meta.attempt !== attempt?.id) break;
      if (m.stripeSubscriptionId !== subscriptionId) {
        if (m.stripeSubscriptionId || m.status === 'ended') break;
        m = await store.linkStripe(m.id, { subscriptionId }, { kind: 'stripe', id: event.id });
      }
      if (m.status !== 'imported_manual') break;
      const trial = meta.attempt ? Boolean(attempt?.trialEnd) : (await subscriptionSnapshot(subscriptionId, { env, fetch: deps.fetch })).status === 'trialing';
      if (!trial) break;
      await confirmAttempt(store, m.id, meta.attempt, 'automatic');
      // Switched to automatic payment; the first charge comes when the paid period ends.
      m = await store.update(m.id, { paymentMode: 'automatic' }, { kind: 'stripe', id: event.id });
      m = await moveTo(store, m, 'active', event.id, { payload: { switchedToAutomatic: true } });
      await say(m, `:credit_card: ${who(m)} switched to automatic payment (first charge when the paid period ends).`);
      if (m.paidUntil) {
        const email = renderEmail('automatic-payment-set-up', {
          ...membershipProps(m, origin),
          paidThrough: longDate(lastDay(m.paidUntil)),
          firstPayment: longDate(m.paidUntil),
        });
        await mail(m, `member-automatic:${m.id}:${subscriptionId}`, email);
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
      if (!m || !RUNNING.includes(m.status) || (sub.subscription && isStale(m, sub.subscription))) break;
      // Stripe does not keep events in order: the failure of an attempt can arrive after the invoice was paid.
      if ((await store.certificates(m.id)).some((c) => c.stripeInvoiceId === inv.id)) {
        log(`[membership] ${event.type} for ${inv.id}, which is already paid; skipped`);
        break;
      }
      if (!sub.subscription || !(await applyInvoice(m, inv, sub.subscription, 'failed'))) break;
      if (m.status === 'active') m = await moveTo(store, m, 'past_due', event.id, { payload: { invoice: inv.id, event: event.type } });
      const needsConfirmation = event.type === 'invoice.payment_action_required';
      const nextAttempt = inv.next_payment_attempt ? longDate(day(inv.next_payment_attempt)) : null;
      await mail(
        m,
        `member-payment-failed:${inv.id}:${inv.attempt_count ?? 0}:${needsConfirmation ? 'confirm' : 'declined'}`,
        renderEmail('payment-failed', { ...membershipProps(m, origin), payUrl: safeStripeUrl(inv.hosted_invoice_url), needsConfirmation, nextAttempt }),
      );
      const retry = nextAttempt ? `Stripe tries again on ${nextAttempt}` : 'No retry scheduled; the subscription ends if it stays unpaid';
      await say(
        m,
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
      if (!m || isStale(m, s.id) || (await store.retiredSubscription(m.id, s.id))) break;
      // Catches a missed payment_failed event: Stripe says the subscription is behind. The event can be
      // older than the payment that settled it, so the status is read from Stripe now.
      const { status, plan } = await subscriptionSnapshot(s.id, { env, fetch: deps.fetch });
      if ((status === 'past_due' || status === 'unpaid') && m.status === 'active') {
        m = await moveTo(store, m, 'past_due', event.id, { payload: { subscriptionStatus: status } });
      }
      if (!plan || (plan.level === m.level && plan.cycle === m.cycle)) break;
      await store.update(m.id, { level: plan.level, cycle: plan.cycle }, { kind: 'stripe', id: event.id });
      await say(m, `:arrows_counterclockwise: ${who(m)} switched to ${levelInfo(plan.level).name}, ${plan.cycle}.`);
      break;
    }

    case 'customer.subscription.deleted': {
      const s = o as unknown as Subscription;
      if (s.metadata?.source !== MEMBERSHIP_SOURCE) break;
      const m = await memberOf(store, { memberId: s.metadata.memberId, subscriptionId: s.id });
      // A duplicate or replaced subscription ending says nothing about the membership.
      if (!m || m.status === 'ended' || isStale(m, s.id) || (await store.retiredSubscription(m.id, s.id))) break;
      const why = s.cancellation_details?.reason;
      const reason = m.status === 'resigning' && (m.resignationConfirmedAt || why === 'cancellation_requested') && why !== 'payment_failed' ? 'resigned' : 'lapsed';
      const ended = await moveTo(store, m, 'ended', event.id, { reason });
      if (ended.status !== 'ended') break;
      await say(m, `:wave: Membership ended (${reason}): ${who(ended)}.`);
      if (reason === 'lapsed') await mail(ended, `member-lapsed:${ended.id}:${s.id}`, renderEmail('membership-lapsed', membershipProps(ended, origin)));
      break;
    }

    case 'charge.refunded':
    case 'charge.dispute.created': {
      const c = o as unknown as ChargeOrDispute;
      const dispute = event.type === 'charge.dispute.created';
      const customer = dispute ? c.charge && (await chargeCustomer(c.charge, { env, fetch: deps.fetch })) : c.customer;
      const m = customer ? await store.byStripeCustomer(customer) : null;
      if (!m) break;
      const amount = money(dispute ? c.amount : c.amount_refunded, c.currency);
      await store.logEvent(
        m.id,
        dispute ? 'payment_disputed' : 'payment_refunded',
        { kind: 'stripe', id: event.id },
        {
          charge: dispute ? c.charge : c.id,
          amount,
          ...(dispute && c.reason ? { reason: c.reason } : {}),
        },
      );
      await say(
        m,
        dispute
          ? `:rotating_light: ${who(m)} disputed a membership payment of ${amount} with their bank${c.reason ? ` (${c.reason.replace(/_/g, ' ')})` : ''}. Answer it in Stripe. The membership is unchanged; decide whether it continues.`
          : `:money_with_wings: ${amount} of a membership payment by ${who(m)} was refunded. The membership is unchanged; decide whether it continues.`,
      );
      break;
    }
  }
}

export const POST: APIRoute = ({ request }) => handleMembershipWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
