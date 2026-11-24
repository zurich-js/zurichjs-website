import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { AGREEMENT } from '../packages/sponsorship/src/agreement.ts';
import { CYCLES, TIERS, feeLabel } from '../packages/sponsorship/src/tiers.ts';

/**
 * The signed-in sponsorship screens: /partners/account (SponsorAccount.tsx), the board's
 * /admin/sponsors (SponsorsAdmin.tsx) and the static /partners/agreement. The static server has
 * no API, so every /api call is answered here, in the shapes the routes' header comments give
 * (apps/web/src/pages/api/sponsorship, apps/web/src/pages/api/membership/admin/sponsors).
 */
const ACCOUNT = '/partners/account';
const ADMIN = '/admin/sponsors';
const ADMIN_API = '/api/membership/admin/sponsors';
const EMAIL = 'ana@acme.example';

/** A SponsorView (apps/web/src/server/sponsor.ts): Community Friend, yearly, by card, active. */
const sponsor = (over: Record<string, unknown> = {}) => ({
  id: '7d2f6a0e-5b1c-4f1e-9a53-2f0c8f1f0001',
  companyName: 'Acme AG',
  legalName: 'Acme Holding AG',
  billingAddress: 'Bahnhofstrasse 1\n8001 Zurich',
  vatId: null,
  website: 'https://acme.example',
  tier: 'friend',
  tierName: 'Community Friend',
  benefits: ['Logo on zurichjs.com'],
  cycle: 'yearly',
  cycleLabel: 'Yearly',
  feeLabel: feeLabel('friend', 'yearly'),
  pricePerMeetup: null,
  meetups: [],
  paymentMode: 'card',
  paymentLabel: 'By card',
  status: 'active',
  statusLabel: 'active',
  endedReason: null,
  startedAt: '2026-11-02',
  paidUntil: '2027-11-02',
  paidThrough: '2027-11-01',
  endsAt: null,
  lastDay: null,
  hasStripeCustomer: true,
  hasSubscription: true,
  hasContract: false,
  source: 'self_serve',
  ...over,
});

const contact = { id: 'c-1', name: 'Ana Muster', email: EMAIL, role: 'primary', hasAccount: true, pending: false, addedBy: null };

/** GET /api/sponsorship/me for a signed-in contact of a sponsor whose current agreement is signed. */
const me = (s: ReturnType<typeof sponsor> | null) => ({
  ok: true,
  email: EMAIL,
  agreementVersion: AGREEMENT.version,
  contact: s ? contact : null,
  sponsor: s,
  contacts: s ? [contact] : [],
  agreements: [],
  logos: [],
  contracts: [],
  pendingChange: null,
  signedCurrent: !!s,
  signer: s ? { name: 'Ana Muster', title: 'Head of Engineering' } : null,
  invitation: null,
});

/** The board's row and detail: the sponsor plus what only the board sees (adminSponsorView). */
const adminSponsor = (over: Record<string, unknown> = {}) => ({
  ...sponsor(),
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  paymentLinkUrl: null,
  partnerId: null,
  notes: null,
  endRequestedAt: null,
  createdAt: '2026-11-02T09:00:00.000Z',
  ...over,
});

const ACME = adminSponsor({ attention: [] });
const BOLT = adminSponsor({
  id: '7d2f6a0e-5b1c-4f1e-9a53-2f0c8f1f0002',
  companyName: 'Bolt GmbH',
  legalName: null,
  tier: 'builder',
  tierName: 'Community Builder',
  cycle: 'quarterly',
  cycleLabel: 'Quarterly',
  feeLabel: feeLabel('builder', 'quarterly'),
  paymentMode: 'manual',
  paymentLabel: 'By bank transfer to ZurichJS',
  status: 'past_due',
  statusLabel: 'payment overdue',
  paidUntil: '2026-11-01',
  paidThrough: '2026-10-31',
  hasStripeCustomer: false,
  hasSubscription: false,
  source: 'imported',
  createdAt: '2026-08-01T09:00:00.000Z',
  attention: ['manual_overdue'],
});

const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
};

/** Answers GET /api/sponsorship/me with whatever `current()` returns at that moment. */
const mockMe = (page: Page, current: () => unknown) => page.route('**/api/sponsorship/me', (route) => route.fulfill({ json: current() }));

/** The admin area signed in, with the list (recording each list request's query) and Bolt's detail. */
async function mockAdmin(page: Page) {
  const listQueries: string[] = [];
  await page.route('**/api/membership/admin/session', (route) => route.fulfill({ json: { ok: true, signedIn: true } }));
  await page.route(/\/api\/membership\/admin\/sponsors(\?.*)?$/, async (route: Route) => {
    const url = new URL(route.request().url());
    listQueries.push(url.search);
    const status = url.searchParams.get('status');
    const sponsors = [ACME, BOLT].filter((s) => !status || s.status === status);
    await route.fulfill({
      json: {
        ok: true,
        sponsors,
        counts: { pending: 0, active: 1, past_due: 1, ending: 0, ended: 0 },
        attentionLabels: { manual_overdue: 'Bank transfer overdue' },
      },
    });
  });
  await page.route(`**${ADMIN_API}/${BOLT.id}`, (route) => {
    const { attention, ...row } = BOLT;
    return route.fulfill({
      json: {
        ok: true,
        sponsor: row,
        attention,
        contacts: [{ id: 'c-9', name: 'Beat Beispiel', email: 'beat@bolt.example', role: 'billing', hasAccount: true, pending: false, addedBy: null }],
        agreements: [],
        logos: [],
        contracts: [],
        events: [],
        pendingChange: null,
      },
    });
  });
  return listQueries;
}

/** The list is cards on a phone and a table from the breakpoint; both are named "Sponsors". */
const sponsorList = (page: Page, isMobile: boolean) => (isMobile ? page.getByRole('list', { name: 'Sponsors' }) : page.getByRole('table', { name: 'Sponsors' }));

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00+01:00'));
});

test.describe('the sponsorship page (/partners/account)', () => {
  test('signed out: an invalid email is caught, a valid one asks for a sign-in link and says to check the inbox', async ({ page }) => {
    const sent: Record<string, unknown>[] = [];
    await page.route('**/api/sponsorship/me', (route) => route.fulfill({ status: 401, json: { ok: false, error: 'Sign in first.' } }));
    await page.route('**/api/auth/sign-in/magic-link', async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ json: { status: true } });
    });
    await page.goto(ACCOUNT);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    const email = page.getByLabel('Work email');
    const submit = page.getByRole('button', { name: 'Email me a sign-in link' });

    await email.fill('not-an-email');
    await submit.click();
    await expect(page.getByText('Enter an email like name@example.com.')).toBeVisible();
    expect(sent).toEqual([]);

    await email.fill('  Ana@Acme.Example ');
    await submit.click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(`We sent a sign-in link to ${EMAIL}. It works once, for 15 minutes.`)).toBeVisible();
    expect(sent).toEqual([{ email: EMAIL, callbackURL: ACCOUNT, errorCallbackURL: `${ACCOUNT}?link=invalid` }]);
  });

  test('signed in: covered meetups load on their own, say their state in words, and retry after an error', async ({ page }) => {
    let calls = 0;
    await mockMe(page, () => me(sponsor()));
    await page.route('**/api/sponsorship/coverage', (route) =>
      ++calls === 1
        ? route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t load your meetups right now.' } })
        : route.fulfill({
            json: {
              ok: true,
              checked: true,
              meetups: [
                { eventId: 'e-dec', title: 'ZurichJS Meetup December', date: '2026-12-09', state: 'cancelled', url: '/events/zurichjs-december' },
                { eventId: 'e-jan', title: 'ZurichJS Meetup January', date: '2027-01-13', state: 'upcoming', url: '/events/zurichjs-january' },
              ],
            },
          }),
    );
    await page.goto(ACCOUNT);
    const section = page.getByRole('region', { name: 'Meetups you sponsor' });
    await expect(section.getByText('We couldn’t load your meetups right now.')).toBeVisible();
    // The rest of the account still shows.
    await expect(page.getByText(`Signed in as ${EMAIL}`)).toBeVisible();
    await section.getByRole('button', { name: 'Try again' }).click();
    await expect(section.getByText('ZurichJS Meetup January')).toBeVisible();
    await expect(section.getByText('Cancelled')).toBeVisible();
    await expect(section.getByText('Upcoming')).toBeVisible();
    await expect(section.getByRole('link', { name: 'ZurichJS Meetup January' })).toHaveAttribute('href', '/events/zurichjs-january');
    expect(await axe(page)).toEqual([]);
  });

  test('signed in: the covered meetups still show when the sponsorship itself fails to load', async ({ page }) => {
    await page.route('**/api/sponsorship/me', (route) => route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t load your billing right now.' } }));
    await page.route('**/api/sponsorship/coverage', (route) =>
      route.fulfill({
        json: {
          ok: true,
          once: false,
          checked: true,
          meetups: [{ eventId: 'e-jan', title: 'ZurichJS Meetup January', date: '2027-01-13', state: 'upcoming', url: '/events/zurichjs-january' }],
        },
      }),
    );
    await page.goto(ACCOUNT);
    await expect(page.getByText('We couldn’t load your billing right now.')).toBeVisible();
    const section = page.getByRole('region', { name: 'Meetups you sponsor' });
    await expect(section.getByRole('link', { name: 'ZurichJS Meetup January' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test('without accounts configured (503) the page says so and offers no form', async ({ page }) => {
    await page.route('**/api/sponsorship/me', (route) => route.fulfill({ status: 503, json: { ok: false } }));
    await page.goto(ACCOUNT);
    await expect(page.getByText('Sponsor accounts are not available yet.')).toBeVisible();
    await expect(page.getByRole('main').getByRole('textbox')).toHaveCount(0);
  });

  test('signed in without a sponsorship: tiers show the fee of the chosen billing, and signing posts the plan to /start', async ({ page }) => {
    const sent: Record<string, unknown>[] = [];
    await mockMe(page, () => me(null));
    await page.route('**/api/sponsorship/start', async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ json: { ok: true, checkoutUrl: `${ACCOUNT}?checkout=cancelled` } });
    });
    await page.goto(ACCOUNT);
    await expect(page.getByRole('heading', { name: 'Start a sponsorship' })).toBeVisible();
    await expect(page.getByText(`Signed in as ${EMAIL}`)).toBeVisible();

    // Yearly and Community Friend are the defaults; every tier is offered with its yearly fee.
    const tiers = page.getByRole('group', { name: 'Tier' });
    const billing = page.getByRole('group', { name: 'How often you pay' });
    await expect(billing.getByRole('radio', { name: 'Yearly' })).toBeChecked();
    await expect(tiers.getByRole('radio', { name: `Community Friend, ${feeLabel('friend', 'yearly')}` })).toBeChecked();
    for (const t of TIERS) await expect(tiers.getByRole('radio', { name: `${t.name}, ${feeLabel(t.key, 'yearly')}` })).toBeVisible();
    await expect(billing.getByRole('radio')).toHaveCount(CYCLES.length);

    // Another billing shows that billing's fees.
    await billing.getByRole('radio', { name: 'Quarterly' }).check();
    for (const t of TIERS) await expect(tiers.getByRole('radio', { name: `${t.name}, ${feeLabel(t.key, 'quarterly')}` })).toBeVisible();
    await expect(tiers.getByRole('radio', { name: 'Community Builder, CHF 1’400 a quarter' })).toBeVisible();
    await tiers.getByRole('radio', { name: /^Community Builder,/ }).check();

    // Nothing is sent until the company is named and the agreement is signed in full.
    const submit = page.getByRole('button', { name: 'Sign and continue to payment' });
    await submit.click();
    await expect(page.getByText('Add the company name.')).toBeVisible();
    await expect(page.getByText('Accept the sponsorship agreement to continue.')).toBeVisible();
    await expect(page.getByText('Add your full name to sign.')).toBeVisible();
    expect(sent).toEqual([]);

    await page.getByLabel('Company name').fill('Acme AG');
    await page.getByRole('checkbox', { name: 'I have read and accept the sponsorship agreement on behalf of Acme AG.' }).check();
    await page.getByLabel('Your full name').fill('Ana Muster');
    await page.getByLabel('Your role at the company').fill('Head of Engineering');
    await submit.click();

    // The (stubbed) Stripe page sends them back without paying.
    await expect(page.getByText('Payment not completed. Nothing was charged.')).toBeVisible();
    expect(sent).toEqual([
      {
        companyName: 'Acme AG',
        legalName: '',
        website: '',
        billingAddress: '',
        vatId: '',
        tier: 'builder',
        cycle: 'quarterly',
        signerName: 'Ana Muster',
        signerTitle: 'Head of Engineering',
        agreementVersion: AGREEMENT.version,
      },
    ]);
  });

  test('an active sponsorship: the summary, then ending it; a failed request (500) is explained and keeps the form', async ({ page }) => {
    let current = sponsor();
    const sent: unknown[] = [];
    let fail = true;
    await mockMe(page, () => me(current));
    await page.route('**/api/sponsorship/end', async (route) => {
      sent.push(route.request().postDataJSON());
      if (fail) return route.fulfill({ status: 500, body: 'Internal Server Error' });
      current = sponsor({ status: 'ending', statusLabel: 'ending', endsAt: '2027-11-02', lastDay: '2027-11-01' });
      await route.fulfill({ json: { ok: true, sponsor: current } });
    });
    await page.goto(ACCOUNT);

    const card = page.getByRole('region', { name: 'Acme AG' });
    await expect(card.getByText('Active, paid through 1st November 2027')).toBeVisible();
    const row = (term: string) => card.locator('dl > div', { has: page.locator('dt', { hasText: new RegExp(`^${term}$`) }) }).locator('dd');
    await expect(row('Tier')).toHaveText('Community Friend');
    await expect(row('Fee')).toHaveText('CHF 3’000 a year');
    await expect(row('How often you pay')).toHaveText('Yearly');
    await expect(row('Payment')).toHaveText('By card');
    await expect(card.getByRole('button', { name: 'Change tier or how often you pay' })).toBeVisible();

    const end = page.getByRole('region', { name: 'End sponsorship' });
    await end.getByRole('button', { name: 'End sponsorship' }).click();
    await expect(end.getByText(/your last day is 1st November 2027/)).toBeVisible();
    // The current agreement is signed, so ending is one tick: without it nothing is sent.
    const tick = end.getByRole('checkbox', { name: /^Confirm as Ana Muster, Head of Engineering/ });
    const confirm = end.getByRole('button', { name: 'End the sponsorship' });
    await confirm.click();
    await expect(end.getByText('Tick the box to confirm.')).toBeVisible();
    expect(sent).toEqual([]);

    await tick.check();
    await confirm.click();
    await expect(end.getByRole('alert')).toHaveText('That did not work. Try again, or write to hello@zurichjs.com.');
    // Nothing is lost: the form is still open and ticked, and the sponsorship still shows as active.
    await expect(tick).toBeChecked();
    await expect(confirm).toBeEnabled();
    await expect(card.getByText('Active, paid through 1st November 2027')).toBeVisible();

    fail = false;
    await confirm.click();
    await expect(end.getByRole('status')).toHaveText('Done. Your sponsorship ends after 1st November 2027. Nothing more is charged, and you can keep it until then.');
    await expect(end.getByRole('alert')).toHaveCount(0);
    await expect(card.getByText('Ending on 1st November 2027')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Keep the sponsorship' })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Change tier or how often you pay' })).toHaveCount(0);
    const signed = { confirm: true, agreementVersion: AGREEMENT.version };
    expect(sent).toEqual([signed, signed]);
  });

  test('a sponsorship that is ending can be kept: /end/undo is called and the page says it continues', async ({ page }) => {
    let current = sponsor({ status: 'ending', statusLabel: 'ending', endsAt: '2027-11-02', lastDay: '2027-11-01' });
    let undone = 0;
    await mockMe(page, () => me(current));
    await page.route('**/api/sponsorship/end/undo', async (route) => {
      undone += 1;
      current = sponsor();
      await route.fulfill({ json: { ok: true, sponsor: current } });
    });
    await page.goto(ACCOUNT);
    const card = page.getByRole('region', { name: 'Acme AG' });
    await expect(card.getByText('Ending on 1st November 2027')).toBeVisible();
    // Nothing to end twice.
    await expect(page.getByRole('heading', { name: 'End sponsorship' })).toHaveCount(0);

    await card.getByRole('button', { name: 'Keep the sponsorship' }).click();
    await expect(card.getByRole('status')).toHaveText('Done. Your sponsorship continues as before, and it renews as usual.');
    await expect(card.getByText('Active, paid through 1st November 2027')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Keep the sponsorship' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'End sponsorship' })).toBeVisible();
    expect(undone).toBe(1);
  });

  test('the signed-in page has no axe violations', async ({ page }) => {
    await mockMe(page, () => me(sponsor()));
    await page.goto(ACCOUNT);
    await expect(page.getByRole('heading', { name: 'Agreements and contracts' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});

test.describe('the board’s sponsors (/admin/sponsors)', () => {
  test('the list shows each sponsor’s plan and status, filters by status, and opens one sponsor', async ({ page, isMobile }) => {
    const queries = await mockAdmin(page);
    await page.goto(ADMIN);
    await expect(page.getByRole('heading', { name: 'Sponsors' })).toBeVisible();
    const list = sponsorList(page, isMobile);
    const entries = list.getByRole(isMobile ? 'listitem' : 'row').filter({ has: page.getByRole('link') });
    // What needs someone comes first, although the API answers newest first.
    await expect(entries).toHaveCount(2);
    await expect(entries.nth(0)).toContainText('Bolt GmbH');
    await expect(entries.nth(0)).toContainText('Payment overdue');
    await expect(entries.nth(0)).toContainText('Bank transfer overdue');
    await expect(entries.nth(0)).toContainText('Community Builder');
    await expect(entries.nth(0)).toContainText('CHF 1’400 a quarter');
    await expect(entries.nth(0)).toContainText('31st Oct 2026');
    await expect(entries.nth(1)).toContainText('Acme AG');
    await expect(entries.nth(1)).toContainText('Active');
    await expect(entries.nth(1)).toContainText('CHF 3’000 a year');
    await expect(page.getByRole('region', { name: 'Needs action' }).getByRole('link', { name: 'Bolt GmbH' })).toBeVisible();

    // The filter chips carry the counts, and choosing one asks the API for that status.
    const status = page.getByRole('group', { name: 'Status' });
    await expect(status.getByRole('radio', { name: 'All (2)' })).toBeChecked();
    await status.getByRole('radio', { name: 'Payment overdue (1)' }).check();
    await expect(entries).toHaveCount(1);
    await expect(entries).toContainText('Bolt GmbH');
    expect(queries.at(-1)).toBe('?status=past_due');

    await list.getByRole('link', { name: 'Bolt GmbH' }).click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN}\\?id=${BOLT.id}$`));
    const detail = page.getByRole('article', { name: 'Bolt GmbH' });
    await expect(detail.getByRole('heading', { name: 'Bolt GmbH' })).toBeFocused();
    await expect(detail.locator('header')).toContainText('Payment overdue');
    await expect(detail.locator('header')).toContainText('Community Builder, CHF 1’400 a quarter');
    const summary = detail.getByRole('region', { name: 'Summary' });
    await expect(summary).toContainText('By bank transfer to ZurichJS');
    await expect(summary).toContainText('31st October 2026');
    await expect(detail.getByText('Beat Beispiel')).toBeVisible();
    await expect(detail.getByText('beat@bolt.example')).toBeVisible();

    await detail.getByRole('button', { name: 'Back to sponsors' }).click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN}$`));
    await expect(page.getByRole('heading', { name: 'Sponsors' })).toBeVisible();
  });

  test('the sponsor list has no axe violations', async ({ page, isMobile }) => {
    await mockAdmin(page);
    await page.goto(ADMIN);
    await expect(sponsorList(page, isMobile).getByRole('link', { name: 'Bolt GmbH' })).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });
});

test('the sponsorship agreement: one h1, every tier with the fees of the fees module, and not indexed', async ({ page }) => {
  await page.goto(AGREEMENT.path);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sponsorship agreement');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const tiers = page.getByRole('region', { name: 'Tiers, fees and benefits' }).getByRole('listitem');
  await expect(tiers).toHaveCount(TIERS.length);
  for (const t of TIERS) {
    const fees = CYCLES.map((c) => feeLabel(t.key, c.key)).join(', ');
    await expect(tiers.filter({ has: page.getByRole('heading', { name: t.name, exact: true }) })).toContainText(`${fees}.`);
  }
  // The literal the page must show for one tier, so a change to the fees module is noticed here too.
  await expect(tiers.filter({ hasText: 'Community Champion' })).toContainText('CHF 750 a month, CHF 2’100 a quarter, CHF 7’500 a year, CHF 1’000 for one meetup.');
});

test('a raffle entry page: entering needs a name, an email and the rules; the answer never says whether the email entered before; no axe violations', async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  await page.route('**/api/raffle/info?*', (route) =>
    route.fulfill({
      json: {
        ok: true,
        raffle: {
          id: 'r-1',
          prize: 'Mechanical keyboard',
          quantity: 1,
          eventTitle: 'ZurichJS Meetup December',
          eventDateLabel: '9th December 2026',
          sponsorName: 'Acme AG',
          state: 'open',
          closesAt: '2026-12-09T19:30:00.000Z',
          rulesUrl: 'https://zurichjs.com/raffle-rules',
          winningCodes: [],
        },
      },
    }),
  );
  await page.route('**/api/raffle/entries', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/raffle?r=r-1');
  await expect(page.getByRole('heading', { name: 'Mechanical keyboard' })).toBeVisible();
  await expect(page.getByText('Raffle supported by Acme AG.')).toBeVisible();
  const submit = page.getByRole('button', { name: 'Enter', exact: true });
  await submit.click();
  await expect(page.getByText('Accept the raffle rules to enter.', { exact: true })).toBeVisible();
  expect(sent).toEqual([]);
  expect(await axe(page)).toEqual([]);
  await page.getByLabel('Name or nickname').fill('Kim');
  await page.getByLabel('Email', { exact: true }).fill('kim@example.com');
  await page.getByRole('checkbox').check();
  await submit.click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  expect(sent).toEqual([{ raffleId: 'r-1', name: 'Kim', email: 'kim@example.com', rules: true, share: false, company: '' }]);
});
