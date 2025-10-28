import type { NextApiRequest, NextApiResponse } from 'next';

import { getUpcomingEvents, getPastEvents } from '@/sanity/queries';

/**
 * Generate XML sitemap dynamically
 * This helps search engines discover all our content
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const baseUrl = 'https://zurichjs.com';

    // Fetch dynamic content
    const upcomingEvents = await getUpcomingEvents();
    const pastEvents = await getPastEvents();

    // Static pages with priorities and update frequencies
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily' }, // Homepage
      { url: '/events', priority: '0.9', changefreq: 'daily' },
      { url: '/speakers', priority: '0.8', changefreq: 'weekly' },
      { url: '/partnerships', priority: '0.7', changefreq: 'monthly' },
      { url: '/cfp', priority: '0.8', changefreq: 'weekly' },
      { url: '/contact', priority: '0.6', changefreq: 'monthly' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/media', priority: '0.6', changefreq: 'weekly' },
      { url: '/donate', priority: '0.5', changefreq: 'monthly' },
      { url: '/buy-us-a-coffee', priority: '0.5', changefreq: 'monthly' },

      // Workshop pages
      { url: '/workshops/accessibility-fundamentals', priority: '0.7', changefreq: 'monthly' },
      { url: '/workshops/ai-design-patterns-2026', priority: '0.8', changefreq: 'weekly' },
      { url: '/workshops/ai-edge-application', priority: '0.7', changefreq: 'monthly' },
      { url: '/workshops/astro-zero-to-hero', priority: '0.7', changefreq: 'monthly' },

      // Policy pages
      { url: '/policies/code-of-conduct', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/terms-and-conditions', priority: '0.5', changefreq: 'yearly' },
      { url: '/policies/refund-policy', priority: '0.5', changefreq: 'yearly' },
    ];

    // Build sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${staticPages
    .map(
      (page) => `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>`
    )
    .join('')}
  ${[...upcomingEvents, ...pastEvents]
    .map(
      (event) => `
  <url>
    <loc>${baseUrl}/events/${event.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date(event.datetime).toISOString()}</lastmod>
  </url>`
    )
    .join('')}
</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');
    res.status(200).send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ error: 'Failed to generate sitemap' });
  }
}
