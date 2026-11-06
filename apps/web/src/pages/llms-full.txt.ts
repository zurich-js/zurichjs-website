import type { APIRoute } from 'astro';
import { llmsTxt } from '@zurichjs/seo';
import { BUILD_TIME, content } from '~/lib/content';
import { STATIC_ROUTES } from '~/lib/routes';

/** Full version of /llms.txt: every event (with descriptions) and every speaker. */
export const GET: APIRoute = async () => {
  const { events, speakers } = await content();
  const pages = STATIC_ROUTES.map((r) => ({ title: r.title, path: r.path, summary: r.summary }));
  return new Response(llmsTxt({ events, speakers, pages, now: BUILD_TIME }, true), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
