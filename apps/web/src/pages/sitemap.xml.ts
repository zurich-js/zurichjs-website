import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { sitemapXml } from '@zurichjs/seo';
import { mediaForEvent } from '@zurichjs/content';
import { content } from '~/lib/content';
import { STATIC_ROUTES } from '~/lib/routes';

/** Every indexable URL, with lastmod from Sanity where known. Replaces production's 3-URL static file. */
export const GET: APIRoute = async () => {
  const c = await content();
  const policies = await getCollection('policies');
  const newest =
    c.events
      .map((e) => e.updatedAt ?? '')
      .sort()
      .at(-1) || undefined;
  const xml = sitemapXml([
    ...STATIC_ROUTES.map(({ path, priority, changefreq }) => ({ path, priority, changefreq, lastmod: path === '/' || path === '/events' ? newest : undefined })),
    ...c.events.map((e) => ({ path: `/events/${e.slug}`, priority: 0.8, changefreq: 'weekly' as const, lastmod: e.updatedAt ?? e.startsAt })),
    ...c.speakers.map((s) => ({ path: `/speakers/${s.id}`, priority: 0.6, changefreq: 'monthly' as const, lastmod: s.updatedAt })),
    ...c.events.filter((e) => mediaForEvent(c.media.items, e.slug).length > 0).map((e) => ({ path: `/media/${e.slug}`, priority: 0.4, changefreq: 'monthly' as const })),
    ...policies.map((p) => ({ path: `/policies/${p.id}`, priority: 0.3, changefreq: 'yearly' as const, lastmod: p.data.updated.toISOString() })),
  ]);
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
