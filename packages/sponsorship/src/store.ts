import { checkTransition, TransitionError } from './state.ts';
import type {
  Actor,
  Agreement,
  Contact,
  CoverageRow,
  EndedReason,
  Logo,
  NewContact,
  NewSponsor,
  Sponsor,
  SponsorDocument,
  SponsorEvent,
  SponsorMeetup,
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

/** Stripe links. A key that is present is written (null clears it); a missing key is kept. */
export interface StripeLinks {
  customerId?: string;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
  paymentLinkId?: string | null;
  paymentLinkUrl?: string | null;
}

export type NewAgreement = Omit<Agreement, 'id' | 'sponsorId' | 'acceptedAt'>;
export type NewLogo = Pick<Logo, 'blobKey' | 'contentType' | 'bytes' | 'filename' | 'uploadedBy'>;
export type NewDocument = Pick<SponsorDocument, 'blobKey' | 'filename' | 'bytes' | 'signedOn' | 'uploadedBy'>;

/**
 * Where sponsors live: Postgres in functions (postgres.ts), memory in tests. Every
 * change writes its audit row in the same statement.
 */
export interface SponsorStore {
  get(id: string): Promise<Sponsor | null>;
  byStripeSubscription(id: string): Promise<Sponsor | null>;
  byPaymentLink(id: string): Promise<Sponsor | null>;
  /** Newest first; `q` matches the company or legal name only (never contact details). */
  search(filter: { q?: string; status?: Status; limit?: number }): Promise<Sponsor[]>;
  /** A sponsor with its first contact. Fails with DuplicateContact when the email belongs to a sponsor already. */
  create(s: NewSponsor, contact: NewContact, actor: Actor): Promise<{ sponsor: Sponsor; contact: Contact }>;
  update(id: string, patch: SponsorPatch, actor: Actor): Promise<Sponsor>;
  linkStripe(id: string, links: StripeLinks, actor: Actor): Promise<Sponsor>;
  transition(id: string, input: TransitionInput): Promise<Sponsor>;

  /** The meetups the sponsorship covers now, by date (rows taken off are left out). */
  meetups(sponsorId: string): Promise<SponsorMeetup[]>;
  /**
   * Makes the covered meetups exactly `meetups` (the board moves or bundles them; a sponsor picks
   * one). Meetups not in the list are taken off, not deleted.
   */
  setMeetups(sponsorId: string, meetups: SponsorMeetup[], actor: Actor): Promise<SponsorMeetup[]>;
  /** Every coverage row, taken-off ones included, by date. */
  coverage(sponsorId: string): Promise<CoverageRow[]>;
  /** Confirms one covered meetup (again, if it had been taken off). Returns the rows covered now. */
  cover(sponsorId: string, meetup: SponsorMeetup, actor: Actor): Promise<SponsorMeetup[]>;
  /** Takes one meetup off; its row stays, with when and by whom. Returns the rows covered now. */
  uncover(sponsorId: string, eventId: string, actor: Actor): Promise<SponsorMeetup[]>;

  contacts(sponsorId: string): Promise<Contact[]>;
  contactByUser(userId: string): Promise<Contact | null>;
  contactByEmail(email: string): Promise<Contact | null>;
  addContact(sponsorId: string, c: NewContact, actor: Actor): Promise<Contact>;
  /** Links a contact to the account that signed in with its email. */
  linkContact(contactId: string, userId: string): Promise<Contact>;
  removeContact(contactId: string, actor: Actor): Promise<void>;

  acceptAgreement(sponsorId: string, a: NewAgreement, actor: Actor): Promise<Agreement>;
  /** Newest first. */
  agreements(sponsorId: string): Promise<Agreement[]>;

  addLogo(sponsorId: string, logo: NewLogo, actor: Actor): Promise<Logo>;
  getLogo(id: string): Promise<Logo | null>;
  /** Newest first. */
  logos(sponsorId: string): Promise<Logo[]>;

  addDocument(sponsorId: string, doc: NewDocument, actor: Actor): Promise<SponsorDocument>;
  getDocument(id: string): Promise<SponsorDocument | null>;
  /** Newest first. */
  documents(sponsorId: string): Promise<SponsorDocument[]>;

  stripeEventSeen(eventId: string): Promise<boolean>;
  markStripeEvent(eventId: string, type: string): Promise<void>;
  /** Oldest first. */
  events(sponsorId: string): Promise<SponsorEvent[]>;
  /** Appends a note to the audit log (e.g. a payment the board recorded, a change link sent). */
  log(sponsorId: string, type: string, actor: Actor, payload?: Record<string, unknown>): Promise<void>;
}

export class DuplicateContact extends Error {
  constructor(email: string) {
    super(`${email} is already a contact of a sponsor.`);
    this.name = 'DuplicateContact';
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

const byDate = (a: SponsorMeetup, b: SponsorMeetup) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId);
const plain = ({ eventId, title, date }: SponsorMeetup): SponsorMeetup => ({ eventId, title, date });

/** In-memory store with the same rules as the database. */
export function memoryStore(opts: { now?: () => Date } = {}): SponsorStore & { all(): Sponsor[] } {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  let n = 0;
  const id = (p: string) => `${p}_${++n}`;
  const sponsors = new Map<string, Sponsor>();
  const coverage = new Map<string, Map<string, CoverageRow>>();
  const contacts = new Map<string, Contact>();
  const agreements: Agreement[] = [];
  const logos = new Map<string, Logo>();
  const documents = new Map<string, SponsorDocument>();
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
  const findBy = async (pred: (s: Sponsor) => boolean) => {
    const s = [...sponsors.values()].find(pred);
    return s ? { ...s } : null;
  };
  const rowsOf = (sid: string) => {
    if (!coverage.has(sid)) coverage.set(sid, new Map());
    return coverage.get(sid)!;
  };
  const covered = async (sid: string) =>
    [...rowsOf(sid).values()]
      .filter((r) => !r.removedAt)
      .map(plain)
      .sort(byDate);
  /** Adds or refreshes a row; a row taken off is confirmed again by this actor. */
  const put = (rows: Map<string, CoverageRow>, m: SponsorMeetup, actor: Actor) => {
    const r = rows.get(m.eventId);
    const fresh = !r || r.removedAt;
    rows.set(m.eventId, { ...m, confirmedAt: fresh ? now() : r.confirmedAt, confirmedBy: fresh ? actor.kind : r.confirmedBy, removedAt: null, removedBy: null });
  };

  return {
    all: () => [...sponsors.values()].map((s) => ({ ...s })),
    get: async (sid) => (sponsors.has(sid) ? { ...sponsors.get(sid)! } : null),
    byStripeSubscription: (sub) => findBy((x) => x.stripeSubscriptionId === sub),
    byPaymentLink: (pl) => findBy((x) => x.paymentLinkId === pl),
    search: async ({ q, status, limit = 200 }) => {
      const needle = q?.trim().toLowerCase();
      return [...sponsors.values()]
        .filter((s) => (!status || s.status === status) && (!needle || [s.companyName, s.legalName ?? ''].some((v) => v.toLowerCase().includes(needle))))
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
        checkoutSessionId: null,
        paymentLinkId: null,
        paymentLinkUrl: null,
        endRequestedAt: null,
        endsAt: null,
        createdAt: at,
        updatedAt: at,
      };
      sponsors.set(s.id, s);
      const contact: Contact = { id: id('c'), sponsorId: s.id, email, name: c.name, role: c.role, userId: null, addedBy: c.addedBy ?? 'board', createdAt: at };
      contacts.set(contact.id, contact);
      record(s.id, 'created', actor, { toStatus: s.status, payload: { source: s.source } });
      return { sponsor: { ...s }, contact: { ...contact } };
    },
    async update(sid, patch, actor) {
      const s = must(sid);
      record(sid, 'updated', actor, { payload: { fields: Object.keys(patch) } });
      return save({ ...s, ...patch });
    },
    async linkStripe(sid, links, actor) {
      const s = must(sid);
      record(sid, 'stripe_linked', actor, { payload: { ...links } });
      const column = {
        customerId: 'stripeCustomerId',
        subscriptionId: 'stripeSubscriptionId',
        checkoutSessionId: 'checkoutSessionId',
        paymentLinkId: 'paymentLinkId',
        paymentLinkUrl: 'paymentLinkUrl',
      } as const;
      const set = Object.fromEntries(
        Object.entries(links)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [column[k as keyof StripeLinks], v]),
      );
      return save({ ...s, ...set });
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
    meetups: async (sid) => covered(sid),
    async setMeetups(sid, list, actor) {
      must(sid);
      const unique = [...new Map(list.map((m) => [m.eventId, plain(m)])).values()];
      const rows = rowsOf(sid);
      for (const r of rows.values()) if (!r.removedAt && !unique.some((m) => m.eventId === r.eventId)) rows.set(r.eventId, { ...r, removedAt: now(), removedBy: actor.kind });
      for (const m of unique) put(rows, m, actor);
      record(sid, 'meetups_set', actor, { payload: { events: unique.sort(byDate).map((m) => m.eventId) } });
      return covered(sid);
    },
    coverage: async (sid) => [...rowsOf(sid).values()].sort(byDate).map((r) => ({ ...r })),
    async cover(sid, m, actor) {
      must(sid);
      put(rowsOf(sid), plain(m), actor);
      record(sid, 'meetup_covered', actor, { payload: { eventId: m.eventId } });
      return covered(sid);
    },
    async uncover(sid, eventId, actor) {
      must(sid);
      const rows = rowsOf(sid);
      const r = rows.get(eventId);
      if (!r || r.removedAt) throw new NotFound('covered meetup');
      rows.set(eventId, { ...r, removedAt: now(), removedBy: actor.kind });
      record(sid, 'meetup_uncovered', actor, { payload: { eventId } });
      return covered(sid);
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
      const contact: Contact = { id: id('c'), sponsorId: sid, email, name: c.name, role: c.role, userId: null, addedBy: c.addedBy ?? 'board', createdAt: now() };
      contacts.set(contact.id, contact);
      record(sid, 'contact_added', actor, { payload: { contactId: contact.id, role: c.role, addedBy: contact.addedBy } });
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
    agreements: async (sid) =>
      agreements
        .filter((a) => a.sponsorId === sid)
        .reverse()
        .map((a) => ({ ...a })),
    async addLogo(sid, l, actor) {
      must(sid);
      const logo: Logo = { ...l, id: id('l'), sponsorId: sid, uploadedAt: now() };
      logos.set(logo.id, logo);
      record(sid, 'logo_uploaded', actor, { payload: { logoId: logo.id } });
      return { ...logo };
    },
    getLogo: async (lid) => (logos.has(lid) ? { ...logos.get(lid)! } : null),
    logos: async (sid) =>
      [...logos.values()]
        .filter((l) => l.sponsorId === sid)
        .reverse()
        .map((l) => ({ ...l })),
    async addDocument(sid, d, actor) {
      must(sid);
      const doc: SponsorDocument = { ...d, id: id('d'), sponsorId: sid, kind: 'contract', uploadedAt: now() };
      documents.set(doc.id, doc);
      record(sid, 'contract_attached', actor, { payload: { documentId: doc.id } });
      return { ...doc };
    },
    getDocument: async (did) => (documents.has(did) ? { ...documents.get(did)! } : null),
    documents: async (sid) =>
      [...documents.values()]
        .filter((d) => d.sponsorId === sid)
        .reverse()
        .map((d) => ({ ...d })),
    stripeEventSeen: async (e) => stripeEvents.has(e),
    markStripeEvent: async (e) => void stripeEvents.add(e),
    events: async (sid) => log.filter((e) => e.sponsorId === sid).map((e) => ({ ...e })),
    log: async (sid, type, actor, payload = {}) => {
      must(sid);
      record(sid, type, actor, { payload });
    },
  };
}
