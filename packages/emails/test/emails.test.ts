import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors } from '@zurichjs/design/tokens';
import { describe, expect, it } from 'vitest';
import { render, renderEmail, safeUrl, TEMPLATE_NAMES } from '../src/index.ts';

const root = join(import.meta.dirname, '../../..');
const application = {
  name: 'Ada  Lovelace',
  organisationName: null,
  levelName: 'Supporter',
  cycleLabel: 'Yearly',
  feeLabel: 'CHF 250 a year',
  accountUrl: 'https://zurichjs.com/membership/account',
};
const link = 'https://abc.supabase.co/auth/v1/verify?token=t1&type=magiclink&redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount';

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

describe('application emails', () => {
  it('confirms the request with what the person chose, and says nothing is charged', () => {
    const e = renderEmail('application-received', { ...application, organisationName: 'Acme AG' });
    expect(e.text).toMatch(/^Thanks, Ada\n/);
    expect(e.text).toContain('Organisation: Acme AG\nMembership: Supporter\nBilling: Yearly\nFee: CHF 250 a year');
    expect(e.text).toContain('Nothing has been charged.');
    expect(e.text).toContain('See your request: https://zurichjs.com/membership/account');
  });

  it('sends the approved member to sign first, then pay', () => {
    const e = renderEmail('application-approved', application);
    expect(e.subject).toBe('Your ZurichJS membership is approved');
    expect(e.text).toContain('Sign the declaration: https://zurichjs.com/membership/account');
    expect(e.html).toContain('#dcf0e1'); // the success box, in success-soft
  });

  it('declines neutrally, without a reason, and points to the free meetups', () => {
    const e = renderEmail('application-declined', application);
    expect(e.text).toContain('See upcoming meetups: https://zurichjs.com/events');
    expect(e.text).not.toMatch(/because|reason/i);
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
      const e = renderEmail(name, { url: link, validMinutes: 60, firstTime: true, ...application } as never);
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
