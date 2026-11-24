/**
 * A raffle add-on (docs/domains/sponsorship/raffles.md): an existing sponsor pays for a prize that
 * ZurichJS raffles at one meetup. It is not a tier benefit: it has its own amount, payment, receipt
 * and status, and belongs to the sponsor account. Stage and funding are separate: paying never
 * opens entries, and a refund never erases anything.
 */

/**
 * proposed   the sponsor proposed it (a draft: allowed before the raffle terms are approved)
 * offered    the board set the amount and who covers fees, under an approved raffle terms version
 * ready      funded (paid or in kind), the sponsor accepted the terms, and the prize is ready
 * open       entries open (terms frozen)            ┐
 * closed     entries closed                          │ entry and draw: the next part
 * drawn      a winner is drawn                       │
 * fulfilled  the prize reached the winner           ┘
 * on_hold    the host meetup was cancelled or the sponsorship ended with money in: the board decides
 * declined   the board said no to a proposal
 * cancelled  stopped; any money in waits for the board's refund decision
 */
export type Stage = 'proposed' | 'offered' | 'ready' | 'open' | 'closed' | 'drawn' | 'fulfilled' | 'on_hold' | 'declined' | 'cancelled';

/** `in_kind`: the sponsor sends the prize; nothing is paid. */
export type Funding = 'unpaid' | 'paid' | 'refund_pending' | 'refunded' | 'in_kind';

/** ZurichJS buys and delivers the prize with the sponsor's money (default), or the sponsor sends it. */
export type Fulfilment = 'zurichjs' | 'in_kind';

/**
 * Something the board must look at; set by the system, cleared by the board.
 *   late_payment     paid while the sponsorship was no longer eligible (ended, or past its paid term)
 *   amount_mismatch  the payment differs from the quote
 *   meetup_changed   the host meetup was cancelled or postponed
 *   refund_review    cancelled or on hold with money in: refund or move, the board decides
 */
export type Flag = 'late_payment' | 'amount_mismatch' | 'meetup_changed' | 'refund_review';

export type ActorKind = 'sponsor' | 'board' | 'stripe' | 'script';
export interface Actor {
  kind: ActorKind;
  id: string;
}

export interface Raffle {
  id: string;
  sponsorId: string;
  /** The host meetup (Sanity event id), proposed by the sponsor and confirmed by the board. */
  eventId: string;
  eventTitle: string;
  /** YYYY-MM-DD, Zurich. */
  eventDate: string;
  /** What is raffled, as the sponsor proposed it ("Mechanical keyboard"). */
  prize: string;
  quantity: number;
  /** What the sponsor proposed to spend (rappen); the board's offer sets the amount. */
  budgetMinor: number;
  fulfilment: Fulfilment;
  stage: Stage;
  funding: Funding;
  flags: Flag[];
  /** The board's offer: the base amount (rappen) and the quote frozen for it. Null before the offer and for in-kind prizes. */
  amountMinor: number | null;
  quoteId: string | null;
  /** The raffle terms version the offer was made under, and the sponsor's acceptance of it. */
  termsVersion: string | null;
  acceptedVersion: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  paymentLinkId: string | null;
  paymentLinkUrl: string | null;
  /** The board's note for a declined, cancelled or on-hold raffle (shown to the sponsor). */
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewRaffle = Pick<Raffle, 'sponsorId' | 'eventId' | 'eventTitle' | 'eventDate' | 'prize' | 'quantity' | 'budgetMinor' | 'fulfilment'>;

/** Gift accounting: money in and out of one raffle, kept apart from the sponsorship. Amounts in rappen, always positive. */
export type LedgerKind = 'payment' | 'prize_purchase' | 'delivery' | 'refund' | 'in_kind_received';

export interface LedgerEntry {
  id: string;
  raffleId: string;
  kind: LedgerKind;
  amountMinor: number;
  /** What it was, with a receipt or delivery note reference. */
  note: string;
  /** A Stripe session, a receipt number or a delivery note. */
  reference: string | null;
  actor: Actor;
  at: string;
}

export interface RaffleEvent {
  id: string;
  raffleId: string;
  type: string;
  actor: Actor;
  payload: Record<string, unknown>;
  at: string;
}
