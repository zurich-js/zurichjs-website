/**
 * Where raffles live: Postgres in functions (postgres.ts), memory in tests, with the same rules.
 * Every change appends to the raffle's audit log. Stage and funding changes are compare-and-set:
 * the caller says what it saw, and a different value now is a conflict (a double click, a retried
 * webhook).
 */
import { createHash } from 'node:crypto';
import { GUARDED_STAGES, RaffleRuleError, checkFunding, checkStage } from './rules.ts';
import type { Actor, Consent, Draw, Entry, Flag, Funding, LedgerEntry, NewEntry, NewRaffle, Raffle, RaffleEvent, Share, ShareField, Stage } from './types.ts';

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
  openEntries(
    id: string,
    input: {
      rulesVersion: string;
      rulesUrl: string;
      closesAt: string;
      actor: Actor;
      retentionDays?: number | null;
      sharing?: { purpose: string; privacyUrl: string; version: string; noticeUrl: string } | null;
    },
  ): Promise<Raffle>;
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

  /**
   * The entrant lets the raffle's sponsor have their contact, for the raffle's purpose. Refused when
   * the raffle offers no sharing. `verified`: given from the entrant's own link (proves the address).
   */
  giveConsent(entryId: string, input: { verified: boolean; at: Date }): Promise<Consent>;
  /** Stops any later share. Idempotent. */
  withdrawConsent(entryId: string, at: Date): Promise<Consent | null>;
  /** The entry's current consent (not withdrawn), if any. */
  consentOf(entryId: string): Promise<Consent | null>;
  /** Entries whose consent counts now: given, verified, not withdrawn, for this raffle's sponsor, purpose and version. */
  consentedEntries(raffleId: string): Promise<Entry[]>;
  consentCounts(raffleId: string): Promise<{ given: number; valid: number; withdrawn: number }>;
  /** Records a release, narrowed to `entryIds` that have valid consent now. */
  createShare(raffleId: string, input: { exact?: boolean; recipientContactId: string; fields: ShareField[]; entryIds: string[]; expiresAt: string; actor: Actor }): Promise<Share>;
  getShare(id: string): Promise<Share | null>;
  /** Newest first. */
  shares(raffleId: string): Promise<Share[]>;
  revokeShare(id: string, actor: Actor): Promise<Share>;
  /** The rows a read of the share returns now: its entries, narrowed again to consent valid now. Logged. */
  readShare(id: string, actor: Actor, at: Date): Promise<{ share: Share; rows: Pick<Entry, 'id' | 'name' | 'email'>[] }>;
  /** Removes the names and emails of a raffle's entries (retention); draws and counts stay. Returns how many. */
  dueForErasure(at: Date): Promise<string[]>;
  deletionTasks(raffleId: string, contactId?: string): Promise<{ shareId: string; entryId: string; consentId: string; acknowledged: boolean }[]>;
  acknowledgeDeletion(raffleId: string, contactId: string, shareId: string, consentId: string): Promise<boolean>;
  eraseEntries(raffleId: string, actor: Actor): Promise<number>;
}

/** Whether a consent counts for this raffle now. */
export const consentValid = (c: Consent | undefined | null, r: Pick<Raffle, 'sponsorId' | 'sharePurpose' | 'sharingVersion'>) =>
  !!c && !!c.verifiedAt && !c.withdrawnAt && c.recipientSponsorId === r.sponsorId && c.purpose === r.sharePurpose && c.version === r.sharingVersion;

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
  const consents: Consent[] = [];
  const deliveries: { raffleId: string; contactId: string; shareId: string; entryId: string; consentId: string; acknowledged: boolean }[] = [];
  const shares: Share[] = [];
  const mail = new Map<string, RaffleMail & { lease?: string; leasedAt?: number }>();
  const grants = new Map<string, string>();
  const claims = new Map<string, 'claimed' | 'expired'>();
  let n = 0;
  const active = (entryId: string) => consents.find((c) => c.entryId === entryId && !c.withdrawnAt);
  const plainEntry = ({ tokenHash: _, ...e }: Entry & { tokenHash: string }): Entry => ({ ...e });
  const record = (raffleId: string, type: string, actor: Actor, payload: Record<string, unknown> = {}) =>
    log.push({ id: String(log.length + 1), raffleId, type, actor, payload, at: now() });
  const must = (id: string) => {
    const r = raffles.get(id);
    if (!r) throw new RaffleNotFound();
    return r;
  };
  const save = (r: Raffle) => {
    if (!r.eraseAfter && r.retentionDays && (r.stage === 'cancelled' || r.stage === 'fulfilled'))
      r.eraseAfter = new Date(Date.parse(now()) + r.retentionDays * 86400000).toISOString();
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
        sharePurpose: null,
        sharePrivacyUrl: null,
        sharingVersion: null,
        noticeUrl: null,
        retentionDays: null,
        eraseAfter: null,
        erasedAt: null,
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
      if (GUARDED_STAGES.includes(to)) throw new RaffleRuleError(`Use the ${to === 'open' ? 'open entries' : 'draw'} action for that.`);
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
    async openEntries(id, { rulesVersion, rulesUrl, closesAt, actor, sharing, retentionDays }) {
      const r = must(id);
      if (r.stage !== 'ready') throw conflict();
      checkStage('ready', 'open', actor.kind);
      record(id, 'entries_opened', actor, { rulesVersion, closesAt, sharingVersion: sharing?.version ?? null });
      return save({
        ...r,
        stage: 'open',
        rulesVersion,
        rulesUrl,
        closesAt,
        openedAt: now(),
        sharePurpose: sharing?.purpose ?? null,
        sharePrivacyUrl: sharing?.privacyUrl ?? null,
        sharingVersion: sharing?.version ?? null,
        noticeUrl: sharing?.noticeUrl ?? null,
        retentionDays: retentionDays ?? null,
      });
    },
    async addEntry(raffleId, e, at) {
      const r = must(raffleId);
      const existing = entries.find((x) => x.raffleId === raffleId && x.email === e.email.toLowerCase());
      if (existing) return { entry: plainEntry(existing), created: false };
      if (r.stage !== 'open' || !r.closesAt || at.toISOString() >= r.closesAt) throw new RaffleRuleError('Entries are closed.', 'conflict');
      if (entries.some((x) => x.raffleId === raffleId && x.claimCode === e.claimCode)) throw new RaffleRuleError('Claim code taken; try again.', 'conflict');
      const { mailNonce, noticeDecision, ...input } = e;
      const entry = { ...input, email: e.email.toLowerCase(), id: `en_${++n}`, raffleId, emailVerifiedAt: null, createdAt: at.toISOString() };
      entries.push(entry);
      if (noticeDecision && r.sharingVersion && r.sharePurpose)
        consents.push({
          id: `c_${++n}`,
          entryId: entry.id,
          raffleId,
          recipientSponsorId: r.sponsorId,
          purpose: r.sharePurpose,
          version: r.sharingVersion,
          givenAt: at.toISOString(),
          verifiedAt: null,
          withdrawnAt: null,
        });
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
      // A choice made on the entry form counts once the address is confirmed.
      const c = active(entryId);
      if (c) c.verifiedAt ??= now();
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
    async giveConsent(entryId, { verified, at }) {
      const e = entries.find((x) => x.id === entryId);
      if (!e) throw new RaffleNotFound();
      const r = must(e.raffleId);
      if (!r.sharingVersion || !r.sharePurpose) throw new RaffleRuleError('This raffle does not share contacts with its sponsor.');
      const existing = active(entryId);
      if (existing) {
        if (verified) existing.verifiedAt ??= at.toISOString();
        return { ...existing };
      }
      const c: Consent = {
        id: `co_${++n}`,
        entryId,
        raffleId: r.id,
        recipientSponsorId: r.sponsorId,
        purpose: r.sharePurpose,
        version: r.sharingVersion,
        givenAt: at.toISOString(),
        verifiedAt: verified || e.emailVerifiedAt ? at.toISOString() : null,
        withdrawnAt: null,
      };
      consents.push(c);
      return { ...c };
    },
    async withdrawConsent(entryId, at) {
      const c = active(entryId);
      if (!c) return null;
      c.withdrawnAt = at.toISOString();
      return { ...c };
    },
    consentOf: async (entryId) => {
      const c = active(entryId);
      return c ? { ...c } : null;
    },
    async consentedEntries(rid) {
      const r = must(rid);
      return entries
        .filter((e) => e.raffleId === rid && consentValid(active(e.id), r))
        .map(plainEntry)
        .sort(drawOrder);
    },
    async consentCounts(rid) {
      const r = must(rid);
      const mine = consents.filter((c) => c.raffleId === rid);
      return { given: mine.filter((c) => !c.withdrawnAt).length, valid: mine.filter((c) => consentValid(c, r)).length, withdrawn: mine.filter((c) => c.withdrawnAt).length };
    },
    async createShare(rid, { exact, recipientContactId, fields, entryIds, expiresAt, actor }) {
      const r = must(rid);
      if (!r.sharingVersion || !r.sharePurpose) throw new RaffleRuleError('This raffle does not share contacts with its sponsor.');
      const allowed = new Set(entries.filter((e) => e.raffleId === rid && consentValid(active(e.id), r)).map((e) => e.id));
      const ids = [...new Set(entryIds)].filter((id) => allowed.has(id));
      if (exact && ids.length !== new Set(entryIds).size) throw conflict();
      if (!ids.length) throw new RaffleRuleError('None of the chosen entries has a valid consent now.');
      const s: Share = {
        id: `sh_${++n}`,
        raffleId: rid,
        recipientContactId,
        purpose: r.sharePurpose,
        fields: [...fields],
        entryIds: ids,
        createdAt: now(),
        expiresAt,
        revokedAt: null,
      };
      shares.push(s);
      record(rid, 'shared', actor, { shareId: s.id, recipientContactId, purpose: s.purpose, fields, entryIds: ids, expiresAt });
      return { ...s, fields: [...s.fields], entryIds: [...s.entryIds] };
    },
    getShare: async (id) => {
      const s = shares.find((x) => x.id === id);
      return s ? { ...s, fields: [...s.fields], entryIds: [...s.entryIds] } : null;
    },
    shares: async (rid) =>
      shares
        .filter((s) => s.raffleId === rid)
        .reverse()
        .map((s) => ({ ...s, fields: [...s.fields], entryIds: [...s.entryIds] })),
    async revokeShare(id, actor) {
      const s = shares.find((x) => x.id === id);
      if (!s) throw new RaffleNotFound();
      s.revokedAt ??= now();
      record(s.raffleId, 'share_revoked', actor, { shareId: id });
      return { ...s, fields: [...s.fields], entryIds: [...s.entryIds] };
    },
    async readShare(id, actor, at) {
      const s = shares.find((x) => x.id === id);
      if (!s) throw new RaffleNotFound();
      if (s.revokedAt || at.toISOString() >= s.expiresAt) throw new RaffleRuleError('This share has expired or was withdrawn.');
      const r = must(s.raffleId);
      const rows = entries
        .filter((e) => s.entryIds.includes(e.id) && consentValid(active(e.id), r))
        .sort(drawOrder)
        .map((e) => ({ id: e.id, name: s.fields.includes('name') ? e.name : '', email: s.fields.includes('email') ? e.email : '' }));
      for (const row of rows) {
        const consentId = active(row.id)!.id;
        if (!deliveries.some((d) => d.shareId === id && d.consentId === consentId))
          deliveries.push({ raffleId: s.raffleId, contactId: s.recipientContactId, shareId: id, entryId: row.id, consentId, acknowledged: false });
      }
      record(s.raffleId, 'share_read', actor, { shareId: id, rows: rows.length, entryIds: rows.map((x) => x.id) });
      return { share: { ...s, fields: [...s.fields], entryIds: [...s.entryIds] }, rows };
    },
    dueForErasure: async (at) => [...raffles.values()].filter((r) => !r.erasedAt && r.eraseAfter && r.eraseAfter <= at.toISOString()).map((r) => r.id),
    deletionTasks: async (rid, contact) =>
      deliveries
        .filter((d) => d.raffleId === rid && (!contact || d.contactId === contact) && consents.some((c) => c.id === d.consentId && c.withdrawnAt))
        .map(({ shareId, entryId, consentId, acknowledged }) => ({ shareId, entryId, consentId, acknowledged })),
    acknowledgeDeletion: async (rid, contact, share, consent) => {
      const d = deliveries.find((x) => x.raffleId === rid && x.contactId === contact && x.shareId === share && x.consentId === consent);
      if (!d || !consents.some((c) => c.id === consent && c.withdrawnAt)) return false;
      d.acknowledged = true;
      return true;
    },
    async eraseEntries(rid, actor) {
      const raffle = must(rid);
      if (raffle.erasedAt) return 0;
      save({ ...raffle, erasedAt: now() });
      let count = 0;
      for (const e of entries)
        if (e.raffleId === rid && e.email !== `erased-${e.id}@invalid.invalid`) {
          for (const [key, value] of grants) if (value === e.id) grants.delete(key);
          for (const m of mail.values()) if (m.entryId === e.id) mail.delete(m.key);
          const c = active(e.id);
          if (c) c.withdrawnAt = now();
          Object.assign(e, { tokenHash: '', emailVerifiedAt: null, name: 'Erased', email: `erased-${e.id}@invalid.invalid` });
          count++;
        }
      record(rid, 'entries_erased', actor, { count });
      return count;
    },
  };
}
