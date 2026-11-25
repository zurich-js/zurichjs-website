/**
 * The rebuild state (rebuild.ts) in Netlify Blobs, store `rebuild`. Every writer goes through here:
 * the Sanity webhook (/api/rebuild), sponsorship changes (sponsor-rebuild.ts) and the scheduled
 * tick.
 *
 * A publish is a blob of its own (`publish/<time>/<id>`), written without a condition, so a busy
 * state cannot make it fail. The state is key `state`: reads are strongly consistent (the client
 * defaults to eventual, which can return an old ETag) and count in the publish blobs listed then;
 * each write is conditional on the ETag it read, and when another writer saved in between, the
 * change is applied again to their state, up to ATTEMPTS times. Once a write has counted a publish
 * blob, the blob is deleted; one whose delete failed stays counted (`absorbed`) and is deleted by
 * the next write.
 */
import { getStore } from '@netlify/blobs';
import { absorb, emptyState, PUBLISH_PREFIX, publishKey, type RebuildState, type StateStore } from './rebuild.ts';

const KEY = 'state';
const ATTEMPTS = 5;

export function rebuildStore(): StateStore {
  const blobs = getStore('rebuild', { consistency: 'strong' });
  const published = async () => (await blobs.list({ prefix: PUBLISH_PREFIX })).blobs.map((b) => b.key);
  return {
    async read() {
      const [state, keys] = await Promise.all([blobs.get(KEY, { type: 'json' }) as Promise<RebuildState | null>, published()]);
      return state || keys.length ? absorb(state ?? emptyState(), keys) : null;
    },
    publish: async (at) => void (await blobs.setJSON(publishKey(at, crypto.randomUUID()), { at: at.toISOString() })),
    async update(change) {
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const [entry, keys] = await Promise.all([blobs.getWithMetadata(KEY, { type: 'json' }), published()]);
        const next = change(absorb((entry?.data as RebuildState | undefined) ?? emptyState(), keys));
        const written = await blobs.setJSON(KEY, next, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
        if (!written.modified) continue;
        await Promise.all((next.absorbed ?? []).map((k) => blobs.delete(k).catch((e: Error) => console.warn(`[rebuild] publish ${k} counted but not deleted: ${e.message}`))));
        return next;
      }
      throw new Error(`rebuild state changed under ${ATTEMPTS} writes in a row`);
    },
  };
}
