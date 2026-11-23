/**
 * The rebuild state (rebuild.ts) in Netlify Blobs, store `rebuild`, key `state`. Every writer goes
 * through here: the Sanity webhook (/api/rebuild), sponsorship changes (sponsor-rebuild.ts) and the
 * scheduled tick. Writes are conditional on the entry's ETag, so two writers never overwrite each
 * other; the loser reads again and reapplies its change.
 */
import { getStore } from '@netlify/blobs';
import { emptyState, type RebuildState, type StateStore } from './rebuild.ts';

const KEY = 'state';
const ATTEMPTS = 5;

export function rebuildStore(): StateStore {
  const blobs = getStore('rebuild');
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
