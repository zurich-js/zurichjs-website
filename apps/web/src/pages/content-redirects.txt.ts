/**
 * 301s that come from content: a speaker whose ID changed keeps their old
 * URL working (Sanity `speaker.legacySlugs`). This file is merged into
 * dist/_redirects after the build (astro.config.mjs) and then removed.
 * Also warns about IDs that are not clean URL segments.
 */
import type { APIRoute } from 'astro';
import { content } from '~/lib/content';

const CLEAN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const GET: APIRoute = async () => {
  const { speakers } = await content();
  const current = new Set(speakers.map((s) => s.id));
  const lines: string[] = [];
  for (const s of speakers) {
    if (!CLEAN.test(s.id)) console.warn(`[content] speaker ID "${s.id}" is not a clean URL segment; see Studio scripts/clean-speaker-slugs.ts`);
    for (const old of s.legacySlugs ?? []) {
      // Never shadow a live speaker page.
      if (current.has(old) || !old.trim() || /\s/.test(old)) continue;
      lines.push(`/speakers/${encodeURI(old)} /speakers/${s.id} 301`);
    }
  }
  return new Response(lines.join('\n') + (lines.length ? '\n' : ''), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
