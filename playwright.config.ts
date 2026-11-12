import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks against the built site (apps/web/dist) served like Netlify serves it.
 * Run `pnpm build` first (with CONTENT_SOURCE=sample for deterministic content).
 */
const PORT = Number(process.env.E2E_PORT ?? 4321);

export default defineConfig({
  testDir: './e2e',
  // Baselines live next to the spec; VISUAL_SNAPSHOT_DIR points a run at another set (e.g. a reference build).
  snapshotPathTemplate: process.env.VISUAL_SNAPSHOT_DIR ? `${process.env.VISUAL_SNAPSHOT_DIR}/{projectName}/{arg}{ext}` : '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      args: [
        // Local runs in sandboxes may have an HTTP proxy configured; never send localhost through it.
        '--no-proxy-server',
        // Render text the same on every Linux machine, so visual baselines made in one place match CI:
        // greyscale antialiasing (no LCD subpixel colour), no hinting, sRGB colours.
        '--disable-lcd-text',
        '--font-render-hinting=none',
        '--force-color-profile=srgb',
      ],
    },
    trace: 'retain-on-failure',
    video: process.env.E2E_VIDEO ? 'on' : 'off',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `node tools/serve-dist.mjs ${PORT}${process.env.E2E_DIST ? ` ${process.env.E2E_DIST}` : ''}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
