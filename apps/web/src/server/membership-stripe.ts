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
 * paid by hand, the first charge waits until their paid period ends (trial_end;
 * Stripe needs it at least 48 hours ahead, so a period ending sooner is charged now).
 */
export async function createCheckout(member: Member, store: MemberStore, origin: string, deps: StripeDeps): Promise<string> {
  const customer = await ensureCustomer(member, store, deps);
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
      success_url: `${account}?checkout=done`,
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

/** Ends the subscription at the end of the paid period (the board confirmed a resignation). */
export async function cancelAtPeriodEnd(subscriptionId: string, deps: StripeDeps): Promise<{ periodEnd: string | null }> {
  const s = await stripeApi<{ cancel_at?: number | null; items?: { data?: { current_period_end?: number }[] } }>(
    deps.env,
    deps.fetch ?? fetch,
    'POST',
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    stripeForm({ cancel_at_period_end: true }),
    `member-cancel:${subscriptionId}`,
  );
  const end = s.cancel_at ?? s.items?.data?.[0]?.current_period_end;
  return { periodEnd: end ? new Date(end * 1000).toISOString().slice(0, 10) : null };
}
