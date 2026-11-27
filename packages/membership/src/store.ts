import { checkTransition, TransitionError } from './state.ts';
import type { Actor, Certificate, EndedReason, Member, MemberEvent, MemberPatch, NewMember, Status } from './types.ts';

export interface TransitionInput {
  /**
   * The status the caller saw. When set, the change fails with a `conflict` if the
   * member is no longer in it (a retried webhook, two clicks at once).
   */
  from?: Status;
  to: Status;
  actor: Actor;
  reason?: EndedReason;
  /** Stored on the audit row (e.g. the Stripe subscription id, a Slack message ts). */
  payload?: Record<string, unknown>;
}

/**
 * Where members live. Functions use the Postgres store (Netlify Database,
 * postgres.ts); unit tests use the in-memory one. Every status change goes through
 * `transition`, which writes the new status and the audit row together.
 */
export type MemberDelivery =
  | { kind: 'billing-email'; version: string; email: string }
  | { kind: 'renewal'; subscription: string; reference: string }
  | { kind: 'board'; text: string }
  | { kind: 'email'; to: string; subject: string; html: string; text: string }
  | { kind: 'certificate'; certificateId: string; template: 'membership-welcome' | 'membership-renewed' | 'membership-ported' | 'membership-manual-payment' };

export interface CheckoutAttempt {
  id: string;
  confirmation?: 'paid' | 'automatic';
  customer: string;
  price: string;
  trialEnd: number | null;
  expiresAt: number;
  account: string;
  url: string | null;
}

export interface MemberStore {
  lastEmailChange(id: string): Promise<string | null>;
  linkVerifiedUser(userId: string, email: string): Promise<Member | null>;
  retireSubscription(id: string): Promise<void>;
  retiredSubscription(id: string, sub: string): Promise<boolean>;
  dueResignations(today: string): Promise<Member[]>;
  pendingOperations(): Promise<string[]>;
  transaction<T>(work: (store: MemberStore) => Promise<T>): Promise<T>;
  recordInvoice(memberId: string, invoice: string, subscriptionId: string, outcome: 'paid' | 'failed'): Promise<'apply' | 'settled' | 'conflict'>;
  checkoutAttempt(id: string): Promise<CheckoutAttempt | null>;
  saveCheckoutAttempt(id: string, attempt: CheckoutAttempt): Promise<void>;
  enqueue(memberId: string, operation: string, key: string, payload: MemberDelivery): Promise<void>;
  pendingDeliveries(operation: string): Promise<{ memberId: string; key: string; payload: MemberDelivery }[]>;
  delivered(key: string): Promise<void>;
  stripePrepared(eventId: string, lease: string): Promise<boolean>;
  prepareStripeEvent(eventId: string, lease: string): Promise<void>;
  get(id: string): Promise<Member | null>;
  byEmail(email: string): Promise<Member | null>;
  byUser(userId: string): Promise<Member | null>;
  byStripeSubscription(subscriptionId: string): Promise<Member | null>;
  byStripeCustomer(customerId: string): Promise<Member | null>;
  /** Oldest first, at most 500 (e.g. resignations for the daily check). */
  byStatus(status: Status): Promise<Member[]>;
  /** For the admin area: newest first; `q` matches name, email or organisation (case-insensitive). */
  search(filter: { q?: string; status?: Status; limit?: number }): Promise<Member[]>;
  /** How many members there are in each status, over every row (statuses with none are left out). */
  statusCounts(): Promise<Partial<Record<Status, number>>>;
  /** Fails with `DuplicateEmail` if the email exists. */
  create(m: NewMember, actor: Actor): Promise<Member>;
  update(id: string, patch: MemberPatch, actor: Actor): Promise<Member>;
  changeEmail(id: string, email: string, actor: Actor): Promise<Member>;
  /** Links Stripe ids. Kept apart from `update` so ordinary edits cannot overwrite them. */
  linkStripe(id: string, ids: { customerId?: string; subscriptionId?: string }, actor: Actor): Promise<Member>;
  transition(id: string, input: TransitionInput): Promise<Member>;
  /**
   * The board confirms a resignation (sets `resignationConfirmedAt`). Only while
   * `resigning`, else a `conflict`; confirming again returns the member unchanged.
   */
  confirmResignation(id: string, actor: Actor, payload?: Record<string, unknown>): Promise<Member>;
  /** Records that the member accepted a version of the membership terms (append-only). */
  acceptTerms(id: string, version: string, actor: Actor): Promise<void>;
  /** The latest terms version the member accepted, or null. */
  acceptedTerms(id: string): Promise<string | null>;
  /**
   * Issues the certificate for a paid term. Idempotent on the Stripe invoice:
   * a retried webhook gets the certificate that already exists.
   */
  issueCertificate(id: string, term: { periodStart: string; periodEnd: string; stripeInvoiceId: string | null }, actor: Actor): Promise<Certificate>;
  /** Newest first. */
  certificates(id: string): Promise<Certificate[]>;
  /**
   * Claims a Stripe webhook event before handling it, so two deliveries at once (a retry, or the
   * old and the shared endpoint) never both run it. `done`: handled before. `busy`: another
   * delivery holds the claim (younger than `CLAIM_TTL_MS`). A claim older than that is taken over.
   */
  claimStripeEvent(eventId: string, type: string): Promise<{ lease: string } | 'done' | 'busy'>;
  /** Marks a claimed event as handled (after it succeeded). */
  markStripeEvent(eventId: string, lease: string): Promise<void>;
  /** Gives a claim back after a failure, so Stripe's retry can run the event again at once. */
  releaseStripeEvent(eventId: string, lease: string): Promise<void>;
  events(id: string): Promise<MemberEvent[]>;
  /** Appends a row to the audit log that changes nothing else (e.g. a refund the board must look at). */
  logEvent(id: string, type: string, actor: Actor, payload: Record<string, unknown>): Promise<void>;
}

export class DuplicateEmail extends Error {
  constructor(email: string) {
    super(`A member with ${email} already exists.`);
    this.name = 'DuplicateEmail';
  }
}

export class MemberNotFound extends Error {
  constructor(id: string) {
    super(`No member ${id}.`);
    this.name = 'MemberNotFound';
  }
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

/** How long a claimed Stripe event stays claimed without being marked handled (a function timed out). */
export const CLAIM_TTL_MS = 2 * 60_000;

/** In-memory store with the same rules as the database (unique email, append-only events). */
export function memoryStore(opts: { now?: () => Date; id?: () => string } = {}): MemberStore & { all(): Member[] } {
  const now = opts.now ?? (() => new Date());
  let n = 0;
  const nextId = opts.id ?? (() => `m_${++n}`);
  const members = new Map<string, Member>();
  const log: MemberEvent[] = [];
  const acceptances: { memberId: string; version: string; at: string }[] = [];
  const certs: Certificate[] = [];
  const stripeEvents = new Map<string, { claimedAt: number | null; done: boolean; lease: string; prepared: boolean }>();

  const outcomes = new Map<string, { memberId: string; subscriptionId: string; outcome: 'paid' | 'failed' }>();
  const retired = new Set<string>();
  const attempts = new Map<string, CheckoutAttempt>();
  const deliveries = new Map<string, { memberId: string; operation: string; payload: MemberDelivery | null }>();
  let tail = Promise.resolve();
  function owned(id: string, lease: string) {
    const event = stripeEvents.get(id);
    if (!event || event.lease !== lease || event.done) throw new Error('Membership event lease expired.');
    return event;
  }

  const record = (memberId: string, type: string, actor: Actor, extra: Partial<MemberEvent> = {}) =>
    log.push({ id: `e_${log.length + 1}`, memberId, type, fromStatus: null, toStatus: null, actor, payload: {}, at: now().toISOString(), ...extra });

  const must = (id: string) => {
    const m = members.get(id);
    if (!m) throw new MemberNotFound(id);
    return m;
  };

  const save = (m: Member) => {
    const saved = { ...m, updatedAt: now().toISOString() };
    members.set(m.id, saved);
    return { ...saved };
  };

  const find = (pred: (m: Member) => boolean) => {
    const m = [...members.values()].find(pred);
    return Promise.resolve(m ? { ...m } : null);
  };

  return {
    transaction(work) {
      const result = tail.then(async () => {
        const backup = structuredClone({ members, certs, log, deliveries, attempts, outcomes });
        try {
          return await work(this);
        } catch (error) {
          members.clear();
          for (const [id, member] of backup.members) members.set(id, member);
          certs.splice(0, certs.length, ...backup.certs);
          log.splice(0, log.length, ...backup.log);
          deliveries.clear();
          for (const [key, delivery] of backup.deliveries) deliveries.set(key, delivery);
          outcomes.clear();
          for (const [invoice, outcome] of backup.outcomes) outcomes.set(invoice, outcome);
          attempts.clear();
          for (const [id, attempt] of backup.attempts) attempts.set(id, attempt);
          throw error;
        }
      });
      tail = result.then(
        () => {},
        () => {},
      );
      return result;
    },
    async lastEmailChange(id) {
      return log.filter((e) => e.memberId === id && e.type === 'email_changed').at(-1)?.id ?? null;
    },
    async linkVerifiedUser(userId, email) {
      const m = [...members.values()].find((m) => m.email === normaliseEmail(email) && (m.userId === null || m.userId === userId));
      if (!m) return null;
      if (!m.userId) record(m.id, 'updated', { kind: 'member', id: userId }, { payload: { fields: ['user_id'] } });
      return save({ ...m, userId });
    },
    async retireSubscription(id) {
      const m = must(id);
      if (m.stripeSubscriptionId) retired.add(m.stripeSubscriptionId);
      save({ ...m, stripeSubscriptionId: null });
      attempts.delete(id);
    },
    async retiredSubscription(_id, sub) {
      return retired.has(sub);
    },
    async dueResignations(today) {
      return [...members.values()]
        .filter((m) => m.status === 'resigning' && m.paymentMode === 'manual' && m.resignationConfirmedAt && m.paidUntil && m.paidUntil <= today)
        .slice(0, 100);
    },
    async pendingOperations() {
      return [...new Set([...deliveries.values()].filter((d) => d.payload).map((d) => d.operation))];
    },
    async recordInvoice(memberId, invoice, subscriptionId, outcome) {
      const prior = outcomes.get(invoice);
      if (prior && (prior.memberId !== memberId || prior.subscriptionId !== subscriptionId)) return 'conflict';
      const certificate = certs.find((c) => c.stripeInvoiceId === invoice);
      if (certificate && certificate.memberId !== memberId) return 'conflict';
      if (prior?.outcome === 'paid') return 'settled';
      outcomes.set(invoice, { memberId, subscriptionId, outcome });
      return 'apply';
    },
    async checkoutAttempt(id) {
      return attempts.get(id) ?? null;
    },
    async saveCheckoutAttempt(id, attempt) {
      attempts.set(id, attempt);
    },
    async enqueue(memberId, operation, key, payload) {
      if (!deliveries.has(key)) deliveries.set(key, { memberId, operation, payload });
    },
    async pendingDeliveries(operation) {
      return [...deliveries].flatMap(([key, row]) => (row.operation === operation && row.payload ? [{ memberId: row.memberId, key, payload: row.payload }] : []));
    },
    async delivered(key) {
      const row = deliveries.get(key);
      if (row) row.payload = null;
    },
    async stripePrepared(id, lease) {
      return owned(id, lease).prepared;
    },
    async prepareStripeEvent(id, lease) {
      owned(id, lease).prepared = true;
    },
    all: () => [...members.values()].map((m) => ({ ...m })),
    get: (id) => Promise.resolve(members.has(id) ? { ...members.get(id)! } : null),
    byEmail: (email) => find((m) => m.email === normaliseEmail(email)),
    byUser: (uid) => find((m) => m.userId === uid),
    byStripeSubscription: (sid) => find((m) => m.stripeSubscriptionId === sid),
    byStripeCustomer: (cid) => find((m) => m.stripeCustomerId === cid),
    byStatus: (status) => Promise.resolve([...members.values()].filter((m) => m.status === status).map((m) => ({ ...m }))),
    search: ({ q, status, limit = 200 }) => {
      const needle = q?.trim().toLowerCase();
      return Promise.resolve(
        [...members.values()]
          .filter((m) => (!status || m.status === status) && (!needle || [m.name, m.email, m.organisationName ?? ''].some((v) => v.toLowerCase().includes(needle))))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, limit)
          .map((m) => ({ ...m })),
      );
    },
    statusCounts: async () => {
      const counts: Partial<Record<Status, number>> = {};
      for (const m of members.values()) counts[m.status] = (counts[m.status] ?? 0) + 1;
      return counts;
    },
    async create(input, actor) {
      const email = normaliseEmail(input.email);
      if ([...members.values()].some((m) => m.email === email)) throw new DuplicateEmail(email);
      const at = now().toISOString();
      const m: Member = {
        userId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        ...input,
        email,
        endedReason: null,
        resignedAt: null,
        resignationConfirmedAt: null,
        id: nextId(),
        createdAt: at,
        updatedAt: at,
      };
      members.set(m.id, m);
      record(m.id, 'created', actor, { toStatus: m.status, payload: { source: m.source } });
      return { ...m };
    },
    async update(id, patch, actor) {
      const m = must(id);
      record(id, 'updated', actor, { payload: { fields: Object.keys(patch) } });
      return save({ ...m, ...patch });
    },
    async changeEmail(id, input, actor) {
      const m = must(id);
      const email = normaliseEmail(input);
      if ([...members.values()].some((x) => x.email === email && x.id !== id)) throw new DuplicateEmail(email);
      record(id, 'email_changed', actor);
      return save({ ...m, email, userId: null });
    },
    async linkStripe(id, ids, actor) {
      const m = must(id);
      record(id, 'stripe_linked', actor, { payload: { ...ids } });
      return save({ ...m, stripeCustomerId: ids.customerId ?? m.stripeCustomerId, stripeSubscriptionId: ids.subscriptionId ?? m.stripeSubscriptionId });
    },
    async transition(id, input) {
      const m = must(id);
      if (input.from && m.status !== input.from) throw new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
      const t = checkTransition(m, input.to, input.actor.kind, input.reason);
      record(id, 'status_changed', input.actor, { fromStatus: t.from, toStatus: t.to, payload: { ...input.payload, ...(t.endedReason ? { reason: t.endedReason } : {}) } });
      // As member_transition: set on resigning, kept when it ends, cleared otherwise (an undo).
      const resignedAt = t.to === 'resigning' ? now().toISOString() : t.to === 'ended' ? m.resignedAt : null;
      const resignationConfirmedAt = t.to === 'ended' ? m.resignationConfirmedAt : null;
      return save({ ...m, status: t.to, endedReason: t.endedReason, resignedAt, resignationConfirmedAt });
    },
    async confirmResignation(id, actor, payload = {}) {
      const m = must(id);
      if (m.status !== 'resigning') throw new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
      if (m.resignationConfirmedAt) return { ...m };
      record(id, 'resignation_confirmed', actor, { payload });
      return save({ ...m, resignationConfirmedAt: now().toISOString() });
    },
    async acceptTerms(id, version, actor) {
      must(id);
      acceptances.push({ memberId: id, version, at: now().toISOString() });
      record(id, 'terms_accepted', actor, { payload: { version } });
    },
    acceptedTerms: (id) => Promise.resolve(acceptances.filter((a) => a.memberId === id).at(-1)?.version ?? null),
    async issueCertificate(id, term, actor) {
      const m = must(id);
      const existing = term.stripeInvoiceId ? certs.find((c) => c.stripeInvoiceId === term.stripeInvoiceId) : undefined;
      if (existing) return { ...existing };
      const c: Certificate = {
        id: `c_${certs.length + 1}`,
        memberId: id,
        number: `ZJS-${term.periodStart.slice(0, 4)}-${String(certs.length + 1).padStart(4, '0')}`,
        level: m.level,
        periodStart: term.periodStart,
        periodEnd: term.periodEnd,
        stripeInvoiceId: term.stripeInvoiceId,
        issuedAt: now().toISOString(),
        name: m.name,
        organisationName: m.organisationName,
      };
      certs.push(c);
      record(id, 'certificate_issued', actor, { payload: { number: c.number, ...(c.stripeInvoiceId ? { invoice: c.stripeInvoiceId } : {}) } });
      return { ...c };
    },
    certificates: (id) =>
      Promise.resolve(
        certs
          .filter((c) => c.memberId === id)
          .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
          .map((c) => ({ ...c })),
      ),
    async claimStripeEvent(eventId) {
      const e = stripeEvents.get(eventId);
      if (e?.done) return 'done';
      const at = now().getTime();
      if (e?.claimedAt && at - e.claimedAt < CLAIM_TTL_MS) return 'busy';
      const lease = crypto.randomUUID();
      stripeEvents.set(eventId, { claimedAt: at, done: false, lease, prepared: e?.prepared ?? false });
      return { lease };
    },
    async markStripeEvent(id, lease) {
      owned(id, lease).done = true;
    },
    async releaseStripeEvent(id, lease) {
      const e = stripeEvents.get(id);
      if (e?.lease === lease && !e.done) {
        e.claimedAt = null;
        e.lease = '';
      }
    },
    events: (id) => Promise.resolve(log.filter((e) => e.memberId === id).map((e) => ({ ...e }))),
    async logEvent(id, type, actor, payload) {
      must(id);
      record(id, type, actor, { payload });
    },
  };
}
