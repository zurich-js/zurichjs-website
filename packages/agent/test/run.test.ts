import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { runTurn, systemPrompt } from '../src/index.ts';
import { NOV, fakeStore } from './fake-store.ts';

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
const step = (content: unknown[], finish: 'tool-calls' | 'stop') => ({ content, finishReason: { unified: finish, raw: finish }, usage, warnings: [] });
const call = (id: string, toolName: string, input: unknown) => ({ type: 'tool-call', toolCallId: id, toolName, input: JSON.stringify(input) });

describe('one agent turn (scripted model, no network)', () => {
  it('finds the event, edits a draft, and returns the reply with the changes', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        step([call('1', 'findEvents', { when: 'upcoming' })], 'tool-calls'),
        step([call('2', 'updateEventDraft', { slug: 'zurichjs-meetup-november-2026', status: 'full' })], 'tool-calls'),
        step([{ type: 'text', text: 'Marked the November meetup as full (draft).' }], 'stop'),
      ] as never,
    });
    const f = fakeStore([NOV]);
    const r = await runTurn({ model, store: f.store, messages: [{ role: 'user', content: '<@U1>: the next meetup is full' }], now: () => new Date('2026-11-01T10:00:00Z') });
    expect(r.text).toBe('Marked the November meetup as full (draft).');
    expect(r.changes).toEqual([expect.objectContaining({ id: 'evt-nov', fields: [{ field: 'status', before: 'scheduled', after: 'full' }] })]);
    expect(f.draftOf('evt-nov')).toMatchObject({ status: 'full' });
    expect(model.doGenerateCalls).toHaveLength(3);
    // The instructions travel with every call.
    expect(JSON.stringify(model.doGenerateCalls[0]!.prompt)).toContain('You only ever write DRAFTS');
  });

  it('stops after the step limit', async () => {
    const model = new MockLanguageModelV4({ doGenerate: () => Promise.resolve(step([call('x', 'findEvents', { when: 'all' })], 'tool-calls')) as never });
    const r = await runTurn({ model, store: fakeStore([NOV]).store, messages: [{ role: 'user', content: 'loop' }], maxSteps: 3 });
    expect(model.doGenerateCalls).toHaveLength(3);
    expect(r.text).toMatch(/could not finish/);
  });
});

describe('instructions', () => {
  it('include today in Zurich, the drafts-only rule and the playbooks', () => {
    const p = systemPrompt(new Date('2026-11-01T10:00:00Z'));
    expect(p).toContain('Today is Sunday, 1 November 2026');
    expect(p).toContain('You cannot publish or delete');
    expect(p).toContain('# New event');
    expect(p).toContain('# Edit event');
  });
});
