/**
 * Member-facing emails. Each template takes typed props and returns blocks;
 * layout.ts renders them. Copy rules (AGENTS.md): plain, specific, no em dashes.
 * Later phases add their templates here (docs/v2/MEMBERSHIP.md, "Email").
 */
import { render, type Block, type EmailContent, type RenderedEmail } from './layout.ts';

export interface LoginLinkProps {
  /** The Better Auth sign-in link (expires; see `validMinutes`). */
  url: string;
  /** How long the link works (LINK_SECONDS in apps/web/src/server/auth.ts). */
  validMinutes: number;
  /** True for someone signing in for the first time. */
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

/** What every membership email repeats. */
export interface MembershipProps {
  /** The person's name, or the signatory's for an organisation. */
  name: string;
  organisationName: string | null;
  /** "Supporter" */
  levelName: string;
  /** "Yearly" */
  cycleLabel: string;
  /** "CHF 250 a year", from apps/web/src/lib/membership.ts (the same table as the page). */
  feeLabel: string;
  /** The same fee in two parts, for the plan card: "CHF 250" and "a year". */
  price: string;
  per: string;
  /** https://zurichjs.com/membership/account (or the preview's). */
  accountUrl: string;
}

export interface TermProps extends MembershipProps {
  /** "10th November 2026 to 9th November 2027" */
  term: string;
  /** "ZJS-2026-0001" (the certificate is attached). */
  certificateNumber: string;
  /** "10th November 2027": when the next payment is taken automatically (the end of the term). */
  nextPayment: string;
}

const summary = (p: MembershipProps, extra: [string, string][] = []): Block => ({
  kind: 'summary',
  rows: [
    ...(p.organisationName ? ([['Organisation', p.organisationName]] as [string, string][]) : []),
    ['Membership', p.levelName],
    ['Billing', `${p.cycleLabel}, ${p.feeLabel}`],
    ...extra,
  ],
});

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** The plan card of the welcome and renewal emails: level, price, billing, the term and the next payment. */
function planCard(p: TermProps, termLabel: string): Block {
  const cycle = p.cycleLabel === 'Quarterly' ? 'Every 3 months' : p.cycleLabel === 'Yearly' ? 'Once a year' : p.cycleLabel;
  return {
    kind: 'plan',
    title: p.levelName,
    price: p.price,
    per: p.per,
    rows: [
      ...(p.organisationName ? ([['Organisation', p.organisationName]] as [string, string][]) : []),
      ['Billed', `${cycle}, automatically`],
      [termLabel, p.term],
      ['Next payment', p.nextPayment],
    ],
  };
}

function membershipWelcome(p: TermProps): EmailContent {
  return {
    subject: 'Welcome to the Swiss JavaScript Group',
    preheader: `Your ${p.levelName} membership is active. Your certificate ${p.certificateNumber} is attached.`,
    heading: `Welcome, ${firstName(p.name)}`,
    blocks: [
      { kind: 'badge', text: 'Your membership is active' },
      { kind: 'p', text: 'Thank you for supporting ZurichJS. Here is your membership at a glance.' },
      planCard(p, 'Current term'),
      { kind: 'button', label: 'Manage subscription', url: p.accountUrl },
      {
        kind: 'small',
        text: `Your certificate of membership (${p.certificateNumber}) is attached. You get a new one with every payment, and all of them are on your account page.`,
      },
      {
        kind: 'small',
        text: 'On your account page you can change your payment method or switch between quarterly and yearly. To leave, resign there: the board confirms it and your membership ends with the paid period.',
      },
    ],
  };
}

function membershipRenewed(p: TermProps): EmailContent {
  return {
    subject: 'Your ZurichJS membership is renewed',
    preheader: `Thank you. Your certificate ${p.certificateNumber} for the new term is attached.`,
    heading: `Thank you, ${firstName(p.name)}`,
    blocks: [
      { kind: 'p', text: 'Your membership payment went through and your membership continues.' },
      planCard(p, 'New term'),
      { kind: 'p', text: `Your certificate of membership for this term (${p.certificateNumber}) is attached.` },
      { kind: 'button', label: 'Open your membership', url: p.accountUrl },
    ],
  };
}

export interface PaymentFailedProps extends MembershipProps {
  /** Stripe's page for this invoice, where the member can pay it or confirm the payment with their bank. */
  payUrl?: string | null;
  /** The bank asks the member to confirm the payment (3D Secure), rather than declining it. */
  needsConfirmation?: boolean;
  /** "14th November 2026": when Stripe tries again, if it does. */
  nextAttempt?: string | null;
}

function paymentFailed(p: PaymentFailedProps): EmailContent {
  const retry = p.nextAttempt ? `Stripe tries again on ${p.nextAttempt}.` : 'Stripe tries again over the next days.';
  return {
    subject: p.needsConfirmation ? 'Please confirm your ZurichJS membership payment' : 'Your ZurichJS membership payment did not go through',
    preheader: p.needsConfirmation ? 'Your bank asks you to confirm the payment.' : 'Update your payment method to keep your membership.',
    heading: `Hi ${firstName(p.name)}`,
    blocks: [
      p.needsConfirmation
        ? { kind: 'p', text: 'Your bank asks you to confirm your membership payment before it goes through.' }
        : { kind: 'error', text: 'Your last membership payment did not go through.' },
      summary(p),
      p.needsConfirmation
        ? { kind: 'p', text: 'Open the payment page and confirm it with your bank. It takes a minute.' }
        : { kind: 'p', text: `${retry} To keep your membership, pay the open invoice now or update your payment method on your account page.` },
      ...((p.payUrl
        ? [
            { kind: 'button', label: p.needsConfirmation ? 'Confirm the payment' : 'Pay the open invoice', url: p.payUrl },
            { kind: 'url', text: 'To change your card, open your account page:', url: p.accountUrl },
          ]
        : [{ kind: 'button', label: 'Update payment method', url: p.accountUrl }]) satisfies Block[]),
    ],
  };
}

export interface ResignationProps extends MembershipProps {
  /** Dues still open (bylaws Art. 5: the resignation waits until they are paid). */
  openDues: boolean;
}

function resignationReceived(p: ResignationProps): EmailContent {
  return {
    subject: 'We received your resignation',
    preheader: 'A copy for your records. Your request is with the board.',
    heading: `Hi ${firstName(p.name)}`,
    blocks: [
      { kind: 'p', text: 'You resigned from the Swiss JavaScript Group on your account page. This email is your written copy (bylaws Art. 5).' },
      summary(p),
      { kind: 'p', text: 'Your request is with the board, and they typically get back to you within 72 hours.' },
      p.openDues
        ? { kind: 'error', text: 'A membership payment is still open. Under the bylaws the resignation takes effect once it is paid.' }
        : { kind: 'p', text: 'You stay a member until the end of the period you already paid for. After that, you will not be charged again.' },
      { kind: 'button', label: 'Open your membership', url: p.accountUrl },
      { kind: 'small', text: 'Changed your mind? You can undo your resignation on your account page until your membership ends.' },
    ],
  };
}

function resignationWithdrawn(p: MembershipProps): EmailContent {
  return {
    subject: 'Your resignation is undone',
    preheader: 'Your membership continues as before.',
    heading: `Welcome back, ${firstName(p.name)}`,
    blocks: [
      { kind: 'badge', text: 'Your membership continues' },
      { kind: 'p', text: 'Your resignation is undone, and your membership continues as before. Nothing else changes.' },
      summary(p),
      { kind: 'button', label: 'Manage subscription', url: p.accountUrl },
      { kind: 'small', text: 'Did not do this? Reply to this email and the board will look into it.' },
    ],
  };
}

export interface ResignationConfirmedProps extends MembershipProps {
  /** "9th November 2027": the last day of the paid period. */
  lastDay: string | null;
}

function resignationConfirmed(p: ResignationConfirmedProps): EmailContent {
  return {
    subject: 'Your resignation is confirmed',
    preheader: p.lastDay ? `Your membership ends on ${p.lastDay}.` : 'Your membership has ended.',
    heading: `Goodbye for now, ${firstName(p.name)}`,
    blocks: [
      {
        kind: 'p',
        text: p.lastDay
          ? `The board confirmed your resignation. Your membership ends on ${p.lastDay}, and nothing more is charged.`
          : 'The board confirmed your resignation, and nothing more is charged.',
      },
      { kind: 'p', text: 'Thank you for supporting ZurichJS. Every meetup stays free and open to everyone, so we hope to see you at the next one.' },
      { kind: 'button', label: 'See upcoming meetups', url: new URL('/events', p.accountUrl).toString() },
    ],
  };
}

const TEMPLATES = {
  'login-link': loginLink,
  'membership-welcome': membershipWelcome,
  'membership-renewed': membershipRenewed,
  'payment-failed': paymentFailed,
  'resignation-received': resignationReceived,
  'resignation-confirmed': resignationConfirmed,
  'resignation-withdrawn': resignationWithdrawn,
} satisfies Record<string, (p: never) => EmailContent>;

export type TemplateName = keyof typeof TEMPLATES;
export type TemplateProps<N extends TemplateName> = Parameters<(typeof TEMPLATES)[N]>[0];

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as TemplateName[];

export function renderEmail<N extends TemplateName>(name: N, props: TemplateProps<N>): RenderedEmail {
  return render((TEMPLATES[name] as (p: TemplateProps<N>) => EmailContent)(props));
}
