import type { APIRoute } from 'astro';

/**
 * Same policy as production public/robots.txt: everything public is crawlable,
 * AI crawlers are explicitly welcome, and the sitemap is the complete one.
 */
export const GET: APIRoute = () =>
  new Response(
    `# Robots.txt for ZurichJS
User-agent: *
Allow: /
Disallow: /api/
Disallow: /checkout/
Allow: /api/og/

User-agent: Googlebot
Crawl-delay: 0

User-agent: Bingbot
Crawl-delay: 0

User-agent: Slurp
Crawl-delay: 1

# AI and LLM crawlers are welcome. Summary for them: https://zurichjs.com/llms.txt
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://zurichjs.com/sitemap.xml
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
