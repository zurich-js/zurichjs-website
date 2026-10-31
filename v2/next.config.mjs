import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // v2/ is its own pnpm root inside the production repository; trace files from here, not the repo root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  images: {
    // Photos are served from /public; Sanity CDN can be added here when content is wired up.
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },
  async redirects() {
    // Legacy routes from the current site, mapped per the V2 audit.
    return [
      { source: '/partnerships', destination: '/partners', permanent: true },
      { source: '/buy-us-a-coffee', destination: '/donate', permanent: true },
      { source: '/event-feedback', destination: '/feedback', permanent: true },
      { source: '/community', destination: '/about', permanent: true },
    ];
  },
};

export default nextConfig;
