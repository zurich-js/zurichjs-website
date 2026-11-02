#!/usr/bin/env node
// Serves apps/web/dist the way Netlify does for static files: /path → /path.html or /path/index.html,
// 301s from dist/_redirects (written by Astro), then files, then the [[redirects]] in apps/web/netlify.toml
// (with `/*` splats, shadowed by existing files like on Netlify), then 404.html. API routes are not served
// (they are Netlify Functions).
//   node tools/serve-dist.mjs [port] [dir]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] ?? 4321);
const root = process.argv[3] ?? new URL('../apps/web/dist/', import.meta.url).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
};
const redirects = new Map();
const rfile = join(root, '_redirects');
if (existsSync(rfile)) {
  for (const line of readFileSync(rfile, 'utf8').split('\n')) {
    const [from, to, code] = line.trim().split(/\s+/);
    if (from && to && !from.startsWith('#')) redirects.set(from, { to, code: Number(code ?? 301) });
  }
}
/** [[redirects]] from netlify.toml: { from, to, status } with an optional trailing `/*` splat. */
const tomlRedirects = [];
const toml = join(root, '..', 'netlify.toml');
if (existsSync(toml)) {
  for (const block of readFileSync(toml, 'utf8').split('[[redirects]]').slice(1)) {
    const get = (k) => block.match(new RegExp(`^\\s*${k}\\s*=\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim();
    const from = get('from');
    const to = get('to');
    if (from && to) tomlRedirects.push({ from, to, code: Number(get('status') ?? 301) });
  }
}
const tomlRedirect = (path) => {
  for (const r of tomlRedirects) {
    if (r.from.endsWith('/*')) {
      const base = r.from.slice(0, -2);
      if (path === base || path.startsWith(`${base}/`)) return { ...r, to: r.to.replace(':splat', path.slice(base.length + 1)) };
    } else if (path === r.from || path === `${r.from}/`) return r;
  }
  return undefined;
};

const file = (p) => {
  const f = join(root, normalize(p));
  return existsSync(f) && statSync(f).isFile() ? f : null;
};
/** The redirect target with the request's query string merged in (before any #fragment), like Netlify. */
const withQuery = (to, search) => {
  if (!search) return to;
  const [path, hash] = to.split('#');
  const q = path.includes('?') ? `${path}&${search.slice(1)}` : `${path}${search}`;
  return hash !== undefined ? `${q}#${hash}` : q;
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = decodeURIComponent(url.pathname);
  const r = redirects.get(path) ?? redirects.get(path.replace(/\/$/, ''));
  if (r) {
    res.writeHead(r.code, { location: withQuery(r.to, url.search) });
    return res.end();
  }
  const hit = file(path) ?? file(`${path}.html`) ?? file(join(path, 'index.html'));
  if (hit) {
    res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
    return res.end(readFileSync(hit));
  }
  const t = tomlRedirect(path);
  if (t) {
    res.writeHead(t.code, { location: withQuery(t.to, url.search) });
    return res.end();
  }
  const nf = file('404.html');
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end(nf ? readFileSync(nf) : 'Not found');
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
