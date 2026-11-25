/**
 * Sanity publish webhook (POST /api/rebuild). Validates the signature and records
 * a pending rebuild in Netlify Blobs; netlify/functions/scheduled-rebuild.mts builds
 * once publishing has paused. Env: SANITY_WEBHOOK_SECRET. See docs/systems/operations/netlify.md.
 */
import type { APIRoute } from 'astro';
import { acceptPublish } from '../../server/rebuild.ts';
import { rebuildStore } from '../../server/rebuild-store.ts';

export const prerender = false;

export const ALL: APIRoute = ({ request }) => acceptPublish(request, process.env.SANITY_WEBHOOK_SECRET, rebuildStore());
