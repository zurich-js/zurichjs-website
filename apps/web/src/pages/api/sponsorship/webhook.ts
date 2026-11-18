/**
 * Stripe webhook for sponsorships (its own endpoint and secret, apart from memberships and
 * donations). Stripe › Developers › Webhooks: https://zurichjs.com/api/sponsorship/webhook,
 * the events in SPONSOR_WEBHOOK_EVENTS; secret in STRIPE_SPONSORSHIP_WEBHOOK_SECRET.
 * `pnpm sponsorship:stripe-setup --webhook-url …` creates it.
 *
 *   checkout.session.completed      links the subscription; a one-meetup card payment starts the
 *                                   sponsorship; a sponsorship paid directly that moved to card
 *                                   switches its payment mode (charged when its paid period ends)
 *   invoice.paid                    first payment and every renewal (subscriptions), or a one-meetup
 *                                   invoice: active, paid until the term end; welcome email the first time
 *   invoice.payment_failed          a declined card: past due, email with Stripe's page, Slack
 *   invoice.payment_action_required the bank wants a confirmation (3D Secure): the same
 *   invoice.overdue                 an invoice past its due date: past due, reminder email, Slack
 *   customer.subscription.updated   a change scheduled for the renewal took effect; Stripe reporting
 *                                   past_due or unpaid marks the sponsorship past due
 *   customer.subscription.deleted   ended: as agreed (ending) or lapsed (Stripe gave up on payment)
 *
 * Safe to receive twice: handled events are skipped (sponsor_stripe_events), status changes are
 * compare-and-set, emails carry idempotency keys. An event is marked handled only after it worked.
 */
import { TransitionError, feeLabel, fromLookupKey, isRecurring, tierInfo, type Sponsor, type SponsorStore, type Status } from '@zurichjs/sponsorship';
import type { APIRoute } from 'astro';
import { siteOrigin } from '../../../server/auth.ts';
import { longDate } from '../../../server/dates.ts';
import { fail, json, methodNotAllowed, type Env } from '../../../server/http.ts';
import { MembershipUnavailable } from '../../../server/membership-db.ts';
import type { MembershipSlack } from '../../../server/membership-slack.ts';
import { adminUrl, emailBoard, emailSponsor, note, planLabel, sponsorStore, termLabel, tierBenefits, who, type NotifyDeps } from '../../../server/sponsor.ts';
import { SPONSOR_SOURCE } from '../../../server/sponsor-stripe.ts';
import { verifyStripeSignature } from '../../../server/stripe.ts';

export const prerender = false;

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface Invoice {
  id: string;
  amount_paid?: number;
  attempt_count?: number;
  next_payment_attempt?: number | null;
  hosted_invoice_url?: string | null;
  metadata?: Record<string, string> | null;
  lines?: { data?: { period?: { start: number; end: number } }[] };
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
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
const safeStripeUrl = (url: string | null | undefined) => (url?.startsWith('https://invoice.stripe.com/') ? url : null);
const nextDay = (iso: string) => new Date(Date.parse(`${iso}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** The invoice's subscription and its metadata (both API shapes), or the invoice's own metadata (one meetup). */
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

async function sponsorOf(store: SponsorStore, ids: { sponsorId?: string; subscriptionId?: string | null }): Promise<Sponsor | null> {
  if (ids.sponsorId) {
    const s = await store.get(ids.sponsorId);
    if (s) return s;
  }
  return ids.subscriptionId ? store.byStripeSubscription(ids.subscriptionId) : null;
}

async function moveTo(store: SponsorStore, s: Sponsor, to: Status, eventId: string, extra: { reason?: 'cancelled' | 'lapsed'; payload?: Record<string, unknown> } = {}) {
  if (s.status === to) return s;
  try {
    return await store.transition(s.id, { from: s.status, to, actor: { kind: 'stripe', id: eventId }, reason: extra.reason, payload: extra.payload });
  } catch (cause) {
    if (cause instanceof TransitionError) return (await store.get(s.id)) ?? s;
    throw cause;
  }
}

const isStale = (s: Sponsor, subscriptionId: string) => !!s.stripeSubscriptionId && s.stripeSubscriptionId !== subscriptionId;

/** The first payment (or the board's start) of a sponsorship: welcome every contact, tell the board. */
async function welcome(s: Sponsor, term: string, nextPayment: string | null, eventId: string, deps: NotifyDeps) {
  const needsLogo = !(await deps.store.logos(s.id)).length;
  await emailSponsor(s, 'sponsor-welcome', (base) => ({ ...base, term, nextPayment, needsLogo }), { ...deps, key: `sponsor-welcome:${s.id}:${eventId}` });
  const deliver = tierBenefits(s.tier)
    .map((b) => `• ${b}`)
    .join('\n');
  await note(`:tada: New sponsor: ${who(s)}, ${feeLabel(s.tier, s.cycle)}.${needsLogo ? ' No logo yet.' : ''}${deliver ? `\n*To deliver:*\n${deliver}` : ''}`, deps);
  await emailBoard(
    `New sponsor: ${s.companyName}`,
    [`${s.companyName} paid for its ${tierInfo(s.tier).name} sponsorship.`, ...(tierBenefits(s.tier).length ? [`To deliver: ${tierBenefits(s.tier).join('; ')}.`] : [])],
    [
      ['Plan', planLabel(s)],
      ['Term', term],
    ],
    {
      ...deps,
      key: `sponsor-board-new:${s.id}`,
      url: adminUrl(deps.origin, s.id),
    },
  );
}

/** A one-meetup sponsorship is paid: it runs until the day after the meetup. */
async function startOnce(s: Sponsor, eventId: string, store: SponsorStore, deps: NotifyDeps) {
  if (s.status !== 'pending') return;
  const today = new Date().toISOString().slice(0, 10);
  let m = await store.update(s.id, { startedAt: today, paidUntil: s.eventDate ? nextDay(s.eventDate) : null }, { kind: 'stripe', id: eventId });
  m = await moveTo(store, m, 'active', eventId);
  if (m.status === 'active') await welcome(m, s.eventTitle ? `${s.eventTitle}${s.eventDate ? `, ${longDate(s.eventDate)}` : ''}` : 'one meetup', null, eventId, deps);
}

export async function handleSponsorWebhook(request: Request, deps: SponsorWebhookDeps = {}): Promise<Response> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? console.log;
  const secret = env.STRIPE_SPONSORSHIP_WEBHOOK_SECRET;
  const payload = await request.text();
  if (!secret) {
    log('[sponsorship] STRIPE_SPONSORSHIP_WEBHOOK_SECRET missing; webhook refused');
    return fail(503, 'Webhook not configured.');
  }
  if (!verifyStripeSignature(payload, request.headers.get('stripe-signature'), secret, deps.now)) return fail(400, 'Bad signature.');
  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return fail(400, 'Invalid JSON.');
  }
  let store: SponsorStore;
  try {
    store = deps.store ?? sponsorStore(env);
  } catch (cause) {
    if (cause instanceof MembershipUnavailable) return fail(503, 'Sponsorship database not configured.');
    throw cause;
  }
  const notify: NotifyDeps = { env, store, origin: siteOrigin(env), fetch: deps.fetch, slack: deps.slack, log };
  const actor = { kind: 'stripe', id: event.id } as const;

  try {
    if (await store.stripeEventSeen(event.id)) return json(200, { ok: true, duplicate: true });
    const o = event.data.object;

    switch (event.type) {
      case 'checkout.session.completed': {
        const meta = o.metadata as Record<string, string> | undefined;
        if (meta?.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: meta.sponsorId });
        if (!s) break;
        if (o.mode === 'payment') {
          if (o.payment_status === 'paid' && s.cycle === 'once') await startOnce(s, event.id, store, notify);
          break;
        }
        const subscriptionId = typeof o.subscription === 'string' ? o.subscription : null;
        if (!subscriptionId) break;
        if (s.stripeSubscriptionId !== subscriptionId) s = await store.linkStripe(s.id, { subscriptionId }, actor);
        if (s.paymentMode === 'manual') {
          s = await store.update(s.id, { paymentMode: 'card' }, actor);
          await note(`:credit_card: ${who(s)} moved to card payment (first charge when the paid period ends).`, notify);
        }
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
        if (!src.subscription) {
          // A one-meetup invoice (or its Checkout receipt, already handled above).
          if (s.cycle === 'once') await startOnce(s, event.id, store, notify);
          break;
        }
        const period = termOf(inv);
        if (!period) break;
        const first = s.status === 'pending';
        if (s.stripeSubscriptionId !== src.subscription) s = await store.linkStripe(s.id, { subscriptionId: src.subscription }, actor);
        const paidUntil = day(period.end);
        s = await store.update(s.id, { ...(s.paidUntil && s.paidUntil > paidUntil ? {} : { paidUntil }), ...(s.startedAt ? {} : { startedAt: day(period.start) }) }, actor);
        if (s.status === 'pending' || s.status === 'past_due') s = await moveTo(store, s, 'active', event.id, { payload: { invoice: inv.id } });
        if (first) await welcome(s, termLabel(day(period.start), paidUntil), isRecurring(s.cycle) ? longDate(paidUntil) : null, event.id, notify);
        else await note(`:repeat: Paid: ${who(s)}, ${termLabel(day(period.start), paidUntil)}.`, notify);
        break;
      }

      case 'invoice.payment_failed':
      case 'invoice.payment_action_required':
      case 'invoice.overdue': {
        const inv = o as unknown as Invoice;
        const src = sourceOf(inv);
        if (!src || src.metadata.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: src.metadata.sponsorId, subscriptionId: src.subscription });
        // Someone still in Checkout fixes the card there; only running sponsorships concern us.
        if (!s || !(s.status === 'active' || s.status === 'past_due' || s.status === 'ending' || (s.status === 'pending' && event.type === 'invoice.overdue'))) break;
        if (s.status === 'active') s = await moveTo(store, s, 'past_due', event.id, { payload: { invoice: inv.id, event: event.type } });
        const problem = event.type === 'invoice.overdue' ? 'overdue' : event.type === 'invoice.payment_action_required' ? 'confirm' : 'declined';
        const nextAttempt = inv.next_payment_attempt ? longDate(day(inv.next_payment_attempt)) : null;
        await emailSponsor(s, 'sponsor-payment-problem', (base) => ({ ...base, problem, payUrl: safeStripeUrl(inv.hosted_invoice_url), nextAttempt }), {
          ...notify,
          to: 'billing',
          key: `sponsor-payment:${inv.id}:${inv.attempt_count ?? 0}:${problem}`,
        });
        await note(
          problem === 'overdue'
            ? `:warning: Invoice overdue for ${who(s)}. Their billing contact was emailed.`
            : `:warning: Payment ${problem === 'confirm' ? 'needs a bank confirmation' : 'failed'} for ${who(s)}${nextAttempt ? `; Stripe tries again on ${nextAttempt}` : ''}. They were emailed.`,
          notify,
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        let s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        if (!s || isStale(s, sub.id)) break;
        if ((sub.status === 'past_due' || sub.status === 'unpaid') && s.status === 'active')
          s = await moveTo(store, s, 'past_due', event.id, { payload: { subscriptionStatus: sub.status } });
        const plan = fromLookupKey(sub.items?.data?.[0]?.price?.lookup_key);
        if (!plan || (plan.tier === s.tier && plan.cycle === s.cycle)) break;
        const previous = planLabel(s);
        const before = who(s);
        s = await store.update(s.id, plan, actor);
        await emailSponsor(s, 'sponsor-change', (base) => ({ ...base, timing: 'applied', from: null, previous }), { ...notify, key: `sponsor-change-applied:${event.id}` });
        await note(`:arrows_counterclockwise: ${before} is now ${planLabel(s)}, as scheduled at the renewal.`, notify);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = o as unknown as Subscription;
        if (sub.metadata?.source !== SPONSOR_SOURCE) break;
        const s = await sponsorOf(store, { sponsorId: sub.metadata.sponsorId, subscriptionId: sub.id });
        if (!s || s.status === 'ended' || isStale(s, sub.id)) break;
        const reason = s.status === 'ending' ? 'cancelled' : 'lapsed';
        const ended = await moveTo(store, s, 'ended', event.id, { reason });
        if (ended.status !== 'ended') break;
        await emailSponsor(ended, 'sponsor-ended', (base) => ({ ...base, reason }), { ...notify, key: `sponsor-ended:${s.id}:${event.id}` });
        await note(`:wave: Sponsorship ended (${reason === 'cancelled' ? 'as agreed' : 'unpaid'}): ${who(ended)}. Mark them as a past sponsor in Sanity.`, notify);
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

export const POST: APIRoute = ({ request }) => handleSponsorWebhook(request);
export const ALL: APIRoute = () => methodNotAllowed('POST');
