import { expect, test } from '@playwright/test';

/** /membership/account (MemberAccount.tsx) when the site does not answer as itself. */
const ACCOUNT = '/membership/account';

test('a platform 503 page offers Try again; only the site’s own 503 says accounts are not available', async ({ page }) => {
  let html = true;
  await page.route('**/api/membership/me', (route) =>
    html
      ? route.fulfill({ status: 503, contentType: 'text/html', body: '<html>Service Unavailable</html>' })
      : route.fulfill({ status: 503, json: { ok: false, error: 'Member accounts are not available yet.' } }),
  );
  await page.goto(ACCOUNT);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText(/not available yet/)).toHaveCount(0);
  html = false;
  await page.reload();
  await expect(page.getByText(/Member accounts are not available yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});

test('a request that never answers ends with Try again after 20 seconds', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/membership/me', () => undefined);
  await page.goto(ACCOUNT);
  await expect(page.getByRole('status')).toHaveText('Loading your account…');
  await page.clock.runFor(1_000);
  await page.clock.fastForward(20_000);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
