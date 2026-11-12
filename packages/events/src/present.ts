import { dateShort, dateTime, dateTimeNoYear, dateTimeRange, dateLong } from './format.ts';
import { FEEDBACK_WINDOW_MS, resolveState, talkCount } from './state.ts';
import type { TicketingAction, TicketingProvider } from './ticketing.ts';
import type { Event, EventState } from './types.ts';

/** Everything the opening, hero and summary panel need, in words. */
export interface EventPresentation {
  state: EventState;
  stateLabel: string; // "RSVP open"
  dateLineShort: string; // "Wed 18th Nov 2026, 18:30" or "October 2026, date to be confirmed"
  whenShort: string; // "Wed 18th Nov 2026, 18:30–21:30"
  crumb: string; // "18th Nov 2026"
  venueShort: string; // "Venue AG, Zürich"
  venueStreet: string; // ", Street 1"
  venueSub: string; // "Street 1, 8005 Zürich"
  dateKnown: boolean;
  banner?: { title: string; body: string; tone: 'yellow' | 'grey' | 'danger' };
  cta: { kind: TicketingAction['kind'] | 'next' | 'feedback'; label: string; href?: string; external?: boolean };
  ctaNote: string;
  feedbackCloses?: string;
  pills: { text: string }[];
}

export interface PresentOptions {
  now?: Date;
  /** Preview a given state (development only). */
  override?: EventState;
  ticketing?: TicketingProvider;
}

const TYPE_LABEL = 'Meetup';

export function presentEvent(ev: Event, opts: PresentOptions = {}): EventPresentation {
  const now = opts.now ?? new Date();
  const state = opts.override ?? resolveState(ev, now);
  const dateKnown = !!ev.startsAt && state !== 'postponed' && state !== 'tbc';
  const venueShort = ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : 'Venue to be confirmed';
  const venueStreet = ev.venue?.street ? `, ${ev.venue.street}` : '';
  const venueSub = ev.venue?.street ? `${ev.venue.street}, ${ev.venue.zip ?? ''} ${ev.venue.city}`.replace(/\s+/g, ' ').trim() : (ev.venueNote ?? '');
  const tbcText = ev.dateText ? `${ev.dateText}, date to be confirmed` : 'Date to be confirmed';
  const action = opts.ticketing?.actionFor(ev, state);
  const ctaFrom = (fallback: EventPresentation['cta'], fallbackNote: string) =>
    action ? { cta: { kind: action.kind, label: action.label, href: action.href, external: action.external }, ctaNote: action.note } : { cta: fallback, ctaNote: fallbackNote };

  const base: EventPresentation = {
    state,
    stateLabel: 'RSVP open',
    dateLineShort: dateKnown ? dateTime(ev.startsAt!) : tbcText,
    whenShort: dateKnown ? dateTimeRange(ev.startsAt!, ev.endsAt) : tbcText,
    crumb: dateKnown ? dateShort(ev.startsAt!) : (ev.dateText ?? 'Upcoming'),
    venueShort,
    venueStreet,
    venueSub,
    dateKnown,
    ...ctaFrom({ kind: 'rsvp', label: 'RSVP on Meetup', href: ev.meetupUrl, external: true }, ''),
    pills: [{ text: TYPE_LABEL }, { text: 'RSVP open' }],
  };

  switch (state) {
    case 'notopen':
      return {
        ...base,
        stateLabel: 'RSVP opens soon',
        ...ctaFrom({ kind: 'follow', label: 'Follow the group on Meetup' }, 'RSVP opens on Meetup soon. Follow the group to get the announcement.'),
        pills: [{ text: TYPE_LABEL }, { text: 'RSVP opens soon' }],
      };
    case 'tbc':
      return {
        ...base,
        stateLabel: 'Date to be confirmed',
        venueShort: ev.venue ? venueShort : 'Venue to be confirmed',
        venueStreet: '',
        venueSub: ev.venue ? venueSub : 'In Zürich. We confirm the venue before RSVP opens.',
        ...ctaFrom({ kind: 'follow', label: 'Follow the group on Meetup' }, 'Date and venue are still being arranged.'),
        pills: [{ text: TYPE_LABEL }, { text: 'Date to be confirmed' }],
      };
    case 'full':
      return {
        ...base,
        stateLabel: 'Full, waitlist open',
        ...ctaFrom(
          { kind: 'waitlist', label: 'Join the waitlist on Meetup', href: ev.meetupUrl, external: true },
          'This meetup is full. Meetup runs the waitlist, and places often open up on the day.',
        ),
        pills: [{ text: TYPE_LABEL }, { text: 'Full, waitlist open' }],
      };
    case 'postponed':
      return {
        ...base,
        stateLabel: 'Postponed',
        dateLineShort: 'Postponed, new date to follow',
        whenShort: 'Postponed',
        crumb: 'Postponed',
        banner: {
          tone: 'yellow',
          title: 'This meetup is postponed.',
          body: 'The speakers and programme stay the same. We will announce the new date here and on Meetup. Meetup handles existing RSVPs.',
        },
        ...ctaFrom({ kind: 'follow', label: 'Follow the group on Meetup' }, ''),
        pills: [{ text: TYPE_LABEL }, { text: 'Postponed' }],
      };
    case 'cancelled':
      return {
        ...base,
        stateLabel: 'Cancelled',
        banner: {
          tone: 'danger',
          title: 'This meetup is cancelled.',
          body: 'The venue is no longer available on this date. Sorry for the change of plans. This page stays online so existing links keep working.',
        },
        cta: { kind: 'next', label: 'See upcoming events', href: '/events' },
        ctaNote: 'RSVPs on Meetup were cancelled there.',
        pills: [{ text: TYPE_LABEL }, { text: 'Cancelled' }],
      };
    case 'live': {
      const closes = ev.startsAt ? new Date(Date.parse(ev.startsAt) + FEEDBACK_WINDOW_MS).toISOString() : undefined;
      const talks = talkCount(ev) > 0;
      return {
        ...base,
        stateLabel: 'Happening now',
        banner: {
          tone: 'yellow',
          title: `Thanks for coming. Feedback is open until ${closes ? dateTimeNoYear(closes) : 'two days after the start'}.`,
          body: talks
            ? 'Rate each talk while it’s fresh; speakers see their ratings and comments. Then tell us about the evening as a whole.'
            : 'Tell us about the evening in a few open questions. Only the organisers read your answers.',
        },
        cta: talks ? { kind: 'feedback', label: 'Rate the talks', href: '#programme' } : { kind: 'feedback', label: 'Feedback on the evening', href: `/feedback?event=${ev.slug}` },
        ctaNote: talks
          ? 'Rating closes 48 hours after the start. After that, this page becomes the recap.'
          : 'Feedback closes 48 hours after the start. After that, this page becomes the recap.',
        feedbackCloses: closes,
        pills: [{ text: TYPE_LABEL }, { text: 'Feedback open' }],
      };
    }
    case 'past':
      return {
        ...base,
        stateLabel: 'Registration closed',
        banner: ev.recap ? undefined : { tone: 'grey', title: 'This meetup has taken place.', body: 'Registration is closed. Photos from the evening will be added to this page.' },
        cta: { kind: 'next', label: 'See upcoming events', href: '/events' },
        ctaNote: '',
        pills: [{ text: TYPE_LABEL }, { text: 'Took place' }],
      };
    default:
      return base;
  }
}

/**
 * "Sun 16 Sep 2026 · Venue AG, Zürich. Five talks and photos from the evening."
 * Counts the talks of the programme (or the recap), so a populated programme
 * never reads "No talks". Says nothing about talks or photos it does not have.
 */
export function recapSummary(ev: Event, opts: { photos?: number } = {}): string {
  const n = talkCount(ev);
  const words = n ? (['', 'One talk', 'Two talks', 'Three talks', 'Four talks', 'Five talks', 'Six talks'][n] ?? `${n} talks`) : '';
  const hasPhotos = (opts.photos ?? ev.photos.length) > 0;
  const tail = words && hasPhotos ? `${words} and photos from the evening.` : words ? `${words}.` : hasPhotos ? 'Photos from the evening.' : '';
  const head = [ev.startsAt ? dateLong(ev.startsAt) : '', ev.venue ? `${ev.venue.name}, ${ev.venue.city}` : ''].filter(Boolean).join(' · ');
  return [head ? `${head}.` : '', tail].filter(Boolean).join(' ');
}
