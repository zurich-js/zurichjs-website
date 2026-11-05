#!/usr/bin/env node
// SEO and LLM snapshot of a running site.
//
//   node tools/seo/snapshot.mjs <baseUrl> <routes.txt> <out.json>
//
// For every route it records what search engines and LLM crawlers see in the
// server-rendered HTML (JavaScript disabled): status, redirect, title, meta
// description, canonical, robots, Open Graph and Twitter tags, JSON-LD types,
// H1 and visible text length. Used for the production baseline and for the
// parity gate against the Astro app (compare.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Resolve Playwright from the workspace, or from NODE_PATH (the preinstalled global copy).
const { chromium } = await import('@playwright/test').catch(() => createRequire(import.meta.url)('playwright'));

export async function snapshot(base, routes, { log = () => {} } = {}) {
  // Local crawls must not go through an HTTP(S) proxy configured in the environment.
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const ctx = await browser.newContext({ javaScriptEnabled: false, userAgent: 'Mozilla/5.0 (compatible; ZurichJS-SEO-Snapshot/1.0)' });
  const page = await ctx.newPage();
  const results = [];

  for (const route of routes) {
    let res;
    try {
      res = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    } catch (e) {
      results.push({ route, error: String(e).slice(0, 200) });
      continue;
    }
    const chain = [];
    for (let r = res?.request().redirectedFrom(); r; r = r.redirectedFrom()) chain.unshift(r.url().replace(base, ''));
    const data = await page.evaluate(() => {
      const meta = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
      const metas = {};
      for (const m of document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[property^="article:"], meta[property^="profile:"]')) {
        metas[m.getAttribute('property') ?? m.getAttribute('name')] = m.getAttribute('content');
      }
      const jsonld = [];
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const v = JSON.parse(s.textContent || 'null');
          const items = Array.isArray(v) ? v : (v?.['@graph'] ?? [v]);
          for (const i of items) jsonld.push({ type: i?.['@type'] ?? null, name: i?.name ?? i?.headline ?? null });
        } catch {
          jsonld.push({ type: 'INVALID_JSON', name: null });
        }
      }
      return {
        title: document.title || null,
        description: meta('meta[name="description"]'),
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        robots: meta('meta[name="robots"]'),
        lang: document.documentElement.lang || null,
        hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.getAttribute('hreflang')),
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().replace(/\s+/g, ' ')).slice(0, 3),
        textLength: (document.body?.innerText ?? '').length,
        og: metas,
        jsonld,
      };
    });
    results.push({ route, status: res?.status() ?? null, finalPath: page.url().replace(base, '') || '/', redirectedFrom: chain, ...data });
    log(`${res?.status()} ${route}`);
  }
  await browser.close();
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [base, routesFile, out] = process.argv.slice(2);
  if (!base || !routesFile || !out) {
    console.error('usage: snapshot.mjs <baseUrl> <routes.txt> <out.json>');
    process.exit(2);
  }
  const routes = readFileSync(routesFile, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  const results = await snapshot(base, routes, { log: (l) => console.log(l) });
  writeFileSync(out, JSON.stringify({ base, capturedAt: new Date().toISOString(), results }, null, 2) + '\n');
}
