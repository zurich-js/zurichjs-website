// @ts-check
import netlify from '@astrojs/netlify';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { font } from '@zurichjs/design/tokens';

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
  // Figtree (variable, 300–900) self-hosted from the design package through the Astro Fonts API:
  // generates @font-face, a metric-matched fallback and the preload link (<Font> in BaseLayout).
  fonts: [
    {
      provider: fontProviders.local(),
      name: font.family,
      cssVariable: font.cssVariable,
      fallbacks: [...font.fallbacks],
      options: { variants: [{ src: [`@zurichjs/design/fonts/${font.file}`], weight: font.weights, style: 'normal', display: 'swap' }] },
    },
  ],
  redirects: LEGACY_REDIRECTS,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
});
