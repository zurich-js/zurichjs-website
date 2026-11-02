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
  await form.getByLabel('Short bio').fill('Writes programs for engines.');
  await form.getByLabel('LinkedIn profile').fill('https://www.linkedin.com/in/ada');
  await form.getByLabel('GitHub (optional)').fill('ada');
  await form.getByLabel('Title', { exact: true }).fill('Typed forms');
  await form.getByLabel('What will people learn?').fill('How to keep forms honest.');
  await form.getByRole('radio', { name: /Lightning talk/ }).check();
  await form.getByRole('radio', { name: 'Intermediate' }).check();
  await form.getByRole('checkbox', { name: 'TypeScript' }).check();
  await form.getByRole('checkbox', { name: 'Testing', exact: true }).check();
  return form;
};

test.describe('talk proposals (/cfp)', () => {
  test('the intro explains CFP once, lists the real lengths and makes no travel promise', async ({ page }) => {
    await page.goto('/cfp');
    await expect(page.getByText(/call for papers \(CFP\)/)).toHaveCount(1);
    await expect(page.getByText('Open all year. A lightning talk (5 minutes) or a standard talk (25 minutes).', { exact: false })).toBeVisible();
    await expect(page.getByText(/35 min/)).toHaveCount(0);
    await expect(page.getByText(/can’t promise to cover travel or accommodation/)).toBeVisible();
  });

  test('validation names each missing field, marks it invalid and focuses the first one', async ({ page }) => {
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    await form.getByRole('button', { name: 'Send proposal' }).click();
    await expect(form.getByRole('alert')).toHaveText('Fix the highlighted fields.');
    await expect(form.getByLabel('Name', { exact: true })).toBeFocused();
    for (const label of ['Name', 'Email', 'Job title', 'Short bio', 'LinkedIn profile', 'What will people learn?'])
      await expect(form.getByLabel(label)).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('Choose at least one topic.')).toBeVisible();
    await expect(form.getByText('Choose who the talk is for.')).toBeVisible();
    // Returning speakers may leave the profile out.
    await form.getByLabel('I’ve spoken at ZurichJS before.').check();
    await expect(form.getByLabel('Job title (optional)')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('the draft is saved in this browser, survives a reload and can be cleared', async ({ page }) => {
    await openProposal(page);
    const form = page.getByRole('form', { name: 'Talk proposal' });
    await expect(form.getByText(/saved in this browser only/)).toBeVisible();
    await form.getByLabel('Title', { exact: true }).fill('Draft title');
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
    await expect(form.getByRole('radio', { name: /Standard talk/ })).toBeChecked();
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
    await expect(page.getByRole('heading', { name: 'Thanks. Your proposal is in.' })).toBeVisible();
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
      topics: ['TypeScript', 'Testing'],
      website_url: '',
    });
    await expect(page.getByText(/private link to add your photo/)).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), DRAFT_KEY)).toBeNull();
  });

  test('a failed send keeps every answer and offers the proposal by email', async ({ page }) => {
    await page.route('**/api/forms/cfp', (route) => route.fulfill({ status: 502, json: { ok: false, error: 'We couldn’t send that right now.' } }));
    await openProposal(page);
    const form = await fillProposal(page);
    await form.getByRole('button', { name: 'Send proposal' }).click();
    await expect(form.getByRole('alert')).toHaveText('We couldn’t send that right now.');
    await expect(page.getByRole('heading', { name: 'Thanks. Your proposal is in.' })).toHaveCount(0);
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
    await expect(page.getByRole('link', { name: 'linkedin.com/company/zurichjs' })).toHaveAttribute('href', 'https://www.linkedin.com/company/zurichjs');
    await expect(page.getByRole('link', { name: 'meetup.com/zurich-js' })).toHaveAttribute('href', 'https://www.meetup.com/zurich-js/');
    await expect(page.getByRole('link', { name: 'faris@zurichjs.com' })).toBeVisible();
    for (const q of [
      'How can I speak at a ZurichJS meetup?',
      'Do you cover travel and accommodation for speakers?',
      'Are ZurichJS meetups suitable for beginners?',
      'How can I get involved?',
    ])
      await expect(page.getByRole('heading', { name: q })).toBeVisible();
    await expect(page.getByText(/can’t promise to cover travel or accommodation/)).toBeVisible();
  });
});
