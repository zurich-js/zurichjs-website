/**
 * Sanity publish webhook (POST /api/rebuild). Validates the signature and records
 * a pending rebuild in Netlify Blobs; netlify/functions/scheduled-rebuild.mts builds
 * once publishing has paused. Env: SANITY_WEBHOOK_SECRET. See docs/v2/RUNBOOK.md.
 */
import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';
import { acceptPublish, type RebuildState, type StateStore } from '../../server/rebuild';

export const prerender = false;

const blobStore = (): StateStore => {
  const store = getStore('rebuild');
  return {
    read: async () => (await store.get('state', { type: 'json' })) as RebuildState | null,
    write: (s) => store.setJSON('state', s).then(() => undefined),
  };
};

export const ALL: APIRoute = ({ request }) => acceptPublish(request, process.env.SANITY_WEBHOOK_SECRET, blobStore());
