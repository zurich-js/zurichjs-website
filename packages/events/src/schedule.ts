/**
 * The evening's programme, in one place. Event pages, the Tonight page,
 * speaker pages and calendar files all read it from here.
 *
 * Sanity has no per-talk time: times live only in the event's `agenda`
 * (HH:MM in Zurich). When the agenda is empty, the programme is doors (the
 * event's `datetime`, titled "Doors" in the Studio) plus the talks in
 * running order without times. Nothing is guessed.
 */
import { time, zoneLabel, zurichDay, zurichWallTime } from './format';
import type { AgendaItem, Event, ScheduleKind, TalkRef } from './types';

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
  startsAt?: string;
}

const HHMM = /^\d{1,2}:\d{2}$/;
const cleanTime = (t?: string | null) => (t && HHMM.test(t.trim()) ? t.trim().padStart(5, '0') : '');

/** Builds the ordered programme from what Sanity has. Used by the content mappers. */
export function buildSchedule({ agenda, talks, startsAt }: ScheduleInput): AgendaItem[] {
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
  if (!talks.length) return [];
  return [
    ...(startsAt ? [{ time: time(startsAt), kind: 'doors' as const, title: 'Doors open' }] : []),
    ...talks.map((t) => ({ time: '', kind: 'talk' as const, title: t.title, talk: t })),
  ];
}

/** The talks of an event, in running order. */
export const eventTalks = (ev: Pick<Event, 'agenda'>): TalkRef[] => ev.agenda.flatMap((a) => (a.talk ? [a.talk] : []));

/** True when the programme has a time for every talk. */
export const isTimed = (ev: Pick<Event, 'agenda'>) => ev.agenda.some((a) => a.talk) && ev.agenda.every((a) => a.kind !== 'talk' || !!a.time);

/** The instant a programme line starts, on the event's day in Zurich; undefined without a time. */
export function itemStartsAt(ev: Pick<Event, 'startsAt'>, item: Pick<AgendaItem, 'time'>): Date | undefined {
  if (!ev.startsAt || !item.time) return undefined;
  return zurichWallTime(zurichDay(ev.startsAt), item.time);
}

export interface ScheduleFacts {
  /** "18:00": the event's doors. */
  doors?: string;
  /** "18:30": the first line after doors (welcome or the first talk). */
  programmeStarts?: string;
  /** "18:50": the first talk, when the agenda gives it a time. */
  firstTalk?: string;
  /** "CET" or "CEST" on the event's date. */
  zone?: string;
}

export function scheduleFacts(ev: Pick<Event, 'agenda' | 'startsAt'>): ScheduleFacts {
  const doorsItem = ev.agenda.find((a) => a.kind === 'doors' && a.time);
  const doors = doorsItem?.time || (ev.startsAt ? time(ev.startsAt) : undefined);
  const programmeStarts = ev.agenda.find((a) => a.kind !== 'doors' && a.time)?.time;
  const firstTalk = ev.agenda.find((a) => a.kind === 'talk')?.time || undefined;
  return { doors, programmeStarts, firstTalk, zone: ev.startsAt ? zoneLabel(ev.startsAt) : undefined };
}

/** "Doors 18:00 · Talks from 18:50 CET", or "Doors 18:00 CET" when the talk times are not fixed. */
export function timesLine(ev: Pick<Event, 'agenda' | 'startsAt'>): string {
  const f = scheduleFacts(ev);
  if (!f.doors) return '';
  const parts = [`Doors ${f.doors}`];
  if (f.firstTalk && f.firstTalk !== f.doors) parts.push(`Talks from ${f.firstTalk}`);
  return `${parts.join(' · ')} ${f.zone ?? ''}`.trim();
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
