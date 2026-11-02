import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Automated accessibility (axe-core, WCAG 2.1 A and AA) on the pages this
 * launch restored or changed, at phone, tablet and desktop widths, plus the
 * open gallery viewer and rating dialog. Touch targets: interactive controls
 * in the main content are at least 24 px (WCAG 2.2 target size), most 44 px.
 */
const PAGES = [
  '/',
  '/events',
  '/events/2026-11-forms-types',
  '/events/2026-09-signals-streams?feedback=true',
  '/events/2025-11-anniversary',
  '/events/2026-11-forms-types?feedback=true',
  '/events/2026-07-summer-social?feedback=true',
  '/today',
  '/speakers',
  '/speakers/mia-entwurf',
  '/media',
  '/media/2026-09-signals-streams',
  '/partners',
  '/about',
  '/donate',
  '/donate/thanks',
  '/membership',
  '/feedback',
  '/cfp',
  '/contact',
  '/speakers/profile',
];

const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00+01:00'));
  await page.route('**/sample/clip.mp4', (route) => route.fulfill({ path: 'e2e/fixtures/clip.mp4', contentType: 'video/mp4' }));
});

for (const path of PAGES) {
  test(`${path}: no axe violations, no horizontal scroll at 768px`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(await axe(page)).toEqual([]);
    await page.setViewportSize({ width: 768, height: 1024 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

test('gallery viewer and rating dialog have no axe violations', async ({ page }) => {
  await page.goto('/media/2026-09-signals-streams');
  await page
    .getByRole('button', { name: /^Open photo:/ })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await axe(page)).toEqual([]);
  await page.clock.setFixedTime(new Date('2026-11-18T20:30:00+01:00'));
  await page.goto('/events/2026-11-forms-types');
  await page.getByRole('button', { name: 'Rate this talk' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test('touch targets in the main content are at least 24px', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone only');
  for (const path of ['/speakers', '/donate', '/partners', '/events/2026-11-forms-types', '/media/2026-09-signals-streams']) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main a, main button, main input:not([type=hidden]), main select')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          // Inline links inside sentences are exempt (WCAG 2.5.8).
          const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline';
          return r.width > 0 && r.height > 0 && !inline && (r.width < 24 || r.height < 24);
        })
        .map((el) => `${el.tagName} ${el.textContent?.trim().slice(0, 30)}`),
    );
    expect(small, path).toEqual([]);
  }
});
