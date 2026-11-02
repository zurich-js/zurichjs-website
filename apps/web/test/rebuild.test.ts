import { describe, expect, it, vi } from 'vitest';
import { DEBOUNCE_MS, acceptPublish, decide, emptyState, recordPublish, tick, validSanitySignature, type RebuildState, type StateStore } from '../src/server/rebuild.ts';

const t0 = new Date('2026-11-18T10:00:00Z');
const plus = (ms: number) => new Date(t0.getTime() + ms);

/** Same scheme as @sanity/webhook's encodeSignatureHeader. */
async function sign(secret: string, t: number, body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  return `t=${t},v1=${btoa(String.fromCharCode(...sig))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')}`;
}

const memoryStore = (initial: RebuildState | null = null) => {
  let s = initial;
  const store: StateStore = { read: async () => s, write: async (n) => void (s = n) };
  return { store, get: () => s };
};

describe('debounced publish rebuilds', () => {
  it('waits until publishes stop for two minutes, then builds once', () => {
    let s = recordPublish(emptyState(), t0);
    s = recordPublish(s, plus(60_000));
    expect(s.pendingSince).toBe(t0.toISOString());
    expect(decide(s, plus(60_000 + DEBOUNCE_MS - 1), []).build).toBe(false);
    const d = decide(s, plus(60_000 + DEBOUNCE_MS), []);
    expect(d.build).toBe(true);
    expect(d.next.pendingSince).toBeUndefined();
    expect(decide(d.next, plus(10 * 60_000), []).build).toBe(false);
  });
});

describe('event state rebuilds', () => {
  const doors = '2026-11-18T17:30:00.000Z';
  it('fires once when doors pass, not before and not again', () => {
    expect(decide(emptyState(), new Date('2026-11-18T17:29:00Z'), [doors]).build).toBe(false);
    const d = decide(emptyState(), new Date('2026-11-18T17:31:00Z'), [doors]);
    expect(d.build).toBe(true);
    expect(decide(d.next, new Date('2026-11-18T17:33:00Z'), [doors]).build).toBe(false);
  });
  it('forgets fired times after a week', () => {
    const d = decide({ fired: [doors] }, new Date('2026-11-26T17:31:00Z'), []);
    expect(d.next.fired).toEqual([]);
  });
});

describe('Sanity webhook signature', () => {
  it('accepts a valid signature and rejects tampering, wrong secrets, old timestamps and junk', async () => {
    const now = Date.now();
    const h = await sign('s3cret', now, '{"_id":"x"}');
    expect(await validSanitySignature(h, '{"_id":"x"}', 's3cret', now)).toBe(true);
    expect(await validSanitySignature(h.replace(',', ', '), '{"_id":"x"}', 's3cret', now)).toBe(true);
    expect(await validSanitySignature(h, '{"_id":"y"}', 's3cret', now)).toBe(false);
    expect(await validSanitySignature(h, '{"_id":"x"}', 'other', now)).toBe(false);
    expect(await validSanitySignature(h, '{"_id":"x"}', 's3cret', now + 10 * 60_000)).toBe(false);
    expect(await validSanitySignature(null, '', 's3cret', now)).toBe(false);
    expect(await validSanitySignature('v1=abc', '', 's3cret', now)).toBe(false);
  });
});

describe('POST /api/rebuild', () => {
  const body = '{"_id":"events.abc","_type":"events"}';
  const req = async (headers: Record<string, string> = {}, method = 'POST') =>
    new Request('https://zurichjs.com/api/rebuild', method === 'POST' ? { method, body, headers } : { method, headers });

  it('records a pending build for a signed request', async () => {
    const m = memoryStore();
    const res = await acceptPublish(await req({ 'sanity-webhook-signature': await sign('s3cret', t0.getTime(), body) }), 's3cret', m.store, t0);
    expect(res.status).toBe(200);
    expect(m.get()?.pendingSince).toBe(t0.toISOString());
  });
  it('rejects unsigned requests, other methods and a missing secret without touching state', async () => {
    const m = memoryStore();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await acceptPublish(await req(), 's3cret', m.store, t0)).status).toBe(401);
    expect((await acceptPublish(await req({}, 'GET'), 's3cret', m.store, t0)).status).toBe(405);
    expect((await acceptPublish(await req(), undefined, m.store, t0)).status).toBe(503);
    expect(m.get()).toBeNull();
    err.mockRestore();
  });
});

describe('scheduled tick', () => {
  const pending = recordPublish(emptyState(), t0);
  it('triggers the build hook once and remembers it', async () => {
    const m = memoryStore(pending);
    const triggerBuild = vi.fn(async () => {});
    const reasons = await tick({ store: m.store, changeTimes: async () => [], triggerBuild, now: plus(DEBOUNCE_MS), log: () => {} });
    expect(reasons).toHaveLength(1);
    expect(triggerBuild).toHaveBeenCalledWith(expect.stringMatching(/^Scheduled: content published/));
    expect(m.get()?.pendingSince).toBeUndefined();
  });
  it('keeps the pending build when the hook fails, so the next tick retries', async () => {
    const m = memoryStore(pending);
    await expect(
      tick({ store: m.store, changeTimes: async () => [], triggerBuild: async () => Promise.reject(new Error('502')), now: plus(DEBOUNCE_MS), log: () => {} }),
    ).rejects.toThrow('502');
    expect(m.get()?.pendingSince).toBe(t0.toISOString());
  });
  it('only logs when no build hook is configured', async () => {
    const m = memoryStore(pending);
    const log = vi.fn();
    expect(await tick({ store: m.store, changeTimes: async () => [], now: plus(DEBOUNCE_MS), log })).toEqual([]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('NETLIFY_BUILD_HOOK_URL is missing'));
    expect(m.get()).toEqual(pending);
  });
});
