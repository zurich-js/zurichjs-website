#!/usr/bin/env node
// A local stand-in for ImageKit's Admin API list endpoint (GET /v1/files), so a build can be checked
// against real archive data without the private key:
//   node tools/imagekit-mock.mjs <port> <listing.json>
//   IMAGEKIT_API_URL=http://127.0.0.1:<port>/v1/files IMAGEKIT_PRIVATE_KEY=dummy pnpm build
// <listing.json> is either the API's own answer (an array of file objects) or the old site's
// /api/imagekit/list answer ({ "<folder>": [enriched files] }), which is converted to the API's shape.
// It honours skip and limit, and answers 401 without Basic auth, like the real API.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const [port = '4529', file] = process.argv.slice(2);
if (!file) {
  console.error('usage: node tools/imagekit-mock.mjs <port> <listing.json>');
  process.exit(1);
}

const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', mov: 'video/quicktime', mp4: 'video/mp4' };

/** The old site's enriched file → the Admin API's file object. */
function toApi(f) {
  const ext = f.name.split('.').pop().toLowerCase();
  return {
    type: 'file',
    fileId: f.fileId,
    name: f.name,
    filePath: f.filePath,
    url: f.url,
    fileType: f.isVideo ? 'non-image' : 'image',
    mime: MIME[ext] ?? (f.isVideo ? 'video/mp4' : 'image/jpeg'),
    width: f.width,
    height: f.height,
    size: f.fileSize,
    duration: f.duration,
    tags: f.tags ?? null,
    customMetadata: f.customMetadata ?? {},
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}

const raw = JSON.parse(readFileSync(file, 'utf8'));
const files = (Array.isArray(raw) ? raw : Object.values(raw).flat().map(toApi)).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname !== '/v1/files') return res.writeHead(404).end();
  if (!(req.headers.authorization ?? '').startsWith('Basic '))
    return res.writeHead(401, { 'content-type': 'application/json' }).end('{"message":"Your request does not contain private API key."}');
  const skip = Number(url.searchParams.get('skip') ?? 0);
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 1000), 1000);
  res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(files.slice(skip, skip + limit)));
}).listen(Number(port), '127.0.0.1', () => console.log(`ImageKit mock: ${files.length} files on http://127.0.0.1:${port}/v1/files`));
