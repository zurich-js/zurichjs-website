import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { startPg } from '../../../packages/membership/test/pg.ts';
import { feeGate, quoteFigures } from '@zurichjs/sponsorship';
import { membershipDb } from '../src/server/membership-db.ts';
import { RAFFLE_SOURCE, raffleStore } from '../src/server/raffle.ts';
import { processRaffleEvent } from '../src/server/raffle-webhook.ts';
import { feeStore } from '../src/server/sponsor-fees.ts';

const db = startPg();
const env = { MEMBERSHIP_DB_URL: db ? `postgresql://postgres@localhost/postgres?host=${encodeURIComponent(db.connection.host)}` : undefined };
const board = { kind: 'board', id: 'fixture' } as const;
beforeAll(() => {
  if (!db) return;
  const migrations = join(import.meta.dirname, '../database/migrations');
  for (const f of readdirSync(migrations).sort()) db.sql(readFileSync(join(migrations, f), 'utf8'));
});
afterAll(async () => {
  if (db) {
    await membershipDb(env).end();
    db.stop();
  }
});

it.skipIf(!db)('records a retried Stripe session once on Postgres and holds its cancelled host', async () => {
  const sid = db!.sql("insert into sponsors(company_name,tier,cycle,payment_mode,status,source) values('Fixture','builder','yearly','card','active','invited') returning id");
  const cid = db!.sql(`insert into sponsor_contacts(sponsor_id,email,name,role) values('${sid}','fixture@example.invalid','Fixture','primary') returning id`);
  const raffles = raffleStore(env);
  const fees = feeStore(env);
  const r = await raffles.create(
    { sponsorId: sid, eventId: 'host', eventTitle: 'Fixture', eventDate: '2027-01-01', prize: 'Fixture', quantity: 1, budgetMinor: 30000, fulfilment: 'zurichjs' },
    board,
  );
  const { quote } = await fees.createQuote({
    ...quoteFigures(30000, 'absorb', feeGate(null, '')),
    sponsorId: sid,
    subject: 'raffle',
    subjectId: r.id,
    purpose: 'Fixture',
    createdBy: 'board',
  });
  await raffles.offer(r.id, { from: 'proposed', amountMinor: 30000, quoteId: quote.id, termsVersion: 'mock-1', actor: board });
  await raffles.accept(r.id, { contactId: cid, version: 'mock-1', actor: { kind: 'sponsor', id: 'fixture' } });
  const object = {
    id: 'cs_fixture',
    mode: 'payment',
    payment_status: 'paid',
    currency: 'chf',
    amount_total: 30000,
    metadata: { source: RAFFLE_SOURCE, raffleId: r.id, sponsorId: sid, quoteId: quote.id },
  };
  const deps = {
    env,
    hosts: async () => [{ id: 'host', title: 'Fixture', datetime: null, status: 'cancelled' }],
    fetch: async () => {
      throw new Error('No network in this fixture.');
    },
  };
  const deliver = (id: string) => processRaffleEvent({ type: 'checkout.session.completed', id, data: { object } }, deps);
  const responses = await Promise.all([deliver('evt_1'), deliver('evt_2')]);
  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  expect(await raffles.ledger(r.id)).toMatchObject([{ kind: 'payment', reference: 'cs_fixture', amountMinor: 30000 }]);
  expect(await fees.payments(sid)).toHaveLength(1);
  expect(await raffles.get(r.id)).toMatchObject({ stage: 'on_hold', funding: 'paid', flags: expect.arrayContaining(['meetup_changed', 'refund_review']) });
});
