/**
 * Shared sponsorship pieces for the API routes, the webhook, the admin area and Slack:
 * the store, what a sponsor sees, email props, and notifications (emails to the
 * sponsor's contacts, Slack notes for the board). Notifications never throw: a failed
 * email or Slack post is logged and never blocks a payment or a change.
 */
import { renderEmail, type SponsorProps, type TemplateName, type TemplateProps } from '@zurichjs/emails';
import { SPONSORSHIP_TIERS } from '@zurichjs/content/partners';
import { sendMemberEmail } from '@zurichjs/integrations';
import {
  AGREEMENT,
  ENDED_REASON_LABEL,
  chf,
  cycleInfo,
  fee,
  feeLabel,
  label,
  postgresStore,
  tierInfo,
  type Agreement,
  type Contact,
  type Logo,
  type Proposal,
  type Sponsor,
  type SponsorStore,
} from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';
import { membershipSlack, type MembershipSlack } from './membership-slack.ts';

type Fetch = typeof fetch;
type Log = (m: string) => void;

/** The sponsor store, on the same database as memberships. Throws MembershipUnavailable without one. */
export const sponsorStore = (env: Env): SponsorStore => postgresStore(membershipDb(env));

export const accountUrl = (origin: string) => new URL('/partners/account', origin).toString();
export const agreementUrl = (origin: string) => new URL(AGREEMENT.path, origin).toString();

export const PAYMENT_LABEL: Record<Sponsor['paymentMode'], string> = {
  card: 'By card',
  invoice: 'By invoice (due in 30 days)',
  manual: 'Paid directly to the association',
};

/** A tier's benefits, as /partners lists them (packages/content/src/partners.ts). */
export const tierBenefits = (tier: Sponsor['tier']): string[] => SPONSORSHIP_TIERS.find((t) => t.id === tier)?.perks ?? [];

export const planLabel = (s: Pick<Sponsor, 'tier' | 'cycle'>) => `${tierInfo(s.tier).name}, ${feeLabel(s.tier, s.cycle)}`;

const meetupLabel = (s: Sponsor) => (s.cycle === 'once' && s.eventTitle ? `${s.eventTitle}${s.eventDate ? `, ${longDate(s.eventDate)}` : ''}` : null);

export function sponsorProps(s: Sponsor, contact: Pick<Contact, 'name'>, origin: string): SponsorProps {
  const c = cycleInfo(s.cycle);
  return {
    companyName: s.companyName,
    contactName: contact.name,
    tierName: tierInfo(s.tier).name,
    cycleLabel: c.label,
    feeLabel: feeLabel(s.tier, s.cycle),
    price: chf(fee(s.tier, s.cycle)),
    per: s.cycle === 'once' ? 'for one meetup' : `a ${c.unit}`,
    paymentLabel: PAYMENT_LABEL[s.paymentMode],
    meetup: meetupLabel(s),
    accountUrl: accountUrl(origin),
    benefits: tierBenefits(s.tier),
  };
}

/* ------------------------------------------------------------------ views */

export interface SponsorView {
  id: string;
  companyName: string;
  legalName: string | null;
  billingAddress: string | null;
  vatId: string | null;
  website: string | null;
  tier: Sponsor['tier'];
  tierName: string;
  /** What the tier includes (/partners). */
  benefits: string[];
  cycle: Sponsor['cycle'];
  cycleLabel: string;
  feeLabel: string;
  paymentMode: Sponsor['paymentMode'];
  paymentLabel: string;
  status: Sponsor['status'];
  statusLabel: string;
  endedReason: Sponsor['endedReason'];
  startedAt: string | null;
  paidUntil: string | null;
  /** The last day paid for (the day before paidUntil). */
  paidThrough: string | null;
  meetup: { id: string | null; title: string | null; date: string | null } | null;
  endsAt: string | null;
  lastDay: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  source: Sponsor['source'];
}

export const sponsorView = (s: Sponsor): SponsorView => ({
  id: s.id,
  companyName: s.companyName,
  legalName: s.legalName,
  billingAddress: s.billingAddress,
  vatId: s.vatId,
  website: s.website,
  tier: s.tier,
  tierName: tierInfo(s.tier).name,
  benefits: tierBenefits(s.tier),
  cycle: s.cycle,
  cycleLabel: cycleInfo(s.cycle).label,
  feeLabel: feeLabel(s.tier, s.cycle),
  paymentMode: s.paymentMode,
  paymentLabel: PAYMENT_LABEL[s.paymentMode],
  status: s.status,
  statusLabel: s.status === 'ended' && s.endedReason ? `ended (${ENDED_REASON_LABEL[s.endedReason]})` : label(s.status),
  endedReason: s.endedReason,
  startedAt: s.startedAt,
  paidUntil: s.paidUntil,
  paidThrough: s.paidUntil ? lastDay(s.paidUntil) : null,
  meetup: s.cycle === 'once' ? { id: s.eventId, title: s.eventTitle, date: s.eventDate } : null,
  endsAt: s.endsAt,
  lastDay: s.endsAt ? lastDay(s.endsAt) : null,
  hasStripeCustomer: !!s.stripeCustomerId,
  hasSubscription: !!s.stripeSubscriptionId,
  source: s.source,
});

/** The board also sees Stripe ids and notes. */
export const adminSponsorView = (s: Sponsor) => ({
  ...sponsorView(s),
  stripeCustomerId: s.stripeCustomerId,
  stripeSubscriptionId: s.stripeSubscriptionId,
  partnerId: s.partnerId,
  notes: s.notes,
  endRequestedAt: s.endRequestedAt,
  createdAt: s.createdAt,
});

export type AdminSponsorView = ReturnType<typeof adminSponsorView>;

export const contactView = (c: Contact) => ({ id: c.id, name: c.name, email: c.email, role: c.role, hasAccount: !!c.userId });

export const agreementView = (a: Agreement) => ({
  id: a.id,
  version: a.version,
  signerName: a.signerName,
  signerTitle: a.signerTitle,
  signerEmail: a.signerEmail,
  context: a.context,
  summary: a.summary,
  acceptedAt: a.acceptedAt,
});

export const proposalView = (p: Proposal) => ({
  id: p.id,
  kind: p.kind,
  tier: p.tier,
  cycle: p.cycle,
  plan: p.kind === 'plan' && p.tier && p.cycle ? planLabel({ tier: p.tier, cycle: p.cycle }) : null,
  message: p.message,
  status: p.status,
  createdAt: p.createdAt,
  expiresAt: p.expiresAt,
  decidedBy: p.decidedBy,
  decidedAt: p.decidedAt,
});

export const logoView = (l: Logo) => ({
  id: l.id,
  filename: l.filename,
  contentType: l.contentType,
  bytes: l.bytes,
  uploadedBy: l.uploadedBy,
  uploadedAt: l.uploadedAt,
  review: l.review,
  reviewNote: l.reviewNote,
  reviewedAt: l.reviewedAt,
});

/* ------------------------------------------------------------------ notifications */

export interface NotifyDeps {
  env: Env;
  store: SponsorStore;
  origin: string;
  fetch?: Fetch;
  slack?: MembershipSlack;
  log?: Log;
}

/** Slack: SLACK_SPONSORSHIP_CHANNEL_ID, else the membership channel, else the agent's. */
export function sponsorSlack(env: Env, fetchImpl?: Fetch): MembershipSlack {
  return membershipSlack({ ...env, SLACK_MEMBERSHIP_CHANNEL_ID: env.SLACK_SPONSORSHIP_CHANNEL_ID || env.SLACK_MEMBERSHIP_CHANNEL_ID }, fetchImpl);
}

/** Posts a note for the board; never throws. */
export async function note(text: string, deps: Pick<NotifyDeps, 'env' | 'slack' | 'fetch' | 'log'>): Promise<void> {
  try {
    await (deps.slack ?? sponsorSlack(deps.env, deps.fetch)).post(text);
  } catch (cause) {
    (deps.log ?? console.log)(`[sponsorship] Slack note not posted: ${(cause as Error).message}`);
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** "*Acme* (Community Builder, quarterly)" for Slack. */
export const who = (s: Sponsor) => `*${esc(s.companyName)}* (${tierInfo(s.tier).name}, ${cycleInfo(s.cycle).label.toLowerCase()})`;

/** Which contacts an email goes to: everyone, or billing (billing contacts, else the primary). */
export async function recipients(store: SponsorStore, sponsorId: string, to: 'all' | 'billing'): Promise<Contact[]> {
  const contacts = await store.contacts(sponsorId);
  if (to === 'all') return contacts;
  const billing = contacts.filter((c) => c.role === 'billing');
  return billing.length ? billing : contacts.filter((c) => c.role === 'primary').slice(0, 1);
}

/**
 * Emails one template to the sponsor's contacts, each addressed by name. `props` gets
 * the shared sponsor props for each contact. Returns how many were sent.
 */
export async function emailSponsor<N extends TemplateName>(
  s: Sponsor,
  name: N,
  extra: (base: SponsorProps) => TemplateProps<N>,
  deps: NotifyDeps & { to?: 'all' | 'billing'; key: string; contacts?: Contact[] },
): Promise<number> {
  const log = deps.log ?? console.log;
  const contacts = deps.contacts ?? (await recipients(deps.store, s.id, deps.to ?? 'all'));
  let sent = 0;
  for (const c of contacts) {
    const message = renderEmail(name, extra(sponsorProps(s, c, deps.origin)));
    const ok = await sendMemberEmail(deps.env, { to: c.email, ...message }, { idempotencyKey: `${deps.key}:${c.id}`, log, fetch: deps.fetch })
      .then((r) => r.sent)
      .catch((e: Error) => {
        log(`[sponsorship] ${name} email to contact ${c.id} failed: ${e.message}`);
        return false;
      });
    if (ok) sent++;
  }
  return sent;
}

/** A copy for hello@zurichjs.com, for events the board must see in the inbox too. */
export async function emailBoard(subject: string, intro: string[], rows: [string, string][], deps: NotifyDeps & { key: string; url?: string }): Promise<void> {
  const message = renderEmail('board-notice', { subject, heading: subject, intro, rows, ...(deps.url ? { button: { label: 'Open in the admin area', url: deps.url } } : {}) });
  await sendMemberEmail(
    deps.env,
    { to: deps.env.SPONSORSHIP_BOARD_EMAIL || 'hello@zurichjs.com', ...message },
    { idempotencyKey: deps.key, log: deps.log, fetch: deps.fetch },
  ).catch((e: Error) => (deps.log ?? console.log)(`[sponsorship] board email failed: ${e.message}`));
}

export const adminUrl = (origin: string, sponsorId: string) => `${new URL('/admin/sponsors', origin).toString()}?id=${sponsorId}`;

/** "18th November 2026 to 17th February 2027" */
export const termLabel = (start: string, end: string) => `${longDate(start)} to ${longDate(lastDay(end))}`;
