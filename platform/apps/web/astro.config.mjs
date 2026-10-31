// @ts-check
import netlify from '@astrojs/netlify';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { LEGACY_REDIRECTS } from './src/lib/redirects.mjs';

// Static-first: every page is prerendered. Only API routes opt out (`export const prerender = false`)
// and run as Netlify Functions.
export default defineConfig({
  site: 'https://zurichjs.com',
  output: 'static',
  adapter: netlify(),
  trailingSlash: 'never',
  // Inline CSS: removes the render-blocking stylesheet request (one Tailwind sheet, small).
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [preact({ compat: true })],
  vite: { plugins: [tailwindcss()] },
  redirects: LEGACY_REDIRECTS,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
