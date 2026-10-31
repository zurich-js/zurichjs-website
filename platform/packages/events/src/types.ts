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
  directions?: string;
}

export type TalkFormat = 'talk' | 'lightning' | 'deep-dive';

export interface TalkRef {
  id?: string;
  speakerIds: string[];
  title: string;
  description?: string;
  format: TalkFormat;
  durationMin: number;
  level?: string;
  language?: string;
}

export interface AgendaItem {
  time: string; // "18:30"
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
  /** Paid "pro meetup": Stripe price for the ticket. Free meetups RSVP on Meetup. */
  stripePriceId?: string;
  /** ISO date the content was last edited (sitemap lastmod). */
  updatedAt?: string;
}

export interface SpeakerTalk {
  eventId: string;
  title: string;
  format: 'Talk' | 'Lightning talk' | 'Deep dive';
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
  updatedAt?: string;
}

export interface Partner {
  id: string;
  name: string;
  logo?: string;
  url?: string;
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
