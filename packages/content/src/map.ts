import {
  initials,
  type AgendaItem,
  type Event,
  type EventStatus,
  type Partner,
  type Photo,
  type RatingRecord,
  type Speaker,
  type SpeakerTalk,
  type TalkFormat,
  type TalkRef,
  type Venue,
} from '@zurichjs/events';

import type { EVENTS_QUERYResult, PARTNERS_QUERYResult, SINGLETONS_QUERYResult, SPEAKERS_QUERYResult } from './sanity.types';

/**
 * Raw shapes returned by queries.ts, derived from the types `sanity typegen` generates
 * from the Studio schema and these queries (src/sanity.types.ts). A query or schema
 * change that the mappers do not handle fails `tsc`.
 *
 * Production documents predate the V2 schema, so `Loose` makes every field
 * optional and nullable: the mappers must not trust "required" schema fields.
 */
type Loose<T> = T extends readonly (infer U)[] ? Loose<U>[] : T extends object ? { [K in keyof T]?: Loose<T[K]> | null } : T;

/** The queries filter on `defined(id.current)`, so the slug is always there. */
export type RawEvent = Loose<EVENTS_QUERYResult[number]> & { _id: string; id: string };
export type RawTalk = NonNullable<NonNullable<RawEvent['talks']>[number]>;
export type RawSpeaker = Loose<SPEAKERS_QUERYResult[number]> & { id: string };
export type RawPartner = Loose<PARTNERS_QUERYResult[number]> & { id: string };
export type RawSingletons = Loose<SINGLETONS_QUERYResult>;

/** null (GROQ) → undefined (domain types). */
const u = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

const STATUSES: EventStatus[] = ['scheduled', 'rsvp-soon', 'tbc', 'full', 'postponed', 'cancelled'];

/** Free-text talk types in Sanity → V2 formats. Unknown values count as a regular talk. */
export function talkFormat(type?: string, minutes?: number): TalkFormat {
  const t = (type ?? '').toLowerCase();
  if (t.includes('lightning') || (minutes !== undefined && minutes > 0 && minutes <= 10)) return 'lightning';
  if (t.includes('deep') || t.includes('workshop') || (minutes !== undefined && minutes >= 45)) return 'deep-dive';
  return 'talk';
}

const formatLabel: Record<TalkFormat, SpeakerTalk['format']> = { talk: 'Talk', lightning: 'Lightning talk', 'deep-dive': 'Deep dive' };

export function mapTalk(t: RawTalk): TalkRef {
  return {
    // Document id, so ratings can reference the talk.
    id: u(t._id ?? t.id),
    title: t.title ?? 'Untitled talk',
    description: u(t.description),
    format: talkFormat(u(t.type), u(t.durationMinutes)),
    durationMin: t.durationMinutes ?? 0,
    level: u(t.level),
    language: u(t.language),
    speakerIds: (t.speakerIds ?? []).filter((s): s is string => !!s),
  };
}

/**
 * "Langstrasse 1, 8004 Zürich" → street, zip, city. Best effort: anything that
 * does not parse stays in `street` and the city defaults to Zürich.
 */
export function parseAddress(address?: string | null): Pick<Venue, 'street' | 'zip' | 'city'> {
  if (!address) return { city: 'Zürich' };
  const m = address.match(/^(.*?),?\s*(\d{4})\s+([^,]+?)(?:,\s*Switzerland)?$/i);
  if (m) return { street: m[1]!.replace(/,\s*$/, '').trim() || undefined, zip: m[2], city: m[3]!.trim() };
  return { street: address.trim(), city: 'Zürich' };
}

function mapVenue(r: RawEvent): Venue | undefined {
  const v = r.venue;
  if (v?.name) return { name: v.name, street: u(v.street), zip: u(v.zip), city: v.city || 'Zürich', directions: u(v.directions) };
  if (!r.location) return undefined;
  return { name: r.location, ...parseAddress(r.address) };
}

const ZURICH_TIME = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export function mapEvent(r: RawEvent): Event {
  const talks = (r.talks ?? []).filter((t): t is RawTalk => !!t).map(mapTalk);
  const startsAt = u(r.datetime);
  const agenda: AgendaItem[] = r.agenda?.length
    ? r.agenda.map((a) => ({ time: a.time ?? '', title: a.title ?? a.talk?.title ?? '', note: u(a.note), talk: a.talk ? mapTalk(a.talk) : undefined }))
    : talks.map((t) => ({ time: startsAt ? ZURICH_TIME(startsAt) : '', title: t.title, talk: t }));
  const photos: Photo[] = [
    ...(r.photos ?? []).filter((p) => p.src).map((p) => ({ src: p.src!, alt: p.alt ?? r.title ?? '', width: u(p.width), height: u(p.height) })),
    ...(!r.photos?.length && r.image ? [{ src: r.image, alt: r.title ?? 'Meetup photo' }] : []),
  ];
  return {
    id: r._id,
    slug: r.id,
    title: r.title ?? 'Untitled event',
    status: r.status && STATUSES.includes(r.status) ? r.status : 'scheduled',
    startsAt,
    endsAt: u(r.endsAt),
    dateText: u(r.dateText),
    venue: mapVenue(r),
    venueNote: u(r.venueNote),
    meetupUrl: u(r.meetupUrl),
    description: r.description ?? '',
    agenda,
    practical: (r.practical ?? []).filter((p) => p.label && p.value).map((p) => ({ label: p.label!, value: p.value! })),
    photos,
    recap: r.recap?.talks?.length
      ? {
          talks: r.recap.talks.map((t) => ({
            title: t.talk?.title ?? '',
            speakerIds: (t.talk?.speakerIds ?? []).filter((s): s is string => !!s),
            summary: t.summary ?? '',
            format: t.format ?? `${formatLabel[talkFormat(u(t.talk?.type), u(t.talk?.durationMinutes))]}${t.talk?.durationMinutes ? ` · ${t.talk.durationMinutes} min` : ''}`,
          })),
        }
      : undefined,
    hosts: (r.hosts ?? []).filter((h): h is string => !!h),
    updatedAt: u(r._updatedAt),
  };
}

const firstSentence = (s?: string | null) => (s ? (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 80) : '');

export function mapSpeaker(r: RawSpeaker): Speaker {
  const name = r.name ?? r.id;
  const links = [
    r.website && { label: 'Website', url: r.website },
    r.github && { label: 'GitHub', url: r.github },
    r.linkedin && { label: 'LinkedIn', url: r.linkedin },
    r.twitter && { label: 'X', url: r.twitter },
  ].filter((l): l is { label: string; url: string } => !!l);
  const talks: SpeakerTalk[] = (r.talks ?? []).flatMap((t) =>
    (t.eventIds?.length ? t.eventIds : ['']).map((eventId) => ({ eventId: eventId ?? '', title: t.title ?? '', format: formatLabel[talkFormat(u(t.type), u(t.durationMinutes))] })),
  );
  return {
    id: r.id,
    name,
    role: r.title ?? '',
    company: u(r.company),
    initials: initials(name),
    bio: r.bio ?? '',
    topics: (r.interests ?? []).filter((i): i is string => !!i),
    tagline: r.tagline ?? firstSentence(r.talks?.[0]?.title),
    photo: r.image ? { src: r.image, alt: name } : undefined,
    links,
    talks,
    updatedAt: u(r._updatedAt),
  };
}

export const mapPartner = (r: RawPartner): Partner => ({ id: r.id, name: r.name ?? r.id, url: u(r.url), logo: u(r.logo) });

/** A rating without a score hides the rating part of the proof sentence (the award stays). */
export function mapRating(r: RawSingletons['rating']): RatingRecord | null {
  if (!r?.score || !r.url) return null;
  return { score: r.score, scale: r.scale ?? 5, count: r.count ?? 0, url: r.url, source: r.source ?? 'Meetup', checkedAt: r.checkedAt ?? '' };
}

export interface SupportInfo {
  /** Twint QR for one-off contributions on /donate. Absent until uploaded in Site settings. */
  twintQr?: Photo;
  twintNote?: string;
}

export function mapSupport(r: RawSingletons['support']): SupportInfo {
  const qr = r?.twintQr;
  return {
    twintQr: qr?.src ? { src: qr.src, alt: qr.alt || 'Twint QR code for a contribution to ZurichJS', width: u(qr.width), height: u(qr.height) } : undefined,
    twintNote: u(r?.twintNote),
  };
}
