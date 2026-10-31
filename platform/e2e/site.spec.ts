import { expect, test } from '@playwright/test';

/** Routes every build must have (V2 sitemap, Phase 1). */
export const ROUTES = [
  '/',
  '/events',
  '/events/2026-11-forms-types',
  '/events/2026-09-signals-streams',
  '/speakers',
  '/speakers/anna-beispiel',
  '/cfp',
  '/about',
  '/about/why-zurichjs',
  '/today',
  '/partners',
  '/feedback',
  '/contact',
  '/donate',
  '/cfv',
  '/media',
  '/policies/code-of-conduct',
  '/policies/privacy-policy',
  '/policies/terms-and-conditions',
  '/policies/refund-policy',
  // Phase 1b: production routes outside the V2 design
  '/meetups/javascript-zurich',
  '/meetups/ai-ml-zurich',
  '/conferences/tech-conferences-zurich',
  '/ai-context',
  '/membership',
  '/waitlist/conf',
  '/success',
  '/checkout/success',
];

for (const route of ROUTES) {
  test(`${route} renders with Figtree, one h1 and no horizontal scroll`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    const info = await page.evaluate(() => ({
      font: getComputedStyle(document.body).fontFamily,
      loaded: [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Figtree' && f.status === 'loaded'),
      h1: document.querySelectorAll('h1').length,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(info.font).toMatch(/^Figtree/);
    expect(info.loaded).toBe(true);
    expect(info.h1).toBe(1);
    expect(info.overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test('no horizontal scroll at 320px on any route', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const route of ROUTES) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, route).toBeLessThanOrEqual(0);
  }
});

test('legacy URLs redirect permanently', async ({ request }) => {
  for (const [from, to] of [
    ['/partnerships', '/partners'],
    ['/buy-us-a-coffee', '/donate'],
    ['/support', '/donate'],
    ['/event-feedback', '/feedback'],
    ['/cfp/form', '/cfp'],
    ['/policies/privacy', '/policies/privacy-policy'],
  ]) {
    const res = await request.get(from!, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers().location, from).toBe(to);
  }
});

test('keyboard users see a focus ring and can skip to content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('the mobile menu opens and closes from the keyboard', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const btn = page.locator('[data-menu-toggle]');
  await expect(btn).toHaveText('Menu');
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mobile-nav')).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#mobile-nav')).toBeHidden();
  await expect(btn).toHaveText('Menu');
});
