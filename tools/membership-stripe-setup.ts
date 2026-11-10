/**
 * Creates the membership products (one per level), their four prices and the billing portal
 * configuration in Stripe (owner, once per Stripe account; test mode first).
 *   STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup           # dry run: shows what it would do
 *   STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply
 *   … --apply --webhook-url https://zurichjs.com/api/membership/webhook   # also the webhook endpoint
 *
 * Prices come from apps/web/src/lib/membership.ts (the table /membership shows)
 * and get lookup keys member_<level>_<cycle>. Only quarterly and yearly exist.
 * If a lookup key already points at a price with the same amount it is kept;
 * if the amount changed, a new price takes over the lookup key (existing
 * subscriptions keep their old price until changed).
 *
 * The portal configuration lets members update their payment method, see
 * invoices and switch level and cycle among those four prices; cancelling is off (members
 * resign through the board, bylaws Art. 5). Prints STRIPE_MEMBER_PORTAL_CONFIG.
 *
 * With --webhook-url it also creates the webhook endpoint for the lifecycle
 * events the site handles (apps/web/src/pages/api/membership/webhook.ts), on the
 * API version the site pins, and prints STRIPE_MEMBERSHIP_WEBHOOK_SECRET (Stripe
 * shows the secret only when the endpoint is created). Locally, `stripe listen`
 * replaces the endpoint (pnpm local).
 */
import { priceLookupKey } from '@zurichjs/membership';
import { CYCLES, TIERS, TIER_KEYS } from '../apps/web/src/lib/membership.ts';
import { MEMBERSHIP_WEBHOOK_EVENTS } from '../apps/web/src/server/membership-stripe.ts';
import { STRIPE_API_VERSION, stripeApi, stripeForm } from '../apps/web/src/server/stripe.ts';

const apply = process.argv.includes('--apply');
const webhookArg = process.argv.indexOf('--webhook-url');
const webhookUrl = webhookArg > 0 ? process.argv[webhookArg + 1] : undefined;
if (webhookArg > 0 && !webhookUrl?.startsWith('https://')) {
  console.error('--webhook-url needs an https:// URL, e.g. https://zurichjs.com/api/membership/webhook');
  process.exit(1);
}
const env = process.env;
if (!env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_… first).');
  process.exit(1);
}
const live = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
console.log(`${live ? 'LIVE' : 'Test'} mode, ${apply ? 'applying' : 'dry run'}.\n`);
const api = <T>(method: 'GET' | 'POST', path: string, params?: Record<string, unknown>, key?: string) =>
  stripeApi<T>(env, fetch, method, path, params ? stripeForm(params) : undefined, key);

// One product per level, each with a quarterly and a yearly price: the billing
// portal allows only one price per interval on a product, so a single product
// for both levels could not offer the switch between them.
const SOURCE = 'zurichjs.com/membership';
type Product = { id: string; name: string; metadata: Record<string, string> };
const products = await api<{ data: Product[] }>('GET', 'products', { active: true, limit: 100 });

const portalProducts: { product: string; prices: string[] }[] = [];
let complete = true;
for (const level of TIER_KEYS) {
  const name = `ZurichJS membership: ${TIERS[level].name}`;
  let product = products.data.find((p) => p.metadata.source === SOURCE && p.metadata.level === level);
  if (product) console.log(`= product ${product.id} (${product.name})`);
  else {
    console.log(`+ product "${name}"`);
    if (apply) product = await api<Product>('POST', 'products', { name, metadata: { source: SOURCE, level } }, `membership-product-${level}`);
  }

  const prices: string[] = [];
  for (const c of CYCLES) {
    const key = priceLookupKey(level, c.value);
    const amount = Math.round(TIERS[level].fees[c.value] * 100);
    const found = await api<{ data: { id: string; unit_amount: number; product: string }[] }>('GET', 'prices', { lookup_keys: [key], active: true, limit: 1 });
    const existing = found.data[0];
    if (existing && existing.unit_amount === amount && existing.product === product?.id) {
      console.log(`  = ${key}: ${existing.id} (CHF ${amount / 100})`);
      prices.push(existing.id);
      continue;
    }
    const was = existing ? ` (replaces ${existing.id}, CHF ${existing.unit_amount / 100})` : '';
    console.log(`  + ${key}: CHF ${amount / 100} every ${c.value === 'yearly' ? 'year' : '3 months'}${was}`);
    if (!apply || !product) continue;
    const p = await api<{ id: string }>('POST', 'prices', {
      product: product.id,
      currency: 'chf',
      unit_amount: amount,
      recurring: c.value === 'yearly' ? { interval: 'year' } : { interval: 'month', interval_count: 3 },
      lookup_key: key,
      transfer_lookup_key: true,
      nickname: `${TIERS[level].name}, ${c.label.toLowerCase()}`,
      metadata: { source: SOURCE, level, cycle: c.value },
    });
    prices.push(p.id);
  }
  if (product && prices.length === CYCLES.length) portalProducts.push({ product: product.id, prices });
  else complete = false;
}

console.log('\n+ billing portal configuration (no cancelling; switch level and cycle among the membership prices)');
if (apply && complete) {
  const config = await api<{ id: string }>('POST', 'billing_portal/configurations', {
    business_profile: { headline: 'Swiss JavaScript Group: your ZurichJS membership' },
    default_return_url: 'https://zurichjs.com/membership/account',
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['address', 'name', 'tax_id'] },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: true, default_allowed_updates: ['price'], proration_behavior: 'none', products: portalProducts },
    },
    metadata: { source: SOURCE },
  });
  console.log(`\nSet STRIPE_MEMBER_PORTAL_CONFIG=${config.id} on Netlify (functions).`);
}

if (webhookUrl) {
  const endpoints = await api<{ data: { id: string; url: string; status: string }[] }>('GET', 'webhook_endpoints', { limit: 100 });
  const existing = endpoints.data.find((e) => e.url === webhookUrl);
  if (existing) console.log(`\n= webhook endpoint ${existing.id} (${existing.status}) for ${webhookUrl}. Its secret is in the Stripe dashboard.`);
  else {
    console.log(`\n+ webhook endpoint ${webhookUrl} (${MEMBERSHIP_WEBHOOK_EVENTS.join(', ')}; API ${STRIPE_API_VERSION})`);
    if (apply) {
      const e = await api<{ id: string; secret: string }>('POST', 'webhook_endpoints', {
        url: webhookUrl,
        enabled_events: [...MEMBERSHIP_WEBHOOK_EVENTS],
        api_version: STRIPE_API_VERSION,
        description: 'zurichjs.com membership lifecycle',
        metadata: { source: 'zurichjs.com/membership' },
      });
      console.log(`Set STRIPE_MEMBERSHIP_WEBHOOK_SECRET=${e.secret} on Netlify (functions). Stripe shows it only now.`);
    }
  }
}
if (!apply) console.log('\nDry run: nothing created. Add --apply.');
