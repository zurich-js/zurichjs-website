/**
 * The next moments this build goes stale: doors (open → live) and doors + 48 h
 * (live → past) of every upcoming event. Read by netlify/functions/scheduled-rebuild.mts.
 * Not linked, not in the sitemap; robots.txt does not need to hide it.
 */
import type { APIRoute } from 'astro';
import { stateChangeTimes } from '@zurichjs/events';
import { BUILD_TIME, content } from '~/lib/content';

export const GET: APIRoute = async () => {
  const { events } = await content();
  const body = { builtAt: BUILD_TIME.toISOString(), times: stateChangeTimes(events, BUILD_TIME).map((d) => d.toISOString()) };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
