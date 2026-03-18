import type { APIContext } from 'astro';

import { getUpcomingEvents, getPastEvents } from '@/sanity/queries/events';

export const prerender = false;

export async function GET({ request }: APIContext) {
  try {
    const baseUrl = 'https://zurichjs.com';

    const upcomingEvents = await getUpcomingEvents();
    const pastEvents = await getPastEvents();

    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' },
      { url: '/events', priority: '0.9', changefreq: 'daily' },
      { url: '/speakers', priority: '0.8', changefreq: 'weekly' },
      { url: '/partnerships', priority: '0.7', changefreq: 'monthly' },
      { url: '/cfp', priority: '0.8', changefreq: 'weekly' },
      { url: '/contact', priority: '0.6', changefreq: 'monthly' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/media', priority: '0.6', changefreq: 'weekly' },
      { url: '/donate', priority: '0.5', changefreq: 'monthly' },
      { url: '/buy-us-a-coffee', priority: '0.5', changefreq: 'monthly' },
      { url: '/workshops', priority: '0.7', changefreq: 'monthly' },
      { url: '/policies/code-of-conduct', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/terms-and-conditions', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/refund-policy', priority: '0.5', changefreq: 'yearly' },
    ];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `<url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
    )
    .join('\n  ')}
  ${[...upcomingEvents, ...pastEvents]
    .map(
      (event) => `<url>
    <loc>${baseUrl}/events/${event.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date(event.datetime).toISOString()}</lastmod>
  </url>`
    )
    .join('\n  ')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate sitemap' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
