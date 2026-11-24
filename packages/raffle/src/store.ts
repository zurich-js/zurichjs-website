/**
 * Where raffles live: Postgres in functions (postgres.ts), memory in tests, with the same rules.
 * Every change appends to the raffle's audit log. Stage and funding changes are compare-and-set:
 * the caller says what it saw, and a different value now is a conflict (a double click, a retried
 * webhook).
 */
import { createHash } from 'node:crypto';
import { GUARDED_STAGES, RaffleRuleError, checkFunding, checkStage } from './rules.ts';
import type { Actor, Draw, Entry, Flag, Funding, LedgerEntry, NewEntry, NewRaffle, Raffle, RaffleEvent, Stage } from './types.ts';

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
export interface RaffleMail {
  key: string;
  entryId: string;
  kind: 'entry' | 'winner' | 'recovery';
  nonce: string | null;
}
export interface RaffleStore {
  claimMail(lease: string, entryId?: string): Promise<RaffleMail[]>;
  finishMail(key: string, lease: string, sent: boolean): Promise<void>;
  recover(raffleId: string, email: string, nonce: string, hash: string): Promise<void>;
  entryById(id: string): Promise<Entry | null>;
  claimDecision(id: string, seq: number): Promise<'claimed' | 'expired' | null>;
  decideClaim(id: string, seq: number, decision: 'claimed' | 'expired', actor: Actor): Promise<void>;
  fulfil(id: string, seq: number, note: string, actor: Actor): Promise<Raffle>;
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

  /** ready → open: freezes the entrant rules version, its URL and the closing time. */
  openEntries(id: string, input: { rulesVersion: string; rulesUrl: string; closesAt: string; actor: Actor }): Promise<Raffle>;
  /**
   * Adds an entry while entries are open and before they close (checked in the same statement).
   * One per email per raffle: a second one returns the first with `created: false`.
   */
  addEntry(raffleId: string, e: NewEntry, now: Date): Promise<{ entry: Entry; created: boolean }>;
  entryByToken(tokenHash: string): Promise<Entry | null>;
  verifyEntry(entryId: string): Promise<Entry>;
  /** Oldest first: the order the draw uses (then id). Board only. */
  entries(raffleId: string): Promise<Entry[]>;
  entryCounts(raffleId: string): Promise<{ total: number; verified: number }>;
  /**
   * closed → drawn, once: the eligible entries are frozen, `pick(n)` chooses an index, and the draw
   * is recorded with the entries' hash. A second call returns the first draw (`repeated`).
   */
  draw(raffleId: string, input: { actor: Actor; pick: (n: number) => number }): Promise<{ draw: Draw; entry: Entry; repeated: boolean }>;
  /** Another draw for a drawn raffle, without earlier winners. Needs a reason. */
  redraw(raffleId: string, input: { actor: Actor; reason: string; pick: (n: number) => number; afterSeq: number }): Promise<{ draw: Draw; entry: Entry }>;
  /** Oldest first. */
  draws(raffleId: string): Promise<Draw[]>;
}

/** Fingerprint of the entries in a draw: SHA-256 of their ids in draw order. */
export const entriesHash = (entries: Pick<Entry, 'id'>[]) =>
  createHash('sha256')
    .update(entries.map((e) => e.id).join('\n'))
    .digest('hex');

/** Draw order: by entry time, then id. */
export const drawOrder = (a: Entry, b: Entry) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

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
  const entries: (Entry & { tokenHash: string })[] = [];
  const draws: Draw[] = [];
  const mail = new Map<string, RaffleMail & { lease?: string; leasedAt?: number }>();
  const grants = new Map<string, string>();
  const claims = new Map<string, 'claimed' | 'expired'>();
  let n = 0;
  const plainEntry = ({ tokenHash: _, ...e }: Entry & { tokenHash: string }): Entry => ({ ...e });
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
    claimMail: async (lease, entryId) => {
      const rows = [...mail.values()].filter((m) => (!entryId || m.entryId === entryId) && (!m.lease || Date.now() - (m.leasedAt ?? 0) > 60000)).slice(0, 20);
      return rows.map((m) => {
        m.lease = lease;
        m.leasedAt = Date.now();
        return { ...m };
      });
    },
    finishMail: async (key, lease, sent) => {
      const m = mail.get(key);
      if (m?.lease === lease) {
        if (sent) mail.delete(key);
        else m.lease = undefined;
      }
    },
    entryById: async (id) => {
      const e = entries.find((x) => x.id === id);
      return e ? plainEntry(e) : null;
    },
    recover: async (rid, email, nonce, hash) => {
      const e = entries.find((x) => x.raffleId === rid && x.email === email);
      if (!e) return;
      grants.set(hash, e.id);
      mail.set(hash, { key: hash, entryId: e.id, kind: 'recovery', nonce });
    },
    claimDecision: async (id, seq) => claims.get(`${id}:${seq}`) ?? null,
    decideClaim: async (id, seq, decision, actor) => {
      const key = `${id}:${seq}`;
      if (must(id).stage !== 'drawn' || draws.filter((d) => d.raffleId === id).at(-1)?.seq !== seq || (claims.has(key) && claims.get(key) !== decision)) throw conflict();
      if (!claims.has(key)) record(id, decision, actor, { seq });
      claims.set(key, decision);
    },
    fulfil: async (id, seq, _note, actor) => {
      const r = must(id);
      if (r.stage !== 'drawn' || claims.get(`${id}:${seq}`) !== 'claimed' || draws.filter((d) => d.raffleId === id).at(-1)?.seq !== seq) throw conflict();
      record(id, 'fulfilled', actor, { seq });
      return save({ ...r, stage: 'fulfilled', reason: null });
    },
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
        heldFrom: null,
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
        rulesVersion: null,
        rulesUrl: null,
        openedAt: null,
        closesAt: null,
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
      const restoring = from === 'on_hold' && r.openedAt !== null && r.heldFrom === to;
      if (from === 'on_hold' && r.openedAt && !restoring && to !== 'cancelled') throw new RaffleRuleError('Resume the stage that was paused.');
      if (!restoring && GUARDED_STAGES.includes(to)) throw new RaffleRuleError(`Use the ${to === 'open' ? 'open entries' : 'draw'} action for that.`);
      checkStage(from, to, actor.kind);
      if (to === 'ready') {
        const why = readyBlocker(r);
        if (why) throw new RaffleRuleError(why);
      }
      record(id, 'stage_changed', actor, { from, to });
      return save({ ...r, stage: to, heldFrom: to === 'on_hold' ? from : null, reason: reason ?? (to === 'ready' || to === 'offered' ? null : r.reason) });
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
    async openEntries(id, { rulesVersion, rulesUrl, closesAt, actor }) {
      const r = must(id);
      if (r.stage !== 'ready') throw conflict();
      checkStage('ready', 'open', actor.kind);
      record(id, 'entries_opened', actor, { rulesVersion, closesAt });
      return save({ ...r, stage: 'open', rulesVersion, rulesUrl, closesAt, openedAt: now() });
    },
    async addEntry(raffleId, e, at) {
      const r = must(raffleId);
      const existing = entries.find((x) => x.raffleId === raffleId && x.email === e.email.toLowerCase());
      if (existing) return { entry: plainEntry(existing), created: false };
      if (r.stage !== 'open' || !r.closesAt || at.toISOString() >= r.closesAt) throw new RaffleRuleError('Entries are closed.', 'conflict');
      if (entries.some((x) => x.raffleId === raffleId && x.claimCode === e.claimCode)) throw new RaffleRuleError('Claim code taken; try again.', 'conflict');
      const { mailNonce, ...input } = e;
      const entry = { ...input, email: e.email.toLowerCase(), id: `en_${++n}`, raffleId, emailVerifiedAt: null, createdAt: at.toISOString() };
      entries.push(entry);
      if (mailNonce) {
        const key = `entry:${entry.id}`;
        mail.set(key, { key, entryId: entry.id, kind: 'entry', nonce: mailNonce });
      }
      return { entry: plainEntry(entry), created: true };
    },
    entryByToken: async (hash) => {
      const e = entries.find((x) => x.tokenHash === hash || grants.get(hash) === x.id);
      return e ? plainEntry(e) : null;
    },
    async verifyEntry(entryId) {
      const e = entries.find((x) => x.id === entryId);
      if (!e) throw new RaffleNotFound();
      e.emailVerifiedAt ??= now();
      return plainEntry(e);
    },
    entries: async (rid) =>
      entries
        .filter((e) => e.raffleId === rid)
        .map(plainEntry)
        .sort(drawOrder),
    entryCounts: async (rid) => {
      const mine = entries.filter((e) => e.raffleId === rid);
      return { total: mine.length, verified: mine.filter((e) => e.emailVerifiedAt).length };
    },
    async draw(rid, { actor, pick }) {
      const r = must(rid);
      const first = draws.find((d) => d.raffleId === rid && d.seq === 1);
      if (first) return { draw: { ...first }, entry: plainEntry(entries.find((e) => e.id === first.entryId)!), repeated: true };
      if (r.stage !== 'closed') throw new RaffleRuleError('Close the entries before drawing.', 'conflict');
      checkStage('closed', 'drawn', actor.kind);
      const eligible = entries
        .filter((e) => e.raffleId === rid)
        .map(plainEntry)
        .sort(drawOrder);
      if (!eligible.length) throw new RaffleRuleError('There are no entries to draw from.');
      const index = pick(eligible.length);
      const d: Draw = {
        raffleId: rid,
        seq: 1,
        entryId: eligible[index]!.id,
        eligibleCount: eligible.length,
        entriesHash: entriesHash(eligible),
        index,
        reason: null,
        actor,
        at: now(),
      };
      draws.push(d);
      const key = `winner:${rid}:${d.seq}`;
      mail.set(key, { key, entryId: d.entryId, kind: 'winner', nonce: null });
      save({ ...r, stage: 'drawn' });
      record(rid, 'drawn', actor, { seq: 1, eligibleCount: d.eligibleCount, entriesHash: d.entriesHash });
      return { draw: { ...d }, entry: eligible[index]!, repeated: false };
    },
    async redraw(rid, { actor, reason, pick, afterSeq }) {
      const r = must(rid);
      if (r.stage !== 'drawn') throw new RaffleRuleError('Only a drawn raffle can be drawn again.', 'conflict');
      if (!reason.trim()) throw new RaffleRuleError('A redraw needs a reason.', 'invalid');
      const mine = draws.filter((d) => d.raffleId === rid);
      if (Math.max(...mine.map((d) => d.seq)) !== afterSeq) throw conflict();
      const winners = new Set(mine.map((d) => d.entryId));
      const eligible = entries
        .filter((e) => e.raffleId === rid && !winners.has(e.id))
        .map(plainEntry)
        .sort(drawOrder);
      if (!eligible.length) throw new RaffleRuleError('Nobody is left to draw.');
      const index = pick(eligible.length);
      const d: Draw = {
        raffleId: rid,
        seq: afterSeq + 1,
        entryId: eligible[index]!.id,
        eligibleCount: eligible.length,
        entriesHash: entriesHash(eligible),
        index,
        reason,
        actor,
        at: now(),
      };
      draws.push(d);
      const key = `winner:${rid}:${d.seq}`;
      mail.set(key, { key, entryId: d.entryId, kind: 'winner', nonce: null });
      record(rid, 'redrawn', actor, { seq: d.seq, eligibleCount: d.eligibleCount, entriesHash: d.entriesHash });
      return { draw: { ...d }, entry: eligible[index]! };
    },
    draws: async (rid) => draws.filter((d) => d.raffleId === rid).map((d) => ({ ...d })),
  };
}
