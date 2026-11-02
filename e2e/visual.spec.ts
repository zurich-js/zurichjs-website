import { expect, test } from '@playwright/test';

/**
 * Visual regression for the key templates (docs/design-system.md). Deterministic when the site is
 * built with CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00; the browser clock is fixed to
 * the same instant so islands render the same state as the HTML.
 *
 * Update baselines only for intended changes: `pnpm e2e visual -- --update-snapshots`.
 */
const NOW = new Date('2026-11-01T12:00:00+01:00');

const PAGES = [
  ['home', '/'],
  ['event-upcoming', '/events/2026-11-forms-types'],
  ['event-recap', '/events/2026-09-signals-streams'],
  ['speaker', '/speakers/anna-beispiel'],
  ['about', '/about'],
  ['today', '/today'],
  ['cfp', '/cfp'],
  ['design-gallery', '/design'],
  // Restored for launch
  ['event-past-untimed', '/events/2025-11-anniversary'],
  ['speakers', '/speakers'],
  ['media-event', '/media/2026-09-signals-streams'],
  ['partners', '/partners'],
  ['donate', '/donate'],
  ['membership', '/membership'],
] as const;

test.describe('visual', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/sample/clip.mp4', (route) => route.fulfill({ path: 'e2e/fixtures/clip.mp4', contentType: 'video/mp4' }));
    await page.clock.setFixedTime(NOW);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  for (const [name, path] of PAGES) {
    test(name, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.evaluate(async () => {
        for (const img of document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]')) img.loading = 'eager';
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => i.addEventListener('load', r, { once: true })))));
        // Long pages with many photos: wait until every image is decoded, not just loaded.
        await Promise.all([...document.images].map((i) => i.decode().catch(() => null)));
      });
      await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: Number(process.env.VISUAL_MAX_DIFF ?? 0.01) });
    });
  }
});
