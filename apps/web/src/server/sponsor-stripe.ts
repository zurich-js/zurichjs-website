/**
 * Sponsorship payments through Stripe (docs/v2/SPONSORSHIP.md), over plain fetch like
 * membership-stripe.ts, so the same local mock works.
 *
 *   - Prices by lookup key: sponsor_<tier>_<monthly|quarterly|yearly|once>
 *     (pnpm sponsorship:stripe-setup creates them from packages/sponsorship/src/tiers.ts).
 *   - Card: Stripe Checkout (a subscription, or one payment for one meetup).
 *   - Invoice: Stripe sends an invoice due in 30 days (collection_method=send_invoice);
 *     bank transfer or card on Stripe's invoice page.
 *   - The billing portal (STRIPE_SPONSOR_PORTAL_CONFIG) only changes payment methods and
 *     shows invoices: plan changes and endings go through the site, so the board and
 *     the agreement stay in the loop.
 *   - A higher tier on the same cycle applies now and invoices the prorated difference;
 *     everything else is a subscription schedule that switches at the renewal.
 *
 * Environment: STRIPE_SECRET_KEY, STRIPE_SPONSOR_PORTAL_CONFIG, STRIPE_SPONSORSHIP_WEBHOOK_SECRET.
 */
import { INVOICE_DAYS, fromLookupKey, isRecurring, priceLookupKey, type Contact, type Cycle, type Sponsor, type SponsorStore, type Tier } from '@zurichjs/sponsorship';
import type { Env } from './http.ts';
import { StripeUnavailable, stripeApi, stripeForm } from './stripe.ts';

type Fetch = typeof fetch;

export const SPONSOR_SOURCE = 'zurichjs.com/partners';

export const SPONSOR_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.overdue',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

export interface StripeDeps {
  env: Env;
  fetch?: Fetch;
  now?: () => Date;
}

const api = <T>(deps: StripeDeps, method: 'GET' | 'POST' | 'DELETE', path: string, params?: URLSearchParams, key?: string) =>
  stripeApi<T>(deps.env, deps.fetch ?? fetch, method, path, params, key);

const prices = new Map<string, string>();

export async function priceFor(tier: Tier, cycle: Cycle, deps: StripeDeps): Promise<string> {
  const key = priceLookupKey(tier, cycle);
  const cached = prices.get(key);
  if (cached) return cached;
  const res = await api<{ data: { id: string }[] }>(deps, 'GET', 'prices', stripeForm({ lookup_keys: [key], active: true, limit: 1 }));
  const id = res.data[0]?.id;
  if (!id) throw new StripeUnavailable(`No active Stripe price with lookup key ${key}. Run pnpm sponsorship:stripe-setup.`);
  prices.set(key, id);
  return id;
}

/** "Hardstrasse 1\n8005 Zürich" → Stripe's address fields (Switzerland unless the last line says otherwise). */
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

/** Who gets invoices: the billing contacts, else the primary contact. */
export const billingContact = (contacts: Contact[]) => contacts.find((c) => c.role === 'billing') ?? contacts.find((c) => c.role === 'primary') ?? contacts[0];

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

const ACTIVE_SUB = ['trialing', 'active', 'past_due', 'incomplete', 'unpaid'];

async function refuseSecondSubscription(customer: string, deps: StripeDeps) {
  const subs = await api<{ data: { status: string; metadata?: Record<string, string> }[] }>(deps, 'GET', 'subscriptions', stripeForm({ customer, status: 'all', limit: 20 }));
  if (subs.data.some((x) => x.metadata?.source === SPONSOR_SOURCE && ACTIVE_SUB.includes(x.status))) throw new AlreadySubscribed('Payment is already set up for this sponsorship.');
}

/** A sponsorship paid manually so far starts charging when its paid period ends (Stripe needs 48 hours ahead). */
function trialEnd(s: Sponsor, deps: StripeDeps): number | undefined {
  if (s.paymentMode !== 'manual' || !s.paidUntil) return undefined;
  const until = Date.parse(`${s.paidUntil}T00:00:00Z`);
  return until > (deps.now ?? (() => new Date()))().getTime() + 49 * 3_600_000 ? Math.floor(until / 1000) : undefined;
}

const meta = (s: Sponsor) => ({ source: SPONSOR_SOURCE, sponsorId: s.id });

/** Stripe Checkout by card: a subscription, or one payment for a one-meetup sponsorship. Returns its URL. */
export async function startCardCheckout(s: Sponsor, contacts: Contact[], store: SponsorStore, origin: string, deps: StripeDeps): Promise<string> {
  const customer = await ensureCustomer(s, contacts, store, deps);
  const price = await priceFor(s.tier, s.cycle, deps);
  const account = new URL('/partners/account', origin).toString();
  if (!isRecurring(s.cycle)) {
    const session = await api<{ url: string }>(
      deps,
      'POST',
      'checkout/sessions',
      stripeForm({
        mode: 'payment',
        customer,
        line_items: [{ price, quantity: 1 }],
        success_url: `${account}?checkout=done`,
        cancel_url: `${account}?checkout=cancelled`,
        client_reference_id: s.id,
        metadata: meta(s),
        payment_intent_data: { metadata: meta(s), description: `ZurichJS sponsorship: ${s.eventTitle ?? 'one meetup'}` },
        invoice_creation: { enabled: true, invoice_data: { metadata: meta(s), description: `Sponsorship of ${s.eventTitle ?? 'one meetup'}` } },
        locale: 'en',
      }),
    );
    return session.url;
  }
  await refuseSecondSubscription(customer, deps);
  const trial = trialEnd(s, deps);
  const session = await api<{ url: string }>(
    deps,
    'POST',
    'checkout/sessions',
    stripeForm({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      success_url: `${account}?checkout=done`,
      cancel_url: `${account}?checkout=cancelled`,
      client_reference_id: s.id,
      metadata: meta(s),
      subscription_data: { metadata: meta(s), ...(trial ? { trial_end: trial } : {}) },
      locale: 'en',
    }),
  );
  return session.url;
}

interface StripeInvoice {
  id: string;
  status?: string;
  hosted_invoice_url?: string | null;
}

/** Finalises and emails an invoice (Stripe's own invoice email, with the pay page and PDF). */
async function sendInvoice(id: string, deps: StripeDeps): Promise<StripeInvoice> {
  const inv = await api<StripeInvoice>(deps, 'GET', `invoices/${encodeURIComponent(id)}`);
  const open = inv.status === 'draft' ? await api<StripeInvoice>(deps, 'POST', `invoices/${encodeURIComponent(id)}/finalize`, stripeForm({ auto_advance: true })) : inv;
  if (open.status === 'open') return api<StripeInvoice>(deps, 'POST', `invoices/${encodeURIComponent(id)}/send`, undefined, `sponsor-invoice-send:${id}`);
  return open;
}

/**
 * Pay by invoice: a subscription Stripe invoices each term (due in INVOICE_DAYS), or one
 * invoice for one meetup. Returns Stripe's invoice page for the first invoice, when there is one.
 */
export async function startInvoicing(s: Sponsor, contacts: Contact[], store: SponsorStore, deps: StripeDeps): Promise<{ invoiceUrl: string | null }> {
  const customer = await ensureCustomer(s, contacts, store, deps);
  const price = await priceFor(s.tier, s.cycle, deps);
  if (!isRecurring(s.cycle)) {
    const inv = await api<StripeInvoice>(
      deps,
      'POST',
      'invoices',
      stripeForm({
        customer,
        collection_method: 'send_invoice',
        days_until_due: INVOICE_DAYS,
        metadata: meta(s),
        description: `Sponsorship of ${s.eventTitle ?? 'one meetup'}`,
        pending_invoice_items_behavior: 'exclude',
      }),
      `sponsor-invoice:${s.id}:${s.eventId ?? 'once'}`,
    );
    await api(deps, 'POST', 'invoiceitems', stripeForm({ customer, invoice: inv.id, pricing: { price }, metadata: meta(s) }), `sponsor-invoice-item:${inv.id}`);
    const sent = await sendInvoice(inv.id, deps);
    return { invoiceUrl: sent.hosted_invoice_url ?? null };
  }
  await refuseSecondSubscription(customer, deps);
  const trial = trialEnd(s, deps);
  const sub = await api<{ id: string; latest_invoice?: string | null }>(
    deps,
    'POST',
    'subscriptions',
    stripeForm({
      customer,
      items: [{ price, quantity: 1 }],
      collection_method: 'send_invoice',
      days_until_due: INVOICE_DAYS,
      metadata: meta(s),
      ...(trial ? { trial_end: trial } : {}),
    }),
    `sponsor-subscription:${s.id}:${s.tier}-${s.cycle}`,
  );
  await store.linkStripe(s.id, { subscriptionId: sub.id }, { kind: 'stripe', id: sub.id });
  if (!sub.latest_invoice || trial) return { invoiceUrl: null };
  const sent = await sendInvoice(sub.latest_invoice, deps);
  return { invoiceUrl: sent.hosted_invoice_url ?? null };
}

export async function createPortalSession(s: Sponsor, origin: string, deps: StripeDeps): Promise<string> {
  if (!s.stripeCustomerId) throw new StripeUnavailable('This sponsor has no Stripe customer yet.');
  const configuration = deps.env.STRIPE_SPONSOR_PORTAL_CONFIG;
  if (!configuration) throw new StripeUnavailable('STRIPE_SPONSOR_PORTAL_CONFIG is not set');
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

/** The first day after the current term. */
export async function periodEnd(subscriptionId: string, deps: StripeDeps): Promise<string | null> {
  const end = (await getSub(subscriptionId, deps)).items?.data?.[0]?.current_period_end;
  return end ? day(end) : null;
}

/** A plan change waiting for the renewal: { tier, cycle, from }. */
export async function pendingChange(subscriptionId: string, deps: StripeDeps): Promise<{ tier: Tier; cycle: Cycle; from: string } | null> {
  const s = await getSub(subscriptionId, deps, true);
  const sched = typeof s.schedule === 'object' ? s.schedule : null;
  const plan = fromLookupKey(sched?.metadata?.plan);
  const from = sched?.phases?.[0]?.end_date;
  return sched && plan && from ? { ...plan, from: day(from) } : null;
}

export async function cancelPendingChange(subscriptionId: string, deps: StripeDeps): Promise<void> {
  const id = scheduleId(await getSub(subscriptionId, deps));
  if (id) await api(deps, 'POST', `subscription_schedules/${encodeURIComponent(id)}/release`);
}

/** A higher tier on the same cycle, now: Stripe invoices the prorated difference at once. */
export async function upgradeNow(subscriptionId: string, plan: { tier: Tier; cycle: Cycle }, deps: StripeDeps): Promise<void> {
  let sub = await getSub(subscriptionId, deps);
  if (scheduleId(sub)) {
    await cancelPendingChange(subscriptionId, deps);
    sub = await getSub(subscriptionId, deps);
  }
  const item = sub.items?.data?.[0];
  if (!item) throw new Error(`Subscription ${subscriptionId} has no item.`);
  const price = await priceFor(plan.tier, plan.cycle, deps);
  if (item.price?.id === price) return;
  await api(
    deps,
    'POST',
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    stripeForm({ items: [{ id: item.id, price }], proration_behavior: 'always_invoice' }),
    `sponsor-upgrade:${subscriptionId}:${price}`,
  );
}

/** Switches to `plan` from the next renewal (a subscription schedule). Returns the renewal date. */
export async function scheduleChange(subscriptionId: string, plan: { tier: Tier; cycle: Cycle }, deps: StripeDeps): Promise<{ from: string }> {
  const sub = await getSub(subscriptionId, deps);
  const current = sub.items?.data?.[0]?.price?.id;
  if (!current) throw new Error(`Subscription ${subscriptionId} has no price.`);
  const next = await priceFor(plan.tier, plan.cycle, deps);
  const existing = scheduleId(sub);
  const sched = existing
    ? await api<StripeSchedule>(deps, 'GET', `subscription_schedules/${encodeURIComponent(existing)}`)
    : await api<StripeSchedule>(deps, 'POST', 'subscription_schedules', stripeForm({ from_subscription: subscriptionId }));
  const now = Math.floor((deps.now ?? (() => new Date()))().getTime() / 1000);
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

/** Ends the subscription with the paid period. `reference` keeps a later end from Stripe's idempotency cache. */
export async function cancelAtPeriodEnd(subscriptionId: string, reference: string, deps: StripeDeps): Promise<{ endsAt: string | null }> {
  const cancel = () =>
    api<StripeSubscription>(
      deps,
      'POST',
      `subscriptions/${encodeURIComponent(subscriptionId)}`,
      stripeForm({ cancel_at_period_end: true }),
      `sponsor-cancel:${subscriptionId}:${reference}`,
    );
  let s: StripeSubscription;
  try {
    s = await cancel();
  } catch (e) {
    if (!/schedule/i.test((e as Error).message)) throw e;
    await cancelPendingChange(subscriptionId, deps);
    s = await cancel();
  }
  const end = s.cancel_at ?? s.items?.data?.[0]?.current_period_end;
  return { endsAt: end ? day(end) : null };
}

export async function resumeSubscription(subscriptionId: string, reference: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'POST', `subscriptions/${encodeURIComponent(subscriptionId)}`, stripeForm({ cancel_at_period_end: false }), `sponsor-resume:${subscriptionId}:${reference}`);
}

/** Ends a subscription now (the board ending a sponsorship outright). */
export async function cancelNow(subscriptionId: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'DELETE', `subscriptions/${encodeURIComponent(subscriptionId)}`);
}
