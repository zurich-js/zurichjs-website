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
  // Restored for launch
  '/media/2026-09-signals-streams',
  '/events/2025-11-anniversary',
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
      // The Astro Fonts API names the face "Figtree-<hash>" (plus a metric-matched fallback face).
      loaded: [...document.fonts].some((f) => /^Figtree(-[0-9a-f]+)?$/.test(f.family.replace(/"/g, '')) && f.status === 'loaded'),
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
    ['/success', '/donate'],
    ['/checkout/success', '/events'],
    ['/workshops', '/events?from=workshops'],
    ['/workshops/react-performance', '/events?from=workshops'],
    ['/tshirt', '/donate?from=tshirt'],
    ['/checkout/cancel', '/donate'],
    ['/media-demo', '/media'],
    ['/profile/settings', '/'],
    ['/invite/abc123', '/about'],
    ['/api/sitemap.xml', '/sitemap.xml'],
    ['/api/og/home', '/og/home.png'],
    ['/event-feedback', '/feedback'],
    ['/cfp/form', '/cfp#proposal'],
    ['/policies/privacy', '/policies/privacy-policy'],
  ]) {
    const res = await request.get(from!, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    expect(res.headers().location, from).toBe(to);
  }
});

test('redirects keep the query string (old Stripe return links, legacy feedback links)', async ({ request }) => {
  const res = await request.get('/buy-us-a-coffee?canceled=true', { maxRedirects: 0 });
  expect(res.headers().location).toBe('/donate?canceled=true');
});

test('retired pages explain themselves where they land', async ({ page }) => {
  await page.goto('/workshops/react-performance');
  await expect(page.getByText(/Workshops have ended/)).toBeVisible();
  await page.goto('/tshirt');
  await expect(page.getByText(/T-shirt sales have ended/)).toBeVisible();
  await page.goto('/cfp/form');
  await expect(page).toHaveURL(/\/cfp#proposal$/);
});

test('keyboard users see a focus ring and can skip to content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('the mobile menu opens and closes from the keyboard, and focus returns to the button', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile only');
  await page.goto('/');
  const btn = page.getByRole('button', { name: 'Open menu' });
  await btn.focus();
  await page.keyboard.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.getByRole('link', { name: 'Events' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(btn).toBeFocused();
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  // The close button works too.
  await btn.click();
  await menu.getByRole('button', { name: 'Close menu' }).click();
  await expect(menu).toBeHidden();
});

test('the header turns into the floating bar once, without changing its height (no flicker)', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('[data-site-header]');
  const height = await header.evaluate((el) => el.offsetHeight);
  await header.evaluate((el) => {
    const w = window as unknown as { toggles: number };
    w.toggles = 0;
    new MutationObserver(() => w.toggles++).observe(el, { attributes: true, attributeFilter: ['data-scrolled'] });
  });
  // Small steps across the 40px threshold: a height change here used to make scroll anchoring flip the state back.
  for (let i = 0; i < 25; i++) await page.mouse.wheel(0, 2);
  await expect(header).toHaveAttribute('data-scrolled', '');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as unknown as { toggles: number }).toggles)).toBe(1);
  expect(await header.evaluate((el) => el.offsetHeight)).toBe(height);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(header).not.toHaveAttribute('data-scrolled');
});

test('the support page never shows a sample payment code', async ({ page }) => {
  // The Twint QR only comes from Sanity Site settings; sample content has none.
  await page.goto('/donate');
  await expect(page.locator('[data-twint-qr]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Other ways to give' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'hello@zurichjs.com' }).first()).toBeVisible();
});

test('regular builds are indexable and show no preview bar', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index,follow/);
  await expect(page.getByText('Draft preview')).toHaveCount(0);
  expect(await (await request.get('/robots.txt')).text()).toContain('Allow: /');
});
