/**
 * The evening's programme, in one place. Event pages, the Tonight page,
 * speaker pages and calendar files all read it from here.
 *
 * What each field means (docs/v2/DECISIONS.md, 2026-11-02):
 *   - `datetime` (startsAt) is the start time listed on Meetup. It is not
 *     called "doors": production never used it consistently as doors, so the
 *     site says "Starts 18:00".
 *   - Doors, the welcome, each talk, breaks, networking and the close have a
 *     time only when the event's `agenda` gives one (HH:MM in Zurich).
 *   - The end is `endsAt`, or the agenda's close line; otherwise unknown.
 * Without an agenda the programme is the talks in running order, with no
 * times and no doors, welcome, break or networking lines. Nothing is guessed.
 */
import { time, zoneLabel, zurichDay, zurichWallTime } from './format.ts';
import type { AgendaItem, Event, ScheduleKind, TalkRef } from './types.ts';

const KINDS: ScheduleKind[] = ['doors', 'intro', 'talk', 'break', 'networking', 'close', 'other'];

/** The kind of a line: explicit in Sanity, else a talk reference, else read from the title. */
export function inferKind(item: { kind?: string | null; title?: string | null; talk?: unknown }): ScheduleKind {
  if (item.kind && (KINDS as string[]).includes(item.kind)) return item.kind as ScheduleKind;
  if (item.talk) return 'talk';
  const t = (item.title ?? '').toLowerCase();
  if (/\bdoors?\b|arriv|check-?in/.test(t)) return 'doors';
  if (/welcome|intro|opening/.test(t)) return 'intro';
  if (/break|pizza|food|dinner|snack/.test(t)) return 'break';
  if (/network|drinks|apéro|apero|socialis/.test(t)) return 'networking';
  if (/\bclose|closing|wrap|end\b|goodbye/.test(t)) return 'close';
  return 'other';
}

export interface ScheduleInput {
  agenda?: { time?: string | null; kind?: string | null; title?: string | null; note?: string | null; talk?: TalkRef }[];
  talks: TalkRef[];
}

const HHMM = /^\d{1,2}:\d{2}$/;
const cleanTime = (t?: string | null) => (t && HHMM.test(t.trim()) ? t.trim().padStart(5, '0') : '');

/** Builds the ordered programme from what Sanity has. Used by the content mappers. */
export function buildSchedule({ agenda, talks }: ScheduleInput): AgendaItem[] {
  if (agenda?.length) {
    const items = agenda.map((a) => {
      const kind = inferKind(a);
      return {
        time: cleanTime(a.time),
        kind,
        title: a.title || a.talk?.title || (kind === 'doors' ? 'Doors open' : ''),
        note: a.note || undefined,
        talk: a.talk,
      } satisfies AgendaItem;
    });
    // Talks on the event that the agenda forgot still belong to the evening.
    const listed = new Set(items.flatMap((i) => (i.talk?.id ? [i.talk.id] : [])));
    const missing = talks.filter((t) => t.id && !listed.has(t.id)).map((t) => ({ time: '', kind: 'talk' as const, title: t.title, talk: t }));
    return [...items, ...missing];
  }
  // The event's `datetime` is the Meetup start, not doors: it never becomes a programme line.
  return talks.map((t) => ({ time: '', kind: 'talk' as const, title: t.title, talk: t }));
}

/** The talks of an event, in running order. */
export const eventTalks = (ev: Pick<Event, 'agenda'>): TalkRef[] => ev.agenda.flatMap((a) => (a.talk ? [a.talk] : []));

/** The instant a programme line starts, on the event's day in Zurich; undefined without a time. */
export function itemStartsAt(ev: Pick<Event, 'startsAt'>, item: Pick<AgendaItem, 'time'>): Date | undefined {
  if (!ev.startsAt || !item.time) return undefined;
  return zurichWallTime(zurichDay(ev.startsAt), item.time);
}

export interface ScheduleFacts {
  /** "18:00": the event's start as listed on Meetup (`datetime`). */
  starts?: string;
  /** "17:30": doors, only when the agenda has a timed doors line. */
  doors?: string;
  /** "18:30": the first timed line after doors (welcome or the first talk). */
  programmeStarts?: string;
  /** "18:50": the first talk, when the agenda gives it a time. */
  firstTalk?: string;
  /** "21:30": `endsAt`, else the agenda's timed close line; undefined when not known. */
  ends?: string;
  /** "CET" or "CEST" on the event's date. */
  zone?: string;
}

/** The instant the evening ends: `endsAt`, else the agenda's timed close line. Undefined when nobody said. */
export function eventEndsAt(ev: Pick<Event, 'agenda' | 'startsAt' | 'endsAt'>): Date | undefined {
  if (ev.endsAt) return new Date(ev.endsAt);
  const close = ev.agenda.find((a) => a.kind === 'close' && a.time);
  return close ? itemStartsAt(ev, close) : undefined;
}

export function scheduleFacts(ev: Pick<Event, 'agenda' | 'startsAt'> & { endsAt?: string }): ScheduleFacts {
  const doors = ev.agenda.find((a) => a.kind === 'doors' && a.time)?.time;
  const programmeStarts = ev.agenda.find((a) => a.kind !== 'doors' && a.time)?.time;
  const firstTalk = ev.agenda.find((a) => a.kind === 'talk')?.time || undefined;
  const end = eventEndsAt(ev);
  return {
    starts: ev.startsAt ? time(ev.startsAt) : undefined,
    doors,
    programmeStarts,
    firstTalk,
    ends: end ? time(end.toISOString()) : undefined,
    zone: ev.startsAt ? zoneLabel(ev.startsAt) : undefined,
  };
}

/**
 * "Doors 17:30 · Talks from 18:50 CET" when the agenda says so, else
 * "Starts 18:00 CET" (the Meetup start). Never claims a doors time that only
 * the event's `datetime` implies.
 */
export function timesLine(ev: Pick<Event, 'agenda' | 'startsAt'> & { endsAt?: string }): string {
  const f = scheduleFacts(ev);
  const lead = f.doors ? `Doors ${f.doors}` : f.starts ? `Starts ${f.starts}` : '';
  if (!lead) return '';
  const parts = [lead];
  const first = f.doors ?? f.starts;
  if (f.firstTalk && f.firstTalk !== first) parts.push(`Talks from ${f.firstTalk}`);
  return `${parts.join(' · ')} ${f.zone ?? ''}`.trim();
}

/** When the visitor reads the programme: before the event's day, on it, or after it. */
export type ProgrammeMoment = 'future' | 'now' | 'past';

/**
 * The one note shown above a programme whose talks have no times, or
 * undefined when every talk has a time (or there are no talks).
 * Replaces a per-talk "time not fixed" placeholder.
 */
export function untimedNote(ev: Pick<Event, 'agenda'>, moment: ProgrammeMoment): string | undefined {
  const talks = ev.agenda.filter((a) => a.talk);
  if (!talks.length || talks.every((a) => a.time)) return undefined;
  const some = talks.some((a) => a.time);
  if (moment === 'past') return some ? 'Talks in running order. Some talk times weren’t recorded.' : 'Talks in running order. Talk times weren’t recorded.';
  if (moment === 'now') return 'Talks in running order.';
  return 'Talks in running order. Talk times follow closer to the day.';
}

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/** Stable anchor for a talk on its event page: #talk-<talk ID>. */
export const talkAnchor = (talk: Pick<TalkRef, 'slug' | 'id' | 'title'>) => `talk-${talk.slug ? slugify(talk.slug) : slugify(talk.title) || (talk.id ?? 'talk')}`;

/** "Talk · 25 min" */
export const talkFormatLine = (talk: Pick<TalkRef, 'format' | 'durationMin'>) =>
  [{ talk: 'Talk', lightning: 'Lightning talk', 'deep-dive': 'Deep dive' }[talk.format], talk.durationMin ? `${talk.durationMin} min` : ''].filter(Boolean).join(' · ');

/** "Hardstrasse 201, 8005 Zürich", or just the city when the street is unknown. */
export const venueAddress = (v: { street?: string; zip?: string; city: string }) => [v.street, [v.zip, v.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

/** Directions in Google Maps; works without an API key and opens the app on phones. */
export const directionsUrl = (v: { name: string; street?: string; zip?: string; city: string }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([v.name, venueAddress(v)].filter(Boolean).join(', '))}`;

/** Google Maps Embed API (place mode). Only used after the visitor asks for the map. */
export const mapEmbedUrl = (v: { name: string; street?: string; zip?: string; city: string }, key: string) =>
  `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent([v.name, venueAddress(v)].filter(Boolean).join(', '))}`;

/** Lowercase, no accents, single spaces: "  Nicolò  BABEL " → "nicolo babel". */
export const normalizeSearch = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Everything a speaker search should find: name, profile text, talk titles, descriptions and topics. */
export const speakerSearchText = (s: {
  name: string;
  role: string;
  company?: string;
  tagline: string;
  bio: string;
  topics: string[];
  talks: { title: string; description?: string; tags: string[] }[];
}) => normalizeSearch([s.name, s.role, s.company, s.tagline, s.bio, ...s.topics, ...s.talks.flatMap((t) => [t.title, t.description, ...t.tags])].filter(Boolean).join(' '));

/** Topics people actually spoke about (talk tags), with counts, most common first, then A–Z. */
export function speakerTopics(speakers: { talks: { tags: string[] }[] }[], min = 2): { topic: string; count: number }[] {
  const counts = new Map<string, { topic: string; count: number }>();
  for (const s of speakers) {
    const seen = new Set<string>();
    for (const t of s.talks.flatMap((x) => x.tags)) {
      const k = normalizeSearch(t);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      const c = counts.get(k) ?? { topic: t.trim(), count: 0 };
      c.count++;
      counts.set(k, c);
    }
  }
  return [...counts.values()].filter((c) => c.count >= min).sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
}
