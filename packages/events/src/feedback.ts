/**
 * When feedback for an event can be given, and what the page says when
 * someone arrives early with the legacy `?feedback=true` link.
 *
 * The rule follows the event state (state.ts): feedback opens at the event's
 * start (`datetime`, the Meetup start) and stays available afterwards, so old
 * QR codes and emails keep working. Before the start, or for a cancelled,
 * postponed or undated event, the link explains why nothing can be rated yet.
 */
import { dateLong, time, zoneLabel } from './format.ts';
import { resolveState } from './state.ts';
import type { Event, EventState } from './types.ts';

export type FeedbackAvailability = { open: true; talks: boolean } | { open: false; reason: 'before'; opensAt: string } | { open: false; reason: 'cancelled' | 'postponed' | 'tbc' };

const hasTalks = (ev: Pick<Event, 'agenda'>) => ev.agenda.some((a) => a.talk);

export function feedbackAvailability(ev: Event, at: Date | EventState = new Date()): FeedbackAvailability {
  const state = at instanceof Date ? resolveState(ev, at) : at;
  if (state === 'live' || state === 'past') return { open: true, talks: hasTalks(ev) };
  if (state === 'cancelled' || state === 'postponed' || state === 'tbc') return { open: false, reason: state };
  return { open: false, reason: 'before', opensAt: ev.startsAt! };
}

export interface FeedbackNotice {
  title: string;
  body: string;
  /** The evening-feedback form, when it is the useful next step. */
  evening: boolean;
}

/**
 * What a `?feedback=true` visitor reads when per-talk rating is not what the
 * page can offer. Undefined when the talk ratings open as usual.
 */
export function feedbackNotice(ev: Event, availability: FeedbackAvailability): FeedbackNotice | undefined {
  if (availability.open) {
    if (availability.talks) return undefined;
    return {
      title: `Feedback for ${ev.title}`,
      body: 'This evening had no talks to rate. Tell the organisers how it went in a few open questions. Only the organisers read your answers.',
      evening: true,
    };
  }
  switch (availability.reason) {
    case 'before': {
      const at = availability.opensAt;
      return {
        title: 'Feedback isn’t open yet',
        body: `Feedback for ${ev.title} opens when the meetup starts: ${dateLong(at)}, ${time(at)} ${zoneLabel(at)}. Keep this link; it works from then on.`,
        evening: false,
      };
    }
    case 'postponed':
      return {
        title: 'Feedback isn’t open yet',
        body: `${ev.title} is postponed. Feedback opens when it starts on the new date. Keep this link; it works from then on.`,
        evening: false,
      };
    case 'tbc':
      return { title: 'Feedback isn’t open yet', body: `Feedback for ${ev.title} opens when the meetup starts. Its date is not fixed yet.`, evening: false };
    case 'cancelled':
      return { title: 'This meetup was cancelled', body: `${ev.title} is cancelled, so there is no feedback to give.`, evening: false };
  }
}
