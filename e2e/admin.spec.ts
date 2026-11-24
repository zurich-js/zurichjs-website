import { expect, test, type Route } from '@playwright/test';

/**
 * The members section of /admin (MembershipAdmin.tsx). The static server has no API, so every
 * /api call is answered here, in the shapes of apps/web/src/pages/api/membership/admin.
 */
const ADMIN = '/admin';

/** An AdminMember (apps/web/src/server/admin-views.ts). */
const member = (id: string, name: string) => ({
  id,
  name,
  organisationName: null,
  email: `${id}@example.org`,
  kind: 'individual',
  level: 'supporter',
  levelName: 'Supporter',
  cycle: 'yearly',
  category: 'individual',
  status: 'active',
  statusLabel: 'Active',
  endedReason: null,
  source: 'self_serve',
  paymentMode: 'card',
  joinedAt: '2026-01-10',
  paidUntil: '2027-01-10',
  hasAccount: true,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  notes: null,
  resignedAt: null,
  resignationConfirmedAt: null,
  createdAt: '2026-01-10T10:00:00.000Z',
});
const ADA = member('m-ada', 'Ada Lovelace');
const GRACE = member('m-grace', 'Grace Hopper');
const detail = (m: ReturnType<typeof member>) => ({ ok: true, member: m, termsVersion: null, certificates: [], events: [] });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00+01:00'));
  await page.route('**/api/membership/admin/session', (route) => route.fulfill({ json: { ok: true, signedIn: true } }));
  await page.route(/\/api\/membership\/admin\/members(\?.*)?$/, (route) => route.fulfill({ json: { ok: true, members: [ADA, GRACE], truncated: false, counts: null } }));
});

test('a sign-out the site does not confirm hides the admin area and offers Try again', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/membership/admin/logout', (route) => (attempts++ === 0 ? route.abort('connectionrefused') : route.fulfill({ json: { ok: true } })));
  await page.goto(ADMIN);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t sign you out.');
  await expect(page.getByRole('alert')).toContainText('This browser may still be signed in. Try again before you leave it.');
  await expect(page.getByRole('alert')).not.toContainText('close the browser');
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await expect(page.getByText(ADA.email)).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('a late answer for the member opened first does not replace the member opened since', async ({ page, isMobile }) => {
  let held: Route | null = null;
  await page.route(`**/api/membership/admin/members/${ADA.id}`, (route) => void (held = route));
  await page.route(`**/api/membership/admin/members/${GRACE.id}`, (route) => route.fulfill({ json: detail(GRACE) }));
  await page.goto(ADMIN);
  const open = (name: string) => (isMobile ? page.getByRole('list', { name: 'Members' }) : page.getByRole('table')).getByRole('button', { name, exact: true }).click();
  await open(ADA.name);
  await expect.poll(() => held !== null).toBe(true);
  await open(GRACE.name);
  await expect(page.locator('#h-member')).toHaveText(GRACE.name);
  await held!.fulfill({ json: detail(ADA) });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#h-member')).toHaveText(GRACE.name);
});

test('a late 401 for the member opened first does not sign out the member opened since', async ({ page, isMobile }) => {
  let held: Route | null = null;
  await page.route(`**/api/membership/admin/members/${ADA.id}`, (route) => void (held = route));
  await page.route(`**/api/membership/admin/members/${GRACE.id}`, (route) => route.fulfill({ json: detail(GRACE) }));
  await page.goto(ADMIN);
  const open = (name: string) => (isMobile ? page.getByRole('list', { name: 'Members' }) : page.getByRole('table')).getByRole('button', { name, exact: true }).click();
  await open(ADA.name);
  await expect.poll(() => held !== null).toBe(true);
  await open(GRACE.name);
  await expect(page.locator('#h-member')).toHaveText(GRACE.name);
  await held!.fulfill({ status: 401, json: { ok: false, error: 'Sign in to the admin area.' } });
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#h-member')).toHaveText(GRACE.name);
  await expect(page.getByLabel('Password')).toHaveCount(0);
});
