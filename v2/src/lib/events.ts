import { EVENTS, SPEAKERS } from '@/data/content';
import type { Event, EventState, Speaker } from '@/data/types';
import { dateLong, dateTime, dateTimeNoYear, dateTimeRange, dateShort, time } from './format';

export const FEEDBACK_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Turns the editorial status plus the clock into the state the page shows.
 * A scheduled event is "live" from doors until 48 hours later (feedback mode),
 * then "past". Cancelled and postponed win over time.
 */
export function resolveState(ev: Event, now: Date = new Date()): EventState {
  if (ev.status === 'cancelled') return 'cancelled';
  if (ev.status === 'postponed') return 'postponed';
  if (ev.status === 'tbc' || !ev.startsAt) return 'tbc';
  const start = new Date(ev.startsAt).getTime();
  const t = now.getTime();
  if (t >= start + FEEDBACK_WINDOW_MS) return 'past';
  if (t >= start) return 'live';
  if (ev.status === 'full') return 'full';
  if (ev.status === 'rsvp-soon') return 'notopen';
  return 'open';
}

export const isPastState = (s: EventState) => s === 'past';
export const isUpcomingState = (s: EventState) => s !== 'past';

export function upcomingEvents(now = new Date()): Event[] {
  return EVENTS.filter((e) => isUpcomingState(resolveState(e, now))).sort(byStartAsc);
}

export function pastEvents(now = new Date()): Event[] {
  return EVENTS.filter((e) => isPastState(resolveState(e, now))).sort(byStartDesc);
}

/** The next meetup (not workshop) that is not cancelled or past. Used by the hero and the header button. */
export function nextMeetup(now = new Date()): Event | undefined {
  return upcomingEvents(now).find((e) => e.type === 'meetup' && resolveState(e, now) !== 'cancelled');
}

export function nextWorkshop(now = new Date()): Event | undefined {
  return upcomingEvents(now).find((e) => e.type === 'workshop');
}

export const eventById = (id: string): Event | undefined => EVENTS.find((e) => e.id === id || e.slug === id);
export const speakerById = (id: string): Speaker | undefined => SPEAKERS.find((s) => s.id === id);
export const speakersFor = (ids: string[]): Speaker[] => ids.map(speakerById).filter((s): s is Speaker => !!s);

/** Workshops with ticketing details get the workshop template; everything else (incl. past workshops) uses the event page. */
export const usesWorkshopTemplate = (ev: Event) => ev.type === 'workshop' && !!ev.workshop;
export const eventHref = (ev: Event) => (usesWorkshopTemplate(ev) ? `/workshops/${ev.slug}` : `/events/${ev.slug}`);

export function talkCount(ev: Event): number {
  return ev.recap?.talks.length || ev.agenda.filter((a) => a.talk).length;
}

export function byStartAsc(a: Event, b: Event) {
  return (a.startsAt ? +new Date(a.startsAt) : Infinity) - (b.startsAt ? +new Date(b.startsAt) : Infinity);
}
export function byStartDesc(a: Event, b: Event) {
  return -byStartAsc(a, b);
}

/** Everything the opening, hero and summary panel need, in words. */
export interface EventPresentation {
  state: EventState;
  stateLabel: string; // "RSVP open"
  dateLineShort: string; // "Wed 18 Nov 2026, 18:30" or "October 2026, date to be confirmed"
  whenShort: string; // "Wed 18 Nov 2026, 18:30–21:30"
  crumb: string; // "18 Nov 2026"
  venueShort: string; // "Sample Venue AG, Zürich"
  venueStreet: string; // ", Musterstrasse 1"
  venueSub: string; // "Musterstrasse 1, 8005 Zürich"
  dateKnown: boolean;
  banner?: { title: string; body: string; tone: 'yellow' | 'grey' | 'danger' };
  cta: { kind: 'rsvp' | 'waitlist' | 'follow' | 'next' | 'feedback' | 'none'; label: string; href?: string };
  ctaNote: string;
  feedbackCloses?: string;
  pills: { text: string; yellow?: boolean }[];
}

export function presentEvent(ev: Event, now = new Date(), override?: EventState): EventPresentation {
  const state = override ?? resolveState(ev, now);
  const dateKnown = !!ev.startsAt && state !== 'postponed' && state !== 'tbc';
  const typeLabel = ev.type === 'workshop' ? 'Workshop' : 'Meetup';
  const venueShort = ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : 'Venue to be confirmed';
  const venueStreet = ev.venue?.street ? `, ${ev.venue.street}` : '';
  const venueSub = ev.venue?.street ? `${ev.venue.street}, ${ev.venue.zip ?? ''} ${ev.venue.city}`.replace(/\s+/g, ' ').trim() : ev.venueNote ?? '';
  const base: EventPresentation = {
    state,
    stateLabel: 'RSVP open',
    dateLineShort: dateKnown ? dateTime(ev.startsAt!) : ev.dateText ? `${ev.dateText}, date to be confirmed` : 'Date to be confirmed',
    whenShort: dateKnown ? dateTimeRange(ev.startsAt!, ev.endsAt) : ev.dateText ? `${ev.dateText}, date to be confirmed` : 'Date to be confirmed',
    crumb: dateKnown ? dateShort(ev.startsAt!) : ev.dateText ?? 'Upcoming',
    venueShort,
    venueStreet,
    venueSub,
    dateKnown,
    cta: { kind: 'rsvp', label: 'RSVP on Meetup', href: ev.meetupUrl },
    ctaNote: 'Opens Meetup in a new tab. Your RSVP is confirmed there, not on this site.',
    pills: [{ text: typeLabel }, { text: 'RSVP open', yellow: true }],
  };
  switch (state) {
    case 'notopen':
      return { ...base, stateLabel: 'RSVP opens soon', cta: { kind: 'follow', label: 'Follow the group on Meetup' }, ctaNote: 'RSVP opens on Meetup soon. Follow the group to get the announcement.', pills: [{ text: typeLabel }, { text: 'RSVP opens soon' }] };
    case 'tbc':
      return {
        ...base,
        stateLabel: 'Date to be confirmed',
        venueShort: ev.venue ? venueShort : 'Venue to be confirmed',
        venueStreet: '',
        venueSub: ev.venue ? venueSub : 'In Zürich. We confirm the venue before RSVP opens.',
        cta: { kind: 'follow', label: 'Follow the group on Meetup' },
        ctaNote: 'Date and venue are still being arranged.',
        pills: [{ text: typeLabel }, { text: 'Date to be confirmed' }],
      };
    case 'full':
      return { ...base, stateLabel: 'Full, waitlist open', cta: { kind: 'waitlist', label: 'Join the waitlist on Meetup', href: ev.meetupUrl }, ctaNote: 'This meetup is full. Meetup runs the waitlist, and places often open up on the day.', pills: [{ text: typeLabel }, { text: 'Full, waitlist open' }] };
    case 'postponed':
      return {
        ...base,
        stateLabel: 'Postponed',
        dateLineShort: 'Postponed, new date to follow',
        whenShort: 'Postponed',
        crumb: 'Postponed',
        banner: { tone: 'yellow', title: 'This meetup is postponed.', body: 'The speakers and programme stay the same. We will announce the new date here and on Meetup. Meetup handles existing RSVPs.' },
        cta: { kind: 'follow', label: 'Follow the group on Meetup' },
        ctaNote: '',
        pills: [{ text: typeLabel }, { text: 'Postponed' }],
      };
    case 'cancelled':
      return {
        ...base,
        stateLabel: 'Cancelled',
        banner: { tone: 'danger', title: 'This meetup is cancelled.', body: 'The venue is no longer available on this date. Sorry for the change of plans. This page stays online so existing links keep working.' },
        cta: { kind: 'next', label: 'See upcoming events', href: '/events' },
        ctaNote: 'RSVPs on Meetup were cancelled there.',
        pills: [{ text: typeLabel }, { text: 'Cancelled' }],
      };
    case 'live': {
      const closes = ev.startsAt ? new Date(new Date(ev.startsAt).getTime() + FEEDBACK_WINDOW_MS).toISOString() : undefined;
      return {
        ...base,
        stateLabel: 'Happening now',
        banner: { tone: 'yellow', title: `Thanks for coming. Feedback is open until ${closes ? dateTimeNoYear(closes) : 'two days after doors'}.`, body: 'Rate each talk while it’s fresh; speakers see their ratings and comments. Then tell us about the evening as a whole.' },
        cta: { kind: 'feedback', label: 'Rate the talks' },
        ctaNote: 'Rating closes 48 hours after doors. After that, this page becomes the recap.',
        feedbackCloses: closes,
        pills: [{ text: typeLabel }, { text: 'Feedback open', yellow: true }],
      };
    }
    case 'past':
      return {
        ...base,
        stateLabel: 'Registration closed',
        banner: ev.recap ? undefined : { tone: 'grey', title: 'This meetup has taken place.', body: 'Registration is closed. Photos from the evening will be added to this page.' },
        cta: { kind: 'next', label: 'See upcoming events', href: '/events' },
        ctaNote: '',
        pills: [{ text: typeLabel }, { text: 'Took place' }],
      };
    default:
      return base;
  }
}

/** "Sun 16 Sep 2026 · Sample Venue AG, Zürich. Two talks and photos from the evening." */
export function recapSummary(ev: Event): string {
  const n = ev.recap?.talks.length ?? 0;
  const words = ['No talks', 'One talk', 'Two talks', 'Three talks', 'Four talks'][n] ?? `${n} talks`;
  const photos = ev.photos.length ? ' and photos from the evening' : '';
  return `${ev.startsAt ? dateLong(ev.startsAt) : ''} · ${ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : ''}. ${words}${photos}.`;
}

export { dateLong, time };
