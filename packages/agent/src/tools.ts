/**
 * The agent's tools. Typed, narrow, drafts only:
 * - reads see drafts and published documents (a draft wins, like in the Studio)
 * - writes create or patch `drafts.<id>`, starting from the published document
 * - only an allowlist of event fields can change; the URL slug is set once at creation
 * - there is no publish and no delete tool: publishing is a person's button press in Slack
 * Every write is recorded in the ChangeLog so Slack can show "field: before → after".
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { readiness, type EventDocumentForReadiness } from '@zurichjs/events';
import { draftIdOf, publishedIdOf, type ContentStore, type SanityDoc } from './store.ts';
import { formatZurich, zurichToUtcIso } from './time.ts';
import { buildProgrammeTools, eventProgramme } from './programme.ts';

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}
export interface DraftChange {
  /** Published id (without `drafts.`). */
  id: string;
  /** The Sanity document type (events, siteSettings, talk, talkSubmission, speaker, …). */
  type: string;
  slug?: string;
  title: string;
  created: boolean;
  fields: FieldChange[];
}
export class ChangeLog {
  readonly changes = new Map<string, DraftChange>();
  record(c: Omit<DraftChange, 'fields'>, fields: FieldChange[]) {
    const prev = this.changes.get(c.id);
    if (!prev) return void this.changes.set(c.id, { ...c, fields });
    for (const f of fields) {
      const i = prev.fields.findIndex((p) => p.field === f.field);
      if (i === -1) prev.fields.push(f);
      else prev.fields[i] = { ...f, before: prev.fields[i]!.before };
    }
    prev.title = c.title;
  }
  list = () => [...this.changes.values()];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HHMM = /^\d{2}:\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = z.enum(['scheduled', 'rsvp-soon', 'tbc', 'full', 'postponed', 'cancelled']);

const venueSchema = z
  .object({
    name: z.string().min(1).describe('Venue or company name, e.g. "Smallpdf AG"'),
    street: z.string().optional().describe('Street and number'),
    zip: z.string().optional(),
    city: z.string().optional().describe('Defaults to Zürich'),
    directions: z.string().optional().describe('How to get in, floor, entrance'),
  })
  .describe('Where the meetup happens');

const eventFields = z.object({
  title: z.string().min(3).optional(),
  status: STATUS.optional().describe('scheduled = RSVP open on Meetup; rsvp-soon; tbc = month known only; full; postponed; cancelled'),
  date: z.string().regex(DAY).optional().describe('Local date in Zurich, YYYY-MM-DD'),
  doorsTime: z
    .string()
    .regex(HHMM)
    .optional()
    .describe('Start time in Zurich, HH:MM, exactly as the organiser gave it: the event datetime, which Meetup shows as the start. Never guess it.'),
  endTime: z.string().regex(HHMM).optional().describe('End time in Zurich, HH:MM'),
  dateText: z.string().optional().describe('For tbc events only, e.g. "January 2027"'),
  venue: venueSchema.optional(),
  venueNote: z.string().optional().describe('Shown when the venue is not confirmed yet'),
  description: z.string().optional().describe('2–4 plain sentences, at least 50 characters; no invented facts'),
  meetupUrl: z.string().url().optional().describe('The Meetup.com event link'),
  practical: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional()
    .describe('"Good to know" lines; replaces the whole list'),
  agenda: z
    .array(z.object({ time: z.string().regex(HHMM), title: z.string(), note: z.string().optional() }))
    .optional()
    .describe('Programme lines; replaces the whole list'),
});
type EventFields = z.infer<typeof eventFields>;

/** Raw Sanity event as stored (draft or published). */
type EventDoc = SanityDoc & EventDocumentForReadiness & { id?: { current?: string }; endsAt?: string; venueNote?: string; practical?: unknown[]; agenda?: unknown[] };

const key = () => Math.random().toString(36).slice(2, 10);
const strip = ({ _rev, _createdAt, _updatedAt, ...rest }: SanityDoc) => rest as SanityDoc;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Turns tool input into Sanity fields (with legacy location/address kept in sync, as the Studio asks). */
function toSanityFields(input: EventFields, current: EventDoc | null): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.status !== undefined) set.status = input.status;
  if (input.date || input.doorsTime) {
    const day = input.date ?? (current?.datetime ? new Date(current.datetime).toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' }) : undefined);
    const time =
      input.doorsTime ??
      (current?.datetime ? new Date(current.datetime).toLocaleTimeString('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : undefined);
    if (!day) throw new Error('A date (YYYY-MM-DD) is needed to set the start time');
    // Never invent a time (AGENTS.md): ask the organiser instead.
    if (!time) throw new Error('A start time (HH:MM in Zurich) is needed with the date. Ask the organiser; never guess it.');
    set.datetime = zurichToUtcIso(day, time);
    if (input.endTime) set.endsAt = zurichToUtcIso(day, input.endTime);
  } else if (input.endTime) {
    if (!current?.datetime) throw new Error('Set the date before the end time');
    set.endsAt = zurichToUtcIso(new Date(current.datetime).toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' }), input.endTime);
  }
  if (input.dateText !== undefined) set.dateText = input.dateText;
  if (input.venue) {
    const v = { _type: 'object', city: 'Zürich', ...input.venue };
    set.venue = v;
    set.location = v.name;
    set.address = [v.street, [v.zip, v.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || undefined;
  }
  if (input.venueNote !== undefined) set.venueNote = input.venueNote;
  if (input.description !== undefined) set.description = input.description;
  if (input.meetupUrl !== undefined) set.meetupUrl = input.meetupUrl;
  if (input.practical) set.practical = input.practical.map((p) => ({ _key: key(), _type: 'practicalInfo', ...p }));
  if (input.agenda) set.agenda = input.agenda.map((a) => ({ _key: key(), _type: 'agendaItem', ...a }));
  return Object.fromEntries(Object.entries(set).filter(([, v]) => v !== undefined));
}

const EVENT_LIST = /* groq */ `*[_type == "events" && defined(id.current)]{ _id, title, status, datetime, dateText, "slug": id.current, "venue": coalesce(venue.name, location) }`;

/** Draft wins over published for the same document, like in the Studio. */
function preferDrafts<T extends { _id: string }>(docs: T[]): (T & { hasDraft: boolean })[] {
  const byId = new Map<string, T & { hasDraft: boolean }>();
  for (const d of docs) {
    const id = publishedIdOf(d._id);
    const isDraft = d._id !== id;
    const prev = byId.get(id);
    if (!prev || isDraft) byId.set(id, { ...d, hasDraft: isDraft || !!prev?.hasDraft });
  }
  return [...byId.values()];
}

async function eventBySlug(store: ContentStore, slug: string): Promise<{ doc: EventDoc; publishedId: string; hasDraft: boolean } | null> {
  const docs = await store.query<EventDoc[]>(`*[_type == "events" && id.current == $slug]`, { slug });
  const [hit] = preferDrafts(docs);
  return hit ? { doc: hit, publishedId: publishedIdOf(hit._id), hasDraft: hit.hasDraft } : null;
}

const summary = (d: EventDoc) => ({
  slug: d.id?.current,
  title: d.title,
  status: d.status ?? 'scheduled',
  when: d.datetime ? formatZurich(d.datetime) : (d.dateText ?? 'date to be confirmed'),
  venue: (d.venue as { name?: string } | undefined)?.name ?? d.location ?? null,
});

export function buildTools(store: ContentStore, log: ChangeLog, now: () => Date = () => new Date()): ToolSet {
  return {
    ...buildProgrammeTools(store, log, now),
    findEvents: tool({
      description:
        'List meetups (drafts included), soonest first for upcoming and newest first for past. Use it to find which event the person means before changing anything. Filter by words in the title or the venue name. Raise limit to see more (it says how many matched in total when there are more).',
      inputSchema: z.object({
        when: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
        text: z.string().optional().describe('Words in the title'),
        venue: z.string().optional().describe('Part of the venue name, e.g. "SAE"'),
        limit: z.number().int().min(1).max(200).default(20),
      }),
      execute: async ({ when, text, venue, limit }) => {
        const all = preferDrafts(await store.query<(EventDoc & { slug: string })[]>(EVENT_LIST));
        const t = now().getTime();
        const has = (hay: string | undefined, needle: string | undefined) => !needle || (hay ?? '').toLowerCase().includes(needle.toLowerCase());
        const matched = all
          .filter((e) => when === 'all' || (when === 'upcoming' ? !e.datetime || Date.parse(e.datetime) >= t - 48 * 3600_000 : !!e.datetime && Date.parse(e.datetime) < t))
          .filter((e) => has(`${e.title ?? ''} ${e.slug}`, text) && has(e.venue as string | undefined, venue))
          .sort((a, b) => (Date.parse(a.datetime ?? '9999') - Date.parse(b.datetime ?? '9999')) * (when === 'past' ? -1 : 1));
        const rows = matched.slice(0, limit).map((e) => ({ ...summary(e), slug: e.slug, hasUnpublishedChanges: e.hasDraft }));
        return matched.length > limit ? [...rows, { note: `${matched.length - limit} more matched; raise limit to see them (${matched.length} in total).` }] : rows;
      },
    }),

    getEvent: tool({
      description:
        'Full details of one meetup by its URL slug: venue, description, the programme (talks in running order with refs, lengths and speakers, and the schedule with times, estimated when there is no agenda), and what the page still needs before publishing.',
      inputSchema: z.object({ slug: z.string() }),
      execute: async ({ slug }) => {
        const hit = await eventBySlug(store, slug);
        if (!hit) return { error: `No event with slug "${slug}".` };
        const d = hit.doc;
        return {
          ...summary(d),
          endsAt: d.endsAt ? formatZurich(d.endsAt) : null,
          venueDetails: d.venue ?? null,
          venueNote: d.venueNote ?? null,
          description: d.description ?? null,
          meetupUrl: d.meetupUrl ?? null,
          practical: d.practical ?? [],
          programme: await eventProgramme(store, d),
          hasUnpublishedChanges: hit.hasDraft,
          missingBeforePublishing: readiness(d)
            .filter((c) => !c.ok)
            .map((c) => `${c.label}: ${c.why}`),
        };
      },
    }),

    findVenuesUsedBefore: tool({
      description:
        'Venues of published meetups with their addresses and which meetups used them (newest first), to reuse the exact name and address and to say where it came from.',
      inputSchema: z.object({ name: z.string().optional().describe('Part of the venue name, e.g. "SAE"') }),
      execute: async ({ name: filter }) => {
        const rows = await store.query<
          { title?: string; datetime?: string; eventSlug?: string; venue?: { name?: string; street?: string; zip?: string; city?: string }; location?: string; address?: string }[]
        >(`*[_type == "events" && !(_id in path("drafts.**"))]{ title, datetime, "eventSlug": id.current, venue, location, address }`);
        const venues = new Map<string, { venue: unknown; usedBy: { title?: string; when: string; slug?: string; at: number }[] }>();
        for (const r of rows) {
          const name = r.venue?.name ?? r.location;
          if (!name || (filter && !name.toLowerCase().includes(filter.toLowerCase()))) continue;
          const entry = venues.get(name) ?? { venue: r.venue?.name ? r.venue : { name, address: r.address }, usedBy: [] };
          entry.usedBy.push({ title: r.title, when: r.datetime ? formatZurich(r.datetime) : 'no date', slug: r.eventSlug, at: r.datetime ? Date.parse(r.datetime) : 0 });
          venues.set(name, entry);
        }
        return [...venues.values()].slice(0, 30).map(({ venue, usedBy }) => ({
          ...(venue as object),
          timesUsed: usedBy.length,
          usedBy: usedBy
            .sort((a, b) => b.at - a.at)
            .slice(0, 5)
            .map(({ at: _at, ...u }) => u),
        }));
      },
    }),

    createEventDraft: tool({
      description: 'Create a new meetup as a DRAFT (not live until an organiser presses Publish). Ask for anything you do not know; never invent dates, venues or speakers.',
      inputSchema: eventFields.extend({
        slug: z.string().regex(SLUG).describe('URL slug, e.g. "zurichjs-meetup-december-2026". Permanent once published.'),
        title: z.string().min(3),
      }),
      execute: async ({ slug, ...fields }) => {
        if (await eventBySlug(store, slug)) return { error: `An event with slug "${slug}" already exists. Use updateEventDraft.` };
        const id = crypto.randomUUID();
        const set = toSanityFields({ status: 'scheduled', ...fields }, null);
        await store.saveDraft({ _id: draftIdOf(id), _type: 'events', id: { _type: 'slug', current: slug }, ...set });
        log.record(
          { id, type: 'events', slug, title: fields.title, created: true },
          Object.entries(set).map(([field, after]) => ({ field, before: null, after })),
        );
        const missing = readiness({ ...set, id: { current: slug } } as EventDocumentForReadiness).filter((c) => !c.ok);
        return { created: slug, draft: true, missingBeforePublishing: missing.map((c) => c.label) };
      },
    }),

    updateEventDraft: tool({
      description:
        'Change an existing meetup (venue, date, start time, status like full/postponed/cancelled, description, Meetup link, "good to know", programme). Writes a DRAFT; the live page changes only after an organiser publishes. Only pass the fields that change.',
      inputSchema: eventFields.extend({ slug: z.string().describe('The event URL slug (from findEvents)') }),
      execute: async ({ slug, ...fields }) => {
        const hit = await eventBySlug(store, slug);
        if (!hit) return { error: `No event with slug "${slug}".` };
        const set = toSanityFields(fields, hit.doc);
        const changes = Object.entries(set)
          .filter(([f, v]) => !same(hit.doc[f], v))
          .map(([field, after]) => ({ field, before: hit.doc[field] ?? null, after }));
        if (!changes.length) return { unchanged: true };
        const draftId = draftIdOf(hit.publishedId);
        if (hit.hasDraft) await store.patchDraft(draftId, set);
        else await store.saveDraft({ ...strip(hit.doc), _id: draftId, ...set });
        log.record({ id: hit.publishedId, type: 'events', slug, title: String(set.title ?? hit.doc.title ?? slug), created: false }, changes);
        const missing = readiness({ ...hit.doc, ...set } as EventDocumentForReadiness).filter((c) => !c.ok);
        return { updated: slug, draft: true, changed: changes.map((c) => c.field), missingBeforePublishing: missing.map((c) => c.label) };
      },
    }),

    updateSupportNote: tool({
      description: 'Change the one-line note under the Twint QR code on the Support page (/donate).',
      inputSchema: z.object({ twintNote: z.string().max(120) }),
      execute: async ({ twintNote }) => {
        const [current] = preferDrafts(await store.query<SanityDoc[]>(`*[_type == "siteSettings"]`));
        if (!current) return { error: 'Site settings do not exist yet; create them in the Studio first.' };
        const publishedId = publishedIdOf(current._id);
        const before = current.twintNote ?? null;
        if (current._id === publishedId) await store.saveDraft({ ...strip(current), _id: draftIdOf(publishedId), twintNote });
        else await store.patchDraft(current._id, { twintNote });
        log.record({ id: publishedId, type: 'siteSettings', title: 'Site settings', created: false }, [{ field: 'twintNote', before, after: twintNote }]);
        return { updated: 'twintNote', draft: true };
      },
    }),
  };
}
