/** Tariffs and quotes on a real (local) Postgres after every migration. Skips without Postgres. */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { DuplicateTariff, feeGate, memoryFeeStore, postgresFeeStore, postgresStore, quoteFigures, type FeeStore } from '../src/index.ts';

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
  // Paying the current quote; paying twice keeps the first record; a stale one is still recorded.
  expect(await fees.markQuotePaid(second.quote.id, 'cs_1')).toMatchObject({ was: 'open', quote: { status: 'paid', stripeRef: 'cs_1' } });
  expect(await fees.markQuotePaid(second.quote.id, 'cs_2')).toMatchObject({ was: 'paid', quote: { stripeRef: 'cs_1' } });
  expect(await fees.markQuotePaid(first.quote.id, 'cs_3')).toMatchObject({ was: 'superseded', quote: { status: 'paid' } });
  expect((await fees.quotes(sponsorId)).map((x) => x.status)).toEqual(['open', 'paid', 'paid']);
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
