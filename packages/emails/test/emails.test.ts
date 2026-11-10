import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors } from '@zurichjs/design/tokens';
import { describe, expect, it } from 'vitest';
import { boardNoticeFromText, render, renderEmail, safeUrl, TEMPLATE_NAMES } from '../src/index.ts';

const root = join(import.meta.dirname, '../../..');
const application = {
  name: 'Ada  Lovelace',
  organisationName: null,
  levelName: 'Supporter',
  cycleLabel: 'Yearly',
  feeLabel: 'CHF 250 a year',
  price: 'CHF 250',
  per: 'a year',
  accountUrl: 'https://zurichjs.com/membership/account',
};
const term = { ...application, term: '10th November 2026 to 9th November 2027', certificateNumber: 'ZJS-2026-0001', nextPayment: '10th November 2027' };
const link = 'https://zurichjs.com/api/auth/magic-link/verify?token=t1&callbackURL=%2Fmembership%2Faccount';

describe('login-link', () => {
  const e = renderEmail('login-link', { url: link, validMinutes: 60, firstTime: false });

  it('puts the link in the button and in full, escaped for HTML', () => {
    const escaped = link.replaceAll('&', '&amp;');
    expect(e.html.split(`href="${escaped}"`).length - 1).toBe(2);
    expect(e.html).not.toContain(link);
  });

  it('has a plain-text version with the same link', () => {
    expect(e.text).toContain(`Sign in: ${link}`);
    expect(e.text).toContain('The link works once, for 60 minutes, on the device where you open it.');
    expect(e.text).toContain('Swiss JavaScript Group, Alderstrasse 30, 8008 Zurich.');
  });

  it('welcomes someone signing in for the first time', () => {
    expect(renderEmail('login-link', { url: link, validMinutes: 1, firstTime: true })).toMatchObject({ subject: 'Your ZurichJS sign-in link' });
    expect(renderEmail('login-link', { url: link, validMinutes: 1, firstTime: true }).text).toMatch(/^Welcome to your ZurichJS account[\s\S]*for 1 minute,/);
  });
});

describe('membership emails', () => {
  it('welcomes a new member with the term, the fee and the attached certificate', () => {
    const e = renderEmail('membership-welcome', { ...term, organisationName: 'Acme AG' });
    expect(e.subject).toBe('Welcome to the Swiss JavaScript Group');
    expect(e.text).toMatch(/^Welcome, Ada\n/);
    expect(e.text).toContain(
      'Supporter: CHF 250 a year\nOrganisation: Acme AG\nBilled: Once a year, automatically\nCurrent term: 10th November 2026 to 9th November 2027\nNext payment: 10th November 2027',
    );
    expect(e.text).toContain('Your membership is active');
    expect(e.text).toContain('Manage subscription: https://zurichjs.com/membership/account');
    expect(e.text).toContain('(ZJS-2026-0001) is attached');
    expect(e.html).toContain('#dcf0e1'); // the active badge, in success-soft
    // Certificate and account notes come after the button, small and grey.
    expect(e.html.indexOf('Manage subscription')).toBeLessThan(e.html.indexOf('ZJS-2026-0001) is attached'));
    expect(e.html).toMatch(/font-size:15px;color:#5f626b;">Your certificate of membership/);
  });

  it('says quarterly billing in plain words', () => {
    const e = renderEmail('membership-welcome', { ...term, levelName: 'Basic Member', cycleLabel: 'Quarterly', price: 'CHF 50', per: 'a quarter' });
    expect(e.text).toContain('Basic Member: CHF 50 a quarter\nBilled: Every 3 months, automatically');
  });

  it('confirms a renewal with the new term', () => {
    expect(renderEmail('membership-renewed', term).text).toContain(
      'Supporter: CHF 250 a year\nBilled: Once a year, automatically\nNew term: 10th November 2026 to 9th November 2027\nNext payment: 10th November 2027',
    );
  });

  it('flags a failed payment in the error colour', () => {
    const e = renderEmail('payment-failed', application);
    expect(e.html).toContain('#f6d8d3'); // danger-soft
    expect(e.text).toContain('Update payment method: https://zurichjs.com/membership/account');
  });

  it('gives a written copy of a resignation, and says when dues hold it up (Art. 5)', () => {
    expect(renderEmail('resignation-received', { ...application, openDues: false }).text).toContain('This email is your written copy (bylaws Art. 5).');
    expect(renderEmail('resignation-received', { ...application, openDues: true }).text).toContain('takes effect once it is paid');
    expect(renderEmail('resignation-confirmed', { ...application, lastDay: '9th November 2027' }).text).toContain('Your membership ends on 9th November 2027');
  });

  it('never talks about signing or approval any more', () => {
    for (const name of TEMPLATE_NAMES) {
      const e = renderEmail(name, {
        url: link,
        validMinutes: 15,
        firstTime: false,
        ...term,
        openDues: false,
        lastDay: null,
        subject: 'Subject',
        heading: 'Heading',
        paidThrough: '30th September 2027',
        firstPayment: '1st October 2027',
      } as never);
      expect(e.text).not.toMatch(/declaration|approv/i);
    }
  });
});

describe('emails to the board', () => {
  it('lays out the forms’ plain text: details as rows, a long message in full, replies named in the footer', () => {
    const p = boardNoticeFromText('Contact: Sponsoring from Ada', 'Name: Ada\nEmail: ada@example.com\nMessage: First line\nsecond line', 'Ada <ada@example.com>');
    expect(p).toMatchObject({
      rows: [
        ['Name', 'Ada'],
        ['Email', 'ada@example.com'],
      ],
      message: { label: 'Message', text: 'First line\nsecond line' },
      replyTo: 'Ada',
    });
    const e = renderEmail('board-notice', p);
    expect(e.subject).toBe('Contact: Sponsoring from Ada');
    expect(e.text).toContain('second line');
    expect(e.text).toContain('Reply to answer Ada directly.');
    expect(e.text).not.toContain('Questions? Reply');
  });
});

describe('layout', () => {
  it('escapes everything a template passes', () => {
    const e = render({ subject: 'S <b>', preheader: 'P', heading: 'H "q"', blocks: [{ kind: 'p', text: '<script>alert(1)</script> & co' }] });
    expect(e.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; co');
    expect(e.html).toContain('<title>S &lt;b&gt;</title>');
    expect(e.html).not.toContain('<script>');
  });

  it('refuses links that are not https', () => {
    expect(() => safeUrl('javascript:alert(1)')).toThrow(/https/);
    expect(() => safeUrl('http://zurichjs.com')).toThrow(/https/);
    expect(safeUrl('http://localhost:4321/x')).toBe('http://localhost:4321/x');
    expect(() => render({ subject: 's', preheader: 'p', heading: 'h', blocks: [{ kind: 'button', label: 'x', url: 'data:text/html,hi' }] })).toThrow();
  });

  it('follows the brand rules: only token colours, no em or en dashes', () => {
    for (const name of TEMPLATE_NAMES) {
      const e = renderEmail(name, {
        url: link,
        validMinutes: 60,
        firstTime: true,
        ...term,
        openDues: true,
        lastDay: '9th November 2027',
        subject: 'Subject',
        heading: 'Heading',
        paidThrough: '30th September 2027',
        firstPayment: '1st October 2027',
      } as never);
      const used = new Set((e.html.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase()));
      const allowed = new Set(Object.values(colors).map((c) => c.toLowerCase()));
      expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
      expect(`${e.subject}${e.html}${e.text}`).not.toMatch(/[–—]/);
    }
  });

  it('serves the same Figtree file the site uses, from a stable URL', () => {
    const site = readFileSync(join(root, 'apps/web/public/fonts/figtree-var.woff2'));
    const design = readFileSync(join(root, 'packages/design/src/fonts/figtree-var.woff2'));
    expect(site.equals(design)).toBe(true);
    expect(render({ subject: 's', preheader: 'p', heading: 'h', blocks: [] }).html).toContain("url('https://zurichjs.com/fonts/figtree-var.woff2')");
  });
});
