/**
 * Raffle entries, the draw and fulfilment through the API handlers on in-memory stores, with Resend
 * and Slack faked: the entrant rules gate, the public page, entering (validation, one per email,
 * the same answer either way, closing time), the entrant's own link (view, confirm by click), the
 * draw (once, uniform, private winner email, public claim code) and the redraw, and that Slack,
 * the sponsor and the public page never get entrant data.
 */
import { memoryRaffleStore, type RaffleStore } from '@zurichjs/raffle';
import { memoryFeeStore, memoryStore, type FeeStore, type SponsorStore } from '@zurichjs/sponsorship';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAdminRaffle } from '../src/pages/api/membership/admin/raffles/[id]/index.ts';
import { deliverRaffleMail } from '../src/server/raffle-mail.ts';
import { handleEnter } from '../src/pages/api/raffle/entries.ts';
import { handleRaffleInfo } from '../src/pages/api/raffle/info.ts';
import { handleManage } from '../src/pages/api/raffle/manage.ts';
import { handleRaffles } from '../src/pages/api/sponsorship/raffles/index.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const ADMIN = 'admin-password-for-tests';
const base: Record<string, string> = { BETTER_AUTH_URL: 'https://zurichjs.com', ADMIN_PASSWORD: ADMIN, RESEND_API_KEY: 're_test', SLACK_SPONSORSHIP_CHANNEL_ID: 'C1' };
const env: Record<string, string> = {
  ...base,
  BETTER_AUTH_SECRET: 'a-synthetic-only-test-secret-of-32-characters',
  RAFFLE_TERMS_VERSION: 't-1',
  RAFFLE_TERMS_URL: 'https://example.test/terms',
  RAFFLE_RULES_VERSION: 'rules-2026-12',
  RAFFLE_RULES_URL: 'https://zurichjs.com/raffle-rules',
};
const board = { kind: 'board', id: 'admin' } as const;
const ana = { id: 'user-ana', email: 'ana@acme.ch' };
let clock = new Date('2026-12-01T10:00:00Z');

describe('raffle entries and the draw', () => {
  let sponsors: SponsorStore;
  let raffles: RaffleStore;
  let fees: FeeStore;
  let emails: { to: string[]; subject: string; text: string }[];
  let slack: string[];
  let raffleId: string;
  const slackFake: MembershipSlack = { post: async (t) => (slack.push(t), '1'), update: async () => undefined, reply: async () => undefined, ephemeral: async () => undefined };
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    throw new Error(`unexpected ${url}`);
  }) as unknown as typeof fetch;
  const pub = (e = env) => ({ env: e, raffles, sponsors, fetch: f, now: () => clock, log: () => undefined });
  const post = (body: unknown, admin = false, origin = 'https://zurichjs.com') =>
    new Request('https://zurichjs.com/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, ...(admin ? { authorization: `Bearer ${ADMIN}` } : {}) },
      body: JSON.stringify(body),
    });
  const act = async (body: unknown, e = env) =>
    handleAdminRaffle(post(body, true), raffleId, {
      env: e,
      store: sponsors,
      raffles,
      fees,
      meetups: async () => [{ id: 'event-dec', title: 'Fixture', date: '2026-12-09' }],
      fetch: f,
      slack: slackFake,
      now: clock.getTime(),
      log: () => undefined,
    });
  const info = async () => (await handleRaffleInfo(new Request(`https://zurichjs.com/api/raffle/info?r=${raffleId}`), pub())).json() as Promise<Record<string, any>>;
  const enter = (body: Record<string, unknown>, origin?: string) =>
    handleEnter(post({ raffleId, name: 'Kim', email: 'kim@example.com', rules: true, ...body }, false, origin), pub());
  const tokenOf = (mail: { text: string }) => /#t=([A-Za-z0-9_-]+)/.exec(mail.text)![1]!;

  beforeEach(async () => {
    clock = new Date('2026-12-01T10:00:00Z');
    sponsors = memoryStore({ now: () => clock });
    raffles = memoryRaffleStore({ now: () => clock });
    fees = memoryFeeStore();
    emails = [];
    slack = [];
    resetRateLimits();
    const { sponsor, contact } = await sponsors.create(
      {
        companyName: 'Acme AG',
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
      },
      { email: ana.email, name: 'Ana', role: 'primary' },
      board,
    );
    const r = await raffles.create(
      {
        sponsorId: sponsor.id,
        eventId: 'event-dec',
        eventTitle: 'ZurichJS Meetup December',
        eventDate: '2026-12-09',
        prize: 'Mechanical keyboard',
        quantity: 1,
        budgetMinor: 50_000,
        fulfilment: 'zurichjs',
      },
      { kind: 'sponsor', id: ana.id },
    );
    await raffles.offer(r.id, { from: 'proposed', amountMinor: 50_000, quoteId: null, termsVersion: 't-1', actor: board });
    await raffles.accept(r.id, { version: 't-1', contactId: contact.id, actor: { kind: 'sponsor', id: ana.id } });
    await raffles.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: board });
    await raffles.moveStage(r.id, { from: 'offered', to: 'ready', actor: board });
    raffleId = r.id;
  });

  it('resumes the paused entry stage with the original rules and cutoff', async () => {
    await act({ action: 'ledger', kind: 'prize_purchase', amountChf: 200, note: 'Fixture receipt' });
    await act({ action: 'open', closesAt: '2026-12-09T19:30:00Z' });
    const open = (await raffles.get(raffleId))!;
    expect((await act({ action: 'hold', reason: 'Check the host' })).status).toBe(200);
    expect((await act({ action: 'resume' })).status).toBe(409);
    await act({ action: 'clear_flag', flag: 'refund_review' });
    expect((await act({ action: 'resume' })).status).toBe(200);
    expect(await raffles.get(raffleId)).toMatchObject({ stage: 'open', rulesVersion: open.rulesVersion, closesAt: open.closesAt, openedAt: open.openedAt });
  });

  it('retries entry mail and recovers a private link without revealing which addresses entered', async () => {
    await act({ action: 'open', closesAt: '2026-12-09T19:30:00Z' });
    const body = { raffleId, name: 'Kim', email: 'kim@example.com', rules: true };
    const failed = await handleEnter(post(body), { ...pub(), fetch: async () => new Response('', { status: 503 }) });
    expect(failed.status).toBe(200);
    expect(await raffles.entryCounts(raffleId)).toMatchObject({ total: 1 });
    await deliverRaffleMail(env, raffles, sponsors, 'https://zurichjs.com', { fetch: f });
    expect(emails).toHaveLength(1);
    const original = tokenOf(emails[0]!);
    const known = await enter({ action: 'recover' });
    const unknown = await enter({ action: 'recover', email: 'other@example.com' });
    expect([known.status, await known.json()]).toEqual([unknown.status, await unknown.json()]);
    await deliverRaffleMail(env, raffles, sponsors, 'https://zurichjs.com', { fetch: f });
    expect(emails).toHaveLength(2);
    const replacement = tokenOf(emails[1]!);
    expect(replacement).not.toBe(original);
    expect((await handleManage(post({ action: 'view', token: replacement }), pub())).status).toBe(200);
  });

  it('opens under approved rules, takes entries until closing, confirms by click, draws once, and keeps entrants private', async () => {
    // Not public before entries open; not openable without the entrant rules.
    expect((await handleRaffleInfo(new Request(`https://zurichjs.com/api/raffle/info?r=${raffleId}`), pub())).status).toBe(404);
    expect((await act({ action: 'open', closesAt: '2026-12-09T19:30:00Z' }, base)).status).toBe(409);
    expect((await act({ action: 'open', closesAt: '2026-11-30T19:30:00Z' })).status).toBe(400);
    expect((await act({ action: 'open', closesAt: '2026-12-10T19:30:00Z' })).status).toBe(400);
    const opened = (await (await act({ action: 'open', closesAt: '2026-12-09T19:30:00Z' })).json()) as Record<string, any>;
    expect(opened.raffle).toMatchObject({ stage: 'open', rulesVersion: 'rules-2026-12', entryUrl: `https://zurichjs.com/raffle?r=${raffleId}` });
    expect((await info()).raffle).toMatchObject({
      state: 'open',
      sponsorName: 'Acme AG',
      prize: 'Mechanical keyboard',
      rulesUrl: 'https://zurichjs.com/raffle-rules',
      winningCodes: [],
    });

    // Validation, the honeypot, the rules box, the site's origin.
    expect((await enter({ name: '' })).status).toBe(400);
    expect((await enter({ email: 'nope' })).status).toBe(400);
    expect((await enter({ rules: false })).status).toBe(400);
    expect((await enter({}, 'https://evil.example')).status).toBe(403);
    expect((await enter({ company: 'bot' })).status).toBe(200);
    expect(emails).toEqual([]);

    // Entering: the email has the claim code and the entrant's own link. A repeat answers the same, with no second email.
    expect((await enter({})).status).toBe(200);
    expect(emails).toHaveLength(1);
    expect(emails[0]!.to).toEqual(['kim@example.com']);
    const code = /claim code[^A-Z0-9]*([A-Z2-9]{6})\b/i.exec(emails[0]!.text)![1]!;
    expect((await enter({ email: 'KIM@example.com', name: 'Kim again' })).status).toBe(200);
    expect(emails).toHaveLength(1);
    for (const [i, who] of ['lee', 'max'].entries()) {
      clock = new Date(clock.getTime() + 60_000 * (i + 1));
      await enter({ name: who, email: `${who}@example.com` });
    }

    // The entrant's link: view does not verify, Confirm does; a wrong token is refused.
    const token = tokenOf(emails[0]!);
    const view = (await (await handleManage(post({ token, action: 'view' }), pub())).json()) as Record<string, any>;
    expect(view.entry).toMatchObject({ name: 'Kim', claimCode: code, verified: false });
    const confirmed = (await (await handleManage(post({ token, action: 'confirm' }), pub())).json()) as Record<string, any>;
    expect(confirmed.entry.verified).toBe(true);
    expect((await handleManage(post({ token: 'x'.repeat(43), action: 'view' }), pub())).status).toBe(404);

    // The sponsor sees counts, never entrants.
    const mine = (await (
      await handleRaffles(new Request('https://zurichjs.com/x'), { env, store: sponsors, raffles, fees, session: async () => ana, now: () => clock })
    ).json()) as Record<string, any>;
    expect(mine.raffles[0]).toMatchObject({ entries: 3, winningCode: null });
    expect(JSON.stringify(mine)).not.toMatch(/kim@|lee@|max@/);

    // After the closing time nothing more counts.
    clock = new Date('2026-12-09T19:30:00Z');
    expect((await enter({ name: 'Late', email: 'late@example.com' })).status).toBe(409);
    expect((await info()).raffle.state).toBe('closed');

    // Close (counts to Slack), then draw once.
    expect((await act({ action: 'draw' })).status).toBe(409);
    await act({ action: 'close' });
    expect(slack.at(-1)).toContain('3 entries');
    const drawn = (await (await act({ action: 'draw' })).json()) as Record<string, any>;
    expect(drawn.raffle).toMatchObject({ stage: 'drawn', draws: [{ seq: 1, eligibleCount: 3, reason: null }] });
    const winner = drawn.raffle.draws[0];
    expect(emails.at(-1)!.to).toEqual([winner.email]);
    expect(emails.at(-1)!.subject).toBe(`Your claim code ${winner.claimCode} was drawn`);
    const mailsAfterDraw = emails.length;
    const again = (await (await act({ action: 'draw' })).json()) as Record<string, any>;
    expect(again.raffle.draws).toHaveLength(1);
    expect(emails.length).toBe(mailsAfterDraw);
    // The public page shows the claim code only.
    const pubInfo = await info();
    expect(pubInfo.raffle).toMatchObject({ state: 'drawn', winningCodes: [winner.claimCode] });
    expect(JSON.stringify(pubInfo)).not.toContain(winner.email);

    // Redraw: a reason, a new winner, the history kept; then fulfilment.
    expect((await act({ action: 'redraw' })).status).toBe(400);
    expect((await act({ action: 'expire', seq: 1 })).status).toBe(200);
    const redrawn = (await (await act({ action: 'redraw', afterSeq: 1, reason: 'No reply within 7 days, as the rules say' })).json()) as Record<string, any>;
    expect(redrawn.raffle.draws.map((d: Record<string, unknown>) => [d.seq, d.eligibleCount])).toEqual([
      [1, 3],
      [2, 2],
    ]);
    const afterRedraw = emails.length;
    const replay = await act({ action: 'redraw', afterSeq: 1, reason: 'No reply within 7 days, as the rules say' });
    expect(replay.status).toBe(200);
    expect(await raffles.draws(raffleId)).toHaveLength(2);
    expect(emails).toHaveLength(afterRedraw);
    expect(redrawn.raffle.draws[1].email).not.toBe(winner.email);
    expect((await info()).raffle.winningCodes).toEqual([redrawn.raffle.draws[1].claimCode]);
    expect((await act({ action: 'fulfil' })).status).toBe(400);
    expect((await act({ action: 'claim', seq: 2 })).status).toBe(200);
    expect(((await (await act({ action: 'fulfil', seq: 2, note: 'Handed over at the meetup' })).json()) as Record<string, any>).raffle.stage).toBe('fulfilled');

    // Slack never names or emails an entrant.
    expect(slack.join('\n')).not.toMatch(/@example\.com|Kim|lee|max/);
  });
});
