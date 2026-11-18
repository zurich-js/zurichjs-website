/**
 * Sponsor-facing emails (docs/v2/SPONSORSHIP.md, "Emails"). Same layout and copy rules as
 * the membership emails: plain, specific, no em dashes. Stripe sends the invoices and
 * receipts themselves; these emails cover everything around them.
 */
import type { Block, EmailContent } from './layout.ts';

/** What every sponsor email repeats. */
export interface SponsorProps {
  companyName: string;
  /** The contact the email goes to. */
  contactName: string;
  /** "Community Builder" */
  tierName: string;
  /** "Quarterly", "One meetup" */
  cycleLabel: string;
  /** "CHF 1’400 a quarter" */
  feeLabel: string;
  /** "CHF 1’400" and "a quarter", for the plan card. */
  price: string;
  per: string;
  /** "By invoice (due in 30 days)", "By card", "Paid directly to the association" */
  paymentLabel: string;
  /** One-meetup sponsorships: "ZurichJS Meetup, 9th December 2026". */
  meetup: string | null;
  /** https://zurichjs.com/partners/account (or the preview's). */
  accountUrl: string;
  /** The tier's benefits, as /partners lists them. */
  benefits: string[];
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** "What Community Builder includes" and the list, or nothing when there are no benefits. */
const benefits = (tierName: string, items: string[], intro = `What ${tierName} includes:`): Block[] =>
  items.length
    ? [
        { kind: 'p', text: intro },
        { kind: 'list', items },
      ]
    : [];

const plan = (p: SponsorProps, rows: [string, string][] = []): Block => ({
  kind: 'plan',
  title: p.tierName,
  price: p.price,
  per: p.per,
  rows: [['Sponsor', p.companyName], ...(p.meetup ? ([['Meetup', p.meetup]] as [string, string][]) : []), ['Payment', p.paymentLabel], ...rows],
});

export interface SponsorInviteProps extends SponsorProps {
  /** The organiser's own words, if any. */
  message: string | null;
  /** An existing sponsorship brought onto the site: paid until this day ("31st March 2027"). */
  existingPaidThrough?: string | null;
}

function sponsorInvite(p: SponsorInviteProps): EmailContent {
  if (p.existingPaidThrough)
    return {
      subject: `Your ZurichJS sponsorship is now online`,
      preheader: `Your ${p.tierName} sponsorship for ${p.companyName} is on zurichjs.com. Nothing changes for the period you paid.`,
      heading: `Hi ${firstName(p.contactName)}`,
      blocks: [
        { kind: 'p', text: `Thank you for sponsoring ZurichJS. We have moved your sponsorship to zurichjs.com, so you can manage it yourself:` },
        plan(p, [['Paid through', p.existingPaidThrough]]),
        ...benefits(p.tierName, p.benefits),
        ...(p.message ? ([{ kind: 'p', text: p.message }] satisfies Block[]) : []),
        {
          kind: 'p',
          text: 'Sign in with this email address to accept the sponsorship agreement, check your billing details and logo, and choose to pay by card or by invoice from the next period. Nothing is charged before your paid period ends.',
        },
        { kind: 'button', label: 'Open your sponsorship', url: p.accountUrl },
        { kind: 'small', text: 'Colleagues (for example your finance team) can be added on the same page.' },
      ],
    };
  return {
    subject: `Your ZurichJS sponsorship: ${p.tierName}`,
    preheader: `Review the ${p.tierName} sponsorship for ${p.companyName}, accept the agreement and choose how to pay.`,
    heading: `Hi ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'p', text: `Thank you for supporting ZurichJS. We have set up the sponsorship we talked about for ${p.companyName}:` },
      plan(p),
      ...benefits(p.tierName, p.benefits),
      ...(p.message ? ([{ kind: 'p', text: p.message }] satisfies Block[]) : []),
      {
        kind: 'p',
        text: 'Sign in with this email address to review it, accept the sponsorship agreement, add your billing details and logo, and choose to pay by card or by invoice.',
      },
      { kind: 'button', label: 'Review the sponsorship', url: p.accountUrl },
      { kind: 'small', text: 'Nothing is charged until you accept the agreement and choose how to pay. Colleagues can be added on the same page.' },
    ],
  };
}

export interface SponsorAgreementProps extends SponsorProps {
  signerName: string;
  signerTitle: string;
  /** "18th November 2026, 14:05" */
  acceptedAt: string;
  agreementVersion: string;
  agreementUrl: string;
  /** Stripe's page for the first invoice, when paying by invoice. */
  invoiceUrl: string | null;
}

/** A copy of what was signed, and what happens next. */
function sponsorAgreement(p: SponsorAgreementProps): EmailContent {
  const next =
    p.paymentLabel.startsWith('By invoice') && p.invoiceUrl
      ? 'Stripe has sent the first invoice to your billing contact. The sponsorship starts when it is paid.'
      : p.paymentLabel.startsWith('By invoice')
        ? 'The first invoice follows from Stripe when your current paid period ends.'
        : 'The sponsorship starts with your payment. You get a receipt from Stripe.';
  return {
    subject: `Sponsorship agreement accepted: ${p.companyName}`,
    preheader: `${p.signerName} accepted the ZurichJS sponsorship agreement for ${p.companyName}.`,
    heading: 'Agreement accepted',
    blocks: [
      { kind: 'p', text: `This is your copy for the record. ${p.signerName} (${p.signerTitle}) accepted the ZurichJS sponsorship agreement on behalf of ${p.companyName}.` },
      plan(p, [
        ['Accepted', p.acceptedAt],
        ['Agreement', `Version ${p.agreementVersion}`],
      ]),
      { kind: 'p', text: next },
      ...(p.invoiceUrl
        ? ([{ kind: 'button', label: 'See the invoice', url: p.invoiceUrl }] satisfies Block[])
        : [{ kind: 'button', label: 'Open your sponsorship', url: p.accountUrl } satisfies Block]),
      { kind: 'url', text: 'The agreement you accepted:', url: p.agreementUrl },
    ],
  };
}

export interface SponsorWelcomeProps extends SponsorProps {
  /** "18th November 2026 to 17th February 2027", or the meetup. */
  term: string;
  /** "18th February 2027", or null for one meetup. */
  nextPayment: string | null;
  /** Whether a logo is still missing. */
  needsLogo: boolean;
}

function sponsorWelcome(p: SponsorWelcomeProps): EmailContent {
  return {
    subject: `Welcome, ${p.companyName}: your ZurichJS sponsorship is active`,
    preheader: `Your ${p.tierName} sponsorship is active. Thank you for supporting the Zurich JavaScript community.`,
    heading: `Thank you, ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'badge', text: 'Your sponsorship is active' },
      { kind: 'p', text: `${p.companyName} now supports ZurichJS as a ${p.tierName}. Your payment keeps our meetups free and brings speakers to Zurich.` },
      plan(p, [[p.nextPayment ? 'Current term' : 'Covers', p.term], ...(p.nextPayment ? ([['Next payment', p.nextPayment]] as [string, string][]) : [])]),
      ...benefits(p.tierName, p.benefits, `As a ${p.tierName}, you get:`),
      ...(p.needsLogo
        ? ([{ kind: 'p', text: 'One thing we still need: your logo (SVG preferred, or a PNG at least 1000 pixels wide), for the site and the sponsor slides.' }] satisfies Block[])
        : []),
      { kind: 'button', label: p.needsLogo ? 'Upload your logo' : 'Open your sponsorship', url: p.accountUrl },
      { kind: 'small', text: 'On the same page you can change your tier or billing, update payment details and invoices, and add colleagues.' },
    ],
  };
}

export interface SponsorPaymentProblemProps extends SponsorProps {
  /** Stripe's invoice page. */
  payUrl: string | null;
  problem: 'declined' | 'confirm' | 'overdue';
  /** "21st November 2026", when Stripe tries again. */
  nextAttempt: string | null;
}

function sponsorPaymentProblem(p: SponsorPaymentProblemProps): EmailContent {
  const text = {
    declined: 'The latest payment for your sponsorship was declined.',
    confirm: 'Your bank wants you to confirm the latest payment for your sponsorship.',
    overdue: 'The latest invoice for your sponsorship is past its due date.',
  }[p.problem];
  return {
    subject: p.problem === 'overdue' ? `Invoice overdue: ${p.companyName} sponsorship` : `Payment problem: ${p.companyName} sponsorship`,
    preheader: text,
    heading: p.problem === 'overdue' ? 'An invoice is overdue' : 'Your payment did not go through',
    blocks: [
      { kind: 'error', text },
      plan(p),
      ...(p.payUrl ? ([{ kind: 'button', label: p.problem === 'confirm' ? 'Confirm the payment' : 'Pay the invoice', url: p.payUrl }] satisfies Block[]) : []),
      ...(p.nextAttempt ? ([{ kind: 'small', text: `Stripe tries the card again on ${p.nextAttempt}.` }] satisfies Block[]) : []),
      {
        kind: 'small',
        text: 'To change the card or see your invoices, open your sponsorship and choose "Payment details and invoices". Already paid? Then you can ignore this email.',
      },
      { kind: 'button', label: 'Open your sponsorship', url: p.accountUrl },
    ],
  };
}

export interface SponsorProposalProps extends SponsorProps {
  kind: 'plan' | 'end';
  /** For a plan proposal: the new tier, fee and when it applies. */
  newPlan: { tierName: string; feeLabel: string; applies: string; benefits: string[] } | null;
  /** For an end proposal: the last day. */
  lastDay: string | null;
  message: string | null;
  /** "2nd December 2026" */
  expires: string;
}

/** The board proposes a change agreed in conversation; the sponsor accepts it in the portal. */
function sponsorProposal(p: SponsorProposalProps): EmailContent {
  const what =
    p.kind === 'plan' && p.newPlan
      ? `move ${p.companyName} to ${p.newPlan.tierName}, ${p.newPlan.feeLabel}, ${p.newPlan.applies}`
      : `end the ${p.tierName} sponsorship${p.lastDay ? ` after ${p.lastDay}` : ''}`;
  return {
    subject: `Please confirm: a change to your ZurichJS sponsorship`,
    preheader: `As discussed, we propose to ${what}. Nothing changes until you confirm.`,
    heading: `Hi ${firstName(p.contactName)}`,
    blocks: [
      { kind: 'p', text: `As discussed, we propose to ${what}.` },
      ...(p.message ? ([{ kind: 'p', text: p.message }] satisfies Block[]) : []),
      {
        kind: 'summary',
        rows: [
          ['Now', `${p.tierName}, ${p.feeLabel}`],
          ...(p.newPlan
            ? ([
                ['Proposed', `${p.newPlan.tierName}, ${p.newPlan.feeLabel}`],
                ['Applies', p.newPlan.applies],
              ] as [string, string][])
            : []),
          ...(p.kind === 'end' && p.lastDay ? ([['Last day', p.lastDay]] as [string, string][]) : []),
        ],
      },
      ...(p.newPlan ? benefits(p.newPlan.tierName, p.newPlan.benefits) : []),
      { kind: 'button', label: 'Review and confirm', url: p.accountUrl },
      { kind: 'small', text: `Nothing changes until someone at ${p.companyName} confirms. The proposal is open until ${p.expires}; you can also decline it there.` },
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
}

function sponsorChange(p: SponsorChangeProps): EmailContent {
  const line = {
    now: `Your sponsorship is now ${p.tierName}. Stripe charges only the difference for the rest of this term.`,
    renewal: `Your sponsorship changes to ${p.tierName}, ${p.feeLabel}, from ${p.from ?? 'your next renewal'}. Until then it stays ${p.previous}, and nothing is charged now.`,
    applied: `As agreed, your sponsorship is ${p.tierName} from today.`,
  }[p.timing];
  return {
    subject: p.timing === 'renewal' ? `Sponsorship change scheduled: ${p.tierName}` : `Your sponsorship is now ${p.tierName}`,
    preheader: line,
    heading: p.timing === 'renewal' ? 'Change scheduled' : 'Sponsorship updated',
    blocks: [
      { kind: 'success', text: line },
      plan(p, [['Before', p.previous]]),
      ...benefits(p.tierName, p.benefits, p.timing === 'renewal' ? `From ${p.from ?? 'your next renewal'}, ${p.tierName} includes:` : `${p.tierName} includes:`),
      { kind: 'button', label: 'Open your sponsorship', url: p.accountUrl },
    ],
  };
}

export interface SponsorEndingProps extends SponsorProps {
  /** "17th February 2027": the last day of the sponsorship. */
  lastDay: string;
}

function sponsorEnding(p: SponsorEndingProps): EmailContent {
  return {
    subject: `Your ZurichJS sponsorship ends on ${p.lastDay}`,
    preheader: `The ${p.tierName} sponsorship for ${p.companyName} runs until ${p.lastDay}. Nothing more is charged.`,
    heading: 'Thank you for your support',
    blocks: [
      {
        kind: 'p',
        text: `As agreed, the ${p.tierName} sponsorship for ${p.companyName} ends with the paid period. Your benefits run until ${p.lastDay}, and nothing more is charged.`,
      },
      plan(p, [['Last day', p.lastDay]]),
      { kind: 'p', text: 'Changed your mind? You can keep the sponsorship going on your sponsorship page until then.' },
      { kind: 'button', label: 'Open your sponsorship', url: p.accountUrl },
    ],
  };
}

function sponsorResumed(p: SponsorProps): EmailContent {
  return {
    subject: `Your ZurichJS sponsorship continues`,
    preheader: `The ${p.tierName} sponsorship for ${p.companyName} continues and renews as before.`,
    heading: 'Great to keep you on board',
    blocks: [
      { kind: 'success', text: `The ${p.tierName} sponsorship for ${p.companyName} continues and renews as before.` },
      plan(p),
      { kind: 'button', label: 'Open your sponsorship', url: p.accountUrl },
    ],
  };
}

export interface SponsorEndedProps extends SponsorProps {
  reason: 'cancelled' | 'completed' | 'lapsed' | 'terminated';
}

function sponsorEnded(p: SponsorEndedProps): EmailContent {
  const text = {
    cancelled: `The ${p.tierName} sponsorship for ${p.companyName} has ended, as agreed.`,
    completed: `${p.meetup ? `${p.meetup} is behind us` : 'The meetup you sponsored is behind us'}, so your one-time sponsorship is complete.`,
    lapsed: `The ${p.tierName} sponsorship for ${p.companyName} has ended because the last invoice was not paid.`,
    terminated: `The ${p.tierName} sponsorship for ${p.companyName} has ended.`,
  }[p.reason];
  return {
    subject: `Your ZurichJS sponsorship has ended`,
    preheader: text,
    heading: 'Thank you',
    blocks: [
      { kind: 'p', text },
      { kind: 'p', text: 'Thank you for supporting the Zurich JavaScript community. You are welcome back any time, and your sponsorship page keeps your agreements and invoices.' },
      { kind: 'button', label: 'Sponsor again', url: p.accountUrl },
    ],
  };
}

export interface SponsorLogoProps extends SponsorProps {
  approved: boolean;
  note: string | null;
}

function sponsorLogo(p: SponsorLogoProps): EmailContent {
  return {
    subject: p.approved ? 'Your logo is approved' : 'We need another logo file',
    preheader: p.approved ? `Your logo will appear on zurichjs.com and the sponsor slides.` : `Please upload another logo file for ${p.companyName}.`,
    heading: p.approved ? 'Logo approved' : 'Another logo, please',
    blocks: [
      p.approved
        ? { kind: 'success', text: 'Your logo is approved. It appears on zurichjs.com and the sponsor slides once an organiser publishes the update.' }
        : { kind: 'p', text: 'We could not use the logo you uploaded.' },
      ...(p.note ? ([{ kind: 'p', text: p.note }] satisfies Block[]) : []),
      ...(p.approved ? [] : ([{ kind: 'button', label: 'Upload another logo', url: p.accountUrl }] satisfies Block[])),
    ],
  };
}

export const SPONSOR_TEMPLATES = {
  'sponsor-invite': sponsorInvite,
  'sponsor-agreement': sponsorAgreement,
  'sponsor-welcome': sponsorWelcome,
  'sponsor-payment-problem': sponsorPaymentProblem,
  'sponsor-proposal': sponsorProposal,
  'sponsor-change': sponsorChange,
  'sponsor-ending': sponsorEnding,
  'sponsor-resumed': sponsorResumed,
  'sponsor-ended': sponsorEnded,
  'sponsor-logo': sponsorLogo,
} satisfies Record<string, (p: never) => EmailContent>;
