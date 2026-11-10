/**
 * Member-facing emails. Each template takes typed props and returns blocks;
 * layout.ts renders them. Copy rules (AGENTS.md): plain, specific, no em dashes.
 * Later phases add their templates here (docs/v2/MEMBERSHIP.md, "Email").
 */
import { render, type Block, type EmailContent, type RenderedEmail } from './layout.ts';

export interface LoginLinkProps {
  /** The Supabase verification link (expires; see `validMinutes`). */
  url: string;
  /** How long the link works, from the Supabase project's email OTP expiry. */
  validMinutes: number;
  /** True for someone signing in for the first time (Supabase `signup`). */
  firstTime: boolean;
}

function loginLink(p: LoginLinkProps): EmailContent {
  const minutes = `${p.validMinutes} minute${p.validMinutes === 1 ? '' : 's'}`;
  return {
    subject: 'Your ZurichJS sign-in link',
    preheader: `Sign in to your ZurichJS member account. The link works for ${minutes}.`,
    heading: p.firstTime ? 'Welcome to your ZurichJS account' : 'Sign in to ZurichJS',
    blocks: [
      {
        kind: 'p',
        text: p.firstTime
          ? 'You asked to sign in to the ZurichJS member area. Use the button to confirm your email and sign in.'
          : 'Use the button to sign in to the ZurichJS member area.',
      },
      { kind: 'button', label: 'Sign in', url: p.url },
      { kind: 'small', text: `The link works once, for ${minutes}, on the device where you open it.` },
      { kind: 'url', text: 'If the button does not work, copy this link into your browser:', url: p.url },
      { kind: 'small', text: 'Did not ask for this? Ignore this email. Nobody can sign in without the link.' },
    ],
  };
}

/** What every application email repeats, as the person chose it on the site. */
export interface ApplicationProps {
  /** The person's name, or the signatory's for an organisation. */
  name: string;
  organisationName: string | null;
  /** "Supporter" */
  levelName: string;
  /** "Yearly" */
  cycleLabel: string;
  /** "CHF 250 a year", from apps/web/src/lib/membership.ts (the same table as the page). */
  feeLabel: string;
  /** https://zurichjs.com/membership/account (or the preview's). */
  accountUrl: string;
}

const summary = (p: ApplicationProps): Block => ({
  kind: 'summary',
  rows: [
    ...(p.organisationName ? ([['Organisation', p.organisationName]] as [string, string][]) : []),
    ['Membership', p.levelName],
    ['Billing', p.cycleLabel],
    ['Fee', p.feeLabel],
  ],
});

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

function applicationReceived(p: ApplicationProps): EmailContent {
  return {
    subject: 'We received your ZurichJS membership request',
    preheader: 'An organiser looks at it soon. Nothing has been charged.',
    heading: `Thanks, ${firstName(p.name)}`,
    blocks: [
      { kind: 'p', text: 'You asked to join the Swiss JavaScript Group, the association behind ZurichJS. An organiser looks at your request soon and you hear from us by email.' },
      summary(p),
      { kind: 'p', text: 'Nothing has been charged. If we approve it, you set up payment on your account page; your membership starts with the first payment.' },
      { kind: 'button', label: 'See your request', url: p.accountUrl },
    ],
  };
}

function applicationApproved(p: ApplicationProps): EmailContent {
  return {
    subject: 'Your ZurichJS membership is approved',
    preheader: 'Set up payment on your account page to start your membership.',
    heading: `Welcome, ${firstName(p.name)}`,
    blocks: [
      { kind: 'success', text: 'Your membership request is approved.' },
      summary(p),
      {
        kind: 'p',
        text: 'Next, set up payment on your account page. Your membership starts with the first payment, under the membership terms you accepted and the association’s bylaws. Nothing has been charged yet.',
      },
      { kind: 'button', label: 'Set up payment', url: p.accountUrl },
    ],
  };
}

function applicationDeclined(p: ApplicationProps): EmailContent {
  return {
    subject: 'Your ZurichJS membership request',
    preheader: 'About your request to join the Swiss JavaScript Group.',
    heading: `Hi ${firstName(p.name)}`,
    blocks: [
      { kind: 'p', text: 'Thank you for asking to join the Swiss JavaScript Group. This time we did not approve the membership request, and nothing has been charged.' },
      { kind: 'p', text: 'Every ZurichJS meetup stays free and open to everyone, member or not. If you have a question about this, reply to this email.' },
      { kind: 'button', label: 'See upcoming meetups', url: new URL('/events', p.accountUrl).toString() },
    ],
  };
}

const TEMPLATES = {
  'login-link': loginLink,
  'application-received': applicationReceived,
  'application-approved': applicationApproved,
  'application-declined': applicationDeclined,
} satisfies Record<string, (p: never) => EmailContent>;

export type TemplateName = keyof typeof TEMPLATES;
export type TemplateProps<N extends TemplateName> = Parameters<(typeof TEMPLATES)[N]>[0];

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function renderEmail<N extends TemplateName>(name: N, props: TemplateProps<N>): RenderedEmail {
  return render((TEMPLATES[name] as (p: TemplateProps<N>) => EmailContent)(props));
}
