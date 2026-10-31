#!/usr/bin/env node
// Serves apps/web/dist the way Netlify does for static files: /path → /path.html or /path/index.html,
// 301s from dist/_redirects, 404.html for misses. API routes are not served (they are Netlify Functions).
//   node tools/serve-dist.mjs [port] [dir]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.argv[2] ?? 4321);
const root = process.argv[3] ?? new URL('../apps/web/dist/', import.meta.url).pathname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };
const redirects = new Map();
const rfile = join(root, '_redirects');
if (existsSync(rfile)) {
  for (const line of readFileSync(rfile, 'utf8').split('\n')) {
    const [from, to, code] = line.trim().split(/\s+/);
    if (from && to && !from.startsWith('#')) redirects.set(from, { to, code: Number(code ?? 301) });
  }
}
const file = (p) => {
  const f = join(root, normalize(p));
  return existsSync(f) && statSync(f).isFile() ? f : null;
};
createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = decodeURIComponent(url.pathname);
  const r = redirects.get(path) ?? redirects.get(path.replace(/\/$/, ''));
  if (r) {
    res.writeHead(r.code, { location: r.to + url.search });
    return res.end();
  }
  const hit = file(path) ?? file(`${path}.html`) ?? file(join(path, 'index.html'));
  if (hit) {
    res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
    return res.end(readFileSync(hit));
  }
  const nf = file('404.html');
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
  res.end(nf ? readFileSync(nf) : 'Not found');
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
