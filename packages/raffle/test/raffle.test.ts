import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { RaffleRuleError, checkStage, eligibility, memoryRaffleStore, postgresRaffleStore, settlement, type LedgerEntry, type NewRaffle, type RaffleStore } from '../src/index.ts';

const board = { kind: 'board', id: 'admin' } as const;
const sponsor = { kind: 'sponsor', id: 'u-ana' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;

describe('who may buy a raffle', () => {
  const today = '2026-11-24';
  it('allows active, and ending inside the paid term; refuses everything else', () => {
    expect(eligibility({ status: 'active', endsAt: null, paidUntil: '2027-01-01' }, today)).toEqual({ ok: true });
    expect(eligibility({ status: 'ending', endsAt: '2026-12-01', paidUntil: '2026-12-01' }, today)).toEqual({ ok: true });
    expect(eligibility({ status: 'ending', endsAt: '2026-11-24', paidUntil: null }, today)).toMatchObject({ ok: false, reason: /paid term is over/ });
    expect(eligibility({ status: 'ending', endsAt: null, paidUntil: null }, today)).toMatchObject({ ok: false });
    expect(eligibility({ status: 'pending', endsAt: null, paidUntil: null }, today)).toMatchObject({ ok: false, reason: /Start the sponsorship/ });
    expect(eligibility({ status: 'past_due', endsAt: null, paidUntil: '2026-11-01' }, today)).toMatchObject({ ok: false, reason: /overdue/ });
    expect(eligibility({ status: 'ended', endsAt: null, paidUntil: null }, today)).toMatchObject({ ok: false, reason: /ended/ });
  });

  it('lets only the right people move a stage', () => {
    expect(() => checkStage('proposed', 'offered', 'board')).not.toThrow();
    expect(() => checkStage('proposed', 'offered', 'sponsor')).toThrow(RaffleRuleError);
    expect(() => checkStage('proposed', 'open', 'board')).toThrow(RaffleRuleError);
    expect(() => checkStage('cancelled', 'offered', 'board')).toThrow(RaffleRuleError);
  });

  it('shows underspend and overspend for the board to decide, never settles them', () => {
    const e = (kind: LedgerEntry['kind'], amountMinor: number): LedgerEntry => ({ id: '1', raffleId: 'r', kind, amountMinor, note: 'x', reference: null, actor: board, at: '' });
    const r = { funding: 'paid' as const, amountMinor: 50_000 };
    expect(settlement(r, [e('payment', 51_500)])).toMatchObject({ received: 51_500, spent: 0, state: 'not_spent' });
    expect(settlement(r, [e('payment', 50_000), e('prize_purchase', 42_000), e('delivery', 1_500)])).toMatchObject({ spent: 43_500, difference: 6_500, state: 'underspend' });
    expect(settlement(r, [e('payment', 50_000), e('prize_purchase', 52_000)])).toMatchObject({ difference: -2_000, state: 'overspend' });
    expect(settlement(r, [e('payment', 50_000), e('prize_purchase', 50_000)])).toMatchObject({ state: 'balanced' });
    expect(settlement({ funding: 'in_kind', amountMinor: null }, [])).toMatchObject({ state: 'in_kind' });
  });
});

const proposal = (sponsorId: string): NewRaffle => ({
  sponsorId,
  eventId: 'event-dec',
  eventTitle: 'ZurichJS Meetup December',
  eventDate: '2026-12-09',
  prize: 'Mechanical keyboard',
  quantity: 1,
  budgetMinor: 50_000,
  fulfilment: 'zurichjs',
});

async function lifecycle(store: RaffleStore, sponsorId: string, contactId: string) {
  const r = await store.create(proposal(sponsorId), sponsor);
  expect(r).toMatchObject({ stage: 'proposed', funding: 'unpaid', flags: [] });
  await expect(store.moveStage(r.id, { from: 'proposed', to: 'offered', actor: sponsor })).rejects.toThrow(RaffleRuleError);
  const offered = await store.offer(r.id, { from: 'proposed', amountMinor: 50_000, quoteId: null, termsVersion: 'raffle-1', actor: board });
  expect(offered).toMatchObject({ stage: 'offered', amountMinor: 50_000, termsVersion: 'raffle-1' });
  // A second click on the same offer is a conflict, not a second offer.
  await expect(store.offer(r.id, { from: 'proposed', amountMinor: 1, quoteId: null, termsVersion: 'raffle-1', actor: board })).rejects.toMatchObject({ code: 'conflict' });
  // Not ready before payment and acceptance.
  await expect(store.moveStage(r.id, { from: 'offered', to: 'ready', actor: board })).rejects.toThrow(/not paid/);
  await expect(store.accept(r.id, { version: 'raffle-0', contactId, actor: sponsor })).rejects.toMatchObject({ code: 'conflict' });
  await store.accept(r.id, { version: 'raffle-1', contactId, actor: sponsor });
  const paid = await store.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: stripe });
  await expect(store.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: stripe })).rejects.toMatchObject({ code: 'conflict' });
  expect(paid.funding).toBe('paid');
  const ready = await store.moveStage(r.id, { from: 'offered', to: 'ready', actor: board });
  expect(ready.stage).toBe('ready');
  await store.flag(r.id, 'late_payment', stripe, { status: 'ended' });
  expect((await store.flag(r.id, 'late_payment', stripe)).flags).toEqual(['late_payment']);
  expect((await store.clearFlag(r.id, 'late_payment', board)).flags).toEqual([]);
  await store.addLedger(r.id, { kind: 'payment', amountMinor: 50_000, note: 'Card payment', reference: 'cs_1' }, stripe);
  await store.addLedger(r.id, { kind: 'prize_purchase', amountMinor: 42_000, note: 'Keyboard, receipt 1234', reference: '1234' }, board);
  expect((await store.ledger(r.id)).map((e) => e.kind)).toEqual(['payment', 'prize_purchase']);
  const cancelled = await store.moveStage(r.id, { from: 'ready', to: 'cancelled', actor: board, reason: 'Meetup cancelled' });
  expect(cancelled).toMatchObject({ stage: 'cancelled', funding: 'paid', reason: 'Meetup cancelled' });
  expect((await store.events(r.id)).map((e) => e.type)).toEqual([
    'proposed',
    'offered',
    'terms_accepted',
    'funding_changed',
    'stage_changed',
    'flagged',
    'flag_cleared',
    'ledger_added',
    'ledger_added',
    'stage_changed',
  ]);
  expect(await store.stripeEventSeen('evt_1')).toBe(false);
  await store.markStripeEvent('evt_1', 'checkout.session.completed');
  expect(await store.stripeEventSeen('evt_1')).toBe(true);
  return r.id;
}

describe('raffle store in memory', () => {
  it('keeps stage and funding apart, compare-and-set, with an audit row for each change', async () => {
    await lifecycle(memoryRaffleStore(), 's_1', 'c_1');
  });
});

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;

d('raffle store on Postgres', () => {
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

  it('runs the same lifecycle, keeps the ledger and log append-only, and refuses a paid in-kind prize', async () => {
    const sponsorId = pgdb
      .sql(`insert into sponsors (company_name, tier, cycle, payment_mode, status, source) values ('Acme', 'builder', 'yearly', 'card', 'active', 'invited') returning id`)
      .trim();
    const contactId = pgdb.sql(`insert into sponsor_contacts (sponsor_id, email, name, role) values ('${sponsorId}', 'ana@acme.ch', 'Ana', 'primary') returning id`).trim();
    const store = postgresRaffleStore(pool);
    const id = await lifecycle(store, sponsorId, contactId);
    const receipt = { kind: 'payment' as const, amountMinor: 100, note: 'Local race fixture', reference: 'cs_parallel' };
    const writes = await Promise.allSettled([store.addLedger(id, receipt, stripe), store.addLedger(id, receipt, stripe)]);
    expect(writes.filter((w) => w.status === 'fulfilled')).toHaveLength(1);
    expect((await store.ledger(id)).filter((e) => e.reference === receipt.reference)).toHaveLength(1);
    expect(await store.bySponsor(sponsorId)).toHaveLength(1);
    expect(pgdb.fails(`update raffle_ledger set amount_minor = 1 where raffle_id = '${id}'`)).toMatch(/append-only/);
    expect(pgdb.fails(`delete from raffle_events where raffle_id = '${id}'`)).toMatch(/append-only/);
    const kind = await store.create({ ...proposal(sponsorId), fulfilment: 'in_kind' }, sponsor);
    expect(pgdb.fails(`update raffles set funding = 'paid' where id = '${kind.id}'`)).toMatch(/raffle_in_kind/);
    expect(pgdb.fails(`update raffles set flags = array['made_up'] where id = '${kind.id}'`)).toMatch(/check/);
    expect(await store.get('not-a-uuid')).toBeNull();
  });
});
