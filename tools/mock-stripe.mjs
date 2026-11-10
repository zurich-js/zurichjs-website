#!/usr/bin/env node
// A tiny stand-in for the parts of Stripe's API that /donate uses, for local runs and tests.
// Nothing here talks to Stripe and nothing is charged.
//
//   node tools/mock-stripe.mjs [port]        (default 4533)
//   STRIPE_API_BASE=http://localhost:4533 STRIPE_SECRET_KEY=sk_test_mock STRIPE_SUPPORT_PRODUCT_ID=prod_mock pnpm dev --port 4532
//
// Endpoints:
//   POST /v1/checkout/sessions        creates a session (form-encoded, like Stripe) and returns { id, url }
//   GET  /v1/checkout/sessions/:id    the session, as the thanks page reads it
//   GET  /pay/:id                     a plain "hosted checkout" page with Pay and Back links
//   GET  /pay/:id/complete            marks the session paid and redirects to success_url
// A unit_amount of 99900 (CHF 999) answers HTTP 500, to test "Stripe failed".
//
// Memberships (docs/v2/MEMBERSHIP.md), the same way:
//   GET  /v1/prices?lookup_keys[0]=member_<level>_<cycle>   a price per lookup key (amounts from the site's fee table)
//   POST /v1/customers                                     a customer
//   POST /v1/checkout/sessions with line_items[0][price]   a subscription checkout
//   POST /v1/billing_portal/sessions                       a portal URL (a plain page here)
//   GET  /v1/invoices                                      no open invoices
//   POST /v1/subscriptions/:id                             cancel_at_period_end
// With MOCK_STRIPE_WEBHOOK_URL and MOCK_STRIPE_WEBHOOK_SECRET set, Pay on a membership checkout
// also sends Stripe-signed checkout.session.completed and invoice.paid events to that URL.
import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

/** Ids unique across restarts (the local database keeps them). */
const uid = () => randomBytes(6).toString('hex');

/** Membership fees in rappen by lookup key (apps/web/src/lib/membership.ts). */
export const MEMBER_FEES = { member_basic_quarterly: 5000, member_basic_yearly: 17500, member_supporter_quarterly: 7500, member_supporter_yearly: 25000 };

const html = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Starts the mock. Resolves to { url, sessions, requests, close }. Port 0 picks a free port. */
export function startMockStripe(port = 0) {
  /** @type {Map<string, Record<string, any>>} */
  const sessions = new Map();
  /** @type {{ method: string, path: string, auth: string | undefined, idempotencyKey: string | undefined, version: string | undefined, form: Record<string, string> }[]} */
  const requests = [];
  let n = 0;
  let base = '';

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      const form = Object.fromEntries(new URLSearchParams(raw));
      if (url.pathname.startsWith('/v1/')) {
        requests.push({
          method: req.method ?? 'GET',
          path: url.pathname,
          auth: req.headers.authorization,
          idempotencyKey: /** @type {string | undefined} */ (req.headers['idempotency-key']),
          version: /** @type {string | undefined} */ (req.headers['stripe-version']),
          form,
        });
        if (!(req.headers.authorization ?? '').startsWith('Bearer sk_test_'))
          return send(401, { error: { message: 'Invalid API Key provided (the mock accepts sk_test_ keys only)' } });
      }

      const member = membershipRoute(req.method ?? 'GET', url, form);
      if (member) return send(member.status, member.body);

      if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions' && form['line_items[0][price]']) {
        if (form.mode !== 'subscription') return send(400, { error: { message: 'membership prices need subscription mode' } });
        const id = `cs_test_mock${uid()}`;
        const pick = (prefix) =>
          Object.fromEntries(
            Object.entries(form)
              .filter(([k]) => k.startsWith(prefix))
              .map(([k, v]) => [k.slice(prefix.length, -1), v]),
          );
        const s = {
          id,
          object: 'checkout.session',
          mode: 'subscription',
          membership: true,
          price: form['line_items[0][price]'],
          customer: form.customer,
          trial_end: form['subscription_data[trial_end]'] ? Number(form['subscription_data[trial_end]']) : null,
          success_url: form.success_url,
          cancel_url: form.cancel_url,
          metadata: pick('metadata['),
          subscription_metadata: pick('subscription_data[metadata]['),
          status: 'open',
          payment_status: 'unpaid',
          url: `${base}/pay/${id}`,
        };
        sessions.set(id, s);
        return send(200, s);
      }

      if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
        const amount = Number(form['line_items[0][price_data][unit_amount]']);
        if (amount === 99900) return send(500, { error: { message: 'Mock Stripe failure' } });
        const mode = form.mode;
        const monthly = form['line_items[0][price_data][recurring][interval]'] === 'month';
        if (form['line_items[0][price_data][currency]'] !== 'chf') return send(400, { error: { message: 'currency must be chf' } });
        if (!form['line_items[0][price_data][product]']) return send(400, { error: { message: 'product is required' } });
        if ((mode === 'subscription') !== monthly) return send(400, { error: { message: 'subscription mode needs a recurring price' } });
        if (form.submit_type && mode !== 'payment') return send(400, { error: { message: 'submit_type is only for payment mode' } });
        const id = `cs_test_mock${++n}`;
        const metadata = Object.fromEntries(
          Object.entries(form)
            .filter(([k]) => k.startsWith('metadata['))
            .map(([k, v]) => [k.slice(9, -1), v]),
        );
        const s = {
          id,
          object: 'checkout.session',
          mode,
          currency: 'chf',
          amount_total: amount,
          customer_email: form.customer_email ?? null,
          submit_type: form.submit_type ?? null,
          success_url: form.success_url,
          cancel_url: form.cancel_url,
          metadata,
          status: 'open',
          payment_status: 'unpaid',
          url: `${base}/pay/${id}`,
        };
        sessions.set(id, s);
        return send(200, s);
      }

      const get = url.pathname.match(/^\/v1\/checkout\/sessions\/([\w]+)$/);
      if (req.method === 'GET' && get) {
        const s = sessions.get(get[1]);
        return s ? send(200, s) : send(404, { error: { message: `No such checkout.session: ${get[1]}` } });
      }

      const pay = url.pathname.match(/^\/pay\/([\w]+)(\/complete)?$/);
      if (req.method === 'GET' && pay) {
        const s = sessions.get(pay[1]);
        if (!s) return send(404, 'Unknown session', { 'content-type': 'text/plain' });
        if (pay[2]) {
          s.status = 'complete';
          s.payment_status = 'paid';
          if (s.membership) await sendMembershipEvents(s);
          res.writeHead(303, { location: String(s.success_url).replace('{CHECKOUT_SESSION_ID}', s.id) });
          return res.end();
        }
        const what = s.membership
          ? `Membership ${s.price}${s.trial_end ? ` (first charge ${new Date(s.trial_end * 1000).toISOString().slice(0, 10)})` : ''}`
          : `CHF ${(s.amount_total / 100).toFixed(2)}${s.mode === 'subscription' ? ' every month' : ''}`;
        return send(
          200,
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mock Stripe Checkout</title><body><main><h1>Mock Stripe Checkout</h1><p data-mock-amount>${html(what)}</p><p><a href="/pay/${s.id}/complete">Pay</a></p><p><a href="${html(String(s.cancel_url))}">Back</a></p></main></body></html>`,
          { 'content-type': 'text/html; charset=utf-8' },
        );
      }
      if (req.method === 'GET' && url.pathname === '/portal') {
        const back = url.searchParams.get('return') ?? '/';
        return send(
          200,
          `<!doctype html><html lang="en"><meta charset="utf-8"><title>Mock Stripe billing portal</title><body><main><h1>Mock Stripe billing portal</h1><p>Payment method, invoices and the switch between quarterly and yearly live here in Stripe. Cancelling is off.</p><p><a href="${html(back)}">Back to ZurichJS</a></p></main></body></html>`,
          { 'content-type': 'text/html; charset=utf-8' },
        );
      }
      send(404, { error: { message: `Mock has no ${req.method} ${url.pathname}` } });
    });
  });

  /** Membership endpoints other than checkout sessions; null when the request is not one of them. */
  function membershipRoute(method, url, form) {
    if (method === 'GET' && url.pathname === '/v1/prices') {
      const key = url.searchParams.get('lookup_keys[0]') ?? '';
      const fee = MEMBER_FEES[key];
      return { status: 200, body: { data: fee ? [{ id: `price_mock_${key}`, lookup_key: key, unit_amount: fee }] : [] } };
    }
    if (method === 'POST' && url.pathname === '/v1/customers') return { status: 200, body: { id: `cus_mock_${uid()}`, email: form.email } };
    if (method === 'POST' && url.pathname === '/v1/billing_portal/sessions')
      return { status: 200, body: { url: `${base}/portal?return=${encodeURIComponent(form.return_url ?? '')}` } };
    if (method === 'GET' && url.pathname === '/v1/invoices') return { status: 200, body: { data: [] } };
    const sub = url.pathname.match(/^\/v1\/subscriptions\/([\w]+)$/);
    if (method === 'POST' && sub) return { status: 200, body: { id: sub[1], cancel_at_period_end: true, cancel_at: Math.floor(Date.now() / 1000) + 30 * 86_400 } };
    return null;
  }

  async function sendMembershipEvents(s) {
    const target = process.env.MOCK_STRIPE_WEBHOOK_URL;
    const secret = process.env.MOCK_STRIPE_WEBHOOK_SECRET;
    if (!target || !secret) return;
    const subscription = `sub_mock_${uid()}`;
    const key = String(s.price).replace('price_mock_', '');
    const now = Math.floor(Date.now() / 1000);
    const start = s.trial_end ?? now;
    const end = new Date(start * 1000);
    if (key.endsWith('_yearly')) end.setUTCFullYear(end.getUTCFullYear() + 1);
    else end.setUTCMonth(end.getUTCMonth() + 3);
    const events = [
      { type: 'checkout.session.completed', object: { id: s.id, mode: 'subscription', metadata: s.metadata, subscription, customer: s.customer } },
      {
        type: 'invoice.paid',
        object: {
          id: `in_mock_${uid()}`,
          // A trial (imported member) bills CHF 0 now; the real charge comes when the trial ends.
          amount_paid: s.trial_end ? 0 : (MEMBER_FEES[key] ?? 0),
          customer: s.customer,
          lines: { data: [{ period: { start: s.trial_end ? now : start, end: s.trial_end ? s.trial_end : Math.floor(end.getTime() / 1000) } }] },
          parent: { subscription_details: { subscription, metadata: s.subscription_metadata } },
        },
      },
    ];
    for (const e of events) {
      const payload = JSON.stringify({ id: `evt_mock_${uid()}`, type: e.type, data: { object: e.object } });
      const t = Math.floor(Date.now() / 1000);
      const sig = createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex');
      await fetch(target, { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}`, 'content-type': 'application/json' }, body: payload }).catch((err) =>
        console.error('[mock-stripe] webhook failed', err),
      );
    }
  }

  return new Promise((resolve) => {
    // MOCK_HOST=0.0.0.0 inside a container (docker-compose.yml); local runs stay on loopback.
    server.listen(port, process.env.MOCK_HOST ?? '127.0.0.1', () => {
      const address = server.address();
      base = `http://localhost:${typeof address === 'object' && address ? address.port : port}`;
      resolve({ url: base, sessions, requests, close: () => new Promise((r) => server.close(() => r(undefined))) });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { url } = await startMockStripe(Number(process.argv[2] ?? 4533));
  console.log(`Mock Stripe API on ${url} (STRIPE_API_BASE=${url}, any sk_test_ key)`);
}
