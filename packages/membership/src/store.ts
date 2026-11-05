import { checkTransition, TransitionError } from './state.ts';
import type { Actor, EndedReason, Member, MemberEvent, MemberPatch, NewMember, Status } from './types.ts';

export interface TransitionInput {
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
  /** Fails with `DuplicateEmail` if the email exists. */
  create(m: NewMember, actor: Actor): Promise<Member>;
  update(id: string, patch: MemberPatch, actor: Actor): Promise<Member>;
  /** Links Stripe ids. Kept apart from `update` so ordinary edits cannot overwrite them. */
  linkStripe(id: string, ids: { customerId?: string; subscriptionId?: string }, actor: Actor): Promise<Member>;
  transition(id: string, input: TransitionInput): Promise<Member>;
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
      const t = checkTransition(m, input.to, input.actor.kind, input.reason);
      if (members.get(id)!.status !== t.from) throw new TransitionError('The membership changed in the meantime. Look again.', 'conflict');
      record(id, 'status_changed', input.actor, { fromStatus: t.from, toStatus: t.to, payload: { ...input.payload, ...(t.endedReason ? { reason: t.endedReason } : {}) } });
      return save({ ...m, status: t.to, endedReason: t.endedReason });
    },
    events: (id) => Promise.resolve(log.filter((e) => e.memberId === id).map((e) => ({ ...e }))),
  };
}
