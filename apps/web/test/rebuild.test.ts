import { describe, expect, it, vi } from 'vitest';
import {
  DEBOUNCE_MS,
  MAX_WAIT_MS,
  absorb,
  acceptPublish,
  decide,
  emptyState,
  publishKey,
  recordPublish,
  settle,
  tick,
  validSanitySignature,
  type RebuildState,
  type StateStore,
} from '../src/server/rebuild.ts';

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
  const store: StateStore = {
    read: async () => s,
    publish: async (at) => void (s = recordPublish(s ?? emptyState(), at)),
    update: async (change) => (s = change(s ?? emptyState())),
  };
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

describe('publishing that does not pause', () => {
  it('builds once the first unbuilt publish is fifteen minutes old', async () => {
    const { store } = memoryStore(emptyState());
    const built: string[] = [];
    for (let i = 0; i * 90_000 <= MAX_WAIT_MS + 90_000; i++) {
      const now = plus(i * 90_000);
      await store.update((s) => recordPublish(s, now));
      await tick({ store, changeTimes: async () => [], triggerBuild: async (t) => void built.push(t), now, log: () => {} });
    }
    expect(built).toHaveLength(1);
    expect(built[0]).toContain('(still publishing)');
  });
});

describe('a publish while the build hook call is in flight', () => {
  it('stays pending and gets a build of its own', async () => {
    const { store, get } = memoryStore(recordPublish(emptyState(), t0));
    const during = plus(DEBOUNCE_MS);
    const built: string[] = [];
    await tick({
      store,
      changeTimes: async () => [],
      triggerBuild: async (t) => {
        built.push(t);
        await store.update((s) => recordPublish(s, during));
      },
      now: during,
      log: () => {},
    });
    expect(get()).toMatchObject({ pendingSince: during.toISOString(), lastPublishAt: during.toISOString(), lastBuildAt: during.toISOString() });
    await tick({ store, changeTimes: async () => [], triggerBuild: async (t) => void built.push(t), now: plus(2 * DEBOUNCE_MS), log: () => {} });
    expect(built).toHaveLength(2);
    expect(get()?.pendingSince).toBeUndefined();
  });
});

describe('two ticks that overlap', () => {
  it('the one that finishes last takes back no fired time and no build time', async () => {
    const { store, get } = memoryStore(emptyState());
    const times = [t0.toISOString(), plus(1_000).toISOString()];
    const hooks: string[] = [];
    let release = () => {};
    let entered = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const waiting = new Promise<void>((r) => (entered = r));
    const early = tick({
      store,
      changeTimes: async () => times,
      triggerBuild: async (t) => {
        hooks.push(t);
        entered();
        await gate;
      },
      now: t0,
      log: () => {},
    });
    await waiting;
    await tick({ store, changeTimes: async () => times, triggerBuild: async (t) => void hooks.push(t), now: plus(1_000), log: () => {} });
    release();
    await early;
    expect(get()).toMatchObject({ fired: times, lastBuildAt: plus(1_000).toISOString() });
    await tick({ store, changeTimes: async () => times, triggerBuild: async (t) => void hooks.push(t), now: plus(2_000), log: () => {} });
    expect(hooks).toHaveLength(2);
  });
});

describe('two publishes in the same millisecond', () => {
  it('the one recorded after the decision stays pending', () => {
    const latest = plus(MAX_WAIT_MS);
    const seen = recordPublish(recordPublish(emptyState(), t0), latest);
    const d = decide(seen, latest, []);
    expect(d.build).toBe(true);
    expect(settle(recordPublish(seen, latest), seen, d)).toMatchObject({ pendingSince: latest.toISOString(), lastPublishAt: latest.toISOString() });
    expect(settle(seen, seen, d).pendingSince).toBeUndefined();
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
  it('a tick that saves after its build does not bring back a fired time the decision forgot', () => {
    const now = new Date('2026-11-26T17:31:00Z');
    const seen = recordPublish({ fired: [doors] }, new Date(now.getTime() - MAX_WAIT_MS));
    const d = decide(seen, now, []);
    expect(settle(seen, seen, d).fired).toEqual([]);
  });
});

describe('publish records (StateStore.publish)', () => {
  const key = (at: Date, id: string) => publishKey(at, id);
  it('are counted once each, at their own time, and forgotten once deleted', () => {
    const a = key(t0, 'a');
    const b = key(plus(30_000), 'b');
    const once = absorb(emptyState(), [b, a]);
    expect(once).toMatchObject({ pendingSince: t0.toISOString(), lastPublishAt: plus(30_000).toISOString(), publishes: 2, absorbed: [a, b] });
    expect(absorb(once, [a, b])).toEqual(once);
    expect(absorb(once, [b])).toMatchObject({ publishes: 2, absorbed: [b] });
    expect(absorb(once, []).absorbed).toBeUndefined();
  });
  it('an older record counted late does not move the last publish back', () => {
    const s = recordPublish(emptyState(), plus(60_000));
    expect(absorb(s, [key(t0, 'late')])).toMatchObject({ pendingSince: plus(60_000).toISOString(), lastPublishAt: plus(60_000).toISOString(), publishes: 2 });
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
