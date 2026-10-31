/**
 * Content types for the V2 public site.
 *
 * These mirror what the Sanity schema (events, talks, speakers, talkSubmission)
 * already stores, plus the few fields the V2 design needs. Sample content lives
 * in ./content.ts; swapping it for Sanity queries only touches ./content.ts.
 */

export type EventType = 'meetup' | 'workshop';

/**
 * Editorial status set by organisers. The displayed state also depends on time
 * (see lib/events.ts): a "scheduled" event becomes "live" from doors until 48 hours
 * later, then "past".
 */
export type EventStatus =
  | 'scheduled' // date known, RSVP open on Meetup
  | 'rsvp-soon' // date known, RSVP not open yet
  | 'tbc' // month known, date and venue still being arranged
  | 'full' // Meetup waitlist open
  | 'postponed'
  | 'cancelled';

export type EventState =
  | 'open'
  | 'notopen'
  | 'tbc'
  | 'full'
  | 'postponed'
  | 'cancelled'
  | 'live'
  | 'past';

export interface Venue {
  name: string;
  street?: string;
  zip?: string;
  city: string;
  directions?: string;
}

export interface TalkRef {
  speakerIds: string[];
  title: string;
  description?: string;
  format: 'talk' | 'lightning' | 'deep-dive';
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
}

export interface RecapTalk {
  title: string;
  speakerIds: string[];
  summary: string;
  format: string; // "Talk · 25 min"
}

export interface WorkshopDetails {
  priceChf: number;
  capacity: number;
  seatsLeft: number | null; // null = unknown / not tracked
  trainerId: string;
  language: string;
  learn: { heading: string; detail: string }[];
  whoFor: string;
  bring: string;
  schedule: { time: string; heading: string }[];
  faq: { q: string; a: string }[];
  stripePriceId?: string;
}

export interface Event {
  id: string;
  slug: string;
  type: EventType;
  title: string;
  status: EventStatus;
  /** ISO 8601 with offset, Europe/Zurich. Missing when status is "tbc" or "postponed". */
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
  workshop?: WorkshopDetails;
  hosts?: string[]; // sponsor ids
}

export interface SpeakerTalk {
  eventId: string;
  title: string;
  format: 'Talk' | 'Lightning talk' | 'Deep dive' | 'Workshop';
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
}

export interface Sponsor {
  id: string;
  name: string;
  logo?: string;
  url?: string;
}

/**
 * Meetup's published group score. One editable record: score, count, scale,
 * source URL and when it was checked. Set `score` to null to hide the rating.
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
  title: string; // "2026 Open Source Award winner"
  category: string; // "Most Impactful Contribution to the Community"
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
