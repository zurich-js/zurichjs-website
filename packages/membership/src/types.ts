/**
 * Membership of the Swiss JavaScript Group (the association behind ZurichJS).
 * Field names follow the Supabase tables in supabase/migrations, in camelCase.
 * Bylaws references: Statuten approved on 23rd May 2025 (docs/v2/MEMBERSHIP.md).
 */

/**
 * The levels that exist today, one to one with the fees on /membership. The bylaws (Art. 4)
 * also name Enthusiast and Advocate; they do not exist yet (owner, 6th November 2026).
 * Adding one later is a migration (`alter type member_level add value`) plus a row in levels.ts.
 */
export type Level = 'basic' | 'supporter';

export type Cycle = 'quarterly' | 'yearly';

/** Natural or legal person (Art. 4: any natural or legal person may join). */
export type MemberKind = 'person' | 'organisation';

/** Active = attends at least 40% of events a year (Art. 4). Set by the board, not by the fee. */
export type Category = 'passive' | 'active';

export type Status =
  /** Signed up and accepted the terms; becomes active with the first Stripe payment. */
  | 'pending'
  /** Paying automatically through Stripe. */
  | 'active'
  /** A Stripe payment failed; dues are outstanding. */
  | 'past_due'
  /** Imported from the manual process: joined on paper, paid manually (cash/bank) until `paidUntil`. */
  | 'imported_manual'
  /** Resigned; ends at the end of the paid period once the board confirms (Art. 5). */
  | 'resigning'
  | 'ended';

/** Why a membership ended (Art. 5), plus `lapsed` for a manual member who did not renew. */
export type EndedReason = 'resigned' | 'expelled' | 'deceased' | 'dissolved' | 'lapsed';

export type Source = 'self_serve' | 'imported';

export type PaymentMode = 'automatic' | 'manual';

/** Who changed something. `board` is an organiser acting in Slack (id = Slack user id). */
export type ActorKind = 'member' | 'board' | 'stripe' | 'script';

export interface Actor {
  kind: ActorKind;
  /** Auth user id, Slack user id, Stripe event id or script name. */
  id: string;
}

export interface Member {
  id: string;
  /** The Better Auth user that signs in as this member; null for imported members until their first sign-in. */
  userId: string | null;
  email: string;
  kind: MemberKind;
  /** The person's full name, or the signatory's for an organisation. */
  name: string;
  organisationName: string | null;
  level: Level;
  cycle: Cycle;
  category: Category;
  status: Status;
  endedReason: EndedReason | null;
  source: Source;
  /** ISO dates (YYYY-MM-DD). */
  joinedAt: string | null;
  paidUntil: string | null;
  paymentMode: PaymentMode;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  notes: string | null;
  /** ISO times. When the member resigned, and when the board confirmed it (null while it waits). Cleared by an undo. */
  resignedAt: string | null;
  resignationConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A new member record, before the store assigns id and timestamps. */
export type NewMember = Omit<
  Member,
  'id' | 'createdAt' | 'updatedAt' | 'userId' | 'endedReason' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'resignedAt' | 'resignationConfirmedAt'
> &
  Partial<Pick<Member, 'userId' | 'stripeCustomerId' | 'stripeSubscriptionId'>>;

/** Fields that may change without a status transition. Status, Stripe ids and the end reason are not here on purpose. */
export type MemberPatch = Partial<
  Pick<Member, 'userId' | 'kind' | 'name' | 'organisationName' | 'level' | 'cycle' | 'category' | 'paidUntil' | 'paymentMode' | 'notes' | 'joinedAt'>
>;

/** One row of the append-only audit log (`member_events`). */
export interface MemberEvent {
  id: string;
  memberId: string;
  type: string;
  fromStatus: Status | null;
  toStatus: Status | null;
  actor: Actor;
  payload: Record<string, unknown>;
  at: string;
}

/** A certificate of membership for one paid term (bylaws: the association's record that someone is a member). */
export interface Certificate {
  id: string;
  memberId: string;
  /** ZJS-2026-0001 */
  number: string;
  level: Level;
  /** ISO dates (YYYY-MM-DD); the term covers periodStart up to and including the day before periodEnd. */
  periodStart: string;
  periodEnd: string;
  stripeInvoiceId: string | null;
  issuedAt: string;
}
