import { describe, expect, it, vi } from 'vitest';
import type { Event } from '@zurichjs/events';
import { attachSane, saneConfig, type RawEvent } from '../src/index.ts';

const ev = (id: string): Event => ({ id, slug: `slug-${id}`, title: id, status: 'scheduled', description: '', agenda: [], practical: [], photos: [] });
const raw = (id: string, sane?: RawEvent['sane']): RawEvent => ({ _id: id, id: `slug-${id}`, sane });
const linked = raw('a', { organization: 'zurichjs', event: 'november-2026' });

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const saneAnswer = (state: string) => json({ event: { path: '/events/zurichjs/meetups/november-2026' }, registration: { state, capacity: 80, issued: 12 } });

describe('attachSane', () => {
  it('reads the public event and attaches its link and state', async () => {
    const fetchImpl = vi.fn(async () => saneAnswer('open'));
    const [a] = await attachSane([ev('a')], [linked], {}, { fetchImpl, log: () => {} });
    expect(fetchImpl).toHaveBeenCalledWith('https://api.sane.events/v1/public/events/zurichjs/november-2026', expect.anything());
    expect(a!.sane).toEqual({ url: 'https://sane.events/events/zurichjs/meetups/november-2026', state: 'open' });
  });

  it('uses SANE_API_URL and SANE_WEB_URL', async () => {
    const fetchImpl = vi.fn(async () => saneAnswer('sold_out'));
    const env = { SANE_API_URL: 'http://localhost:8787/', SANE_WEB_URL: 'http://localhost:3000' };
    const [a] = await attachSane([ev('a')], [linked], env, { fetchImpl, log: () => {} });
    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8787/v1/public/events/zurichjs/november-2026', expect.anything());
    expect(a!.sane).toEqual({ url: 'http://localhost:3000/events/zurichjs/meetups/november-2026', state: 'sold_out' });
    expect(saneConfig({})).toEqual({ apiUrl: 'https://api.sane.events', webUrl: 'https://sane.events' });
  });

  it('only fetches events linked to Sane', async () => {
    const fetchImpl = vi.fn(async () => saneAnswer('open'));
    const events = await attachSane([ev('a'), ev('b'), ev('c')], [linked, raw('b'), raw('c', { organization: 'zurichjs', event: null })], {}, { fetchImpl, log: () => {} });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(events.map((e) => !!e.sane)).toEqual([true, false, false]);
  });

  const failures: [string, () => Promise<Response>][] = [
    ['a network error', async () => Promise.reject(new TypeError('fetch failed'))],
    ['a 404 (draft on Sane)', async () => json({ error: 'not_found' }, 404)],
    ['a body that is not JSON', async () => new Response('<html>', { status: 200 })],
    ['an answer without event.path', async () => json({ registration: { state: 'open' } })],
    ['an unknown registration state', async () => json({ event: { path: '/events/zurichjs/x' }, registration: { state: 'paused' } })],
  ];
  it.each(failures)('falls back to Meetup on %s, logging one line', async (_name, answer) => {
    const log = vi.fn();
    const [a, b] = await attachSane([ev('a'), ev('b')], [linked, raw('b')], {}, { fetchImpl: vi.fn(answer), log });
    expect(a).toEqual(ev('a'));
    expect(a!.sane).toBeUndefined();
    expect(b).toEqual(ev('b'));
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]![0]).toMatch(/^\[sane\] zurichjs\/november-2026 for event "slug-a" could not be read/);
  });
});
