/**
 * The sponsorship flows through the API handlers, on the in-memory store, with Stripe,
 * Resend and Slack faked at fetch: the board invites a company → the contact signs the
 * agreement and pays by invoice → webhook (active, welcome) → upgrade now / downgrade at
 * renewal → the board proposes an end, the sponsor accepts → undo → Stripe ends it.
 * Plus a one-meetup card sponsorship, an imported sponsorship moving to card, logos,
 * and the safety checks.
 */
import { createHmac } from 'node:crypto';
import { AGREEMENT, memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAddSponsor, handleAdminSponsors } from '../src/pages/api/membership/admin/sponsors/index.ts';
import { handleAdminSponsor } from '../src/pages/api/membership/admin/sponsors/[id]/index.ts';
import { handleBoardEnd } from '../src/pages/api/membership/admin/sponsors/[id]/end.ts';
import { handleRecordPayment } from '../src/pages/api/membership/admin/sponsors/[id]/payment.ts';
import { handlePropose } from '../src/pages/api/membership/admin/sponsors/[id]/proposals/index.ts';
import { handleReviewLogo } from '../src/pages/api/membership/admin/sponsors/[id]/logos/[lid].ts';
import { handleUndoEnd } from '../src/pages/api/sponsorship/end/undo.ts';
import { handleEnd } from '../src/pages/api/sponsorship/end.ts';
import { handleLogoUpload } from '../src/pages/api/sponsorship/logo/index.ts';
import { handleSponsorMe } from '../src/pages/api/sponsorship/me.ts';
import { handlePlan } from '../src/pages/api/sponsorship/plan.ts';
import { handleProposal } from '../src/pages/api/sponsorship/proposals/[id].ts';
import { handleStart } from '../src/pages/api/sponsorship/start.ts';
import { handleSponsorWebhook } from '../src/pages/api/sponsorship/webhook.ts';
import { checkLogo, type LogoStore } from '../src/server/sponsor-logo.ts';
import { stripeAddress } from '../src/server/sponsor-stripe.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const WHSEC = 'whsec_sponsor_test';
const ADMIN = 'admin-password-for-tests';
const env = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_SPONSOR_PORTAL_CONFIG: 'bpc_s',
  STRIPE_SPONSORSHIP_WEBHOOK_SECRET: WHSEC,
  RESEND_API_KEY: 're_test',
  SLACK_SPONSORSHIP_CHANNEL_ID: 'CSPONSORS',
  BETTER_AUTH_URL: 'https://zurichjs.com',
  ADMIN_PASSWORD: ADMIN,
};
const grace = { id: 'user-grace', email: 'grace@acme.ch' };
const unix = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const MEETUPS = [{ id: 'event-dec', title: 'ZurichJS Meetup December', date: '2026-12-09' }];
const signer = { signerName: 'Grace Hopper', signerTitle: 'Head of DevRel', agreementVersion: AGREEMENT.version };

/** Stripe and Resend at fetch, keeping a little state like Stripe would. */
function world() {
  const calls: { method: string; path: string; params: URLSearchParams }[] = [];
  const emails: { to: string[]; subject: string; text: string }[] = [];
  const sub = { lookupKey: 'sponsor_friend_quarterly', schedule: null as string | null, plan: null as string | null };
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const method = init.method ?? 'GET';
    const params = new URLSearchParams(method === 'POST' ? String(init.body ?? '') : u.search);
    calls.push({ method, path, params });
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    const subscription = (id: string) => ({
      id,
      cancel_at: unix('2027-02-18T00:00:00Z'),
      metadata: { source: 'zurichjs.com/partners' },
      items: { data: [{ id: 'si_1', price: { id: `price_${sub.lookupKey}`, lookup_key: sub.lookupKey }, current_period_end: unix('2027-02-18T00:00:00Z') }] },
      schedule: sub.schedule
        ? params.has('expand[0]')
          ? { id: sub.schedule, metadata: { plan: sub.plan }, phases: [{ end_date: unix('2027-02-18T00:00:00Z') }] }
          : sub.schedule
        : null,
    });
    if (path === 'prices') return ok({ data: [{ id: `price_${params.get('lookup_keys[0]')}` }] });
    if (path === 'customers') return ok({ id: 'cus_acme' });
    if (path.startsWith('customers/')) return ok({ id: path.split('/')[1] });
    if (path === 'checkout/sessions') return ok({ id: 'cs_1', url: 'https://checkout.stripe.com/c/pay/cs_1' });
    if (path === 'billing_portal/sessions') return ok({ url: 'https://billing.stripe.com/p/session/1' });
    if (path === 'subscriptions' && method === 'GET') return ok({ data: [] });
    if (path === 'subscriptions') return ok({ id: 'sub_acme', latest_invoice: 'in_first' });
    if (path === 'invoices' && method === 'POST') return ok({ id: 'in_once', status: 'draft' });
    if (path === 'invoices') return ok({ data: [] });
    if (path === 'invoiceitems') return ok({ id: 'ii_1' });
    if (/^invoices\/in_\w+$/.test(path)) return ok({ id: path.split('/')[1], status: 'open' });
    if (/^invoices\/in_\w+\/(finalize|send)$/.test(path)) return ok({ id: path.split('/')[1], status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/acme' });
    if (path === 'subscription_schedules') {
      sub.schedule = 'sub_sched_1';
      return ok({ id: 'sub_sched_1', phases: [{ start_date: unix('2026-11-18T00:00:00Z'), end_date: unix('2027-02-18T00:00:00Z') }] });
    }
    if (path === 'subscription_schedules/sub_sched_1/release') {
      sub.schedule = null;
      sub.plan = null;
      return ok({ id: 'sub_sched_1' });
    }
    if (path === 'subscription_schedules/sub_sched_1') {
      if (method === 'POST') sub.plan = params.get('metadata[plan]');
      return ok({ id: 'sub_sched_1', phases: [{ start_date: unix('2026-11-18T00:00:00Z'), end_date: unix('2027-02-18T00:00:00Z') }] });
    }
    if (path.startsWith('subscriptions/')) {
      if (method === 'POST' && params.get('items[0][price]')) sub.lookupKey = params.get('items[0][price]')!.replace('price_', '');
      return ok(subscription(path.split('/')[1]!));
    }
    throw new Error(`unexpected ${method} ${url}`);
  }) as unknown as typeof fetch;
  const slackPosts: string[] = [];
  const slack: MembershipSlack = {
    post: async (text) => {
      slackPosts.push(text);
      return '1';
    },
    update: async () => undefined,
    reply: async () => undefined,
    ephemeral: async () => undefined,
  };
  const blobs = new Map<string, ArrayBuffer>();
  const logos: LogoStore = { set: async (k, d) => void blobs.set(k, d), get: async (k) => blobs.get(k) ?? null };
  return { f, calls, emails, slack, slackPosts, sub, logos, blobs };
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://zurichjs.com${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://zurichjs.com', ...headers },
    body: JSON.stringify(body),
  });
const asAdmin = (path: string, body?: unknown) =>
  body === undefined ? new Request(`https://zurichjs.com${path}`, { headers: { authorization: `Bearer ${ADMIN}` } }) : post(path, body, { authorization: `Bearer ${ADMIN}` });

function stripeEvent(id: string, type: string, object: unknown) {
  const payload = JSON.stringify({ id, type, data: { object } });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', WHSEC).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/sponsorship/webhook', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
}

const paidInvoice = (id: string, sponsorId: string, start: string, end: string) => ({
  id,
  amount_paid: 84000,
  lines: { data: [{ period: { start: unix(start), end: unix(end) } }] },
  parent: { subscription_details: { subscription: 'sub_acme', metadata: { source: 'zurichjs.com/partners', sponsorId } } },
});

describe('sponsorship flow', () => {
  let store: SponsorStore;
  let w: ReturnType<typeof world>;
  const deps = () => ({
    env,
    store,
    fetch: w.f,
    slack: w.slack,
    logos: w.logos,
    meetups: async () => MEETUPS,
    session: async () => grace,
    now: () => new Date('2026-11-18T10:00:00Z'),
  });
  const adminDeps = () => ({ env, store, fetch: w.f, slack: w.slack, logos: w.logos, meetups: async () => MEETUPS, now: Date.parse('2026-11-18T10:00:00Z') });
  const webhook = (req: Request) => handleSponsorWebhook(req, { env, store, fetch: w.f, slack: w.slack });
  const me = async () => (await handleSponsorMe(new Request('https://zurichjs.com/api/sponsorship/me'), deps())).json();

  beforeEach(() => {
    store = memoryStore({ now: () => new Date('2026-11-18T10:00:00Z') });
    w = world();
    resetRateLimits();
  });

  it('invite → sign and pay by invoice → paid → upgrade now → downgrade at renewal → proposed end accepted → undo → ended', async () => {
    // The board invites Acme to Community Friend, quarterly.
    const added = await handleAddSponsor(
      asAdmin('/api/membership/admin/sponsors', {
        mode: 'invite',
        companyName: 'Acme',
        contactName: 'Grace Hopper',
        contactEmail: 'Grace@Acme.ch',
        tier: 'friend',
        cycle: 'quarterly',
        message: 'As discussed.',
      }),
      adminDeps(),
    );
    expect(added.status).toBe(200);
    const { sponsor } = (await added.json()) as { sponsor: { id: string; status: string } };
    expect(sponsor.status).toBe('pending');
    expect(w.emails.at(-1)).toMatchObject({ to: ['grace@acme.ch'], subject: 'Your ZurichJS sponsorship: Community Friend' });
    expect(w.emails.at(-1)!.text).toContain('As discussed.');

    // Grace signs in: her contact is linked, she sees the invitation.
    const view = (await me()) as { sponsor: { status: string; feeLabel: string }; contact: { hasAccount: boolean } };
    expect(view.sponsor).toMatchObject({ status: 'pending', feeLabel: 'CHF 840 a quarter' });
    expect(view.contact.hasAccount).toBe(true);

    // An invoice needs a billing address.
    const noAddress = await handleStart(post('/api/sponsorship/start', { ...signer, paymentMode: 'invoice' }), deps());
    expect(noAddress.status).toBe(400);
    expect(await noAddress.json()).toMatchObject({ field: 'billingAddress' });
    // An old agreement version is refused.
    expect((await handleStart(post('/api/sponsorship/start', { ...signer, agreementVersion: '2020-01-01', paymentMode: 'invoice' }), deps())).status).toBe(400);

    const started = await handleStart(
      post('/api/sponsorship/start', {
        ...signer,
        paymentMode: 'invoice',
        legalName: 'Acme Switzerland AG',
        billingAddress: 'Hardstrasse 1\n8005 Zürich',
        vatId: 'CHE-123.456.789 MWST',
      }),
      deps(),
    );
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ checkoutUrl: null, invoiceUrl: 'https://invoice.stripe.com/i/acme' });
    const subCall = w.calls.find((c) => c.method === 'POST' && c.path === 'subscriptions')!;
    expect(subCall.params.get('collection_method')).toBe('send_invoice');
    expect(subCall.params.get('days_until_due')).toBe('30');
    expect(subCall.params.get('items[0][price]')).toBe('price_sponsor_friend_quarterly');
    const customer = w.calls.find((c) => c.path === 'customers')!;
    expect(customer.params.get('name')).toBe('Acme Switzerland AG');
    expect(customer.params.get('address[postal_code]')).toBe('8005');
    expect(customer.params.get('invoice_settings[custom_fields][0][value]')).toBe('CHE-123.456.789 MWST');
    expect(w.calls.some((c) => c.path === 'invoices/in_first/send')).toBe(true);
    expect((await store.agreements(sponsor.id))[0]).toMatchObject({ signerName: 'Grace Hopper', context: 'start', summary: 'Community Friend, quarterly, by invoice' });
    expect(w.emails.at(-1)!.subject).toBe('Sponsorship agreement accepted: Acme');

    // The invoice is paid: active, paid until the term end, welcome email.
    expect((await webhook(stripeEvent('evt_1', 'invoice.paid', paidInvoice('in_first', sponsor.id, '2026-11-18T00:00:00Z', '2027-02-18T00:00:00Z')))).status).toBe(200);
    let s = (await store.get(sponsor.id))!;
    expect(s).toMatchObject({ status: 'active', paidUntil: '2027-02-18', startedAt: '2026-11-18', stripeSubscriptionId: 'sub_acme' });
    const welcome = w.emails.find((e) => e.subject === 'Welcome, Acme: your ZurichJS sponsorship is active')!;
    expect(welcome.to).toEqual(['grace@acme.ch']);
    expect(welcome.text).toContain('One thing we still need: your logo');
    expect(w.emails.at(-1)).toMatchObject({ to: ['hello@zurichjs.com'], subject: 'New sponsor: Acme' });
    // The same event again changes nothing.
    expect(await (await webhook(stripeEvent('evt_1', 'invoice.paid', {}))).json()).toMatchObject({ duplicate: true });

    // Upgrade on the same cycle: now, prorated.
    const up = await handlePlan(post('/api/sponsorship/plan', { ...signer, tier: 'builder', cycle: 'quarterly' }), deps());
    expect(await up.json()).toMatchObject({ timing: 'now', sponsor: { tier: 'builder' } });
    const upgrade = w.calls.find((c) => c.path === 'subscriptions/sub_acme' && c.params.get('proration_behavior') === 'always_invoice')!;
    expect(upgrade.params.get('items[0][price]')).toBe('price_sponsor_builder_quarterly');
    expect(w.emails.at(-1)!.subject).toBe('Your sponsorship is now Community Builder');

    // Downgrade: from the renewal; the page shows it waiting.
    const down = await handlePlan(post('/api/sponsorship/plan', { ...signer, tier: 'supporter', cycle: 'yearly' }), deps());
    expect(await down.json()).toMatchObject({ timing: 'renewal', from: '2027-02-18', sponsor: { tier: 'builder' } });
    expect(w.sub.plan).toBe('sponsor_supporter_yearly');
    expect(((await me()) as { pendingChange: unknown }).pendingChange).toEqual({ tier: 'supporter', cycle: 'yearly', from: '2027-02-18' });
    // Keeping the current plan drops it.
    expect(await (await handlePlan(post('/api/sponsorship/plan', { tier: 'builder', cycle: 'quarterly' }), deps())).json()).toMatchObject({ timing: 'none' });
    expect(w.sub.schedule).toBeNull();

    // The board proposes to end, as agreed on a call; nothing changes until Grace accepts.
    const proposed = await handlePropose(
      asAdmin(`/api/membership/admin/sponsors/${sponsor.id}/proposals`, { kind: 'end', message: 'As agreed on our call.' }),
      sponsor.id,
      adminDeps(),
    );
    const { proposal } = (await proposed.json()) as { proposal: { id: string } };
    expect(w.emails.at(-1)!.subject).toBe('Please confirm: a change to your ZurichJS sponsorship');
    expect(w.emails.at(-1)!.text).toContain('end the Community Builder sponsorship after 17th February 2027');
    expect((await store.get(sponsor.id))!.status).toBe('active');
    expect(((await me()) as { proposals: unknown[] }).proposals).toHaveLength(1);
    // A second proposal waits for the first.
    expect(
      (await handlePropose(asAdmin(`/api/membership/admin/sponsors/${sponsor.id}/proposals`, { kind: 'plan', tier: 'champion', cycle: 'quarterly' }), sponsor.id, adminDeps()))
        .status,
    ).toBe(409);

    const accepted = await handleProposal(post(`/api/sponsorship/proposals/${proposal.id}`, { decision: 'accept', ...signer }), proposal.id, deps());
    expect(await accepted.json()).toMatchObject({ sponsor: { status: 'ending', lastDay: '2027-02-17' } });
    expect(w.calls.some((c) => c.path === 'subscriptions/sub_acme' && c.params.get('cancel_at_period_end') === 'true')).toBe(true);
    expect((await store.getProposal(proposal.id))!.status).toBe('accepted');
    expect((await store.agreements(sponsor.id))[0]!.context).toBe('proposal');
    expect(w.emails.some((e) => e.subject === 'Your ZurichJS sponsorship ends on 17th February 2027')).toBe(true);
    expect(w.emails.some((e) => e.to[0] === 'hello@zurichjs.com' && e.subject === 'Proposal accepted: Acme')).toBe(true);
    // Answering twice is refused.
    expect((await handleProposal(post(`/api/sponsorship/proposals/${proposal.id}`, { decision: 'decline' }), proposal.id, deps())).status).toBe(409);

    // Grace changes her mind before the end.
    expect(await (await handleUndoEnd(post('/api/sponsorship/end/undo', {}), deps())).json()).toMatchObject({ sponsor: { status: 'active' } });
    expect(w.calls.some((c) => c.path === 'subscriptions/sub_acme' && c.params.get('cancel_at_period_end') === 'false')).toBe(true);

    // Ending it herself, then Stripe ends the subscription at the period end.
    expect(await (await handleEnd(post('/api/sponsorship/end', signer), deps())).json()).toMatchObject({ sponsor: { status: 'ending' } });
    await webhook(stripeEvent('evt_2', 'customer.subscription.deleted', { id: 'sub_acme', metadata: { source: 'zurichjs.com/partners', sponsorId: sponsor.id } }));
    s = (await store.get(sponsor.id))!;
    expect(s).toMatchObject({ status: 'ended', endedReason: 'cancelled' });
    expect(w.emails.at(-1)!.subject).toBe('Your ZurichJS sponsorship has ended');

    // The board sees the full history.
    const detail = (await (await handleAdminSponsor(asAdmin(`/api/membership/admin/sponsors/${sponsor.id}`), sponsor.id, adminDeps())).json()) as {
      events: { type: string }[];
      agreements: unknown[];
    };
    expect(detail.agreements.length).toBeGreaterThanOrEqual(4);
    expect(detail.events.map((e) => e.type)).toContain('proposal_accepted');
  });

  it('a scheduled change takes effect at the renewal, and a failed renewal marks it past due', async () => {
    const { sponsor } = await store.create(
      { ...base(), status: 'pending', paymentMode: 'card' },
      { email: 'grace@acme.ch', name: 'Grace Hopper', role: 'primary' },
      { kind: 'board', id: 'admin' },
    );
    await store.linkStripe(sponsor.id, { subscriptionId: 'sub_acme', customerId: 'cus_acme' }, { kind: 'stripe', id: 'x' });
    await store.transition(sponsor.id, { to: 'active', actor: { kind: 'board', id: 'admin' } });
    await webhook(
      stripeEvent('evt_u', 'customer.subscription.updated', {
        id: 'sub_acme',
        status: 'active',
        metadata: { source: 'zurichjs.com/partners', sponsorId: sponsor.id },
        items: { data: [{ price: { lookup_key: 'sponsor_supporter_yearly' } }] },
      }),
    );
    expect(await store.get(sponsor.id)).toMatchObject({ tier: 'supporter', cycle: 'yearly' });
    expect(w.emails.at(-1)!.subject).toBe('Your sponsorship is now Community Supporter');

    await webhook(
      stripeEvent('evt_f', 'invoice.payment_failed', {
        id: 'in_2',
        attempt_count: 1,
        next_payment_attempt: unix('2026-11-21T00:00:00Z'),
        hosted_invoice_url: 'https://invoice.stripe.com/i/2',
        parent: { subscription_details: { subscription: 'sub_acme', metadata: { source: 'zurichjs.com/partners', sponsorId: sponsor.id } } },
      }),
    );
    expect((await store.get(sponsor.id))!.status).toBe('past_due');
    expect(w.emails.at(-1)).toMatchObject({ subject: 'Payment problem: Acme sponsorship' });
    expect(w.emails.at(-1)!.text).toContain('Stripe tries the card again on 21st November 2026.');
  });

  it('starts a one-meetup sponsorship by card, from scratch', async () => {
    const r = await handleStart(
      post('/api/sponsorship/start', { ...signer, companyName: 'Initech', tier: 'champion', cycle: 'once', eventId: 'event-dec', paymentMode: 'card' }),
      deps(),
    );
    expect(await r.json()).toMatchObject({ checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_1', sponsor: { status: 'pending', meetup: { title: 'ZurichJS Meetup December' } } });
    const checkout = w.calls.find((c) => c.path === 'checkout/sessions')!;
    expect(checkout.params.get('mode')).toBe('payment');
    expect(checkout.params.get('line_items[0][price]')).toBe('price_sponsor_champion_once');
    const s = (await store.search({ q: 'initech' }))[0]!;
    expect((await store.contacts(s.id))[0]).toMatchObject({ email: 'grace@acme.ch', role: 'primary', userId: 'user-grace' });

    await webhook(stripeEvent('evt_c', 'checkout.session.completed', { mode: 'payment', payment_status: 'paid', metadata: { source: 'zurichjs.com/partners', sponsorId: s.id } }));
    expect(await store.get(s.id)).toMatchObject({ status: 'active', paidUntil: '2026-12-10' });
    expect(w.emails.some((e) => e.subject === 'Welcome, Initech: your ZurichJS sponsorship is active')).toBe(true);
    // The receipt invoice for the same payment changes nothing more.
    const sent = w.emails.length;
    await webhook(stripeEvent('evt_ci', 'invoice.paid', { id: 'in_c', amount_paid: 100000, metadata: { source: 'zurichjs.com/partners', sponsorId: s.id } }));
    expect(w.emails.length).toBe(sent);
    // A one-meetup sponsorship cannot be changed or ended.
    expect((await handlePlan(post('/api/sponsorship/plan', { ...signer, tier: 'friend', cycle: 'monthly' }), deps())).status).toBe(409);
    expect((await handleEnd(post('/api/sponsorship/end', signer), deps())).status).toBe(409);
    // A meetup that is not upcoming is refused.
    store = memoryStore();
    expect(
      await (
        await handleStart(post('/api/sponsorship/start', { ...signer, companyName: 'X', tier: 'friend', cycle: 'once', eventId: 'nope', paymentMode: 'card' }), deps())
      ).json(),
    ).toMatchObject({
      field: 'eventId',
    });
  });

  it('imports an existing sponsorship paid directly, which later moves to card without paying twice', async () => {
    const r = await handleAddSponsor(
      asAdmin('/api/membership/admin/sponsors', {
        mode: 'import',
        companyName: 'Globex',
        contactName: 'Grace Hopper',
        contactEmail: 'grace@acme.ch',
        tier: 'builder',
        cycle: 'yearly',
        paidUntil: '2027-04-01',
        startedAt: '2026-04-01',
      }),
      adminDeps(),
    );
    const { sponsor } = (await r.json()) as { sponsor: { id: string; status: string; paymentMode: string } };
    expect(sponsor).toMatchObject({ status: 'active', paymentMode: 'manual' });
    expect(w.emails.at(-1)!.subject).toBe('Your ZurichJS sponsorship is now online');
    expect(w.emails.at(-1)!.text).toContain('Paid through: 31st March 2027');

    const started = await handleStart(post('/api/sponsorship/start', { ...signer, paymentMode: 'card' }), deps());
    expect(await started.json()).toMatchObject({ checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_1' });
    const checkout = w.calls.find((c) => c.path === 'checkout/sessions')!;
    expect(checkout.params.get('subscription_data[trial_end]')).toBe(String(unix('2027-04-01T00:00:00Z')));
    await webhook(
      stripeEvent('evt_m', 'checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_globex',
        metadata: { source: 'zurichjs.com/partners', sponsorId: sponsor.id },
      }),
    );
    expect(await store.get(sponsor.id)).toMatchObject({ status: 'active', paymentMode: 'card', stripeSubscriptionId: 'sub_globex', paidUntil: '2027-04-01' });

    // The board records a payment made directly for another sponsorship.
    const other = await store.create({ ...base(), companyName: 'Hooli' }, { email: 'g@hooli.com', name: 'Gavin', role: 'primary' }, { kind: 'board', id: 'admin' });
    const paid = await handleRecordPayment(asAdmin(`/api/membership/admin/sponsors/${other.sponsor.id}/payment`, { paidUntil: '2027-01-01' }), other.sponsor.id, adminDeps());
    expect(await paid.json()).toMatchObject({ sponsor: { status: 'active', paymentMode: 'manual', paidUntil: '2027-01-01' } });
    expect(
      await (await handleBoardEnd(asAdmin(`/api/membership/admin/sponsors/${other.sponsor.id}/end`, { reason: 'terminated' }), other.sponsor.id, adminDeps())).json(),
    ).toMatchObject({
      sponsor: { status: 'ended', endedReason: 'terminated' },
    });
  });

  it('takes a logo, refuses unsafe SVGs, and emails the review', async () => {
    const { sponsor } = await store.create(base(), { email: 'grace@acme.ch', name: 'Grace Hopper', role: 'primary' }, { kind: 'board', id: 'admin' });
    const upload = (bytes: Uint8Array, name: string) => {
      const form = new FormData();
      form.set('file', new File([bytes as Uint8Array<ArrayBuffer>], name));
      return handleLogoUpload(new Request('https://zurichjs.com/api/sponsorship/logo', { method: 'POST', body: form }), deps());
    };
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
    const ok = await upload(svg, 'acme.svg');
    const { logo } = (await ok.json()) as { logo: { id: string; review: string } };
    expect(logo.review).toBe('pending');
    expect(w.blobs.size).toBe(1);
    expect(w.slackPosts.at(-1)).toContain('uploaded a logo');

    expect(await (await upload(new TextEncoder().encode('<svg onload="alert(1)"></svg>'), 'x.svg')).json()).toMatchObject({ field: 'file' });
    expect(await (await upload(new TextEncoder().encode('<html>hi</html>'), 'x.png')).json()).toMatchObject({ error: 'Upload the logo as SVG, PNG or WebP.' });

    expect(
      (await handleReviewLogo(asAdmin(`/api/membership/admin/sponsors/${sponsor.id}/logos/${logo.id}`, { review: 'rejected' }), sponsor.id, logo.id, adminDeps())).status,
    ).toBe(400);
    const reviewed = await handleReviewLogo(
      asAdmin(`/api/membership/admin/sponsors/${sponsor.id}/logos/${logo.id}`, { review: 'rejected', note: 'Please send the dark version.' }),
      sponsor.id,
      logo.id,
      adminDeps(),
    );
    expect(await reviewed.json()).toMatchObject({ logo: { review: 'rejected' } });
    expect(w.emails.at(-1)).toMatchObject({ subject: 'We need another logo file' });
  });

  it('guards the admin API, the webhook and other sponsors’ proposals', async () => {
    expect((await handleAdminSponsors(new Request('https://zurichjs.com/api/membership/admin/sponsors'), adminDeps())).status).toBe(401);
    expect((await handleAddSponsor(post('/api/membership/admin/sponsors', {}, { authorization: `Bearer ${ADMIN}`, origin: 'https://evil.example' }), adminDeps())).status).toBe(
      403,
    );
    const bad = new Request('https://zurichjs.com/api/sponsorship/webhook', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=00' }, body: '{}' });
    expect((await webhook(bad)).status).toBe(400);

    const mine = await store.create(base(), { email: 'grace@acme.ch', name: 'Grace', role: 'primary' }, { kind: 'board', id: 'admin' });
    const theirs = await store.create({ ...base(), companyName: 'Other' }, { email: 'x@other.ch', name: 'X', role: 'primary' }, { kind: 'board', id: 'admin' });
    const p = await store.propose(theirs.sponsor.id, { kind: 'end', tier: null, cycle: null, message: null, expiresAt: '2026-12-02T00:00:00Z' }, { kind: 'board', id: 'admin' });
    expect(mine.sponsor.id).not.toBe(theirs.sponsor.id);
    expect((await handleProposal(post(`/api/sponsorship/proposals/${p.id}`, { decision: 'decline' }), p.id, deps())).status).toBe(404);
    // Not signed in.
    expect((await handleSponsorMe(new Request('https://zurichjs.com/api/sponsorship/me'), { ...deps(), session: async () => null })).status).toBe(401);
  });
});

describe('helpers', () => {
  it('reads a written billing address into Stripe’s fields', () => {
    expect(stripeAddress('Acme AG\nHardstrasse 1\nCH-8005 Zürich\nSwitzerland')).toEqual({
      line1: 'Acme AG',
      line2: 'Hardstrasse 1',
      postal_code: '8005',
      city: 'Zürich',
      country: 'CH',
    });
    expect(stripeAddress('1 Main Street\nLondon SW1')).toEqual({ line1: '1 Main Street', line2: 'London SW1' });
    expect(stripeAddress('')).toBeUndefined();
  });
  it('recognises logos by content', () => {
    expect(checkLogo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toEqual({ ok: true, type: 'image/png' });
    expect(checkLogo(new TextEncoder().encode('<?xml version="1.0"?>\n<svg><a href="https://evil"/></svg>'))).toMatchObject({ ok: false });
    expect(checkLogo(new TextEncoder().encode('<svg><use href="#a"/></svg>'))).toEqual({ ok: true, type: 'image/svg+xml' });
  });
});

function base() {
  return {
    companyName: 'Acme',
    legalName: null,
    billingAddress: null,
    vatId: null,
    website: null,
    tier: 'friend' as const,
    cycle: 'quarterly' as const,
    paymentMode: 'invoice' as const,
    status: 'pending' as const,
    source: 'invited' as const,
    startedAt: null,
    paidUntil: null,
    eventId: null,
    eventTitle: null,
    eventDate: null,
    notes: null,
  };
}
