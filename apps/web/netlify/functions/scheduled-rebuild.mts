/**
 * Scheduled every 2 minutes (Netlify Scheduled Functions). Flushes debounced Sanity
 * publishes and builds at each event's doors and doors + 48 h. Logic and tests:
 * src/server/rebuild.ts. Env: NETLIFY_BUILD_HOOK_URL (logs instead of building when
 * missing). Netlify sets URL to the site's own address.
 */
import { getStore } from '@netlify/blobs';
import { tick, type RebuildState } from '../../src/server/rebuild.ts';

export default async () => {
  const blobs = getStore('rebuild');
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  await tick({
    store: {
      read: async () => (await blobs.get('state', { type: 'json' })) as RebuildState | null,
      write: (s) => blobs.setJSON('state', s).then(() => undefined),
    },
    changeTimes: async () => {
      try {
        const res = await fetch(new URL('/state-changes.json', process.env.URL ?? 'https://zurichjs.com'));
        return res.ok ? ((await res.json()) as { times: string[] }).times : [];
      } catch (e) {
        console.warn('[rebuild] could not read /state-changes.json', e);
        return [];
      }
    },
    triggerBuild: hook
      ? async (title) => {
          const res = await fetch(`${hook}?trigger_title=${encodeURIComponent(title)}`, { method: 'POST' });
          if (!res.ok) throw new Error(`Build hook returned ${res.status}`);
        }
      : undefined,
  });
};

export const config = { schedule: '*/2 * * * *' };
