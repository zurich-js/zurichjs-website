import { describe, expect, it } from 'vitest';
import { ChangeLog, buildTools, helpText, isHelpRequest, zurichToUtcIso } from '../src/index.ts';
import { NOV, SEP, fakeStore } from './fake-store.ts';

const now = () => new Date('2026-11-01T10:00:00Z');
const run = async (tools: ReturnType<typeof buildTools>, name: string, input: unknown) =>
  (tools[name]!.execute as (i: unknown, o: unknown) => Promise<unknown>)(input, { toolCallId: 'x', messages: [] });

describe('agent tools write drafts only', () => {
  it('finds upcoming events with the soonest first', async () => {
    const f = fakeStore([NOV, SEP]);
    const out = (await run(buildTools(f.store, new ChangeLog(), now), 'findEvents', { when: 'upcoming' })) as { slug: string }[];
    expect(out.map((e) => e.slug)).toEqual(['zurichjs-meetup-november-2026']);
  });

  it('changes the venue in a draft copied from the published event, keeps legacy fields in sync, and logs before → after', async () => {
    const f = fakeStore([NOV]);
    const log = new ChangeLog();
    const res = await run(buildTools(f.store, log, now), 'updateEventDraft', {
      slug: 'zurichjs-meetup-november-2026',
      venue: { name: 'Smallpdf AG', street: 'Steinstrasse 21', zip: '8003' },
    });
    expect(res).toMatchObject({ draft: true, changed: ['venue', 'location', 'address'] });
    expect(f.published()[0]).toMatchObject({ location: 'Venue AG' }); // live page untouched
    expect(f.draftOf('evt-nov')).toMatchObject({
      title: NOV.title,
      location: 'Smallpdf AG',
      address: 'Steinstrasse 21, 8003 Zürich',
      venue: { name: 'Smallpdf AG', city: 'Zürich' },
    });
    expect(f.draftOf('evt-nov')!._rev).toBeUndefined();
    const [c] = log.list();
    expect(c).toMatchObject({ id: 'evt-nov', slug: 'zurichjs-meetup-november-2026', created: false });
    expect(c!.fields.find((x) => x.field === 'venue')!.before).toMatchObject({ name: 'Venue AG' });
    expect(f.calls.some((x) => x.startsWith('publish'))).toBe(false);
  });

  it('patches an existing draft instead of overwriting it, and reports no-op changes', async () => {
    const f = fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov', status: 'full' }]);
    const tools = buildTools(f.store, new ChangeLog(), now);
    expect(await run(tools, 'updateEventDraft', { slug: 'zurichjs-meetup-november-2026', status: 'full' })).toEqual({ unchanged: true });
    await run(tools, 'updateEventDraft', { slug: 'zurichjs-meetup-november-2026', status: 'cancelled' });
    expect(f.calls).toContain('patchDraft drafts.evt-nov');
    expect(f.draftOf('evt-nov')).toMatchObject({ status: 'cancelled' });
  });

  it('converts the Zurich start time to UTC (winter and summer time)', async () => {
    expect(zurichToUtcIso('2026-12-09', '18:30')).toBe('2026-12-09T17:30:00.000Z');
    expect(zurichToUtcIso('2026-06-17', '18:30')).toBe('2026-06-17T16:30:00.000Z');
    const f = fakeStore([NOV]);
    await run(buildTools(f.store, new ChangeLog(), now), 'updateEventDraft', { slug: 'zurichjs-meetup-november-2026', doorsTime: '19:00' });
    expect(f.draftOf('evt-nov')).toMatchObject({ datetime: '2026-11-18T18:00:00.000Z' });
  });

  it('never invents a start time when only a date is given for a new event', async () => {
    const f = fakeStore([NOV]);
    await expect(
      run(buildTools(f.store, new ChangeLog(), now), 'createEventDraft', { slug: 'zurichjs-meetup-january-2027', title: 'January meetup', date: '2027-01-20' }),
    ).rejects.toThrow(/start time/);
    expect(f.draftOf('zurichjs-meetup-january-2027')).toBeUndefined();
  });

  it('creates a new event as a draft with a fresh id, and says what the page still needs', async () => {
    const f = fakeStore([NOV]);
    const log = new ChangeLog();
    const res = (await run(buildTools(f.store, log, now), 'createEventDraft', {
      slug: 'zurichjs-meetup-december-2026',
      title: 'December meetup',
      date: '2026-12-09',
      doorsTime: '18:30',
    })) as { missingBeforePublishing: string[] };
    expect(res.missingBeforePublishing).toEqual(['Description (50+ characters)', 'Venue', 'Programme (talks or agenda)', 'Meetup event link']);
    const draft = [...f.db.values()].find((d) => (d.id as { current: string }).current === 'zurichjs-meetup-december-2026')!;
    expect(draft._id).toMatch(/^drafts\./);
    expect(draft).toMatchObject({ status: 'scheduled', datetime: '2026-12-09T17:30:00.000Z' });
    expect(log.list()[0]).toMatchObject({ created: true, slug: 'zurichjs-meetup-december-2026' });
  });

  it('refuses a slug that already exists, and offers no publish, delete or slug-change tool', async () => {
    const f = fakeStore([NOV]);
    const tools = buildTools(f.store, new ChangeLog(), now);
    expect(await run(tools, 'createEventDraft', { slug: 'zurichjs-meetup-november-2026', title: 'Again' })).toMatchObject({ error: expect.stringContaining('already exists') });
    expect(Object.keys(tools).sort()).toEqual([
      'createEventDraft',
      'findEvents',
      'findSpeakers',
      'findTalks',
      'findVenuesUsedBefore',
      'getEvent',
      'mergeSpeakers',
      'scheduleProposal',
      'setEventProgramme',
      'talkProposals',
      'updateEventDraft',
      'updateProposals',
      'updateSupportNote',
      'updateTalkDraft',
    ]);
    // There is no field to change the slug; extra keys are dropped by the schema before execute runs.
    const schema = tools.updateEventDraft!.inputSchema as { parse: (v: unknown) => Record<string, unknown> };
    expect(schema.parse({ slug: 'zurichjs-meetup-november-2026', id: { current: 'new-url' }, title: 'New title' })).toEqual({
      slug: 'zurichjs-meetup-november-2026',
      title: 'New title',
    });
  });

  it('getEvent lists what is missing before publishing', async () => {
    const f = fakeStore([{ ...NOV, meetupUrl: undefined }]);
    const out = (await run(buildTools(f.store, new ChangeLog(), now), 'getEvent', { slug: 'zurichjs-meetup-november-2026' })) as {
      missingBeforePublishing: string[];
      when: string;
    };
    expect(out.when).toBe('Wed 18th Nov 2026, 18:30');
    expect(out.missingBeforePublishing).toEqual([expect.stringContaining('Meetup event link')]);
  });
});

describe('read tools: venues, more events, talk proposals, help', () => {
  const tools = (docs: Parameters<typeof fakeStore>[0]) => buildTools(fakeStore(docs).store, new ChangeLog(), now);
  const aug = { ...SEP, _id: 'evt-aug', id: { _type: 'slug', current: 'zurichjs-meetup-august-2026' }, title: 'Workers', datetime: '2026-08-19T16:30:00.000Z' };

  it('says which meetups used a venue, newest first', async () => {
    const out = (await run(tools([NOV, SEP, aug]), 'findVenuesUsedBefore', { name: 'old' })) as { name: string; timesUsed: number; usedBy: { slug: string }[] }[];
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'Old Office', timesUsed: 2 });
    expect(out[0]!.usedBy.map((u) => u.slug)).toEqual(['zurichjs-meetup-september-2026', 'zurichjs-meetup-august-2026']);
  });

  it('filters events by venue and says when more matched than the limit', async () => {
    const out = (await run(tools([NOV, SEP, aug]), 'findEvents', { when: 'past', venue: 'old', limit: 1 })) as Record<string, unknown>[];
    expect(out[0]).toMatchObject({ slug: 'zurichjs-meetup-september-2026' });
    expect(out[1]).toMatchObject({ note: expect.stringContaining('1 more matched') });
  });

  it('answers help without the model', () => {
    expect(isHelpRequest('<@U123> help')).toBe(true);
    expect(isHelpRequest('<@U123> what can you do?')).toBe(true);
    expect(isHelpRequest('<@U123> help me change the venue')).toBe(false);
    expect(helpText(true)).toContain('Membership');
    expect(helpText(false)).not.toContain('Membership');
    expect(helpText(false)).toContain('Talk proposals');
  });
});
