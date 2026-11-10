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

const SAMPLES: { [N in TemplateName]: TemplateProps<N>[] } = {
  'membership-welcome': [term, { ...term, name: 'Grace Hopper', organisationName: 'Acme AG' }],
  'membership-renewed': [{ ...term, term: '10th November 2027 to 9th November 2028', certificateNumber: 'ZJS-2027-0042', nextPayment: '10th November 2028' }],
  'payment-failed': [base],
  'resignation-received': [
    { ...base, openDues: false },
    { ...base, openDues: true },
  ],
  'resignation-withdrawn': [base],
  'resignation-confirmed': [{ ...base, lastDay: '9th November 2027' }],
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
