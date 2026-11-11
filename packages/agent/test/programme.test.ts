/**
 * Talk proposals, speakers and the programme: tidy-up, merging duplicate speakers, putting a
 * proposal on a meetup, the running order and times, and publishing it all together safely.
 */
import { describe, expect, it } from 'vitest';
import { ChangeLog, buildTools, changeBlocks, handleButton, type SanityDoc } from '../src/index.ts';
import { NOV, fakeStore } from './fake-store.ts';

const now = () => new Date('2026-11-01T10:00:00Z');
const run = async (tools: ReturnType<typeof buildTools>, name: string, input: unknown) =>
  (tools[name]!.execute as (i: unknown, o: unknown) => Promise<Record<string, unknown>>)(input, { toolCallId: 'x', messages: [] });
const ref = (id: string) => ({ _type: 'reference', _ref: id, _key: id });

const ada: SanityDoc = {
  _id: 'spk-ada',
  _type: 'speaker',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  id: { current: 'ada-lovelace' },
  bio: 'Wrote the first program.',
  isVisible: true,
};
const ada2: SanityDoc = {
  _id: 'spk-ada2',
  _type: 'speaker',
  name: 'ada lovelace',
  email: 'ADA@example.com ',
  id: { current: 'ada-lovelace-2' },
  github: 'https://github.com/ada',
  isVisible: true,
};
const grace: SanityDoc = { _id: 'spk-grace', _type: 'speaker', name: 'Grace Hopper', email: 'grace@example.com', id: { current: 'grace-hopper' } };
const talkA: SanityDoc = { _id: 'talk-a', _type: 'talk', title: 'Engines', durationMinutes: 20, type: 'talk', speakers: [ref('spk-ada')] };
const talkB: SanityDoc = { _id: 'talk-b', _type: 'talk', title: 'Compilers', durationMinutes: 20, type: 'talk', speakers: [ref('spk-grace')] };
const event = { ...NOV, talks: [ref('talk-a'), ref('talk-b')] };
const proposal = (id: string, title: string, speaker: string, extra: Record<string, unknown> = {}): SanityDoc => ({
  _id: id,
  _type: 'talkSubmission',
  title,
  description: 'An abstract.',
  durationMinutes: 10,
  level: 'beginner',
  tags: ['js'],
  status: 'pending',
  submittedAt: '2026-10-01T10:00:00Z',
  speakers: [ref(speaker)],
  reviewNotes: 'secret notes',
  ...extra,
});

describe('talk proposals', () => {
  it('counts by status, flags likely duplicates, and keeps emails and review notes from the model', async () => {
    const f = fakeStore([
      ada,
      ada2,
      proposal('p1', 'Signals in practice', 'spk-ada'),
      proposal('p2', 'Signals in practice!', 'spk-ada', { submittedAt: '2026-10-02T10:00:00Z' }),
      proposal('p3', 'Other', 'spk-ada2', { status: 'approved' }),
    ]);
    const out = (await run(buildTools(f.store, new ChangeLog(), now), 'talkProposals', { status: 'pending' })) as {
      byStatus: Record<string, number>;
      proposals: Record<string, unknown>[];
    };
    expect(out.byStatus).toMatchObject({ pending: 2, approved: 1 });
    expect(out.proposals.map((p) => p.ref)).toEqual(['p2', 'p1']);
    expect(out.proposals[0]).toMatchObject({ speakers: ['Ada Lovelace'], likelyDuplicateOf: ['p1'] });
    expect(JSON.stringify(out)).not.toMatch(/secret notes|example\.com/);
  });

  it('tidies statuses as drafts with a note, never deleting', async () => {
    const f = fakeStore([ada, proposal('p1', 'Signals', 'spk-ada')]);
    const log = new ChangeLog();
    const out = await run(buildTools(f.store, log, now), 'updateProposals', { refs: ['p1'], status: 'rejected', note: 'Duplicate of "Signals in practice".' });
    expect(out).toMatchObject({ updated: ['Signals'], draft: true });
    expect(f.draftOf('p1')).toMatchObject({ status: 'rejected', reviewNotes: expect.stringContaining('secret notes') });
    expect(String(f.draftOf('p1')!.reviewNotes)).toContain('Duplicate of');
    expect(f.calls.some((c) => c.startsWith('discard') || c.startsWith('publish'))).toBe(false);
  });

  it('puts a proposal on a meetup: a new talk (weak until published), second in the running order, proposal scheduled', async () => {
    const f = fakeStore([ada, talkA, talkB, event, proposal('p1', 'Signals', 'spk-ada')]);
    const log = new ChangeLog();
    const out = await run(buildTools(f.store, log, now), 'scheduleProposal', { proposal: 'p1', event: 'zurichjs-meetup-november-2026', position: 2 });
    expect(out).toMatchObject({ createdTalk: true, runningOrder: ['1. Engines', '2. Signals', '3. Compilers'] });
    const talkId = String(out.talk);
    expect(f.draftOf(talkId)).toMatchObject({
      title: 'Signals',
      durationMinutes: 10,
      type: 'lightning',
      level: 'Beginner',
      description: 'An abstract.',
      speakers: [expect.objectContaining({ _ref: 'spk-ada' })],
    });
    const talks = f.draftOf('evt-nov')!.talks as { _ref: string; _weak?: boolean }[];
    expect(talks.map((t) => t._ref)).toEqual(['talk-a', talkId, 'talk-b']);
    expect(talks[1]).toMatchObject({ _weak: true, _strengthenOnPublish: { type: 'talk' } });
    expect(f.draftOf('p1')).toMatchObject({ status: 'scheduled', convertedToTalk: true, talkReference: expect.objectContaining({ _ref: talkId }) });
    expect(
      log
        .list()
        .map((c) => c.type)
        .sort(),
    ).toEqual(['events', 'talk', 'talkSubmission']);

    // Publish all: talk before event, the weak reference made strong, readiness checked first.
    const r = await handleButton('publish', { items: log.list().map((c) => ({ id: c.id, type: c.type })) }, 'U1', new Set(['U1']), f.store);
    expect(r.ok).toBe(true);
    const order = f.calls.filter((c) => c.startsWith('publish')).map((c) => c.split(' ')[1]);
    expect(order.indexOf(`drafts.${talkId}`)).toBeLessThan(order.indexOf('drafts.evt-nov'));
    const live = f.published().find((d) => d._id === 'evt-nov')!.talks as Record<string, unknown>[];
    expect(live[1]).not.toHaveProperty('_weak');
  });

  it('shows one Publish all button for several drafts', () => {
    const blocks = changeBlocks(
      'Done',
      [
        { id: 'a', type: 'talk', title: 'Talk: A', created: true, fields: [] },
        { id: 'b', type: 'events', title: 'Nov', created: false, fields: [] },
      ],
      { studioUrl: 'https://studio' },
    );
    const actions = blocks.filter((b) => (b as { type: string }).type === 'actions');
    expect(actions).toHaveLength(1);
    expect(JSON.stringify(actions[0])).toContain('Publish all 2');
  });
});

describe('speakers', () => {
  it('finds profiles of the same person by name and email, without showing the email', async () => {
    const f = fakeStore([ada, ada2, grace, talkA]);
    const out = (await run(buildTools(f.store, new ChangeLog(), now), 'findSpeakers', { duplicates: true })) as unknown as {
      sameBy: string[];
      profiles: { ref: string; talks: number }[];
    }[];
    expect(out).toHaveLength(1);
    expect(out[0]!.sameBy.sort()).toEqual(['email', 'name']);
    expect(out[0]!.profiles.map((p) => [p.ref, p.talks])).toEqual([
      ['spk-ada', 1],
      ['spk-ada2', 0],
    ]);
    expect(JSON.stringify(out)).not.toContain('example.com');
  });

  it('merges a duplicate: references repointed, gaps filled, old URL redirects, duplicate hidden not deleted', async () => {
    const f = fakeStore([ada, ada2, talkA, proposal('p1', 'Signals', 'spk-ada2')]);
    const log = new ChangeLog();
    const out = await run(buildTools(f.store, log, now), 'mergeSpeakers', { keep: 'spk-ada', duplicates: ['spk-ada2'] });
    expect(out).toMatchObject({ kept: 'Ada Lovelace', repointed: ['Signals'], filledIn: ['github'], oldUrlsRedirect: ['ada-lovelace-2'] });
    expect((f.draftOf('p1')!.speakers as { _ref: string }[]).map((r) => r._ref)).toEqual(['spk-ada']);
    expect(f.draftOf('spk-ada')).toMatchObject({ github: 'https://github.com/ada', legacySlugs: ['ada-lovelace-2'], bio: 'Wrote the first program.' });
    expect(f.draftOf('spk-ada2')).toMatchObject({ isVisible: false });
    expect(f.calls.some((c) => c.startsWith('discard'))).toBe(false);
  });
});

describe('spam profiles', () => {
  it('hides a spam profile without copying anything from it', async () => {
    const spam: SanityDoc = { _id: 'spk-x', _type: 'speaker', name: '"><script>alert(1)</script>', bio: '<script>', id: { current: 'x' }, linkedin: 'https://linkedin.com/in/ada' };
    const f = fakeStore([{ ...ada, bio: '' }, spam]);
    const out = await run(buildTools(f.store, new ChangeLog(), now), 'mergeSpeakers', { keep: 'spk-ada', duplicates: ['spk-x'], fillGaps: false });
    expect(out).toMatchObject({ filledIn: [], oldUrlsRedirect: [] });
    expect(f.draftOf('spk-ada') ?? {}).not.toHaveProperty('linkedin');
    expect(f.draftOf('spk-x')).toMatchObject({ isVisible: false });
  });
});

describe('programme', () => {
  it('shows an event’s talks in running order, with the estimated schedule when there is no agenda', async () => {
    const f = fakeStore([ada, grace, talkA, talkB, event]);
    const out = (await run(buildTools(f.store, new ChangeLog(), now), 'getEvent', { slug: 'zurichjs-meetup-november-2026' })) as { programme: Record<string, unknown> };
    expect(out.programme).toMatchObject({
      talksInRunningOrder: [expect.objectContaining({ talk: 'talk-a', title: 'Engines', speakers: ['Ada Lovelace'] }), expect.objectContaining({ title: 'Compilers' })],
      scheduleIsEstimated: true,
      agendaInSanity: false,
    });
  });

  it('reorders talks and writes the usual evening times from the start', async () => {
    const f = fakeStore([talkA, talkB, event]);
    const out = await run(buildTools(f.store, new ChangeLog(), now), 'setEventProgramme', {
      event: 'zurichjs-meetup-november-2026',
      talks: ['talk-b', 'talk-a'],
      usualEvening: true,
    });
    expect(out).toMatchObject({ draft: true, timesFrom: expect.stringContaining('usual evening') });
    const agenda = f.draftOf('evt-nov')!.agenda as { time?: string; kind?: string; talk?: { _ref: string } }[];
    // NOV starts 18:30 in Zurich: doors, welcome an hour later, talks from 19:50.
    expect(agenda.map((a) => [a.time, a.kind, a.talk?._ref])).toEqual([
      ['18:30', 'doors', undefined],
      ['19:30', 'intro', undefined],
      ['19:50', 'talk', 'talk-b'],
      ['20:15', 'talk', 'talk-a'],
      ['20:35', 'break', undefined],
      ['20:50', 'networking', undefined],
    ]);
    expect(await run(buildTools(f.store, new ChangeLog(), now), 'setEventProgramme', { event: 'zurichjs-meetup-november-2026', talks: ['nope'] })).toMatchObject({
      error: expect.stringContaining('Unknown talk'),
    });
  });

  it('changes a talk’s length', async () => {
    const f = fakeStore([talkA]);
    expect(await run(buildTools(f.store, new ChangeLog(), now), 'updateTalkDraft', { talk: 'talk-a', minutes: 10 })).toMatchObject({ changed: ['durationMinutes', 'type'] });
    expect(f.draftOf('talk-a')).toMatchObject({ durationMinutes: 10, type: 'lightning' });
  });
});
