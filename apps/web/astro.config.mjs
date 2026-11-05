// @ts-check
import netlify from '@astrojs/netlify';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import { font } from '@zurichjs/design/tokens';

import { appendFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { LEGACY_REDIRECTS } from './src/lib/redirects.mjs';

/**
 * Content-driven 301s (old speaker IDs) are rendered to /content-redirects.txt
 * by a page, then appended to Netlify's _redirects here and the file removed.
 * Runs after the adapter has written _redirects (integrations run in order).
 */
/** @returns {import('astro').AstroIntegration} */
const contentRedirects = () => ({
  name: 'zurichjs:content-redirects',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const src = fileURLToPath(new URL('content-redirects.txt', dir));
      if (!existsSync(src)) return;
      const lines = readFileSync(src, 'utf8');
      if (lines.trim()) appendFileSync(fileURLToPath(new URL('_redirects', dir)), `\n# Content: old speaker IDs\n${lines}`);
      rmSync(src);
    },
  },
});

// Static-first: every page is prerendered. Only API routes opt out (`export const prerender = false`)
// and run as Netlify Functions.
export default defineConfig({
  site: 'https://zurichjs.com',
  output: 'static',
  // No edge functions here, and their dev emulation needs Deno.
  adapter: netlify({ devFeatures: { images: true, environmentVariables: false, edgeFunctions: false } }),
  trailingSlash: 'never',
  // Inline CSS: removes the render-blocking stylesheet request (one Tailwind sheet, small).
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [preact({ compat: true }), contentRedirects()],
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
