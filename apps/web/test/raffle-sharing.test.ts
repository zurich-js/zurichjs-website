/**
 * Sharing raffle contacts with the sponsor, through the API handlers on in-memory stores: the gate
 * (off by default, per raffle by the accepted terms version), the unticked box, consent counting
 * only once the email is confirmed, withdrawal from the entrant's own link, the board narrowing a
 * release, the named recipient's reads (each narrowed to consent valid then, until expiry, only while
 * the gate is open), and erasure after the retention period. Slack gets counts only.
 */
import { memoryRaffleStore, type RaffleStore } from '@zurichjs/raffle';
import { memoryFeeStore, memoryStore, type SponsorStore } from '@zurichjs/sponsorship';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleAdminRaffle } from '../src/pages/api/membership/admin/raffles/[id]/index.ts';
import { handleRaffleSharing } from '../src/pages/api/membership/admin/raffles/[id]/sharing.ts';
import { handleEnter } from '../src/pages/api/raffle/entries.ts';
import { handleRaffleInfo } from '../src/pages/api/raffle/info.ts';
import { handleManage } from '../src/pages/api/raffle/manage.ts';
import { handleShareRead } from '../src/pages/api/sponsorship/raffles/[id]/share.ts';
import { handleRaffles } from '../src/pages/api/sponsorship/raffles/index.ts';
import type { MembershipSlack } from '../src/server/membership-slack.ts';
import { resetRateLimits } from '../src/server/rateLimit.ts';

const ADMIN = 'admin-password-for-tests';
const rules = {
  BETTER_AUTH_SECRET: 'synthetic-test-secret-for-raffle-mail-32',
  RAFFLE_TERMS_VERSION: 't-share',
  RAFFLE_TERMS_URL: 'https://example.test/terms',
  RAFFLE_RULES_VERSION: 'rules-2026-12',
  RAFFLE_RULES_URL: 'https://zurichjs.com/raffle-rules',
};
const base: Record<string, string> = { BETTER_AUTH_URL: 'https://zurichjs.com', ADMIN_PASSWORD: ADMIN, RESEND_API_KEY: 're_test', SLACK_SPONSORSHIP_CHANNEL_ID: 'C1', ...rules };
const env: Record<string, string> = {
  ...base,
  RAFFLE_SHARING_POLICY_VERSION: 'share-2026-12',
  RAFFLE_SHARING_NOTICE_URL: 'https://zurichjs.com/raffle-notice',
  RAFFLE_RETENTION_ANCHOR: 'fulfilled_or_cancelled',
  RAFFLE_RETENTION_DAYS: '90',
  RAFFLE_SHARING_TERMS_VERSION: 't-share',
};
const board = { kind: 'board', id: 'admin' } as const;
const ana = { id: 'user-ana', email: 'ana@acme.ch' };
const bob = { id: 'user-bob', email: 'bob@acme.ch' };
const PURPOSE = 'send you an invitation to their JavaScript workshop in January';

describe('sharing raffle contacts', () => {
  let sponsors: SponsorStore;
  let raffles: RaffleStore;
  let emails: { to: string[]; text: string }[];
  let slack: string[];
  let clock: Date;
  let raffleId: string;
  let anaContact: string;
  const slackFake: MembershipSlack = { post: async (t) => (slack.push(t), '1'), update: async () => undefined, reply: async () => undefined, ephemeral: async () => undefined };
  const f = (async (url: string, init: RequestInit = {}) => {
    if (url === 'https://api.resend.com/emails') {
      emails.push(JSON.parse(String(init.body)));
      return new Response('{"id":"e"}');
    }
    throw new Error(`unexpected ${url}`);
  }) as unknown as typeof fetch;
  const post = (body: unknown, admin = false) =>
    new Request('https://zurichjs.com/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://zurichjs.com', ...(admin ? { authorization: `Bearer ${ADMIN}` } : {}) },
      body: JSON.stringify(body),
    });
  const pub = (e = env) => ({ env: e, raffles, sponsors, fetch: f, now: () => clock, log: () => undefined });
  const adminDeps = (e = env) => ({
    env: e,
    store: sponsors,
    raffles,
    fees: memoryFeeStore(),
    meetups: async () => [{ id: 'event-dec', title: 'Test', date: '2026-12-09' }],
    fetch: f,
    slack: slackFake,
    now: clock.getTime(),
    log: () => undefined,
  });
  const act = (body: unknown, e = env) => handleAdminRaffle(post(body, true), raffleId, adminDeps(e));
  const sharing = async (body?: unknown, e = env) => {
    const r = await handleRaffleSharing(
      body === undefined ? new Request('https://zurichjs.com/x', { headers: { authorization: `Bearer ${ADMIN}` } }) : post(body, true),
      raffleId,
      adminDeps(e),
    );
    return { status: r.status, body: (await r.json()) as Record<string, any> };
  };
  const enter = (name: string, share: boolean) =>
    handleEnter(post({ raffleId, name, email: `${name}@example.com`, rules: true, share, noticeVersion: env.RAFFLE_SHARING_POLICY_VERSION }), pub());
  const tokenFor = (name: string) => /#t=([A-Za-z0-9_-]+)/.exec(emails.find((m) => m.to[0] === `${name}@example.com`)!.text)![1]!;
  const manage = async (name: string, action: string, e = env) =>
    (await (await handleManage(post({ token: tokenFor(name), action, noticeVersion: env.RAFFLE_SHARING_POLICY_VERSION }), pub(e))).json()) as Record<string, any>;
  const read = async (shareId: string, user = ana, e = env) => {
    const r = await handleShareRead(new Request(`https://zurichjs.com/x?s=${shareId}`), raffleId, {
      env: e,
      store: sponsors,
      raffles,
      session: async () => user,
      now: () => clock,
    });
    return { status: r.status, body: (await r.json()) as Record<string, any> };
  };

  beforeEach(async () => {
    clock = new Date('2026-12-01T10:00:00Z');
    sponsors = memoryStore({ now: () => clock });
    raffles = memoryRaffleStore({ now: () => clock });
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
    anaContact = contact.id;
    await sponsors.addContact(sponsor.id, { email: bob.email, name: 'Bob', role: 'other' }, board);
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
    await raffles.offer(r.id, { from: 'proposed', amountMinor: 50_000, quoteId: null, termsVersion: 't-share', actor: board });
    await raffles.accept(r.id, { version: 't-share', contactId: contact.id, actor: { kind: 'sponsor', id: ana.id } });
    await raffles.setFunding(r.id, { from: 'unpaid', to: 'paid', actor: board });
    await raffles.moveStage(r.id, { from: 'offered', to: 'ready', actor: board });
    raffleId = r.id;
  });

  it('shares only verified, unwithdrawn consent, narrowed by the board and again on every read, with the recipient only', async () => {
    const open = { action: 'open', closesAt: '2026-12-09T19:30:00Z', sharing: { purpose: PURPOSE, privacyUrl: 'https://acme.example/privacy' } };
    // The gate is off by default, and per raffle the accepted terms must cover sharing.
    expect((await act(open, base)).status).toBe(409);
    expect((await act(open, { ...env, RAFFLE_SHARING_TERMS_VERSION: 't-other' })).status).toBe(409);
    expect((await act({ ...open, sharing: { purpose: 'short', privacyUrl: 'https://acme.example/privacy' } })).status).toBe(400);
    expect((await act(open)).status).toBe(200);
    const info = (await (await handleRaffleInfo(new Request(`https://zurichjs.com/api/raffle/info?r=${raffleId}`), pub())).json()) as Record<string, any>;
    expect(info.raffle.sharing).toEqual({
      version: env.RAFFLE_SHARING_POLICY_VERSION,
      purpose: PURPOSE,
      sponsorPrivacyUrl: 'https://acme.example/privacy',
      noticeUrl: 'https://zurichjs.com/raffle-notice',
    });

    // kim ticks the box, lee does not, max opts in later from their own link.
    await enter('kim', true);
    await enter('lee', false);
    await enter('max', false);
    expect((await sharing()).body).toMatchObject({ offered: true, counts: { given: 1, valid: 0, withdrawn: 0 }, preview: [] });
    // kim's choice counts once kim confirms the email; max's counts at once (the link proves the address).
    expect((await manage('kim', 'view')).entry.sharing).toMatchObject({ sponsorName: 'Acme AG', purpose: PURPOSE, given: true, counts: false });
    await manage('kim', 'confirm');
    expect((await manage('max', 'share')).entry.sharing).toMatchObject({ given: true, counts: true });
    const preview = (await sharing()).body;
    expect(preview.preview.map((p: Record<string, string>) => p.name)).toEqual(['kim', 'max']);
    expect(preview.recipients.map((c: Record<string, string>) => c.name)).toEqual(['Ana', 'Bob']);

    // The release: confirmed, to a confirmed contact, narrowed to valid consent (lee is dropped).
    const ids = (await raffles.entries(raffleId)).map((e) => e.id);
    const release = { action: 'release', entryIds: ids, recipientContactId: anaContact, fields: ['name', 'email'], days: 7 };
    expect((await sharing(release)).status).toBe(400);
    expect((await sharing({ ...release, confirm: true, recipientContactId: 'someone' })).status).toBe(400);
    expect((await sharing({ ...release, confirm: true, days: 60 })).status).toBe(400);
    expect((await sharing({ ...release, confirm: true })).status).toBe(409);
    const rows = preview.preview as { id: string; name: string; email: string }[];
    const record = JSON.stringify([
      raffleId,
      env.RAFFLE_SHARING_POLICY_VERSION,
      PURPOSE,
      [anaContact, 'Ana', ana.email],
      release.fields,
      release.days,
      rows.map((e) => [e.id, e.name, e.email]),
    ]);
    const released = (await sharing({ ...release, entryIds: rows.map((e) => e.id), preview: record, confirm: true })).body;
    expect(released.shares).toMatchObject([{ recipient: 'Ana', count: 2, fields: ['name', 'email'] }]);
    const shareId = released.shares[0].id as string;
    expect(slack.at(-1)).toContain('released for ZurichJS Meetup December: 2, for 7 days');

    // The sponsor sees the release in their list, and only Ana can read it.
    const list = (await (
      await handleRaffles(new Request('https://zurichjs.com/x'), { env, store: sponsors, raffles, fees: memoryFeeStore(), session: async () => ana, now: () => clock })
    ).json()) as Record<string, any>;
    expect(list.raffles[0].shares).toEqual([{ id: shareId, expiresAt: expect.any(String), count: 2 }]);
    expect((await read(shareId)).body.rows).toEqual([
      { reference: rows[0]!.id, name: 'kim', email: 'kim@example.com' },
      { reference: rows[1]!.id, name: 'max', email: 'max@example.com' },
    ]);
    expect((await read(shareId, ana, { ...env, RAFFLE_SHARING_NOTICE_URL: 'https://example.test/new' })).status).toBe(409);
    expect((await read(shareId, bob)).status).toBe(404);

    // max withdraws from the link, without an account: the next read no longer has max.
    expect((await manage('max', 'withdraw')).entry.sharing).toMatchObject({ given: false });
    expect((await read(shareId)).body.rows.map((x: Record<string, string>) => x.name)).toEqual(['kim']);
    const [task] = await raffles.deletionTasks(raffleId, anaContact);
    expect(task).toMatchObject({ shareId, entryId: rows[1]!.id, acknowledged: false });
    expect(await raffles.acknowledgeDeletion(raffleId, 'another', shareId, task!.consentId)).toBe(false);
    expect(await raffles.acknowledgeDeletion(raffleId, anaContact, shareId, task!.consentId)).toBe(true);
    // Withdrawing still works when sharing is switched off; reading does not.
    expect((await read(shareId, ana, base)).status).toBe(409);
    expect((await manage('kim', 'withdraw', base)).entry.sharing).toMatchObject({ given: false });
    expect((await read(shareId)).body.rows).toEqual([]);
    // Expired.
    clock = new Date(clock.getTime() + 8 * 86_400_000);
    expect((await read(shareId)).status).toBe(409);

    // Retention: only after the raffle ended and the period passed.
    expect((await sharing({ action: 'erase', confirm: true })).status).toBe(409);
    await act({ action: 'cancel', reason: 'Meetup cancelled' });
    expect((await sharing({ action: 'erase', confirm: true })).status).toBe(409);
    clock = new Date(clock.getTime() + 91 * 86_400_000);
    expect(await raffles.dueForErasure(clock)).toContain(raffleId);
    expect((await sharing({ action: 'erase', confirm: true }, base)).status).toBe(200);
    expect((await raffles.entries(raffleId)).map((e) => e.name)).toEqual(['Erased', 'Erased', 'Erased']);

    // Slack never names or emails an entrant.
    expect(slack.join('\n')).not.toMatch(/example\.com|kim|lee|max/);
  });

  it('never offers the box on a raffle opened without sharing', async () => {
    await act({ action: 'open', closesAt: '2026-12-09T19:30:00Z' });
    await enter('kim', true);
    expect((await sharing()).body).toMatchObject({ offered: false, counts: { given: 0 } });
    expect((await manage('kim', 'share')).error).toMatch(/does not share/);
    expect((await sharing({ action: 'release', entryIds: ['x'], recipientContactId: anaContact, fields: ['email'], days: 1, confirm: true })).status).toBe(409);
  });
});

describe('the organisers’ bot', () => {
  it('has no way to raffle entrants: neither it nor its tools import the raffle store', () => {
    for (const file of ['../src/server/sponsor-agent.ts']) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      expect(source).not.toMatch(/@zurichjs\/raffle|raffle\.ts|raffle-route|raffleStore/);
    }
  });
});
