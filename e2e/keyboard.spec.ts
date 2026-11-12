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
