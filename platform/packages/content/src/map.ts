import { initials, type AgendaItem, type Event, type EventStatus, type Partner, type Photo, type Speaker, type SpeakerTalk, type TalkFormat, type TalkRef, type Venue } from '@zurichjs/events';

/* Raw shapes returned by queries.ts. Every field is optional: documents predate the V2 schema. */
export interface RawTalk {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  type?: string;
  durationMinutes?: number;
  tags?: string[];
  level?: string;
  language?: string;
  speakerIds?: (string | null)[];
}
export interface RawEvent {
  _id: string;
  _updatedAt?: string;
  id: string;
  title?: string;
  status?: EventStatus;
  datetime?: string;
  endsAt?: string;
  dateText?: string;
  location?: string;
  address?: string;
  venue?: Partial<Venue>;
  venueNote?: string;
  description?: string;
  meetupUrl?: string;
  isProMeetup?: boolean;
  stripePriceId?: string;
  image?: string;
  photos?: { src?: string; alt?: string; width?: number; height?: number }[] | null;
  practical?: { label?: string; value?: string }[] | null;
  hosts?: (string | null)[] | null;
  agenda?: { time?: string; title?: string; note?: string; talk?: RawTalk | null }[] | null;
  talks?: (RawTalk | null)[] | null;
  recap?: { talks?: { summary?: string; format?: string; talk?: RawTalk | null }[] | null } | null;
}
export interface RawSpeaker {
  id: string;
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  interests?: string[];
  tagline?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  image?: string;
  _updatedAt?: string;
  talks?: { title?: string; type?: string; durationMinutes?: number; eventIds?: string[] }[];
}

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
    id: t._id ?? t.id,
    title: t.title ?? 'Untitled talk',
    description: t.description,
    format: talkFormat(t.type, t.durationMinutes),
    durationMin: t.durationMinutes ?? 0,
    level: t.level,
    language: t.language,
    speakerIds: (t.speakerIds ?? []).filter((s): s is string => !!s),
  };
}

/**
 * "Langstrasse 1, 8004 Zürich" → street, zip, city. Best effort: anything that
 * does not parse stays in `street` and the city defaults to Zürich.
 */
export function parseAddress(address?: string): Pick<Venue, 'street' | 'zip' | 'city'> {
  if (!address) return { city: 'Zürich' };
  const m = address.match(/^(.*?),?\s*(\d{4})\s+([^,]+?)(?:,\s*Switzerland)?$/i);
  if (m) return { street: m[1]!.replace(/,\s*$/, '').trim() || undefined, zip: m[2], city: m[3]!.trim() };
  return { street: address.trim(), city: 'Zürich' };
}

function mapVenue(r: RawEvent): Venue | undefined {
  if (r.venue?.name) return { city: 'Zürich', ...r.venue, name: r.venue.name };
  if (!r.location) return undefined;
  return { name: r.location, ...parseAddress(r.address) };
}

const ZURICH_TIME = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export function mapEvent(r: RawEvent): Event {
  const talks = (r.talks ?? []).filter((t): t is RawTalk => !!t).map(mapTalk);
  const agenda: AgendaItem[] = r.agenda?.length
    ? r.agenda.map((a) => ({ time: a.time ?? '', title: a.title ?? a.talk?.title ?? '', note: a.note, talk: a.talk ? mapTalk(a.talk) : undefined }))
    : talks.map((t) => ({ time: r.datetime ? ZURICH_TIME(r.datetime) : '', title: t.title, talk: t }));
  const photos: Photo[] = [
    ...(r.photos ?? []).filter((p) => p.src).map((p) => ({ src: p.src!, alt: p.alt ?? r.title ?? '', width: p.width, height: p.height })),
    ...(!r.photos?.length && r.image ? [{ src: r.image, alt: r.title ?? 'Meetup photo' }] : []),
  ];
  return {
    id: r._id,
    slug: r.id,
    title: r.title ?? 'Untitled event',
    status: r.status && STATUSES.includes(r.status) ? r.status : 'scheduled',
    startsAt: r.datetime,
    endsAt: r.endsAt,
    dateText: r.dateText,
    venue: mapVenue(r),
    venueNote: r.venueNote,
    meetupUrl: r.meetupUrl,
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
            format: t.format ?? `${formatLabel[talkFormat(t.talk?.type, t.talk?.durationMinutes)]}${t.talk?.durationMinutes ? ` · ${t.talk.durationMinutes} min` : ''}`,
          })),
        }
      : undefined,
    hosts: (r.hosts ?? []).filter((h): h is string => !!h),
    stripePriceId: r.isProMeetup && r.stripePriceId ? r.stripePriceId : undefined,
    updatedAt: r._updatedAt,
  };
}

const firstSentence = (s?: string) => (s ? (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 80) : '');

export function mapSpeaker(r: RawSpeaker): Speaker {
  const name = r.name ?? r.id;
  const links = [
    r.website && { label: 'Website', url: r.website },
    r.github && { label: 'GitHub', url: r.github },
    r.linkedin && { label: 'LinkedIn', url: r.linkedin },
    r.twitter && { label: 'X', url: r.twitter },
  ].filter((l): l is { label: string; url: string } => !!l);
  const talks: SpeakerTalk[] = (r.talks ?? []).flatMap((t) =>
    (t.eventIds?.length ? t.eventIds : ['']).map((eventId) => ({ eventId, title: t.title ?? '', format: formatLabel[talkFormat(t.type, t.durationMinutes)] })),
  );
  return {
    id: r.id,
    name,
    role: r.title ?? '',
    company: r.company,
    initials: initials(name),
    bio: r.bio ?? '',
    topics: r.interests ?? [],
    tagline: r.tagline ?? firstSentence(r.talks?.[0]?.title),
    photo: r.image ? { src: r.image, alt: name } : undefined,
    links,
    talks,
    updatedAt: r._updatedAt,
  };
}

export const mapPartner = (r: { id: string; name?: string; url?: string; logo?: string }): Partner => ({ id: r.id, name: r.name ?? r.id, url: r.url, logo: r.logo });
