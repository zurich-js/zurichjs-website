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
      // Never shadow a live speaker page. Spaces at the ends (a stored " nicolò-ribaudo") are encoded;
      // a space inside an ID can't be a working URL, so it's skipped.
      if (current.has(old) || !old.trim() || /\s/.test(old.trim())) continue;
      // Both spellings: fully percent-encoded, and with only the spaces encoded, so the rule
      // matches whether the host compares encoded or decoded paths.
      const to = `/speakers/${encodeURIComponent(s.id)}`;
      for (const from of new Set([encodeURIComponent(old), old.replace(/\s/g, '%20')])) lines.push(`/speakers/${from} ${to} 301`);
    }
  }
  return new Response(lines.join('\n') + (lines.length ? '\n' : ''), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
