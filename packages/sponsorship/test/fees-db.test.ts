/** Tariffs and quotes on a real (local) Postgres after every migration. Skips without Postgres. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { DuplicateTariff, QuoteBusy, feeGate, memoryFeeStore, postgresFeeStore, postgresStore, quoteFigures, type FeeStore } from '../src/index.ts';

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;
const board = { kind: 'board', id: 'admin' } as const;
const tariff = { version: 't-2026-11', method: 'card', currency: 'chf', ratePpm: 29_000, fixedMinor: 30, note: 'Stripe CH, card', enteredBy: 'board' } as const;

async function quotes(fees: FeeStore, sponsorId: string) {
  await fees.addTariff(tariff);
  await expect(fees.addTariff(tariff)).rejects.toBeInstanceOf(DuplicateTariff);
  const gate = feeGate(await fees.latestTariff(), 'p-1');
  const first = await fees.createQuote({
    ...quoteFigures(150_000, 'absorb', gate),
    sponsorId,
    subject: 'sponsorship',
    subjectId: null,
    purpose: 'Sponsorship of 3 meetups',
    createdBy: 'board',
  });
  expect(first).toMatchObject({ superseded: null, quote: { status: 'open', totalMinor: 150_000, feeChoice: 'absorb' } });
  const second = await fees.createQuote({
    ...quoteFigures(150_000, 'pass_through', gate),
    sponsorId,
    subject: 'sponsorship',
    subjectId: null,
    purpose: 'Sponsorship of 3 meetups',
    createdBy: 'board',
  });
  expect(second.superseded).toMatchObject({ id: first.quote.id, status: 'superseded' });
  expect(second.quote).toMatchObject({ status: 'open', surchargeMinor: 4_511, totalMinor: 154_511, tariffVersion: 't-2026-11', policyVersion: 'p-1' });
  // Another thing (a raffle) has its own open quote.
  await fees.createQuote({ ...quoteFigures(50_000, 'absorb', gate), sponsorId, subject: 'raffle', subjectId: 'r-1', purpose: 'Raffle', createdBy: 'board' });
  expect((await fees.openQuote(sponsorId, 'sponsorship', null))?.id).toBe(second.quote.id);
  const payment = {
    sponsorId,
    subject: 'sponsorship' as const,
    subjectId: null,
    quoteId: second.quote.id,
    currency: 'chf',
    amountMinor: 154511,
    paymentIntentId: null,
    paymentLinkId: null,
  };
  const results = await Promise.all(['cs_1', 'cs_2'].map((sessionId) => fees.settlePayment({ ...payment, sessionId })));
  expect(results.map((r) => r.payment.outcome).sort()).toEqual(['matched', 'review']);
  const winner = results.find((r) => r.payment.outcome === 'matched')!.payment.sessionId;
  expect(await fees.settlePayment({ ...payment, sessionId: winner })).toMatchObject({ fresh: false, payment: { outcome: 'matched' } });
  expect(await fees.settlePayment({ ...payment, quoteId: first.quote.id, sessionId: 'cs_3', amountMinor: first.quote.totalMinor })).toMatchObject({
    payment: { outcome: 'review' },
  });
  expect((await fees.quotes(sponsorId)).map((x) => x.status).sort()).toEqual(['open', 'paid', 'superseded']);
  expect(await fees.payments(sponsorId)).toHaveLength(3);
  const next = { ...quoteFigures(50000, 'absorb', gate), sponsorId, subject: 'sponsorship' as const, subjectId: null, purpose: 'One meetup', createdBy: 'board' };
  const requestId = crypto.randomUUID();
  const offers = await Promise.all([fees.createQuote(next, { requestId, reuse: true }), fees.createQuote(next, { requestId, reuse: true })]);
  expect(offers[0].quote.id).toBe(offers[1].quote.id);
  await fees.linkCreating(offers[0].quote.id);
  await fees.attachLink(offers[0].quote.id, 'plink_probe', 'https://example.test/pay');
  expect(await fees.createQuote(next, { requestId, reuse: true })).toMatchObject({ quote: { id: offers[0].quote.id, linkState: 'live' }, reused: true });

  return second.quote.id;
}

/** A recurring quote: accepted once, in force for renewals, superseded by the next accepted one. */
async function recurring(fees: FeeStore, sponsorId: string) {
  const gate = feeGate(await fees.latestTariff(), 'p-1');
  const one = (
    await fees.createQuote({
      ...quoteFigures(500_000, 'pass_through', gate),
      interval: 'year',
      sponsorId,
      subject: 'sponsorship',
      subjectId: null,
      purpose: 'Sponsorship, yearly',
      createdBy: 'board',
    })
  ).quote;
  expect(one.interval).toBe('year');
  expect(await fees.acceptedQuote(sponsorId)).toBeNull();
  const accepted = await fees.acceptQuote(one.id, 'contact-1', 'si_fee_1');
  expect(accepted).toMatchObject({ status: 'accepted', acceptedBy: 'contact-1', stripeRef: 'si_fee_1', acceptedAt: expect.any(String) });
  expect((await fees.acceptQuote(one.id, 'contact-2', 'si_other'))?.acceptedBy).toBe('contact-1');
  const two = (
    await fees.createQuote({
      ...quoteFigures(500_000, 'absorb', gate),
      interval: 'year',
      sponsorId,
      subject: 'sponsorship',
      subjectId: null,
      purpose: 'Sponsorship, yearly',
      createdBy: 'board',
    })
  ).quote;
  // A new open quote does not end the one in force; accepting it does.
  expect((await fees.acceptedQuote(sponsorId))?.id).toBe(one.id);
  await fees.acceptQuote(two.id, 'board', null);
  expect((await fees.acceptedQuote(sponsorId))?.id).toBe(two.id);
  expect((await fees.quote(one.id))?.status).toBe('superseded');
  // A one-off quote cannot be accepted as recurring.
  const once = (await fees.createQuote({ ...quoteFigures(100, 'absorb', gate), sponsorId, subject: 'raffle', subjectId: 'r-9', purpose: 'x', createdBy: 'board' })).quote;
  expect(await fees.acceptQuote(once.id, 'c', null)).toBeNull();
  return one.id;
}

describe('fee store in memory', () => {
  it('supersedes, records late payments and never loses one', async () => {
    await quotes(memoryFeeStore(), 's_1');
  });
  it('keeps one recurring quote in force', async () => {
    const fees = memoryFeeStore();
    await fees.addTariff(tariff);
    await recurring(fees, 's_1');
  });
});

d('fee store on Postgres', () => {
  const pgdb = db as Pg;
  let pool: pg.Pool;
  beforeAll(() => {
    for (const f of readdirSync(migrations).sort()) pgdb.sql(readFileSync(join(migrations, f), 'utf8'));
    pool = new pg.Pool({ ...pgdb.connection, max: 2 });
  });
  afterAll(async () => {
    await pool?.end();
    pgdb.stop();
  });

  it('keeps tariffs append-only and quote figures frozen', async () => {
    const { sponsor } = await postgresStore(pool).create(
      {
        companyName: 'Acme',
        legalName: null,
        billingAddress: null,
        vatId: null,
        website: null,
        tier: 'builder',
        cycle: 'once',
        paymentMode: 'card',
        status: 'pending',
        source: 'invited',
        startedAt: null,
        paidUntil: null,
        pricePerMeetup: 500,
        notes: null,
      },
      { email: 'a@acme.ch', name: 'A', role: 'primary' },
      board,
    );
    const fees = postgresFeeStore(pool);
    const id = await quotes(fees, sponsor.id);
    const one = await recurring(fees, sponsor.id);
    const store = postgresStore(pool);
    const { sponsor: running } = await store.create(
      {
        companyName: 'Running sponsor',
        legalName: null,
        billingAddress: null,
        vatId: null,
        website: null,
        tier: 'builder',
        cycle: 'yearly',
        paymentMode: 'card',
        status: 'active',
        source: 'imported',
        startedAt: '2026-01-01',
        paidUntil: '2027-01-01',
        pricePerMeetup: null,
        notes: null,
      },
      { email: 'test@running.example', name: 'Grace', role: 'primary' },
      board,
    );
    await store.linkStripe(running.id, { subscriptionId: 'sub_test' }, board);
    const current = (
      await fees.createQuote({
        ...quoteFigures(500000, 'pass_through', feeGate(await fees.latestTariff(), 'p-1')),
        sponsorId: running.id,
        subject: 'sponsorship',
        subjectId: null,
        interval: 'year',
        purpose: 'Current plan',
        createdBy: 'board',
      })
    ).quote;
    await fees.acceptQuote(current.id, 'prior', 'si_current');
    const next = {
      ...current,
      purpose: 'Offered plan',
      planChange: {
        subscription: 'sub_test',
        previousQuote: current.id,
        tier: 'friend' as const,
        cycle: 'yearly' as const,
        basePrice: 'target',
        previousBasePrice: 'source',
        previousFeePrice: 'fee',
        feeProduct: 'prod_fee',
        periodEnd: 1900000000,
        charge: { timing: 'renewal' as const },
      },
    };
    const immediate = { ...next, planChange: { ...next.planChange, charge: { timing: 'now' as const, at: 1800000000, dueMinor: 100, policy: 'test' } } };
    const { quote: upgrade } = await fees.createQuote(immediate);
    const signer = { version: '2026-11-01', name: 'First', title: 'Director', email: 'first@example.test' };
    expect((await Promise.all(['a', 'b'].map((c) => fees.claimRecurring(upgrade.id, c, signer)))).filter(Boolean)).toHaveLength(1);
    const contact = (await fees.quote(upgrade.id))!.applyingBy!;
    expect(await fees.releaseDeclinedPlan(upgrade.id, contact, null)).toBe(true);
    expect(await fees.claimRecurring(upgrade.id, contact, signer)).toBe(false);
    const attempt = (await fees.quote(upgrade.id))!.confirmationAttempt!;
    expect(await fees.claimRecurring(upgrade.id, contact, { ...signer, attempt })).toBe(true);
    expect(await fees.releaseDeclinedPlan(upgrade.id, contact, null)).toBe(false);
    expect(await fees.voidQuote(upgrade.id)).toBeNull();
    await expect(fees.createQuote(immediate)).rejects.toThrow(/confirming/);
    expect(await fees.voidExpiredPlan(upgrade.id, contact, null)).toBe(false);
    expect(await fees.voidExpiredPlan(upgrade.id, 'other', attempt)).toBe(false);
    const expire = () => fees.voidExpiredPlan(upgrade.id, contact, attempt);
    const [replacement, ...expired] = await Promise.all([
      fees.createQuote(next).catch((cause: unknown) => {
        if (!(cause instanceof QuoteBusy)) throw cause;
        return null;
      }),
      expire(),
      expire(),
    ] as const);
    expect(expired.sort()).toEqual([false, true]);
    const { quote } = replacement ?? (await fees.createQuote(next));
    expect(await fees.quote(upgrade.id)).toMatchObject({ status: 'void', applyingBy: null });
    expect(await fees.claimRecurring(upgrade.id, contact, { ...signer, attempt })).toBe(false);
    expect(await fees.releaseDeclinedPlan(upgrade.id, contact, attempt)).toBe(false);
    expect(await fees.acceptQuote(upgrade.id, contact, 'si_late')).toBeNull();
    expect(await expire()).toBe(false);
    expect((await fees.openQuote(running.id, 'sponsorship', null))?.id).toBe(quote.id);
    expect((await fees.acceptedQuote(running.id))?.id).toBe(current.id);
    expect(quote.planChange).toEqual(next.planChange);
    const signature = { version: '2026-11-01', name: 'Grace', title: 'Director', email: 'g@example.test' };
    const claims = await Promise.all(['a', 'b'].map((c) => fees.claimRecurring(quote.id, c, signature)));
    expect(claims.filter(Boolean)).toHaveLength(1);
    const winner = claims[0] ? 'a' : 'b';
    expect(await fees.claimRecurring(quote.id, winner, signature)).toBe(true);
    expect((await pool.query('select count(*)::int as n from sponsor_agreements where id=$1', [quote.id])).rows[0].n).toBe(1);
    await expect(fees.createQuote(next)).rejects.toThrow(/confirming/);
    expect(pgdb.fails(`update payment_quotes set plan_change='{}' where id='${quote.id}'`)).toMatch(/frozen/);
    expect(await fees.voidExpiredPlan(quote.id, winner, null)).toBe(false);
    expect(await fees.savePlanSchedule(quote.id, 'sched_one')).toBe(true);
    expect(await fees.retirePlanSchedule(quote.id, 'other')).toBe(false);
    expect(await fees.acceptQuote(quote.id, winner, 'si_next')).toMatchObject({ status: 'accepted' });
    await expect(fees.createQuote(next)).rejects.toThrow(/current fee changed/);
    expect(pgdb.fails(`update payment_quotes set status = 'accepted' where id = '${one}'`)).toMatch(/only moves forward/);
    expect(pgdb.fails(`update payment_quotes set interval = 'month' where id = '${one}'`)).toMatch(/frozen/);
    expect(pgdb.fails(`update fee_tariffs set rate_ppm = 1`)).toMatch(/append-only/);
    expect(pgdb.fails(`update payment_quotes set total_minor = 1, base_minor = 1 where id = '${id}'`)).toMatch(/frozen/);
    expect(pgdb.fails(`update payment_quotes set status = 'open', paid_at = null where id = '${id}'`)).toMatch(/only moves forward/);
    expect(pgdb.fails(`delete from payment_quotes where id = '${id}'`)).toMatch(/kept/);
    expect(
      pgdb.fails(
        `insert into payment_quotes (sponsor_id, subject, purpose, base_minor, surcharge_minor, total_minor, fee_choice, formula, created_by) values ('${sponsor.id}', 'raffle', 'x', 100, 5, 105, 'absorb', 'none', 'b')`,
      ),
    ).toMatch(/quote_choice/);
    expect(
      pgdb.fails(
        `insert into payment_quotes (sponsor_id, subject, subject_id, purpose, base_minor, surcharge_minor, total_minor, fee_choice, formula, created_by) values ('${sponsor.id}', 'raffle', 'r-1', 'x', 100, 0, 100, 'absorb', 'none', 'b')`,
      ),
    ).toMatch(/payment_quotes_open_idx/);
  });
});
