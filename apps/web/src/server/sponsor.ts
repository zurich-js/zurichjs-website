/**
 * Shared sponsorship pieces for the API routes, the webhook, the admin area and Slack:
 * the store, what a sponsor sees, email props, and notifications (emails to the sponsor's
 * confirmed contacts, one Slack note per event for the board; owner, 18th November 2026: Slack
 * only, no board emails). Notifications never throw: a failed email or Slack post is logged and
 * never blocks a payment or a change.
 */
import { renderEmail, type SponsorProps, type TemplateName, type TemplateProps } from '@zurichjs/emails';
import { SPONSORSHIP_TIERS } from '@zurichjs/content/partners';
import { sendMemberEmail } from '@zurichjs/integrations';
import {
  AGREEMENT,
  ENDED_REASON_LABEL,
  bundleLabel,
  chf,
  cycleInfo,
  fee,
  feeLabel,
  label,
  meetupPrice,
  postgresStore,
  tierInfo,
  type Agreement,
  type Contact,
  type Logo,
  type Sponsor,
  type SponsorDocument,
  type SponsorMeetup,
  type SponsorStore,
} from '@zurichjs/sponsorship';
import { lastDay, longDate } from './dates.ts';
import type { Env } from './http.ts';
import { membershipDb } from './membership-db.ts';
import { membershipSlack, type MembershipSlack } from './membership-slack.ts';
import { confirmed } from './sponsor-stripe.ts';

type Fetch = typeof fetch;
type Log = (m: string) => void;

/** The sponsor store, on the same database as memberships. Throws MembershipUnavailable without one. */
export const sponsorStore = (env: Env): SponsorStore => postgresStore(membershipDb(env));

/** Sponsors can start and pay only once the owner switches this on (after approving the agreement). */
export const sponsorshipEnabled = (env: Env) => env.SPONSORSHIP_ENABLED === 'true';

export const accountUrl = (origin: string) => new URL('/partners/account', origin).toString();
export const agreementUrl = (origin: string) => new URL(AGREEMENT.path, origin).toString();

export const PAYMENT_LABEL: Record<Sponsor['paymentMode'], string> = {
  card: 'By card',
  manual: 'By bank transfer to ZurichJS',
};

/** A tier's benefits, as /partners lists them (packages/content/src/partners.ts). */
export const tierBenefits = (tier: Sponsor['tier']): string[] => SPONSORSHIP_TIERS.find((t) => t.id === tier)?.perks ?? [];

/** "Community Builder, CHF 1’400 a quarter", or for a one-time sponsorship its bundle. */
export const planLabel = (s: Pick<Sponsor, 'tier' | 'cycle'> & Partial<Pick<Sponsor, 'pricePerMeetup'>>, meetups = 1) =>
  `${tierInfo(s.tier).name}, ${s.cycle === 'once' ? bundleLabel(s.tier, meetups, s.pricePerMeetup ?? null) : feeLabel(s.tier, s.cycle)}`;

/** "CHF 1’400 a quarter" or "CHF 1’500 for 3 meetups (CHF 500 each)". */
export const sponsorFee = (s: Sponsor, meetups: SponsorMeetup[]) => (s.cycle === 'once' ? bundleLabel(s.tier, meetups.length, s.pricePerMeetup) : feeLabel(s.tier, s.cycle));

/** What a one-time sponsorship costs in total (CHF). */
export const bundleTotal = (s: Sponsor, meetups: SponsorMeetup[]) => meetupPrice(s.tier, s.pricePerMeetup) * Math.max(meetups.length, 1);

export const meetupLabel = (m: SponsorMeetup) => `${m.title}, ${longDate(m.date)}`;

/** The first day after the last meetup: when a one-time sponsorship is over. */
export const afterLastMeetup = (meetups: SponsorMeetup[]) => {
  const last = meetups
    .map((m) => m.date)
    .sort()
    .at(-1);
  return last ? new Date(Date.parse(`${last}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : null;
};

export function sponsorProps(s: Sponsor, meetups: SponsorMeetup[], contact: Pick<Contact, 'name'>, origin: string): SponsorProps {
  const c = cycleInfo(s.cycle);
  const once = s.cycle === 'once';
  const n = Math.max(meetups.length, 1);
  return {
    companyName: s.companyName,
    contactName: contact.name,
    tierName: tierInfo(s.tier).name,
    cycleLabel: c.label,
    feeLabel: sponsorFee(s, meetups),
    price: chf(once ? bundleTotal(s, meetups) : fee(s.tier, s.cycle)),
    per: once ? (n === 1 ? 'for one meetup' : `for ${n} meetups`) : `a ${c.unit}`,
    paymentLabel: PAYMENT_LABEL[s.paymentMode],
    meetups: once ? meetups.map(meetupLabel) : [],
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
  /** One-time: the board's price per meetup (CHF), or null for the list price. */
  pricePerMeetup: number | null;
  /** One-time: the meetups it covers, by date. */
  meetups: SponsorMeetup[];
  paymentMode: Sponsor['paymentMode'];
  paymentLabel: string;
  status: Sponsor['status'];
  statusLabel: string;
  endedReason: Sponsor['endedReason'];
  startedAt: string | null;
  paidUntil: string | null;
  /** The last day paid for (the day before paidUntil). */
  paidThrough: string | null;
  endsAt: string | null;
  lastDay: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  /** A contract signed outside the site is on file: no online signature needed. */
  hasContract: boolean;
  source: Sponsor['source'];
}

export const sponsorView = (s: Sponsor, meetups: SponsorMeetup[] = [], hasContract = false): SponsorView => ({
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
  feeLabel: sponsorFee(s, meetups),
  pricePerMeetup: s.pricePerMeetup,
  meetups: s.cycle === 'once' ? meetups : [],
  paymentMode: s.paymentMode,
  paymentLabel: PAYMENT_LABEL[s.paymentMode],
  status: s.status,
  statusLabel: s.status === 'ended' && s.endedReason ? `ended (${ENDED_REASON_LABEL[s.endedReason]})` : label(s.status),
  endedReason: s.endedReason,
  startedAt: s.startedAt,
  paidUntil: s.paidUntil,
  paidThrough: s.paidUntil ? lastDay(s.paidUntil) : null,
  endsAt: s.endsAt,
  lastDay: s.endsAt ? lastDay(s.endsAt) : null,
  hasStripeCustomer: !!s.stripeCustomerId,
  hasSubscription: !!s.stripeSubscriptionId,
  hasContract,
  source: s.source,
});

/** Loads what a view needs: the meetups and whether a contract is on file. */
export async function loadView(store: SponsorStore, s: Sponsor): Promise<{ meetups: SponsorMeetup[]; documents: SponsorDocument[] }> {
  const [meetups, documents] = await Promise.all([store.meetups(s.id), store.documents(s.id)]);
  return { meetups, documents };
}

/** The board also sees Stripe ids, the payment link and notes. */
export const adminSponsorView = (s: Sponsor, meetups: SponsorMeetup[] = [], hasContract = false) => ({
  ...sponsorView(s, meetups, hasContract),
  stripeCustomerId: s.stripeCustomerId,
  stripeSubscriptionId: s.stripeSubscriptionId,
  paymentLinkUrl: s.paymentLinkUrl,
  partnerId: s.partnerId,
  notes: s.notes,
  endRequestedAt: s.endRequestedAt,
  createdAt: s.createdAt,
});

export type AdminSponsorView = ReturnType<typeof adminSponsorView>;

/** `pending`: added by a colleague and not signed in yet (gets no email until then). */
export const contactView = (c: Contact) => ({ id: c.id, name: c.name, email: c.email, role: c.role, hasAccount: !!c.userId, pending: !confirmed(c), addedBy: c.addedBy });

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

export const logoView = (l: Logo) => ({ id: l.id, filename: l.filename, contentType: l.contentType, bytes: l.bytes, uploadedBy: l.uploadedBy, uploadedAt: l.uploadedAt });

export const documentView = (d: SponsorDocument) => ({ id: d.id, kind: d.kind, filename: d.filename, bytes: d.bytes, signedOn: d.signedOn, uploadedAt: d.uploadedAt });

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

/**
 * Text a sponsor typed (company or contact name), made safe for Slack mrkdwn: no &, < or >
 * (links, mentions), no formatting characters, one line.
 */
export const slackText = (s: string) =>
  s
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

/** "*Acme* (Community Builder, quarterly)" for Slack. */
export const who = (s: Sponsor) => `*${slackText(s.companyName)}* (${tierInfo(s.tier).name}, ${cycleInfo(s.cycle).label.toLowerCase()})`;

/**
 * Who an email goes to: confirmed contacts only (a colleague added on the sponsorship page gets
 * nothing until they sign in), all of them, or for payments the billing contacts, else the primary.
 */
export async function recipients(store: SponsorStore, sponsorId: string, to: 'all' | 'billing'): Promise<Contact[]> {
  const contacts = (await store.contacts(sponsorId)).filter(confirmed);
  if (to === 'all') return contacts;
  const billing = contacts.filter((c) => c.role === 'billing');
  return billing.length ? billing : contacts.filter((c) => c.role === 'primary').slice(0, 1);
}

/**
 * Emails one template to the sponsor's confirmed contacts, each addressed by name. `extra` gets
 * the shared sponsor props for each contact. Returns how many were sent.
 */
export async function emailSponsor<N extends TemplateName>(
  s: Sponsor,
  name: N,
  extra: (base: SponsorProps) => TemplateProps<N>,
  deps: NotifyDeps & { to?: 'all' | 'billing'; key: string; contacts?: Contact[]; meetups?: SponsorMeetup[] },
): Promise<number> {
  const log = deps.log ?? console.log;
  const [contacts, meetups] = await Promise.all([
    deps.contacts ? deps.contacts.filter(confirmed) : recipients(deps.store, s.id, deps.to ?? 'all'),
    deps.meetups ?? (s.cycle === 'once' ? deps.store.meetups(s.id) : []),
  ]);
  let sent = 0;
  for (const c of contacts) {
    const message = renderEmail(name, extra(sponsorProps(s, meetups, c, deps.origin)));
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

export const adminUrl = (origin: string, sponsorId: string) => `${new URL('/admin/sponsors', origin).toString()}?id=${sponsorId}`;

/** "18th November 2026 to 17th February 2027" */
export const termLabel = (start: string, end: string) => `${longDate(start)} to ${longDate(lastDay(end))}`;

/** Today in Zurich (YYYY-MM-DD): the calendar the board and sponsors live in. */
export const zurichDay = (d: Date = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(d);

/** A Stripe timestamp as a Zurich calendar day. */
export const zurichDayOf = (unix: number) => zurichDay(new Date(unix * 1000));
