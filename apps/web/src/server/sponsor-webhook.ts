/**
 * Sponsorship events from the shared Stripe webhook (POST /api/stripe/webhook, server/stripe-webhook.ts):
 * it verifies the signature and calls processSponsorEvent with every event. Card only.
 *
 *   checkout.session.completed      a one-time card payment (Checkout or a payment link) starts the
 *                                   sponsorship; a subscription is linked (a second live one for the
 *                                   same sponsor is cancelled and flagged: never charge twice)
 *   invoice.paid                    the first payment and every renewal: active, paid until the term
 *                                   end, with the tier and cycle Stripe actually charged; welcome once
 *   invoice.payment_failed          a declined card: payment overdue, email with Stripe's page, Slack
 *   invoice.payment_action_required the bank wants a confirmation (3D Secure): the same, worded so
 *   customer.subscription.updated   a change scheduled for the renewal took effect; Stripe reporting
 *                                   past_due or unpaid marks the payment overdue
 *   customer.subscription.deleted   ended: as agreed (ending), lapsed (unpaid), or never paid
 *
 * Safe to receive twice: handled events are skipped (sponsor_stripe_events), status changes are
 * compare-and-set and only the call that made a change sends its emails, which also carry
 * idempotency keys. An event is marked handled only after it worked. A payment for a sponsorship
 * that has ended changes nothing and is flagged in Slack.
 */
import { TransitionError, chfMinor, fromLookupKey, type Actor, type FeeStore, isRecurring, type Sponsor, type SponsorStore, type Status } from '@zurichjs/sponsorship';
import { siteOrigin } from './auth.ts';
import { longDate } from './dates.ts';
import { fail, json, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import {
  adminUrl,
  afterLastMeetup,
  emailSponsor,
  note,
  planLabel,
  slackText,
  sponsorFee,
  sponsorStore,
  termLabel,
  tierBenefits,
  who,
  zurichDay,
  zurichDayOf,
  type NotifyDeps,
} from './sponsor.ts';
import { feeStore } from './sponsor-fees.ts';
import { closeStaleLinks, reconcileFee, settleSponsorPayment } from './sponsor-offers.ts';
import { SPONSOR_SOURCE, cancelNow, closePaymentLink, liveSubscriptions, planOfSubscription, type StripeDeps } from './sponsor-stripe.ts';
import type { StripeEvent } from './stripe-webhook.ts';

interface Invoice {
  id: string;
  amount_paid?: number;
  billing_reason?: string | null;
  attempt_count?: number;
  next_payment_attempt?: number | null;
  hosted_invoice_url?: string | null;
  metadata?: Record<string, string> | null;
  lines?: { data?: { period?: { start: number; end: number }; price?: { lookup_key?: string | null } | null; pricing?: { price_details?: { price?: string } } }[] };
  parent?: { subscription_details?: { subscription?: string | { id: string }; metadata?: Record<string, string> | null } | null } | null;
  subscription?: string | { id: string } | null;
  subscription_details?: { metadata?: Record<string, string> | null } | null;
}

interface Subscription {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { lookup_key?: string | null } }[] };
}

export interface SponsorWebhookDeps {
  env?: Env;
  store?: SponsorStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: number;
  log?: (m: string) => void;
  /** Payment quotes (sponsor-fees.ts); the database by default. */
  fees?: FeeStore;
}

const safeStripeUrl = (url: string | null | undefined) => (url?.startsWith('https://invoice.stripe.com/') ? url : null);

/** The invoice's subscription and its metadata (both API shapes), or the invoice's own metadata (one-time). */
function sourceOf(inv: Invoice): { subscription: string | null; metadata: Record<string, string> } | null {
  const details = inv.parent?.subscription_details ?? (inv.subscription ? { subscription: inv.subscription, metadata: inv.subscription_details?.metadata } : null);
  if (details?.subscription) {
    const sub = details.subscription;
    return { subscription: typeof sub === 'string' ? sub : sub.id, metadata: details.metadata ?? {} };
  }
  return inv.metadata ? { subscription: null, metadata: inv.metadata } : null;
}

function termOf(inv: Invoice) {
  return (inv.lines?.data ?? []).map((l) => l.period).reduce<{ start: number; end: number } | undefined>((best, p) => (p && (!best || p.end > best.end) ? p : best), undefined);
}

async function sponsorOf(store: SponsorStore, ids: { sponsorId?: string; subscriptionId?: string | null; paymentLinkId?: string | null }): Promise<Sponsor | null> {
  if (ids.sponsorId) {
    const s = await store.get(ids.sponsorId);
    if (s) return s;
  }
  if (ids.subscriptionId) {
    const s = await store.byStripeSubscription(ids.subscriptionId);
    if (s) return s;
  }
  return ids.paymentLinkId ? store.byPaymentLink(ids.paymentLinkId) : null;
}

/** Moves to `to` when allowed. `changed` is true only for the call that made the change. */
async function moveTo(store: SponsorStore, s: Sponsor, to: Status, by: string | Actor, extra: { reason?: 'cancelled' | 'lapsed'; payload?: Record<string, unknown> } = {}) {
  if (s.status === to) return { sponsor: s, changed: false };
  const actor: Actor = typeof by === 'string' ? { kind: 'stripe', id: by } : by;
  try {
    return { sponsor: await store.transition(s.id, { from: s.status, to, actor, reason: extra.reason, payload: extra.payload }), changed: true };
  } catch (cause) {
    if (cause instanceof TransitionError) return { sponsor: (await store.get(s.id)) ?? s, changed: false };
    throw cause;
  }
}

const isStale = (s: Sponsor, subscriptionId: string) => !!s.stripeSubscriptionId && s.stripeSubscriptionId !== subscriptionId;

/** The first payment of a sponsorship: welcome every confirmed contact, one Slack note with what to deliver. */
async function welcome(s: Sponsor, term: string | null, nextPayment: string | null, deps: NotifyDeps) {
  const meetups = s.cycle === 'once' ? await deps.store.meetups(s.id) : [];
  const needsLogo = !(await deps.store.logos(s.id)).length;
  await emailSponsor(s, 'sponsor-welcome', (base) => ({ ...base, term, nextPayment, needsLogo }), { ...deps, meetups, key: `sponsor-welcome:${s.id}` });
  const deliver = tierBenefits(s.tier)
    .map((b) => `• ${b}`)
    .join('\n');
  await note(
    `:tada: New sponsor: ${who(s)}, ${sponsorFee(s, meetups)}${meetups.length ? ` (${meetups.map((m) => slackText(`${m.title}, ${longDate(m.date)}`)).join('; ')})` : ''}.${needsLogo ? ' No logo yet.' : ''} Add them to Sanity as a current sponsor.${deliver ? `\n*To deliver:*\n${deliver}` : ''}\n${adminUrl(deps.origin, s.id)}`,
    deps,
  );
}

/**
 * A one-time sponsorship is paid: it runs until the day after its last meetup. `by` is the Stripe
 * event, or the board accepting a payment it reviewed.
 */
export async function startOnce(s: Sponsor, by: string | Actor, today: string, deps: NotifyDeps, fees: FeeStore | null = null) {
  if (s.status === 'ended') return anomaly(s, `A one-time payment arrived for ${who(s)}, which has ended. Check it in Stripe and refund if needed.`, deps);
  if (s.status !== 'pending') return;
  const actor: Actor = typeof by === 'string' ? { kind: 'stripe', id: by } : by;
  const meetups = await deps.store.meetups(s.id);
  const m = await deps.store.update(s.id, { startedAt: today, paidUntil: afterLastMeetup(meetups) }, actor);
  const r = await moveTo(deps.store, m, 'active', actor);
  if (r.changed) {
    await closePaymentLink(r.sponsor, deps.store, { env: deps.env, fetch: deps.fetch });
    // Its quote is paid now; any link of an earlier offer goes off as well.
    if (fees) await closeStaleLinks(r.sponsor, 'sponsorship', null, fees, deps.store, { env: deps.env, fetch: deps.fetch }).catch(() => undefined);
    await welcome(r.sponsor, null, null, deps);
  }
}

/**
 * Records a one-time payment against the board's offer (sponsor-offers.ts) before anything starts:
 * once per Stripe session, paying the quote only when owner, currency, amount and link match the
 * open quote. A payment that does not match waits for the board (Slack, and the sponsor's page in
 * the admin area) and starts nothing; the board accepts or dismisses it there. Returns whether the
 * sponsorship may start. Without a database for quotes (the in-memory tests), it may.
 */
async function settleOnce(
  s: Sponsor,
  session: Record<string, unknown>,
  quoteId: string | null,
  paymentLink: string | null,
  deps: NotifyDeps,
  fees: FeeStore | null,
  stripe: StripeDeps,
) {
  if (!fees) {
    deps.log?.('[sponsorship] no database for quotes; payment not recorded against a quote');
    return true;
  }
  if (
    typeof session.id !== 'string' ||
    !session.id ||
    typeof session.currency !== 'string' ||
    !/^[a-z]{3}$/.test(session.currency) ||
    typeof session.amount_total !== 'number' ||
    !Number.isSafeInteger(session.amount_total) ||
    session.amount_total < 0
  )
    throw new Error('Incomplete Checkout payment.');
  const r = await settleSponsorPayment(
    s,
    {
      sessionId: session.id,
      quoteId,
      paymentLinkId: paymentLink,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      currency: session.currency,
      amountMinor: session.amount_total,
    },
    fees,
  );
  if (r.fresh && r.payment.outcome === 'review') {
    await deps.store.log(
      s.id,
      'payment_review',
      { kind: 'stripe', id: r.payment.sessionId },
      { sessionId: r.payment.sessionId, reason: r.payment.reason, amountMinor: r.payment.amountMinor },
    );
    await anomaly(
      s,
      `A payment of ${chfMinor(r.payment.amountMinor)} from ${who(s)} needs a decision: ${r.payment.reason} Nothing started. Accept or dismiss it on their page.`,
      deps,
    );
  }
  if (r.fresh && r.payment.outcome !== 'review') await reconcileFee(r.payment, fees, stripe).catch(() => false);
  return r.go;
}

/** The fee store, or null where there is no database. */
const feesOf = (deps: SponsorWebhookDeps, env: Env): FeeStore | null => {
  try {
    return deps.fees ?? feeStore(env);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return null;
    throw cause;
  }
};

const anomaly = (s: Sponsor, text: string, deps: NotifyDeps) => note(`:rotating_light: ${text} ${adminUrl(deps.origin, s.id)}`, deps);

/** One verified Stripe event for sponsorships; events that are not a sponsor's are skipped. */
export async function processSponsorEvent(event: StripeEvent, deps: SponsorWebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  let store: SponsorStore;
  try {
    store = deps.store ?? sponsorStore(env);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Sponsorship database not configured.');
    throw cause;
  }
  const notify: NotifyDeps = { env, store, origin: siteOrigin(env), fetch: deps.fetch, slack: deps.slack, log };
  const stripeDeps = { env, fetch: deps.fetch };
  const actor = { kind: 'stripe', id: event.id } as const;
  const today = zurichDay(deps.now ? new Date(deps.now) : new Date());

  try {
    if (await store.stripeEventSeen(event.id)) return json(200, { ok: true, duplicate: true });
    const o = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const meta = o.metadata as Record<string, string> | undefined;
        const paymentLink = typeof o.payment_link === 'string' ? o.payment_link : null;
        if (meta?.source !== SPONSOR_SOURCE && !paymentLink) break;
        let s = await sponsorOf(store, { sponsorId: meta?.source === SPONSOR_SOURCE ? meta.sponsorId : undefined, paymentLinkId: paymentLink });
        if (!s && paymentLink) {
          const historical = await feesOf(deps, env)?.quoteByLink(paymentLink);
          if (historical?.subject === 'sponsorship') s = await store.get(historical.sponsorId);
        }
        if (!s) break;
        if (o.mode === 'payment') {
          if (o.payment_status !== 'paid') break;
          const go = await settleOnce(s, o, meta?.quoteId ?? null, paymentLink, notify, feesOf(deps, env), stripeDeps);
          if (go && s.cycle === 'once') {
            if (typeof o.customer === 'string' && !s.stripeCustomerId) s = await store.linkStripe(s.id, { customerId: o.customer }, actor);
            await startOnce(s, event.id, today, notify, feesOf(deps, env));
          }
          break;
        }
        const subscriptionId = typeof o.subscription === 'string' ? o.subscription : null;
        if (!subscriptionId) break;
        if (typeof o.customer === 'string' && !s.stripeCustomerId) s = await store.linkStripe(s.id, { customerId: o.customer }, actor);
        // Never two live subscriptions: an old tab paid after another payment was set up.
        if (s.stripeSubscriptionId && s.stripeSubscriptionId !== subscriptionId) {
          const live = s.stripeCustomerId ? await liveSubscriptions(s.stripeCustomerId, stripeDeps) : [];
          if (live.includes(s.stripeSubscriptionId)) {
            await cancelNow(subscriptionId, stripeDeps);
            await anomaly(s, `${who(s)} paid a second card subscription (an old payment page). It was cancelled; refund its first payment in Stripe.`, notify);
            break;
          }
        }
        if (s.stripeSubscriptionId !== subscriptionId) s = await store.linkStripe(s.id, { subscriptionId, checkoutSessionId: null }, actor);
        // The sponsor agreed to a recurring processing fee at Checkout: that quote is now in force.
        if (meta?.quoteId && meta.acceptedBy) {
          const accepted = await (deps.fees ?? feeStore(env)).acceptQuote(meta.quoteId, meta.acceptedBy, subscriptionId);
          if (!accepted) await anomaly(s, `${who(s)} started a subscription with a processing-fee offer that is no longer open. Check the fee line in Stripe.`, notify);
        }
        if (s.paymentMode === 'manual') s = await store.update(s.id, { paymentMode: 'card' }, actor);
        break;
      }

      case 'invoice.paid': {
        const inv = o as unknown as Invoice;
        const src = sourceOf(inv);
        if (!src || src.metadata.source !== SPONSOR_SOURCE || !inv.amount_paid) break;
        let s = await sponsorOf(store, { sponsorId: src.metadata.sponsorId, subscriptionId: src.subscription });
        if (!s) {
          log(`[sponsorship] invoice ${inv.id}: no sponsor; skipped`);
          break;
        }
        // Only a validated Checkout session can start a one-time sponsorship.
        if (!src.subscription) break;
        if (s.status === 'ended') {
          await anomaly(s, `A payment arrived for ${who(s)}, which has ended. Check the subscription in Stripe and refund if needed.`, notify);
          break;
        }
        if (isStale(s, src.subscription)) break;
        // Only a new term moves paid through on: a proration for an upgrade is not one.
        const newTerm = !inv.billing_reason || inv.billing_reason === 'subscription_create' || inv.billing_reason === 'subscription_cycle';
        const period = termOf(inv);
        if (!period || !newTerm) break;
        const first = s.status === 'pending';
        if (s.stripeSubscriptionId !== src.subscription) s = await store.linkStripe(s.id, { subscriptionId: src.subscription, checkoutSessionId: null }, actor);
        // The plan Stripe charged is the truth (two payment pages with different tiers, an applied switch).
        const charged = fromLookupKey(inv.lines?.data?.map((l) => l.price?.lookup_key).find(Boolean));
        const paidUntil = zurichDayOf(period.end);
        s = await store.update(
          s.id,
          {
            ...(s.paidUntil && s.paidUntil > paidUntil ? {} : { paidUntil }),
            ...(s.startedAt ? {} : { startedAt: zurichDayOf(period.start) }),
            ...(charged && (charged.tier !== s.tier || charged.cycle !== s.cycle) ? charged : {}),
            paymentMode: 'card',
          },
          actor,
        );
        const moved =
          s.status === 'pending' || s.status === 'past_due' ? await moveTo(store, s, 'active', event.id, { payload: { invoice: inv.id } }) : { sponsor: s, changed: false };
        s = moved.sponsor;
        if (first && moved.changed) await welcome(s, termLabel(zurichDayOf(period.start), paidUntil), isRecurring(s.cycle) ? longDate(paidUntil) : null, notify);
        else if (!first) await note(`:repeat: Paid: ${who(s)}, ${termLabel(zurichDayOf(period.start), paidUntil)}.`, notify);
        break;
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        const inv = o as unknown as Invoice;
        const src = sourceOf(inv);
        if (!src || src.metadata.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: src.metadata.sponsorId, subscriptionId: src.subscription });
        // Someone still in Checkout fixes the card there; only running sponsorships concern us.
        if (!s || !(s.status === 'active' || s.status === 'past_due' || s.status === 'ending')) break;
        if (s.status === 'active') s = (await moveTo(store, s, 'past_due', event.id, { payload: { invoice: inv.id, event: event.type } })).sponsor;
        const problem = event.type === 'invoice.payment_action_required' ? 'confirm' : 'declined';
        const nextAttempt = inv.next_payment_attempt ? longDate(zurichDayOf(inv.next_payment_attempt)) : null;
        await emailSponsor(s, 'sponsor-payment-problem', (base) => ({ ...base, problem, payUrl: safeStripeUrl(inv.hosted_invoice_url), nextAttempt }), {
          ...notify,
          to: 'billing',
          key: `sponsor-payment:${inv.id}:${inv.attempt_count ?? 0}:${problem}`,
        });
        await note(
          `:warning: Payment ${problem === 'confirm' ? 'needs a bank confirmation' : 'failed'} for ${who(s)}${nextAttempt ? `; Stripe tries again on ${nextAttempt}` : ''}. Their billing contact was emailed.`,
          notify,
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        if (!s || s.status === 'ended' || isStale(s, sub.id)) break;
        if ((sub.status === 'past_due' || sub.status === 'unpaid') && s.status === 'active')
          s = (await moveTo(store, s, 'past_due', event.id, { payload: { subscriptionStatus: sub.status } })).sponsor;
        const plan = planOfSubscription(sub);
        if (!plan || (plan.tier === s.tier && plan.cycle === s.cycle) || s.status === 'pending') break;
        const previous = planLabel(s);
        const before = who(s);
        s = await store.update(s.id, plan, actor);
        await emailSponsor(s, 'sponsor-change', (base) => ({ ...base, timing: 'applied', from: null, previous, manual: false }), {
          ...notify,
          key: `sponsor-change-applied:${event.id}`,
        });
        await note(`:arrows_counterclockwise: ${before} is now ${planLabel(s)}, as scheduled at the renewal. Update the tier in Sanity if the logo size changes.`, notify);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        const s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        if (!s || isStale(s, sub.id)) break;
        if (s.status === 'ended') {
          if (s.stripeSubscriptionId === sub.id) await store.linkStripe(s.id, { subscriptionId: null }, actor);
          break;
        }
        const reason = s.status === 'ending' ? 'cancelled' : 'lapsed';
        const ended = await moveTo(store, s, 'ended', event.id, { reason });
        await store.linkStripe(s.id, { subscriptionId: null, checkoutSessionId: null }, actor);
        if (!ended.changed) break;
        if (s.status !== 'pending') await emailSponsor(ended.sponsor, 'sponsor-ended', (base) => ({ ...base, reason }), { ...notify, key: `sponsor-ended:${s.id}:${event.id}` });
        await note(
          s.status === 'pending'
            ? `:hourglass: ${who(s)} never paid; the sponsorship was closed.`
            : `:wave: Sponsorship ended (${reason === 'cancelled' ? 'as agreed' : 'unpaid'}): ${who(ended.sponsor)}. Mark them as a past sponsor in Sanity.`,
          notify,
        );
        break;
      }
    }

    await store.markStripeEvent(event.id, event.type);
    return json(200, { ok: true });
  } catch (cause) {
    console.error(`[sponsorship] webhook ${event.type} ${event.id} failed`, cause);
    return fail(500, 'Webhook handling failed; Stripe will retry.');
  }
}
