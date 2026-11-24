/**
 * The rebuild state (rebuild.ts) in Netlify Blobs, store `rebuild`, key `state`. Every writer goes
 * through here: the Sanity webhook (/api/rebuild), sponsorship changes (sponsor-rebuild.ts) and the
 * scheduled tick. Reads are strongly consistent (the client defaults to eventual, which can return
 * an old ETag), and each write is conditional on the ETag it read; when another writer saved in
 * between, the change is applied again to their state, up to ATTEMPTS times.
 */
import { getStore } from '@netlify/blobs';
import { emptyState, type RebuildState, type StateStore } from './rebuild.ts';

const KEY = 'state';
const ATTEMPTS = 5;

export function rebuildStore(): StateStore {
  const blobs = getStore('rebuild', { consistency: 'strong' });
  return {
    read: async () => (await blobs.get(KEY, { type: 'json' })) as RebuildState | null,
    async update(change) {
      for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
        const entry = await blobs.getWithMetadata(KEY, { type: 'json' });
        const next = change((entry?.data as RebuildState | undefined) ?? emptyState());
        const written = await blobs.setJSON(KEY, next, entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
        if (written.modified) return next;
      }
      throw new Error(`rebuild state changed under ${ATTEMPTS} writes in a row`);
    },
  };
}
