import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks against the built site (apps/web/dist) served like Netlify serves it.
 * Run `pnpm build` first (with CONTENT_SOURCE=sample for deterministic content).
 */
const PORT = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Local runs in sandboxes may have an HTTP proxy configured; never send localhost through it.
    launchOptions: { args: ['--no-proxy-server'] },
    trace: 'retain-on-failure',
    video: process.env.E2E_VIDEO ? 'on' : 'off',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `node tools/serve-dist.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
