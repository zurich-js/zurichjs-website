/**
 * Sponsorship of ZurichJS (docs/domains/sponsorship/overview.md). A sponsor is a company with one or
 * more contacts who sign in to /partners/account. Field names follow the tables in
 * apps/web/database/migrations (…_sponsorship.sql), in camelCase.
 */

/** The four sponsorship tiers on /partners, lowest first (tiers.ts). */
export type Tier = 'supporter' | 'friend' | 'builder' | 'champion';

/** `once` is a one-time sponsorship of one meetup. */
export type Cycle = 'monthly' | 'quarterly' | 'yearly' | 'once';
export type RecurringCycle = Exclude<Cycle, 'once'>;

/**
 * How they pay: by card (Stripe Checkout or a payment link, charged automatically), or
 * manually (paid outside Stripe, e.g. by bank transfer against the board's own invoice,
 * recorded by the board). Stripe invoices are off for now (owner, 18th November 2026).
 */
export type PaymentMode = 'card' | 'manual';

export type Status =
  /** Invited or started; becomes active with the first payment (or the board recording one). */
  | 'pending'
  | 'active'
  /** A Stripe payment failed or an invoice is overdue. */
  | 'past_due'
  /** Ends at `endsAt` (the end of the paid period), agreed by the sponsor. */
  | 'ending'
  | 'ended';

/**
 * cancelled   the sponsor ended it (at the end of the paid period)
 * completed   a one-time sponsorship after its meetup
 * lapsed      payment never came (Stripe gave up)
 * terminated  the board ended it (e.g. a breach of the agreement)
 * withdrawn   it never started (an invitation taken back)
 */
export type EndedReason = 'cancelled' | 'completed' | 'lapsed' | 'terminated' | 'withdrawn';

export type Source = 'self_serve' | 'invited' | 'imported';

/** `sponsor` is a contact signed in to the portal; `board` an organiser in the admin area or Slack. */
export type ActorKind = 'sponsor' | 'board' | 'stripe' | 'script';

export interface Actor {
  kind: ActorKind;
  id: string;
}

export interface Sponsor {
  id: string;
  /** The name shown on the site and in emails. */
  companyName: string;
  /** For invoices, when it differs (e.g. "Acme Switzerland AG"). */
  legalName: string | null;
  /** Billing address as written on invoices, several lines. */
  billingAddress: string | null;
  vatId: string | null;
  website: string | null;
  tier: Tier;
  cycle: Cycle;
  paymentMode: PaymentMode;
  status: Status;
  endedReason: EndedReason | null;
  source: Source;
  /** ISO dates (YYYY-MM-DD). `paidUntil` is the first day not paid for. */
  startedAt: string | null;
  paidUntil: string | null;
  /** One-time sponsorships: a custom price per meetup (CHF) the board agreed; null = the list price. */
  pricePerMeetup: number | null;
  /** The Sanity partner document that shows them on the site. */
  partnerId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  /** The latest Stripe Checkout session, closed when a new one is opened (never two payment pages). */
  checkoutSessionId: string | null;
  /** A Stripe payment link the board created for a one-time sponsorship (with a contract on file). */
  paymentLinkId: string | null;
  paymentLinkUrl: string | null;
  /** Board-only notes. */
  notes: string | null;
  /** While `ending`: when it was agreed, and the day it ends (first day without it). */
  endRequestedAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewSponsor = Pick<
  Sponsor,
  | 'companyName'
  | 'legalName'
  | 'billingAddress'
  | 'vatId'
  | 'website'
  | 'tier'
  | 'cycle'
  | 'paymentMode'
  | 'status'
  | 'source'
  | 'startedAt'
  | 'paidUntil'
  | 'pricePerMeetup'
  | 'notes'
>;

/** Fields that change without a status transition. */
export type SponsorPatch = Partial<
  Pick<
    Sponsor,
    'companyName' | 'legalName' | 'billingAddress' | 'vatId' | 'website' | 'tier' | 'cycle' | 'paymentMode' | 'startedAt' | 'paidUntil' | 'pricePerMeetup' | 'partnerId' | 'notes'
  >
>;

export type ContactRole = 'primary' | 'billing' | 'other';

/**
 * Who added a contact: the board, a colleague on the sponsorship page, or the person
 * themselves (starting a sponsorship). A contact a colleague added is only linked to a
 * sign-in once that person accepts the invitation, and gets no email before then.
 */
export type ContactSource = 'board' | 'sponsor' | 'self';

/** Someone who signs in for a sponsor. An email belongs to one sponsor. */
export interface Contact {
  id: string;
  sponsorId: string;
  email: string;
  name: string;
  role: ContactRole;
  /** The Better Auth user, linked on their first sign-in. */
  userId: string | null;
  addedBy: ContactSource;
  createdAt: string;
}

export type NewContact = Pick<Contact, 'email' | 'name' | 'role'> & { addedBy?: ContactSource };

/** A meetup a one-time sponsorship covers. */
export interface SponsorMeetup {
  /** The Sanity event id. */
  eventId: string;
  title: string;
  /** YYYY-MM-DD, Zurich. */
  date: string;
}

/** A contract signed outside the site (PDF), kept with the sponsorship. */
export interface SponsorDocument {
  id: string;
  sponsorId: string;
  kind: 'contract';
  /** In the private Netlify Blobs store `sponsors`. */
  blobKey: string;
  filename: string;
  bytes: number;
  /** When it was signed (YYYY-MM-DD), if known. */
  signedOn: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

/** A signed sponsorship agreement: who accepted which version, for what. */
export interface Agreement {
  id: string;
  sponsorId: string;
  version: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  /** `start`: the sponsorship (full signature); `change`: a plan change or end, confirmed under the agreement. */
  context: 'start' | 'change';
  /** "Community Builder, quarterly, by invoice" at the time. */
  summary: string;
  acceptedAt: string;
}

export interface Logo {
  id: string;
  sponsorId: string;
  /** In the private Netlify Blobs store `sponsors`. */
  blobKey: string;
  contentType: string;
  bytes: number;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface SponsorEvent {
  id: string;
  sponsorId: string;
  type: string;
  fromStatus: Status | null;
  toStatus: Status | null;
  actor: Actor;
  payload: Record<string, unknown>;
  at: string;
}
