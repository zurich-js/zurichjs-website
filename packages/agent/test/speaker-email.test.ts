/**
 * "Your talk is scheduled": the card after publishing a proposal onto a meetup (and only then), the
 * masked email, Send for publishers only, facts only from Sanity, no double send, the review note,
 * and Not now.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  ChangeLog,
  DETAILS_SOON,
  SEND_TALK_EMAIL,
  SKIP_TALK_EMAIL,
  buildTools,
  handleButton,
  handleTalkEmailClick,
  maskEmail,
  scheduledTalks,
  talkEmailCard,
  type SanityDoc,
  type ScheduledSpeaker,
  type ScheduledTalk,
  type SendOutcome,
} from '../src/index.ts';
import { NOV, fakeStore } from './fake-store.ts';

const now = () => new Date('2026-11-11T09:00:00Z');
const run = async (tools: ReturnType<typeof buildTools>, name: string, input: unknown) =>
  (tools[name]!.execute as (i: unknown, o: unknown) => Promise<Record<string, unknown>>)(input, { toolCallId: 'x', messages: [] });
const ref = (id: string) => ({ _type: 'reference', _ref: id, _key: id });

const ada: SanityDoc = { _id: 'spk-ada', _type: 'speaker', name: 'Ada Lovelace', email: 'ada@example.com', id: { current: 'ada-lovelace' } };
const talkA: SanityDoc = { _id: 'talk-a', _type: 'talk', title: 'Engines', durationMinutes: 20, type: 'talk', speakers: [ref('spk-ada')] };
const proposal = (extra: Record<string, unknown> = {}): SanityDoc => ({
  _id: 'p1',
  _type: 'talkSubmission',
  title: 'Signals',
  description: 'An abstract.',
  durationMinutes: 20,
  status: 'approved',
  speakers: [ref('spk-ada')],
  reviewNotes: 'Strong proposal.',
  ...extra,
});
const PUBLISHERS = new Set(['UORG']);

/** Schedules p1 onto the November meetup with the agent's tool, then presses Publish all. */
async function scheduleAndPublish(docs: SanityDoc[]) {
  const f = fakeStore(docs);
  const log = new ChangeLog();
  await run(buildTools(f.store, log, now), 'scheduleProposal', { proposal: 'p1', event: 'zurichjs-meetup-november-2026' });
  const r = await handleButton('publish', { items: log.list().map((c) => ({ id: c.id, type: c.type })) }, 'UORG', PUBLISHERS, f.store);
  expect(r.ok).toBe(true);
  return { f, r, talks: await scheduledTalks(r.published!, f.store) };
}

const sender = (sent = true) => {
  const send = vi.fn(async (_t: ScheduledTalk, speakers: ScheduledSpeaker[]): Promise<SendOutcome[]> => speakers.map((speaker) => ({ speaker, sent })));
  return send;
};
const value = (t: ScheduledTalk) => JSON.stringify({ s: t.submissionId, e: t.eventId });

describe('after publishing', () => {
  it('offers the email for a proposal put on a meetup, with the facts from Sanity and the email masked', async () => {
    const { talks } = await scheduleAndPublish([ada, talkA, { ...NOV, talks: [ref('talk-a')] }, proposal()]);
    expect(talks).toHaveLength(1);
    expect(talks[0]).toMatchObject({
      submissionId: 'p1',
      eventId: 'evt-nov',
      talkTitle: 'Signals',
      eventTitle: 'Forms, types and design systems',
      eventSlug: 'zurichjs-meetup-november-2026',
      date: 'Wed 18th Nov 2026',
      time: 'Starts 18:30 CET',
      venue: 'Venue AG, Hardstrasse 201, 8005 Zürich',
      speakers: [{ id: 'spk-ada', slug: 'ada-lovelace', name: 'Ada Lovelace', email: 'ada@example.com' }],
    });
    const card = talkEmailCard(talks[0]!);
    const json = JSON.stringify(card);
    expect(card.text).toBe('Let Ada Lovelace know “Signals” is on Forms, types and design systems?');
    expect(json).toContain('*Date:* Wed 18th Nov 2026');
    expect(json).toContain('*Time:* Starts 18:30 CET');
    expect(json).toContain('a•••@example.com');
    expect(json).not.toContain('ada@example.com');
    const actions = card.blocks.find((b) => (b as { type: string }).type === 'actions') as { elements: { action_id: string; style?: string; value: string }[] };
    expect(actions.elements.map((e) => [e.action_id, e.style])).toEqual([
      [SEND_TALK_EMAIL, 'primary'],
      [SKIP_TALK_EMAIL, undefined],
    ]);
    expect(actions.elements[0]!.value).not.toContain('@');
  });

  it('says doors only when the agenda has a timed doors line', async () => {
    const ev = { ...NOV, talks: [], agenda: [{ _key: 'a', time: '18:00', title: 'Doors open' }] };
    const { talks } = await scheduleAndPublish([ada, ev, proposal()]);
    expect(talks[0]!.time).toBe('Doors 18:00 CET');
  });

  it('offers nothing for other publishes: no new talk, a talk not from a proposal, a proposal not scheduled, a cancelled meetup', async () => {
    // A status change only.
    const f = fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov', status: 'full' }]);
    const r = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, f.store);
    expect(await scheduledTalks(r.published!, f.store)).toEqual([]);

    // A talk added to the running order by hand, with no proposal behind it.
    const g = fakeStore([ada, talkA, { ...NOV, talks: [] }, { ...NOV, _id: 'drafts.evt-nov', talks: [ref('talk-a')] }]);
    const r2 = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, g.store);
    expect(await scheduledTalks(r2.published!, g.store)).toEqual([]);

    // The proposal points at the talk but is not scheduled (someone changed it back).
    const h = fakeStore([
      ada,
      talkA,
      proposal({ status: 'approved', talkReference: ref('talk-a') }),
      { ...NOV, talks: [] },
      { ...NOV, _id: 'drafts.evt-nov', talks: [ref('talk-a')] },
    ]);
    const r3 = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, h.store);
    expect(await scheduledTalks(r3.published!, h.store)).toEqual([]);

    // The talk was already on the meetup before this publish.
    const k = fakeStore([
      ada,
      talkA,
      proposal({ status: 'scheduled', talkReference: ref('talk-a') }),
      { ...NOV, talks: [ref('talk-a')] },
      { ...NOV, _id: 'drafts.evt-nov', status: 'full', talks: [ref('talk-a')] },
    ]);
    const r4 = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, k.store);
    expect(await scheduledTalks(r4.published!, k.store)).toEqual([]);

    // Discard publishes nothing.
    expect(
      (await handleButton('discard', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov' }]).store)).published,
    ).toBeUndefined();
  });

  it('offers a card for a scheduled proposal even when only the event is published', async () => {
    const f = fakeStore([
      ada,
      talkA,
      proposal({ status: 'scheduled', talkReference: ref('talk-a') }),
      { ...NOV, talks: [] },
      { ...NOV, _id: 'drafts.evt-nov', talks: [ref('talk-a')] },
    ]);
    const r = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, f.store);
    expect((await scheduledTalks(r.published!, f.store)).map((t) => t.talkTitle)).toEqual(['Engines']);
  });

  it('has no Send button when the speaker has no email in Sanity', async () => {
    const { talks } = await scheduleAndPublish([{ ...ada, email: '' }, { ...NOV, talks: [] }, proposal()]);
    const card = talkEmailCard(talks[0]!);
    const json = JSON.stringify(card);
    expect(json).toContain('no email in Sanity');
    expect(json).toContain('No email for the speaker in Sanity');
    expect(card.blocks.some((b) => (b as { type: string }).type === 'actions')).toBe(false);
  });

  it('says the details follow instead of inventing a date, time or venue', async () => {
    const bare = { ...NOV, talks: [], datetime: undefined, venue: undefined, location: undefined, address: undefined };
    const f = fakeStore([ada, talkA, proposal({ status: 'scheduled', talkReference: ref('talk-a') }), bare, { ...bare, _id: 'drafts.evt-nov', talks: [ref('talk-a')] }]);
    // The readiness check would stop a scheduled event without a date, so publish a TBC one.
    await f.store.patchDraft('drafts.evt-nov', { status: 'tbc', dateText: 'November 2026' });
    const r = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', PUBLISHERS, f.store);
    expect(r.ok).toBe(true);
    const [t] = await scheduledTalks(r.published!, f.store);
    expect(t).toMatchObject({ date: null, time: null, venue: null });
    const json = JSON.stringify(talkEmailCard(t!));
    expect(json.split(DETAILS_SOON).length - 1).toBe(3);
  });

  it('escapes Slack mrkdwn in titles and names', async () => {
    const { talks } = await scheduleAndPublish([{ ...ada, name: 'Ada <@U123> & co' }, { ...NOV, title: 'Nov <!channel>', talks: [] }, proposal({ title: 'A > B' })]);
    const json = JSON.stringify(talkEmailCard(talks[0]!));
    expect(json).toContain('Ada &lt;@U123&gt; &amp; co');
    expect(json).toContain('Nov &lt;!channel&gt;');
    expect(json).toContain('A &gt; B');
    expect(json).not.toContain('<!channel>');
  });
});

describe('the buttons', () => {
  it('masks emails', () => {
    expect(maskEmail('ada@example.com')).toBe('a•••@example.com');
    expect(maskEmail('x@y.ch')).toBe('x•••@y.ch');
    expect(maskEmail('nonsense')).toBe('•••');
  });

  it('only publishers can send', async () => {
    const { f, talks } = await scheduleAndPublish([ada, { ...NOV, talks: [] }, proposal()]);
    const send = sender();
    const out = await handleTalkEmailClick({ action: SEND_TALK_EMAIL, value: value(talks[0]!), user: 'USOMEONE', publishers: PUBLISHERS, store: f.store, send, now });
    expect(out.message).toContain('only organisers on the publish list');
    expect(out.card).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends, appends the review note (published), and rewrites the card; a second press sends nothing', async () => {
    const { f, talks } = await scheduleAndPublish([ada, { ...NOV, talks: [] }, proposal()]);
    const send = sender();
    const out = await handleTalkEmailClick({ action: SEND_TALK_EMAIL, value: value(talks[0]!), user: 'UORG', publishers: PUBLISHERS, store: f.store, send, now });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![1].map((s) => s.email)).toEqual(['ada@example.com']);
    expect(out.card!.text).toBe('Sent to Ada Lovelace by <@UORG> on Wed 11th Nov 2026, 10:00.');
    expect(JSON.stringify(out.card)).not.toContain(SEND_TALK_EMAIL);
    const live = f.published().find((d) => d._id === 'p1')!;
    expect(live.reviewNotes).toBe('Strong proposal.\nScheduled email sent on Wed 11th Nov 2026, 10:00 by <@UORG> for Forms, types and design systems');
    expect(f.draftOf('p1')).toBeUndefined();

    const again = await handleTalkEmailClick({ action: SEND_TALK_EMAIL, value: value(talks[0]!), user: 'UORG', publishers: PUBLISHERS, store: f.store, send, now });
    expect(send).toHaveBeenCalledTimes(1);
    expect(again.card!.text).toContain('Already sent');
  });

  it('adds the note to an open draft of the proposal without publishing someone else’s changes', async () => {
    const { f, talks } = await scheduleAndPublish([ada, { ...NOV, talks: [] }, proposal()]);
    await f.store.saveDraft({ ...f.published().find((d) => d._id === 'p1')!, _id: 'drafts.p1', level: 'advanced' });
    await handleTalkEmailClick({ action: SEND_TALK_EMAIL, value: value(talks[0]!), user: 'UORG', publishers: PUBLISHERS, store: f.store, send: sender(), now });
    expect(String(f.draftOf('p1')!.reviewNotes)).toContain('Scheduled email sent on');
    expect(f.published().find((d) => d._id === 'p1')!.reviewNotes).toBe('Strong proposal.');
  });

  it('writes nothing when email is not set up', async () => {
    const { f, talks } = await scheduleAndPublish([ada, { ...NOV, talks: [] }, proposal()]);
    const out = await handleTalkEmailClick({ action: SEND_TALK_EMAIL, value: value(talks[0]!), user: 'UORG', publishers: PUBLISHERS, store: f.store, send: sender(false), now });
    expect(out.message).toContain('RESEND_API_KEY');
    expect(f.published().find((d) => d._id === 'p1')!.reviewNotes).toBe('Strong proposal.');
  });

  it('Not now closes the card without sending', async () => {
    const { f, talks } = await scheduleAndPublish([ada, { ...NOV, talks: [] }, proposal()]);
    const send = sender();
    const out = await handleTalkEmailClick({ action: SKIP_TALK_EMAIL, value: value(talks[0]!), user: 'UOTHER', publishers: PUBLISHERS, store: f.store, send, now });
    expect(out.card!.text).toBe('Not sent (<@UOTHER>).');
    expect(JSON.stringify(out.card)).not.toContain(SEND_TALK_EMAIL);
    expect(send).not.toHaveBeenCalled();
  });
});
