/**
 * Sponsorship payments through Stripe (docs/domains/sponsorship/api.md), over plain fetch like
 * membership-stripe.ts, so the same local mock works. Card only (owner, 18th November 2026):
 * Stripe invoices are off; sponsors who pay by bank transfer are `manual` and the board records
 * their payments.
 *
 *   - List prices by lookup key: sponsor_<tier>_<monthly|quarterly|yearly|once>
 *     (pnpm sponsorship:stripe-setup creates them from packages/sponsorship/src/tiers.ts).
 *   - A one-time sponsorship covers one or more meetups; the board can set a custom price per
 *     meetup. It is one card payment (Checkout, or a payment link the board sends when a
 *     contract was signed outside the site).
 *   - Only one payment page is open per sponsor: opening a new Checkout closes the last one.
 *   - The billing portal (STRIPE_SPONSOR_PORTAL_CONFIG, else the members' one) only changes the
 *     card and shows receipts: plan changes and endings go through the site.
 *   - A higher tier on the same cycle applies now and charges the prorated difference; everything
 *     else is a subscription schedule that switches at the renewal.
 *
 * Environment: STRIPE_SECRET_KEY, STRIPE_SPONSOR_PORTAL_CONFIG (optional). Events arrive on the
 * site's one webhook (STRIPE_WEBHOOK_SECRET, server/stripe-webhook.ts).
 */
import {
  fromLookupKey,
  isRecurring,
  meetupPrice,
  priceLookupKey,
  type Contact,
  type Cycle,
  type Sponsor,
  type SponsorMeetup,
  type SponsorStore,
  type Tier,
} from '@zurichjs/sponsorship';
import { longDate } from './dates.ts';
import type { Env } from './http.ts';
import { StripeUnavailable, stripeApi, stripeForm } from './stripe.ts';

type Fetch = typeof fetch;

export const SPONSOR_SOURCE = 'zurichjs.com/partners';

export interface StripeDeps {
  env: Env;
  fetch?: Fetch;
  now?: () => Date;
}

const api = <T>(deps: StripeDeps, method: 'GET' | 'POST' | 'DELETE', path: string, params?: URLSearchParams, key?: string) =>
  stripeApi<T>(deps.env, deps.fetch ?? fetch, method, path, params, key);

const prices = new Map<string, { id: string; product: string }>();

/** The active list price for a tier and cycle, with its product (cached per function instance). */
export async function priceFor(tier: Tier, cycle: Cycle, deps: StripeDeps): Promise<{ id: string; product: string }> {
  const key = priceLookupKey(tier, cycle);
  const cached = prices.get(key);
  if (cached) return cached;
  const res = await api<{ data: { id: string; product: string | { id: string } }[] }>(deps, 'GET', 'prices', stripeForm({ lookup_keys: [key], active: true, limit: 1 }));
  const p = res.data[0];
  if (!p) throw new StripeUnavailable(`No active Stripe price with lookup key ${key}. Run pnpm sponsorship:stripe-setup.`);
  const found = { id: p.id, product: typeof p.product === 'string' ? p.product : p.product.id };
  prices.set(key, found);
  return found;
}

/** "Hardstrasse 1\n8005 Zürich" → Stripe's address fields (Switzerland unless the last line names another country). */
export function stripeAddress(text: string | null): Record<string, string> | undefined {
  const lines = (text ?? '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  let country = 'CH';
  if (lines.length > 1 && /^(switzerland|schweiz|suisse|svizzera|ch)$/i.test(lines.at(-1)!)) lines.pop();
  const city = /^(?:CH-)?(\d{4,5})\s+(.+)$/.exec(lines.at(-1) ?? '');
  if (city) lines.pop();
  else country = '';
  return {
    line1: lines[0] ?? '',
    ...(lines.length > 1 ? { line2: lines.slice(1).join(', ') } : {}),
    ...(city ? { postal_code: city[1]!, city: city[2]! } : {}),
    ...(country ? { country } : {}),
  };
}

/** A contact who may receive email: added by the board or themselves, or a colleague who accepted (signed in). */
export const confirmed = (c: Contact) => c.addedBy !== 'sponsor' || !!c.userId;

/** Who gets Stripe's receipts: a confirmed billing contact, else the primary contact. */
export const billingContact = (contacts: Contact[]) => {
  const ok = contacts.filter(confirmed);
  return ok.find((c) => c.role === 'billing') ?? ok.find((c) => c.role === 'primary') ?? ok[0];
};

/** The sponsor's Stripe customer, created once and kept in step with the billing details. */
export async function ensureCustomer(s: Sponsor, contacts: Contact[], store: SponsorStore, deps: StripeDeps): Promise<string> {
  const to = billingContact(contacts);
  const params = stripeForm({
    name: s.legalName ?? s.companyName,
    email: to?.email,
    address: stripeAddress(s.billingAddress),
    metadata: { sponsorId: s.id, source: SPONSOR_SOURCE },
    preferred_locales: ['en'],
    invoice_settings: s.vatId ? { custom_fields: [{ name: 'VAT', value: s.vatId.slice(0, 30) }] } : undefined,
  });
  if (s.stripeCustomerId) {
    await api(deps, 'POST', `customers/${encodeURIComponent(s.stripeCustomerId)}`, params);
    return s.stripeCustomerId;
  }
  const c = await api<{ id: string }>(deps, 'POST', 'customers', params, `sponsor-customer:${s.id}`);
  await store.linkStripe(s.id, { customerId: c.id }, { kind: 'stripe', id: c.id });
  return c.id;
}

export class AlreadySubscribed extends Error {}

const LIVE_SUB = ['trialing', 'active', 'past_due', 'incomplete', 'unpaid'];

/** The sponsor's live sponsorship subscriptions in Stripe (never start a second one). */
export async function liveSubscriptions(customer: string, deps: StripeDeps): Promise<string[]> {
  const subs = await api<{ data: { id: string; status: string; metadata?: Record<string, string> }[] }>(
    deps,
    'GET',
    'subscriptions',
    stripeForm({ customer, status: 'all', limit: 20 }),
  );
  return subs.data.filter((x) => x.metadata?.source === SPONSOR_SOURCE && LIVE_SUB.includes(x.status)).map((x) => x.id);
}

/** A sponsorship paid manually so far starts charging when its paid period ends (Stripe needs 48 hours ahead). */
function trialEnd(s: Sponsor, deps: StripeDeps): number | undefined {
  if (s.paymentMode !== 'manual' || !s.paidUntil) return undefined;
  const until = Date.parse(`${s.paidUntil}T00:00:00Z`);
  return until > (deps.now ?? (() => new Date()))().getTime() + 49 * 3_600_000 ? Math.floor(until / 1000) : undefined;
}

const meta = (s: Sponsor) => ({ source: SPONSOR_SOURCE, sponsorId: s.id, tier: s.tier, cycle: s.cycle });

/** "ZurichJS Meetup December (9th December 2026); ZurichJS Meetup January (13th January 2027)" */
export const meetupList = (meetups: SponsorMeetup[]) => meetups.map((m) => `${m.title} (${longDate(m.date)})`).join('; ');

/** The line item of a one-time sponsorship: the list price for one meetup, else a custom amount × meetups. */
async function onceLineItem(s: Sponsor, meetups: SponsorMeetup[], deps: StripeDeps) {
  const list = await priceFor(s.tier, 'once', deps);
  const quantity = Math.max(meetups.length, 1);
  if (s.pricePerMeetup === null) return { price: list.id, quantity };
  return {
    price_data: { currency: 'chf', product: list.product, unit_amount: meetupPrice(s.tier, s.pricePerMeetup) * 100 },
    quantity,
  };
}

/**
 * Stripe's answer when the page is already gone: no such object, or a session that is no longer
 * open (expired or paid). Anything else (an outage, a timeout) leaves the page payable.
 */
const alreadyClosed = (e: unknown) => /HTTP 404|No such|status (of|in) \W*open\W* can be expired|is not open|already (been )?expired/i.test((e as Error).message ?? '');

/**
 * Closes the sponsor's last Checkout session, so an old tab can never be paid as well. The id is
 * forgotten only once Stripe confirms; a failure throws and keeps it, so a retry closes it.
 */
export async function closeCheckout(s: Sponsor, store: SponsorStore, deps: StripeDeps): Promise<void> {
  if (!s.checkoutSessionId) return;
  await api(deps, 'POST', `checkout/sessions/${encodeURIComponent(s.checkoutSessionId)}/expire`).catch((e: unknown) => {
    if (!alreadyClosed(e)) throw e;
  });
  await store.linkStripeIf(s.id, { checkoutSessionId: s.checkoutSessionId }, { checkoutSessionId: null }, { kind: 'stripe', id: s.checkoutSessionId });
}

/** Checks the prices exist before anything is signed or created (a fresh account would fail half-way otherwise). */
export async function checkPrices(s: Pick<Sponsor, 'tier' | 'cycle'>, deps: StripeDeps): Promise<void> {
  await priceFor(s.tier, s.cycle, deps);
}

/** Stripe Checkout by card: a subscription, or one payment for the meetups. Returns its URL. */
export async function startCardCheckout(s: Sponsor, contacts: Contact[], meetups: SponsorMeetup[], store: SponsorStore, origin: string, deps: StripeDeps): Promise<string> {
  const customer = await ensureCustomer(s, contacts, store, deps);
  await closeCheckout(s, store, deps);
  const account = new URL('/partners/account', origin).toString();
  const common = {
    customer,
    success_url: `${account}?checkout=done`,
    cancel_url: `${account}?checkout=cancelled`,
    client_reference_id: s.id,
    metadata: meta(s),
    payment_method_types: ['card'],
    locale: 'en',
  };
  let session: { id: string; url: string };
  if (!isRecurring(s.cycle)) {
    const what = `Sponsorship of ${meetupList(meetups) || 'one meetup'}`.slice(0, 500);
    session = await api(
      deps,
      'POST',
      'checkout/sessions',
      stripeForm({
        ...common,
        mode: 'payment',
        line_items: [await onceLineItem(s, meetups, deps)],
        payment_intent_data: { metadata: meta(s), description: what },
        invoice_creation: { enabled: true, invoice_data: { metadata: meta(s), description: what } },
      }),
    );
  } else {
    if ((await liveSubscriptions(customer, deps)).length) throw new AlreadySubscribed('Payment is already set up for this sponsorship.');
    const trial = trialEnd(s, deps);
    session = await api(
      deps,
      'POST',
      'checkout/sessions',
      stripeForm({
        ...common,
        mode: 'subscription',
        line_items: [{ price: (await priceFor(s.tier, s.cycle, deps)).id, quantity: 1 }],
        subscription_data: { metadata: meta(s), ...(trial ? { trial_end: trial } : {}) },
      }),
    );
  }
  await store.linkStripe(s.id, { checkoutSessionId: session.id }, { kind: 'stripe', id: session.id });
  return session.url;
}

/**
 * A payment link for a one-time sponsorship the board agreed with a signed contract: one card
 * payment for the meetups, usable once, then switched off by the webhook. Replaces any earlier link.
 */
export async function createPaymentLink(s: Sponsor, meetups: SponsorMeetup[], store: SponsorStore, origin: string, deps: StripeDeps): Promise<string> {
  if (isRecurring(s.cycle)) throw new Error('Payment links are for one-time sponsorships.');
  await closePaymentLink(s, store, deps);
  const item = await onceLineItem(s, meetups, deps);
  const price =
    'price' in item
      ? item.price
      : (
          await api<{ id: string }>(
            deps,
            'POST',
            'prices',
            stripeForm({ currency: 'chf', product: item.price_data.product, unit_amount: item.price_data.unit_amount, metadata: meta(s), nickname: `${s.companyName} bundle` }),
          )
        ).id;
  const what = `Sponsorship of ${meetupList(meetups) || 'one meetup'}`.slice(0, 500);
  const link = await api<{ id: string; url: string }>(
    deps,
    'POST',
    'payment_links',
    stripeForm({
      line_items: [{ price, quantity: item.quantity }],
      metadata: meta(s),
      payment_method_types: ['card'],
      payment_intent_data: { metadata: meta(s), description: what },
      invoice_creation: { enabled: true, invoice_data: { metadata: meta(s), description: what } },
      restrictions: { completed_sessions: { limit: 1 } },
      after_completion: { type: 'redirect', redirect: { url: `${new URL('/partners/account', origin).toString()}?checkout=done` } },
    }),
  );
  // Two requests at once (two tabs, two organisers): only the first link is kept; ours is switched off.
  const saved = await store.linkStripeIf(s.id, { paymentLinkId: null }, { paymentLinkId: link.id, paymentLinkUrl: link.url }, { kind: 'stripe', id: link.id });
  if (!saved) {
    await deactivateLink(link.id, deps);
    throw new PaymentLinkRace();
  }
  return link.url;
}

export class PaymentLinkRace extends Error {}

const deactivateLink = (id: string, deps: StripeDeps) =>
  api(deps, 'POST', `payment_links/${encodeURIComponent(id)}`, stripeForm({ active: false })).catch((e: unknown) => {
    if (!alreadyClosed(e)) throw e;
  });

/**
 * Switches off the sponsor's payment link (paid, replaced or withdrawn). The id is forgotten only
 * once Stripe confirms; a failure throws and keeps it, so a retry switches it off.
 */
export async function closePaymentLink(s: Sponsor, store: SponsorStore, deps: StripeDeps): Promise<void> {
  if (!s.paymentLinkId) return;
  await deactivateLink(s.paymentLinkId, deps);
  await store.linkStripeIf(s.id, { paymentLinkId: s.paymentLinkId }, { paymentLinkId: null, paymentLinkUrl: null }, { kind: 'stripe', id: s.paymentLinkId });
}

/** The billing portal: STRIPE_SPONSOR_PORTAL_CONFIG, else the members' configuration (same rules). */
export async function createPortalSession(s: Sponsor, origin: string, deps: StripeDeps): Promise<string> {
  if (!s.stripeCustomerId) throw new StripeUnavailable('This sponsor has no Stripe customer yet.');
  const configuration = deps.env.STRIPE_SPONSOR_PORTAL_CONFIG || deps.env.STRIPE_MEMBER_PORTAL_CONFIG;
  if (!configuration) throw new StripeUnavailable('STRIPE_SPONSOR_PORTAL_CONFIG (or STRIPE_MEMBER_PORTAL_CONFIG) is not set');
  const r = await api<{ url: string }>(
    deps,
    'POST',
    'billing_portal/sessions',
    stripeForm({ customer: s.stripeCustomerId, configuration, return_url: new URL('/partners/account', origin).toString() }),
  );
  return r.url;
}

/* ------------------------------------------------------------------ subscriptions */

interface StripeSubscription {
  id: string;
  status?: string;
  schedule?: string | { id: string; metadata?: Record<string, string>; phases?: { end_date: number }[] } | null;
  cancel_at?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: { id: string; price?: { id: string; lookup_key?: string | null }; current_period_end?: number }[] };
}
interface StripeSchedule {
  id: string;
  phases: { start_date: number; end_date: number; trial_end?: number | null }[];
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
const getSub = (id: string, deps: StripeDeps, expand = false) =>
  api<StripeSubscription>(deps, 'GET', `subscriptions/${encodeURIComponent(id)}`, expand ? stripeForm({ expand: ['schedule'] }) : undefined);
const scheduleId = (s: StripeSubscription) => (typeof s.schedule === 'string' ? s.schedule : (s.schedule?.id ?? null));
const nowUnix = (deps: StripeDeps) => Math.floor((deps.now ?? (() => new Date()))().getTime() / 1000);

/** The first day after the current term. */
export async function periodEnd(subscriptionId: string, deps: StripeDeps): Promise<string | null> {
  const end = (await getSub(subscriptionId, deps)).items?.data?.[0]?.current_period_end;
  return end ? day(end) : null;
}

/** A plan change waiting for the renewal: { tier, cycle, from }. Null once it took effect. */
export async function pendingChange(subscriptionId: string, deps: StripeDeps): Promise<{ tier: Tier; cycle: Cycle; from: string } | null> {
  const s = await getSub(subscriptionId, deps, true);
  const sched = typeof s.schedule === 'object' ? s.schedule : null;
  const plan = fromLookupKey(sched?.metadata?.plan);
  const from = sched?.phases?.[0]?.end_date;
  if (!sched || !plan || !from) return null;
  // After the switch the schedule stays attached for one more term: not "waiting" any more.
  if (from <= nowUnix(deps) || sched.metadata?.plan === s.items?.data?.[0]?.price?.lookup_key) return null;
  return { ...plan, from: day(from) };
}

export async function cancelPendingChange(subscriptionId: string, deps: StripeDeps): Promise<boolean> {
  const id = scheduleId(await getSub(subscriptionId, deps));
  if (!id) return false;
  await api(deps, 'POST', `subscription_schedules/${encodeURIComponent(id)}/release`);
  return true;
}

/** A higher tier on the same cycle, now: Stripe charges the prorated difference at once. */
export async function upgradeNow(subscriptionId: string, plan: { tier: Tier; cycle: Cycle }, deps: StripeDeps): Promise<void> {
  let sub = await getSub(subscriptionId, deps);
  if (scheduleId(sub)) {
    await cancelPendingChange(subscriptionId, deps);
    sub = await getSub(subscriptionId, deps);
  }
  const item = sub.items?.data?.[0];
  if (!item) throw new Error(`Subscription ${subscriptionId} has no item.`);
  const price = (await priceFor(plan.tier, plan.cycle, deps)).id;
  if (item.price?.id === price) return;
  await api(
    deps,
    'POST',
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    stripeForm({ items: [{ id: item.id, price }], proration_behavior: 'always_invoice', payment_behavior: 'error_if_incomplete' }),
    `sponsor-upgrade:${subscriptionId}:${price}`,
  );
}

/** Switches to `plan` from the next renewal (a subscription schedule). Returns the renewal date. */
export async function scheduleChange(subscriptionId: string, plan: { tier: Tier; cycle: Cycle }, deps: StripeDeps): Promise<{ from: string }> {
  const sub = await getSub(subscriptionId, deps);
  const current = sub.items?.data?.[0]?.price?.id;
  if (!current) throw new Error(`Subscription ${subscriptionId} has no price.`);
  const next = (await priceFor(plan.tier, plan.cycle, deps)).id;
  const existing = scheduleId(sub);
  const sched = existing
    ? await api<StripeSchedule>(deps, 'GET', `subscription_schedules/${encodeURIComponent(existing)}`)
    : await api<StripeSchedule>(deps, 'POST', 'subscription_schedules', stripeForm({ from_subscription: subscriptionId }));
  const now = nowUnix(deps);
  const phase = sched.phases.find((p) => p.start_date <= now && now < p.end_date) ?? sched.phases[0]!;
  const metadata = sub.metadata ?? {};
  await api(
    deps,
    'POST',
    `subscription_schedules/${encodeURIComponent(sched.id)}`,
    stripeForm({
      end_behavior: 'release',
      metadata: { plan: priceLookupKey(plan.tier, plan.cycle) },
      phases: [
        {
          start_date: phase.start_date,
          end_date: phase.end_date,
          items: [{ price: current, quantity: 1 }],
          metadata,
          ...(phase.trial_end ? { trial_end: phase.trial_end } : {}),
          proration_behavior: 'none',
        },
        { items: [{ price: next, quantity: 1 }], metadata, proration_behavior: 'none' },
      ],
    }),
  );
  return { from: day(phase.end_date) };
}

/**
 * Ends the subscription with the paid period. A change waiting for the renewal blocks that in
 * Stripe, so it is released first (and reported, so the sponsor is told it no longer applies).
 */
export async function cancelAtPeriodEnd(subscriptionId: string, reference: string, deps: StripeDeps): Promise<{ endsAt: string | null; droppedChange: boolean }> {
  const droppedChange = await cancelPendingChange(subscriptionId, deps);
  const s = await api<StripeSubscription>(
    deps,
    'POST',
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    stripeForm({ cancel_at_period_end: true }),
    `sponsor-cancel:${subscriptionId}:${reference}`,
  );
  const end = s.cancel_at ?? s.items?.data?.[0]?.current_period_end;
  return { endsAt: end ? day(end) : null, droppedChange };
}

export async function resumeSubscription(subscriptionId: string, reference: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'POST', `subscriptions/${encodeURIComponent(subscriptionId)}`, stripeForm({ cancel_at_period_end: false }), `sponsor-resume:${subscriptionId}:${reference}`);
}

/** Ends a subscription now (the board ending a sponsorship outright, or a duplicate). Already ended is fine. */
export async function cancelNow(subscriptionId: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'DELETE', `subscriptions/${encodeURIComponent(subscriptionId)}`).catch((e: Error) => {
    if (!/No such subscription|canceled/i.test(e.message)) throw e;
  });
}

/** The plan a subscription bills now (its price's lookup key). */
export const planOfSubscription = (s: { items?: { data?: { price?: { lookup_key?: string | null } }[] } }) => fromLookupKey(s.items?.data?.[0]?.price?.lookup_key);
