// Copies the brand assets that v2 shares with the production site from ../public/images
// into v2/public/images, so each image is stored in git once. Runs before dev and build.
// The copied paths are gitignored (see v2/.gitignore).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SHARED = [
  'community/cloudflare.png',
  'community/meetup-3.jpeg',
  'community/may-the-force.webp',
  'community/vue-zurich.jpeg',
  'team/bogdan.jpg',
  'team/enrique.jpeg',
  'team/faris.jpg',
];

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, '..', '..', 'public', 'images');
const to = join(here, '..', 'public', 'images');

for (const rel of SHARED) {
  mkdirSync(dirname(join(to, rel)), { recursive: true });
  copyFileSync(join(from, rel), join(to, rel));
}
console.log(`sync-assets: copied ${SHARED.length} shared images from the root public/images`);
