/**
 * Domain types for the ZurichJS site. Content sources (Sanity, sample data)
 * map into these; pages and islands only ever see these shapes.
 *
 * Workshops are de-scoped for now (see docs/v2/DECISIONS.md), so every event is a meetup.
 */

/**
 * Editorial status set by organisers. The displayed state also depends on the
 * clock (see state.ts): a scheduled event is "live" from doors until 48 hours
 * later, then "past".
 */
export type EventStatus =
  | 'scheduled' // date known, RSVP open on Meetup
  | 'rsvp-soon' // date known, RSVP not open yet
  | 'tbc' // month known, date and venue still being arranged
  | 'full' // Meetup waitlist open
  | 'postponed'
  | 'cancelled';

export type EventState = 'open' | 'notopen' | 'tbc' | 'full' | 'postponed' | 'cancelled' | 'live' | 'past';

export interface Venue {
  name: string;
  street?: string;
  zip?: string;
  city: string;
  /** How to get there, as the organisers wrote it. */
  directions?: string;
  entrance?: string;
  transport?: string;
  accessibility?: string;
}

export type TalkFormat = 'talk' | 'lightning' | 'deep-dive';

export interface TalkRef {
  /** Sanity document id: ratings reference it. */
  id?: string;
  /** Public talk ID (`id.current`), used for the #talk-… anchor when present. */
  slug?: string;
  speakerIds: string[];
  title: string;
  description?: string;
  format: TalkFormat;
  durationMin: number;
  level?: string;
  language?: string;
  tags?: string[];
  /** Slides the speaker shared (owner: shown when present; talks are never recorded). */
  slidesUrl?: string;
}

/** What a programme line is. Doors, intro, breaks and networking are part of the evening too. */
export type ScheduleKind = 'doors' | 'intro' | 'talk' | 'break' | 'networking' | 'close' | 'other';

/**
 * One line of the evening, in running order. `time` is the Zurich wall-clock
 * time ("18:50") or empty when the organisers have not fixed it: the site
 * never invents a time.
 */
export interface AgendaItem {
  time: string;
  kind: ScheduleKind;
  title: string;
  note?: string;
  talk?: TalkRef;
}

export interface PracticalInfo {
  label: string;
  value: string;
}

export interface Photo {
  src: string;
  alt: string;
  position?: string;
  width?: number;
  height?: number;
}

export interface RecapTalk {
  title: string;
  speakerIds: string[];
  summary: string;
  format: string; // "Talk · 25 min"
}

export interface Event {
  /** Stable document id. */
  id: string;
  /** URL segment: /events/{slug}. Equals the Sanity `id.current` so production URLs are kept. */
  slug: string;
  title: string;
  status: EventStatus;
  /** ISO 8601 with offset. Missing when status is "tbc" or "postponed". */
  startsAt?: string;
  endsAt?: string;
  /** Human text used when the date is not fixed, e.g. "October 2026". */
  dateText?: string;
  venue?: Venue;
  venueNote?: string;
  meetupUrl?: string;
  description: string;
  agenda: AgendaItem[];
  practical: PracticalInfo[];
  photos: Photo[];
  recap?: { talks: RecapTalk[] };
  /** Partner ids that host the evening. */
  hosts?: string[];
  /** Partners thanked on this event, with their role. */
  supporters?: { partnerId: string; role: SupporterRole }[];
  /** Default photo credit for this event's gallery. */
  photoCredit?: string;
  /** Promotional artwork (social image, cover). Never shown as a photo from the evening. */
  cover?: Photo;
  /** ISO date the content was last edited (sitemap lastmod). */
  updatedAt?: string;
}

/** A talk on a speaker's profile, once, with every event it was given at. */
export interface SpeakerTalk {
  /** Sanity document id. */
  id?: string;
  /** Public talk ID, for the #talk-… anchor on event pages. */
  slug?: string;
  title: string;
  description?: string;
  format: 'Talk' | 'Lightning talk' | 'Deep dive';
  durationMin?: number;
  tags: string[];
  slidesUrl?: string;
  /** Slugs of the events this talk was given at. */
  eventSlugs: string[];
}

export interface Speaker {
  id: string;
  name: string;
  role: string;
  company?: string;
  initials: string;
  bio: string;
  topics: string[];
  /** One short line for teaser cards, e.g. "Forms and TypeScript". */
  tagline: string;
  photo?: Photo;
  links: { label: string; url: string }[];
  talks: SpeakerTalk[];
  /** Earlier URL segments; /speakers/<old> redirects here. */
  legacySlugs?: string[];
  updatedAt?: string;
}

export type SupporterRole = 'venue' | 'food' | 'sponsor' | 'community';
export type PartnerKind = 'sponsor' | 'venue' | 'food' | 'community' | 'conference' | 'supporting';
export type SponsorTier = 'champion' | 'builder' | 'friend' | 'supporter';

export interface Partner {
  id: string;
  name: string;
  logo?: string;
  url?: string;
  kinds: PartnerKind[];
  tier?: SponsorTier;
  /** Only an organiser marks a partner current; everyone else is a past supporter. */
  current: boolean;
  since?: string;
  until?: string;
  description?: string;
  /** Sponsors who asked to see referrals: links omit `noreferrer`. */
  allowReferrer?: boolean;
}

/**
 * Meetup's published group score. One editable record. Set `score` to null to
 * hide the rating. The UI never prints the scale ("/5") because it was not confirmed.
 */
export interface RatingRecord {
  score: string | null;
  scale: number;
  count: number;
  url: string;
  source: string;
  checkedAt: string;
}

export interface AwardRecord {
  title: string;
  category: string;
  url: string;
}

export type ConferenceState = 'unannounced' | 'announced' | 'onsale' | 'soldout' | 'completed';

export interface ConferenceCopy {
  headline: string;
  body: string;
  cta: string;
  cfp: string;
}

export interface Milestone {
  date: string;
  title: string;
  photo?: Photo;
  eventId?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
  photo?: Photo;
}

export interface Quote {
  text: string;
  name: string;
  role: string;
}
