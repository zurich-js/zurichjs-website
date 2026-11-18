/**
 * Sponsorship of ZurichJS (docs/v2/SPONSORSHIP.md). A sponsor is a company with one or
 * more contacts who sign in to /partners/account. Field names follow the tables in
 * apps/web/database/migrations (…_sponsorship.sql), in camelCase.
 */

/** The four sponsorship tiers on /partners, lowest first (tiers.ts). */
export type Tier = 'supporter' | 'friend' | 'builder' | 'champion';

/** `once` is a one-time sponsorship of one meetup. */
export type Cycle = 'monthly' | 'quarterly' | 'yearly' | 'once';
export type RecurringCycle = Exclude<Cycle, 'once'>;

/**
 * How they pay: by card (Stripe Checkout, charged automatically), by invoice (Stripe
 * emails an invoice, due in 30 days; bank transfer or card), or manually (paid outside
 * Stripe, recorded by the board; e.g. an existing sponsorship brought into the system).
 */
export type PaymentMode = 'card' | 'invoice' | 'manual';

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
  /** One-time sponsorships: the meetup (Sanity event id), its title and date. */
  eventId: string | null;
  eventTitle: string | null;
  eventDate: string | null;
  /** The Sanity partner document that shows them on the site. */
  partnerId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
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
  | 'eventId'
  | 'eventTitle'
  | 'eventDate'
  | 'notes'
>;

/** Fields that change without a status transition. */
export type SponsorPatch = Partial<
  Pick<
    Sponsor,
    | 'companyName'
    | 'legalName'
    | 'billingAddress'
    | 'vatId'
    | 'website'
    | 'tier'
    | 'cycle'
    | 'paymentMode'
    | 'startedAt'
    | 'paidUntil'
    | 'eventId'
    | 'eventTitle'
    | 'eventDate'
    | 'partnerId'
    | 'notes'
  >
>;

export type ContactRole = 'primary' | 'billing' | 'other';

/** Someone who signs in for a sponsor. An email belongs to one sponsor. */
export interface Contact {
  id: string;
  sponsorId: string;
  email: string;
  name: string;
  role: ContactRole;
  /** The Better Auth user, linked on their first sign-in. */
  userId: string | null;
  createdAt: string;
}

export type NewContact = Pick<Contact, 'email' | 'name' | 'role'>;

/** A signed sponsorship agreement: who accepted which version, for what. */
export interface Agreement {
  id: string;
  sponsorId: string;
  version: string;
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  /** `start`: the sponsorship; `change`: a plan change; `proposal`: accepting the board's proposal. */
  context: 'start' | 'change' | 'proposal';
  /** "Community Builder, quarterly, by invoice" at the time. */
  summary: string;
  acceptedAt: string;
}

export type ProposalStatus = 'open' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

/**
 * A change the board proposes after talking with the sponsor (a new tier or cycle, or
 * ending the sponsorship). Nothing changes until a contact accepts it in the portal.
 */
export interface Proposal {
  id: string;
  sponsorId: string;
  kind: 'plan' | 'end';
  tier: Tier | null;
  cycle: Cycle | null;
  /** The board's words to the sponsor, shown in the email and the portal. */
  message: string | null;
  status: ProposalStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
}

export type LogoReview = 'pending' | 'approved' | 'rejected';

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
  review: LogoReview;
  reviewNote: string | null;
  reviewedAt: string | null;
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
