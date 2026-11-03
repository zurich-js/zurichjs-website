import {
  buildSchedule,
  initials,
  type Event,
  type EventStatus,
  type Partner,
  type PartnerKind,
  type Photo,
  type RatingRecord,
  type Speaker,
  type SpeakerTalk,
  type SponsorTier,
  type SupporterRole,
  type TalkFormat,
  type TalkRef,
  type Venue,
} from '@zurichjs/events';

import type { EVENTS_QUERY_RESULT, PARTNERS_QUERY_RESULT, SINGLETONS_QUERY_RESULT, SPEAKERS_QUERY_RESULT } from './sanity.types.ts';

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
export type RawEvent = Loose<EVENTS_QUERY_RESULT[number]> & { _id: string; id: string };
export type RawTalk = NonNullable<NonNullable<RawEvent['talks']>[number]>;
export type RawSpeaker = Loose<SPEAKERS_QUERY_RESULT[number]> & { id: string };
export type RawPartner = Loose<PARTNERS_QUERY_RESULT[number]> & { id: string };
export type RawSingletons = Loose<SINGLETONS_QUERY_RESULT>;

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
    slug: u(t.id),
    title: t.title ?? 'Untitled talk',
    description: u(t.description),
    format: talkFormat(u(t.type), u(t.durationMinutes)),
    durationMin: t.durationMinutes ?? 0,
    level: u(t.level),
    language: u(t.language),
    tags: (t.tags ?? []).filter((x): x is string => !!x),
    slidesUrl: u(t.slidesUrl),
    speakerIds: (t.speakerIds ?? []).filter((s): s is string => !!s?.trim()).map(cleanId),
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
  if (v?.name)
    return {
      name: v.name,
      street: u(v.street),
      zip: u(v.zip),
      city: v.city || 'Zürich',
      directions: u(v.directions),
      entrance: u(v.entrance),
      transport: u(v.transport),
      accessibility: u(v.accessibility),
    };
  if (!r.location) return undefined;
  return { name: r.location, ...parseAddress(r.address) };
}

const ROLES: SupporterRole[] = ['venue', 'food', 'sponsor', 'community'];

export function mapEvent(r: RawEvent): Event {
  const talks = (r.talks ?? []).filter((t): t is RawTalk => !!t).map(mapTalk);
  const startsAt = u(r.datetime);
  const agenda = buildSchedule({
    agenda: (r.agenda ?? []).map((a) => ({ time: a.time, kind: a.kind, title: a.title, note: a.note, talk: a.talk ? mapTalk(a.talk) : undefined })),
    talks,
  });
  // Photos taken at the event. The promotional artwork (`image`) is the cover, never a photo.
  const photos: Photo[] = (r.photos ?? []).filter((p) => p.src).map((p) => ({ src: p.src!, alt: p.alt ?? r.title ?? '', width: u(p.width), height: u(p.height) }));
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
            speakerIds: (t.talk?.speakerIds ?? []).filter((s): s is string => !!s?.trim()).map(cleanId),
            summary: t.summary ?? '',
            format: t.format ?? `${formatLabel[talkFormat(u(t.talk?.type), u(t.talk?.durationMinutes))]}${t.talk?.durationMinutes ? ` · ${t.talk.durationMinutes} min` : ''}`,
          })),
        }
      : undefined,
    hosts: (r.hosts ?? []).filter((h): h is string => !!h),
    supporters: (r.supporters ?? []).flatMap((x) =>
      x?.partnerId ? [{ partnerId: x.partnerId, role: (ROLES as (string | null | undefined)[]).includes(x.role) ? (x.role as SupporterRole) : 'sponsor' }] : [],
    ),
    photoCredit: u(r.photoCredit),
    cover: r.image ? { src: r.image, alt: r.title ?? 'Event artwork' } : undefined,
    updatedAt: u(r._updatedAt),
  };
}

const firstSentence = (s?: string | null) => (s ? (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 80) : '');

/** Only speakers an editor marked visible get a profile and a directory card; a blank flag is not a yes. */
export function visibleSpeakers(raw: RawSpeaker[]): RawSpeaker[] {
  return raw.filter((r) => r.isVisible === true);
}

/** The /speakers directory lists only people who gave a talk at a ZurichJS event; their profiles stay up either way. */
export function speakersWithTalks<T extends Pick<Speaker, 'talks'>>(speakers: T[]): T[] {
  return speakers.filter((s) => s.talks.some((t) => t.eventSlugs.length > 0));
}

/** Speaker IDs are URL segments; a few stored ones carry stray spaces (" nicolò-ribaudo"). */
export const cleanId = (id: string) => id.trim();

/** "Lukas Spirig Product Owner at SBB" → "Product Owner at SBB": a role that repeats the name drops it. */
export function cleanRole(role: string | null | undefined, name: string): string {
  const r = (role ?? '').replace(/\s+/g, ' ').trim();
  const n = name.replace(/\s+/g, ' ').trim();
  if (n && r.toLowerCase().startsWith(n.toLowerCase()))
    return r
      .slice(n.length)
      .replace(/^[\s,|·:-]+/, '')
      .trim();
  return r;
}

export function mapSpeaker(r: RawSpeaker): Speaker {
  const id = cleanId(r.id);
  const name = (r.name ?? r.id).replace(/\s+/g, ' ').trim();
  const links = [
    r.website && { label: 'Website', url: r.website },
    r.github && { label: 'GitHub', url: r.github },
    r.linkedin && { label: 'LinkedIn', url: r.linkedin },
    r.twitter && { label: 'X', url: r.twitter },
  ].filter((l): l is { label: string; url: string } => !!l);
  // One entry per talk, with every event it was given at (events that list the
  // talk, plus the old single `talk.events` reference).
  const talks: SpeakerTalk[] = (r.talks ?? []).map((t) => ({
    id: u(t._id),
    slug: u(t.id),
    title: t.title ?? 'Untitled talk',
    description: u(t.description),
    format: formatLabel[talkFormat(u(t.type), u(t.durationMinutes))],
    durationMin: u(t.durationMinutes),
    tags: (t.tags ?? []).filter((x): x is string => !!x),
    slidesUrl: u(t.slidesUrl),
    eventSlugs: [...new Set([...(t.eventIds ?? []), t.legacyEventId].filter((x): x is string => !!x))],
  }));
  return {
    id,
    name,
    role: cleanRole(r.title, name),
    company: u(r.company),
    initials: initials(name),
    bio: r.bio ?? '',
    topics: (r.interests ?? []).filter((i): i is string => !!i),
    tagline: r.tagline ?? firstSentence(r.talks?.[0]?.title),
    photo: r.image ? { src: r.image, alt: name } : undefined,
    links,
    talks,
    // The stored ID stays a legacy slug when trimming changed it, so the old URL redirects.
    legacySlugs: [...new Set([...(r.legacySlugs ?? []), r.id])].filter((x): x is string => !!x && x !== id),
    updatedAt: u(r._updatedAt),
  };
}

const KINDS: PartnerKind[] = ['sponsor', 'venue', 'food', 'community', 'conference', 'supporting'];
const TIERS: SponsorTier[] = ['champion', 'builder', 'friend', 'supporter'];

export const mapPartner = (r: RawPartner): Partner => ({
  id: r.id,
  name: r.name ?? r.id,
  url: u(r.url),
  logo: u(r.logo),
  kinds: (r.kinds ?? []).filter((k): k is PartnerKind => (KINDS as (string | null | undefined)[]).includes(k)),
  tier: (TIERS as (string | null | undefined)[]).includes(r.tier) ? (r.tier as SponsorTier) : undefined,
  // Never "current" unless an organiser ticked it, and never after its end date.
  current: r.current === true && !(r.until && Date.parse(r.until) < Date.now()),
  since: u(r.since),
  until: u(r.until),
  description: u(r.description),
  allowReferrer: r.allowReferrer === true,
});

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
