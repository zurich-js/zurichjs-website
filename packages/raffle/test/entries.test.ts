import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { claimCode, entriesHash, isClaimCode, memoryRaffleStore, postgresRaffleStore, uniformIndex, type RaffleStore } from '../src/index.ts';

const board = { kind: 'board', id: 'admin' } as const;
const sponsor = { kind: 'sponsor', id: 'u-ana' } as const;
const stripe = { kind: 'stripe', id: 'evt_1' } as const;
const OPENED = new Date('2026-12-01T10:00:00Z');
const CLOSES = '2026-12-09T19:30:00.000Z';
const hex = (n: number) => n.toString(16).padStart(64, '0');

describe('fair draws', () => {
  it('picks uniformly, rejecting the biased top of the 32-bit range', () => {
    // n = 3: limit = 2^32 - (2^32 % 3) = 4294967295; 4294967295 is rejected, the next word is used.
    const words = [4294967295, 7];
    expect(uniformIndex(3, () => words.shift()!)).toBe(1);
    expect(uniformIndex(1)).toBe(0);
    expect(() => uniformIndex(0)).toThrow(RangeError);
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5000; i++) counts[uniformIndex(5)]!++;
    for (const c of counts) expect(c).toBeGreaterThan(800);
  });
  it('makes claim codes without look-alike characters', () => {
    for (let i = 0; i < 200; i++) expect(isClaimCode(claimCode())).toBe(true);
    expect(isClaimCode('ABCD1O')).toBe(false);
  });
});

async function readyRaffle(store: RaffleStore, sponsorId: string, contactId: string) {
  const r = await store.create(
    { sponsorId, eventId: 'event-dec', eventTitle: 'December', eventDate: '2026-12-09', prize: 'Keyboard', quantity: 1, budgetMinor: 50_000, fulfilment: 'zurichjs' },
    sponsor,
  );
  await store.offer(r.id, { from: 'proposed', amountMinor: 50_000, quoteId: null, termsVersion: 't-1', actor: board });
  await store.accept(r.id, { version: 't-1', contactId, actor: sponsor });
  await store.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: stripe });
  return store.moveStage(r.id, { from: 'offered', to: 'ready', actor: board });
}

async function entriesAndDraw(store: RaffleStore, sponsorId: string, contactId: string) {
  const r = await readyRaffle(store, sponsorId, contactId);
  // Opening and drawing only through their own methods.
  await expect(store.moveStage(r.id, { from: 'ready', to: 'open', actor: board })).rejects.toThrow(/open entries/);
  await expect(store.addEntry(r.id, { name: 'Early', email: 'early@x.ch', claimCode: 'AAAAAA', tokenHash: hex(1) }, OPENED)).rejects.toMatchObject({ code: 'conflict' });
  const open = await store.openEntries(r.id, { rulesVersion: 'rules-1', rulesUrl: 'https://zurichjs.com/raffle-rules', closesAt: CLOSES, actor: board });
  expect(open).toMatchObject({ stage: 'open', rulesVersion: 'rules-1', closesAt: CLOSES });
  const add = (i: number, email = `p${i}@x.ch`, at = new Date(OPENED.getTime() + i * 1000)) =>
    store.addEntry(r.id, { name: `Person ${i}`, email, claimCode: `ABCDE${'23456789'[i]}`, tokenHash: hex(100 + i) }, at);
  const first = await add(0);
  expect(first).toMatchObject({ created: true, entry: { claimCode: 'ABCDE2', emailVerifiedAt: null } });
  await add(1);
  await add(2);
  // One entry per email, whatever the case.
  expect(await add(3, 'P0@X.CH')).toMatchObject({ created: false, entry: { id: first.entry.id } });
  // After the closing time nothing more counts.
  await expect(add(4, 'late@x.ch', new Date(Date.parse(CLOSES) + 1))).rejects.toMatchObject({ code: 'conflict' });
  expect((await store.entryByToken(hex(101)))?.name).toBe('Person 1');
  expect((await store.verifyEntry(first.entry.id)).emailVerifiedAt).toEqual(expect.any(String));
  expect(await store.entryCounts(r.id)).toEqual({ total: 3, verified: 1 });

  await expect(store.draw(r.id, { actor: board, pick: () => 0 })).rejects.toThrow(/Close the entries/);
  await store.moveStage(r.id, { from: 'open', to: 'closed', actor: board });
  const all = await store.entries(r.id);
  expect(all.map((e) => e.name)).toEqual(['Person 0', 'Person 1', 'Person 2']);
  const drawn = await store.draw(r.id, { actor: board, pick: (n) => (expect(n).toBe(3), 1) });
  expect(drawn).toMatchObject({ repeated: false, entry: { name: 'Person 1' }, draw: { seq: 1, eligibleCount: 3, index: 1, entriesHash: entriesHash(all), reason: null } });
  // A second click returns the same winner, whatever it would pick.
  expect(await store.draw(r.id, { actor: board, pick: () => 2 })).toMatchObject({ repeated: true, entry: { name: 'Person 1' } });
  expect((await store.get(r.id))!.stage).toBe('drawn');
  // A redraw needs a reason, excludes earlier winners, and cannot race.
  await expect(store.redraw(r.id, { actor: board, reason: ' ', pick: () => 0, afterSeq: 1 })).rejects.toThrow(/reason/);
  const again = await store.redraw(r.id, { actor: board, reason: 'Winner did not reply in 7 days', pick: (n) => (expect(n).toBe(2), 1), afterSeq: 1 });
  expect(again).toMatchObject({ entry: { name: 'Person 2' }, draw: { seq: 2, eligibleCount: 2, reason: 'Winner did not reply in 7 days' } });
  await expect(store.redraw(r.id, { actor: board, reason: 'x', pick: () => 0, afterSeq: 1 })).rejects.toMatchObject({ code: 'conflict' });
  expect((await store.draws(r.id)).map((d) => d.seq)).toEqual([1, 2]);
  const done = await store.moveStage(r.id, { from: 'drawn', to: 'fulfilled', actor: board, reason: 'Handed over at the meetup' });
  expect(done.stage).toBe('fulfilled');
  expect((await store.events(r.id)).map((e) => e.type).slice(-4)).toEqual(['stage_changed', 'drawn', 'redrawn', 'stage_changed']);
  return r.id;
}

describe('entries and draws in memory', () => {
  it('opens, takes one entry per email until closing, draws once, redraws with a reason', async () => {
    await entriesAndDraw(memoryRaffleStore({ now: () => OPENED }), 's_1', 'c_1');
  });
});

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;

d('entries and draws on Postgres', () => {
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

  it('closes after the last successful admission commits and includes it in the draw', async () => {
    const sid = pgdb
      .sql("insert into sponsors (company_name,tier,cycle,payment_mode,status,source) values ('Race fixture','builder','yearly','card','active','invited') returning id")
      .trim();
    const cid = pgdb.sql(`insert into sponsor_contacts (sponsor_id,email,name,role) values ('${sid}','race@example.invalid','Race','primary') returning id`).trim();
    const store = postgresRaffleStore(pool);
    const raffle = await readyRaffle(store, sid, cid);
    await store.openEntries(raffle.id, { rulesVersion: 'fixture', rulesUrl: 'https://example.invalid/rules', closesAt: CLOSES, actor: board });
    const client = await pool.connect();
    try {
      await client.query('begin');
      await postgresRaffleStore(client).addEntry(raffle.id, { name: 'Fixture', email: 'entry@example.invalid', claimCode: 'ABCDEF', tokenHash: hex(789) }, OPENED);
      const closing = store.moveStage(raffle.id, { from: 'open', to: 'closed', actor: board });
      try {
        await expect
          .poll(() => pgdb.sql("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%update raffles%'").trim(), { timeout: 3000 })
          .toBe('1');
      } finally {
        await client.query('commit');
        await closing;
      }
      const result = await store.draw(raffle.id, { actor: board, pick: () => 0 });
      expect(result.draw.eligibleCount).toBe(1);
      expect(result.entry.email).toBe('entry@example.invalid');
    } finally {
      await client.query('rollback');
      client.release();
    }
  });

  it('runs the same, freezes the terms once open, and keeps draws append-only', async () => {
    const sponsorId = pgdb
      .sql(`insert into sponsors (company_name, tier, cycle, payment_mode, status, source) values ('Acme', 'builder', 'yearly', 'card', 'active', 'invited') returning id`)
      .trim();
    const contactId = pgdb.sql(`insert into sponsor_contacts (sponsor_id, email, name, role) values ('${sponsorId}', 'ana@acme.ch', 'Ana', 'primary') returning id`).trim();
    const id = await entriesAndDraw(postgresRaffleStore(pool), sponsorId, contactId);
    expect(pgdb.fails(`update raffles set prize = 'Something else' where id = '${id}'`)).toMatch(/frozen/);
    expect(pgdb.fails(`update raffles set closes_at = now() where id = '${id}'`)).toMatch(/frozen/);
    expect(pgdb.fails(`delete from raffle_draws where raffle_id = '${id}'`)).toMatch(/append-only/);
    expect(
      pgdb.fails(
        `insert into raffle_draws (raffle_id, seq, entry_id, eligible_count, entries_hash, index, actor_kind, actor_id) select '${id}', 3, id, 1, '${hex(1)}', 0, 'board', 'a' from raffle_entries limit 1`,
      ),
    ).toMatch(/check/);
  });
});
