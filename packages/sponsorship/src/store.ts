import { isRunning, checkTransition, TransitionError } from './state.ts';
import type {
  Actor,
  Agreement,
  Contact,
  EndedReason,
  LinkAttempt,
  Logo,
  NewContact,
  NewNotice,
  NewSponsor,
  Sponsor,
  SponsorDocument,
  SponsorEvent,
  SponsorMeetup,
  SponsorNotice,
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
  /** What the change owes, written with it (a key already queued is kept as it is). */
  notices?: NewNotice[];
}

/** Stripe links. A key that is present is written (null clears it); a missing key is kept. */
export interface StripeLinks {
  customerId?: string;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
  paymentLinkId?: string | null;
  paymentLinkUrl?: string | null;
}

/** What `create` writes with the sponsor, in the same statement. */
export interface CreateOptions {
  /** One-time sponsorships: the meetups it covers. */
  meetups?: SponsorMeetup[];
  /**
   * The email belongs to a contact a colleague added elsewhere and nobody accepted: move that
   * contact here instead of refusing (the board inviting someone). Any other holder is a DuplicateContact.
   */
  claimUnconfirmed?: boolean;
}

/** Compare-and-set for `linkStripe`: the value the caller expects in the column now. */
export interface StripeExpect {
  paymentLinkId?: string | null;
  subscriptionId?: string | null;
  checkoutSessionId?: string | null;
  /** The status it must still have (a payment link is kept only while the sponsorship is unpaid). */
  status?: Status;
  /** A payment link attempt that must still be open; the same write marks it kept (beginLinkAttempt). */
  attempt?: string;
}

/** What the board's list shows next to a sponsor, read for many sponsors at once. */
export interface SponsorSummary {
  /** By date. */
  meetups: SponsorMeetup[];
  hasContract: boolean;
  /** The newest logo. */
  latestLogo: Logo | null;
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
  byStripeCustomer(id: string): Promise<Sponsor | null>;
  /** Newest first; `q` matches the company or legal name only (never contact details). */
  search(filter: { q?: string; status?: Status; limit?: number }): Promise<Sponsor[]>;
  /** How many sponsorships there are in each status, over every row (statuses with none are left out). */
  statusCounts(): Promise<Partial<Record<Status, number>>>;
  /**
   * A sponsor with its first contact (and its meetups), all or nothing. Fails with DuplicateContact
   * when the email belongs to a sponsor already.
   */
  create(s: NewSponsor, contact: NewContact, actor: Actor, opts?: CreateOptions): Promise<{ sponsor: Sponsor; contact: Contact }>;
  update(id: string, patch: SponsorPatch, actor: Actor): Promise<Sponsor>;
  linkStripe(id: string, links: StripeLinks, actor: Actor): Promise<Sponsor>;
  /** `linkStripe` only while the `expect` columns still hold those values (two requests at once): null otherwise. */
  linkStripeIf(id: string, expect: StripeExpect, links: StripeLinks, actor: Actor): Promise<Sponsor | null>;
  transition(id: string, input: TransitionInput): Promise<Sponsor>;

  /** The meetups of a one-time sponsorship, by date. */
  meetups(sponsorId: string): Promise<SponsorMeetup[]>;
  /** Meetups, contract on file and newest logo for each id (every id gets an entry). Postgres: at most three queries. */
  summaries(sponsorIds: string[]): Promise<Map<string, SponsorSummary>>;
  pendingMeetupRebuilds(): Promise<string[]>;
  acknowledgeMeetupRebuilds(versions: string[]): Promise<void>;
  /** Replaces the meetups (the board moves or bundles them; a sponsor picks one). */
  setMeetups(sponsorId: string, meetups: SponsorMeetup[], actor: Actor): Promise<SponsorMeetup[]>;

  contacts(sponsorId: string): Promise<Contact[]>;
  contactByUser(userId: string): Promise<Contact | null>;
  contactByEmail(email: string): Promise<Contact | null>;
  addContact(sponsorId: string, c: NewContact, actor: Actor): Promise<Contact>;
  /** Links a contact to the account that signed in with its email. */
  linkContact(contactId: string, userId: string): Promise<Contact>;
  /**
   * Removes a contact, never the sponsor's last one or its last confirmed primary contact (who gets
   * payment emails when there is no billing contact): ContactRequired then. Checked and removed in
   * one step, so two removals at once cannot both pass.
   */
  removeContact(contactId: string, actor: Actor): Promise<void>;

  /** With `notices`: what the signature owes (its signed copy), written in the same step from the saved agreement. */
  acceptAgreement(sponsorId: string, a: NewAgreement, actor: Actor, notices?: (saved: Agreement) => NewNotice[]): Promise<Agreement>;
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

  /**
   * Queues notices; a key already queued is kept as it is. Returns how many were new. With
   * `event`, that audit row is appended in the same write: the step it marks done (a payment
   * recorded) and what it owes are saved together. Replaying the same notice keys skips the event.
   */
  queueNotices(sponsorId: string, notices: NewNotice[], event?: { type: string; actor: Actor; payload?: Record<string, unknown> }): Promise<number>;
  /**
   * Unsent notices, oldest first (of one sponsor, or all), claimed for the caller: another sender
   * does not get them until they are done or the claim is five minutes old.
   */
  claimNotices(filter: { sponsorId?: string; limit: number }): Promise<SponsorNotice[]>;
  /** Sent; or, with an error, released for a later try. */
  noticeDone(id: string, error?: string): Promise<void>;
  /** Persist the request before its first POST. */
  beginLinkAttempt(sponsorId: string, request: string, key?: string): Promise<LinkAttempt>;
  /** Stripe answered with this link. It becomes the sponsor's with `linkStripeIf(…, { attempt: key }, …)`. */
  linkAttemptCreated(key: string, linkId: string): Promise<void>;
  /** Marks a link that was not kept for switching off (`closing`). False once it is kept or closed. */
  claimLinkCleanup(key: string, linkId?: string): Promise<boolean>;
  /** Stripe confirmed the link is off. */
  linkAttemptClosed(key: string): Promise<void>;
  /** Attempts still open or closing, least recently attempted first. */
  unsettledLinkAttempts(filter: { sponsorId?: string; limit: number }): Promise<LinkAttempt[]>;

  stripeEventSeen(eventId: string): Promise<boolean>;
  markStripeEvent(eventId: string, type: string): Promise<void>;
  /** Oldest first. */
  events(sponsorId: string): Promise<SponsorEvent[]>;
  /** Appends a note to the audit log (e.g. a payment the board recorded, a change link sent). */
  log(sponsorId: string, type: string, actor: Actor, payload?: Record<string, unknown>): Promise<void>;
  /** Accept and apply a payment against the locked current offer, including its notices. */
  paidInvoice(sponsorId: string, p: PaidInvoice, actor: Actor, opts: { clearOverdue: boolean }): Promise<Sponsor>;
  /**
   * A failed or unconfirmed payment for `invoice` of `subscriptionId`, in one step: nothing when
   * the invoice was paid (`paymentEvidence`), the subscription is not the sponsorship's, or it is
   * not running; otherwise active becomes past_due and the notices are written with it.
   */
  overdueInvoice(
    sponsorId: string,
    p: { invoice: string; subscriptionId: string | null; payload: Record<string, unknown> },
    actor: Actor,
    notices: NewNotice[],
  ): Promise<{ sponsor: Sponsor; outcome: 'paid' | 'stale' | 'not_running' | 'overdue' }>;
}

/** A payment for this invoice was recorded: the event is the payment itself, or the activation it made. Never the overdue mark. */
export const paymentEvidence = (e: Pick<SponsorEvent, 'type' | 'toStatus' | 'payload'>, invoice: string) =>
  (e.type === 'invoice_paid' || (e.type === 'status_changed' && e.toStatus === 'active')) && e.payload.invoice === invoice;

export interface PaidInvoice {
  invoice: string;
  subscriptionId: string;
  offerId: string;
  created?: number;
  term?: {
    start: string;
    end: string;
    plan: Pick<Sponsor, 'tier' | 'cycle'> | null;
    welcome: NewNotice[];
    renewal: NewNotice;
  };
}

export const currentOfferId = (id: string, events: SponsorEvent[]) =>
  events.findLast((e) => e.type === 'status_changed' && e.fromStatus === 'ended' && e.toStatus === 'pending')?.id ?? id;

export function settleInvoice(s: Sponsor, events: SponsorEvent[], p: PaidInvoice, clearOverdue: boolean) {
  if (s.status === 'ended' || s.cycle === 'once' || p.offerId !== currentOfferId(s.id, events)) return null;
  if (s.stripeSubscriptionId && s.stripeSubscriptionId !== p.subscriptionId) return null;
  const restarted = events.findLastIndex((e) => e.fromStatus === 'ended' && e.toStatus === 'pending');
  if (events.some((e, index) => e.payload.subscriptionId === p.subscriptionId && (e.type === 'stripe_linked' || e.type === 'invoice_paid') && index < restarted)) return null;
  const term = p.term;
  const activate = s.status === 'pending' && !!term;
  const status = activate || (s.status === 'past_due' && clearOverdue) ? 'active' : s.status;
  const sponsor: Sponsor = {
    ...s,
    status,
    ...(term && {
      ...term.plan,
      paymentMode: 'card',
      stripeSubscriptionId: p.subscriptionId,
      checkoutSessionId: s.stripeSubscriptionId ? s.checkoutSessionId : null,
      startedAt: s.startedAt ?? term.start,
      paidUntil: s.paidUntil && s.paidUntil > term.end ? s.paidUntil : term.end,
    }),
  };
  const wasActivation = events.some((e) => e.type === 'status_changed' && e.fromStatus === 'pending' && e.toStatus === 'active' && e.payload.invoice === p.invoice);
  const notices = !term ? [] : activate ? term.welcome : wasActivation ? [] : [term.renewal];
  return { sponsor, notices };
}

/** Statuses in which a failed card payment marks the sponsorship overdue or adds a notice. */
const RUNNING_FOR_INVOICES: Status[] = ['active', 'past_due', 'ending'];

export class DuplicateContact extends Error {
  constructor(email: string) {
    super(`${email} is already a contact of a sponsor.`);
    this.name = 'DuplicateContact';
  }
}

/** Confirmed: added by the board or the sponsor's own sign-up, or a colleague's invitation accepted. Only they get emails. */
export const confirmedContact = (c: Pick<Contact, 'addedBy' | 'userId'>) => c.addedBy !== 'sponsor' || !!c.userId;

/** Why a contact cannot be removed, from the contacts the sponsor would have left. */
export function contactRequired(gone: Contact, rest: Contact[]): ContactRequired | null {
  if (!rest.length) return new ContactRequired('last_contact');
  if (gone.role === 'primary' && confirmedContact(gone) && !rest.some((c) => c.role === 'primary' && confirmedContact(c))) return new ContactRequired('last_primary');
  return null;
}

export class ContactRequired extends Error {
  readonly reason: 'last_contact' | 'last_primary';
  constructor(reason: 'last_contact' | 'last_primary') {
    super(reason === 'last_contact' ? 'A sponsor needs at least one contact.' : 'A sponsor needs a confirmed primary contact.');
    this.name = 'ContactRequired';
    this.reason = reason;
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

const STRIPE_FIELD = {
  customerId: 'stripeCustomerId',
  subscriptionId: 'stripeSubscriptionId',
  checkoutSessionId: 'checkoutSessionId',
  paymentLinkId: 'paymentLinkId',
  paymentLinkUrl: 'paymentLinkUrl',
} as const satisfies Record<keyof StripeLinks, keyof Sponsor>;

const byDate = (a: SponsorMeetup, b: SponsorMeetup) => a.date.localeCompare(b.date) || a.eventId.localeCompare(b.eventId);

/** In-memory store with the same rules as the database. */
export function memoryStore(opts: { now?: () => Date } = {}): SponsorStore & { all(): Sponsor[] } {
  const now = () => (opts.now ?? (() => new Date()))().toISOString();
  let n = 0;
  const id = (p: string) => `${p}_${++n}`;
  const sponsors = new Map<string, Sponsor>();
  const meetups = new Map<string, SponsorMeetup[]>();
  const contacts = new Map<string, Contact>();
  const agreements: Agreement[] = [];
  const logos = new Map<string, Logo>();
  const documents = new Map<string, SponsorDocument>();
  const log: SponsorEvent[] = [];
  const stripeEvents = new Set<string>();
  const notices: (SponsorNotice & { claimedAt: string | null })[] = [];
  const queue = (sponsorId: string, list: NewNotice[] = []) => {
    let added = 0;
    for (const x of list) {
      if (notices.some((y) => y.key === x.key)) continue;
      notices.push({ id: `n_${notices.length + 1}`, sponsorId, key: x.key, body: x.body, createdAt: now(), sentAt: null, attempts: 0, lastError: null, claimedAt: null });
      added++;
    }
    return added;
  };
  const CLAIM_MS = 5 * 60_000;
  const linkAttempts: LinkAttempt[] = [];
  const attempt = (key: string) => {
    const a = linkAttempts.find((x) => x.key === key);
    if (!a) throw new NotFound('payment link attempt');
    return a;
  };

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
  const linkStripe = (s: Sponsor, links: StripeLinks, actor: Actor) => {
    record(s.id, 'stripe_linked', actor, { payload: { ...links } });
    const set = Object.fromEntries(
      Object.entries(links)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [STRIPE_FIELD[k as keyof StripeLinks], v]),
    );
    return save({ ...s, ...set });
  };
  const emailTaken = (email: string) => [...contacts.values()].some((c) => c.email === email);
  const findBy = async (pred: (s: Sponsor) => boolean) => {
    const s = [...sponsors.values()].find(pred);
    return s ? { ...s } : null;
  };

  return {
    all: () => [...sponsors.values()].map((s) => ({ ...s })),
    get: async (sid) => (sponsors.has(sid) ? { ...sponsors.get(sid)! } : null),
    byStripeSubscription: (sub) => findBy((x) => x.stripeSubscriptionId === sub),
    byPaymentLink: (pl) => findBy((x) => x.paymentLinkId === pl),
    byStripeCustomer: (cus) => findBy((x) => x.stripeCustomerId === cus),
    search: async ({ q, status, limit = 200 }) => {
      const needle = q?.trim().toLowerCase();
      return [...sponsors.values()]
        .filter((s) => (!status || s.status === status) && (!needle || [s.companyName, s.legalName ?? ''].some((v) => v.toLowerCase().includes(needle))))
        .reverse()
        .slice(0, limit)
        .map((s) => ({ ...s }));
    },
    statusCounts: async () => {
      const counts: Partial<Record<Status, number>> = {};
      for (const s of sponsors.values()) counts[s.status] = (counts[s.status] ?? 0) + 1;
      return counts;
    },
    async create(input, c, actor, opts = {}) {
      const email = normaliseEmail(c.email);
      const held = [...contacts.values()].find((x) => x.email === email);
      const movable = !!opts.claimUnconfirmed && !!held && held.addedBy === 'sponsor' && !held.userId;
      if (held && !movable) throw new DuplicateContact(email);
      const at = now();
      const s: Sponsor = {
        ...input,
        id: id('s'),
        endedReason: null,
        partnerId: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        meetupRebuildId: null,
        checkoutSessionId: null,
        paymentLinkId: null,
        paymentLinkUrl: null,
        endRequestedAt: null,
        endsAt: null,
        createdAt: at,
        updatedAt: at,
      };
      sponsors.set(s.id, s);
      const contact: Contact = movable
        ? { ...held!, sponsorId: s.id, name: c.name, role: c.role, addedBy: c.addedBy ?? 'board' }
        : { id: id('c'), sponsorId: s.id, email, name: c.name, role: c.role, userId: null, addedBy: c.addedBy ?? 'board', createdAt: at };
      contacts.set(contact.id, contact);
      record(s.id, 'created', actor, { toStatus: s.status, payload: { source: s.source } });
      if (movable) record(held!.sponsorId, 'contact_removed', actor, { payload: { contactId: held!.id, movedTo: s.id } });
      const list = [...new Map((opts.meetups ?? []).map((m) => [m.eventId, { ...m }])).values()].sort(byDate);
      if (list.length) {
        if (s.cycle === 'once' && isRunning(s.status)) s.meetupRebuildId = crypto.randomUUID();
        meetups.set(s.id, list);
        record(s.id, 'meetups_set', actor, { payload: { events: list.map((m) => m.eventId) } });
      }
      return { sponsor: { ...s }, contact: { ...contact } };
    },
    async update(sid, patch, actor) {
      const s = must(sid);
      if (!Object.keys(patch).length) return { ...s };
      record(sid, 'updated', actor, { payload: { fields: Object.keys(patch) } });
      return save({ ...s, ...patch });
    },
    linkStripe: async (sid, links, actor) => linkStripe(must(sid), links, actor),
    async linkStripeIf(sid, { attempt: key, ...expect }, links, actor) {
      const s = must(sid);
      if ((Object.keys(expect) as (keyof typeof expect)[]).some((k) => expect[k] !== undefined && s[k === 'subscriptionId' ? 'stripeSubscriptionId' : k] !== expect[k]))
        return null;
      const a = key === undefined ? null : attempt(key);
      if (a && (a.state !== 'open' || a.sponsorId !== sid)) return null;
      if (a) Object.assign(a, { state: 'kept', linkId: links.paymentLinkId ?? a.linkId });
      return linkStripe(s, links, actor);
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
      queue(sid, input.notices);
      return save({ ...s, ...transitionFields(s, t.to, t.endedReason, input.endsAt, now()) });
    },
    meetups: async (sid) => [...(meetups.get(sid) ?? [])].sort(byDate).map((m) => ({ ...m })),
    summaries: async (ids) =>
      new Map(
        ids.map((sid) => {
          const latestLogo = [...logos.values()].findLast((l) => l.sponsorId === sid);
          return [
            sid,
            {
              meetups: [...(meetups.get(sid) ?? [])].sort(byDate).map((m) => ({ ...m })),
              hasContract: [...documents.values()].some((d) => d.sponsorId === sid),
              latestLogo: latestLogo ? { ...latestLogo } : null,
            },
          ];
        }),
      ),
    pendingMeetupRebuilds: async () => [...sponsors.values()].flatMap((s) => (s.meetupRebuildId ? [s.meetupRebuildId] : [])),
    async acknowledgeMeetupRebuilds(versions) {
      const pending = new Set(versions);
      for (const s of sponsors.values()) if (s.meetupRebuildId && pending.has(s.meetupRebuildId)) s.meetupRebuildId = null;
    },
    async setMeetups(sid, list, actor) {
      const s = must(sid);
      const unique = [...new Map(list.map((m) => [m.eventId, { ...m }])).values()].sort(byDate);
      const old = new Set((meetups.get(sid) ?? []).map((m) => m.eventId));
      if (s.cycle === 'once' && isRunning(s.status) && (unique.length !== old.size || unique.some((m) => !old.has(m.eventId)))) s.meetupRebuildId = crypto.randomUUID();
      meetups.set(sid, unique);
      record(sid, 'meetups_set', actor, { payload: { events: unique.map((m) => m.eventId) } });
      return unique.map((m) => ({ ...m }));
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
      const refused = contactRequired(
        c,
        [...contacts.values()].filter((x) => x.sponsorId === c.sponsorId && x.id !== cid),
      );
      if (refused) throw refused;
      contacts.delete(cid);
      record(c.sponsorId, 'contact_removed', actor, { payload: { contactId: cid } });
    },
    async acceptAgreement(sid, a, actor, notices) {
      must(sid);
      const ag: Agreement = { ...a, id: id('a'), sponsorId: sid, acceptedAt: now() };
      const owed = notices?.({ ...ag }) ?? [];
      agreements.push(ag);
      record(sid, 'agreement_accepted', actor, { payload: { version: a.version, context: a.context } });
      queue(sid, owed);
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
    queueNotices: async (sid, list, event) => {
      must(sid);
      const added = queue(sid, list);
      if (event && (added || !list.length)) record(sid, event.type, event.actor, { payload: event.payload ?? {} });
      return added;
    },
    claimNotices: async ({ sponsorId, limit }) => {
      const at = Date.parse(now());
      const free = notices.filter((x) => !x.sentAt && (!sponsorId || x.sponsorId === sponsorId) && (!x.claimedAt || Date.parse(x.claimedAt) < at - CLAIM_MS)).slice(0, limit);
      for (const x of free) Object.assign(x, { claimedAt: now(), attempts: x.attempts + 1 });
      return free.map(({ claimedAt: _, ...x }) => ({ ...x }));
    },
    noticeDone: async (nid, error) => {
      const x = notices.find((y) => y.id === nid);
      if (x) Object.assign(x, error ? { claimedAt: null, lastError: error.slice(0, 500) } : { claimedAt: null, sentAt: now(), lastError: null });
    },
    async beginLinkAttempt(sid, request, key = crypto.randomUUID()) {
      if (must(sid).status === 'ended') throw conflict();
      const a: LinkAttempt = { key, sponsorId: sid, request, linkId: null, state: 'open', ageMs: 0, createdAt: now() };
      linkAttempts.push(a);
      return { ...a };
    },
    linkAttemptCreated: async (key, linkId) => void (attempt(key).linkId = linkId),
    async claimLinkCleanup(key, linkId) {
      const a = attempt(key);
      if (a.state !== 'open' && a.state !== 'closing') return false;
      Object.assign(a, { state: 'closing', linkId: linkId ?? a.linkId });
      linkAttempts.splice(linkAttempts.indexOf(a), 1);
      linkAttempts.push(a);
      return true;
    },
    async linkAttemptClosed(key) {
      const a = attempt(key);
      if (a.state === 'closing') a.state = 'closed';
    },
    unsettledLinkAttempts: async ({ sponsorId, limit }) =>
      linkAttempts
        .filter((a) => (a.state === 'open' || a.state === 'closing') && (!sponsorId || a.sponsorId === sponsorId))
        .slice(0, limit)
        .map((a) => ({ ...a, ageMs: Date.parse(now()) - Date.parse(a.createdAt) })),
    stripeEventSeen: async (e) => stripeEvents.has(e),
    markStripeEvent: async (e) => void stripeEvents.add(e),
    events: async (sid) => log.filter((e) => e.sponsorId === sid).map((e) => ({ ...e })),
    log: async (sid, type, actor, payload = {}) => {
      must(sid);
      record(sid, type, actor, { payload });
    },
    async paidInvoice(sid, p, actor, { clearOverdue }) {
      const s = must(sid);
      const settled = settleInvoice(
        s,
        log.filter((e) => e.sponsorId === sid),
        p,
        clearOverdue,
      );
      if (!settled) return { ...s };
      const payload = { invoice: p.invoice, subscriptionId: p.subscriptionId, ...(p.created ? { created: p.created } : {}) };
      record(sid, 'invoice_paid', actor, { payload });
      if (settled.sponsor.status !== s.status) record(sid, 'status_changed', actor, { fromStatus: s.status, toStatus: settled.sponsor.status, payload });
      queue(sid, settled.notices);
      return save(settled.sponsor);
    },
    async overdueInvoice(sid, p, actor, notices) {
      const s = must(sid);
      if (log.some((e) => e.sponsorId === sid && paymentEvidence(e, p.invoice))) return { sponsor: { ...s }, outcome: 'paid' };
      if (!p.subscriptionId || s.stripeSubscriptionId !== p.subscriptionId) return { sponsor: { ...s }, outcome: 'stale' };
      if (!RUNNING_FOR_INVOICES.includes(s.status)) return { sponsor: { ...s }, outcome: 'not_running' };
      queue(sid, notices);
      if (s.status !== 'active') return { sponsor: { ...s }, outcome: 'overdue' };
      record(sid, 'status_changed', actor, { fromStatus: 'active', toStatus: 'past_due', payload: { invoice: p.invoice, ...p.payload } });
      return { sponsor: save({ ...s, ...transitionFields(s, 'past_due', null, null, now()) }), outcome: 'overdue' };
    },
  };
}
