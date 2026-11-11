/**
 * Uploads the president's signature for the certificates of membership to the
 * private Netlify Blobs store `membership` (key `signature.png`). It is never
 * committed: the repository may be public.
 *   NETLIFY_AUTH_TOKEN=… pnpm membership:signature signature.png
 * Use a transparent PNG with black ink, about 1200 px wide.
 */
import { readFileSync } from 'node:fs';
import { getStore } from '@netlify/blobs';

const SITE_ID = process.env.NETLIFY_SITE_ID ?? '63e6b008-30d7-41d6-a902-8a7b35bbc61e'; // zurichjs on Netlify
const file = process.argv[2];
if (!file || !process.env.NETLIFY_AUTH_TOKEN) {
  console.error('Usage: NETLIFY_AUTH_TOKEN=… pnpm membership:signature <signature.png>');
  process.exit(1);
}
const bytes = readFileSync(file);
if (bytes.subarray(1, 4).toString() !== 'PNG') {
  console.error('That is not a PNG file.');
  process.exit(1);
}
await getStore({ name: 'membership', siteID: SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN }).set('signature.png', bytes);
console.log(`Uploaded ${file} (${bytes.length} bytes) to the membership store of site ${SITE_ID}.`);
