import { checkTransition, TransitionError } from './state.ts';
import type { Actor, EndedReason, Member, MemberEvent, MemberPatch, NewMember, Status } from './types.ts';

export interface TransitionInput {
  /**
   * The status the caller saw. When set, the change fails with a `conflict` if the
   * member is no longer in it (a stale Slack card, two approvers at once).
   */
  from?: Status;
  to: Status;
  actor: Actor;
  reason?: EndedReason;
  /** Stored on the audit row (e.g. the Stripe subscription id, a Slack message ts). */
  payload?: Record<string, unknown>;
}

/**
 * Where members live. Functions use the Supabase store (service role); tests
 * and local runs use the in-memory one. Every status change goes through
 * `transition`, which writes the new status and the audit row together.
 */
export interface MemberStore {
  get(id: string): Promise<Member | null>;
  byEmail(email: string): Promise<Member | null>;
  byAuthUser(authUserId: string): Promise<Member | null>;
  byStripeSubscription(subscriptionId: string): Promise<Member | null>;
  /** Oldest first, at most 200 (e.g. the applications waiting for review). */
  byStatus(status: Status): Promise<Member[]>;
  /** Fails with `DuplicateEmail` if the email exists. */
  create(m: NewMember, actor: Actor): Promise<Member>;
  update(id: string, patch: MemberPatch, actor: Actor): Promise<Member>;
  /** Links Stripe ids. Kept apart from `update` so ordinary edits cannot overwrite them. */
  linkStripe(id: string, ids: { customerId?: string; subscriptionId?: string }, actor: Actor): Promise<Member>;
  transition(id: string, input: TransitionInput): Promise<Member>;
  /** Records that the member accepted a version of the membership terms (append-only). */
  acceptTerms(id: string, version: string, actor: Actor): Promise<void>;
  /** The latest terms version the member accepted, or null. */
  acceptedTerms(id: string): Promise<string | null>;
  events(id: string): Promise<MemberEvent[]>;
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

/** In-memory store with the same rules as the database (unique email, append-only events). */
export function memoryStore(opts: { now?: () => Date; id?: () => string } = {}): MemberStore & { all(): Member[] } {
  const now = opts.now ?? (() => new Date());
  let n = 0;
  const nextId = opts.id ?? (() => `m_${++n}`);
  const members = new Map<string, Member>();
  const log: MemberEvent[] = [];
  const acceptances: { memberId: string; version: string; at: string }[] = [];

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
    all: () => [...members.values()].map((m) => ({ ...m })),
    get: (id) => Promise.resolve(members.has(id) ? { ...members.get(id)! } : null),
    byEmail: (email) => find((m) => m.email === normaliseEmail(email)),
    byAuthUser: (uid) => find((m) => m.authUserId === uid),
    byStripeSubscription: (sid) => find((m) => m.stripeSubscriptionId === sid),
    byStatus: (status) => Promise.resolve([...members.values()].filter((m) => m.status === status).map((m) => ({ ...m }))),
    async create(input, actor) {
      const email = normaliseEmail(input.email);
      if ([...members.values()].some((m) => m.email === email)) throw new DuplicateEmail(email);
      const at = now().toISOString();
      const m: Member = { authUserId: null, stripeCustomerId: null, stripeSubscriptionId: null, ...input, email, endedReason: null, id: nextId(), createdAt: at, updatedAt: at };
      members.set(m.id, m);
      record(m.id, 'created', actor, { toStatus: m.status, payload: { source: m.source } });
      return { ...m };
    },
    async update(id, patch, actor) {
      const m = must(id);
      record(id, 'updated', actor, { payload: { fields: Object.keys(patch) } });
      return save({ ...m, ...patch });
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
      return save({ ...m, status: t.to, endedReason: t.endedReason });
    },
    async acceptTerms(id, version, actor) {
      must(id);
      acceptances.push({ memberId: id, version, at: now().toISOString() });
      record(id, 'terms_accepted', actor, { payload: { version } });
    },
    acceptedTerms: (id) => Promise.resolve(acceptances.filter((a) => a.memberId === id).at(-1)?.version ?? null),
    events: (id) => Promise.resolve(log.filter((e) => e.memberId === id).map((e) => ({ ...e }))),
  };
}
