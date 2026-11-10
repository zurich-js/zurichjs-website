/**
 * Membership payments through Stripe (docs/v2/MEMBERSHIP.md). Plain fetch via
 * stripeApi (stripe.ts): no SDK, and the same local mock works.
 *
 *   - Prices are found by lookup key (member_basic_quarterly, …), so the fee
 *     table in src/lib/membership.ts and Stripe must agree (pnpm membership:stripe-setup).
 *   - Members can only be on quarterly or yearly prices of a membership level.
 *   - The billing portal configuration (STRIPE_MEMBER_PORTAL_CONFIG) lets members
 *     change payment method, see invoices and switch between those four prices;
 *     it cannot cancel. Members resign through the board (bylaws Art. 5).
 *
 * Environment: STRIPE_SECRET_KEY, STRIPE_MEMBER_PORTAL_CONFIG,
 * STRIPE_MEMBERSHIP_WEBHOOK_SECRET (webhook.ts).
 */
import { priceLookupKey, type Cycle, type Level, type Member, type MemberStore } from '@zurichjs/membership';
import type { Env } from './http.ts';
import { StripeUnavailable, stripeApi, stripeForm } from './stripe.ts';

type Fetch = typeof fetch;

export const MEMBERSHIP_SOURCE = 'zurichjs.com/membership';

/** The events the membership webhook handles (pages/api/membership/webhook.ts); the setup script subscribes to these. */
export const MEMBERSHIP_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'customer.subscription.updated',
  'customer.subscription.deleted',
] as const;

export interface StripeDeps {
  env: Env;
  fetch?: Fetch;
  /** For trial_end on imported members; tests fix the clock. */
  now?: () => Date;
}

const prices = new Map<string, string>();

/** The active Stripe Price for a level and cycle, by lookup key (cached per function instance). */
export async function priceFor(level: Level, cycle: Cycle, deps: StripeDeps): Promise<string> {
  const key = priceLookupKey(level, cycle);
  const cached = prices.get(key);
  if (cached) return cached;
  const res = await stripeApi<{ data: { id: string }[] }>(deps.env, deps.fetch ?? fetch, 'GET', 'prices', stripeForm({ lookup_keys: [key], active: true, limit: 1 }));
  const id = res.data[0]?.id;
  if (!id) throw new StripeUnavailable(`No active Stripe price with lookup key ${key}. Run pnpm membership:stripe-setup.`);
  prices.set(key, id);
  return id;
}

/** "member_supporter_yearly" → { level, cycle }, or null for any other price. */
export function fromLookupKey(key: string | null | undefined): { level: Level; cycle: Cycle } | null {
  const m = /^member_(basic|supporter)_(quarterly|yearly)$/.exec(key ?? '');
  return m ? { level: m[1] as Level, cycle: m[2] as Cycle } : null;
}

/** The member's Stripe customer, created once (idempotent on the member id) and linked. */
export async function ensureCustomer(member: Member, store: MemberStore, deps: StripeDeps): Promise<string> {
  if (member.stripeCustomerId) return member.stripeCustomerId;
  const c = await stripeApi<{ id: string }>(
    deps.env,
    deps.fetch ?? fetch,
    'POST',
    'customers',
    stripeForm({
      email: member.email,
      name: member.organisationName ?? member.name,
      metadata: { memberId: member.id, source: MEMBERSHIP_SOURCE },
      preferred_locales: ['en'],
    }),
    `member-customer:${member.id}`,
  );
  await store.linkStripe(member.id, { customerId: c.id }, { kind: 'stripe', id: c.id });
  return c.id;
}

/**
 * Stripe Checkout for the membership subscription. For an imported member who
 * paid manually (cash/bank), the first charge waits until their paid period ends (trial_end;
 * Stripe needs it at least 48 hours ahead, so a period ending sooner is charged now).
 */
/** Refused: the member already has a membership subscription in Stripe (a second Checkout would charge twice). */
export class AlreadySubscribed extends Error {}

export async function createCheckout(member: Member, store: MemberStore, origin: string, deps: StripeDeps): Promise<string> {
  const customer = await ensureCustomer(member, store, deps);
  // A Checkout finished moments ago may not have reached the webhook yet (or a second tab opened
  // another): never start a second membership subscription for the same customer.
  const open = await stripeApi<{ data: { status: string; metadata?: Record<string, string> }[] }>(
    deps.env,
    deps.fetch ?? fetch,
    'GET',
    'subscriptions',
    stripeForm({ customer, status: 'all', limit: 20 }),
  );
  if (open.data.some((s) => s.metadata?.source === MEMBERSHIP_SOURCE && ['trialing', 'active', 'past_due', 'incomplete'].includes(s.status)))
    throw new AlreadySubscribed('Automatic payment is already set up for this membership.');
  const price = await priceFor(member.level, member.cycle, deps);
  const now = (deps.now ?? (() => new Date()))().getTime();
  const paidUntil = member.status === 'imported_manual' && member.paidUntil ? Date.parse(`${member.paidUntil}T00:00:00Z`) : 0;
  const trialEnd = paidUntil > now + 49 * 3_600_000 ? Math.floor(paidUntil / 1000) : undefined;
  const account = new URL('/membership/account', origin).toString();
  const s = await stripeApi<{ id: string; url: string }>(
    deps.env,
    deps.fetch ?? fetch,
    'POST',
    'checkout/sessions',
    stripeForm({
      mode: 'subscription',
      customer,
      line_items: [{ price, quantity: 1 }],
      // A member paying manually who switches is not charged now: the account page says so.
      success_url: `${account}?checkout=${trialEnd ? 'automatic' : 'done'}`,
      cancel_url: `${account}?checkout=cancelled`,
      client_reference_id: member.id,
      metadata: { source: MEMBERSHIP_SOURCE, memberId: member.id },
      subscription_data: { metadata: { source: MEMBERSHIP_SOURCE, memberId: member.id }, ...(trialEnd ? { trial_end: trialEnd } : {}) },
      locale: 'en',
    }),
  );
  return s.url;
}

/** A Stripe billing portal session (no cancellation; see the configuration script). */
export async function createPortalSession(member: Member, origin: string, deps: StripeDeps): Promise<string> {
  if (!member.stripeCustomerId) throw new StripeUnavailable('This member has no Stripe customer yet.');
  const configuration = deps.env.STRIPE_MEMBER_PORTAL_CONFIG;
  if (!configuration) throw new StripeUnavailable('STRIPE_MEMBER_PORTAL_CONFIG is not set');
  const s = await stripeApi<{ url: string }>(
    deps.env,
    deps.fetch ?? fetch,
    'POST',
    'billing_portal/sessions',
    stripeForm({ customer: member.stripeCustomerId, configuration, return_url: new URL('/membership/account', origin).toString() }),
  );
  return s.url;
}

/** Outstanding dues (bylaws Art. 5: a resignation needs no open dues): open or uncollectible invoices. */
export async function openInvoices(member: Member, deps: StripeDeps): Promise<number> {
  if (!member.stripeCustomerId) return 0;
  const f = deps.fetch ?? fetch;
  const [open, uncollectible] = await Promise.all(
    (['open', 'uncollectible'] as const).map((status) =>
      stripeApi<{ data: unknown[] }>(deps.env, f, 'GET', 'invoices', stripeForm({ customer: member.stripeCustomerId, status, limit: 10 })),
    ),
  );
  return open!.data.length + uncollectible!.data.length;
}

/**
 * Ends the subscription at the end of the paid period (the board confirmed a resignation).
 * `reference` names this resignation (its time), so after an undo a new resignation is not
 * answered from Stripe's 24-hour idempotency cache.
 */
export async function cancelAtPeriodEnd(subscriptionId: string, reference: string, deps: StripeDeps): Promise<{ periodEnd: string | null }> {
  type Sub = { cancel_at?: number | null; items?: { data?: { current_period_end?: number }[] } };
  const cancel = () =>
    stripeApi<Sub>(
      deps.env,
      deps.fetch ?? fetch,
      'POST',
      `subscriptions/${encodeURIComponent(subscriptionId)}`,
      stripeForm({ cancel_at_period_end: true }),
      `member-cancel:${subscriptionId}:${reference}`,
    );
  let s: Sub;
  try {
    s = await cancel();
  } catch (e) {
    // A pending plan change (a subscription schedule) blocks cancel_at_period_end: someone who
    // resigns does not need it any more, so release it and try again.
    if (!/schedule/i.test((e as Error).message)) throw e;
    await cancelPlanChange(subscriptionId, deps);
    s = await cancel();
  }
  const end = s.cancel_at ?? s.items?.data?.[0]?.current_period_end;
  return { periodEnd: end ? new Date(end * 1000).toISOString().slice(0, 10) : null };
}

/* ------------------------------------------------------------- plan changes */
// Members change level or cycle on their account page (owner, 11th November 2026). A change only
// applies from the next renewal: the current term runs out at the price paid, then the new price
// starts. Nothing is charged or prorated now. Stripe would restart the billing period and charge
// at once when the interval changes, so the change is a subscription schedule: phase 1 is the
// current term as it is, phase 2 the new price; the schedule then releases the subscription.

interface StripeSubscription {
  id: string;
  schedule?: string | { id: string; metadata?: Record<string, string>; phases?: { end_date: number }[] } | null;
  cancel_at_period_end?: boolean;
  metadata?: Record<string, string>;
  items?: { data?: { price?: { id: string; lookup_key?: string | null }; current_period_end?: number }[] };
}
interface StripeSchedule {
  id: string;
  metadata?: Record<string, string>;
  phases: { start_date: number; end_date: number; trial_end?: number | null }[];
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

/** The level and cycle the subscription bills now (after a scheduled switch took effect). */
export async function currentPlan(subscriptionId: string, deps: StripeDeps): Promise<{ level: Level; cycle: Cycle } | null> {
  const s = await stripeApi<StripeSubscription>(deps.env, deps.fetch ?? fetch, 'GET', `subscriptions/${encodeURIComponent(subscriptionId)}`);
  return fromLookupKey(s.items?.data?.[0]?.price?.lookup_key);
}

/** The change waiting for the next renewal, if any: { level, cycle, from } (from = the renewal date). */
export async function pendingPlanChange(subscriptionId: string, deps: StripeDeps): Promise<{ level: Level; cycle: Cycle; from: string } | null> {
  const s = await stripeApi<StripeSubscription>(deps.env, deps.fetch ?? fetch, 'GET', `subscriptions/${encodeURIComponent(subscriptionId)}`, stripeForm({ expand: ['schedule'] }));
  const sched = typeof s.schedule === 'object' ? s.schedule : null;
  const plan = fromLookupKey(sched?.metadata?.plan);
  const from = sched?.phases?.[0]?.end_date;
  return sched && plan && from ? { ...plan, from: day(from) } : null;
}

/** Schedules a switch to `level`/`cycle` from the next renewal. Returns the renewal date. */
export async function schedulePlanChange(subscriptionId: string, plan: { level: Level; cycle: Cycle }, deps: StripeDeps): Promise<{ from: string }> {
  const f = deps.fetch ?? fetch;
  const sub = await stripeApi<StripeSubscription>(deps.env, f, 'GET', `subscriptions/${encodeURIComponent(subscriptionId)}`);
  const current = sub.items?.data?.[0]?.price?.id;
  if (!current) throw new Error(`Subscription ${subscriptionId} has no price.`);
  const next = await priceFor(plan.level, plan.cycle, deps);
  const existing = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id;
  const sched = existing
    ? await stripeApi<StripeSchedule>(deps.env, f, 'GET', `subscription_schedules/${encodeURIComponent(existing)}`)
    : await stripeApi<StripeSchedule>(deps.env, f, 'POST', 'subscription_schedules', stripeForm({ from_subscription: subscriptionId }));
  const now = Math.floor((deps.now ?? (() => new Date()))().getTime() / 1000);
  // The phase running now (a fresh schedule has only that one).
  const phase = sched.phases.find((p) => p.start_date <= now && now < p.end_date) ?? sched.phases[0]!;
  const metadata = sub.metadata ?? {};
  await stripeApi(
    deps.env,
    f,
    'POST',
    `subscription_schedules/${encodeURIComponent(sched.id)}`,
    stripeForm({
      end_behavior: 'release',
      metadata: { plan: priceLookupKey(plan.level, plan.cycle) },
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

/** Drops a pending change: the subscription renews as it is. */
export async function cancelPlanChange(subscriptionId: string, deps: StripeDeps): Promise<void> {
  const f = deps.fetch ?? fetch;
  const sub = await stripeApi<StripeSubscription>(deps.env, f, 'GET', `subscriptions/${encodeURIComponent(subscriptionId)}`);
  const id = typeof sub.schedule === 'string' ? sub.schedule : sub.schedule?.id;
  if (id) await stripeApi(deps.env, f, 'POST', `subscription_schedules/${encodeURIComponent(id)}/release`);
}

/** Takes back a scheduled end (an undone resignation the board had confirmed): the subscription renews again. */
export async function resumeSubscription(subscriptionId: string, reference: string, deps: StripeDeps): Promise<void> {
  await stripeApi(
    deps.env,
    deps.fetch ?? fetch,
    'POST',
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    stripeForm({ cancel_at_period_end: false }),
    `member-resume:${subscriptionId}:${reference}`,
  );
}
