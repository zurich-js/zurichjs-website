#!/usr/bin/env node
/**
 * SEO and LLM parity gate (docs/v2/SEO-BASELINE.md).
 *
 *   node tools/seo/compare.mjs [--base http://localhost:4321] [--dist apps/web/dist] [--report out.json]
 *
 * Serves nothing itself: point --base at a server for the built site
 * (tools/serve-dist.mjs). Crawls every production baseline route plus every
 * built HTML page, then fails on lost signals: missing pages, titles,
 * descriptions, canonicals, OG/Twitter tags, JSON-LD types, sitemap entries,
 * crawler allowances or the LLM files. Copy changes are reported, not failed,
 * when allowlist.json covers them.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { snapshot } from './snapshot.mjs';

const here = new URL('.', import.meta.url).pathname;
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const base = arg('base', 'http://localhost:4321');
const dist = arg('dist', join(here, '../../apps/web/dist'));
const reportPath = arg('report');
const SITE = 'https://zurichjs.com';

const json = (f) => JSON.parse(readFileSync(join(here, f), 'utf8'));
const scope = json('scope.json').routes;
const allow = json('allowlist.json').copy;
const crawlBase = json('baseline.crawl.json').results;
const sourceBase = json('baseline.source.json').results;
const baseline = new Map([
  ...sourceBase.map((r) => [r.route, { ...r, jsonldTypes: r.jsonld ?? [] }]),
  ...crawlBase.map((r) => [r.route, { ...r, jsonldTypes: (r.jsonld ?? []).map((j) => j.type) }]),
]);

// Every HTML page in the build (Netlify serves /x from x.html).
const builtPages = [];
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (!f.startsWith('_') && f !== '.netlify') walk(p);
    } else if (f.endsWith('.html')) {
      const rel =
        '/' +
        relative(dist, p)
          .replace(/\.html$/, '')
          .replace(/(^|\/)index$/, '');
      builtPages.push(rel === '/' ? '/' : rel.replace(/\/$/, ''));
    }
  }
};
walk(dist);

const failures = [];
const notes = [];
const fail = (route, msg) => failures.push(`${route}: ${msg}`);

const prodRoutes = [...new Set([...crawlBase.map((r) => r.route), ...sourceBase.map((r) => r.route)])].filter(
  (r) => !r.includes('[') && !r.endsWith('.xml') && !r.endsWith('.txt') && r !== '/404',
);
const toCrawl = [...new Set([...prodRoutes, ...builtPages.filter((p) => p !== '/404')])];
const results = await snapshot(base, toCrawl);
const byRoute = new Map(results.map((r) => [r.route, r]));

// 1. Production routes: ported, redirected, or explicitly out of scope.
for (const route of prodRoutes) {
  const s = scope[route] ?? scope[route.replace(/\/[^/]+$/, '/[id]')];
  const r = byRoute.get(route);
  if (!s) {
    fail(route, 'production URL has no entry in scope.json');
    continue;
  }
  if (s.status === 'descoped' || s.status === 'removed' || s.status === 'pending') {
    notes.push(`${route}: ${s.status}${s.phase ? ` (phase ${s.phase})` : ''}${r?.status === 200 ? ' (but served)' : ''}`);
    continue;
  }
  if (!r || r.error) {
    fail(route, `not reachable (${r?.error ?? 'no result'})`);
    continue;
  }
  if (s.status === 'redirect') {
    if (r.finalPath !== s.to) fail(route, `should 301 to ${s.to}, ended at ${r.finalPath}`);
    if (r.status !== 200) fail(route, `redirect target returned ${r.status}`);
    continue;
  }
  if (r.status !== 200) fail(route, `status ${r.status}`);
  if (r.finalPath !== route) fail(route, `unexpected redirect to ${r.finalPath}`);
  const b = baseline.get(route);
  for (const t of b?.jsonldTypes ?? []) if (!r.jsonld.some((j) => j.type === t)) fail(route, `lost JSON-LD type ${t}`);
  if (b?.title && b.title !== r.title) notes.push(`${route}: title "${b.title}" → "${r.title}"${allow[route] || allow['*'] ? '' : ' (NOT ALLOWLISTED)'}`);
}

// 2. Every built page: complete head for indexable pages.
const sitemapXml = await fetch(`${base}/sitemap.xml`).then((r) => r.text());
const inSitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, '') || '/'));
for (const route of builtPages) {
  const r = byRoute.get(route);
  if (!r || r.error) continue;
  if (r.redirectedFrom.length || r.finalPath !== route) continue; // redirect stubs
  const noindex = (r.robots ?? '').includes('noindex');
  const canonicalPath = (r.canonical ?? '').replace(SITE, '') || '/';
  if (!r.title) fail(route, 'missing <title>');
  if (!r.description) fail(route, 'missing meta description');
  if (!r.canonical?.startsWith(SITE)) fail(route, `canonical not absolute on ${SITE}: ${r.canonical}`);
  if (noindex) {
    if (inSitemap.has(route)) fail(route, 'noindex page listed in sitemap');
    continue;
  }
  if (r.description && (r.description.length < 50 || r.description.length > 170)) fail(route, `description length ${r.description.length} (50–170)`);
  if (canonicalPath !== route) fail(route, `canonical points to ${canonicalPath}`);
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']) if (!r.og[k]) fail(route, `missing ${k}`);
  if (r.og['og:url'] && r.og['og:url'] !== r.canonical) fail(route, 'og:url differs from canonical');
  if (r.og['og:image'] && !r.og['og:image'].startsWith('https://')) fail(route, 'og:image not absolute');
  if (!r.h1.length || !r.h1[0]) fail(route, 'missing <h1>');
  if (r.textLength < 200) fail(route, `only ${r.textLength} characters of server-rendered text`);
  if (r.jsonld.some((j) => j.type === 'INVALID_JSON')) fail(route, 'invalid JSON-LD');
  if (!inSitemap.has(route)) fail(route, 'indexable page missing from sitemap.xml');
}
for (const loc of inSitemap) if (!builtPages.includes(loc)) fail(loc, 'in sitemap.xml but not built');

// 3. Crawler and LLM surface.
const robots = await fetch(`${base}/robots.txt`).then((r) => r.text());
if (!/Sitemap: https:\/\/zurichjs\.com\/sitemap\.xml/.test(robots)) fail('/robots.txt', 'no Sitemap line');
for (const bot of ['GPTBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'anthropic-ai', 'Claude-Web'])
  if (!robots.includes(`User-agent: ${bot}`)) fail('/robots.txt', `lost allowance for ${bot}`);
for (const f of ['/llms.txt', '/llms-full.txt']) {
  const res = await fetch(`${base}${f}`);
  const t = await res.text();
  if (res.status !== 200 || !t.startsWith('# ZurichJS')) fail(f, 'missing or malformed');
}

const report = { base, checkedAt: new Date().toISOString(), builtPages: builtPages.length, crawled: results.length, failures, notes };
if (reportPath) writeFileSync(reportPath, JSON.stringify({ ...report, results }, null, 2) + '\n');
console.log(`SEO parity: ${builtPages.length} built pages, ${prodRoutes.length} production routes checked.`);
for (const n of notes) console.log(`  note  ${n}`);
for (const f of failures) console.log(`  FAIL  ${f}`);
console.log(failures.length ? `\n${failures.length} SEO parity failure(s).` : '\nSEO parity OK.');
process.exit(failures.length ? 1 : 0);
