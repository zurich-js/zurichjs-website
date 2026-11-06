/**
 * Writes every template, with sample props, to a folder for a look in the browser:
 *   pnpm --filter @zurichjs/emails preview [out-dir]
 * Opens nothing and sends nothing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderEmail, type TemplateName, type TemplateProps } from '../src/index.ts';

const application = {
  name: 'Ada Lovelace',
  organisationName: null,
  levelName: 'Supporter',
  cycleLabel: 'Yearly',
  feeLabel: 'CHF 250 a year',
  accountUrl: 'https://zurichjs.com/membership/account',
};

const SAMPLES: { [N in TemplateName]: TemplateProps<N>[] } = {
  'application-received': [application, { ...application, name: 'Grace Hopper', organisationName: 'Acme AG' }],
  'application-approved': [application],
  'application-declined': [application],
  'login-link': [
    {
      url: 'https://example.supabase.co/auth/v1/verify?token=sampletoken=pkce_sample&type=magiclinktype=magiclink&redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount',
      validMinutes: 60,
      firstTime: false,
    },
    { url: 'https://example.supabase.co/auth/v1/verify?token=sample&type=signup&redirect_to=https%3A%2F%2Fzurichjs.com%2Fmembership%2Faccount', validMinutes: 60, firstTime: true },
  ],
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
