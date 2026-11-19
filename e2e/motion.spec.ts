import { expect, test, type Page } from '@playwright/test';

/**
 * The motion layer (packages/design/src/motion.css) with motion on. Every other spec runs with reduced motion
 * (playwright.config.ts), so this is the one place that checks things actually move, and that they settle.
 */
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

/** The Motion section of the /design gallery. */
const MOTION = 'section[aria-labelledby="d-motion"]';

/** Scrolls an element into view and waits until it and everything around it has risen in (scroll reveals). */
const settle = async (page: Page, sel: string) => {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'motion-reveal' && a.playState === 'running').length))
    .toBe(0);
};

/** CSS transitions running on an element or its pseudo-elements, by property. */
const running = (sel: string) => `[...document.querySelector(${JSON.stringify(sel)}).getAnimations({ subtree: true })].map((a) => a.transitionProperty ?? a.animationName)`;

test('the segmented thumb slides to the checked option', async ({ page }) => {
  await page.goto('/design');
  await settle(page, `${MOTION} .segmented`);
  const track = page.locator(`${MOTION} .segmented`);
  const thumbX = () => track.evaluate((el) => getComputedStyle(el, '::before').translate);
  const before = await thumbX();
  await track.getByRole('radio', { name: 'Yearly' }).check();
  expect(await page.evaluate(running(MOTION + ' .segmented'))).toContain('translate');
  await expect.poll(thumbX).not.toBe(before);
  // Settled: no transition left, the thumb one option wide and three options along; the options all as wide.
  await expect.poll(() => page.evaluate(running(MOTION + ' .segmented'))).toEqual([]);
  const { index, thumb, widths } = await track.evaluate((el) => ({
    index: getComputedStyle(el).getPropertyValue('--seg-i').trim(),
    thumb: Math.round(parseFloat(getComputedStyle(el, '::before').width)),
    widths: [...el.children].map((c) => Math.round(c.getBoundingClientRect().width)),
  }));
  expect(index).toBe('2');
  expect(new Set(widths).size).toBe(1);
  expect(Math.abs(thumb - widths[0]!)).toBeLessThanOrEqual(1);
});

test('a disclosure card animates open', async ({ page }) => {
  await page.goto('/design');
  await settle(page, `${MOTION} details`);
  const card = page.locator(`${MOTION} details`);
  await card.locator('summary').click();
  await expect(card).toHaveAttribute('open', '');
  expect(await page.evaluate(running(MOTION + ' details'))).not.toEqual([]);
});

test('pages change with a cross-document view transition', async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener('pagereveal', (e) => {
      const vt = (e as Event & { viewTransition?: { ready: Promise<void> } }).viewTransition;
      (window as unknown as { __vt: boolean }).__vt = !!vt;
      // Which parts of the page animate: the new page, never the old one (fading it showed white between pages).
      vt?.ready.then(() => {
        (window as unknown as { __parts: string[] }).__parts = document.getAnimations().map((a) => (a.effect as KeyframeEffect).pseudoElement ?? '');
      });
    });
  });
  await page.goto('/design');
  // The breadcrumb's link to the home page: in view on load at every width.
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Home' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  // pagereveal can come just after load: wait for it.
  await expect.poll(() => page.evaluate(() => (window as unknown as { __vt?: boolean }).__vt)).toBe(true);
  const parts = await page.evaluate(() => (window as unknown as { __parts?: string[] }).__parts ?? []);
  expect(parts).toContain('::view-transition-new(root)');
  expect(parts).not.toContain('::view-transition-old(root)');
});

test.describe('desktop only', () => {
  test.skip(({ isMobile }) => isMobile, 'the "Get involved" menu is in the desktop bar');

  test('"Get involved" drops in and fades out', async ({ page }) => {
    await page.goto('/design');
    const toggle = page.locator('[data-involved-toggle]');
    const menu = page.locator('#involved-menu');
    await toggle.click();
    await expect(menu).toBeVisible();
    expect(await page.evaluate(running('#involved-menu'))).toEqual(expect.arrayContaining(['opacity', 'translate']));
    await expect.poll(() => menu.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await page.keyboard.press('Escape');
    // Leaving: still drawn while it fades, then gone.
    expect(await page.evaluate(running('#involved-menu'))).toContain('opacity');
    await expect(menu).toBeHidden();
  });

  test('the current page’s link is yellow, the others white', async ({ page }) => {
    await page.goto('/speakers');
    const color = (href: string) => page.locator(`header nav a[href="${href}"]`).evaluate((el) => getComputedStyle(el).color);
    // #F1E271 and white.
    expect(await color('/speakers')).toBe('rgb(241, 226, 113)');
    expect(await color('/events')).toBe('rgb(255, 255, 255)');
    expect(await page.locator('header nav a[href="/speakers"]').evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
  });

  test('nav links get a pill on hover that grows and fades in', async ({ page }) => {
    await page.goto('/design');
    const link = page.locator('header nav a[href="/media"]');
    const pill = () => link.evaluate((el) => getComputedStyle(el, '::before').opacity);
    expect(await pill()).toBe('0');
    await link.hover();
    expect(await page.evaluate(running('header nav a[href="/media"]'))).toEqual(expect.arrayContaining(['opacity', 'scale']));
    await expect.poll(pill).toBe('1');
  });

  test('a speaker photo sits turned on a grey card and straightens on hover', async ({ page }) => {
    await page.goto('/speakers');
    const card = page.locator('[data-speaker-card]').first();
    await settle(page, '[data-speaker-card] >> nth=0');
    const photo = card.locator('> span > span:not([aria-hidden])').first();
    expect(await photo.evaluate((el) => getComputedStyle(el).rotate)).not.toBe('0deg');
    await card.hover();
    await expect.poll(() => photo.evaluate((el) => getComputedStyle(el).rotate)).toBe('0deg');
  });
});

test('content rises in as it scrolls into view, again after scrolling back up, and the opening enters on load', async ({ page }) => {
  await page.goto('/speakers');
  // The opening's lines enter on load.
  expect(
    await page
      .locator('[data-entrance="children"] > *')
      .first()
      .evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName)),
  ).toContain('motion-reveal');
  // Below the fold, cards wait hidden and lower.
  const last = page.locator('[data-speaker-card]').last();
  expect(await last.evaluate((el) => [getComputedStyle(el).opacity, el.hasAttribute('data-revealed')])).toEqual(['0', false]);
  // The search and topics (a plain block, not a section) rise in too.
  await settle(page, '[data-search-form]');
  await expect(page.locator('[data-search-form]')).toHaveAttribute('data-reveal-done', '');
  // Scrolled to, they rise in and settle fully visible, with nothing left over.
  await settle(page, '[data-speaker-card] >> nth=-1');
  await expect.poll(() => last.evaluate((el) => [getComputedStyle(el).opacity, getComputedStyle(el).translate, el.hasAttribute('data-reveal-done')])).toEqual(['1', 'none', true]);
  // Cards revealed together go one after another.
  const delays = await page.locator('[data-speaker-card][data-revealed]').evaluateAll((els) => [...new Set(els.map((el) => el.style.getPropertyValue('--reveal-i')))]);
  expect(delays.length).toBeGreaterThan(1);
  // Back at the top: the last card has dropped below and waits to rise in again; the top of the page did not re-run.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => last.evaluate((el) => el.hasAttribute('data-revealed'))).toBe(false);
  // Down again: it rises in again.
  await settle(page, '[data-speaker-card] >> nth=-1');
  await expect.poll(() => last.evaluate((el) => el.hasAttribute('data-reveal-done'))).toBe(true);
});

test('what sits between sections rises in too: a callout card, and the event page’s summary', async ({ page }) => {
  // /cfv: the award callout is a card next to the page's sections, not inside one.
  await page.goto('/cfv');
  const callout = page.locator('main :has(> section) > :not(section)', { hasText: 'award-winning community' }).first();
  expect(await callout.evaluate((el) => [getComputedStyle(el).opacity, el.hasAttribute('data-revealed')])).toEqual(['0', false]);
  await callout.scrollIntoViewIfNeeded();
  await expect.poll(() => callout.evaluate((el) => [getComputedStyle(el).opacity, el.hasAttribute('data-reveal-done')])).toEqual(['1', true]);

  // An event page: the summary card in the side column (an island).
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00+01:00'));
  await page.goto('/events/2026-11-forms-types');
  const summary = page.getByRole('complementary', { name: 'Event summary' });
  await summary.scrollIntoViewIfNeeded();
  await expect.poll(() => summary.evaluate((el) => [getComputedStyle(el).opacity, el.hasAttribute('data-reveal-done')])).toEqual(['1', true]);
});

test('content coming in from above, scrolling up, is shown without rising in', async ({ page }) => {
  await page.goto('/speakers');
  // Straight to the bottom: the cards in the middle never revealed.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page, 'footer');
  const rising = () => page.evaluate(() => document.getAnimations().filter((a) => (a as CSSAnimation).animationName === 'motion-reveal' && a.playState === 'running').length);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -150);
    await page.waitForTimeout(60);
    expect(await rising()).toBe(0);
  }
  // What came in from above is there, fully visible.
  const shown = await page.locator('[data-speaker-card][data-revealed]').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
  expect(shown.length).toBeGreaterThan(0);
  expect(new Set(shown)).toEqual(new Set(['1']));
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('nothing is hidden and nothing moves', async ({ page }) => {
    await page.goto('/speakers');
    expect(await page.evaluate(() => document.documentElement.hasAttribute('data-motion'))).toBe(false);
    expect(
      await page
        .locator('[data-speaker-card]')
        .last()
        .evaluate((el) => getComputedStyle(el).opacity),
    ).toBe('1');
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  });
});

/** The supporters section on the home page. */
const HOSTS = 'section[aria-labelledby="h-hosts"]';

test('the logo rows move, hold under the pointer and show a logo in colour', async ({ page, isMobile }) => {
  await page.goto('/');
  // The heading, not a row: a row never stops moving, so it is never "stable" to scroll to.
  await settle(page, `${HOSTS} h3 >> nth=1`);
  const rows = page.locator(`${HOSTS} .motion-marquee`);
  await expect(rows).toHaveCount(2);
  const row = rows.first();
  const state = () => row.evaluate((el) => getComputedStyle(el).animationPlayState);
  const x = () => row.evaluate((el) => el.getBoundingClientRect().x);
  expect(await state()).toBe('running');
  const before = await x();
  await expect.poll(x).not.toBe(before);
  // The two rows move in opposite directions.
  expect(await rows.evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDirection))).toEqual(['normal', 'reverse']);
  // Hover styles apply only where there is a pointer that hovers.
  if (isMobile) return;
  // Every logo on screen can be hovered, the repeated copies too: the row holds and the logo turns to colour.
  const box = (await row.boundingBox())!;
  await page.mouse.move(page.viewportSize()!.width / 2, box.y + box.height / 2);
  expect(await state()).toBe('paused');
  const hovered = page.locator(`${HOSTS} .motion-marquee a:hover`);
  await expect(hovered).toHaveCount(1);
  await expect.poll(() => hovered.locator('img').evaluateAll((imgs) => imgs.map((i) => getComputedStyle(i).opacity))).toEqual(['0', '1']);
  // The keyboard meets each logo once: links in the copies are skipped.
  const links = await row.evaluate((el) => ({
    first: el.querySelectorAll('ul:first-child a:not([tabindex="-1"])').length,
    all: el.querySelectorAll('a:not([tabindex="-1"])').length,
    hidden: el.querySelectorAll('ul[aria-hidden="true"]').length,
    lists: el.querySelectorAll('ul').length,
  }));
  expect(links.all).toBe(links.first);
  expect(links.hidden).toBe(links.lists - 1);
});

test("a sponsor's card flips to its hover colour, and one without a hover colour stays white", async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover styles apply only where there is a pointer that hovers');
  await page.goto('/');
  await settle(page, `${HOSTS} a`);
  const card = (name: string) => page.locator(`${HOSTS} a:has(img[alt^="${name}"])`).first();
  const look = (name: string) =>
    card(name).evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      imgs: [...el.querySelectorAll('img')].map((i) => `${getComputedStyle(i).opacity} ${getComputedStyle(i).filter}`),
    }));
  // Stripe has a hover colour: a white card with the colour logo, then its purple with the logo in white.
  expect(await look('Stripe')).toEqual({ bg: 'rgb(255, 255, 255)', imgs: ['1 none', '0 brightness(0) invert(1)'] });
  await card('Stripe').hover();
  await expect.poll(() => look('Stripe')).toEqual({ bg: 'rgb(99, 91, 255)', imgs: ['0 none', '1 brightness(0) invert(1)'] });
  // FIN has none: nothing but the frame changes.
  await card('FIN').hover();
  await expect.poll(() => look('FIN')).toEqual({ bg: 'rgb(255, 255, 255)', imgs: ['1 none'] });
});

test.describe('with reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the logo rows do not move: the logos wrap, once each, with no fade', async ({ page }) => {
    await page.goto('/');
    const row = page.locator(`${HOSTS} .motion-marquee`).first();
    await row.scrollIntoViewIfNeeded();
    const got = await row.evaluate((el) => ({
      animation: getComputedStyle(el).animationName,
      wrap: getComputedStyle(el.querySelector('ul')!).flexWrap,
      copies: [...el.querySelectorAll('ul[aria-hidden="true"]')].filter((u) => getComputedStyle(u).display !== 'none').length,
      mask: getComputedStyle(el.parentElement!).maskImage,
      fits: el.querySelector('ul')!.getBoundingClientRect().right <= innerWidth,
    }));
    expect(got).toEqual({ animation: 'none', wrap: 'wrap', copies: 0, mask: 'none', fits: true });
  });
});
