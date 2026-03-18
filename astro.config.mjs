import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';
import clerk from '@clerk/astro';

export default defineConfig({
  output: 'static',
  site: 'https://zurichjs.com',
  adapter: netlify(),
  image: {
    domains: ['cdn.sanity.io', 'svkbzhlrjujeteqjrckv.supabase.co'],
  },
  integrations: [
    react(),
    tailwind(),
    clerk(),
    sitemap(),
  ],
  redirects: {
    '/support': '/buy-us-a-coffee',
  },
});
