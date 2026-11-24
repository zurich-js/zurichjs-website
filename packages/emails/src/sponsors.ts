/**
 * Sponsor-facing emails (docs/domains/sponsorship/overview.md, "Emails and Slack"). Same layout and copy rules as
 * the membership emails: plain, specific, no em dashes. Glossary: "your sponsorship page",
 * "we" (ZurichJS, never "the board"), "how often you pay", "payment overdue". Stripe sends the
 * card receipts itself; these emails cover everything around them.
 */
import type { Block, EmailContent } from './layout.ts';

/** What every sponsor email repeats. */
export interface SponsorProps {
  companyName: string;
  /** The contact the email goes to. */
  contactName: string;
  /** "Community Builder" */
  tierName: string;
  /** "Quarterly", "One-time" */
  cycleLabel: string;
  /** "CHF 1’400 a quarter", "CHF 1’500 for 3 meetups (CHF 500 each)" */
  feeLabel: string;
  /** "CHF 1’400" and "a quarter", for the plan card. */
  price: string;
  per: string;
  /** "By card", "By bank transfer to ZurichJS" */
  paymentLabel: string;
  /** One-time sponsorships: "ZurichJS Meetup, 9th December 2026", one per meetup. */
  meetups: string[];
  /** https://zurichjs.com/partners/account (or the preview's). */
  accountUrl: string;
  /** The tier's benefits, as /partners lists them. */
  benefits: string[];
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

const rowsOf = (p: SponsorProps, opts: { payment?: boolean } = {}): [string, string][] => [
  ['Sponsor', p.companyName],
  ...(p.meetups.length ? ([[p.meetups.length === 1 ? 'Meetup' : 'Meetups', p.meetups.join('; ')]] as [string, string][]) : []),
  ...(opts.payment === false ? [] : ([['Payment', p.paymentLabel]] as [string, string][])),
];

const plan = (p: SponsorProps, rows: [string, string][] = [], opts: { payment?: boolean } = {}): Block => ({
  kind: 'plan',
  title: p.tierName,
  price: p.price,
  per: p.per,
  rows: [...rowsOf(p, opts), ...rows],
});

/** "Community Builder includes:" and the list, or nothing when there are no benefits. */
const benefits = (tierName: string, items: string[], intro = `${tierName} includes:`): Block[] =>
  items.length
    ? [
        { kind: 'p', text: intro },
        { kind: 'list', items },
      ]
    : [];

const say = (text: string | null | undefined): Block[] => (text ? [{ kind: 'p', text }] : []);

export interface SponsorInviteProps extends SponsorProps {
  /** Our own words, if any. */
  message: string | null;
  /** An existing sponsorship brought onto the site: paid through this day ("31st March 2027"). */
  existingPaidThrough?: string | null;
  /** A contract signed outside the site is on file: no online signature is needed. */
  contractOnFile?: boolean;
}

function sponsorInvite(p: SponsorInviteProps): EmailContent {
  if (p.existingPaidThrough)
    return {
      subject: 'Your ZurichJS sponsorship is now online',
      preheader: `Your ${p.tierName} sponsorship for ${p.companyName} has its own page on zurichjs.com. Nothing changes for the period you paid.`,
      heading: `Hi ${firstName(p.contactName)}`,
      blocks: [
        { kind: 'p', text: 'Thank you for sponsoring ZurichJS. Your sponsorship now has its own page on zurichjs.com, so you can manage it yourself.' },
        ...say(p.message),
        plan(p, [['Paid through', p.existingPaidThrough]]),
        ...benefits(p.tierName, p.benefits),
        {
          kind: 'p',
          text: 'Sign in with this email address to check your billing details, upload your logo and add colleagues. When your paid period ends you can keep paying us by bank transfer, or add a card there; nothing is charged before then.',
        },
        { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
      ],
    };
  return {
    subject: `${p.companyName}’s ZurichJS sponsorship is ready to confirm`,
    preheader: `Check the ${p.tierName} sponsorship we set up for ${p.companyName}${p.contractOnFile ? ' and pay by card.' : ', sign the agreement and pay by card.'}`,
    heading: `Hi ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'p', text: `Thank you for supporting ZurichJS. Here is the sponsorship we talked about for ${p.companyName}.` },
      ...say(p.message),
      plan(p, [], { payment: false }),
      ...benefits(p.tierName, p.benefits),
      {
        kind: 'p',
        text: p.contractOnFile
          ? 'Your signed contract is on file. Sign in with this email address to add your billing details and logo, and pay by card.'
          : 'Sign in with this email address to check it, sign the sponsorship agreement, add your billing details and logo, and pay by card.',
      },
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
      { kind: 'small', text: 'Nothing is charged until you pay on that page. Colleagues can be added there too.' },
    ],
  };
}

export interface SponsorAgreementProps extends SponsorProps {
  signerName: string;
  signerTitle: string;
  /** "18th November 2026, 14:05 (Zurich time)" */
  acceptedAt: string;
  /** "18th November 2026" */
  agreementVersion: string;
  agreementUrl: string;
}

/** A copy of what was signed, and what happens next. */
function sponsorAgreement(p: SponsorAgreementProps): EmailContent {
  return {
    subject: `Your copy: ZurichJS sponsorship agreement for ${p.companyName}`,
    preheader: `${p.signerName} signed the ZurichJS sponsorship agreement for ${p.companyName}.`,
    heading: 'Agreement signed',
    blocks: [
      { kind: 'p', text: `This is your copy for the record. ${p.signerName} (${p.signerTitle}) signed the ZurichJS sponsorship agreement for ${p.companyName}.` },
      plan(p, [
        ['Signed', p.acceptedAt],
        ['Agreement', `Version of ${p.agreementVersion}`],
      ]),
      { kind: 'p', text: 'The sponsorship starts with your card payment, and Stripe sends you a receipt.' },
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
      { kind: 'url', text: 'The agreement you signed:', url: p.agreementUrl },
    ],
  };
}

export interface SponsorWelcomeProps extends SponsorProps {
  /** "18th November 2026 to 17th February 2027"; null for one-time sponsorships (the meetups say it). */
  term: string | null;
  /** "18th February 2027", or null for one-time sponsorships. */
  nextPayment: string | null;
  /** Whether a logo is still missing. */
  needsLogo: boolean;
}

function sponsorWelcome(p: SponsorWelcomeProps): EmailContent {
  const recurring = !!p.nextPayment;
  return {
    subject: `Welcome, ${p.companyName}: your ZurichJS sponsorship is active`,
    preheader: `Your ${p.tierName} sponsorship is active. Thank you for supporting the Zurich JavaScript community.`,
    heading: `Thank you, ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'badge', text: 'Your sponsorship is active' },
      { kind: 'p', text: `${p.companyName} now supports ZurichJS as a ${p.tierName}. Your support helps keep our meetups free.` },
      plan(p, [...(p.term ? ([['Current term', p.term]] as [string, string][]) : []), ...(p.nextPayment ? ([['Next payment', p.nextPayment]] as [string, string][]) : [])]),
      ...benefits(p.tierName, p.benefits, `As a ${p.tierName}, you get:`),
      { kind: 'p', text: 'To plan your sponsor slides, swag or job posts, reply to this email.' },
      ...say(p.needsLogo ? 'One thing we still need: your logo (SVG preferred, or a PNG at least 1000 pixels wide), for the site and the sponsor slides.' : null),
      { kind: 'button', label: p.needsLogo ? 'Upload your logo' : 'Open your sponsorship page', url: p.accountUrl },
      {
        kind: 'small',
        text: recurring
          ? 'On your sponsorship page you can change your tier or how often you pay, update your card, see receipts and add colleagues.'
          : 'On your sponsorship page you can see your receipt, update your logo and add colleagues.',
      },
    ],
  };
}

export interface SponsorPaymentProblemProps extends SponsorProps {
  /** Stripe's page for the payment. */
  payUrl: string | null;
  problem: 'declined' | 'confirm';
  /** "21st November 2026", when Stripe tries again. */
  nextAttempt: string | null;
}

function sponsorPaymentProblem(p: SponsorPaymentProblemProps): EmailContent {
  const confirm = p.problem === 'confirm';
  return {
    subject: confirm ? 'Please confirm your ZurichJS sponsorship payment' : 'Action needed: your ZurichJS sponsorship payment did not go through',
    preheader: confirm ? 'Your bank wants you to confirm the latest payment for your sponsorship.' : 'The latest card payment for your sponsorship was declined.',
    heading: confirm ? 'Please confirm your payment' : 'Your payment did not go through',
    blocks: [
      { kind: 'error', text: confirm ? 'Your bank wants you to confirm the latest payment for your sponsorship.' : 'The latest card payment for your sponsorship was declined.' },
      { kind: 'p', text: 'Your sponsorship and its benefits continue while you sort this out.' },
      plan(p),
      ...(p.payUrl ? ([{ kind: 'button', label: confirm ? 'Confirm the payment' : 'Pay now', url: p.payUrl }] satisfies Block[]) : []),
      ...(p.nextAttempt && !confirm ? ([{ kind: 'small', text: `Stripe tries the card again on ${p.nextAttempt}.` }] satisfies Block[]) : []),
      {
        kind: 'small',
        text: 'To use another card, open your sponsorship page and choose "Card and receipts". Already sorted? Then you can ignore this email. Questions? Reply to this email.',
      },
    ],
  };
}

export interface SponsorChangeRequestProps extends SponsorProps {
  kind: 'plan' | 'end';
  /** For a plan change: the new tier, fee, when it applies and what it includes. */
  newPlan: { tierName: string; feeLabel: string; applies: string; benefits: string[] } | null;
  /** For an end: the last day. */
  lastDay: string | null;
  message: string | null;
  /** The sponsorship page with the change filled in. */
  url: string;
}

/** We agreed a change in conversation; the sponsor confirms it on their page (owner, 18th November 2026). */
function sponsorChangeRequest(p: SponsorChangeRequestProps): EmailContent {
  const plan = p.kind === 'plan' && p.newPlan;
  return {
    subject: plan ? `Please confirm: ${p.companyName} moves to ${p.newPlan!.tierName}` : `Please confirm: ending ${p.companyName}’s ZurichJS sponsorship`,
    preheader: plan
      ? `Moving ${p.companyName} to ${p.newPlan!.tierName}, ${p.newPlan!.feeLabel}. Nothing changes until you confirm.`
      : `Ending the ${p.tierName} sponsorship${p.lastDay ? ` after ${p.lastDay}` : ''}. Nothing changes until you confirm.`,
    heading: `Hi ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'p', text: 'As we discussed, here is the change for you to confirm.' },
      ...say(p.message),
      {
        kind: 'summary',
        rows: [
          ['Now', `${p.tierName}, ${p.feeLabel}`],
          ...(plan
            ? ([
                ['New', `${p.newPlan!.tierName}, ${p.newPlan!.feeLabel}`],
                ['Applies', p.newPlan!.applies],
              ] as [string, string][])
            : ([['Change', 'End the sponsorship']] as [string, string][])),
          ...(p.kind === 'end' && p.lastDay ? ([['Last day', p.lastDay]] as [string, string][]) : []),
        ],
      },
      ...(plan ? benefits(p.newPlan!.tierName, p.newPlan!.benefits) : say(p.lastDay ? `Your benefits continue until ${p.lastDay}, and nothing more is charged.` : null)),
      { kind: 'button', label: 'Review and confirm', url: p.url },
      { kind: 'small', text: `Nothing changes until someone at ${p.companyName} confirms on your sponsorship page. If this is not what we agreed, reply to this email.` },
    ],
  };
}

export interface SponsorChangeProps extends SponsorProps {
  /** `now`: applied now; `renewal`: applies from `from`; `applied`: a scheduled change took effect. */
  timing: 'now' | 'renewal' | 'applied';
  /** "18th February 2027" for a change at renewal. */
  from: string | null;
  /** "Community Friend, CHF 840 a quarter": the plan before. */
  previous: string;
  /** Paid outside Stripe: we settle the difference ourselves. */
  manual: boolean;
  /** "Community Friend, yearly": a change that was waiting for the renewal and no longer applies. */
  droppedChange?: string | null;
}

function sponsorChange(p: SponsorChangeProps): EmailContent {
  const line =
    p.timing === 'renewal'
      ? `Your sponsorship changes to ${p.tierName}, ${p.feeLabel}, from ${p.from ?? 'your next renewal'}. Until then it stays ${p.previous}, and nothing is charged now.`
      : p.timing === 'applied'
        ? `As agreed, your sponsorship is ${p.tierName} from today.`
        : p.manual
          ? `Your sponsorship is now ${p.tierName}. We will be in touch about the difference in fees.`
          : `Your sponsorship is now ${p.tierName}. Stripe charges your card only the difference for the rest of this term.`;
  return {
    subject: p.timing === 'renewal' ? `Your ZurichJS sponsorship moves to ${p.tierName} on ${p.from ?? 'your next renewal'}` : `Your ZurichJS sponsorship is now ${p.tierName}`,
    preheader: line,
    heading: p.timing === 'renewal' ? 'Change scheduled' : 'Sponsorship updated',
    blocks: [
      { kind: 'success', text: line },
      ...say(p.droppedChange ? `The change to ${p.droppedChange} that was waiting for your renewal no longer applies.` : null),
      plan(p, [['Before', p.previous]]),
      ...benefits(p.tierName, p.benefits, p.timing === 'renewal' ? `From ${p.from ?? 'your next renewal'}, ${p.tierName} includes:` : `${p.tierName} includes:`),
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
    ],
  };
}

export interface SponsorEndingProps extends SponsorProps {
  /** "17th February 2027": the last day of the sponsorship. */
  lastDay: string;
  /** A change that was waiting for the renewal and no longer applies ("Community Friend, CHF 840 a quarter"). */
  droppedChange?: string | null;
}

function sponsorEnding(p: SponsorEndingProps): EmailContent {
  return {
    subject: `Your ZurichJS sponsorship ends on ${p.lastDay}`,
    preheader: `The ${p.tierName} sponsorship for ${p.companyName} runs until ${p.lastDay}. Nothing more is charged.`,
    heading: 'Thank you for your support',
    blocks: [
      {
        kind: 'p',
        text: `As agreed, the ${p.tierName} sponsorship for ${p.companyName} ends with the paid period. Your logo and benefits continue until ${p.lastDay}, and nothing more is charged.`,
      },
      plan(p, [['Last day', p.lastDay]]),
      ...say(p.droppedChange ? `The change to ${p.droppedChange} that was waiting for your renewal no longer applies.` : null),
      { kind: 'p', text: 'Changed your mind? You can keep the sponsorship going on your sponsorship page until then.' },
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
    ],
  };
}

function sponsorResumed(p: SponsorProps): EmailContent {
  return {
    subject: 'Your ZurichJS sponsorship continues',
    preheader: `The ${p.tierName} sponsorship for ${p.companyName} continues and renews as before.`,
    heading: 'Great to keep you on board',
    blocks: [
      { kind: 'success', text: `The ${p.tierName} sponsorship for ${p.companyName} continues and renews as before.` },
      plan(p),
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
    ],
  };
}

export interface SponsorEndedProps extends SponsorProps {
  reason: 'cancelled' | 'completed' | 'lapsed' | 'terminated';
}

function sponsorEnded(p: SponsorEndedProps): EmailContent {
  if (p.reason === 'terminated')
    return {
      subject: 'Your ZurichJS sponsorship has ended',
      preheader: `The ${p.tierName} sponsorship for ${p.companyName} has ended.`,
      heading: 'Your sponsorship has ended',
      blocks: [
        { kind: 'p', text: `As we let you know, the ${p.tierName} sponsorship for ${p.companyName} has ended. Nothing more is charged.` },
        { kind: 'small', text: 'Questions? Reply to this email.' },
      ],
    };
  const text = {
    cancelled: `The ${p.tierName} sponsorship for ${p.companyName} has ended, as agreed.`,
    completed: p.meetups.length
      ? `${p.meetups.length === 1 ? `${p.meetups[0]} is` : 'The meetups you sponsored are'} behind us, so your one-time sponsorship is complete.`
      : `The ${p.tierName} sponsorship for ${p.companyName} is complete.`,
    lapsed: `The ${p.tierName} sponsorship for ${p.companyName} has ended because the last payment was not received. If you think this is a mistake, reply to this email and we will sort it out.`,
  }[p.reason];
  return {
    subject: 'Your ZurichJS sponsorship has ended',
    preheader: text,
    heading: 'Thank you',
    blocks: [
      { kind: 'p', text },
      { kind: 'p', text: 'Thank you for supporting the Zurich JavaScript community. You are welcome back any time, and your sponsorship page keeps your agreements and receipts.' },
      { kind: 'button', label: 'Sponsor again', url: p.accountUrl },
    ],
  };
}

export interface SponsorPaymentRecordedProps extends SponsorProps {
  /** "CHF 840", if we noted the amount. */
  amount: string | null;
  /** "31st March 2027": the new last paid day. */
  paidThrough: string;
  /** Their bank reference, if any. */
  reference: string | null;
}

/** A bank transfer (or other payment outside Stripe) we received: the written confirmation the agreement promises. */
function sponsorPaymentRecorded(p: SponsorPaymentRecordedProps): EmailContent {
  return {
    subject: `Payment received: ${p.companyName}’s ZurichJS sponsorship`,
    preheader: `We received your payment. Your sponsorship is paid through ${p.paidThrough}.`,
    heading: 'Payment received',
    blocks: [
      { kind: 'success', text: `Thank you. We received your payment, and your sponsorship is paid through ${p.paidThrough}.` },
      plan(p, [
        ...(p.amount ? ([['Amount', p.amount]] as [string, string][]) : []),
        ...(p.reference ? ([['Reference', p.reference]] as [string, string][]) : []),
        ['Paid through', p.paidThrough],
      ]),
      { kind: 'button', label: 'Open your sponsorship page', url: p.accountUrl },
    ],
  };
}

export const SPONSOR_TEMPLATES = {
  'sponsor-invite': sponsorInvite,
  'sponsor-agreement': sponsorAgreement,
  'sponsor-welcome': sponsorWelcome,
  'sponsor-payment-problem': sponsorPaymentProblem,
  'sponsor-change-request': sponsorChangeRequest,
  'sponsor-change': sponsorChange,
  'sponsor-ending': sponsorEnding,
  'sponsor-resumed': sponsorResumed,
  'sponsor-ended': sponsorEnded,
  'sponsor-payment-recorded': sponsorPaymentRecorded,
} satisfies Record<string, (p: never) => EmailContent>;
