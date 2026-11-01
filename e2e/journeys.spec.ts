import { expect, test, type Page } from '@playwright/test';

/**
 * Critical visitor journeys on the sample content (CONTENT_SOURCE=sample,
 * BUILD_NOW=2026-11-01T12:00:00+01:00). Islands follow the browser clock, so
 * each test fixes it. Form submissions are intercepted: no record is created
 * and no message is sent.
 */
const at = async (page: Page, iso: string) => page.clock.setFixedTime(new Date(iso));

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
    await expect(page.getByText('Talks in running order.')).toBeVisible();
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
    // No Maps key in this build: no map button, no Google request.
    await expect(venue.getByRole('button', { name: 'Show map' })).toHaveCount(0);
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
    await expect(page.getByText(/How (was|is) tonight/)).toHaveCount(0);
    await expect(page.getByText('Wed 18 Nov 2026').first()).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'How is tonight going?' })).toBeVisible();
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
    await page.getByRole('radio', { name: 'Monthly' }).click();
    await page.getByRole('button', { name: 'CHF 30' }).click();
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
      route.fulfill({ status: 503, json: { ok: false, error: 'Online payments are not available right now. You can still give by Twint or by email below.' } }),
    );
    await page.goto('/donate');
    await page.getByLabel(/Or another amount/).fill('2');
    await expect(page.locator('#donate-summary')).toHaveText('');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Choose an amount' })).toBeVisible();
    await page.getByLabel(/Or another amount/).fill('25');
    await expect(page.locator('#donate-summary')).toHaveText('You’ll give CHF 25 once.');
    await page.getByRole('button', { name: 'Continue to secure payment' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Online payments are not available' })).toBeVisible();
  });

  test('coming back from Stripe without paying says so; old /buy-us-a-coffee links reach the donation form', async ({ page }) => {
    await page.goto('/buy-us-a-coffee?canceled=true');
    await expect(page).toHaveURL(/\/donate\?canceled=true/);
    await expect(page.getByText('No payment was made.')).toBeVisible();
  });

  test('membership: choosing a tier and billing updates the price and the request button', async ({ page }) => {
    await page.goto('/membership');
    await expect(page.getByText('Coming to meetups is free and never needs a membership.')).toBeVisible();
    await expect(page.getByText('Free or discounted workshops')).toBeVisible();
    await page.getByRole('button', { name: 'Choose Supporter' }).click();
    await page.getByRole('radio', { name: /Yearly, CHF 250/ }).click();
    await expect(page.getByRole('button', { name: 'Send request: Supporter, CHF 250 a year' })).toBeVisible();
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/verein-inquiry', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });
    await page.getByLabel('Name').fill('Test Person');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: /Send request/ }).click();
    await expect(page.getByText('Request sent.')).toBeVisible();
    expect(sent).toMatchObject({ tier: 'Supporter', billingCycle: 'yearly' });
  });

  test('membership: a failed request keeps the answers and offers email', async ({ page }) => {
    await page.route('**/api/verein-inquiry', (route) => route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } }));
    await page.goto('/membership');
    await page.getByLabel('Name').fill('Test Person');
    await page.getByLabel('Email').fill('test@example.com');
    await page.getByRole('button', { name: /Send request/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'We couldn’t send that' })).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Test Person');
    await expect(page.getByRole('link', { name: 'hello@zurichjs.com' }).first()).toHaveAttribute('href', /^mailto:hello@zurichjs\.com\?subject=Membership/);
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
    await expect(page.getByRole('link', { name: /^Testing \d+$/ })).toHaveAttribute('aria-pressed', 'true');
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
