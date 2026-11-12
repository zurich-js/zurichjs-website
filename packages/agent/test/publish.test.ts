import { describe, expect, it } from 'vitest';
import { handleButton } from '../src/index.ts';
import { NOV, fakeStore } from './fake-store.ts';

const publishers = new Set(['UORG']);

describe('Slack buttons', () => {
  it('publishes a ready draft for an organiser on the list', async () => {
    const f = fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov', status: 'full' }]);
    const r = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', publishers, f.store);
    expect(r.ok).toBe(true);
    expect(f.calls).toContain('publish drafts.evt-nov');
    expect(f.published()[0]).toMatchObject({ status: 'full' });
  });
  it('refuses people who are not on the publish list', async () => {
    const f = fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov' }]);
    const r = await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'USOMEONE', publishers, f.store);
    expect(r).toMatchObject({ ok: false, message: expect.stringContaining('only organisers') });
    expect(f.calls.some((c) => c.startsWith('publish'))).toBe(false);
  });
  it('refuses a draft that is not ready, and says what is missing', async () => {
    const f = fakeStore([{ ...NOV, _id: 'drafts.evt-dec', meetupUrl: undefined, description: 'Short' }]);
    const r = await handleButton('publish', { id: 'evt-dec', type: 'events' }, 'UORG', publishers, f.store);
    expect(r.message).toBe('Not published: the page still needs Description (50+ characters), Meetup event link.');
    expect(f.calls.some((c) => c.startsWith('publish'))).toBe(false);
  });
  it('discards only the draft; the live document stays', async () => {
    const f = fakeStore([NOV, { ...NOV, _id: 'drafts.evt-nov', status: 'cancelled' }]);
    const r = await handleButton('discard', { id: 'evt-nov', type: 'events' }, 'USOMEONE', publishers, f.store);
    expect(r.ok).toBe(true);
    expect(f.published()[0]).toMatchObject({ status: 'scheduled' });
    expect(f.draftOf('evt-nov')).toBeUndefined();
  });
  it('says so when the draft is already gone', async () => {
    const f = fakeStore([NOV]);
    expect((await handleButton('publish', { id: 'evt-nov', type: 'events' }, 'UORG', publishers, f.store)).ok).toBe(false);
  });
});
