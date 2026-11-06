#!/usr/bin/env node
// Serves apps/web/dist the way Netlify does for static files: /path → /path.html or /path/index.html,
// 301s from dist/_redirects (written by Astro), then files, then the [[redirects]] in apps/web/netlify.toml
// (with `/*` splats, shadowed by existing files like on Netlify), then 404.html. API routes are not served
// (they are Netlify Functions). Text responses are compressed (brotli or gzip) as Netlify compresses them,
// so Lighthouse measures the transfer sizes visitors get.
//   node tools/serve-dist.mjs [port] [dir]
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

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
  '.mp4': 'video/mp4',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.svg', '.xml', '.txt', '.json']);
const compressed = new Map();
/** Sends a file, compressed when it is text and the client accepts it. */
const send = (req, res, status, f) => {
  const ext = extname(f);
  const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream' };
  let body = readFileSync(f);
  if (COMPRESSIBLE.has(ext)) {
    const accept = String(req.headers['accept-encoding'] ?? '');
    headers.vary = 'Accept-Encoding';
    const enc = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : '';
    if (enc) {
      // Compressed once per file and encoding; a fast brotli level, like a CDN compressing on the fly.
      const key = `${enc}:${f}`;
      if (!compressed.has(key)) compressed.set(key, enc === 'br' ? brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }) : gzipSync(body));
      body = compressed.get(key);
      headers['content-encoding'] = enc;
    }
  }
  res.writeHead(status, headers);
  res.end(body);
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
  // Rules may be written encoded or decoded; try both, like a host would.
  const r = redirects.get(path) ?? redirects.get(path.replace(/\/$/, '')) ?? redirects.get(url.pathname) ?? redirects.get(path.replace(/\s/g, '%20'));
  if (r) {
    res.writeHead(r.code, { location: withQuery(r.to, url.search) });
    return res.end();
  }
  const hit = file(path) ?? file(`${path}.html`) ?? file(join(path, 'index.html'));
  if (hit) {
    return send(req, res, 200, hit);
  }
  const t = tomlRedirect(path);
  if (t) {
    res.writeHead(t.code, { location: withQuery(t.to, url.search) });
    return res.end();
  }
  const nf = file('404.html');
  if (nf) return send(req, res, 404, nf);
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
