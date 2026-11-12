import { expect, test, type Page } from '@playwright/test';

/**
 * Talk proposals (/cfp) and /contact on the sample build. Every submission is
 * intercepted with page.route: nothing is stored and no message is sent.
 */
const hydrated = async (page: Page) => expect(page.locator('astro-island[ssr]')).toHaveCount(0);
const DRAFT_KEY = 'zurichjs-cfp-draft';

const openProposal = async (page: Page) => {
  await page.goto('/cfp#proposal');
  await hydrated(page);
  await expect(page.getByRole('form', { name: 'Talk proposal' })).toBeVisible();
};

const fillProposal = async (page: Page) => {
  const form = page.getByRole('form', { name: 'Talk proposal' });
  await form.getByLabel('Name', { exact: true }).fill('Ada Lovelace');
  await form.getByLabel('Email', { exact: true }).fill('ada@example.com');
  await form.getByLabel('Job title').fill('Engineer');
  await form.getByLabel('Bio', { exact: true }).fill('Writes programs for engines.');
  await form.getByLabel('LinkedIn', { exact: true }).fill('https://www.linkedin.com/in/ada');
  await form.getByLabel('Bluesky (optional)').fill('@ada.bsky.social');
  await form.getByLabel('GitHub (optional)').fill('ada');
  await form.getByLabel('Title', { exact: true }).fill('Typed forms');
  await form.getByLabel('What will people learn?').fill('How to keep forms honest.');
  await form.getByRole('radio', { name: /Lightning talk/ }).check();
  await form.getByRole('radio', { name: 'Intermediate' }).check();
  await form.getByRole('checkbox', { name: 'TypeScript' }).check();
  await form.getByRole('checkbox', { name: 'Testing', exact: true }).check();
  await form.getByRole('checkbox', { name: /travel and accommodation can’t be covered/ }).check();
  return form;
};

test.describe('talk proposals (/cfp)', () => {
  test('the meetup form shows straight away (no conference choice), explains CFP once and lists the real lengths', async ({ page }) => {
    await page.goto('/cfp');
    await hydrated(page);
    await expect(page.getByRole('form', { name: 'Talk proposal' })).toBeVisible();
    await expect(page.getByText('At ZurichJS Conf')).toHaveCount(0);
    await expect(page.getByText(/call for papers \(CFP\)/)).toHaveCount(1);
    await expect(page.getByRole('radio', { name: /Lightning talk/ })).toBeAttached();
    await expect(page.getByText(/35 min/)).toHaveCount(0);
  });

  test('validation names each missing field, marks it invalid and focuses the first one', async ({ page }) => {
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    await form.getByRole('button', { name: 'Send proposal' }).click();
    await expect(form.getByRole('alert')).toHaveText('Fix the highlighted fields.');
    await expect(form.getByLabel('Name', { exact: true })).toBeFocused();
    for (const label of ['Name', 'Email', 'Job title', 'Bio', 'LinkedIn', 'What will people learn?'])
      await expect(form.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Choose at least one topic.')).toBeVisible();
    await expect(form.getByText('Choose who the talk is for.')).toBeVisible();
    // The terms must be confirmed: travel isn't covered, and talks are picked by theme and slots.
    const agree = form.getByRole('checkbox', { name: /travel and accommodation can’t be covered/ });
    await expect(agree).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Tick the box to confirm you’ve read this.')).toBeVisible();
    // Returning speakers may leave the profile out.
    await form.getByLabel('Yes, I’ve spoken at ZurichJS before.').check();
    await expect(form.getByLabel('Job title (optional)')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('the draft is saved in this browser, survives a reload and can be cleared', async ({ page }) => {
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    // The saved-answers bar only shows once the form holds answers.
    await expect(form.getByText(/saved in this browser only/)).toHaveCount(0);
    await form.getByLabel('Title', { exact: true }).fill('Draft title');
    await expect(form.getByText(/saved in this browser only/)).toBeVisible();
    await form.getByRole('checkbox', { name: 'React', exact: true }).check();
    await page.reload();
    await hydrated(page);
    await expect(form.getByLabel('Title', { exact: true })).toHaveValue('Draft title');
    await expect(form.getByRole('checkbox', { name: 'React', exact: true })).toBeChecked();
    await form.getByRole('button', { name: 'Clear saved answers' }).click();
    await expect(form.getByText('Saved answers cleared.')).toBeVisible();
    await expect(form.getByLabel('Title', { exact: true })).toHaveValue('');
    expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
  });

  test('a draft from the earlier form (deep dive in minutes) opens as a standard talk', async ({ page }) => {
    await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify({ name: 'Old', title: 'Old draft', format: 35 })), DRAFT_KEY);
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    await expect(form.getByLabel('Title', { exact: true })).toHaveValue('Old draft');
    await expect(form.getByRole('radio', { name: /Full talk/ })).toBeChecked();
  });

  test('success only after the API accepts it, sends the full payload once, then clears the draft', async ({ page }) => {
    const sent: Record<string, unknown>[] = [];
    await page.route('**/api/forms/cfp', async (route) => {
      sent.push(route.request().postDataJSON());
      await new Promise((r) => setTimeout(r, 300));
      await route.fulfill({ json: { ok: true, id: 'sub-1' } });
    });
    await openProposal(page);
    const form = await fillProposal(page);
    const send = form.getByRole('button', { name: 'Send proposal' });
    await send.click();
    // A second press while sending does nothing.
    await form.getByLabel('Title', { exact: true }).press('Enter');
    await expect(page.getByRole('heading', { name: 'Thank you very much. Your proposal is in.' })).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      jobTitle: 'Engineer',
      bio: 'Writes programs for engines.',
      linkedin: 'https://www.linkedin.com/in/ada',
      github: 'ada',
      title: 'Typed forms',
      abstract: 'How to keep forms honest.',
      format: 'Lightning',
      level: 'intermediate',
      bluesky: '@ada.bsky.social',
      topics: ['TypeScript', 'Testing'],
      agree: true,
      website_url: '',
    });
    await expect(page.getByText(/We’ll reach out in the coming days about your proposal/)).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
  });

  test('the form is grouped under headings, Name and Email line up, and a photo goes with the proposal', async ({ page }) => {
    let contentType = '';
    let body = '';
    await page.route('**/api/forms/cfp', async (route) => {
      contentType = route.request().headers()['content-type'] ?? '';
      body = route.request().postDataBuffer()?.toString('latin1') ?? '';
      await route.fulfill({ json: { ok: true, id: 'sub-2' } });
    });
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    for (const legend of ['About you', 'Speaker profile', 'Socials', 'Your talk', 'Before you send']) await expect(form.getByRole('group', { name: legend })).toBeVisible();
    // Side by side on wide screens: the two inputs start at the same height (measured together, as the page may still be scrolling to #proposal).
    const [name, email] = await page.evaluate(() =>
      ['name', 'email'].map((n) => document.querySelector(`#proposal input[name="${n}"]`)!.getBoundingClientRect()).map((r) => ({ x: r.x, y: r.y })),
    );
    if (name!.x !== email!.x) expect(Math.abs(name!.y - email!.y)).toBeLessThan(1);
    // A 1×1 PNG: the browser shrinks it to JPEG only when that is smaller, so it may go as PNG.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    await form.getByLabel('Photo (optional)').setInputFiles({ name: 'ada.png', mimeType: 'image/png', buffer: png });
    await expect(form.getByRole('img', { name: 'Preview of your upload' })).toBeVisible();
    await fillProposal(page);
    await form.getByRole('button', { name: 'Send proposal' }).click();
    await expect(page.getByRole('heading', { name: 'Thank you very much. Your proposal is in.' })).toBeVisible();
    expect(contentType).toMatch(/^multipart\/form-data/);
    expect(body).toContain('name="photo"');
    expect(body).toContain('"title":"Typed forms"');
  });

  test('a failed send keeps every answer and offers the proposal by email', async ({ page }) => {
    await page.route('**/api/forms/cfp', (route) => route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } }));
    await openProposal(page);
    const form = await fillProposal(page);
    await form.getByRole('button', { name: 'Send proposal' }).click();
    await expect(form.getByRole('alert')).toHaveText('We couldn’t send that right now.');
    await expect(page.getByRole('heading', { name: 'Thank you very much. Your proposal is in.' })).toHaveCount(0);
    await expect(form.getByLabel('Title', { exact: true })).toHaveValue('Typed forms');
    await expect(form.getByRole('checkbox', { name: 'Testing', exact: true })).toBeChecked();
    const mail = form.getByRole('link', { name: 'hello@zurichjs.com' });
    await expect(mail).toHaveAttribute('href', /^mailto:hello@zurichjs\.com\?subject=Talk%20proposal%3A%20Typed%20forms&body=.*Topics%3A%20TypeScript%2C%20Testing/);
    expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toContain('Typed forms');
  });

  test('the honeypot is hidden from people, keyboards and assistive tech', async ({ page }) => {
    await openProposal(page);
    const trap = page.locator('input[name="website_url"]');
    await expect(trap).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('div[aria-hidden="true"][inert]').filter({ has: trap })).toHaveCount(1);
    await expect(page.getByRole('textbox', { name: /Leave this field empty/ })).toHaveCount(0);
  });
});

test.describe('/contact', () => {
  test('a topic preset fills the form; a successful send is confirmed', async ({ page }) => {
    let sent: Record<string, unknown> | undefined;
    await page.route('**/api/forms/contact', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true, id: 'c1' } });
    });
    await page.goto('/contact?topic=hosting');
    await hydrated(page);
    await expect(page.getByRole('combobox', { name: 'Topic' })).toHaveValue('Hosting or sponsoring');
    await page.getByLabel('Name', { exact: true }).fill('Grace');
    await page.getByRole('textbox', { name: 'Email' }).fill('grace@example.com');
    await page.getByRole('textbox', { name: 'Message' }).fill('We have a room for 80.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('Message sent.')).toBeVisible();
    expect(sent).toMatchObject({ name: 'Grace', email: 'grace@example.com', topic: 'Hosting or sponsoring', message: 'We have a room for 80.', website_url: '' });
  });

  test('a failed send keeps the message and offers email', async ({ page }) => {
    await page.route('**/api/forms/contact', (route) => route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } }));
    await page.goto('/contact');
    await hydrated(page);
    await page.getByLabel('Name', { exact: true }).fill('Grace');
    await page.getByRole('textbox', { name: 'Email' }).fill('grace@example.com');
    await page.getByRole('textbox', { name: 'Message' }).fill('Hello');
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByText('We couldn’t send that right now.')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Message' })).toHaveValue('Hello');
    await expect(page.getByText('Message sent.')).toHaveCount(0);
  });

  test('code of conduct reports have their own route, away from the form', async ({ page }) => {
    let posted = false;
    await page.route('**/api/forms/contact', async (route) => {
      posted = true;
      await route.fulfill({ json: { ok: true } });
    });
    await page.goto('/contact?topic=conduct');
    await hydrated(page);
    const conduct = page.locator('#conduct');
    await expect(conduct.getByRole('heading', { name: 'Report a code of conduct concern' })).toBeVisible();
    await expect(conduct.getByRole('link', { name: 'hello@zurichjs.com' })).toHaveAttribute('href', /^mailto:hello@zurichjs\.com\?subject=Code%20of%20conduct%20concern/);
    await expect(conduct.getByRole('link', { name: 'Read the code of conduct' })).toHaveAttribute('href', '/policies/code-of-conduct#reporting-guidelines');
    // The form says not to use it, and never offers conduct as a topic.
    await expect(page.getByText('Reporting a code of conduct concern?')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Topic' }).locator('option', { hasText: /conduct/i })).toHaveCount(0);
    await page.getByRole('link', { name: 'Use the private route' }).click();
    await expect(page).toHaveURL(/#conduct$/);
    expect(posted).toBe(false);
  });

  test('channels, organisers and the FAQ are back', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('link', { name: /linkedin\.com\/company\/zurichjs/ })).toHaveAttribute('href', 'https://www.linkedin.com/company/zurichjs');
    await expect(page.getByRole('link', { name: /meetup\.com\/zurich-js/ })).toHaveAttribute('href', 'https://www.meetup.com/zurich-js/');
    // All three organisers, each with an email.
    for (const email of ['faris@zurichjs.com', 'bogdan@zurichjs.com', 'nadja@zurichjs.com']) await expect(page.getByRole('link', { name: email })).toBeVisible();
    for (const q of [
      'How can I speak at a ZurichJS meetup?',
      'Do you cover travel and accommodation for speakers?',
      'Are ZurichJS meetups suitable for beginners?',
      'How can I get involved?',
    ])
      await expect(page.getByRole('heading', { name: q })).toBeVisible();
    // The answers are disclosure cards: closed until the question is opened.
    const answer = page.getByText(/^No\. Our meetups are free, so we can’t cover travel or accommodation/);
    await expect(answer).toBeHidden();
    await page.getByRole('heading', { name: 'Do you cover travel and accommodation for speakers?' }).click();
    await expect(answer).toBeVisible();
  });
});
