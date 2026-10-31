import type { Event, EventState } from './types';

/** Feedback and rating stay open for 48 hours after doors. */
export const FEEDBACK_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Turns the editorial status plus the clock into the state the page shows.
 * Cancelled and postponed win over time. A dated event is "live" from doors
 * until 48 hours later (feedback mode), then "past".
 */
export function resolveState(ev: Event, now: Date = new Date()): EventState {
  if (ev.status === 'cancelled') return 'cancelled';
  if (ev.status === 'postponed') return 'postponed';
  if (ev.status === 'tbc' || !ev.startsAt) return 'tbc';
  const start = Date.parse(ev.startsAt);
  const t = now.getTime();
  if (t >= start + FEEDBACK_WINDOW_MS) return 'past';
  if (t >= start) return 'live';
  if (ev.status === 'full') return 'full';
  if (ev.status === 'rsvp-soon') return 'notopen';
  return 'open';
}

export const isPastState = (s: EventState) => s === 'past';
export const isUpcomingState = (s: EventState) => s !== 'past';

export function byStartAsc(a: Event, b: Event) {
  return (a.startsAt ? Date.parse(a.startsAt) : Infinity) - (b.startsAt ? Date.parse(b.startsAt) : Infinity);
}
export const byStartDesc = (a: Event, b: Event) => -byStartAsc(a, b);

export const upcomingEvents = (events: Event[], now = new Date()) => events.filter((e) => isUpcomingState(resolveState(e, now))).sort(byStartAsc);

export const pastEvents = (events: Event[], now = new Date()) => events.filter((e) => isPastState(resolveState(e, now))).sort(byStartDesc);

/** The next meetup that is not cancelled or past. Used by the hero and the header button. */
export const nextMeetup = (events: Event[], now = new Date()) => upcomingEvents(events, now).find((e) => resolveState(e, now) !== 'cancelled');

export const eventHref = (ev: Pick<Event, 'slug'>) => `/events/${ev.slug}`;

export const talkCount = (ev: Event) => ev.recap?.talks.length || ev.agenda.filter((a) => a.talk).length;

/**
 * The next moments at which a prerendered page goes stale: doors (open → live)
 * and doors + 48 h (live → past) of every upcoming event. The scheduled
 * rebuild function triggers a deploy at these times.
 */
export function stateChangeTimes(events: Event[], now = new Date()): Date[] {
  const t = now.getTime();
  return events
    .filter((e) => e.startsAt && e.status !== 'cancelled' && e.status !== 'postponed' && e.status !== 'tbc')
    .flatMap((e) => {
      const s = Date.parse(e.startsAt!);
      return [s, s + FEEDBACK_WINDOW_MS];
    })
    .filter((ms) => ms > t)
    .sort((a, b) => a - b)
    .map((ms) => new Date(ms));
}
