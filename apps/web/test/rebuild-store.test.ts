/** The rebuild state in Netlify Blobs (rebuild-store.ts): strong reads, and writes conditional on the ETag read. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEBOUNCE_MS, emptyState, recordPublish, tick, type RebuildState } from '../src/server/rebuild.ts';

const blob = vi.hoisted(() => ({ value: null as unknown, etag: 0, beforeWrite: null as null | (() => void), cachedEtag: null as null | string }));

vi.mock('@netlify/blobs', () => ({
  // An eventual read may come from a cache that still has an older ETag (cachedEtag).
  getStore: (_name: string, store: { consistency?: string } = {}) => ({
    get: async () => structuredClone(blob.value),
    getWithMetadata: async (_key: string, read: { consistency?: string } = {}) =>
      blob.value === null
        ? null
        : { data: structuredClone(blob.value), etag: (read.consistency ?? store.consistency) !== 'strong' && blob.cachedEtag ? blob.cachedEtag : String(blob.etag), metadata: {} },
    setJSON: async (_key: string, data: unknown, opts: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      const interloper = blob.beforeWrite;
      blob.beforeWrite = null;
      interloper?.();
      const stale = opts.onlyIfNew ? blob.value !== null : opts.onlyIfMatch !== String(blob.etag);
      if (stale) return { modified: false };
      blob.value = structuredClone(data);
      return { modified: true, etag: String(++blob.etag) };
    },
  }),
}));

const { rebuildStore } = await import('../src/server/rebuild-store.ts');
const { queueRebuild } = await import('../src/server/sponsor-rebuild.ts');

beforeEach(() => {
  blob.value = null;
  blob.etag = 0;
  blob.beforeWrite = null;
  blob.cachedEtag = null;
});

describe('the rebuild state store', () => {
  it('reapplies a change when another writer saved in between', async () => {
    const first = new Date('2026-11-18T10:00:00Z');
    const second = new Date('2026-11-18T10:00:30Z');
    blob.value = emptyState();
    // Another publish is saved between this writer's read and its write.
    blob.beforeWrite = () => {
      blob.value = recordPublish(blob.value as RebuildState, first);
      blob.etag++;
    };
    const saved = await rebuildStore().update((s) => recordPublish(s, second));
    expect(saved).toMatchObject({ pendingSince: first.toISOString(), lastPublishAt: second.toISOString() });
    expect(blob.value).toEqual(saved);
  });

  it('creates the entry only if nobody else created it first', async () => {
    const at = new Date('2026-11-18T10:00:00Z');
    blob.beforeWrite = () => {
      blob.value = { fired: ['2026-11-18T09:00:00.000Z'] };
      blob.etag++;
    };
    expect(await rebuildStore().update((s) => recordPublish(s, at))).toEqual({
      fired: ['2026-11-18T09:00:00.000Z'],
      pendingSince: at.toISOString(),
      lastPublishAt: at.toISOString(),
      publishes: 1,
    });
  });

  it('keeps a sponsorship change queued while the build hook call is in flight', async () => {
    const t0 = new Date('2026-11-18T10:00:00Z');
    const later = new Date(t0.getTime() + DEBOUNCE_MS);
    blob.value = recordPublish(emptyState(), t0);
    await tick({ store: rebuildStore(), changeTimes: async () => [], triggerBuild: () => queueRebuild('sponsorship pending to active', later), now: later, log: () => {} });
    expect(blob.value).toMatchObject({ pendingSince: later.toISOString(), lastPublishAt: later.toISOString(), lastBuildAt: later.toISOString() });
  });

  it('reads strongly, so a cache with an older ETag cannot use up the writes', async () => {
    blob.value = emptyState();
    blob.etag = 3;
    blob.cachedEtag = '1';
    const at = new Date('2026-11-18T10:00:00Z');
    await queueRebuild('sponsorship pending to active', at);
    expect(blob.value).toMatchObject({ pendingSince: at.toISOString(), publishes: 1 });
  });
});
