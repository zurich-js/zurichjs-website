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
  confirmedContact,
  currentOfferId,
  fromLookupKey,
  isRecurring,
  meetupPrice,
  priceLookupKey,
  type Contact,
  type Cycle,
  type LinkAttempt,
  type Sponsor,
  type SponsorMeetup,
  type SponsorStore,
  type Tier,
  type Quote,
  type FeePlanChange,
  type RecurringCycle,
} from '@zurichjs/sponsorship';
import { INTERVAL_OF, SURCHARGE_NAME, stripeRecurring } from './sponsor-fees.ts';
import { longDate } from './dates.ts';
import type { Env } from './http.ts';
import { StripeRequestError, StripeUnavailable, stripeApi, stripeForm } from './stripe.ts';

type Fetch = typeof fetch;

export const SPONSOR_SOURCE = 'zurichjs.com/partners';

export interface StripeDeps {
  env: Env;
  fetch?: Fetch;
  now?: () => Date;
}

const api = <T>(deps: StripeDeps, method: 'GET' | 'POST' | 'DELETE', path: string, params?: URLSearchParams, key?: string) =>
  stripeApi<T>(deps.env, deps.fetch ?? fetch, method, path, params, key);

interface ListPrice {
  id: string;
  product: string;
  /** Null when Stripe did not say (then it is never trusted for a quote's base). */
  unitAmount: number | null;
  currency: string | null;
}

const prices = new Map<string, ListPrice>();

/** The active list price for a tier and cycle, with its product (cached per function instance). */
export async function priceFor(tier: Tier, cycle: Cycle, deps: StripeDeps): Promise<ListPrice> {
  const key = priceLookupKey(tier, cycle);
  const cached = prices.get(key);
  if (cached) return cached;
  const found = await activePrice(key, deps);
  prices.set(key, found);
  return found;
}

async function activePrice(key: string, deps: StripeDeps) {
  const res = await api<{ data: { id: string; product: string | { id: string }; unit_amount?: number | null; currency?: string }[] }>(
    deps,
    'GET',
    'prices',
    stripeForm({ lookup_keys: [key], active: true, limit: 1 }),
  );
  const p = res.data[0];
  if (!p?.id) throw new StripeUnavailable(`No active Stripe price with lookup key ${key}. Run pnpm sponsorship:stripe-setup.`);
  return {
    id: p.id,
    product: typeof p.product === 'string' ? p.product : p.product.id,
    unitAmount: typeof p.unit_amount === 'number' ? p.unit_amount : null,
    currency: typeof p.currency === 'string' ? p.currency : null,
  };
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
export const confirmed = (c: Contact) => confirmedContact(c);

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
const resourceMissing = (e: unknown) => e instanceof StripeRequestError && e.status === 404 && e.code === 'resource_missing';
const alreadyClosed = (e: unknown) =>
  resourceMissing(e) || (e instanceof StripeRequestError && e.status === 400 && /status (of|in) \W*open\W* can be expired|is not open|already (been )?expired/i.test(e.message));

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

/** A recurring quote the sponsor agreed to at Checkout: its fee line is added to the subscription, and the webhook records the acceptance. */
export interface CheckoutFee {
  quote: Quote;
  contactId: string;
}

/**
 * Stripe Checkout by card: a subscription, or one payment for the meetups. Returns its URL. With a
 * recurring quote where the sponsor covers the fees, the surcharge is its own recurring line, so
 * every renewal and receipt shows it.
 */
export async function startCardCheckout(
  s: Sponsor,
  contacts: Contact[],
  meetups: SponsorMeetup[],
  store: SponsorStore,
  origin: string,
  deps: StripeDeps,
  fee?: CheckoutFee,
): Promise<string> {
  const customer = await ensureCustomer(s, contacts, store, deps);
  await closeCheckout(s, store, deps);
  const account = new URL('/partners/account', origin).toString();
  const metadata = { ...meta(s), offerId: currentOfferId(s.id, await store.events(s.id)) };
  const common = {
    customer,
    success_url: `${account}?checkout=done`,
    cancel_url: `${account}?checkout=cancelled`,
    client_reference_id: s.id,
    metadata: { ...metadata, ...(fee ? { quoteId: fee.quote.id, acceptedBy: fee.contactId } : {}) },
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
    const base = await priceFor(s.tier, s.cycle, deps);
    if (fee && (base.unitAmount !== fee.quote.baseMinor || base.currency !== fee.quote.currency || INTERVAL_OF[s.cycle] !== fee.quote.interval))
      throw new StripeUnavailable('The Stripe price differs from the offer. Ask the board for a fresh quote.');
    session = await api(
      deps,
      'POST',
      'checkout/sessions',
      stripeForm({
        ...common,
        mode: 'subscription',
        line_items: [{ price: base.id, quantity: 1 }, ...(fee?.quote.surchargeMinor ? [{ price: await recurringFeePrice(fee.quote, deps), quantity: 1 }] : [])],
        subscription_data: { metadata, ...(trial ? { trial_end: trial } : {}) },
      }),
    );
  }
  await store.linkStripe(s.id, { checkoutSessionId: session.id }, { kind: 'stripe', id: session.id });
  return session.url;
}

/**
 * The Stripe payment link for a board offer (a one-time sponsorship with a signed contract): one
 * card payment, usable once, for exactly the quote's figures. The base is the list price when Stripe
 * confirms it adds up to the frozen base in CHF, else an exact price made for this quote; a
 * surcharge is its own line. Stripe's idempotency key is the quote, so a retry after a failure
 * half-way gets the same link back instead of a second one. Nothing is saved here: the caller
 * attaches the link to the quote (sponsor-fees.ts, publishOffer).
 */
export async function quoteLink(s: Sponsor, meetups: SponsorMeetup[], origin: string, deps: StripeDeps, quote: Quote, store: SponsorStore): Promise<{ id: string; url: string }> {
  if (isRecurring(s.cycle)) throw new Error('Payment links are for one-time sponsorships.');
  const quantity = Math.max(meetups.length, 1);
  const list = await priceFor(s.tier, 'once', deps);
  const listFits = s.pricePerMeetup === null && list.currency === 'chf' && list.unitAmount !== null && list.unitAmount * quantity === quote.baseMinor;
  const exact = quote.baseMinor % quantity === 0 ? { unit: quote.baseMinor / quantity, quantity } : { unit: quote.baseMinor, quantity: 1 };
  const base = listFits
    ? { price: list.id, quantity }
    : {
        price: (
          await api<{ id: string }>(
            deps,
            'POST',
            'prices',
            stripeForm({
              currency: 'chf',
              product: list.product,
              unit_amount: exact.unit,
              metadata: { ...meta(s), quoteId: quote.id },
              nickname: `${s.companyName} bundle`.slice(0, 200),
            }),
            `sponsor-base:${quote.id}`,
          )
        ).id,
        quantity: exact.quantity,
      };
  const what = `Sponsorship of ${meetupList(meetups) || 'one meetup'}`.slice(0, 500);
  // The quote (fees.ts) is the record of what they pay; a surcharge is its own line, so the payment
  // page and the receipt show base, fee and total apart.
  const metadata = { ...meta(s), quoteId: quote.id, attemptId: quote.id };
  const surcharge = quote.surchargeMinor ? await surchargePrice(quote, deps) : null;
  const request = stripeForm({
    line_items: [base, ...(surcharge ? [{ price: surcharge, quantity: 1 }] : [])],
    metadata,
    payment_method_types: ['card'],
    payment_intent_data: { metadata, description: what },
    invoice_creation: { enabled: true, invoice_data: { metadata, description: what } },
    restrictions: { completed_sessions: { limit: 1 } },
    after_completion: { type: 'redirect', redirect: { url: `${new URL('/partners/account', origin).toString()}?checkout=done` } },
  }).toString();
  const started = performance.now();
  const attempt = await store.beginLinkAttempt(s.id, request, quote.id);
  if (attempt.state === 'closed' || attempt.state === 'closing') throw new PaymentLinkRace();
  if (!replayable(attempt, started)) throw new PaymentLinkPending('The payment link request needs reconciliation.');
  const link = await askForLink(attempt, deps);
  await store.linkAttemptCreated(attempt.key, link.id);
  return link;
}

/** A one-off Stripe price for a quote's surcharge, named so the sponsor sees what it is for. */
export async function surchargePrice(quote: Quote, deps: StripeDeps): Promise<string> {
  const p = await api<{ id: string }>(
    deps,
    'POST',
    'prices',
    stripeForm({ currency: 'chf', unit_amount: quote.surchargeMinor, product_data: { name: SURCHARGE_NAME }, metadata: { source: SPONSOR_SOURCE, quoteId: quote.id } }),
    `sponsor-surcharge:${quote.id}`,
  );
  return p.id;
}

/**
 * Links still on at Stripe that were made for these quotes: a link Stripe made while the request
 * that asked for it failed before saving it.
 */
export async function activeQuoteLinks(quoteIds: string[], deps: StripeDeps): Promise<string[]> {
  if (!quoteIds.length) return [];
  const ids: string[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await api<{ data: { id: string; metadata?: Record<string, string> }[]; has_more: boolean }>(
      deps,
      'GET',
      'payment_links',
      stripeForm({ active: true, limit: 100, starting_after: cursor }),
    );
    ids.push(...page.data.filter((l) => l.metadata?.source === SPONSOR_SOURCE && quoteIds.includes(l.metadata.quoteId ?? '')).map((l) => l.id));
    if (!page.has_more) return ids;
    const next = page.data.at(-1)?.id;
    if (!next || next === cursor) throw new Error('Stripe did not return the next payment link page.');
    cursor = next;
  }
}

/** What the processor kept on a payment, once Stripe has settled it: null until then. */
export async function actualFee(paymentIntentId: string, deps: StripeDeps): Promise<{ feeMinor: number; netMinor: number } | null> {
  const pi = await api<{ latest_charge?: { balance_transaction?: { fee?: number; net?: number; currency?: string } | string | null } | string | null }>(
    deps,
    'GET',
    `payment_intents/${encodeURIComponent(paymentIntentId)}`,
    stripeForm({ expand: ['latest_charge.balance_transaction'] }),
  );
  const charge = typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
  const bt = charge && typeof charge.balance_transaction === 'object' ? charge.balance_transaction : null;
  if (!bt || typeof bt.fee !== 'number' || typeof bt.net !== 'number' || bt.currency !== 'chf') return null;
  return { feeMinor: bt.fee, netMinor: bt.net };
}

export class PaymentLinkRace extends Error {}
export class PaymentLinkPending extends Error {}

/** The attempt's request with its key: the first call creates the link, any later one (within 24 hours) answers the same link. */
const askForLink = (a: Pick<LinkAttempt, 'key' | 'request'>, deps: StripeDeps) =>
  api<{ id: string; url: string }>(deps, 'POST', 'payment_links', new URLSearchParams(a.request), `sponsor-payment-link:${a.key}`);

export const deactivateLink = (id: string, deps: StripeDeps) =>
  api(deps, 'POST', `payment_links/${encodeURIComponent(id)}`, stripeForm({ active: false })).catch((e: unknown) => {
    if (!resourceMissing(e)) throw e;
  });

// Stripe retains keys for at least 24 hours. Reserve twice the 15-second HTTP timeout for delivery.
const REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000 - 30_000;
const replayable = (a: LinkAttempt, scanStarted: number) => a.ageMs >= 0 && a.ageMs + performance.now() - scanStarted < REPLAY_WINDOW_MS;

interface LinkCreatedEvent {
  id: string;
  request?: { idempotency_key?: string } | null;
  data: { object: { id: string; metadata?: { attemptId?: string; sponsorId?: string } } };
}

async function recoverLinkId(a: LinkAttempt, deps: StripeDeps, scanStarted: number, canStart: () => boolean): Promise<string> {
  const created = Date.parse(a.createdAt);
  if (canStart() && replayable(a, scanStarted)) return (await askForLink(a, deps)).id;
  // An empty event history is inconclusive, including when Stripe has aged out the event.
  let cursor: string | undefined;
  while (canStart()) {
    const page: { data: LinkCreatedEvent[]; has_more: boolean } = await api(
      deps,
      'GET',
      'events',
      stripeForm({
        type: 'payment_link.created',
        created: { gte: Math.floor(created / 1000) - 3600, lte: Math.ceil((created + REPLAY_WINDOW_MS) / 1000) + 3600 },
        limit: 100,
        starting_after: cursor,
      }),
    );
    const found = page.data.find(
      (e) => e.request?.idempotency_key === `sponsor-payment-link:${a.key}` || (e.data.object.metadata?.attemptId === a.key && e.data.object.metadata.sponsorId === a.sponsorId),
    );
    if (found) return found.data.object.id;
    const next = page.data.at(-1)?.id;
    if (!page.has_more || !next || next === cursor) break;
    cursor = next;
  }
  throw new StripeUnavailable('The original payment link could not be identified.');
}

async function closeAttempt(a: LinkAttempt, store: SponsorStore, deps: StripeDeps, canStart = () => true, scanStarted = performance.now()): Promise<boolean> {
  if (!(await store.claimLinkCleanup(a.key, a.linkId ?? undefined))) return false;
  const id = a.linkId ?? (await recoverLinkId(a, deps, scanStarted, canStart));
  if (!a.linkId) await store.claimLinkCleanup(a.key, id);
  if (!canStart()) throw new StripeUnavailable('Payment link cleanup is pending.');
  await deactivateLink(id, deps);
  await store.linkAttemptClosed(a.key);
  return true;
}

/** Close a stalled board request before retiring its quote. Keep a recent request replayable by its owner. */
export async function reconcileOfferAttempts(sponsorId: string, store: SponsorStore, deps: StripeDeps, retire: (key: string) => Promise<unknown>) {
  const started = performance.now();
  const attempts = await store.unsettledLinkAttempts({ sponsorId, limit: 1000 });
  for (const attempt of attempts) {
    if (new URLSearchParams(attempt.request).get('metadata[quoteId]') === attempt.key && attempt.state === 'open' && replayable(attempt, started)) continue;
    if (await closeAttempt(attempt, store, deps, undefined, started)) await retire(attempt.key);
  }
  if (attempts.length === 1000) throw new PaymentLinkPending('Payment link cleanup is pending.');
}

export async function recoverPaymentLinks(
  store: SponsorStore,
  deps: StripeDeps & { log?: (m: string) => void },
  opts: { sponsorId?: string; limit?: number; canStart?: () => boolean } = {},
): Promise<{ closed: number; failed: number }> {
  const out = { closed: 0, failed: 0 };
  const scanStarted = performance.now();
  for (const a of await store.unsettledLinkAttempts({ sponsorId: opts.sponsorId, limit: opts.limit ?? 50 })) {
    if (opts.canStart && !opts.canStart()) break;
    try {
      if (await closeAttempt(a, store, deps, opts.canStart, scanStarted)) out.closed++;
    } catch (cause) {
      out.failed++;
      (deps.log ?? console.log)(`[sponsorship] payment link attempt ${a.key} not switched off, tried again later: ${(cause as Error).message}`);
    }
  }
  return out;
}

/** Stripe pages or a subscription a sponsorship still points at (after an end: a close that failed half-way). */
export const leftInStripe = (s: Sponsor) => !!(s.stripeSubscriptionId || s.checkoutSessionId || s.paymentLinkId);

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
  items?: {
    data?: {
      id: string;
      quantity?: number;
      price?: { id: string; product?: string; unit_amount?: number; currency?: string; lookup_key?: string | null; metadata?: Record<string, string> };
      metadata?: Record<string, string>;
      current_period_start?: number;
      current_period_end?: number;
    }[];
  };
}
interface StripeSchedule {
  id: string;
  phases: { start_date: number; end_date: number; trial_end?: number | null }[];
}

const day = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);
const getSub = (id: string, deps: StripeDeps, expand = false) =>
  api<StripeSubscription>(deps, 'GET', `subscriptions/${encodeURIComponent(id)}`, expand ? stripeForm({ expand: ['schedule'] }) : undefined);
function baseItem(s: StripeSubscription) {
  const matches = s.items?.data?.filter((i) => fromLookupKey(i.price?.lookup_key)) ?? [];
  if (matches.length !== 1) throw new Error('The subscription needs one identifiable sponsorship plan.');
  return matches[0]!;
}
const scheduleId = (s: StripeSubscription) => (typeof s.schedule === 'string' ? s.schedule : (s.schedule?.id ?? null));
const nowUnix = (deps: StripeDeps) => Math.floor((deps.now ?? (() => new Date()))().getTime() / 1000);

/** Stripe has the subscription paid up again (nothing open, so it is active or trialing). */
export async function subscriptionPaidUp(subscriptionId: string, deps: StripeDeps): Promise<boolean> {
  const status = (await getSub(subscriptionId, deps)).status;
  return status === 'active' || status === 'trialing';
}

/** The first day after the current term. */
export async function periodEnd(subscriptionId: string, deps: StripeDeps): Promise<string | null> {
  const end = baseItem(await getSub(subscriptionId, deps)).current_period_end;
  return end ? day(end) : null;
}

export class UnreadableSchedule extends Error {}

/**
 * A plan change waiting for the renewal: { tier, cycle, from }. Null when no schedule is attached,
 * or once its change took effect. An attached schedule that came back unexpanded, or without the
 * plan and date this site writes (scheduleChange), throws UnreadableSchedule.
 */
export async function pendingChange(subscriptionId: string, deps: StripeDeps): Promise<{ tier: Tier; cycle: Cycle; from: string } | null> {
  return readPendingChange(await getSub(subscriptionId, deps, true), deps);
}

function readPendingChange(s: StripeSubscription, deps: StripeDeps) {
  if (!s.schedule) return null;
  if (typeof s.schedule === 'string' || !s.schedule.id) throw new UnreadableSchedule('Reload the page to check the scheduled plan before confirming.');
  const sched = s.schedule;
  // After the switch the schedule stays attached for one more term: not "waiting" any more.
  if (sched.metadata?.plan && sched.metadata.plan === baseItem(s).price?.lookup_key) return null;
  const plan = fromLookupKey(sched.metadata?.plan);
  const from = sched.phases?.[0]?.end_date;
  if (!plan || typeof from !== 'number' || !Number.isFinite(from)) throw new UnreadableSchedule(`schedule ${sched.id} of ${s.id} has no readable plan or first phase`);
  if (from <= nowUnix(deps)) return null;
  return { ...plan, from: day(from) };
}

/** Cancel only the schedule this signed quote created. A lost response is recoverable by its id. */
export async function releaseFeePlan(schedule: string, quote: Quote, deps: StripeDeps) {
  const terms = quote.planChange;
  if (!terms || nowUnix(deps) >= terms.periodEnd) throw new StripeUnavailable('The renewal is taking effect. Reload the sponsorship.');
  const path = 'subscription_schedules/' + encodeURIComponent(schedule);
  const current = await api<{ status: string; metadata?: Record<string, string>; subscription?: string; released_subscription?: string }>(deps, 'GET', path);
  if (current.metadata?.feeQuote !== quote.id || (current.subscription ?? current.released_subscription) !== terms.subscription)
    throw new StripeUnavailable('The scheduled offer needs reconciliation.');
  if (current.status === 'released') return;
  if (current.status !== 'active') throw new StripeUnavailable('The schedule is no longer active. Reload the sponsorship.');
  const released = await api<{ status: string }>(deps, 'POST', path + '/release', undefined, 'release-fee-plan:' + quote.id);
  if (released.status !== 'released') throw new StripeUnavailable('Stripe has not confirmed cancellation of the scheduled offer.');
}

export async function cancelPendingChange(subscriptionId: string, deps: StripeDeps): Promise<boolean> {
  const id = scheduleId(await getSub(subscriptionId, deps));
  if (!id) return false;
  await releaseSchedule(id, deps);
  return true;
}

export async function readPlanSubscription(id: string, deps: StripeDeps) {
  const sub = await getSub(id, deps, true);
  const pending = readPendingChange(sub, deps);
  return { id, schedule: scheduleId(sub), pending, item: baseItem(sub), metadata: sub.metadata ?? {} };
}

export async function prepareCardPlan(subscription: Awaited<ReturnType<typeof readPlanSubscription>>, plan: { tier: Tier; cycle: Cycle }, deps: StripeDeps) {
  const item = subscription.item;
  if (!item?.id || !item.price?.id) throw new Error(`Subscription ${subscription.id} has no priced item.`);
  const price = (await activePrice(priceLookupKey(plan.tier, plan.cycle), deps)).id;
  return { ...subscription, itemId: item.id, current: item.price.id, price, plan };
}

type CardPlan = Awaited<ReturnType<typeof prepareCardPlan>>;

export async function releaseSchedule(id: string, deps: StripeDeps) {
  await api(deps, 'POST', `subscription_schedules/${encodeURIComponent(id)}/release`);
}

/** A higher tier on the same cycle, now: Stripe charges the prorated difference at once. */
export async function upgradeNow(change: CardPlan, key: string, deps: StripeDeps) {
  await api(
    deps,
    'POST',
    `subscriptions/${encodeURIComponent(change.id)}`,
    stripeForm({ items: [{ id: change.itemId, price: change.price }], proration_behavior: 'always_invoice', payment_behavior: 'error_if_incomplete' }),
    key,
  ).catch(classifyUpgradeError);
}

/** Switches to `plan` from the next renewal (a subscription schedule). Returns the renewal date. */
export async function scheduleChange(change: CardPlan, deps: StripeDeps): Promise<{ from: string }> {
  const { id: subscriptionId, plan, current, price: next, schedule: existing, metadata } = change;
  const sched = existing
    ? await api<StripeSchedule>(deps, 'GET', `subscription_schedules/${encodeURIComponent(existing)}`)
    : await api<StripeSchedule>(deps, 'POST', 'subscription_schedules', stripeForm({ from_subscription: subscriptionId }));
  const now = nowUnix(deps);
  const phase = sched.phases.find((p) => p.start_date <= now && now < p.end_date) ?? sched.phases[0]!;
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
  const end = s.cancel_at ?? baseItem(s).current_period_end;
  return { endsAt: end ? day(end) : null, droppedChange };
}

export async function resumeSubscription(subscriptionId: string, reference: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'POST', `subscriptions/${encodeURIComponent(subscriptionId)}`, stripeForm({ cancel_at_period_end: false }), `sponsor-resume:${subscriptionId}:${reference}`);
}

/** Ends a subscription now (the board ending a sponsorship outright, or a duplicate). Already ended is fine. */
export async function cancelNow(subscriptionId: string, deps: StripeDeps): Promise<void> {
  await api(deps, 'DELETE', `subscriptions/${encodeURIComponent(subscriptionId)}`).catch((e: Error) => {
    if (!resourceMissing(e)) throw e;
  });
}

/** The plan a subscription bills now: the item whose price has a sponsorship lookup key (a fee line has none). */
export const planOfSubscription = (s: { items?: { data?: { price?: { lookup_key?: string | null } }[] } }) =>
  fromLookupKey(s.items?.data?.find((i) => fromLookupKey(i.price?.lookup_key))?.price?.lookup_key);

/* ------------------------------------------------------------------ the processing-fee line */

function feeItem(s: StripeSubscription) {
  const base = baseItem(s);
  const extras = (s.items?.data ?? []).filter((item) => item.id !== base.id);
  const fees = extras.filter((item) => item.price?.metadata?.source === SPONSOR_SOURCE && item.price.metadata.role === 'processing_fee');
  if (fees.length > 1 || extras.some((item) => !item.price?.lookup_key && !fees.includes(item)))
    throw new Error('An imported subscription item needs identification before its fee can change.');
  return fees[0] ?? null;
}

export async function checkoutFeeItem(subscription: string, quote: Quote, deps: StripeDeps) {
  const sub = await getSub(subscription, deps);
  const base = baseItem(sub);
  const plan = fromLookupKey(base.price?.lookup_key);
  if (
    !plan ||
    !isRecurring(plan.cycle) ||
    INTERVAL_OF[plan.cycle] !== quote.interval ||
    base.quantity !== 1 ||
    base.price?.currency !== quote.currency ||
    base.price.unit_amount !== quote.baseMinor
  )
    return null;
  const surcharge = feeItem(sub);
  if (quote.surchargeMinor === 0) return sub.items?.data?.length === 1 ? { id: null } : null;
  return sub.items?.data?.length === 2 &&
    surcharge?.quantity === 1 &&
    surcharge.price?.metadata?.quoteId === quote.id &&
    surcharge.price.unit_amount === quote.surchargeMinor &&
    surcharge.price.currency === quote.currency
    ? { id: surcharge.id }
    : null;
}

export async function confirmedFeeItem(subscriptionId: string, quote: Quote, deps: StripeDeps): Promise<string | null> {
  const sub = await getSub(subscriptionId, deps);
  if (quote.planChange && baseItem(sub).price?.id !== quote.planChange.basePrice) return null;
  const item = feeItem(sub);
  return item?.price?.metadata?.quoteId === quote.id ? item.id : null;
}

async function recurringFeePrice(quote: Quote, deps: StripeDeps): Promise<string> {
  if (!quote.interval || !quote.surchargeMinor) throw new Error('The quote has no recurring fee.');
  const price = await api<{ id: string }>(
    deps,
    'POST',
    'prices',
    stripeForm({
      currency: 'chf',
      unit_amount: quote.surchargeMinor,
      recurring: stripeRecurring(quote.interval),
      ...(quote.planChange ? { product: quote.planChange.feeProduct } : { product_data: { name: SURCHARGE_NAME } }),
      metadata: { source: SPONSOR_SOURCE, role: 'processing_fee', quoteId: quote.id },
    }),
    `sponsor-surcharge-price:${quote.id}`,
  );
  return price.id;
}

export async function setSurchargeItem(subscriptionId: string, quote: Quote, deps: StripeDeps): Promise<string | null> {
  const sub = await getSub(subscriptionId, deps);
  const current = feeItem(sub);
  if (current?.price?.metadata?.quoteId === quote.id) return current.id;
  if (!quote.surchargeMinor && !current) return null;
  const price = quote.surchargeMinor ? await recurringFeePrice(quote, deps) : null;
  const change = price ? { ...(current ? { id: current.id } : {}), price, quantity: 1 } : { id: current!.id, deleted: true };
  await api(deps, 'POST', `subscriptions/${encodeURIComponent(subscriptionId)}`, stripeForm({ items: [change], proration_behavior: 'none' }), `sponsor-surcharge-item:${quote.id}`);
  const saved = feeItem(await getSub(subscriptionId, deps));
  if (price ? saved?.price?.id !== price || saved?.price?.metadata?.quoteId !== quote.id : !!saved)
    throw new Error('Stripe has not confirmed the quoted subscription items. Retry this offer.');
  return saved?.id ?? null;
}

function planFeeItems(s: StripeSubscription) {
  const base = baseItem(s);
  const surcharge = feeItem(s);
  if (!base.price || !surcharge?.price || s.items?.data?.length !== 2 || s.items.data.some((i) => i.quantity !== 1)) {
    throw new StripeUnavailable('The plan and its processing fee must both be identifiable before offering a change.');
  }
  return { base, surcharge, basePrice: base.price.id, feePrice: surcharge.price.id };
}

async function invoicePreview(subscription: string, items: object[], at: number, deps: StripeDeps) {
  const invoice = await api<{ currency: string; amount_due: number }>(
    deps,
    'POST',
    'invoices/create_preview',
    stripeForm({ subscription, subscription_details: { items, proration_behavior: 'always_invoice', proration_date: at } }),
  );
  if (invoice.currency !== 'chf' || !Number.isSafeInteger(invoice.amount_due) || invoice.amount_due < 0)
    throw new StripeUnavailable('Stripe returned no CHF amount for this change.');
  return invoice.amount_due;
}

export async function previewFeePlan(
  subscription: string,
  previousQuote: string,
  target: { tier: Tier; cycle: RecurringCycle },
  baseMinor: number,
  surchargeMinor: number,
  timing: 'now' | 'renewal',
  deps: StripeDeps,
): Promise<FeePlanChange> {
  const policy = deps.env.SPONSOR_FEE_PRORATION_POLICY_VERSION?.trim();
  if (timing === 'now' && (!policy || deps.env.SPONSOR_FEE_PRORATION_MODE !== 'stripe_items'))
    throw new StripeUnavailable('The board has not approved how to charge the processing fee on a prorated upgrade.');
  const sub = await getSub(subscription, deps);
  const items = planFeeItems(sub);
  const product = items.surcharge.price?.product;
  const periodEnd = items.base.current_period_end;
  if (sub.schedule || !product || !periodEnd || periodEnd <= nowUnix(deps) || items.surcharge.price?.metadata?.quoteId !== previousQuote)
    throw new StripeUnavailable('The current subscription or its renewal needs review before a fee offer.');
  const price = await priceFor(target.tier, target.cycle, deps);
  if (price.currency !== 'chf' || price.unitAmount !== baseMinor) throw new StripeUnavailable('The target Stripe price differs from the offered plan.');
  const at = nowUnix(deps);
  const terms = {
    subscription,
    previousQuote,
    ...target,
    basePrice: price.id,
    previousBasePrice: items.basePrice,
    previousFeePrice: items.feePrice,
    feeProduct: product,
    periodEnd,
  };
  if (timing === 'renewal') return { ...terms, charge: { timing } };
  const dueMinor = await invoicePreview(
    subscription,
    [
      { id: items.base.id, price: price.id },
      { id: items.surcharge.id, price_data: { currency: 'chf', product, unit_amount: surchargeMinor, recurring: stripeRecurring(INTERVAL_OF[target.cycle]) } },
    ],
    at,
    deps,
  );
  return { ...terms, charge: { timing, at, dueMinor, policy: policy! } };
}

export class UpgradeDeclined extends Error {}
export class UnappliedPlanExpired extends Error {}

function classifyUpgradeError(cause: unknown): never {
  if (cause instanceof StripeRequestError && cause.status === 402) throw new UpgradeDeclined();
  throw cause;
}

/** A claimed immediate upgrade that never applied: the subscription renewed on the previous plan and fee. */
function renewedUnapplied(sub: StripeSubscription, items: ReturnType<typeof planFeeItems>, quote: Quote, terms: FeePlanChange) {
  const { current_period_start: start, current_period_end: end } = items.base;
  return (
    !!quote.applyingBy &&
    terms.charge.timing === 'now' &&
    start !== undefined &&
    end !== undefined &&
    start >= terms.periodEnd &&
    end > start &&
    items.basePrice === terms.previousBasePrice &&
    items.feePrice === terms.previousFeePrice &&
    items.surcharge.price?.metadata?.quoteId === terms.previousQuote &&
    sub.metadata?.feePlanQuote !== quote.id
  );
}

export async function claimedPlanExpired(quote: Quote, terms: FeePlanChange, deps: StripeDeps): Promise<boolean> {
  const sub = await getSub(terms.subscription, deps);
  return renewedUnapplied(sub, planFeeItems(sub), quote, terms);
}

export async function applyFeePlan(quote: Quote, terms: FeePlanChange, deps: StripeDeps, claim: () => Promise<void>): Promise<{ schedule: string } | { item: string }> {
  const sub = await getSub(terms.subscription, deps);
  const items = planFeeItems(sub);
  if (quote.applyingBy && items.basePrice === terms.basePrice && items.surcharge.price?.metadata?.quoteId === quote.id) return { item: items.surcharge.id };
  const charge = terms.charge;
  const end = items.base.current_period_end;
  const originalPrices = items.basePrice === terms.previousBasePrice && items.feePrice === terms.previousFeePrice;
  if (renewedUnapplied(sub, items, quote, terms)) throw new UnappliedPlanExpired();
  if (!originalPrices || end !== terms.periodEnd || nowUnix(deps) >= terms.periodEnd) throw new StripeUnavailable('The subscription changed. Ask the board for a fresh offer.');
  if (charge.timing === 'now' && (sub.schedule || deps.env.SPONSOR_FEE_PRORATION_MODE !== 'stripe_items' || deps.env.SPONSOR_FEE_PRORATION_POLICY_VERSION !== charge.policy))
    throw new StripeUnavailable('The renewal or the approved proration policy changed. Review a new offer.');
  if (terms.charge.timing === 'renewal' && quote.stripeRef) {
    const saved = await api<{ status: string; metadata?: Record<string, string>; phases?: { start_date: number; items: { price: string; quantity: number }[] }[] }>(
      deps,
      'GET',
      'subscription_schedules/' + encodeURIComponent(quote.stripeRef),
    );
    const phase = saved.phases?.[1];
    const feePrice = phase?.items.find((i) => i.quantity === 1 && i.price !== terms.basePrice)?.price;
    if (
      scheduleId(sub) !== quote.stripeRef ||
      saved.status !== 'active' ||
      saved.metadata?.feeQuote !== quote.id ||
      phase?.start_date !== terms.periodEnd ||
      phase.items.length !== 2 ||
      !phase.items.some((i) => i.quantity === 1 && i.price === terms.basePrice) ||
      !feePrice
    )
      throw new StripeUnavailable('The scheduled renewal changed. Reload the sponsorship.');
    const price = await api<{ unit_amount: number; currency: string; metadata?: Record<string, string> }>(deps, 'GET', 'prices/' + encodeURIComponent(feePrice));
    if (
      price.currency !== quote.currency ||
      price.unit_amount !== quote.surchargeMinor ||
      price.metadata?.quoteId !== quote.id ||
      price.metadata.role !== 'processing_fee' ||
      price.metadata.source !== SPONSOR_SOURCE
    )
      throw new StripeUnavailable('The scheduled fee differs from this offer.');
    return { schedule: quote.stripeRef };
  }
  const price = await recurringFeePrice(quote, deps);
  const target = [
    { id: items.base.id, price: terms.basePrice },
    { id: items.surcharge.id, price },
  ];
  if (charge.timing === 'now') {
    if ((await invoicePreview(terms.subscription, target, charge.at, deps)) !== charge.dueMinor)
      throw new StripeUnavailable('The invoice preview changed. Ask the board for a new offer.');
    await claim();
    await api(
      deps,
      'POST',
      'subscriptions/' + encodeURIComponent(terms.subscription),
      stripeForm({ metadata: { feePlanQuote: quote.id }, items: target, proration_behavior: 'always_invoice', proration_date: charge.at, payment_behavior: 'error_if_incomplete' }),
      'sponsor-plan:' + (quote.confirmationAttempt ?? quote.id),
    ).catch(classifyUpgradeError);
    const saved = planFeeItems(await getSub(terms.subscription, deps));
    if (saved.basePrice !== terms.basePrice || saved.surcharge.price?.id !== price || saved.surcharge.price.metadata?.quoteId !== quote.id)
      throw new StripeUnavailable('Stripe has not confirmed the quoted plan and fee yet.');
    return { item: saved.surcharge.id };
  }
  const path = 'subscription_schedules';
  type Schedule = { id: string; metadata?: Record<string, string>; phases: { start_date: number; end_date: number; items: { price: string; quantity: number }[] }[] };
  const existing = scheduleId(sub);
  const schedule = existing ? await api<Schedule>(deps, 'GET', path + '/' + encodeURIComponent(existing)) : null;
  const matches = (s: Schedule) =>
    s.metadata?.feeQuote === quote.id &&
    s.phases[1]?.start_date === terms.periodEnd &&
    s.phases[1].items.length === 2 &&
    [terms.basePrice, price].every((p) => s.phases[1]!.items.some((i) => i.price === p && i.quantity === 1));
  if (schedule && quote.applyingBy && matches(schedule)) return { schedule: schedule.id };
  if (quote.stripeRef || (schedule && !quote.applyingBy)) throw new StripeUnavailable('The renewal changed. Ask the board for a new offer.');
  await claim();
  const owned = await api<Schedule>(deps, 'POST', path, stripeForm({ from_subscription: terms.subscription }), 'sponsor-plan-schedule:' + quote.id);
  if (schedule && schedule.id !== owned.id) throw new StripeUnavailable('A different schedule owns the renewal.');
  const phase = owned.phases[0];
  if (!phase || phase.end_date !== terms.periodEnd) throw new StripeUnavailable('The renewal date changed.');
  const saved = await api<Schedule>(
    deps,
    'POST',
    path + '/' + encodeURIComponent(owned.id),
    stripeForm({
      end_behavior: 'release',
      metadata: { plan: priceLookupKey(terms.tier, terms.cycle), feeQuote: quote.id },
      phases: [
        {
          start_date: phase.start_date,
          end_date: terms.periodEnd,
          items: [
            { price: items.basePrice, quantity: 1 },
            { price: items.feePrice, quantity: 1 },
          ],
          metadata: sub.metadata,
          proration_behavior: 'none',
        },
        {
          duration: stripeRecurring(INTERVAL_OF[terms.cycle]),
          items: [
            { price: terms.basePrice, quantity: 1 },
            { price, quantity: 1 },
          ],
          metadata: { ...sub.metadata, feePlanQuote: quote.id },
          proration_behavior: 'none',
        },
      ],
    }),
    'sponsor-plan-phases:' + quote.id,
  );
  if (!matches(saved)) throw new StripeUnavailable('Stripe has not confirmed the quoted renewal yet.');
  return { schedule: saved.id };
}
