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
 *   charge.refunded                 recorded and flagged in Slack; the sponsorship does not change
 *   charge.dispute.created          the same: what a refund or dispute means for the benefits is the
 *                                   board's call (no owner rule yet), so nothing is taken away
 *
 * Safe to receive twice, and in any order: handled events are skipped (sponsor_stripe_events),
 * status changes are compare-and-set, and every email and Slack note is a notice keyed by the
 * invoice, session or event (sponsor-notices.ts), queued with the change and sent after it. A retry
 * after a failure half-way sends what the first try owed (the welcome of a first payment included),
 * never a second copy. A failure for an invoice that was already paid, or a "past due" older than
 * the last payment, changes nothing. An event is marked handled only after it worked. A payment for
 * a sponsorship that has ended, or a second payment for a one-time one, changes nothing and is
 * flagged in Slack.
 */
import { feeStore } from './sponsor-fees.ts';
import { reconcileFee, settleSponsorPayment, closeStaleLinks } from './sponsor-offers.ts';
import {
  currentOfferId,
  TransitionError,
  chfMinor,
  type FeeStore,
  fromLookupKey,
  label,
  paymentEvidence,
  type NewNotice,
  type Sponsor,
  type SponsorStore,
  type Status,
} from '@zurichjs/sponsorship';
import { siteOrigin } from './auth.ts';
import { longDate } from './dates.ts';
import { fail, json, type Env } from './http.ts';
import { MembershipUnavailable } from './membership-db.ts';
import type { MembershipSlack } from './membership-slack.ts';
import { RAFFLE_SOURCE } from './raffle.ts';
import { adminUrl, afterLastMeetup, planLabel, slackText, sponsorFee, sponsorStore, termLabel, tierBenefits, who, zurichDay, zurichDayOf, type NotifyDeps } from './sponsor.ts';
import { emailNotice, sendNotices, slackNotice } from './sponsor-notices.ts';
import {
  SPONSOR_SOURCE,
  checkoutFeeItem,
  confirmedFeeItem,
  cancelNow,
  closePaymentLink,
  liveSubscriptions,
  planOfSubscription,
  subscriptionPaidUp,
  type StripeDeps,
} from './sponsor-stripe.ts';
import { stripeApi } from './stripe.ts';
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

interface Charge {
  id: string;
  customer?: string | null;
  amount?: number;
  amount_refunded?: number;
}

interface Dispute {
  id: string;
  charge?: string | null;
  amount?: number;
  reason?: string | null;
}

interface Subscription {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { lookup_key?: string | null } }[] };
}

export interface SponsorWebhookDeps {
  fees?: FeeStore;
  env?: Env;
  store?: SponsorStore;
  fetch?: typeof fetch;
  slack?: MembershipSlack;
  now?: number;
  log?: (m: string) => void;
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
  const lines = inv.lines?.data ?? [];
  const planLines = lines.filter((line) => fromLookupKey(line.price?.lookup_key));
  const line = planLines.length === 1 ? planLines[0] : lines.length === 1 ? lines[0] : null;
  return line?.period;
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
async function moveTo(
  store: SponsorStore,
  s: Sponsor,
  to: Status,
  eventId: string,
  extra: { reason?: 'cancelled' | 'lapsed'; payload?: Record<string, unknown>; notices?: NewNotice[] } = {},
) {
  if (s.status === to) return { sponsor: s, changed: false };
  try {
    return {
      sponsor: await store.transition(s.id, { from: s.status, to, actor: { kind: 'stripe', id: eventId }, reason: extra.reason, payload: extra.payload, notices: extra.notices }),
      changed: true,
    };
  } catch (cause) {
    if (cause instanceof TransitionError) return { sponsor: (await store.get(s.id)) ?? s, changed: false };
    throw cause;
  }
}

const isStale = (s: Sponsor, subscriptionId: string) => !!s.stripeSubscriptionId && s.stripeSubscriptionId !== subscriptionId;

/**
 * The activation of the sponsorship as it is offered now (its invoice or Checkout session): the
 * last pending to active, and none when it was started again after that (sponsoring again).
 */
async function activation(store: SponsorStore, sponsorId: string) {
  const events = await store.events(sponsorId);
  const i = events.findLastIndex((e) => e.type === 'status_changed' && e.fromStatus === 'pending' && e.toStatus === 'active');
  const restarted = events.findLastIndex((e) => e.type === 'status_changed' && e.fromStatus === 'ended' && e.toStatus === 'pending');
  return i > restarted ? events[i] : undefined;
}

/**
 * This invoice was paid already: a failure that arrives after the payment changes nothing. A quick
 * look before the change; overdueInvoice decides again in the same step as the change.
 */
async function invoicePaid(store: SponsorStore, sponsorId: string, invoiceId: string) {
  return (await store.events(sponsorId)).some((e) => paymentEvidence(e, invoiceId));
}

/** A payment Stripe created after this event (an older "past due" arriving last changes nothing). */
async function paidSince(store: SponsorStore, sponsorId: string, created: number | undefined) {
  if (!created) return false;
  return (await store.events(sponsorId)).some((e) => e.type === 'invoice_paid' && typeof e.payload.created === 'number' && e.payload.created > created);
}

/**
 * What a first payment owes: the welcome to every confirmed contact, one Slack note with what to
 * deliver. Keyed by the payment that activates it (`ref`: its invoice or Checkout session), so each
 * term after sponsoring again has its own welcome, and the same payment twice has one.
 */
async function welcomeNotices(s: Sponsor, ref: string, term: string | null, nextPayment: string | null, deps: NotifyDeps): Promise<NewNotice[]> {
  const meetups = s.cycle === 'once' ? await deps.store.meetups(s.id) : [];
  const needsLogo = !(await deps.store.logos(s.id)).length;
  const deliver = tierBenefits(s.tier)
    .map((b) => `• ${b}`)
    .join('\n');
  return [
    emailNotice(`sponsor-welcome:${s.id}:${ref}`, 'sponsor-welcome', { term, nextPayment, needsLogo }),
    slackNotice(
      `sponsor-welcome:${s.id}:${ref}:slack`,
      `:tada: New sponsor: ${who(s)}, ${sponsorFee(s, meetups)}${meetups.length ? ` (${meetups.map((m) => slackText(`${m.title}, ${longDate(m.date)}`)).join('; ')})` : ''}.${needsLogo ? ' No logo yet.' : ''}${s.partnerId ? '' : ' Choose their partner record on their page here so the site shows them with their logo; until then it lists them by name.'}${deliver ? `\n*To deliver:*\n${deliver}` : ''}\n${adminUrl(deps.origin, s.id)}`,
    ),
  ];
}

/**
 * A one-time sponsorship is paid (a Checkout session, or its invoice): it runs until the day after
 * its last meetup. The same payment again (a retry, or the receipt after the session) only finishes
 * what is left: the payment link switched off. A different card payment for a sponsorship that
 * is already paid is flagged.
 */
export async function startOnce(s: Sponsor, paid: { session?: string; invoice?: string | null }, eventId: string, today: string, deps: NotifyDeps & { stripe: StripeDeps }) {
  const ref = paid.session ?? paid.invoice ?? eventId;
  if (s.status === 'ended') return anomaly(s, `A one-time payment arrived for ${who(s)}, which has ended. Check it in Stripe and refund if needed.`, ref, deps);
  if (s.status === 'pending') {
    const meetups = await deps.store.meetups(s.id);
    const m = await deps.store.update(s.id, { startedAt: today, paidUntil: afterLastMeetup(meetups) }, { kind: 'stripe', id: eventId });
    const r = await moveTo(deps.store, m, 'active', eventId, { payload: paid, notices: await welcomeNotices(m, ref, null, null, deps) });
    s = r.sponsor;
  } else if (paid.session) {
    const first = (await activation(deps.store, s.id))?.payload ?? {};
    const same = first.session === paid.session || (!!paid.invoice && first.invoice === paid.invoice);
    if (!same) await anomaly(s, `${who(s)} paid a one-time sponsorship that was already paid (a second payment page). Check it in Stripe and refund if needed.`, ref, deps);
  }
  if (s.paymentLinkId && s.status !== 'pending') await closePaymentLink(s, deps.store, deps.stripe);
}

/** A Slack alert for the board, once per payment or event. */
const anomaly = (s: Sponsor, text: string, ref: string, deps: NotifyDeps) =>
  deps.store.queueNotices(s.id, [slackNotice(`sponsor-anomaly:${s.id}:${ref}`, `:rotating_light: ${text} ${adminUrl(deps.origin, s.id)}`)]);

/** The CHF amount of a Stripe amount in cents, as "CHF 840". */
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
      session.id,
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

const chfOf = (cents: number | undefined) => `CHF ${((cents ?? 0) / 100).toLocaleString('de-CH')}`;

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
  const stripeDeps = { env, fetch: deps.fetch };
  const notify = { env, store, origin: siteOrigin(env), fetch: deps.fetch, slack: deps.slack, log, stripe: stripeDeps };
  /** The sponsorship this event concerns: its queued notices are sent once the event is handled. */
  let touched: string | null = null;
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
        // A raffle add-on is paid apart from the sponsorship (raffle-webhook.ts): never a sponsorship payment.
        if (meta?.source === RAFFLE_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: meta?.source === SPONSOR_SOURCE ? meta.sponsorId : undefined, paymentLinkId: paymentLink });
        if (!s && paymentLink) {
          const old = await feesOf(deps, env)?.quoteByLink(paymentLink);
          if (old?.subject === 'sponsorship') s = await store.get(old.sponsorId);
        }
        if (!s) break;
        touched = s.id;
        if (o.mode === 'payment') {
          if (o.payment_status === 'paid' && (await settleOnce(s, o, meta?.quoteId ?? null, paymentLink, notify, feesOf(deps, env), stripeDeps)) && s.cycle === 'once') {
            if (typeof o.customer === 'string' && !s.stripeCustomerId) s = await store.linkStripe(s.id, { customerId: o.customer }, actor);
            await startOnce(s, { session: String(o.id), invoice: typeof o.invoice === 'string' ? o.invoice : null }, event.id, today, notify);
          }
          const feeDb = feesOf(deps, env);
          if (feeDb) await closeStaleLinks(s, 'sponsorship', null, feeDb, store, stripeDeps);
          break;
        }
        if (typeof o.customer === 'string' && !s.stripeCustomerId) s = await store.linkStripe(s.id, { customerId: o.customer }, actor);
        const subscriptionId = typeof o.subscription === 'string' ? o.subscription : null;
        if (!subscriptionId) break;
        // Never two live subscriptions: an old tab paid after another payment was set up.
        if (s.stripeSubscriptionId && s.stripeSubscriptionId !== subscriptionId) {
          const live = s.stripeCustomerId ? await liveSubscriptions(s.stripeCustomerId, stripeDeps) : [];
          if (live.includes(s.stripeSubscriptionId)) {
            await cancelNow(subscriptionId, stripeDeps);
            await anomaly(s, `${who(s)} paid a second card subscription (an old payment page). It was cancelled; refund its first payment in Stripe.`, subscriptionId, notify);
            break;
          }
        }
        if (s.status === 'ended' || (s.checkoutSessionId && o.id !== s.checkoutSessionId) || (meta?.offerId && meta.offerId !== currentOfferId(s.id, await store.events(s.id))))
          break;
        if (s.stripeSubscriptionId !== subscriptionId) {
          const bound = await store.linkStripeIf(
            s.id,
            { status: s.status, subscriptionId: s.stripeSubscriptionId, checkoutSessionId: s.checkoutSessionId },
            { subscriptionId, checkoutSessionId: null },
            actor,
          );
          if (!bound) break;
          s = bound;
        }
        if (s.paymentMode === 'manual') s = await store.update(s.id, { paymentMode: 'card' }, actor);
        if (meta?.source === SPONSOR_SOURCE && meta?.quoteId && meta.acceptedBy) {
          const fees = deps.fees ?? feeStore(env);
          const offer = await fees.quote(meta.quoteId);
          const item =
            offer?.sponsorId === s.id && offer.subject === 'sponsorship' && offer.interval && !offer.planChange ? await checkoutFeeItem(subscriptionId, offer, stripeDeps) : null;
          const q = offer && item ? await fees.acceptQuote(offer.id, meta.acceptedBy, item.id) : null;
          if (!q) await anomaly(s, 'Recurring fee offer requires review.', String(o.id), notify);
        }
        break;
      }

      case 'invoice.paid': {
        const inv = o as unknown as Invoice;
        const src = sourceOf(inv);
        if (!src || src.metadata.source !== SPONSOR_SOURCE || !inv.amount_paid) break;
        const s = await sponsorOf(store, { sponsorId: src.metadata.sponsorId, subscriptionId: src.subscription });
        if (!s) {
          log(`[sponsorship] invoice ${inv.id}: no sponsor; skipped`);
          break;
        }
        touched = s.id;
        if (!src.subscription) break;
        if (s.status === 'ended') {
          await anomaly(s, `A payment arrived for ${who(s)}, which has ended. Check the subscription in Stripe and refund if needed.`, inv.id, notify);
          break;
        }
        if (isStale(s, src.subscription)) break;
        // Only a new term moves paid through on: a proration for an upgrade is not one. Paying it
        // still clears "payment overdue" once Stripe has the subscription paid up.
        const newTerm = !inv.billing_reason || inv.billing_reason === 'subscription_create' || inv.billing_reason === 'subscription_cycle';
        const period = termOf(inv);
        const offerId = src.metadata.offerId ?? currentOfferId(s.id, await store.events(s.id));
        const charged = fromLookupKey(inv.lines?.data?.find((l) => fromLookupKey(l.price?.lookup_key))?.price?.lookup_key);
        const plan = { ...s, ...charged };
        const end = period ? zurichDayOf(period.end) : null;
        const start = period ? zurichDayOf(period.start) : null;
        const label = start && end ? termLabel(start, end) : null;
        await store.paidInvoice(
          s.id,
          {
            invoice: inv.id,
            subscriptionId: src.subscription,
            offerId,
            created: event.created,
            ...(newTerm && start && end && label
              ? {
                  term: {
                    start,
                    end,
                    plan: charged,
                    welcome: s.status === 'pending' ? await welcomeNotices(plan, inv.id, label, longDate(end), notify) : [],
                    renewal: slackNotice(`sponsor-paid:${inv.id}`, `:repeat: Paid: ${who(plan)}, ${label}.`),
                  },
                }
              : {}),
          },
          actor,
          { clearOverdue: !!(newTerm && period) || (s.status === 'past_due' && (await subscriptionPaidUp(src.subscription, stripeDeps))) },
        );
        break;
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        const inv = o as unknown as Invoice;
        const src = sourceOf(inv);
        if (!src || src.metadata.source !== SPONSOR_SOURCE) break;
        const s = await sponsorOf(store, { sponsorId: src.metadata.sponsorId, subscriptionId: src.subscription });
        // Someone still in Checkout fixes the card there; only running sponsorships concern us.
        if (!s || !(s.status === 'active' || s.status === 'past_due' || s.status === 'ending')) break;
        // A failure for a subscription this sponsorship no longer holds (it was started again since).
        if (src.subscription && isStale(s, src.subscription)) break;
        touched = s.id;
        // Stripe does not promise the order of events: a failed attempt reported after the payment.
        if (await invoicePaid(store, s.id, inv.id)) break;
        const problem = event.type === 'invoice.payment_action_required' ? 'confirm' : 'declined';
        const nextAttempt = inv.next_payment_attempt ? longDate(zurichDayOf(inv.next_payment_attempt)) : null;
        const key = `sponsor-payment:${inv.id}:${inv.attempt_count ?? 0}:${problem}`;
        // Decided again in one step with the change (a payment for this invoice handled at the same
        // moment wins), and the email and note are written with "payment overdue".
        await store.overdueInvoice(s.id, { invoice: inv.id, subscriptionId: src.subscription, payload: { event: event.type } }, actor, [
          emailNotice(key, 'sponsor-payment-problem', { problem, payUrl: safeStripeUrl(inv.hosted_invoice_url), nextAttempt }, 'billing'),
          slackNotice(
            `${key}:slack`,
            `:warning: Payment ${problem === 'confirm' ? 'needs a bank confirmation' : 'failed'} for ${who(s)}${nextAttempt ? `; Stripe tries again on ${nextAttempt}` : ''}. Their billing contact was emailed.`,
          ),
        ]);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        if (!s || s.status === 'ended' || isStale(s, sub.id)) break;
        touched = s.id;
        if ((sub.status === 'past_due' || sub.status === 'unpaid') && s.status === 'active' && !(await paidSince(store, s.id, event.created)))
          s = (await moveTo(store, s, 'past_due', event.id, { payload: { subscriptionStatus: sub.status } })).sponsor;
        const plan = planOfSubscription(sub);
        const planRef = sub.metadata?.feePlanQuote;
        if (planRef && plan) {
          const fees = deps.fees ?? feeStore(env);
          const q = await fees.quote(planRef);
          if (q?.sponsorId === s.id && q.planChange?.subscription === sub.id && q.planChange.tier === plan.tier && q.planChange.cycle === plan.cycle) {
            if (q.status === 'void' || q.status === 'superseded') break;
            const item = await confirmedFeeItem(sub.id, q, stripeDeps);
            if (!item || (q.status === 'open' && (!q.applyingBy || !(await fees.acceptQuote(q.id, q.applyingBy, item)))))
              throw new Error('The confirmed plan and fee could not be verified.');
          }
        }
        if (!plan || (plan.tier === s.tier && plan.cycle === s.cycle) || s.status === 'pending') break;
        const previous = planLabel(s);
        const before = who(s);
        s = await store.update(s.id, plan, actor);
        const key = `sponsor-change-applied:${event.id}`;
        await store.queueNotices(s.id, [
          emailNotice(key, 'sponsor-change', { timing: 'applied', from: null, previous, manual: false }),
          slackNotice(`${key}:slack`, `:arrows_counterclockwise: ${before} is now ${planLabel(s)}, as scheduled at the renewal. The site shows the new tier from the next build.`),
        ]);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        const s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        // Only the subscription this sponsorship holds: an old one (a sponsorship started again) changes nothing.
        if (!s || s.stripeSubscriptionId !== sub.id) break;
        touched = s.id;
        if (s.status === 'ended') {
          await store.linkStripeIf(s.id, { subscriptionId: sub.id }, { subscriptionId: null }, actor);
          break;
        }
        const reason = s.status === 'ending' ? 'cancelled' : 'lapsed';
        const key = `sponsor-ended:${s.id}:${event.id}`;
        await moveTo(store, s, 'ended', event.id, {
          reason,
          notices: [
            ...(s.status !== 'pending' ? [emailNotice(key, 'sponsor-ended', { reason })] : []),
            slackNotice(
              `${key}:slack`,
              s.status === 'pending'
                ? `:hourglass: ${who(s)} never paid; the sponsorship was closed.`
                : `:wave: Sponsorship ended (${reason === 'cancelled' ? 'as agreed' : 'unpaid'}): ${who(s)}. The site lists them as a past sponsor from the next build.`,
            ),
          ],
        });
        await store.linkStripeIf(s.id, { subscriptionId: sub.id, checkoutSessionId: s.checkoutSessionId }, { subscriptionId: null, checkoutSessionId: null }, actor);
        break;
      }

      case 'charge.refunded':
      case 'charge.dispute.created': {
        // A refund or a dispute is recorded and flagged; whether it ends or changes the sponsorship is the board's call.
        const refund = event.type === 'charge.refunded';
        const charge = refund
          ? (o as unknown as Charge)
          : (o as unknown as Dispute).charge
            ? await stripeApi<Charge>(env, deps.fetch ?? fetch, 'GET', `charges/${encodeURIComponent(String((o as unknown as Dispute).charge))}`)
            : null;
        const s = charge?.customer ? await store.byStripeCustomer(charge.customer) : null;
        if (!s || !charge) break;
        touched = s.id;
        const dispute = refund ? null : (o as unknown as Dispute);
        // `amount` is the card payment (charge); a dispute's own amount, which can be less, is `disputed`.
        await store.log(s.id, refund ? 'charge_refunded' : 'charge_disputed', actor, {
          charge: charge.id,
          amount: charge.amount ?? null,
          ...(refund ? { refunded: charge.amount_refunded ?? null } : { dispute: dispute!.id, disputed: dispute!.amount ?? null, reason: dispute!.reason ?? null }),
        });
        const still = `Nothing changed on the site: the sponsorship is ${label(s.status)}. End or change it by hand if it should not continue.`;
        await store.queueNotices(s.id, [
          slackNotice(
            `sponsor-${refund ? 'refund' : 'dispute'}:${event.id}`,
            refund
              ? `:money_with_wings: ${chfOf(charge.amount_refunded)} of a ${chfOf(charge.amount)} card payment by ${who(s)} was refunded in Stripe. ${still} ${adminUrl(notify.origin, s.id)}`
              : `:warning: A ${chfOf(dispute!.amount ?? charge.amount)} card payment by ${who(s)} is disputed${dispute!.reason ? ` (${slackText(dispute!.reason)})` : ''}. Answer it in Stripe before its deadline. ${still} ${adminUrl(notify.origin, s.id)}`,
          ),
        ]);
        break;
      }
    }

    await store.markStripeEvent(event.id, event.type);
    if (touched) await sendNotices(notify, { sponsorId: touched });
    return json(200, { ok: true });
  } catch (cause) {
    console.error(`[sponsorship] webhook ${event.type} ${event.id} failed`, cause);
    return fail(500, 'Webhook handling failed; Stripe will retry.');
  }
}
