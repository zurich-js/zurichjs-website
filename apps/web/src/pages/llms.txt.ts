import type { APIRoute } from 'astro';
import { llmsTxt } from '@zurichjs/seo';
import { BUILD_TIME, content } from '~/lib/content';
import { STATIC_ROUTES } from '~/lib/routes';

/** https://llmstxt.org summary for AI assistants. /llms-full.txt has every event and speaker. */
export const GET: APIRoute = async () => {
  const { events, speakers } = await content();
  const pages = STATIC_ROUTES.map((r) => ({ title: r.title, path: r.path, summary: r.summary }));
  return new Response(llmsTxt({ events, speakers, pages, now: BUILD_TIME }), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
