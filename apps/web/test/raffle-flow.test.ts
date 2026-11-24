/**
 * Raffle add-ons through the API handlers and the one Stripe webhook, on in-memory stores, with
 * Stripe and Slack faked at fetch: eligibility per sponsorship status, the raffle terms gate, the
 * offer and its frozen quote, acceptance, the payment link, the payment (which never touches the
 * sponsorship), late and mismatched payments, gift accounting, in-kind prizes and refunds.
 */
import { createHmac } from 'node:crypto';
import { memoryStore as memoryMembers } from '@zurichjs/membership';
import { memoryRaffleStore, type RaffleStore } from '@zurichjs/raffle';
import { memoryFeeStore, memoryStore, type FeeStore, type NewSponsor, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAdminRaffle } from '../src/pages/api/membership/admin/raffles/[id]/index.ts';
import { handleAdminRaffles } from '../src/pages/api/membership/admin/raffles/index.ts';
import { handleRaffleAnswer } from '../src/pages/api/sponsorship/raffles/[id]/index.ts';
import { handleRaffles } from '../src/pages/api/sponsorship/raffles/index.ts';
import { handleStripeWebhook } from '../src/pages/api/stripe/webhook.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const WHSEC = 'whsec_raffle_test';
const ADMIN = 'admin-password-for-tests';
const base: Record<string, string> = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_WEBHOOK_SECRET: WHSEC,
  BETTER_AUTH_URL: 'https://zurichjs.com',
  ADMIN_PASSWORD: ADMIN,
  SLACK_SPONSORSHIP_CHANNEL_ID: 'C1',
};
const gated: Record<string, string> = {
  ...base,
  RAFFLE_TERMS_VERSION: 'raffle-2026-12',
  RAFFLE_TERMS_URL: 'https://zurichjs.com/partners/raffle-terms',
  SPONSOR_FEE_POLICY_VERSION: 'surcharge-2026-12',
};
const NOW = new Date('2026-11-24T10:00:00Z');
const MEETUPS = [{ id: 'event-dec', title: 'ZurichJS Meetup December', date: '2026-12-09' }];
const ana = { id: 'user-ana', email: 'ana@acme.ch' };
const board = { kind: 'board', id: 'admin' } as const;

const sponsorRow = (over: Partial<NewSponsor> = {}): NewSponsor => ({
  companyName: 'Acme',
  legalName: null,
  billingAddress: null,
  vatId: null,
  website: null,
  tier: 'builder',
  cycle: 'yearly',
  paymentMode: 'card',
  status: 'active',
  source: 'invited',
  startedAt: '2026-11-01',
  paidUntil: '2027-11-01',
  pricePerMeetup: null,
  notes: null,
  ...over,
});

function stripeFake() {
  const calls: { method: string; path: string; params: URLSearchParams }[] = [];
  let links = 0;
  const f = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const path = u.pathname.replace('/v1/', '');
    const method = init.method ?? 'GET';
    const params = new URLSearchParams(String(init.body ?? ''));
    calls.push({ method, path, params });
    const ok = (b: unknown) => new Response(JSON.stringify(b));
    if (path === 'prices') return ok({ id: `price_${calls.length}` });
    if (path === 'payment_links') return ok({ id: `plink_r${++links}`, url: `https://buy.stripe.com/raffle_${links}` });
    if (path.startsWith('payment_links/')) return ok({ active: false });
    throw new Error(`unexpected ${method} ${url}`);
  }) as unknown as typeof fetch;
  return { f, calls };
}

const post = (body: unknown, admin = false) =>
  new Request('https://zurichjs.com/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://zurichjs.com', ...(admin ? { authorization: `Bearer ${ADMIN}` } : {}) },
    body: JSON.stringify(body),
  });

function stripeEvent(id: string, object: unknown) {
  const payload = JSON.stringify({ id, type: 'checkout.session.completed', data: { object } });
  const t = Math.floor(NOW.getTime() / 1000);
  const sig = createHmac('sha256', WHSEC).update(`${t}.${payload}`).digest('hex');
  return new Request('https://zurichjs.com/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${sig}` }, body: payload });
}

describe('raffle add-ons', () => {
  let sponsors: SponsorStore;
  let raffles: RaffleStore;
  let fees: FeeStore;
  let stripe: ReturnType<typeof stripeFake>;
  let slack: string[];
  const slackFake: MembershipSlack = { post: async (t) => (slack.push(t), '1'), update: async () => undefined, reply: async () => undefined, ephemeral: async () => undefined };
  const sponsorDeps = (env: Record<string, string> = gated, user = ana) => ({
    env,
    store: sponsors,
    raffles,
    fees,
    fetch: stripe.f,
    slack: slackFake,
    meetups: async () => MEETUPS,
    session: async () => user,
    now: () => NOW,
  });
  const adminDeps = (env: Record<string, string> = gated) => ({
    env,
    store: sponsors,
    raffles,
    fees,
    fetch: stripe.f,
    slack: slackFake,
    meetups: async () => MEETUPS,
    now: NOW.getTime(),
  });
  const list = async (env = gated, user = ana) => (await (await handleRaffles(new Request('https://zurichjs.com/x'), sponsorDeps(env, user))).json()) as Record<string, any>;
  const propose = (body: Record<string, unknown> = {}, env = gated, user = ana) =>
    handleRaffles(post({ eventId: 'event-dec', prize: 'Mechanical keyboard', quantity: 1, budgetChf: 500, fulfilment: 'zurichjs', ...body }), sponsorDeps(env, user));
  const act = async (id: string, body: unknown, env = gated) => handleAdminRaffle(post(body, true), id, adminDeps(env));
  const webhook = (req: Request) =>
    handleStripeWebhook(req, {
      env: gated,
      sponsorStore: sponsors,
      raffles,
      fees,
      memberStore: memoryMembers({ now: () => NOW }),
      fetch: stripe.f,
      slack: slackFake,
      now: NOW.getTime(),
    });

  beforeEach(async () => {
    sponsors = memoryStore({ now: () => NOW });
    raffles = memoryRaffleStore({ now: () => NOW });
    fees = memoryFeeStore({ now: () => NOW });
    stripe = stripeFake();
    slack = [];
    resetRateLimits();
    await fees.addTariff({ version: 'stripe-ch-2026-12', method: 'card', currency: 'chf', ratePpm: 29_000, fixedMinor: 30, note: null, enteredBy: 'board' });
  });

  it('lets only an active or ending-within-term sponsor propose, checked on the server', async () => {
    for (const [status, extra] of [
      ['pending', {}],
      ['past_due', {}],
    ] as const) {
      const { sponsor: s } = await sponsors.create(sponsorRow({ status }), { email: `${status}@x.ch`, name: 'X', role: 'primary' }, board);
      const user = { id: `u-${status}`, email: `${status}@x.ch` };
      const r = await propose(extra, gated, user);
      expect(r.status).toBe(409);
      expect((await list(gated, user)).eligible).toBe(false);
      expect(await raffles.bySponsor(s.id)).toEqual([]);
    }
    const { sponsor: ended } = await sponsors.create(sponsorRow(), { email: 'ended@x.ch', name: 'E', role: 'primary' }, board);
    await sponsors.transition(ended.id, { to: 'ended', actor: board, reason: 'terminated' });
    expect((await propose({}, gated, { id: 'u-e', email: 'ended@x.ch' })).status).toBe(409);
    const { sponsor: ending } = await sponsors.create(sponsorRow(), { email: 'ending@x.ch', name: 'G', role: 'primary' }, board);
    await sponsors.transition(ending.id, { to: 'ending', actor: board, endsAt: '2026-12-31' });
    expect((await propose({}, gated, { id: 'u-g', email: 'ending@x.ch' })).status).toBe(200);
  });

  it('proposes, offers with a frozen quote under approved terms, accepts, pays apart from the sponsorship, and accounts for the gift', async () => {
    const { sponsor: s } = await sponsors.create(sponsorRow(), { email: ana.email, name: 'Ana', role: 'primary' }, board);
    // A proposal waits as a draft even before the raffle terms are approved.
    const proposed = (await (await propose({}, base)).json()) as Record<string, any>;
    expect(proposed.raffle).toMatchObject({ stage: 'proposed', budget: 'CHF 500.00', payUrl: null });
    expect(slack.at(-1)).toContain('proposed a raffle');
    expect((await propose({ prize: 'x' })).status).toBe(400);
    expect((await propose({ eventId: 'event-past' })).status).toBe(400);
    const id = proposed.raffle.id as string;

    // No offer without the owner's raffle terms.
    const closed = await act(id, { action: 'offer', amountChf: '500', feeChoice: 'pass_through' }, base);
    expect(closed.status).toBe(409);
    expect(((await closed.json()) as { error: string }).error).toMatch(/raffle terms are not approved/);
    // "Sponsor covers the fees" needs the fee policy as well.
    expect((await act(id, { action: 'offer', amountChf: '500', feeChoice: 'pass_through' }, { ...gated, SPONSOR_FEE_POLICY_VERSION: '' })).status).toBe(409);
    const offered = (await (await act(id, { action: 'offer', amountChf: '500', feeChoice: 'pass_through' })).json()) as Record<string, any>;
    // (50'000 + 30) / 0.971 = 51'524.2… → 51'525
    expect(offered.raffle).toMatchObject({
      stage: 'offered',
      amount: 'CHF 500.00',
      termsVersion: 'raffle-2026-12',
      quote: { base: 'CHF 500.00', surcharge: 'CHF 15.25', total: 'CHF 515.25' },
    });

    // Accepting needs the box, the offer's terms version and an eligible sponsorship.
    const answer = (body: unknown, user = ana) => handleRaffleAnswer(post(body), id, sponsorDeps(gated, user));
    expect((await answer({ action: 'accept', termsVersion: 'raffle-2026-12' })).status).toBe(400);
    expect((await answer({ action: 'accept', termsVersion: 'raffle-old', confirm: true })).status).toBe(409);
    const accepted = (await (await answer({ action: 'accept', termsVersion: 'raffle-2026-12', confirm: true })).json()) as Record<string, any>;
    expect(accepted.raffle).toMatchObject({ accepted: true, payUrl: 'https://buy.stripe.com/raffle_1' });
    const link = stripe.calls.find((c) => c.path === 'payment_links')!;
    expect(link.params.get('metadata[source]')).toBe('zurichjs.com/partners/raffle');
    expect(link.params.get('metadata[raffleId]')).toBe(id);
    expect(link.params.get('line_items[1][quantity]')).toBe('1');
    expect(link.params.get('restrictions[completed_sessions][limit]')).toBe('1');
    // Another sponsor cannot see or answer it.
    const { sponsor: other } = await sponsors.create(sponsorRow({ companyName: 'Bolt' }), { email: 'bea@bolt.ch', name: 'Bea', role: 'primary' }, board);
    expect((await answer({ action: 'accept', termsVersion: 'raffle-2026-12', confirm: true }, { id: 'u-bea', email: 'bea@bolt.ch' })).status).toBe(404);
    expect((await list(gated, { id: 'u-bea', email: 'bea@bolt.ch' })).raffles).toEqual([]);
    expect(other.id).not.toBe(s.id);

    // The payment arrives on the one webhook. The sponsorship is untouched.
    const before = await sponsors.get(s.id);
    const eventsBefore = (await sponsors.events(s.id)).length;
    const paid = {
      id: 'cs_r1',
      mode: 'payment',
      payment_status: 'paid',
      amount_total: 51_525,
      payment_link: 'plink_r1',
      metadata: { source: 'zurichjs.com/partners/raffle', raffleId: id, sponsorId: s.id, quoteId: offered.raffle.quote.id },
    };
    expect((await webhook(stripeEvent('evt_r1', paid))).status).toBe(200);
    expect(await sponsors.get(s.id)).toEqual(before);
    expect((await sponsors.events(s.id)).length).toBe(eventsBefore);
    let r = (await raffles.get(id))!;
    expect(r).toMatchObject({ funding: 'paid', flags: [], paymentLinkId: null });
    expect(await fees.quote(offered.raffle.quote.id)).toMatchObject({ status: 'paid', stripeRef: 'cs_r1' });
    expect(stripe.calls.some((c) => c.path === 'payment_links/plink_r1' && c.params.get('active') === 'false')).toBe(true);
    // Twice is once.
    await webhook(stripeEvent('evt_r1', paid));
    expect((await raffles.ledger(id)).filter((e) => e.kind === 'payment')).toHaveLength(1);
    // Slack got company and meetup only.
    expect(slack.join('\n')).not.toMatch(/@/);

    // Gift accounting: not ready without a prize purchase; underspend shown for the board to decide.
    expect((await act(id, { action: 'ready' })).status).toBe(409);
    expect((await act(id, { action: 'ledger', kind: 'prize_purchase', amountChf: '420.50', note: 'Keyboard, receipt 4471', reference: '4471' })).status).toBe(200);
    const ready = (await (await act(id, { action: 'ready' })).json()) as Record<string, any>;
    expect(ready.raffle).toMatchObject({ stage: 'ready', settlement: { state: 'underspend', spentLabel: 'CHF 420.50', differenceLabel: 'CHF 79.50' } });

    // Cancelled with money in: flagged for a refund decision; nothing refunded by itself.
    expect((await act(id, { action: 'cancel' })).status).toBe(400);
    const cancelled = (await (await act(id, { action: 'cancel', reason: 'Meetup cancelled', meetupChanged: true })).json()) as Record<string, any>;
    expect(cancelled.raffle).toMatchObject({ stage: 'cancelled', funding: 'paid', flags: ['refund_review', 'meetup_changed'] });
    expect(stripe.calls.some((c) => c.path.includes('refund'))).toBe(false);
    await act(id, { action: 'refund', decision: 'refund' });
    expect((await act(id, { action: 'refunded', amountChf: '515.25' })).status).toBe(400);
    const refunded = (await (await act(id, { action: 'refunded', amountChf: '515.25', reference: 're_1' })).json()) as Record<string, any>;
    expect(refunded.raffle).toMatchObject({ funding: 'refunded', flags: ['meetup_changed'] });
    r = (await raffles.get(id))!;
    expect(r.stage).toBe('cancelled');
    expect(
      (await (await handleAdminRaffles(new Request(`https://zurichjs.com/x?sponsorId=${s.id}`, { headers: { authorization: `Bearer ${ADMIN}` } }), adminDeps())).json()) as Record<
        string,
        any
      >,
    ).toMatchObject({
      terms: { open: true, version: 'raffle-2026-12' },
      raffles: [{ id, ledger: [{ kind: 'payment' }, { kind: 'prize_purchase' }, { kind: 'refund' }] }],
    });
  });

  it('records a late or mismatched payment and flags it, and a raffle payment link never starts a sponsorship', async () => {
    const { sponsor: s } = await sponsors.create(sponsorRow(), { email: ana.email, name: 'Ana', role: 'primary' }, board);
    const id = ((await (await propose()).json()) as Record<string, any>).raffle.id as string;
    const offered = ((await (await act(id, { action: 'offer', amountChf: '300' })).json()) as Record<string, any>).raffle;
    expect(offered.quote).toMatchObject({ feeChoice: 'absorb', total: 'CHF 300.00' });
    await handleRaffleAnswer(post({ action: 'accept', termsVersion: 'raffle-2026-12', confirm: true }), id, sponsorDeps());
    // The board ends the sponsorship before the sponsor pays.
    await sponsors.transition(s.id, { to: 'ended', actor: board, reason: 'terminated' });
    // A session from the link, with no metadata, and a different total.
    await webhook(stripeEvent('evt_r2', { id: 'cs_r2', mode: 'payment', payment_status: 'paid', amount_total: 29_000, payment_link: 'plink_r1', metadata: {} }));
    const r = (await raffles.get(id))!;
    expect(r.funding).toBe('paid');
    expect(r.flags.sort()).toEqual(['amount_mismatch', 'late_payment']);
    expect((await sponsors.get(s.id))!.status).toBe('ended');
    expect(slack.join('\n')).toContain('stopped being eligible');
  });

  it('runs an in-kind prize without any payment', async () => {
    await sponsors.create(sponsorRow(), { email: ana.email, name: 'Ana', role: 'primary' }, board);
    const id = ((await (await propose({ fulfilment: 'in_kind', budgetChf: undefined })).json()) as Record<string, any>).raffle.id as string;
    const offered = ((await (await act(id, { action: 'offer' })).json()) as Record<string, any>).raffle;
    expect(offered).toMatchObject({ stage: 'offered', quote: null, amount: null });
    const accepted = (
      (await (await handleRaffleAnswer(post({ action: 'accept', termsVersion: 'raffle-2026-12', confirm: true }), id, sponsorDeps())).json()) as Record<string, any>
    ).raffle;
    expect(accepted).toMatchObject({ accepted: true, payUrl: null });
    expect(stripe.calls).toEqual([]);
    expect((await act(id, { action: 'ready' })).status).toBe(409);
    await act(id, { action: 'in_kind', note: 'Two keyboards arrived by post', reference: 'DN-88' });
    const ready = ((await (await act(id, { action: 'ready' })).json()) as Record<string, any>).raffle;
    expect(ready).toMatchObject({ stage: 'ready', funding: 'in_kind', settlement: { state: 'in_kind' } });
  });
});
