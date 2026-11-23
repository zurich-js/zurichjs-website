/** The rebuild state in Netlify Blobs (rebuild-store.ts): conditional writes never lose a writer's change. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEBOUNCE_MS, emptyState, recordPublish, tick, type RebuildState } from '../src/server/rebuild.ts';

const blob = vi.hoisted(() => ({ value: null as unknown, etag: 0, beforeWrite: null as null | (() => void) }));

vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    get: async () => structuredClone(blob.value),
    getWithMetadata: async () => (blob.value === null ? null : { data: structuredClone(blob.value), etag: String(blob.etag), metadata: {} }),
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
});

describe('the rebuild state store', () => {
  it('reapplies a change when another writer saved in between', async () => {
    const first = new Date('2026-11-18T10:00:00Z');
    const second = new Date('2026-11-18T10:00:30Z');
    blob.value = emptyState();
    // The tick clears the pending build while a publish is being recorded.
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
    });
  });

  it('keeps a sponsorship change queued while the build hook call is in flight', async () => {
    const t0 = new Date('2026-11-18T10:00:00Z');
    const later = new Date(t0.getTime() + DEBOUNCE_MS);
    blob.value = recordPublish(emptyState(), t0);
    await tick({ store: rebuildStore(), changeTimes: async () => [], triggerBuild: () => queueRebuild('sponsorship pending to active', later), now: later, log: () => {} });
    expect(blob.value).toMatchObject({ pendingSince: later.toISOString(), lastPublishAt: later.toISOString(), lastBuildAt: later.toISOString() });
  });
});
