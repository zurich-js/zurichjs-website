/**
 * Writes every template, with sample props, to a folder for a look in the browser:
 *   pnpm --filter @zurichjs/emails preview [out-dir]
 * Opens nothing and sends nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderEmail, type TemplateName, type TemplateProps } from '../src/index.ts';

const base = {
  name: 'Ada Lovelace',
  organisationName: null,
  levelName: 'Supporter',
  cycleLabel: 'Yearly',
  feeLabel: 'CHF 250 a year',
  price: 'CHF 250',
  per: 'a year',
  accountUrl: 'https://zurichjs.com/membership/account',
};
const term = { ...base, term: '10th November 2026 to 9th November 2027', certificateNumber: 'ZJS-2026-0001', nextPayment: '10th November 2027' };

const sponsor = {
  companyName: 'Acme AG',
  contactName: 'Grace Hopper',
  tierName: 'Community Builder',
  cycleLabel: 'Quarterly',
  feeLabel: 'CHF 1’400 a quarter',
  price: 'CHF 1’400',
  per: 'a quarter',
  paymentLabel: 'By invoice (due in 30 days)',
  meetup: null,
  accountUrl: 'https://zurichjs.com/partners/account',
  benefits: [
    'Large logo on our site and partner list',
    '2 sponsor slides in rotation at meetups',
    'Social media mentions and shoutouts',
    'Name-drop and recognition at events',
    'Access to post job opportunities',
    'Swag distribution at events',
  ],
};
const once = {
  ...sponsor,
  cycleLabel: 'One meetup',
  feeLabel: 'CHF 700 for one meetup',
  price: 'CHF 700',
  per: 'for one meetup',
  paymentLabel: 'By card',
  meetup: 'ZurichJS Meetup, 9th December 2026',
};

const SAMPLES: { [N in TemplateName]: TemplateProps<N>[] } = {
  'membership-welcome': [term, { ...term, name: 'Grace Hopper', organisationName: 'Acme AG' }],
  'membership-renewed': [{ ...term, term: '10th November 2027 to 9th November 2028', certificateNumber: 'ZJS-2027-0042', nextPayment: '10th November 2028' }],
  'membership-ported': [{ ...term, term: '1st September 2026 to 31st August 2027', certificateNumber: 'ZJS-2026-0007', nextPayment: '1st September 2027' }],
  'membership-invite': [
    { ...base, accountUrl: 'https://zurichjs.com/membership/account?level=supporter&cycle=yearly' },
    {
      ...base,
      name: 'Grace Hopper',
      organisationName: 'Acme AG',
      levelName: 'Basic Member',
      cycleLabel: 'Quarterly',
      feeLabel: 'CHF 50 a quarter',
      price: 'CHF 50',
      per: 'a quarter',
    },
  ],
  'automatic-payment-set-up': [{ ...base, paidThrough: '30th September 2027', firstPayment: '1st October 2027' }],
  'payment-failed': [base],
  'resignation-received': [
    { ...base, openDues: false },
    { ...base, openDues: true },
  ],
  'resignation-withdrawn': [base],
  'resignation-confirmed': [{ ...base, lastDay: '9th November 2027' }],
  'board-notice': [
    {
      subject: 'Resignation from Ada Lovelace',
      heading: 'Ada Lovelace resigned',
      intro: ['Ada Lovelace resigned on their account page (bylaws Art. 5). The request is with the board.'],
      rows: [
        ['Name', 'Ada Lovelace'],
        ['Membership', 'Supporter, yearly'],
        ['Reason', 'Moving away from Zurich'],
      ],
      message: { label: 'In their words', text: 'Thanks for everything!' },
      button: { label: 'Confirm in the admin area', url: 'https://zurichjs.com/admin/memberships' },
      note: 'You can also confirm with the button in Slack.',
      replyTo: 'Ada Lovelace',
    },
  ],
  'talk-scheduled': [
    {
      speakerName: 'Ada Lovelace',
      talkTitle: 'Signals in practice',
      eventTitle: 'Forms, types and design systems',
      date: 'Wed 18th Nov 2026',
      time: 'Starts 18:30 CET',
      venue: 'Venue AG, Hardstrasse 201, 8005 Zürich',
      eventUrl: 'https://zurichjs.com/events/zurichjs-meetup-november-2026',
      profileUrl: 'https://zurichjs.com/speakers/profile?token=sample-token',
    },
    // Not everything in Sanity yet, and no profile link.
    {
      speakerName: 'Grace Hopper',
      talkTitle: 'Compilers for everyone',
      eventTitle: 'ZurichJS January 2027',
      date: null,
      time: null,
      venue: null,
      eventUrl: 'https://zurichjs.com/events/zurichjs-meetup-january-2027',
      profileUrl: null,
    },
  ],
  'sponsor-invite': [
    { ...sponsor, message: 'Great talking to you at the conference. Here is the Builder package we discussed.' },
    { ...once, message: null },
    { ...sponsor, paymentLabel: 'Paid directly to the association', message: null, existingPaidThrough: '31st March 2027' },
  ],
  'sponsor-agreement': [
    {
      ...sponsor,
      signerName: 'Grace Hopper',
      signerTitle: 'Head of Developer Relations',
      acceptedAt: '18th Nov 2026, 14:05',
      agreementVersion: '2026-11-18',
      agreementUrl: 'https://zurichjs.com/partners/agreement',
      invoiceUrl: 'https://invoice.stripe.com/i/sample',
    },
  ],
  'sponsor-welcome': [
    { ...sponsor, term: '18th November 2026 to 17th February 2027', nextPayment: '18th February 2027', needsLogo: true },
    { ...once, term: 'ZurichJS Meetup, 9th December 2026', nextPayment: null, needsLogo: false },
  ],
  'sponsor-payment-problem': [
    { ...sponsor, problem: 'overdue', payUrl: 'https://invoice.stripe.com/i/sample', nextAttempt: null },
    { ...sponsor, paymentLabel: 'By card', problem: 'declined', payUrl: 'https://invoice.stripe.com/i/sample', nextAttempt: '21st November 2026' },
  ],
  'sponsor-proposal': [
    {
      ...sponsor,
      kind: 'plan',
      newPlan: {
        tierName: 'Community Champion',
        feeLabel: 'CHF 2’100 a quarter',
        applies: 'now (only the difference is charged for this term)',
        benefits: ['XL logo on our site and partner list', 'Branded photos of the event', 'Sponsor slides or video at each meetup', 'Personal shoutout and introduction at events'],
      },
      lastDay: null,
      message: 'As agreed on our call, moving you up for the conference season.',
      expires: '2nd December 2026',
    },
    { ...sponsor, kind: 'end', newPlan: null, lastDay: '17th February 2027', message: null, expires: '2nd December 2026' },
  ],
  'sponsor-change': [
    { ...sponsor, timing: 'renewal', from: '18th February 2027', previous: 'Community Champion, CHF 2’100 a quarter' },
    { ...sponsor, timing: 'now', from: null, previous: 'Community Friend, CHF 840 a quarter' },
  ],
  'sponsor-ending': [{ ...sponsor, lastDay: '17th February 2027' }],
  'sponsor-resumed': [sponsor],
  'sponsor-ended': [
    { ...sponsor, reason: 'cancelled' },
    { ...once, reason: 'completed' },
  ],
  'sponsor-logo': [
    { ...sponsor, approved: true, note: null },
    { ...sponsor, approved: false, note: 'The PNG is too small for the slides. Could you send an SVG?' },
  ],
  'login-link': [{ url: 'https://zurichjs.com/api/auth/magic-link/verify?token=sample-token&callbackURL=%2Fmembership%2Faccount', validMinutes: 15, firstTime: false }],
};

const out = resolve(process.argv[2] ?? 'email-previews');
mkdirSync(out, { recursive: true });
for (const [name, samples] of Object.entries(SAMPLES) as [TemplateName, TemplateProps<TemplateName>[]][]) {
  samples.forEach((props, i) => {
    const e = renderEmail(name, props);
    writeFileSync(join(out, `${name}-${i + 1}.html`), e.html);
    writeFileSync(join(out, `${name}-${i + 1}.txt`), `Subject: ${e.subject}\n\n${e.text}`);
  });
}
console.log(`Wrote previews to ${out}`);
