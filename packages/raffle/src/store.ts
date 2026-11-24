/**
 * Where raffles live: Postgres in functions (postgres.ts), memory in tests, with the same rules.
 * Every change appends to the raffle's audit log. Stage and funding changes are compare-and-set:
 * the caller says what it saw, and a different value now is a conflict (a double click, a retried
 * webhook).
 */
import { RaffleRuleError, checkFunding, checkStage } from './rules.ts';
import type { Actor, Flag, Funding, LedgerEntry, NewRaffle, Raffle, RaffleEvent, Stage } from './types.ts';

export interface OfferInput {
  /** Base amount in rappen; null for a prize the sponsor sends (in kind). */
  amountMinor: number | null;
  quoteId: string | null;
  termsVersion: string;
  actor: Actor;
}

export type NewLedgerEntry = Pick<LedgerEntry, 'kind' | 'amountMinor' | 'note' | 'reference'>;

export interface UnmatchedPayment {
  sessionId: string;
  linkId: string | null;
  quoteRef: string | null;
  raffleRef: string | null;
  amountMinor: number;
  currency: string;
}
export interface RaffleStore {
  unmatched(payment: UnmatchedPayment): Promise<void>;
  unmatchedPayments(): Promise<UnmatchedPayment[]>;
  outstanding(): Promise<Raffle[]>;
  create(r: NewRaffle, actor: Actor): Promise<Raffle>;
  get(id: string): Promise<Raffle | null>;
  /** Newest first. */
  bySponsor(sponsorId: string): Promise<Raffle[]>;
  byPaymentLink(id: string): Promise<Raffle | null>;
  /** Newest first. */
  list(filter?: { stage?: Stage; limit?: number }): Promise<Raffle[]>;
  moveStage(id: string, input: { from: Stage; to: Stage; actor: Actor; reason?: string | null }): Promise<Raffle>;
  setFunding(id: string, input: { from: Funding; to: Funding; actor: Actor; payload?: Record<string, unknown> }): Promise<Raffle>;
  /** proposed or on_hold → offered, with the amount, the quote and the terms version. */
  offer(id: string, input: OfferInput & { from: Stage }): Promise<Raffle>;
  /** The sponsor accepts the offer's terms version. */
  accept(id: string, input: { version: string; contactId: string; actor: Actor }): Promise<Raffle>;
  linkPayment(id: string, link: { id: string; url: string } | null, actor: Actor): Promise<Raffle>;
  flag(id: string, flag: Flag, actor: Actor, payload?: Record<string, unknown>): Promise<Raffle>;
  clearFlag(id: string, flag: Flag, actor: Actor): Promise<Raffle>;
  addLedger(id: string, e: NewLedgerEntry, actor: Actor): Promise<LedgerEntry>;
  /** Oldest first. */
  ledger(id: string): Promise<LedgerEntry[]>;
  /** Oldest first. */
  events(id: string): Promise<RaffleEvent[]>;
  stripeEventSeen(eventId: string): Promise<boolean>;
  markStripeEvent(eventId: string, type: string): Promise<void>;
}

export class RaffleNotFound extends Error {
  constructor() {
    super('No such raffle.');
    this.name = 'RaffleNotFound';
  }
}

export const conflict = () => new RaffleRuleError('The raffle changed in the meantime. Look again.', 'conflict');

/** Why a raffle cannot be marked ready yet, or null. */
export function readyBlocker(r: Raffle): string | null {
  if (r.funding !== 'paid' && r.funding !== 'in_kind') return 'It is not paid yet (or the in-kind prize has not arrived).';
  if (!r.acceptedVersion || r.acceptedVersion !== r.termsVersion) return 'The sponsor has not accepted the raffle terms of this offer.';
  if (r.flags.length) return 'Resolve the outstanding review before continuing.';
  return null;
}

export function memoryRaffleStore(opts: { now?: () => Date } = {}): RaffleStore {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  const raffles = new Map<string, Raffle>();
  const unmatched = new Map<string, UnmatchedPayment>();
  const ledger: LedgerEntry[] = [];
  const log: RaffleEvent[] = [];
  const seen = new Set<string>();
  let n = 0;
  const record = (raffleId: string, type: string, actor: Actor, payload: Record<string, unknown> = {}) =>
    log.push({ id: String(log.length + 1), raffleId, type, actor, payload, at: now() });
  const must = (id: string) => {
    const r = raffles.get(id);
    if (!r) throw new RaffleNotFound();
    return r;
  };
  const save = (r: Raffle) => {
    const saved = { ...r, flags: [...r.flags], updatedAt: now() };
    raffles.set(r.id, saved);
    return { ...saved, flags: [...saved.flags] };
  };
  const copy = (r: Raffle | undefined) => (r ? { ...r, flags: [...r.flags] } : null);

  return {
    unmatched: async (p) => {
      if (!unmatched.has(p.sessionId)) unmatched.set(p.sessionId, { ...p });
    },
    unmatchedPayments: async () => [...unmatched.values()],
    outstanding: async () =>
      [...raffles.values()].filter((r) => ['paid', 'in_kind'].includes(r.funding) && ['offered', 'ready', 'open', 'closed', 'drawn'].includes(r.stage)).map((r) => copy(r)!),
    async create(input, actor) {
      const at = now();
      const r: Raffle = {
        ...input,
        id: `r_${++n}`,
        stage: 'proposed',
        funding: 'unpaid',
        flags: [],
        amountMinor: null,
        quoteId: null,
        termsVersion: null,
        acceptedVersion: null,
        acceptedBy: null,
        acceptedAt: null,
        paymentLinkId: null,
        paymentLinkUrl: null,
        reason: null,
        createdAt: at,
        updatedAt: at,
      };
      raffles.set(r.id, r);
      record(r.id, 'proposed', actor, { eventId: r.eventId, fulfilment: r.fulfilment });
      return copy(r)!;
    },
    get: async (id) => copy(raffles.get(id)),
    bySponsor: async (sid) =>
      [...raffles.values()]
        .filter((r) => r.sponsorId === sid)
        .reverse()
        .map((r) => copy(r)!),
    byPaymentLink: async (pl) => copy([...raffles.values()].find((r) => r.paymentLinkId === pl)),
    list: async ({ stage, limit = 200 } = {}) =>
      [...raffles.values()]
        .filter((r) => !stage || r.stage === stage)
        .reverse()
        .slice(0, limit)
        .map((r) => copy(r)!),
    async moveStage(id, { from, to, actor, reason }) {
      const r = must(id);
      if (r.stage !== from) throw conflict();
      checkStage(from, to, actor.kind);
      if (to === 'ready') {
        const why = readyBlocker(r);
        if (why) throw new RaffleRuleError(why);
      }
      record(id, 'stage_changed', actor, { from, to });
      return save({ ...r, stage: to, reason: reason ?? (to === 'ready' || to === 'offered' ? null : r.reason) });
    },
    async setFunding(id, { from, to, actor, payload = {} }) {
      const r = must(id);
      if (r.funding !== from) throw conflict();
      checkFunding(from, to);
      record(id, 'funding_changed', actor, { ...payload, from, to });
      return save({ ...r, funding: to });
    },
    async offer(id, { from, amountMinor, quoteId, termsVersion, actor }) {
      const r = must(id);
      if (r.stage !== from) throw conflict();
      checkStage(from, 'offered', actor.kind);
      record(id, 'offered', actor, { amountMinor, quoteId, termsVersion });
      return save({ ...r, stage: 'offered', amountMinor, quoteId, termsVersion, acceptedVersion: null, acceptedBy: null, acceptedAt: null, reason: null });
    },
    async accept(id, { version, contactId, actor }) {
      const r = must(id);
      if (r.stage !== 'offered' || r.termsVersion !== version) throw conflict();
      if (r.acceptedVersion === version) return copy(r)!;
      record(id, 'terms_accepted', actor, { version, contactId });
      return save({ ...r, acceptedVersion: version, acceptedBy: contactId, acceptedAt: now() });
    },
    async linkPayment(id, link, actor) {
      const r = must(id);
      record(id, link ? 'payment_link_created' : 'payment_link_closed', actor, link ? { paymentLinkId: link.id } : { paymentLinkId: r.paymentLinkId });
      return save({ ...r, paymentLinkId: link?.id ?? null, paymentLinkUrl: link?.url ?? null });
    },
    async flag(id, f, actor, payload = {}) {
      const r = must(id);
      if (r.flags.includes(f)) return copy(r)!;
      record(id, 'flagged', actor, { ...payload, flag: f });
      return save({ ...r, flags: [...r.flags, f] });
    },
    async clearFlag(id, f, actor) {
      const r = must(id);
      if (!r.flags.includes(f)) return copy(r)!;
      record(id, 'flag_cleared', actor, { flag: f });
      return save({ ...r, flags: r.flags.filter((x) => x !== f) });
    },
    async addLedger(id, e, actor) {
      must(id);
      if ((e.kind === 'refund' || e.kind === 'payment') && e.reference && ledger.some((x) => x.kind === e.kind && x.reference === e.reference)) throw conflict();
      const entry: LedgerEntry = { ...e, id: String(ledger.length + 1), raffleId: id, actor, at: now() };
      ledger.push(entry);
      record(id, 'ledger_added', actor, { kind: e.kind, amountMinor: e.amountMinor });
      return { ...entry };
    },
    ledger: async (id) => ledger.filter((e) => e.raffleId === id).map((e) => ({ ...e })),
    events: async (id) => log.filter((e) => e.raffleId === id).map((e) => ({ ...e })),
    stripeEventSeen: async (e) => seen.has(e),
    markStripeEvent: async (e) => void seen.add(e),
  };
}
