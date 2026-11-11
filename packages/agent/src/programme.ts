/**
 * The agent's talk-proposal, speaker and programme tools (owner, 10th November 2026): tidy up
 * proposals, merge duplicate speaker profiles, put a proposal on a meetup, and set the running
 * order, times and talk lengths. Same rules as tools.ts:
 *   - drafts only; every write is in the ChangeLog, so Slack shows it with Publish / Discard
 *   - nothing is deleted: a merged duplicate is hidden and its URL redirects to the profile kept
 *   - no invented facts: times come from the organiser, or from the usual evening the site already
 *     uses when there is no agenda (packages/events/src/schedule.ts); the reply says which
 *   - the model never sees speaker emails or review notes (emails are only compared, in code)
 * A reference to a document that exists only as a draft (a talk made from a proposal) is weak
 * until publishing; handleButton publishes talks before events and strengthens it (publish.ts).
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { buildSchedule, type TalkRef } from '@zurichjs/events';
import { draftIdOf, isDraftId, publishedIdOf, type ContentStore, type SanityDoc } from './store.ts';
import { formatZurich } from './time.ts';
import type { ChangeLog, FieldChange } from './tools.ts';

type Ref = { _type?: 'reference'; _ref: string; _key?: string; _weak?: boolean; _strengthenOnPublish?: { type: string } };
type Doc = SanityDoc & { _id: string };

const key = () => Math.random().toString(36).slice(2, 10);
const strip = ({ _rev, _createdAt, _updatedAt, ...rest }: SanityDoc) => rest as SanityDoc;
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
/** "Nicolò  Ribaudo" and "nicolo ribaudo" are the same name. */
const norm = (s: string | undefined) => slugify(s ?? '').replace(/-/g, ' ');
const HHMM = /^\d{2}:\d{2}$/;
export const PROPOSAL_STATUSES = ['pending', 'under_review', 'approved', 'scheduled', 'completed', 'rejected'] as const;

/** Draft wins over published, like in the Studio. Returns one doc per published id. */
async function current(store: ContentStore, ids: string[]): Promise<Map<string, Doc & { hasDraft: boolean }>> {
  const pub = [...new Set(ids.map(publishedIdOf))];
  const docs = pub.length ? await store.query<Doc[]>(`*[_id in $ids]`, { ids: [...pub, ...pub.map(draftIdOf)] }) : [];
  const out = new Map<string, Doc & { hasDraft: boolean }>();
  for (const d of docs) {
    const id = publishedIdOf(d._id);
    const prev = out.get(id);
    if (!prev || isDraftId(d._id)) out.set(id, { ...d, hasDraft: isDraftId(d._id) || !!prev?.hasDraft });
  }
  return out;
}

/** True when a published version exists (a strong reference to it is allowed). */
async function isPublished(store: ContentStore, id: string) {
  return !!(await store.getDocument(publishedIdOf(id)));
}

/** A reference; weak (strengthened on publish) when the target exists only as a draft. */
async function refTo(store: ContentStore, id: string, type: string, withKey = true): Promise<Ref> {
  const pub = publishedIdOf(id);
  const base: Ref = { _type: 'reference', _ref: pub, ...(withKey ? { _key: key() } : {}) };
  return (await isPublished(store, pub)) ? base : { ...base, _weak: true, _strengthenOnPublish: { type } };
}

/**
 * Writes `set` to the document's draft (made from the published one if there is none) and logs
 * what changed, with readable before/after values from `shown` when given. Returns the fields that
 * changed (empty when nothing did).
 */
async function writeDraft(
  store: ContentStore,
  log: ChangeLog,
  doc: Doc & { hasDraft: boolean },
  type: string,
  title: string,
  set: Record<string, unknown>,
  shown: Record<string, { before: unknown; after: unknown }> = {},
  slug?: string,
): Promise<string[]> {
  const changed = Object.entries(set).filter(([f, v]) => !same(doc[f], v));
  if (!changed.length) return [];
  const publishedId = publishedIdOf(doc._id);
  const draftId = draftIdOf(publishedId);
  const patch = Object.fromEntries(changed);
  if (doc.hasDraft) await store.patchDraft(draftId, patch);
  else await store.saveDraft({ ...strip(doc), _id: draftId, ...patch });
  const fields: FieldChange[] = changed.map(([field, after]) => ({ field, before: shown[field]?.before ?? doc[field] ?? null, after: shown[field]?.after ?? after }));
  log.record({ id: publishedId, type, title, created: false, ...(slug ? { slug } : {}) }, fields);
  return changed.map(([f]) => f);
}

/** Replaces references to `from` with `to` anywhere in a value; drops duplicates this creates in arrays. */
function repoint(value: unknown, from: Set<string>, to: Ref): unknown {
  if (Array.isArray(value)) {
    const seen = new Set<string>();
    return value
      .map((v) => repoint(v, from, to))
      .filter((v) => {
        const r = (v as Ref | null)?._ref;
        if (!r) return true;
        if (seen.has(r)) return false;
        seen.add(r);
        return true;
      });
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (typeof o._ref === 'string' && from.has(o._ref)) {
      const { _weak, _strengthenOnPublish, ...rest } = o;
      return { ...rest, _ref: to._ref, ...(to._weak ? { _weak: true, _strengthenOnPublish: to._strengthenOnPublish } : {}) };
    }
    return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, repoint(v, from, to)]));
  }
  return value;
}

interface SpeakerDoc extends Doc {
  id?: { current?: string };
  name?: string;
  email?: string;
  company?: string;
  title?: string;
  isVisible?: boolean;
  bio?: string;
  image?: unknown;
  github?: string;
  linkedin?: string;
  legacySlugs?: string[];
  talkReferences?: Ref[];
}
const SPEAKERS = /* groq */ `*[_type == "speaker"]{ ..., "talkCount": count(*[_type == "talk" && references(^._id)]), "proposalCount": count(*[_type == "talkSubmission" && references(^._id)]) }`;
/** Fields copied from a duplicate into the profile kept, only where the kept one is empty. */
const FILLABLE = ['email', 'title', 'company', 'location', 'tagline', 'image', 'bio', 'twitter', 'bluesky', 'linkedin', 'github', 'website'] as const;

interface ProposalDoc extends Doc {
  title?: string;
  status?: (typeof PROPOSAL_STATUSES)[number];
  submittedAt?: string;
  durationMinutes?: number;
  level?: string;
  tags?: string[];
  firstTalk?: boolean;
  description?: string;
  speakers?: Ref[];
  speakerNames?: string[];
  reviewNotes?: string;
  convertedToTalk?: boolean;
  talkReference?: Ref;
}
const PROPOSALS = /* groq */ `*[_type == "talkSubmission"]{ _id, title, status, submittedAt, durationMinutes, level, tags, firstTalk, speakers, "speakerNames": speakers[]->name, convertedToTalk, talkReference }`;

interface TalkDoc extends Doc {
  id?: { current?: string };
  title?: string;
  durationMinutes?: number;
  type?: string;
  level?: string;
  speakers?: Ref[];
  speakerNames?: string[];
}
interface EventDoc extends Doc {
  id?: { current?: string };
  title?: string;
  datetime?: string;
  talks?: Ref[];
  agenda?: { _key?: string; time?: string; kind?: string; title?: string; note?: string; talk?: Ref }[];
}

async function eventBySlug(store: ContentStore, slug: string) {
  const [hit] = [
    ...(
      await current(
        store,
        (await store.query<{ _id: string }[]>(`*[_type == "events" && id.current == $slug]{ _id }`, { slug })).map((d) => d._id),
      )
    ).values(),
  ];
  return (hit as (EventDoc & { hasDraft: boolean }) | undefined) ?? null;
}

async function talksById(store: ContentStore, ids: string[]) {
  const pub = [...new Set(ids.map(publishedIdOf))];
  const rows = pub.length
    ? await store.query<TalkDoc[]>(`*[_type == "talk" && _id in $ids]{ ..., "speakerNames": speakers[]->name }`, { ids: [...pub, ...pub.map(draftIdOf)] })
    : [];
  const out = new Map<string, TalkDoc>();
  for (const t of rows) if (!out.has(publishedIdOf(t._id)) || isDraftId(t._id)) out.set(publishedIdOf(t._id), t);
  return out;
}

const talkLine = (t: TalkDoc | undefined, ref: string) =>
  t ? { talk: ref, title: t.title ?? '(untitled)', minutes: t.durationMinutes ?? null, type: t.type ?? 'talk', speakers: t.speakerNames ?? [] } : { talk: ref, missing: true };

/**
 * An event's programme as the site builds it: the agenda when there is one, otherwise the talks in
 * running order with the times the site estimates (marked as estimated). Also the talks that point
 * at the event from the old `talk.events` field but are not in its list.
 */
export async function eventProgramme(store: ContentStore, ev: SanityDoc) {
  const e = ev as EventDoc;
  const talkRefs = (e.talks ?? []).map((r) => r._ref);
  const agendaRefs = (e.agenda ?? []).flatMap((a) => (a.talk?._ref ? [a.talk._ref] : []));
  const legacy = await store.query<{ _id: string }[]>(`*[_type == "talk" && events._ref == $id]{ _id }`, { id: publishedIdOf(e._id) });
  const legacyIds = legacy.map((t) => publishedIdOf(t._id)).filter((id) => !talkRefs.includes(id) && !agendaRefs.includes(id));
  const talks = await talksById(store, [...talkRefs, ...agendaRefs, ...legacyIds]);
  const asTalkRef = (id: string): TalkRef | null => {
    const t = talks.get(id);
    return t ? { id, title: t.title ?? '', durationMin: t.durationMinutes ?? 20, format: 'talk', speakerIds: [] } : null;
  };
  const schedule = buildSchedule({
    agenda: (e.agenda ?? []).map((a) => ({ time: a.time, kind: a.kind, title: a.title, note: a.note, talk: (a.talk?._ref && asTalkRef(a.talk._ref)) || undefined })),
    talks: talkRefs.map(asTalkRef).filter((t): t is TalkRef => !!t),
    startsAt: e.datetime,
  });
  return {
    talksInRunningOrder: talkRefs.map((id) => talkLine(talks.get(id), id)),
    agendaInSanity: (e.agenda ?? []).length > 0,
    schedule: schedule.map((s) => ({
      time: s.time || null,
      kind: s.kind,
      title: s.title,
      ...(s.talk?.id ? { talk: s.talk.id, minutes: s.talk.durationMin } : {}),
      ...(s.note ? { note: s.note } : {}),
    })),
    scheduleIsEstimated: schedule.some((s) => s.estimated),
    ...(legacyIds.length ? { alsoLinkedButNotInTheList: legacyIds.map((id) => talkLine(talks.get(id), id)) } : {}),
  };
}

export function buildProgrammeTools(store: ContentStore, log: ChangeLog, now: () => Date = () => new Date()): ToolSet {
  return {
    talkProposals: tool({
      description:
        'Talk proposals (the call for papers, CFP) sent through the website: counts by status, and the proposals newest first, each with its ref, speaker refs and likely duplicates. Statuses: pending (received, not reviewed), under_review, approved (accepted), scheduled (on a meetup), completed (given), rejected (not this time).',
      inputSchema: z.object({
        status: z.enum(PROPOSAL_STATUSES).optional().describe('Only proposals in this status'),
        text: z.string().optional().describe('Words in the title or a speaker name'),
        limit: z.number().int().min(1).max(60).default(15),
      }),
      execute: async ({ status, text, limit }) => {
        const rows = await store.query<ProposalDoc[]>(PROPOSALS);
        const byId = new Map<string, ProposalDoc & { hasDraft: boolean }>();
        for (const r of rows) {
          const id = publishedIdOf(r._id);
          const prev = byId.get(id);
          if (!prev || isDraftId(r._id)) byId.set(id, { ...r, hasDraft: isDraftId(r._id) || !!prev?.hasDraft });
        }
        const all = [...byId.values()];
        const named = new Map(all.map((p) => [publishedIdOf(p._id), p.speakerNames ?? []]));
        const byStatus = Object.fromEntries(PROPOSAL_STATUSES.map((s) => [s, all.filter((p) => (p.status ?? 'pending') === s).length]));
        // Same title, or same speaker with nearly the same title: likely sent twice.
        const dupes = (p: ProposalDoc) =>
          all
            .filter((o) => o._id !== p._id && publishedIdOf(o._id) !== publishedIdOf(p._id))
            .filter((o) => {
              const sameTitle = norm(o.title) === norm(p.title);
              const shared = (o.speakers ?? []).some((r) => (p.speakers ?? []).some((x) => x._ref === r._ref));
              const close = norm(o.title).split(' ').slice(0, 3).join(' ') === norm(p.title).split(' ').slice(0, 3).join(' ');
              return sameTitle || (shared && close);
            })
            .map((o) => publishedIdOf(o._id));
        const t = text?.toLowerCase();
        const matched = all
          .filter((p) => !status || (p.status ?? 'pending') === status)
          .filter((p) => !t || `${p.title ?? ''} ${(named.get(publishedIdOf(p._id)) ?? []).join(' ')}`.toLowerCase().includes(t))
          .sort((a, b) => Date.parse(b.submittedAt ?? '0') - Date.parse(a.submittedAt ?? '0'));
        return {
          total: all.length,
          byStatus,
          matched: matched.length,
          proposals: matched.slice(0, limit).map((p) => ({
            ref: publishedIdOf(p._id),
            title: p.title,
            speakers: named.get(publishedIdOf(p._id)) ?? [],
            speakerRefs: (p.speakers ?? []).map((r) => r._ref),
            status: p.status ?? 'pending',
            submitted: p.submittedAt ? formatZurich(p.submittedAt) : null,
            minutes: p.durationMinutes ?? null,
            level: p.level ?? null,
            topics: p.tags ?? [],
            firstTalk: !!p.firstTalk,
            talk: p.talkReference?._ref ?? null,
            likelyDuplicateOf: dupes(p),
            hasUnpublishedChanges: p.hasDraft,
          })),
        };
      },
    }),

    updateProposals: tool({
      description:
        'Tidy up talk proposals: set the status of one or more (e.g. rejected for a duplicate or withdrawn one, under_review, approved) and optionally add a short line to their review notes ("Duplicate of …"). Drafts; nothing is deleted. To put a proposal on a meetup, use scheduleProposal instead.',
      inputSchema: z.object({
        refs: z.array(z.string()).min(1).max(30).describe('Proposal refs from talkProposals'),
        status: z.enum(PROPOSAL_STATUSES),
        note: z.string().max(300).optional().describe('One line added to the review notes, e.g. "Duplicate of <title>, sent twice."'),
      }),
      execute: async ({ refs, status, note }) => {
        const docs = await current(store, refs);
        const done: string[] = [];
        const missing = refs.filter((r) => !docs.get(publishedIdOf(r)));
        for (const p of docs.values()) {
          if (p._type !== 'talkSubmission') continue;
          const set: Record<string, unknown> = { status, reviewedAt: now().toISOString() };
          if (note) set.reviewNotes = [String(p.reviewNotes ?? '').trim(), `${formatZurich(now().toISOString())}: ${note}`].filter(Boolean).join('\n');
          const changed = await writeDraft(
            store,
            log,
            p,
            'talkSubmission',
            `Proposal: ${String(p.title ?? '')}`,
            set,
            note ? { reviewNotes: { before: '(review notes)', after: `+ ${note}` } } : {},
          );
          if (changed.length) done.push(String(p.title ?? publishedIdOf(p._id)));
        }
        return { updated: done, draft: true, ...(missing.length ? { notFound: missing } : {}) };
      },
    }),

    findSpeakers: tool({
      description:
        'Speaker profiles by name, or (duplicates: true) the profiles that look like the same person: same name, same email, or the same GitHub or LinkedIn. Each profile has its ref, URL slug, whether it is shown on the site, and how many talks and proposals point at it. Emails are compared but never shown.',
      inputSchema: z.object({ name: z.string().optional(), duplicates: z.boolean().default(false), limit: z.number().int().min(1).max(50).default(20) }),
      execute: async ({ name, duplicates, limit }) => {
        const rows = await store.query<(SpeakerDoc & { talkCount: number; proposalCount: number })[]>(SPEAKERS);
        const byId = new Map<string, (typeof rows)[number] & { hasDraft: boolean }>();
        for (const r of rows) {
          const id = publishedIdOf(r._id);
          const prev = byId.get(id);
          if (!prev || isDraftId(r._id)) byId.set(id, { ...r, hasDraft: isDraftId(r._id) || !!prev?.hasDraft });
        }
        const all = [...byId.values()];
        const view = (s: (typeof all)[number]) => ({
          ref: publishedIdOf(s._id),
          name: s.name,
          slug: s.id?.current ?? null,
          company: s.company ?? null,
          title: s.title ?? null,
          shownOnSite: s.isVisible !== false,
          hasPhoto: !!s.image,
          hasBio: !!s.bio?.trim(),
          talks: s.talkCount,
          proposals: s.proposalCount,
          hasUnpublishedChanges: s.hasDraft,
        });
        if (!duplicates) {
          const n = norm(name);
          return all
            .filter((s) => !n || norm(s.name).includes(n))
            .slice(0, limit)
            .map(view);
        }
        const keys = (s: SpeakerDoc) =>
          [
            s.name && `name:${norm(s.name)}`,
            s.email && `email:${s.email.trim().toLowerCase()}`,
            s.github && `github:${s.github.toLowerCase().replace(/\/+$/, '')}`,
            s.linkedin && `linkedin:${s.linkedin.toLowerCase().replace(/\/+$/, '')}`,
          ].filter((k): k is string => !!k);
        const groups = new Map<string, Set<string>>();
        for (const s of all) for (const k of keys(s)) groups.set(k, (groups.get(k) ?? new Set()).add(publishedIdOf(s._id)));
        // Union groups that share a profile, so one person is one group whatever matched.
        const merged: { ids: Set<string>; why: Set<string> }[] = [];
        for (const [k, ids] of groups) {
          if (ids.size < 2) continue;
          const hit = merged.find((g) => [...ids].some((i) => g.ids.has(i)));
          if (hit) {
            ids.forEach((i) => hit.ids.add(i));
            hit.why.add(k.split(':')[0]!);
          } else merged.push({ ids: new Set(ids), why: new Set([k.split(':')[0]!]) });
        }
        return merged.slice(0, limit).map((g) => ({ sameBy: [...g.why], profiles: [...g.ids].map((id) => view(byId.get(id)!)) }));
      },
    }),

    mergeSpeakers: tool({
      description:
        'Merge duplicate speaker profiles into one. Every talk, proposal or other document pointing at a duplicate then points at the profile kept; the kept profile gets the duplicate’s missing details (photo, bio, links) and its old URL, which redirects. Duplicates are hidden, not deleted. Drafts; ask which profile to keep if unclear (usually the one shown on the site with the most talks).',
      inputSchema: z.object({
        keep: z.string().describe('Ref of the profile to keep'),
        duplicates: z.array(z.string()).min(1).max(5).describe('Refs of the profiles to merge into it'),
        fillGaps: z
          .boolean()
          .default(true)
          .describe('Copy details the kept profile lacks from the duplicates. false for a spam or test profile (e.g. a fake name, script tags): then it is only hidden.'),
      }),
      execute: async ({ keep, duplicates, fillGaps = true }) => {
        const keepId = publishedIdOf(keep);
        const dupIds = [...new Set(duplicates.map(publishedIdOf))].filter((d) => d !== keepId);
        if (!dupIds.length) return { error: 'Name at least one other profile to merge.' };
        const docs = await current(store, [keepId, ...dupIds]);
        const kept = docs.get(keepId) as (SpeakerDoc & { hasDraft: boolean }) | undefined;
        if (!kept || kept._type !== 'speaker') return { error: `No speaker profile ${keep}.` };
        const dups = dupIds.map((d) => docs.get(d) as (SpeakerDoc & { hasDraft: boolean }) | undefined);
        if (dups.some((d) => !d || d._type !== 'speaker')) return { error: `Not all of ${duplicates.join(', ')} are speaker profiles.` };
        const target = await refTo(store, keepId, 'speaker', false);
        const from = new Set(dupIds);

        // 1. Everything that points at a duplicate points at the profile kept.
        const referrers = await store.query<{ _id: string; _type: string }[]>(`*[references($ids) && !(_id in $self)]{ _id, _type }`, {
          ids: dupIds,
          self: [keepId, draftIdOf(keepId), ...dupIds, ...dupIds.map(draftIdOf)],
        });
        const docsToFix = await current(
          store,
          referrers.map((r) => r._id),
        );
        const repointed: string[] = [];
        for (const d of docsToFix.values()) {
          const set: Record<string, unknown> = {};
          for (const [f, v] of Object.entries(d)) if (!f.startsWith('_') && f !== 'hasDraft' && !same(repoint(v, from, target), v)) set[f] = repoint(v, from, target);
          const names = (v: unknown) => (Array.isArray(v) ? `${v.length} speaker(s)` : 'speaker');
          const shown = Object.fromEntries(
            Object.entries(set).map(([f, v]) => [f, { before: `${names(d[f])} incl. ${dups.map((x) => x!.name).join(', ')}`, after: `${names(v)}, now ${kept.name}` }]),
          );
          if (
            (
              await writeDraft(
                store,
                log,
                d,
                d._type,
                `${d._type === 'talkSubmission' ? 'Proposal' : d._type === 'talk' ? 'Talk' : d._type}: ${String(d.title ?? d.name ?? publishedIdOf(d._id))}`,
                set,
                shown,
              )
            ).length
          )
            repointed.push(String(d.title ?? publishedIdOf(d._id)));
        }

        // 2. The profile kept: missing details from the duplicates, their old URLs, their talk list.
        const fill: Record<string, unknown> = {};
        for (const f of fillGaps ? FILLABLE : []) {
          const has = kept[f];
          if (has && (typeof has !== 'string' || has.trim())) continue;
          const from2 = dups.find((d) => d![f] && (typeof d![f] !== 'string' || String(d![f]).trim()));
          if (from2) fill[f] = from2[f];
        }
        // A spam profile's URL is not worth keeping alive as a redirect.
        const slugs = [...new Set([...(kept.legacySlugs ?? []), ...(fillGaps ? dups.flatMap((d) => [d!.id?.current, ...(d!.legacySlugs ?? [])]) : [])])].filter(
          (s): s is string => !!s && s !== kept.id?.current,
        );
        const talkRefs = [...(kept.talkReferences ?? [])];
        for (const r of dups.flatMap((d) => d!.talkReferences ?? [])) if (!talkRefs.some((x) => x._ref === r._ref)) talkRefs.push({ ...r, _key: key() });
        const keptSet: Record<string, unknown> = { ...fill, legacySlugs: slugs, ...(talkRefs.length ? { talkReferences: talkRefs } : {}) };
        const filledShown = Object.fromEntries(
          Object.keys(fill).map((f) => [f, { before: null, after: f === 'email' ? '(email from the duplicate)' : f === 'image' ? '(photo from the duplicate)' : fill[f] }]),
        );
        await writeDraft(store, log, kept, 'speaker', `Speaker: ${kept.name}`, keptSet, {
          ...filledShown,
          talkReferences: { before: `${kept.talkReferences?.length ?? 0} talk(s)`, after: `${talkRefs.length} talk(s)` },
        });

        // 3. The duplicates: hidden (their page redirects to the profile kept), never deleted.
        for (const d of dups)
          await writeDraft(
            store,
            log,
            d!,
            'speaker',
            `Speaker (duplicate): ${d!.name}`,
            { isVisible: false },
            { isVisible: { before: 'shown', after: `hidden, merged into ${kept.name}` } },
          );

        return {
          kept: kept.name,
          merged: dups.map((d) => d!.name),
          repointed,
          filledIn: Object.keys(fill).filter((f) => f !== 'email'),
          oldUrlsRedirect: fillGaps ? dups.map((d) => d!.id?.current).filter(Boolean) : [],
          draft: true,
          note: 'Publish all the drafts together. The hidden duplicates can be deleted in the Studio later by the site owner.',
        };
      },
    }),

    findTalks: tool({
      description: 'Talks (the documents meetups list) by words in the title or a speaker name, with their ref, length and speakers.',
      inputSchema: z.object({ text: z.string().min(2), limit: z.number().int().min(1).max(30).default(10) }),
      execute: async ({ text, limit }) => {
        const rows = await store.query<TalkDoc[]>(`*[_type == "talk"]{ _id, title, durationMinutes, type, "speakerNames": speakers[]->name }`);
        const t = text.toLowerCase();
        const byId = new Map<string, TalkDoc>();
        for (const r of rows) if (!byId.has(publishedIdOf(r._id)) || isDraftId(r._id)) byId.set(publishedIdOf(r._id), r);
        return [...byId.entries()]
          .filter(([, r]) => `${r.title ?? ''} ${(r.speakerNames ?? []).join(' ')}`.toLowerCase().includes(t))
          .slice(0, limit)
          .map(([id, r]) => talkLine(r, id));
      },
    }),

    scheduleProposal: tool({
      description:
        'Put a talk proposal on a meetup: makes the talk from the proposal (title, abstract, length, level, topics, speakers), adds it to the event’s talks at a position, and marks the proposal scheduled. Drafts. Then show the new running order; if the event has an agenda with times, update it with setEventProgramme.',
      inputSchema: z.object({
        proposal: z.string().describe('Proposal ref from talkProposals'),
        event: z.string().describe('Event URL slug from findEvents'),
        position: z.number().int().min(1).optional().describe('Place in the running order, 1 = first. Default: last.'),
        minutes: z.number().int().min(5).max(90).optional().describe('Length, if the organiser changes it'),
      }),
      execute: async ({ proposal, event, position, minutes }) => {
        const p = (await current(store, [proposal])).get(publishedIdOf(proposal)) as (ProposalDoc & { hasDraft: boolean }) | undefined;
        if (!p || p._type !== 'talkSubmission') return { error: `No proposal ${proposal}.` };
        const ev = await eventBySlug(store, event);
        if (!ev) return { error: `No event with slug "${event}".` };

        // The talk: the one made from this proposal before, or a new draft.
        let talkId = p.talkReference?._ref;
        let createdTalk = false;
        if (!talkId) {
          talkId = crypto.randomUUID();
          const len = minutes ?? p.durationMinutes ?? 20;
          const talk = {
            _id: draftIdOf(talkId),
            _type: 'talk',
            id: { _type: 'slug', current: `${slugify(p.title ?? 'talk')}-${talkId.slice(0, 6)}` },
            title: p.title,
            description: p.description ?? '',
            durationMinutes: len,
            type: len <= 10 ? 'lightning' : 'talk',
            ...(p.level ? { level: p.level[0]!.toUpperCase() + p.level.slice(1) } : {}),
            language: 'English',
            tags: p.tags ?? [],
            speakers: (p.speakers ?? []).map((r) => ({ _type: 'reference', _ref: r._ref, _key: key() })),
          };
          // Proposals do not carry the abstract in the list query; read it from the document.
          const full = await store.getDocument(p.hasDraft ? draftIdOf(p._id) : publishedIdOf(p._id));
          if (full?.description) talk.description = String(full.description);
          await store.saveDraft(talk);
          createdTalk = true;
          log.record({ id: talkId, type: 'talk', title: `Talk: ${p.title}`, created: true }, [
            { field: 'title', before: null, after: p.title },
            { field: 'durationMinutes', before: null, after: `${len} min` },
            { field: 'speakers', before: null, after: (await store.query<string[]>(`*[_id in $ids].name`, { ids: (p.speakers ?? []).map((r) => r._ref) })).join(', ') },
          ]);
        } else if (minutes) {
          const t = (await current(store, [talkId])).get(publishedIdOf(talkId));
          if (t) await writeDraft(store, log, t, 'talk', `Talk: ${String(t.title)}`, { durationMinutes: minutes, type: minutes <= 10 ? 'lightning' : 'talk' });
        }

        // The event: the talk in the running order.
        const refs = (ev.talks ?? []).filter((r) => r._ref !== publishedIdOf(talkId));
        const at = Math.min(Math.max((position ?? refs.length + 1) - 1, 0), refs.length);
        const newRef = await refTo(store, talkId, 'talk');
        const talks = [...refs.slice(0, at), newRef, ...refs.slice(at)];
        const titles = await talksById(
          store,
          talks.map((r) => r._ref),
        );
        const order = (rs: Ref[]) => rs.map((r, i) => `${i + 1}. ${titles.get(r._ref)?.title ?? p.title}`).join('\n');
        await writeDraft(store, log, ev, 'events', String(ev.title ?? event), { talks }, { talks: { before: order(ev.talks ?? []) || '—', after: order(talks) } }, event);

        // The proposal: scheduled, linked to its talk.
        await writeDraft(
          store,
          log,
          p,
          'talkSubmission',
          `Proposal: ${p.title}`,
          { status: 'scheduled', convertedToTalk: true, talkReference: await refTo(store, talkId, 'talk', false), reviewedAt: now().toISOString() },
          { talkReference: { before: null, after: p.title } },
        );
        return {
          event,
          talk: publishedIdOf(talkId),
          createdTalk,
          runningOrder: talks.map((r, i) => `${i + 1}. ${titles.get(r._ref)?.title ?? p.title}`),
          agendaNeedsUpdate: (ev.agenda ?? []).length > 0,
          draft: true,
        };
      },
    }),

    setEventProgramme: tool({
      description:
        'Set a meetup’s programme: the running order of its talks, and/or the agenda with times. Times only as the organiser gave them, or usualEvening: true for the times the site already estimates from the start time (doors, welcome after an hour, talks with their lengths, a food break after the second talk, networking). clearAgenda: true removes the agenda so the site estimates the evening itself (marked approximate). Drafts.',
      inputSchema: z.object({
        event: z.string().describe('Event URL slug'),
        talks: z.array(z.string()).optional().describe('Talk refs in running order (replaces the list). Missing talks are removed from the event.'),
        agenda: z
          .array(
            z.object({
              time: z.string().regex(HHMM).optional().describe('HH:MM in Zurich, as the organiser gave it'),
              kind: z.enum(['doors', 'intro', 'talk', 'break', 'networking', 'other']).optional(),
              title: z.string().optional().describe('For non-talk items, e.g. "Doors open"'),
              talk: z.string().optional().describe('Talk ref, for a talk slot'),
              note: z.string().optional(),
            }),
          )
          .optional()
          .describe('The whole evening in order (replaces the agenda)'),
        usualEvening: z.boolean().optional().describe('Write the agenda from the talks with the usual evening times'),
        clearAgenda: z.boolean().optional(),
      }),
      execute: async ({ event, talks, agenda, usualEvening, clearAgenda }) => {
        const ev = await eventBySlug(store, event);
        if (!ev) return { error: `No event with slug "${event}".` };
        const set: Record<string, unknown> = {};
        const shown: Record<string, { before: unknown; after: unknown }> = {};
        const wanted = [...(talks ?? []), ...(agenda ?? []).flatMap((a) => (a.talk ? [a.talk] : []))];
        const known = await talksById(store, [...wanted, ...(ev.talks ?? []).map((r) => r._ref)]);
        const unknown = wanted.filter((t) => !known.has(publishedIdOf(t)));
        if (unknown.length) return { error: `Unknown talk ref(s): ${unknown.join(', ')}. Use getEvent or findTalks for refs.` };
        const titleOf = (id: string) => known.get(publishedIdOf(id))?.title ?? id;

        let order = (ev.talks ?? []).map((r) => r._ref);
        if (talks) {
          order = talks.map(publishedIdOf);
          set.talks = await Promise.all(order.map((id) => refTo(store, id, 'talk')));
          shown.talks = {
            before: (ev.talks ?? []).map((r, i) => `${i + 1}. ${titleOf(r._ref)}`).join('\n') || '—',
            after: order.map((id, i) => `${i + 1}. ${titleOf(id)}`).join('\n'),
          };
        }
        const agendaLine = (a: { time?: string; title?: string; talk?: Ref | string }) =>
          `${a.time ?? '--:--'} ${a.title || (a.talk ? titleOf(typeof a.talk === 'string' ? a.talk : a.talk._ref) : '')}`;
        let items: { time?: string; kind?: string; title?: string; talk?: string; note?: string }[] | undefined = agenda;
        if (usualEvening) {
          if (!ev.datetime) return { error: 'The event has no start time yet; the usual evening is counted from it.' };
          items = buildSchedule({
            agenda: [],
            talks: order.map((id) => ({ id, title: titleOf(id), durationMin: known.get(id)?.durationMinutes ?? 20, format: 'talk', speakerIds: [] })),
            startsAt: ev.datetime,
          }).map((s) => ({ time: s.time, kind: s.kind, ...(s.talk?.id ? { talk: s.talk.id } : { title: s.title }) }));
        }
        if (items) {
          set.agenda = await Promise.all(
            items.map(async (a) => ({
              _key: key(),
              _type: 'agendaItem',
              ...(a.time ? { time: a.time } : {}),
              ...(a.kind && a.kind !== 'other' ? { kind: a.kind } : {}),
              ...(a.title ? { title: a.title } : {}),
              ...(a.talk ? { talk: await refTo(store, a.talk, 'talk', false) } : {}),
              ...(a.note ? { note: a.note } : {}),
            })),
          );
          shown.agenda = { before: (ev.agenda ?? []).map(agendaLine).join('\n') || '— (the site estimates the evening)', after: items.map(agendaLine).join('\n') };
        } else if (clearAgenda) {
          set.agenda = [];
          shown.agenda = { before: (ev.agenda ?? []).map(agendaLine).join('\n') || '—', after: '— (the site estimates the evening, marked approximate)' };
        }
        if (!Object.keys(set).length) return { error: 'Pass talks, agenda, usualEvening or clearAgenda.' };
        const changed = await writeDraft(store, log, ev, 'events', String(ev.title ?? event), set, shown, event);
        if (!changed.length) return { unchanged: true };
        const after = await eventProgramme(store, { ...ev, ...set } as EventDoc);
        return { updated: event, changed, draft: true, schedule: after.schedule, timesFrom: usualEvening ? 'the usual evening (say so)' : items ? 'the organiser' : 'unchanged' };
      },
    }),

    updateTalkDraft: tool({
      description:
        'Change a talk: its length in minutes, title, abstract or kind (talk, lightning, deep-dive). Drafts. If the event has an agenda with times, say the later times may need moving (setEventProgramme).',
      inputSchema: z.object({
        talk: z.string().describe('Talk ref from getEvent or findTalks'),
        minutes: z.number().int().min(5).max(120).optional(),
        title: z.string().min(3).optional(),
        description: z.string().optional(),
        type: z.enum(['talk', 'lightning', 'deep-dive']).optional(),
      }),
      execute: async ({ talk, minutes, title, description, type }) => {
        const t = (await current(store, [talk])).get(publishedIdOf(talk));
        if (!t || t._type !== 'talk') return { error: `No talk ${talk}.` };
        const set = Object.fromEntries(
          Object.entries({
            durationMinutes: minutes,
            title,
            description,
            type: type ?? (minutes ? (minutes <= 10 ? 'lightning' : t.type === 'lightning' ? 'talk' : undefined) : undefined),
          }).filter(([, v]) => v !== undefined),
        );
        const changed = await writeDraft(store, log, t, 'talk', `Talk: ${String(title ?? t.title)}`, set);
        return changed.length ? { updated: String(t.title), changed, draft: true } : { unchanged: true };
      },
    }),
  };
}
