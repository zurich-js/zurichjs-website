import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPg, type Pg } from '../../membership/test/pg.ts';
import { RaffleRuleError, memoryRaffleStore, postgresRaffleStore, type RaffleStore } from '../src/index.ts';

const board = { kind: 'board', id: 'admin' } as const;
const sponsorActor = { kind: 'sponsor', id: 'u-ana' } as const;
const T0 = new Date('2026-12-01T10:00:00Z');
const hex = (n: number) => n.toString(16).padStart(64, '0');
const at = (min: number) => new Date(T0.getTime() + min * 60_000);

async function openRaffle(store: RaffleStore, sponsorId: string, contactId: string, sharing: boolean) {
  const r = await store.create(
    { sponsorId, eventId: 'event-dec', eventTitle: 'December', eventDate: '2026-12-09', prize: 'Keyboard', quantity: 1, budgetMinor: 50_000, fulfilment: 'zurichjs' },
    sponsorActor,
  );
  await store.offer(r.id, { from: 'proposed', amountMinor: 50_000, quoteId: null, termsVersion: 't-1', actor: board });
  await store.accept(r.id, { version: 't-1', contactId, actor: sponsorActor });
  await store.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: board });
  await store.moveStage(r.id, { from: 'offered', to: 'ready', actor: board });
  return store.openEntries(r.id, {
    rulesVersion: 'rules-1',
    rulesUrl: 'https://zurichjs.com/raffle-rules',
    closesAt: '2026-12-09T19:30:00.000Z',
    actor: board,
    sharing: sharing
      ? { purpose: 'send you an invitation to their JavaScript workshop', privacyUrl: 'https://acme.example/privacy', version: 'share-1', noticeUrl: 'https://example.test/policy' }
      : null,
  });
}

async function sharingRules(store: RaffleStore, sponsorId: string, contactId: string, otherRecipient: string) {
  // A raffle opened without sharing never takes a consent.
  const plain = await openRaffle(store, sponsorId, contactId, false);
  const lone = await store.addEntry(plain.id, { name: 'Solo', email: 'solo@x.ch', claimCode: 'ZZZZZZ', tokenHash: hex(9) }, at(1));
  await expect(store.giveConsent(lone.entry.id, { verified: true, at: at(1) })).rejects.toBeInstanceOf(RaffleRuleError);

  const r = await openRaffle(store, sponsorId, contactId, true);
  expect(r).toMatchObject({ sharingVersion: 'share-1', sharePrivacyUrl: 'https://acme.example/privacy' });
  const add = (i: number) => store.addEntry(r.id, { name: `P${i}`, email: `p${i}@x.ch`, claimCode: `ABCDE${'2345'[i]}`, tokenHash: hex(200 + i) }, at(i + 2));
  const [a, b, c, d] = [(await add(0)).entry, (await add(1)).entry, (await add(2)).entry, (await add(3)).entry];
  // a: ticked on the form, then confirmed the email. b: ticked, never confirmed. c: opted in from their own link. d: never.
  await store.giveConsent(a.id, { verified: false, at: at(10) });
  await store.verifyEntry(a.id);
  await store.giveConsent(b.id, { verified: false, at: at(10) });
  await store.giveConsent(c.id, { verified: true, at: at(11) });
  expect((await store.consentedEntries(r.id)).map((e) => e.name)).toEqual(['P0', 'P2']);
  expect(await store.consentCounts(r.id)).toEqual({ given: 3, valid: 2, withdrawn: 0 });

  // The board selects b, c and d: the share holds only c (and a was not selected: narrowing works).
  const share = await store.createShare(r.id, {
    recipientContactId: otherRecipient,
    fields: ['name', 'email'],
    entryIds: [b.id, c.id, d.id],
    expiresAt: at(60 * 24).toISOString(),
    actor: board,
  });
  expect(share.entryIds).toEqual([c.id]);
  await expect(
    store.createShare(r.id, { recipientContactId: otherRecipient, fields: ['email'], entryIds: [b.id, d.id], expiresAt: at(60).toISOString(), actor: board }),
  ).rejects.toThrow(/valid consent/);
  const all = await store.createShare(r.id, { recipientContactId: otherRecipient, fields: ['email'], entryIds: [a.id, c.id], expiresAt: at(60 * 24).toISOString(), actor: board });
  expect((await store.readShare(all.id, sponsorActor, at(20))).rows).toEqual([
    { id: a.id, name: '', email: 'p0@x.ch' },
    { id: c.id, name: '', email: 'p2@x.ch' },
  ]);
  // A withdrawal before access removes the row; withdrawing twice is fine.
  expect(await store.withdrawConsent(a.id, at(30))).toMatchObject({ withdrawnAt: expect.any(String) });
  expect(await store.withdrawConsent(a.id, at(31))).toBeNull();
  expect((await store.readShare(all.id, sponsorActor, at(32))).rows.map((x) => x.email)).toEqual(['p2@x.ch']);
  expect(await store.consentCounts(r.id)).toEqual({ given: 2, valid: 1, withdrawn: 1 });
  const [task] = await store.deletionTasks(r.id, otherRecipient);
  expect(task).toMatchObject({ entryId: a.id, shareId: all.id, acknowledged: false });
  expect(await store.acknowledgeDeletion(r.id, otherRecipient, all.id, task!.consentId)).toBe(true);
  // A new choice after a withdrawal is a new record.
  await store.giveConsent(a.id, { verified: true, at: at(40) });
  expect((await store.consentOf(a.id))?.givenAt).toBe(at(40).toISOString());
  // Expired and revoked shares return nothing.
  await expect(store.readShare(all.id, sponsorActor, at(60 * 24 + 1))).rejects.toThrow(/expired/);
  await store.revokeShare(share.id, board);
  await expect(store.readShare(share.id, sponsorActor, at(21))).rejects.toThrow(/expired or was withdrawn/);
  // The audit log has ids and counts, never names or emails.
  const log = JSON.stringify(await store.events(r.id));
  expect(log).toContain('shared');
  expect(log).not.toMatch(/p[0-3]@x\.ch|"P[0-3]"/);
  // Retention: names and emails go, counts and draws stay.
  expect(await store.eraseEntries(r.id, board)).toBe(4);
  expect(await store.eraseEntries(r.id, board)).toBe(0);
  expect((await store.entries(r.id)).every((e) => e.name === 'Erased' && e.email.endsWith('@invalid.invalid'))).toBe(true);
  expect((await store.entryCounts(r.id)).total).toBe(4);
  return r.id;
}

describe('consent and sharing in memory', () => {
  it('counts consent only when verified, narrows every share and every read, and erases on request', async () => {
    await sharingRules(memoryRaffleStore({ now: () => T0 }), 's_1', 'c_1', 'c_2');
  });
});

const migrations = join(import.meta.dirname, '../../../apps/web/database/migrations');
const db = startPg();
const d = db ? describe : describe.skip;

d('consent and sharing on Postgres', () => {
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

  it('runs the same and freezes the sharing terms once open', async () => {
    const sponsorId = pgdb
      .sql(`insert into sponsors (company_name, tier, cycle, payment_mode, status, source) values ('Acme', 'builder', 'yearly', 'card', 'active', 'invited') returning id`)
      .trim();
    pgdb.sql(`insert into "user"(id,name,email,"emailVerified") values ('u-ana','Ana','ana@acme.ch',true)`);
    const contactId = pgdb
      .sql(`insert into sponsor_contacts (sponsor_id, email, name, role,user_id) values ('${sponsorId}', 'ana@acme.ch', 'Ana', 'primary','u-ana') returning id`)
      .trim();
    const store = postgresRaffleStore(pool);
    const id = await sharingRules(store, sponsorId, contactId, contactId);
    const race = await openRaffle(store, sponsorId, contactId, true);
    const { entry } = await store.addEntry(race.id, { name: 'Race', email: 'race@example.invalid', claimCode: 'BCDEFG', tokenHash: hex(999) }, at(1));
    await store.giveConsent(entry.id, { verified: true, at: at(2) });
    const share = await store.createShare(race.id, { recipientContactId: contactId, fields: ['email'], entryIds: [entry.id], expiresAt: at(60).toISOString(), actor: board });
    const client = await pool.connect();
    try {
      await client.query('begin');
      await postgresRaffleStore(client).revokeShare(share.id, board);
      const reading = store.readShare(share.id, sponsorActor, at(3)).then(
        () => 'delivered',
        () => 'denied',
      );
      try {
        await expect
          .poll(() => pgdb.sql("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%with allowed as materialized%'").trim(), { timeout: 3000 })
          .toBe('1');
      } finally {
        await client.query('commit');
      }
      expect(await reading).toBe('denied');
    } finally {
      await client.query('rollback');
      client.release();
    }
    expect(pgdb.fails(`update raffles set share_purpose = 'anything' where id = '${id}'`)).toMatch(/frozen/);
    expect(
      pgdb.fails(
        `insert into raffle_shares (raffle_id, recipient_contact_id, purpose, fields, entry_ids, expires_at) select '${id}', '${contactId}', 'x', array['phone'], array[id], now() + interval '1 day' from raffle_entries limit 1`,
      ),
    ).toMatch(/check/);
  });
});
