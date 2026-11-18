import { checkTransition, TransitionError } from './state.ts';
import type {
  Actor,
  Agreement,
  Contact,
  EndedReason,
  Logo,
  LogoReview,
  NewContact,
  NewSponsor,
  Proposal,
  ProposalStatus,
  Sponsor,
  SponsorEvent,
  SponsorPatch,
  Status,
} from './types.ts';

export interface TransitionInput {
  /** The status the caller saw: a different one now is a `conflict` (double click, retried webhook). */
  from?: Status;
  to: Status;
  actor: Actor;
  reason?: EndedReason;
  /** With `to: 'ending'`: the first day without the sponsorship. */
  endsAt?: string | null;
  payload?: Record<string, unknown>;
}

export type NewAgreement = Omit<Agreement, 'id' | 'sponsorId' | 'acceptedAt'>;
export type NewProposal = Pick<Proposal, 'kind' | 'tier' | 'cycle' | 'message' | 'expiresAt'>;
export type NewLogo = Pick<Logo, 'blobKey' | 'contentType' | 'bytes' | 'filename' | 'uploadedBy'>;

/**
 * Where sponsors live: Postgres in functions (postgres.ts), memory in tests. Every
 * change writes its audit row in the same statement.
 */
export interface SponsorStore {
  get(id: string): Promise<Sponsor | null>;
  byStripeSubscription(id: string): Promise<Sponsor | null>;
  /** Newest first; `q` matches the company, legal name or a contact's name or email. */
  search(filter: { q?: string; status?: Status; limit?: number }): Promise<Sponsor[]>;
  /** A sponsor with its first contact. Fails with DuplicateContact when the email belongs to a sponsor already. */
  create(s: NewSponsor, contact: NewContact, actor: Actor): Promise<{ sponsor: Sponsor; contact: Contact }>;
  update(id: string, patch: SponsorPatch, actor: Actor): Promise<Sponsor>;
  linkStripe(id: string, ids: { customerId?: string; subscriptionId?: string }, actor: Actor): Promise<Sponsor>;
  transition(id: string, input: TransitionInput): Promise<Sponsor>;

  contacts(sponsorId: string): Promise<Contact[]>;
  contactByUser(userId: string): Promise<Contact | null>;
  contactByEmail(email: string): Promise<Contact | null>;
  addContact(sponsorId: string, c: NewContact, actor: Actor): Promise<Contact>;
  /** Links a contact to the account that signed in with its email (first sign-in). */
  linkContact(contactId: string, userId: string): Promise<Contact>;
  removeContact(contactId: string, actor: Actor): Promise<void>;

  acceptAgreement(sponsorId: string, a: NewAgreement, actor: Actor): Promise<Agreement>;
  /** Newest first. */
  agreements(sponsorId: string): Promise<Agreement[]>;

  /** Fails with ProposalOpen while another proposal waits for an answer. */
  propose(sponsorId: string, p: NewProposal, actor: Actor): Promise<Proposal>;
  getProposal(id: string): Promise<Proposal | null>;
  /** Newest first. */
  proposals(sponsorId: string): Promise<Proposal[]>;
  /** Only from `open` (compare-and-set): a second answer is a `conflict`. */
  decideProposal(id: string, to: Exclude<ProposalStatus, 'open'>, by: string, actor: Actor): Promise<Proposal>;

  addLogo(sponsorId: string, logo: NewLogo, actor: Actor): Promise<Logo>;
  getLogo(id: string): Promise<Logo | null>;
  /** Newest first. */
  logos(sponsorId: string): Promise<Logo[]>;
  reviewLogo(id: string, review: Exclude<LogoReview, 'pending'>, note: string | null, actor: Actor): Promise<Logo>;

  stripeEventSeen(eventId: string): Promise<boolean>;
  markStripeEvent(eventId: string, type: string): Promise<void>;
  /** Oldest first. */
  events(sponsorId: string): Promise<SponsorEvent[]>;
}

export class DuplicateContact extends Error {
  constructor(email: string) {
    super(`${email} is already a contact of a sponsor.`);
    this.name = 'DuplicateContact';
  }
}

export class ProposalOpen extends Error {
  constructor() {
    super('A proposal is already waiting for an answer. Withdraw it first.');
    this.name = 'ProposalOpen';
  }
}

export class NotFound extends Error {
  constructor(what: string) {
    super(`No ${what}.`);
    this.name = 'NotFound';
  }
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();

const conflict = () => new TransitionError('The sponsorship changed in the meantime. Look again.', 'conflict');

/** Status columns as `transition` writes them, shared by both stores. */
export function transitionFields(s: Sponsor, to: Status, endedReason: EndedReason | null, endsAt: string | null | undefined, nowIso: string) {
  return {
    status: to,
    endedReason,
    endRequestedAt: to === 'ending' ? nowIso : to === 'ended' ? s.endRequestedAt : null,
    endsAt: to === 'ending' ? (endsAt ?? null) : to === 'ended' ? s.endsAt : null,
  };
}

/** In-memory store with the same rules as the database. */
export function memoryStore(opts: { now?: () => Date } = {}): SponsorStore & { all(): Sponsor[] } {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  let n = 0;
  const id = (p: string) => `${p}_${++n}`;
  const sponsors = new Map<string, Sponsor>();
  const contacts = new Map<string, Contact>();
  const agreements: Agreement[] = [];
  const proposals = new Map<string, Proposal>();
  const logos = new Map<string, Logo>();
  const log: SponsorEvent[] = [];
  const stripeEvents = new Set<string>();

  const record = (sponsorId: string, type: string, actor: Actor, extra: Partial<SponsorEvent> = {}) =>
    log.push({ id: `e_${log.length + 1}`, sponsorId, type, fromStatus: null, toStatus: null, actor, payload: {}, at: now(), ...extra });
  const must = (sid: string) => {
    const s = sponsors.get(sid);
    if (!s) throw new NotFound('sponsor');
    return s;
  };
  const save = (s: Sponsor) => {
    const saved = { ...s, updatedAt: now() };
    sponsors.set(s.id, saved);
    return { ...saved };
  };
  const emailTaken = (email: string) => [...contacts.values()].some((c) => c.email === email);
  const newest = <T extends { createdAt?: string; acceptedAt?: string; uploadedAt?: string }>(a: T[]) => [...a].reverse();

  return {
    all: () => [...sponsors.values()].map((s) => ({ ...s })),
    get: async (sid) => (sponsors.has(sid) ? { ...sponsors.get(sid)! } : null),
    byStripeSubscription: async (sub) => {
      const s = [...sponsors.values()].find((x) => x.stripeSubscriptionId === sub);
      return s ? { ...s } : null;
    },
    search: async ({ q, status, limit = 200 }) => {
      const needle = q?.trim().toLowerCase();
      const hit = (s: Sponsor) =>
        !needle ||
        [s.companyName, s.legalName ?? ''].some((v) => v.toLowerCase().includes(needle)) ||
        [...contacts.values()].some((c) => c.sponsorId === s.id && (c.name.toLowerCase().includes(needle) || c.email.includes(needle)));
      return [...sponsors.values()]
        .filter((s) => (!status || s.status === status) && hit(s))
        .reverse()
        .slice(0, limit)
        .map((s) => ({ ...s }));
    },
    async create(input, c, actor) {
      const email = normaliseEmail(c.email);
      if (emailTaken(email)) throw new DuplicateContact(email);
      const at = now();
      const s: Sponsor = {
        ...input,
        id: id('s'),
        endedReason: null,
        partnerId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        endRequestedAt: null,
        endsAt: null,
        createdAt: at,
        updatedAt: at,
      };
      sponsors.set(s.id, s);
      const contact: Contact = { id: id('c'), sponsorId: s.id, email, name: c.name, role: c.role, userId: null, createdAt: at };
      contacts.set(contact.id, contact);
      record(s.id, 'created', actor, { toStatus: s.status, payload: { source: s.source } });
      return { sponsor: { ...s }, contact: { ...contact } };
    },
    async update(sid, patch, actor) {
      const s = must(sid);
      record(sid, 'updated', actor, { payload: { fields: Object.keys(patch) } });
      return save({ ...s, ...patch });
    },
    async linkStripe(sid, ids, actor) {
      const s = must(sid);
      record(sid, 'stripe_linked', actor, { payload: { ...ids } });
      return save({ ...s, stripeCustomerId: ids.customerId ?? s.stripeCustomerId, stripeSubscriptionId: ids.subscriptionId ?? s.stripeSubscriptionId });
    },
    async transition(sid, input) {
      const s = must(sid);
      if (input.from && s.status !== input.from) throw conflict();
      const t = checkTransition(s, input.to, input.actor.kind, input.reason);
      record(sid, 'status_changed', input.actor, {
        fromStatus: t.from,
        toStatus: t.to,
        payload: { ...input.payload, ...(t.endedReason ? { reason: t.endedReason } : {}), ...(input.endsAt ? { endsAt: input.endsAt } : {}) },
      });
      return save({ ...s, ...transitionFields(s, t.to, t.endedReason, input.endsAt, now()) });
    },
    contacts: async (sid) => [...contacts.values()].filter((c) => c.sponsorId === sid).map((c) => ({ ...c })),
    contactByUser: async (uid) => {
      const c = [...contacts.values()].find((x) => x.userId === uid);
      return c ? { ...c } : null;
    },
    contactByEmail: async (email) => {
      const c = [...contacts.values()].find((x) => x.email === normaliseEmail(email));
      return c ? { ...c } : null;
    },
    async addContact(sid, c, actor) {
      must(sid);
      const email = normaliseEmail(c.email);
      if (emailTaken(email)) throw new DuplicateContact(email);
      const contact: Contact = { id: id('c'), sponsorId: sid, email, name: c.name, role: c.role, userId: null, createdAt: now() };
      contacts.set(contact.id, contact);
      record(sid, 'contact_added', actor, { payload: { contactId: contact.id, role: c.role } });
      return { ...contact };
    },
    async linkContact(cid, userId) {
      const c = contacts.get(cid);
      if (!c) throw new NotFound('contact');
      const linked = { ...c, userId };
      contacts.set(cid, linked);
      return { ...linked };
    },
    async removeContact(cid, actor) {
      const c = contacts.get(cid);
      if (!c) throw new NotFound('contact');
      contacts.delete(cid);
      record(c.sponsorId, 'contact_removed', actor, { payload: { contactId: cid } });
    },
    async acceptAgreement(sid, a, actor) {
      must(sid);
      const ag: Agreement = { ...a, id: id('a'), sponsorId: sid, acceptedAt: now() };
      agreements.push(ag);
      record(sid, 'agreement_accepted', actor, { payload: { version: a.version, context: a.context } });
      return { ...ag };
    },
    agreements: async (sid) => newest(agreements.filter((a) => a.sponsorId === sid)).map((a) => ({ ...a })),
    async propose(sid, p, actor) {
      must(sid);
      if ([...proposals.values()].some((x) => x.sponsorId === sid && x.status === 'open')) throw new ProposalOpen();
      const pr: Proposal = { ...p, id: id('p'), sponsorId: sid, status: 'open', createdBy: actor.id, createdAt: now(), decidedBy: null, decidedAt: null };
      proposals.set(pr.id, pr);
      record(sid, 'proposal_created', actor, { payload: { proposalId: pr.id, kind: p.kind, tier: p.tier, cycle: p.cycle } });
      return { ...pr };
    },
    getProposal: async (pid) => (proposals.has(pid) ? { ...proposals.get(pid)! } : null),
    proposals: async (sid) => newest([...proposals.values()].filter((p) => p.sponsorId === sid)).map((p) => ({ ...p })),
    async decideProposal(pid, to, by, actor) {
      const p = proposals.get(pid);
      if (!p) throw new NotFound('proposal');
      if (p.status !== 'open') throw conflict();
      const decided = { ...p, status: to, decidedBy: by, decidedAt: now() };
      proposals.set(pid, decided);
      record(p.sponsorId, `proposal_${to}`, actor, { payload: { proposalId: pid } });
      return { ...decided };
    },
    async addLogo(sid, l, actor) {
      must(sid);
      const logo: Logo = { ...l, id: id('l'), sponsorId: sid, uploadedAt: now(), review: 'pending', reviewNote: null, reviewedAt: null };
      logos.set(logo.id, logo);
      record(sid, 'logo_uploaded', actor, { payload: { logoId: logo.id } });
      return { ...logo };
    },
    getLogo: async (lid) => (logos.has(lid) ? { ...logos.get(lid)! } : null),
    logos: async (sid) => newest([...logos.values()].filter((l) => l.sponsorId === sid)).map((l) => ({ ...l })),
    async reviewLogo(lid, review, note, actor) {
      const l = logos.get(lid);
      if (!l) throw new NotFound('logo');
      const done = { ...l, review, reviewNote: note, reviewedAt: now() };
      logos.set(lid, done);
      record(l.sponsorId, `logo_${review}`, actor, { payload: { logoId: lid } });
      return { ...done };
    },
    stripeEventSeen: async (e) => stripeEvents.has(e),
    markStripeEvent: async (e) => void stripeEvents.add(e),
    events: async (sid) => log.filter((e) => e.sponsorId === sid).map((e) => ({ ...e })),
  };
}
