import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { colors } from '@zurichjs/design/theme';
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
const sponsor = {
  companyName: 'Acme AG',
  contactName: 'Grace  Hopper',
  tierName: 'Community Builder',
  cycleLabel: 'Quarterly',
  feeLabel: 'CHF 1’400 a quarter',
  price: 'CHF 1’400',
  per: 'a quarter',
  paymentLabel: 'By card',
  meetups: [] as string[],
  accountUrl: 'https://zurichjs.com/partners/account',
  benefits: ['Large logo on our site and partner list', '2 sponsor slides in rotation at meetups'],
};
const link = 'https://zurichjs.com/api/auth/magic-link/verify?token=t1&callbackURL=%2Fmembership%2Faccount';
const talk = {
  speakerName: 'Ada  Lovelace',
  talkTitle: 'Signals in practice',
  eventTitle: 'Forms, types and design systems',
  date: 'Wed 18th Nov 2026',
  time: 'Starts 18:30 CET',
  venue: 'Venue AG, Hardstrasse 201, 8005 Zürich',
  eventUrl: 'https://zurichjs.com/events/zurichjs-meetup-november-2026',
  profileUrl: 'https://zurichjs.com/speakers/profile?token=t2',
};

/** Raffle emails (raffles.ts): what an entrant gets. */
const raffle = {
  name: 'Kim',
  prize: 'Mechanical keyboard',
  meetup: 'ZurichJS Meetup December, 9th December 2026',
  sponsorName: 'Acme AG',
  claimCode: 'K7Q3MX',
  manageUrl: 'https://zurichjs.com/raffle/manage#t=abc',
  rulesUrl: 'https://zurichjs.com/raffle-rules',
};

describe('raffle emails', () => {
  it('give the claim code and the entry link, and never make entry depend on anything else', () => {
    const entry = renderEmail('raffle-entry', raffle);
    expect(entry.subject).toBe('You are in the raffle for Mechanical keyboard');
    expect(entry.text).toContain('K7Q3MX');
    expect(entry.text).toContain('https://zurichjs.com/raffle/manage#t=abc');
    expect(entry.text).toContain('Your entry counts either way.');
    expect(entry.text).not.toMatch(/newsletter|marketing|share/i);
    const won = renderEmail('raffle-winner', raffle);
    expect(won.subject).toBe('Your claim code K7Q3MX was drawn');
  });
});

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
    for (const name of TEMPLATE_NAMES.filter((n) => !n.startsWith('sponsor-'))) {
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
        ...talk,
        ...raffle,
      } as never);
      expect(e.text).not.toMatch(/declaration|approv/i);
    }
  });
});

describe('talk-scheduled', () => {
  it('tells the speaker where and when, with the event page, their profile link and a reply line', () => {
    const e = renderEmail('talk-scheduled', talk);
    expect(e.subject).toBe('Your talk is on Forms, types and design systems');
    expect(e.text).toMatch(/^Hi Ada\n/);
    expect(e.text).toContain('Good news: your talk “Signals in practice” is on Forms, types and design systems.');
    expect(e.text).toContain(
      'Talk: Signals in practice\nMeetup: Forms, types and design systems\nDate: Wed 18th Nov 2026\nTime: Starts 18:30 CET\nVenue: Venue AG, Hardstrasse 201, 8005 Zürich',
    );
    expect(e.text).toContain('See the event page: https://zurichjs.com/events/zurichjs-meetup-november-2026');
    expect(e.text).toContain('check your bio and photo on your private speaker page');
    expect(e.text).toContain('https://zurichjs.com/speakers/profile?token=t2');
    expect(e.text).toContain('Any questions? Reply to this email');
    expect(e.text).not.toContain("We'll confirm the details soon");
    // One yellow button only: the profile link is written out.
    expect(e.html.split('See the event page').length - 1).toBe(1);
  });

  it('says the details follow when Sanity has no date, time or venue, and never makes them up', () => {
    const e = renderEmail('talk-scheduled', { ...talk, date: null, time: null, venue: null, profileUrl: null });
    expect(e.text).toContain("We'll confirm the details soon.");
    expect(e.text).not.toMatch(/Date:|Time:|Venue:|speaker page/);
    expect(e.text).toContain('Meetup: Forms, types and design systems');
    expect(renderEmail('talk-scheduled', { ...talk, venue: null }).text).toContain("We'll confirm the details soon.");
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

  it('keeps the line breaks a person typed: blank lines make paragraphs, single ones a <br>', () => {
    const e = render({ subject: 's', preheader: 'p', heading: 'h', blocks: [{ kind: 'p', text: 'Hi Grace,\r\n\r\nAs discussed:\n- slides <b>\n- logo\n\n\nBest,\nFaris' }] });
    expect(e.html).toContain('>Hi Grace,</p>');
    expect(e.html).toContain('>As discussed:<br>- slides &lt;b&gt;<br>- logo</p>');
    expect(e.html).toContain('>Best,<br>Faris</p>');
    expect(e.text).toContain('As discussed:\n- slides <b>\n- logo');
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
        ...talk,
        ...raffle,
        ...sponsor,
        newPlan: null,
        message: null,
        signerName: 'Grace Hopper',
        signerTitle: 'CTO',
        acceptedAt: '18th Nov 2026, 14:05',
        agreementVersion: '2026-11-18',
        agreementUrl: 'https://zurichjs.com/partners/agreement',
        payUrl: null,
        nextAttempt: null,
        problem: 'declined',
        kind: 'plan',
        timing: 'renewal',
        from: '18th February 2027',
        previous: 'Community Friend, CHF 840 a quarter',
        manual: false,
        reason: 'cancelled',
        needsLogo: true,
        amount: null,
        reference: null,
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

describe('sponsor emails', () => {
  it('invites a contact to their sponsorship page, with our words first and the benefits', () => {
    const e = renderEmail('sponsor-invite', { ...sponsor, message: 'As discussed on our call.' });
    expect(e.subject).toBe('Acme AG’s ZurichJS sponsorship is ready to confirm');
    expect(e.text).toMatch(/^Hi Grace\n/);
    expect(e.text.indexOf('As discussed on our call.')).toBeLessThan(e.text.indexOf('Community Builder: CHF 1’400'));
    expect(e.text).toContain('Community Builder: CHF 1’400 a quarter\nSponsor: Acme AG\n');
    expect(e.text).not.toContain('Payment:');
    expect(e.text).toContain('Community Builder includes:\n\n- Large logo on our site and partner list\n- 2 sponsor slides in rotation at meetups');
    expect(e.html).toContain('<li style=');
    const bundle = renderEmail('sponsor-invite', { ...sponsor, meetups: ['December, 9th December 2026', 'January, 13th January 2027'], message: null, contractOnFile: true });
    expect(bundle.text).toContain('Meetups: December, 9th December 2026; January, 13th January 2027');
    expect(bundle.text).toContain('Your signed contract is on file.');
  });

  it('keeps the line breaks in our own words', () => {
    const e = renderEmail('sponsor-invite', { ...sponsor, message: 'As discussed on our call.\nThe logo goes up next week.\n\nThanks!' });
    expect(e.html).toContain('>As discussed on our call.<br>The logo goes up next week.</p>');
    expect(e.html).toContain('>Thanks!</p>');
  });

  it('asks the sponsor to confirm a change we agreed, with a link that fills it in', () => {
    const e = renderEmail('sponsor-change-request', {
      ...sponsor,
      kind: 'plan',
      newPlan: { tierName: 'Community Friend', feeLabel: 'CHF 840 a quarter', applies: 'from 18th February 2027', benefits: ['Medium logo on our site and partner list'] },
      lastDay: null,
      message: null,
      url: 'https://zurichjs.com/partners/account?change=friend-quarterly',
    });
    expect(e.subject).toBe('Please confirm: Acme AG moves to Community Friend');
    expect(e.text).toContain('Review and confirm: https://zurichjs.com/partners/account?change=friend-quarterly');
    expect(e.text).toContain('Community Friend includes:\n\n- Medium logo on our site and partner list');
    expect(e.text).toContain('Nothing changes until someone at Acme AG confirms');
    const end = renderEmail('sponsor-change-request', {
      ...sponsor,
      kind: 'end',
      newPlan: null,
      lastDay: '17th February 2027',
      message: null,
      url: 'https://zurichjs.com/partners/account?change=end',
    });
    expect(end.text).toContain('Your benefits continue until 17th February 2027, and nothing more is charged.');
  });

  it('words payment problems, changes, endings and recorded payments plainly', () => {
    expect(renderEmail('sponsor-payment-problem', { ...sponsor, problem: 'confirm', payUrl: null, nextAttempt: null }).text).toMatch(/^Please confirm your payment/);
    expect(renderEmail('sponsor-payment-problem', { ...sponsor, problem: 'declined', payUrl: null, nextAttempt: null }).text).toContain(
      'Your sponsorship and its benefits continue',
    );
    expect(renderEmail('sponsor-change', { ...sponsor, timing: 'now', from: null, previous: 'x', manual: true }).text).toContain(
      'We will be in touch about the difference in fees.',
    );
    expect(renderEmail('sponsor-ended', { ...sponsor, meetups: ['ZurichJS Meetup, 9th December 2026'], reason: 'completed' }).text).toContain(
      'ZurichJS Meetup, 9th December 2026 is behind us',
    );
    expect(renderEmail('sponsor-ended', { ...sponsor, reason: 'completed' }).text).toContain('The Community Builder sponsorship for Acme AG is complete.');
    const ended = renderEmail('sponsor-ended', { ...sponsor, reason: 'terminated' });
    expect(ended.text).not.toMatch(/welcome back|Sponsor again/);
    expect(renderEmail('sponsor-payment-recorded', { ...sponsor, amount: 'CHF 840', paidThrough: '17th May 2027', reference: null }).text).toContain('Amount: CHF 840');
    expect(renderEmail('sponsor-welcome', { ...sponsor, term: null, nextPayment: null, needsLogo: false }).text).not.toMatch(/speakers|change your tier/);
  });
});
