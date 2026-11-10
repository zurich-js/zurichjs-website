/**
 * Creates the membership product, its four prices and the billing portal
 * configuration in Stripe (owner, once per Stripe account; test mode first).
 *   STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup           # dry run: shows what it would do
 *   STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply
 *
 * Prices come from apps/web/src/lib/membership.ts (the table /membership shows)
 * and get lookup keys member_<level>_<cycle>. Only quarterly and yearly exist.
 * If a lookup key already points at a price with the same amount it is kept;
 * if the amount changed, a new price takes over the lookup key (existing
 * subscriptions keep their old price until changed).
 *
 * The portal configuration lets members update their payment method, see
 * invoices and switch between those four prices; cancelling is off (members
 * resign through the board, bylaws Art. 5). Prints STRIPE_MEMBER_PORTAL_CONFIG.
 */
import { priceLookupKey } from '@zurichjs/membership';
import { CYCLES, TIERS, TIER_KEYS } from '../apps/web/src/lib/membership.ts';
import { stripeApi, stripeForm } from '../apps/web/src/server/stripe.ts';

const apply = process.argv.includes('--apply');
const env = process.env;
if (!env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_… first).');
  process.exit(1);
}
const live = env.STRIPE_SECRET_KEY.startsWith('sk_live_');
console.log(`${live ? 'LIVE' : 'Test'} mode, ${apply ? 'applying' : 'dry run'}.\n`);
const api = <T>(method: 'GET' | 'POST', path: string, params?: Record<string, unknown>, key?: string) =>
  stripeApi<T>(env, fetch, method, path, params ? stripeForm(params) : undefined, key);

const PRODUCT_NAME = 'Swiss JavaScript Group membership';
const products = await api<{ data: { id: string; name: string; metadata: Record<string, string> }[] }>('GET', 'products', { active: true, limit: 100 });
let product = products.data.find((p) => p.metadata.source === 'zurichjs.com/membership');
if (!product) {
  console.log(`+ product "${PRODUCT_NAME}"`);
  if (apply) product = await api('POST', 'products', { name: PRODUCT_NAME, metadata: { source: 'zurichjs.com/membership' } }, 'membership-product');
} else console.log(`= product ${product.id}`);

const priceIds: string[] = [];
for (const level of TIER_KEYS) {
  for (const c of CYCLES) {
    const key = priceLookupKey(level, c.value);
    const amount = Math.round(TIERS[level].fees[c.value] * 100);
    const found = await api<{ data: { id: string; unit_amount: number }[] }>('GET', 'prices', { lookup_keys: [key], active: true, limit: 1 });
    const existing = found.data[0];
    if (existing && existing.unit_amount === amount) {
      console.log(`= ${key}: ${existing.id} (CHF ${amount / 100})`);
      priceIds.push(existing.id);
      continue;
    }
    console.log(
      `${existing ? '~' : '+'} ${key}: CHF ${amount / 100} every ${c.value === 'yearly' ? 'year' : '3 months'}${existing ? ` (was CHF ${existing.unit_amount / 100})` : ''}`,
    );
    if (!apply || !product) continue;
    const p = await api<{ id: string }>('POST', 'prices', {
      product: product.id,
      currency: 'chf',
      unit_amount: amount,
      recurring: c.value === 'yearly' ? { interval: 'year' } : { interval: 'month', interval_count: 3 },
      lookup_key: key,
      transfer_lookup_key: true,
      nickname: `${TIERS[level].name}, ${c.label.toLowerCase()}`,
      metadata: { source: 'zurichjs.com/membership', level, cycle: c.value },
    });
    priceIds.push(p.id);
  }
}

console.log(`\n+ billing portal configuration (no cancelling; switch between the ${priceIds.length || 4} membership prices)`);
if (apply && product && priceIds.length === 4) {
  const config = await api<{ id: string }>('POST', 'billing_portal/configurations', {
    business_profile: { headline: 'Swiss JavaScript Group: your ZurichJS membership' },
    default_return_url: 'https://zurichjs.com/membership/account',
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['address', 'name', 'tax_id'] },
      subscription_cancel: { enabled: false },
      subscription_update: { enabled: true, default_allowed_updates: ['price'], proration_behavior: 'none', products: [{ product: product.id, prices: priceIds }] },
    },
    metadata: { source: 'zurichjs.com/membership' },
  });
  console.log(`\nSet STRIPE_MEMBER_PORTAL_CONFIG=${config.id} on Netlify (functions).`);
} else if (!apply) console.log('\nDry run: nothing created. Add --apply.');
