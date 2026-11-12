import { expect, test, type Page, type Request } from '@playwright/test';
import { handleCheckout } from '../apps/web/src/pages/api/donate/checkout.ts';
import { handleSession } from '../apps/web/src/pages/api/donate/session.ts';
import { resetRateLimits } from '../apps/web/src/server/rateLimit.ts';
import { startMockStripe, type MockStripe } from '../tools/mock-stripe.mjs';

/**
 * Critical visitor journeys on the sample content (CONTENT_SOURCE=sample,
 * BUILD_NOW=2026-11-01T12:00:00+01:00). Islands follow the browser clock, so
 * each test fixes it. Form submissions are intercepted: no record is created
 * and no message is sent.
 */
const at = async (page: Page, iso: string) => page.clock.setFixedTime(new Date(iso));
/** Waits until every island on the page has hydrated (Astro removes the `ssr` attribute). */
const hydrated = async (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);

test.describe('event schedule and venue', () => {
  test('a programme with an agenda shows every line with its own time, including doors and breaks', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    await page.goto('/events/2026-11-forms-types');
    const rows = page.locator('#programme li');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText('18:30');
    await expect(rows.nth(0)).toContainText('Doors open');
    await expect(rows.nth(1)).toContainText('19:00');
    await expect(rows.nth(2)).toContainText('19:35');
    await expect(rows.nth(3)).toContainText('Food and conversation');
    // The opening distinguishes doors from the first talk, with the winter zone.
    await expect(page.locator('main, body').first()).toContainText('Doors 18:30 · Talks from 19:00 CET');
  });

  test('talks without agenda times are listed in order without a made-up time', async ({ page }) => {
    await page.goto('/events/2025-11-anniversary');
    const talks = page.locator('#programme li[id^="talk-"]');
    await expect(talks).toHaveCount(2);
    await expect(talks.first().locator('time')).toHaveCount(0);
    // No note and no per-talk placeholder for a past event, and no synthesised doors, welcome, break or networking.
    await expect(page.getByText(/Talks in running order/)).toHaveCount(0);
    await expect(page.locator('#programme > ol > li')).toHaveCount(2);
    await expect(page.locator('#programme')).not.toContainText(/Time not|Doors|Welcome|Break|Networking/);
    // The summary counts the programme's talks.
    await expect(page.getByText('Two talks.').first()).toBeVisible();
  });

  test('talk anchors land on the talk', async ({ page }) => {
    await page.goto('/events/2025-11-anniversary#talk-one-year-retro');
    await expect(page.locator('#talk-one-year-retro')).toBeInViewport();
  });

  test('venue: full address and a directions link that works without a map', async ({ page }) => {
    await page.goto('/events/2026-11-forms-types');
    const venue = page.locator('#venue');
    await expect(venue).toContainText('Musterstrasse 1, 8005 Zürich');
    const link = venue.getByRole('link', { name: /Get directions/ });
    await expect(link).toHaveAttribute('href', /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=Sample%20Venue%20AG/);
    // No Maps key in this build: the map is Google's keyless embed, always shown (owner), loaded lazily.
    await page.route(/^https:\/\/www\.google\.com\/maps/, (route) => route.fulfill({ body: '<!doctype html><title>map</title>', contentType: 'text/html' }));
    await expect(venue.getByRole('button', { name: /show map|hide map/i })).toHaveCount(0);
    await venue.scrollIntoViewIfNeeded();
    const map = venue.locator('iframe');
    await expect(map).toHaveAttribute('src', 'https://www.google.com/maps?q=Musterstrasse%201%2C%208005%20Z%C3%BCrich&output=embed');
    await expect(map).toHaveAttribute('loading', 'lazy');
    await expect(map).toHaveAttribute('title', /^Map of Sample Venue AG/);
    // Directions stay next to the map.
    await expect(link).toBeVisible();
    // Past events keep their venue too.
    await page.goto('/events/2026-09-signals-streams');
    await expect(page.locator('#venue')).toContainText('Sample Venue AG');
  });

  test('event supporters are thanked with logos that name the company', async ({ page }) => {
    await page.goto('/events/2026-11-forms-types');
    const thanks = page.locator('section', { has: page.getByRole('heading', { name: 'Thanks to' }) });
    await expect(thanks.getByRole('link', { name: /Smallpdf/ })).toHaveAttribute('href', 'https://smallpdf.com');
    await expect(thanks.getByRole('link', { name: /GYFF/ })).toHaveAttribute('rel', 'noopener');
    await expect(thanks.getByRole('link', { name: /Smallpdf/ })).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test.describe('feedback', () => {
  test('a legacy ?feedback=true link before the start says when feedback opens, and rates nothing', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    await page.goto('/events/2026-11-forms-types?feedback=true');
    const gate = page.locator('#feedback');
    await expect(gate.getByRole('heading', { name: 'Feedback isn’t open yet' })).toBeVisible();
    await expect(gate).toContainText('opens when the meetup starts: Wed 18th Nov 2026, 18:30 CET');
    await expect(page.getByRole('button', { name: /^Rate / })).toHaveCount(0);
    // The same link opens the ratings once the meetup has started.
    await at(page, '2026-11-18T18:45:00+01:00');
    await page.goto('/events/2026-11-forms-types?feedback=true');
    await expect(page.getByRole('heading', { name: 'Feedback isn’t open yet' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Rate this talk' })).toHaveCount(1);
  });

  test('a social evening without talks only asks about the evening', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    await page.goto('/events/2026-07-summer-social?feedback=true');
    await hydrated(page);
    const gate = page.locator('#feedback');
    await expect(gate).toContainText('This evening had no talks to rate.');
    await expect(gate.getByRole('link', { name: 'Feedback on the evening' })).toHaveAttribute('href', '/feedback?event=2026-07-summer-social');
    await expect(page.locator('main')).not.toContainText(/Rate the talks|each speaker reads/);
    await expect(page.locator('#programme')).toHaveCount(0);
    // The evening form does not point to talk ratings either.
    await page.goto('/feedback?event=2026-07-summer-social');
    await hydrated(page);
    await expect(page.getByRole('link', { name: 'Rate the talks' })).toHaveCount(0);
  });

  test('rating needs a score, and a failed send says so without losing the rating', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    let calls = 0;
    await page.route('**/api/forms/rating', async (route) => {
      calls++;
      await route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now. Please try again or email hello@zurichjs.com.' } });
    });
    await page.goto('/events/2026-09-signals-streams?feedback=true');
    await page.getByRole('button', { name: 'Rate this talk' }).first().click();
    await expect(page.getByRole('button', { name: 'Send rating' })).toBeDisabled();
    expect(calls).toBe(0);
    await page.getByRole('radio', { name: /3/ }).first().click();
    await page.getByRole('button', { name: 'Send rating' }).click();
    await expect(page.getByRole('alert')).toContainText('We couldn’t send that right now');
    expect(calls).toBe(1);
  });

  test('legacy ?feedback=true opens per-talk rating on a past event, one button per speaker', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    await page.goto('/events/2026-09-signals-streams?feedback=true');
    await expect(page.getByRole('heading', { name: /Feedback for Signals, streams/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rate this talk' })).toHaveCount(2);
    await expect(page.getByRole('link', { name: 'Tell us about the evening as a whole' })).toHaveAttribute('href', '/feedback?event=2026-09-signals-streams');
  });

  test('a talk with two speakers gets a rating per speaker, sent with event, talk and speaker', async ({ page }) => {
    await at(page, '2026-11-18T20:30:00+01:00'); // live
    const sent: Record<string, unknown>[] = [];
    await page.route('**/api/forms/rating', async (route) => {
      sent.push(route.request().postDataJSON());
      await route.fulfill({ json: sent.length > 1 ? { ok: false, error: 'You already rated this talk. Thanks!' } : { ok: true, id: 'x' }, status: sent.length > 1 ? 409 : 200 });
    });
    await page.goto('/events/2026-11-forms-types');
    await expect(page.getByRole('button', { name: 'Rate Max Muster' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rate Lea Platzhalter' })).toBeVisible();
    await page.getByRole('button', { name: 'Rate Max Muster' }).click();
    await page.getByRole('radio', { name: /4/ }).first().click();
    await page.getByRole('button', { name: 'Send rating' }).click();
    await expect(page.getByText('Thanks, that helps.')).toBeVisible();
    expect(sent[0]).toMatchObject({ speakerId: 'max-muster', stars: 4 });
    expect(sent[0]!.eventId).toBe('u-nov-2026');
    expect(String(sent[0]!.target)).toMatch(/:max-muster$/);
    // Rating again is refused, and the reason is shown.
    await page.getByRole('button', { name: /Rate the next talk|Rate the other talk|Done/ }).click();
    if (await page.getByRole('button', { name: 'Later' }).isVisible()) await page.getByRole('button', { name: 'Later' }).click();
    await page.getByRole('button', { name: /Rated Max Muster/ }).click();
    await page.getByRole('radio', { name: /5/ }).first().click();
    await page.getByRole('button', { name: 'Send rating' }).click();
    await expect(page.getByRole('alert')).toContainText('You already rated this talk');
  });

  test('evening feedback explains who reads it and asks for a name only when quoting is allowed', async ({ page }) => {
    await page.goto('/feedback?event=2026-09-signals-streams');
    await hydrated(page);
    await expect(page.getByText(/Who reads this: the ZurichJS organisers/)).toBeVisible();
    await expect(page.getByLabel(/Name to show with the quote/)).toHaveCount(0);
    await page.getByLabel('You may quote my answers on the ZurichJS website.').check();
    await expect(page.getByLabel(/Name to show with the quote/)).toBeVisible();
    await expect(page.getByText('on /today')).toHaveCount(0);
  });
});

test.describe('Tonight page', () => {
  test('on 1 November the 18 November meetup is "next", never "tonight"', async ({ page }) => {
    await at(page, '2026-11-01T12:00:00+01:00');
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forms, types and design systems');
    await expect(page.locator('div').filter({ hasText: /^Next meetup$/ })).toBeVisible();
    await expect(page.getByText(/How (was|is) today/)).toHaveCount(0);
    await expect(page.getByText('Wed 18th Nov 2026').first()).toBeVisible();
  });

  test('on the day: arrival first, and "Find the venue" is a working link', async ({ page }) => {
    await at(page, '2026-11-18T10:00:00+01:00');
    await page.goto('/today');
    await expect(page.getByText('Doors open at 18:30')).toBeVisible();
    await expect(page.getByRole('link', { name: /Get directions \(opens Google Maps\)/ })).toHaveAttribute('href', /google\.com\/maps\/dir/);
    await expect(page.getByRole('link', { name: 'Venue and arrival' })).toHaveAttribute('href', '#venue');
  });

  test('during the evening: now/next and feedback', async ({ page }) => {
    await at(page, '2026-11-18T19:40:00+01:00');
    await page.goto('/today');
    await expect(page.locator('[aria-current="time"]')).toContainText('What we learned shipping a design system');
    await expect(page.getByRole('heading', { name: 'How is today’s meetup going?' })).toBeVisible();
  });

  test('after the feedback window with nothing planned: a helpful state', async ({ page }) => {
    await at(page, '2026-11-25T12:00:00+01:00');
    await page.goto('/today');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('No meetup on the calendar right now');
    await expect(page.getByRole('link', { name: 'Propose a talk' })).toBeVisible();
  });
});

test.describe('donations and membership', () => {
  test('donate: one-time or monthly, amount summary, hand-over to the (stubbed) payment page', async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/donate/checkout', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, url: '/donate/thanks' } });
    });
    await page.goto('/donate');
    await hydrated(page);
    await page.getByRole('radio', { name: 'Monthly' }).click();
    await page.getByRole('radio', { name: 'CHF 30' }).check();
    await expect(page.locator('#donate-summary')).toHaveText('You’ll give CHF 30 every month until you cancel.');
    await expect(page.getByText(/cancel a monthly donation at any time/)).toBeVisible();
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await page.waitForURL('**/donate/thanks');
    expect(sent).toMatchObject({ amount: 30, recurrence: 'monthly' });
    // Without a session id the thanks page claims nothing.
    await expect(page.getByText('If you completed the payment, Stripe emails you a receipt. If you didn’t, nothing was charged.')).toBeVisible();
  });

  test('donate: a custom amount is validated, and a server failure is explained', async ({ page }) => {
    await page.route('**/api/donate/checkout', (route) =>
      route.fulfill({ status: 503, json: { ok: false, reason: 'unavailable', error: 'Online payments are not available right now. Nothing was charged.' } }),
    );
    await page.goto('/donate');
    await hydrated(page);
    await page.getByLabel(/Or another amount/).fill('2');
    await expect(page.locator('#donate-summary')).toHaveText('');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Choose an amount' })).toBeVisible();
    await page.getByLabel(/Or another amount/).fill('25');
    await expect(page.locator('#donate-summary')).toHaveText('You’ll give CHF 25 once.');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'Online payments are not available' });
    await expect(alert).toBeVisible();
    // The sample content has no Twint QR, so the fallback names only what the page shows: email.
    await expect(page.locator('[data-twint-qr]')).toHaveCount(0);
    await expect(alert).not.toContainText('Twint');
    await expect(alert.getByRole('link', { name: 'hello@zurichjs.com' })).toHaveAttribute('href', /^mailto:hello@zurichjs\.com/);
    await page.getByLabel(/Or another amount/).fill('1001');
    await expect(page.getByText('Enter an amount from 5 to 1000.')).toBeVisible();
  });

  test('donate: questions and cancellation; no donor list for now; no tax claim; a bad amount moves focus to it', async ({ page }) => {
    await page.goto('/donate');
    await hydrated(page);
    await expect(page.getByRole('heading', { name: 'Questions' })).toBeVisible();
    await expect(page.locator('[data-faq-cancel]')).toContainText('No questions asked.');
    // The donor thank-you list is hidden for now (owner, 3rd November 2026).
    await expect(page.getByRole('heading', { name: 'Thank you' })).toHaveCount(0);
    await expect(page.getByText(/tax/i)).toHaveCount(0);
    await page.getByLabel(/Or another amount/).fill('3');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByLabel(/Or another amount/)).toBeFocused();
  });

  test('coming back from Stripe without paying says so; old /buy-us-a-coffee links reach the donation form', async ({ page }) => {
    await page.goto('/buy-us-a-coffee?canceled=true');
    await expect(page).toHaveURL(/\/donate\?canceled=true/);
    await expect(page.getByText('No payment was made.')).toBeVisible();
  });

  test('membership: choosing a tier and billing updates the price and the Join link', async ({ page }) => {
    await page.goto('/membership');
    await hydrated(page);
    await expect(page.getByText('Coming to meetups is free and never needs a membership.')).toBeVisible();
    await expect(page.getByText('Free or discounted workshops')).toBeVisible();
    // The tier cards are the choice: selecting one is a radio, not a button.
    await expect(page.getByRole('button', { name: /^Choose / })).toHaveCount(0);
    await page.locator('label', { has: page.getByRole('radio', { name: /^Supporter, CHF/ }) }).click();
    await expect(page.getByRole('radio', { name: /^Supporter, CHF/ })).toBeChecked();
    await expect(page.locator('[data-join-summary]')).toContainText('Supporter, CHF 250 a year');
    await expect(page.getByRole('link', { name: 'Join as Supporter' })).toHaveAttribute('href', '/membership/account?level=supporter&cycle=yearly');
    // Online joining is always on: no request form, nothing posted from this page.
    await expect(page.locator('input[name="email"]')).toHaveCount(0);
  });

  test('membership: production quarterly and yearly prices, the billing switch, and a Join link for each choice', async ({ page }) => {
    await page.goto('/membership');
    await hydrated(page);
    // Fees as on production (origin/main src/pages/membership.tsx).
    const COMBOS = [
      ['Basic Member', 'basic', 'Quarterly', 'quarterly', 'CHF 50 a quarter'],
      ['Basic Member', 'basic', 'Yearly', 'yearly', 'CHF 175 a year'],
      ['Supporter', 'supporter', 'Quarterly', 'quarterly', 'CHF 75 a quarter'],
      ['Supporter', 'supporter', 'Yearly', 'yearly', 'CHF 250 a year'],
    ] as const;
    // Supporter and yearly are the defaults.
    await expect(page.locator('[data-join-summary]')).toContainText('Supporter, CHF 250 a year');
    await expect(page.getByText('Save CHF 25 compared with paying quarterly.')).toBeVisible();
    await page.getByRole('radio', { name: 'Quarterly', exact: true }).click();
    await expect(page.getByText('CHF 200 over a year.')).toBeVisible();
    await expect(page.getByRole('radio', { name: /^Monthly/ })).toHaveCount(0);
    for (const [tier, level, label, cycle, fee] of COMBOS) {
      await page.getByRole('radio', { name: label, exact: true }).click();
      await page.locator('label', { has: page.getByRole('radio', { name: new RegExp(`^${tier}, CHF`) }) }).click();
      await expect(page.locator('[data-join-summary]')).toContainText(`${tier}, ${fee}`);
      await expect(page.getByRole('link', { name: `Join as ${tier}` })).toHaveAttribute('href', `/membership/account?level=${level}&cycle=${cycle}`);
    }
  });

  test('membership: the monthly comparison is shown on each tier', async ({ page }) => {
    await page.goto('/membership');
    await hydrated(page);
    await expect(page.getByText('That’s CHF 14.50 a month, about')).toBeVisible();
    await expect(page.getByText('That’s CHF 21 a month, about')).toBeVisible();
    await expect(page.getByText('… a simple bouquet of tulips')).toBeVisible();
  });

  test('membership is linked from the footer on every page', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('footer').getByRole('link', { name: 'Membership' })).toHaveAttribute('href', '/membership');
  });
});

/**
 * The donation flow end to end against a local mock of Stripe's API
 * (tools/mock-stripe.mjs): the real /api/donate handlers run in the test
 * process with STRIPE_API_BASE pointing at the mock, because the static
 * server does not run Netlify Functions. Nothing reaches Stripe.
 */
test.describe('donations through a mock Stripe', () => {
  let mock: MockStripe;
  test.beforeAll(async () => {
    mock = await startMockStripe(0);
  });
  test.afterAll(() => mock.close());

  const wire = async (page: Page, extra: Record<string, string> = {}) => {
    resetRateLimits();
    const env = { STRIPE_SECRET_KEY: 'sk_test_mock', STRIPE_SUPPORT_PRODUCT_ID: 'prod_mock', STRIPE_API_BASE: mock.url, ...extra };
    const toFetch = (r: Request) => ({ url: r.url(), method: r.method(), headers: r.headers(), body: r.postData() ?? undefined });
    await page.route('**/api/donate/checkout', async (route) => {
      const r = toFetch(route.request());
      const res = await handleCheckout(new globalThis.Request(r.url, { method: r.method, headers: r.headers, body: r.body }), { env });
      await route.fulfill({ status: res.status, json: await res.json() });
    });
    await page.route('**/api/donate/session?*', async (route) => {
      const res = await handleSession(new globalThis.Request(route.request().url()), { env });
      await route.fulfill({ status: res.status, json: await res.json() });
    });
  };

  test('one-time preset: Stripe page, payment, thanks page confirms the amount', async ({ page }) => {
    await wire(page);
    await page.goto('/donate');
    await hydrated(page);
    await page.getByRole('radio', { name: 'CHF 40' }).check();
    await page.getByLabel('Email for the receipt (optional)').fill('anna@example.com');
    await expect(page.locator('#donate-summary')).toHaveText('You’ll give CHF 40 once.');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await page.waitForURL(`${mock.url}/pay/**`);
    expect(mock.requests.at(-1)!.form).toMatchObject({
      mode: 'payment',
      submit_type: 'donate',
      customer_email: 'anna@example.com',
      'line_items[0][price_data][currency]': 'chf',
      'line_items[0][price_data][unit_amount]': '4000',
      'line_items[0][price_data][product]': 'prod_mock',
    });
    await expect(page.locator('[data-mock-amount]')).toHaveText('CHF 40.00');
    await page.getByRole('link', { name: 'Pay' }).click();
    await page.waitForURL(/\/donate\/thanks\?session_id=cs_test_mock\d+$/);
    await expect(page.getByText('Stripe confirmed your donation of CHF 40.')).toBeVisible();
    await expect(page.getByText(/change or cancel your monthly donation/)).toHaveCount(0);
  });

  test('monthly custom amount: subscription, thanks page says monthly and how to change or cancel', async ({ page }) => {
    await wire(page);
    await page.goto('/donate');
    await hydrated(page);
    await page.getByRole('radio', { name: 'Monthly' }).click();
    await page.getByLabel(/Or another amount/).fill('12,50');
    await expect(page.locator('#donate-summary')).toHaveText('You’ll give CHF 12.50 every month until you cancel.');
    // No portal URL in this build: cancelling is by email.
    await expect(page.getByRole('link', { name: 'hello@zurichjs.com' }).first()).toHaveAttribute('href', /subject=Cancel%20my%20monthly%20donation/);
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await page.waitForURL(`${mock.url}/pay/**`);
    expect(mock.requests.at(-1)!.form).toMatchObject({
      mode: 'subscription',
      'line_items[0][price_data][unit_amount]': '1250',
      'line_items[0][price_data][recurring][interval]': 'month',
    });
    expect(mock.requests.at(-1)!.form.submit_type).toBeUndefined();
    await page.getByRole('link', { name: 'Pay' }).click();
    await page.waitForURL(/\/donate\/thanks\?session_id=/);
    await expect(page.getByText('Stripe confirmed your donation of CHF 12.50 every month.')).toBeVisible();
    const manage = page.getByText(/You can change or cancel your monthly donation at any time/);
    await expect(manage).toBeVisible();
    await expect(manage.getByRole('link', { name: 'hello@zurichjs.com' })).toHaveAttribute('href', /^mailto:hello@zurichjs\.com\?subject=My%20monthly%20donation/);
  });

  test('leaving Stripe without paying returns to /donate and says nothing was charged', async ({ page }) => {
    await wire(page);
    await page.goto('/donate');
    await hydrated(page);
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await page.waitForURL(`${mock.url}/pay/**`);
    await page.getByRole('link', { name: 'Back' }).click();
    await page.waitForURL(/\/donate\?canceled=1#donate$/);
    await expect(page.getByText('No payment was made.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue to secure payment' })).toBeEnabled();
  });

  test('a Stripe failure or missing configuration keeps the visitor on /donate with what still works', async ({ page }) => {
    await wire(page);
    await page.goto('/donate');
    await hydrated(page);
    await page.getByLabel(/Or another amount/).fill('999');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByRole('alert')).toContainText('We couldn’t start the payment. Nothing was charged. Please try again. To give another way, write to hello@zurichjs.com.');
    await expect(page).toHaveURL(/\/donate$/);

    await page.unrouteAll();
    await wire(page, { STRIPE_SECRET_KEY: '' });
    await page.getByLabel(/Or another amount/).fill('20');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByRole('alert')).toContainText('Online payments are not available right now. Nothing was charged. To give another way, write to hello@zurichjs.com.');
  });

  test('the thanks page claims nothing for an unknown or unpaid session', async ({ page }) => {
    await wire(page);
    await page.goto('/donate/thanks?session_id=cs_test_unknown');
    await expect(page.getByText('If you completed the payment, Stripe emails you a receipt. If you didn’t, nothing was charged.')).toBeVisible();
  });
});

test.describe('speakers', () => {
  const visible = (page: Page) => page.locator('[data-speaker-card]:visible');

  test('search covers talk titles and topics, not only names and job titles', async ({ page }) => {
    await page.goto('/speakers');
    const q = page.getByRole('searchbox', { name: 'Search speakers, talks and topics' });
    // A talk title word: Mia's role says nothing about it.
    await q.fill('Agentic');
    await expect(visible(page)).toHaveCount(1);
    await expect(visible(page).first()).toContainText('Mia Entwurf');
    // A topic from talk tags includes people whose job title doesn't mention it.
    await q.fill('react');
    await expect(visible(page).filter({ hasText: 'Mia Entwurf' })).toHaveCount(1);
    await expect(visible(page).filter({ hasText: 'Lea Platzhalter' })).toHaveCount(1);
    await q.fill('  TYPESCRIPT ');
    await expect(visible(page).filter({ hasText: 'Anna Beispiel' })).toHaveCount(1);
    await expect(page.locator('[data-count]')).toHaveText(/^\d+ of \d+ speakers$/);
    // The query is in the URL and survives a reload.
    await expect(page).toHaveURL(/q=\+\+TYPESCRIPT/);
    await page.reload();
    await expect(q).toHaveValue('  TYPESCRIPT ');
    await expect(visible(page).filter({ hasText: 'Anna Beispiel' })).toHaveCount(1);
  });

  test('accents and case are ignored; name matches come first', async ({ page }) => {
    await page.goto('/speakers?q=MAX');
    await expect(visible(page).first()).toContainText('Max Muster');
  });

  test('empty state does not claim a topic was never covered, and clearing restores everyone', async ({ page }) => {
    await page.goto('/speakers?q=cobol');
    await expect(page.getByRole('heading', { name: 'No speakers match “cobol”.' })).toBeVisible();
    await expect(page.getByText(/a topic can still have come up at a meetup/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'search past events' })).toHaveAttribute('href', '/events?tab=past&q=cobol');
    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(page.locator('[data-count]')).toHaveText(/^\d+ speakers$/);
    await expect(page).toHaveURL(/\/speakers$/);
  });

  test('topic filter from real talk tags, with back and forward', async ({ page }) => {
    await page.goto('/speakers');
    await page.getByRole('link', { name: /^Testing \d+$/ }).click();
    await expect(page).toHaveURL(/topic=Testing/);
    await expect(page.getByRole('link', { name: /^Testing \d+$/ })).toHaveAttribute('aria-current', 'true');
    await expect(visible(page).filter({ hasText: 'Jonas Test' })).toHaveCount(1);
    await expect(visible(page).filter({ hasText: 'Max Muster' })).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('[data-count]')).toHaveText(/^\d+ speakers$/);
    await page.goForward();
    await expect(visible(page).filter({ hasText: 'Max Muster' })).toHaveCount(0);
  });

  test('profiles list each talk with description, format, topics and a link to the talk on its event', async ({ page }) => {
    await page.goto('/speakers/mia-entwurf');
    const talk = page.locator('article', { hasText: 'Signals without the hype' });
    await expect(talk).toContainText('Talk');
    await expect(talk.getByRole('link', { name: 'Signals', exact: true })).toHaveAttribute('href', '/speakers?topic=Signals');
    const ev = talk.getByRole('link', { name: 'Signals, streams and the state of state' });
    await expect(ev).toHaveAttribute('href', /^\/events\/2026-09-signals-streams#talk-/);
    await ev.click();
    await expect(page.locator('li[id^="talk-"]:target, li[id^="talk-"]').first()).toBeVisible();
  });

  test('an old speaker URL redirects permanently to the current one', async ({ request }) => {
    const res = await request.get('/speakers/Mia_Entwurf', { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers().location).toBe('/speakers/mia-entwurf');
  });

  test('event search still finds talks by speaker name, ignoring accents', async ({ page }) => {
    await page.goto('/events?tab=past&q=noah%20probe');
    await expect(page.locator('[data-panel="past"] [data-hay]:visible')).toHaveCount(1);
    await page.goto('/events?tab=past&q=entwurf');
    await expect(page.locator('[data-panel="past"] [data-hay]:visible').first()).toContainText('Signals');
  });
});

test.describe('media archive', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/sample/clip.mp4', (route) => route.fulfill({ path: 'e2e/fixtures/clip.mp4', contentType: 'video/mp4' }));
  });

  test('archive lists events with counts and links each to its own gallery', async ({ page }) => {
    await page.goto('/media');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Photos and videos');
    const ev = page.locator('section', { has: page.getByRole('heading', { name: 'Signals, streams and the state of state' }) });
    await expect(ev).toContainText('4 photos and 1 video');
    await expect(ev.getByRole('link', { name: 'Signals, streams and the state of state' })).toHaveAttribute('href', '/media/2026-09-signals-streams');
    await expect(page.getByText('Want a photo of you removed?')).toBeVisible();
  });

  test('viewer: keyboard, previous/next, close returns focus, video plays on request', async ({ page }) => {
    await page.goto('/media/2026-09-signals-streams');
    const first = page.getByRole('button', { name: /^Open photo:/ }).first();
    // Wait for the gallery island to hydrate: before that, the keyboard has nothing to open.
    await expect(page.locator('astro-island[ssr]', { has: first })).toHaveCount(0);
    await first.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 of 5');
    await expect(dialog).toContainText('The room during the first talk.');
    await expect(dialog).toContainText('Photo: sample credit');
    await expect(page).toHaveURL(/#media-sample-2026-09-signals-streams-0$/);
    await page.keyboard.press('ArrowRight');
    await expect(dialog).toContainText('2 of 5');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(dialog).toContainText('5 of 5');
    await expect(dialog.locator('video')).toHaveAttribute('preload', 'none');
    await dialog.getByRole('button', { name: 'Next →' }).click();
    await expect(dialog).toContainText('1 of 5');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(first).toBeFocused();
    await expect(page).not.toHaveURL(/#media-/);
  });

  test('a shared photo link opens that photo', async ({ page }) => {
    await page.goto('/media/2026-09-signals-streams#media-sample-2026-09-signals-streams-2');
    await expect(page.getByRole('dialog')).toContainText('3 of 5');
  });

  test('event pages show their own gallery and "All photos" goes to it; promo artwork is not a photo', async ({ page }) => {
    await page.goto('/events/2026-09-signals-streams');
    await expect(page.getByRole('link', { name: 'All 4 photos and 1 video' })).toHaveAttribute('href', '/media/2026-09-signals-streams');
    // A year-old event without photos says so plainly (not "coming soon") and points to the archive.
    await page.goto('/events/2025-11-anniversary');
    const photos = page.locator('#photos');
    await expect(photos).toContainText('There are no photos from this evening in our archive.');
    await expect(photos).not.toContainText('aren’t online yet');
    await expect(photos.getByRole('link', { name: 'See photos from other meetups' })).toHaveAttribute('href', '/media');
  });

  test('archive: jump to an event; clips stay in their event, with no separate clips section', async ({ page }) => {
    await page.goto('/media');
    const nav = page.getByRole('navigation', { name: 'Events in the archive' });
    await nav.getByRole('link', { name: /Signals, streams and the state of state, 4 photos and 1 video$/ }).click();
    await expect(page).toHaveURL(/#event-2026-09-signals-streams$/);
    await expect(page.getByRole('heading', { name: 'Signals, streams and the state of state' })).toBeInViewport();
    await expect(nav.getByRole('link', { name: /All clips/ })).toHaveCount(0);
    await expect(page.locator('#clips')).toHaveCount(0);
    await expect(page.getByText('Clips from the evenings')).toHaveCount(0);
    await expect(page.locator('#event-2026-09-signals-streams').getByRole('button', { name: /^Play clip:/ })).toHaveCount(1);
  });
});

test.describe('partners and sponsors', () => {
  const intent = (page: Page) => page.getByTestId('partner-intent');
  const chosen = (page: Page) => page.locator('#partner-form label:has(input[type="radio"]:checked)');

  test('the page runs from audience to ways, packages, proof and the form', async ({ page }) => {
    await page.goto('/partners');
    const order = await page.locator('main h2').allTextContents();
    const at = (t: string) => order.findIndex((h) => h.includes(t));
    expect(at('Who you reach')).toBeGreaterThanOrEqual(0);
    expect(at('Who you reach')).toBeLessThan(at('Four ways to partner'));
    expect(at('Four ways to partner')).toBeLessThan(at('Sponsorship packages'));
    expect(at('Sponsorship packages')).toBeLessThan(at('Our sponsors'));
    expect(at('Our sponsors')).toBeLessThan(at('Tell us how you’d like to help'));
    // One umbrella name, distinct from the "Community partners" group under it.
    await expect(page.locator('#partners-community').getByRole('heading', { level: 2 })).toHaveText('Hosts and partners');
    await expect(page.locator('#partners-communities').getByRole('heading', { name: 'Community partners' })).toBeVisible();
    // Figures are dated; no source disclaimers or RSVP export figures (owner, 3rd November 2026).
    await expect(page.getByRole('heading', { name: 'Our reach in November 2026' })).toBeVisible();
    await expect(page.getByText('Meetup members')).toBeVisible();
    await expect(page.getByText(/RSVPs, not check-ins|undated and without a stated method|not updated since/)).toHaveCount(0);
    await expect(page.getByText('peak RSVP rate')).toHaveCount(0);
    await expect(page.locator('#sponsorship-tiers').getByText(/workshop/i)).toHaveCount(0);
    // The conference sponsorship block is gone from this page (owner, 3rd November 2026).
    await expect(page.getByRole('heading', { name: 'Sponsoring the conference is separate' })).toHaveCount(0);
  });

  for (const [name, way, label] of [
    ['Host a meetup', 'host', 'Host a meetup'],
    ['Cover food and drinks', 'food', 'Food and drinks'],
    ['Community collaboration', 'community', 'Community collaboration'],
  ] as const) {
    test(`"Choose this: ${name}" selects it, keeps it in the URL and after a reload`, async ({ page }) => {
      await page.goto('/partners');
      await page.getByRole('link', { name: `Choose this: ${name}` }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]way=${way}.*#partner-form$`));
      await expect(chosen(page)).toHaveText(label);
      await expect(intent(page)).toContainText(label);
      await page.reload();
      await expect(chosen(page)).toHaveText(label);
      await page.goto(`/partners?way=${way}#inquiry-form`);
      await expect(chosen(page)).toHaveText(label);
    });
  }

  for (const [id, name] of [
    ['champion', 'Community Champion'],
    ['builder', 'Community Builder'],
    ['friend', 'Community Friend'],
    ['supporter', 'Community Supporter'],
  ] as const) {
    test(`${name}: choosing it, a direct link and a reload all select sponsorship and the package`, async ({ page }) => {
      await page.goto('/partners');
      // Packages are a choice (radios); one action below asks about the chosen one.
      // Click the package card, as a visitor would; its radio is inside.
      await page.locator('#sponsorship-tiers label', { has: page.locator(`#h-tier-${id}`) }).click();
      await expect(page.locator('#sponsorship-tiers').getByRole('radio', { name, exact: true })).toBeChecked();
      await page.getByRole('link', { name: `Ask about ${name}` }).click();
      await expect(page).toHaveURL(new RegExp(`[?&]tier=${id}.*#partner-form$`));
      await expect(chosen(page)).toHaveText('Sponsorship');
      await expect(page.getByLabel('Sponsorship package (optional)')).toHaveValue(id);
      await expect(intent(page)).toHaveText(`You’re asking about: Sponsorship: ${name}`);
      await page.reload();
      await expect(page.getByLabel('Sponsorship package (optional)')).toHaveValue(id);
      await page.goto(`/partners?way=partner&tier=${id}#inquiry-form`);
      await expect(page.getByLabel('Sponsorship package (optional)')).toHaveValue(id);
    });
  }

  test('the intent stays editable, and an edit is kept on reload', async ({ page }) => {
    await page.goto('/partners?way=partner&tier=builder#partner-form');
    await page.getByLabel('Sponsorship package (optional)').selectOption('friend');
    await expect(page).toHaveURL(/tier=friend/);
    await page.locator('#partner-form').getByRole('radio', { name: 'Food and drinks' }).click();
    await expect(page.getByLabel('Sponsorship package (optional)')).toHaveCount(0);
    await expect(page).toHaveURL(/way=food/);
    expect(page.url()).not.toContain('tier=');
    await page.reload();
    await expect(chosen(page)).toHaveText('Food and drinks');
  });

  test('the inquiry sends every field once, keeps values on failure and explains what happens next', async ({ page }) => {
    const sent: Record<string, unknown>[] = [];
    let fail = true;
    await page.route('**/api/forms/partners', async (route) => {
      sent.push(route.request().postDataJSON());
      if (fail) return route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } });
      await new Promise((r) => setTimeout(r, 300));
      return route.fulfill({ json: { ok: true, id: 'partners_test' } });
    });
    await page.goto('/partners?way=host#partner-form');
    const form = page.locator('#partner-form');
    await form.getByRole('button', { name: 'Send inquiry' }).click();
    await expect(form.getByText('Fix the highlighted fields.')).toBeVisible();
    await expect(form.getByLabel('Organisation')).toBeFocused();
    await form.getByLabel('Organisation').fill('Acme AG');
    await form.getByLabel('Your name').fill('Ada');
    await form.getByLabel('Work email').fill('ada@acme.example');
    await expect(form.getByLabel('Phone (optional)')).toHaveAttribute('type', 'tel');
    await form.getByLabel('Phone (optional)').fill('+41 44 000 00 00');
    await form.getByLabel('How many people your space holds (optional)').fill('80');
    await form.getByLabel('Anything we should know? (optional)').fill('Spring works');
    await expect(form.getByText(/how many people it holds/)).toBeVisible();
    await expect(form.getByText(/Nothing is agreed until you confirm/)).toBeVisible();
    await form.getByRole('button', { name: 'Send inquiry' }).click();
    await expect(form.getByText('We couldn’t send that right now.')).toBeVisible();
    await expect(form.getByLabel('Organisation')).toHaveValue('Acme AG');
    await expect(form.getByLabel('Phone (optional)')).toHaveValue('+41 44 000 00 00');
    fail = false;
    await form.getByRole('button', { name: 'Send inquiry' }).dblclick();
    await expect(page.getByRole('status').filter({ hasText: 'You asked about' })).toContainText('You asked about: Host a meetup');
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({
      org: 'Acme AG',
      name: 'Ada',
      email: 'ada@acme.example',
      phone: '+41 44 000 00 00',
      way: 'host',
      interest: 'Host a meetup',
      capacity: '80',
      msg: 'Spring works',
      website_url: '',
    });
  });

  test('the honeypot is hidden from assistive technology', async ({ page }) => {
    await page.goto('/partners');
    const trap = page.locator('#partner-form input[name="website_url"]');
    await expect(trap).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('#partner-form div[aria-hidden="true"]:has(input[name="website_url"])')).toHaveCount(1);
  });

  test('current sponsors and past supporters are separate, logos are named links', async ({ page }) => {
    await page.goto('/partners');
    const current = page.locator('#partners-current');
    await expect(current.getByRole('link', { name: /Stripe/ })).toHaveAttribute('href', 'https://stripe.com');
    await expect(page.locator('#partners-venues').getByRole('link', { name: /novu AG/ })).toBeVisible();
    for (const img of await page.locator('#partners-current img').all()) expect(await img.getAttribute('alt')).toMatch(/\w/);
  });

  test('the packages show production’s prices', async ({ page }) => {
    await page.goto('/partners');
    const tiers = page.locator('#sponsorship-tiers');
    for (const name of ['Community Champion', 'Community Builder', 'Community Friend', 'Community Supporter']) {
      await expect(tiers.getByRole('heading', { name, exact: true })).toBeVisible();
    }
    // Monthly by default; the billing switch shows each package's yearly and one-time price instead.
    await expect(tiers.getByText('CHF 750', { exact: true })).toBeVisible();
    await expect(tiers.getByText('CHF 150', { exact: true })).toBeVisible();
    await expect(tiers.getByText('CHF 7’500')).toBeHidden();
    await tiers.getByRole('radio', { name: 'Yearly' }).click();
    await expect(tiers.getByText('CHF 7’500')).toBeVisible();
    await expect(tiers.getByText('Twelve months for the price of ten: 2 months free.')).toBeVisible();
    await tiers.getByRole('radio', { name: 'One-time' }).click();
    await expect(tiers.getByText('CHF 1’000', { exact: true })).toBeVisible();
    await expect(tiers.getByText('CHF 150', { exact: true })).toBeHidden();
    await expect(page.locator('#hosting')).toContainText('Community Friend');
  });

  test('the prospectus is requested by email, as on the old site', async ({ page }) => {
    await page.goto('/partners');
    await expect(page.getByRole('link', { name: 'Request the prospectus' }).first()).toHaveAttribute(
      'href',
      /^mailto:hello@zurichjs\.com\?subject=ZurichJS%20Sponsorship%20Prospectus%20Request$/,
    );
  });

  test('the anchors other pages link to exist: venues, community, previous supporters', async ({ page }) => {
    await page.goto('/partners#partners-venues');
    await expect(page.locator('#partners-venues').getByRole('heading', { name: 'Venue partners' })).toBeVisible();
    await expect(page.locator('#partners-communities').getByRole('link', { name: /Web Zurich/ })).toBeVisible();
    await expect(page.locator('#partners-conferences').getByRole('link', { name: /Grusp/ })).toBeVisible();
    // CityJS is a past supporter now (owner, 4th November 2026).
    await expect(page.locator('#partners-past').getByRole('img', { name: 'CityJS' })).toBeVisible();
    await expect(page.locator('#partners-past').getByRole('img', { name: 'Dynatrace' })).toBeVisible();
    // The About timeline links here.
    for (const href of ['/partners#partners-venues', '/partners#partners-community']) {
      await page.goto('/about');
      await expect(page.locator(`a[href="${href}"]`).first()).toBeAttached();
      await page.goto(href);
      await expect(page.locator(href.slice(href.indexOf('#')))).toBeVisible();
    }
  });

  test('Ginetta and Code Blossom are not promoted on active pages (owner, 2nd November 2026)', async ({ page }) => {
    for (const path of ['/', '/partners', '/events/2026-11-forms-types', '/today']) {
      await page.goto(path);
      const text = await page.locator('body').innerText();
      expect(text, path).not.toMatch(/ginetta|code\s?blossom/i);
      for (const host of ['ginetta.net', 'code-blossom.com']) await expect(page.locator(`a[href*="${host}"]`), `${path} ${host}`).toHaveCount(0);
      await expect(page.getByRole('img', { name: /ginetta|code blossom/i })).toHaveCount(0);
    }
  });

  test('home shows current sponsors and hosts; upcoming event pages thank this season’s sponsors, past ones do not', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Companies who host and support ZurichJS' })).toBeVisible();
    await expect(page.locator('section[aria-labelledby="h-hosts"]').getByRole('link', { name: /Stripe/ })).toHaveAttribute('href', 'https://stripe.com');
    await page.goto('/events/2026-11-forms-types');
    await expect(page.getByText('Supporting ZurichJS this season.')).toBeVisible();
    for (const past of ['/events/2026-09-signals-streams', '/events/2025-03-partnerships']) {
      await page.goto(past);
      await expect(page.getByText(/this season/)).toHaveCount(0);
      await expect(page.getByRole('link', { name: /Stripe/ })).toHaveCount(0);
    }
  });

  test('the Tonight page thanks the evening’s supporters and this season’s sponsors', async ({ page }) => {
    await page.goto('/today');
    const thanks = page.locator('section[aria-labelledby="h-made"]');
    await expect(thanks.getByRole('heading', { name: 'Thanks to' })).toBeVisible();
    await expect(thanks.getByRole('link', { name: /Stripe/ })).toBeVisible();
  });
});

test.describe('community page', () => {
  test('team photos (including Nadja), bios and links; volunteers are thanked', async ({ page }) => {
    await page.goto('/about#team');
    const team = page.locator('#team');
    await expect(team.getByRole('img', { name: 'Nadja Hesselbjerg' })).toBeVisible();
    await expect(team.getByRole('heading', { name: 'Meetup organisers' })).toBeVisible();
    await expect(team.getByRole('list', { name: 'Faris Aziz: links' }).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/farisaziz12');
    await expect(team.getByText(/ZurichJS Conf 2026 happened thanks to 13 volunteers/)).toBeVisible();
  });

  test('section navigation with shareable anchors, and the first-visit link still works', async ({ page }) => {
    await page.goto('/about');
    const nav = page.getByRole('navigation', { name: 'On this page' });
    for (const [label, id] of [
      ['Story', 'story'],
      ['Team', 'team'],
      ['Values', 'values'],
      ['Association', 'association'],
      ['Get involved', 'get-involved'],
      ['First visit', 'first-visit'],
    ]) {
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute('href', `#${id}`);
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
    await page.goto('/about#first-visit');
    await expect(page.locator('#first-visit')).toBeInViewport();
    await expect(page.getByText(/An example evening\. Times change/)).toBeVisible();
  });

  test('timeline runs past November 2025, links out, and membership stays on this site', async ({ page }) => {
    await page.goto('/about#story');
    const story = page.locator('#story');
    await expect(story.getByRole('heading', { name: 'The first ZurichJS Conf' })).toBeVisible();
    await expect(story.getByRole('heading', { name: 'ZurichJS becomes a Swiss nonprofit' })).toBeVisible();
    await expect(story.locator('#story-2025-06-18').getByRole('link', { name: 'Membership' })).toHaveAttribute('href', '/membership');
    await expect(page.locator('a[href="https://zurichjs.com/membership"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Become a member/ }).first()).toHaveAttribute('href', '/membership');
  });

  test('Slack: no broken invite; the site’s own invite is used everywhere (owner, 4th November 2026)', async ({ page }) => {
    for (const path of ['/about', '/today', '/contact']) {
      await page.goto(path);
      await expect(page.locator('a[href*="shared_invite/"]:not([href*="shared_invite/zt-"])')).toHaveCount(0);
      await expect(page.locator('a[href^="https://join.slack.com/t/zurichjs/shared_invite/zt-"]').first()).toBeAttached();
    }
  });
});

test.describe('volunteering (/cfv)', () => {
  const fillRequired = async (page: Page) => {
    await page.getByLabel(/^Name/).fill('Test Person');
    await page.getByLabel(/^Email/).fill('test@example.com');
    await page.getByLabel('LinkedIn profile').fill('https://www.linkedin.com/in/test-person');
    await page.getByRole('radio', { name: 'A few hours monthly' }).check();
    await page.getByRole('checkbox', { name: 'Event organisation' }).check();
    await page.getByLabel('Why do you want to volunteer with ZurichJS?').fill('I enjoy the meetups.');
  };

  test('explains what volunteering involves, and offers production’s areas without workshops', async ({ page }) => {
    await page.goto('/cfv');
    for (const h of ['Professional growth', 'Networking', 'Community impact']) await expect(page.getByRole('heading', { name: h })).toBeVisible();
    await expect(page.getByText(/Volunteering is unpaid/)).toBeVisible();
    // The time options are shown as labels under 'You choose how much time you give'.
    await expect(page.getByRole('heading', { name: 'You choose how much time you give' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Where you could help' })).toBeVisible();
    await hydrated(page);
    const areas = page.getByRole('group', { name: 'What would you like to help with?' }).getByRole('checkbox');
    await expect(areas).toHaveCount(8);
    for (const box of await areas.all()) await expect(box).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /workshop/i })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Photography and video' })).toBeVisible();
    await expect(page.getByLabel('LinkedIn profile')).toHaveAttribute('type', 'url');
    await expect(page.getByLabel(/^Email/)).toHaveAttribute('type', 'email');
  });

  test('validation, several areas, "Other" availability, and a send with every answer', async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/forms/volunteer', async (route) => {
      sent = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: { ok: true, id: 'volunteer_test' } });
    });
    await page.goto('/cfv');
    await hydrated(page);
    const send = page.getByRole('button', { name: 'Send application' });
    await send.click();
    await expect(page.getByText('Fix the highlighted fields.')).toBeVisible();
    await expect(page.getByLabel(/^Name/)).toBeFocused();
    await expect(page.getByLabel(/^Name/)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Choose at least one area.')).toBeVisible();
    const firstArea = page.getByRole('checkbox', { name: 'Community management' });
    await expect(firstArea).toHaveAttribute('aria-describedby', /interests/);
    await fillRequired(page);
    await page.getByLabel('LinkedIn profile').fill('https://example.com/me');
    await send.click();
    await expect(page.getByText('Enter a linkedin.com link, like https://www.linkedin.com/in/your-name.')).toBeVisible();
    await expect(page.getByLabel('LinkedIn profile')).toBeFocused();
    await page.getByLabel('LinkedIn profile').fill('https://www.linkedin.com/in/test-person');
    await page.getByRole('checkbox', { name: 'Graphic design' }).check();
    await page.getByRole('radio', { name: 'Other' }).check();
    await send.click();
    await expect(page.getByLabel('Tell us how much time you have')).toBeFocused();
    await page.getByLabel('Tell us how much time you have').fill('Two Saturdays a month');
    await page.getByLabel(/GitHub username or link/).fill('test-person');
    expect(sent).toBeUndefined();
    await send.click();
    await expect(page.getByRole('status').getByText('Thanks. Your application is in.')).toBeVisible();
    expect(sent).toMatchObject({
      name: 'Test Person',
      email: 'test@example.com',
      linkedinProfile: 'https://www.linkedin.com/in/test-person',
      githubProfile: 'test-person',
      availability: 'other',
      availabilityOther: 'Two Saturdays a month',
      interests: ['Event organisation', 'Graphic design'],
      message: 'I enjoy the meetups.',
      website_url: '',
    });
  });

  test('a failed send keeps every answer, sends once while pending, and offers email', async ({ page }) => {
    let calls = 0;
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route('**/api/forms/volunteer', async (route) => {
      calls++;
      await held;
      await route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } });
    });
    await page.goto('/cfv');
    await hydrated(page);
    await fillRequired(page);
    await page.getByRole('checkbox', { name: 'Social media' }).check();
    await page.getByRole('button', { name: 'Send application' }).click();
    const pending = page.getByRole('button', { name: 'Sending…' });
    await expect(pending).toBeDisabled();
    await pending.click({ force: true });
    release();
    await expect(page.getByRole('alert').filter({ hasText: 'We couldn’t send that' })).toBeVisible();
    expect(calls).toBe(1);
    await expect(page.getByText('Thanks. Your application is in.')).toHaveCount(0);
    await expect(page.getByLabel(/^Name/)).toHaveValue('Test Person');
    await expect(page.getByLabel('LinkedIn profile')).toHaveValue('https://www.linkedin.com/in/test-person');
    await expect(page.getByRole('radio', { name: 'A few hours monthly' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Event organisation' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Social media' })).toBeChecked();
    await expect(page.getByLabel('Why do you want to volunteer with ZurichJS?')).toHaveValue('I enjoy the meetups.');
    await expect(page.getByRole('form', { name: 'Volunteer application' }).getByRole('link', { name: 'hello@zurichjs.com' })).toHaveAttribute(
      'href',
      /^mailto:hello@zurichjs\.com\?subject=Volunteer%20application/,
    );
  });
});

test.describe('home (Bogdan’s review)', () => {
  test('the next meetup is one link to its event page, and the carousel works from the keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('JavaScript meets Zurich.');
    const card = page.locator('[data-next-meetup]');
    await expect(card).toHaveAccessibleName(/Details and RSVP$/);
    await expect(card).toHaveAttribute('href', /^\/events\//);
    await expect(page.getByText('Opens Meetup in a new tab')).toHaveCount(0);
    const carousel = page.getByRole('region', { name: 'ZurichJS speakers' });
    await carousel.scrollIntoViewIfNeeded();
    await expect(page.locator('astro-island[ssr]', { has: carousel })).toHaveCount(0);
    const active = () => carousel.locator('a[tabindex="0"]');
    // Focus inside holds the rotation, so the active card only moves when we move it.
    await carousel.getByRole('button', { name: 'Next speaker' }).focus();
    const first = await active().getAttribute('href');
    // The arc ignores steps asked for while a card is still moving (520ms, by design), so each step waits for the move.
    const settle = () => page.waitForTimeout(600);
    await carousel.getByRole('button', { name: 'Next speaker' }).click();
    await expect(active()).not.toHaveAttribute('href', first!);
    await settle();
    await carousel.getByRole('button', { name: 'Previous speaker' }).click();
    await expect(active()).toHaveAttribute('href', first!);
    await settle();
    await active().focus();
    await page.keyboard.press('ArrowRight');
    await expect(active()).not.toHaveAttribute('href', first!);
  });
});
