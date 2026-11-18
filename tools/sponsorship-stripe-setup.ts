/**
 * Creates the sponsorship products (one per tier), their prices and the billing portal
 * configuration in Stripe (owner, once per Stripe account; test mode first).
 *   STRIPE_SECRET_KEY=sk_test_… pnpm sponsorship:stripe-setup           # dry run
 *   STRIPE_SECRET_KEY=sk_test_… pnpm sponsorship:stripe-setup --apply
 *
 * Prices come from packages/sponsorship/src/tiers.ts and get lookup keys
 * sponsor_<tier>_<monthly|quarterly|yearly|once>. A lookup key that already points at a price
 * with the same amount is kept; a changed amount gets a new price that takes over the key
 * (running subscriptions keep their old price until changed).
 *
 * The billing portal reuses the membership configuration (STRIPE_MEMBER_PORTAL_CONFIG) by
 * default. With --portal it also creates a sponsor-only configuration (payment method, billing
 * address and invoice history; plan changes and endings stay on /partners/account, under the
 * agreement) and prints STRIPE_SPONSOR_PORTAL_CONFIG. Sponsorship events arrive on the site's one
 * webhook endpoint, which `pnpm membership:stripe-setup --webhook-url …` creates.
 */
import { CYCLES, TIERS, priceLookupKey } from '@zurichjs/sponsorship';
import { SPONSOR_SOURCE } from '../apps/web/src/server/sponsor-stripe.ts';
import { stripeApi, stripeForm } from '../apps/web/src/server/stripe.ts';

const apply = process.argv.includes('--apply');
const portal = process.argv.includes('--portal');
const env = process.env;
if (!env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_… first).');
  process.exit(1);
}
console.log(`${env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'Test'} mode, ${apply ? 'applying' : 'dry run'}.\n`);
const api = <T>(method: 'GET' | 'POST', path: string, params?: Record<string, unknown>, key?: string) =>
  stripeApi<T>(env, fetch, method, path, params ? stripeForm(params) : undefined, key);

const RECURRING: Record<string, Record<string, unknown> | undefined> = {
  monthly: { interval: 'month' },
  quarterly: { interval: 'month', interval_count: 3 },
  yearly: { interval: 'year' },
  once: undefined,
};

type Product = { id: string; name: string; metadata: Record<string, string> };
const products = await api<{ data: Product[] }>('GET', 'products', { active: true, limit: 100 });
let complete = true;
for (const tier of TIERS) {
  const name = `ZurichJS sponsorship: ${tier.name}`;
  let product = products.data.find((p) => p.metadata.source === SPONSOR_SOURCE && p.metadata.tier === tier.key);
  if (product) console.log(`= product ${product.id} (${product.name})`);
  else {
    console.log(`+ product "${name}"`);
    if (apply) product = await api<Product>('POST', 'products', { name, metadata: { source: SPONSOR_SOURCE, tier: tier.key } }, `sponsor-product-${tier.key}`);
  }
  for (const c of CYCLES) {
    const key = priceLookupKey(tier.key, c.key);
    const amount = tier.fees[c.key] * 100;
    const found = await api<{ data: { id: string; unit_amount: number; product: string }[] }>('GET', 'prices', { lookup_keys: [key], active: true, limit: 1 });
    const existing = found.data[0];
    if (existing && existing.unit_amount === amount && existing.product === product?.id) {
      console.log(`  = ${key}: ${existing.id} (CHF ${amount / 100})`);
      continue;
    }
    console.log(`  + ${key}: CHF ${amount / 100} ${c.key === 'once' ? 'once' : `every ${c.unit}`}${existing ? ` (replaces ${existing.id})` : ''}`);
    if (!apply || !product) {
      complete = false;
      continue;
    }
    await api('POST', 'prices', {
      product: product.id,
      currency: 'chf',
      unit_amount: amount,
      recurring: RECURRING[c.key],
      lookup_key: key,
      transfer_lookup_key: true,
      nickname: `${tier.name}, ${c.label.toLowerCase()}`,
      metadata: { source: SPONSOR_SOURCE, tier: tier.key, cycle: c.key },
    });
  }
}

if (!portal) console.log('\n= billing portal: the membership configuration (STRIPE_MEMBER_PORTAL_CONFIG). Pass --portal for a sponsor-only one.');
else console.log('\n+ billing portal configuration (payment method, billing address, invoices; no cancelling or plan changes)');
if (portal && apply && complete) {
  const config = await api<{ id: string }>('POST', 'billing_portal/configurations', {
    business_profile: { headline: 'Swiss JavaScript Group: your ZurichJS sponsorship' },
    default_return_url: 'https://zurichjs.com/partners/account',
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['address'] },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: false },
    },
    metadata: { source: SPONSOR_SOURCE },
  });
  console.log(`\nSet STRIPE_SPONSOR_PORTAL_CONFIG=${config.id} on Netlify (functions).`);
} else if (portal && apply) console.log('  (skipped: run --apply again once every price exists)');

if (!apply) console.log('\nDry run: nothing created. Add --apply.');
