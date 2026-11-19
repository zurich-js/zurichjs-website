import { expect, test, type Page } from '@playwright/test';

/**
 * Keyboard behaviour of the shared controls: the dialog keeps Tab inside, and every one-of-many choice
 * (rating, billing and frequency switches) is a native radio group that arrow keys move.
 */
const at = async (page: Page, iso: string) => page.clock.setFixedTime(new Date(iso));
const hydrated = async (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

test('the rating dialog keeps Tab inside, arrow keys move the rating, and Escape closes it', async ({ page }) => {
  await at(page, '2026-11-01T12:00:00+01:00');
  await page.goto('/events/2026-09-signals-streams?feedback=true');
  const opener = page.getByRole('button', { name: 'Rate this talk' }).first();
  await opener.click();
  const dialog = page.getByRole('dialog');
  // Focus moves into the dialog, onto its first control.
  await expect(dialog.getByRole('radio', { name: '1 of 5' })).toBeFocused();

  // Tab forward and backward many times: focus never leaves the dialog.
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  }

  // The rating is one radio group: arrow keys choose.
  await dialog.getByRole('radio', { name: '1 of 5' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('radio', { name: '2 of 5' })).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Send rating' })).toBeEnabled();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('the donate frequency switch moves with arrow keys', async ({ page }) => {
  await page.goto('/donate');
  await hydrated(page);
  await page.getByRole('radio', { name: 'One-time' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Monthly' })).toBeChecked();
});

test('the membership billing switch moves with arrow keys', async ({ page }) => {
  await page.goto('/membership');
  await hydrated(page);
  await page.getByRole('radio', { name: 'Yearly', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Quarterly', exact: true })).toBeChecked();
});

test('the sponsorship billing switch moves with arrow keys and shows that price', async ({ page }) => {
  await page.goto('/partners');
  const tiers = page.locator('#sponsorship-tiers');
  await tiers.getByRole('radio', { name: 'Monthly' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tiers.getByRole('radio', { name: 'Yearly' })).toBeChecked();
  await expect(tiers.getByText('CHF 7’500')).toBeVisible();
});

test('"Add to calendar" is a menu: arrow keys move, Escape returns to the button, and the .ics file is a calendar entry', async ({ page, request }) => {
  await at(page, '2026-11-01T12:00:00+01:00');
  await page.goto('/events/2026-11-forms-types');
  const button = page.getByRole('button', { name: 'Add to calendar' });
  const menu = page.getByRole('menu');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeHidden();

  // Opens on the first item; the arrows move and wrap; Escape closes and returns focus.
  // (Retried until the island has hydrated; islands further down the page hydrate only when scrolled to.)
  await expect(async () => {
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true', { timeout: 500 });
  }).toPass();
  const items = menu.getByRole('menuitem');
  await expect(items).toHaveText([/^Google Calendar/, /^Outlook/, /^Apple \/ iCal$/]);
  await expect(items.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(items.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(0)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();

  // Google and Outlook open elsewhere; Apple and other apps get the event's own file.
  await button.click();
  await expect(items.nth(0)).toHaveAttribute('href', /^https:\/\/calendar\.google\.com\//);
  await expect(items.nth(0)).toHaveAttribute('target', '_blank');
  await expect(items.nth(2)).toHaveAttribute('href', '/events/2026-11-forms-types.ics');
  const ics = await request.get('/events/2026-11-forms-types.ics');
  expect(ics.status()).toBe(200);
  expect(ics.headers()['content-type']).toContain('text/calendar');
  const body = await ics.text();
  expect(body).toContain('BEGIN:VEVENT');
  expect(body).toContain('UID:');
  expect(body.match(/BEGIN:VEVENT/g)).toHaveLength(1);

  // A click outside closes it.
  await page.locator('h1').click();
  await expect(menu).toBeHidden();
});
