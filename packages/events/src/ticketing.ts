import type { Event, EventState } from './types.ts';

/**
 * Seam for where people get a place at an event: Meetup RSVP links (every
 * meetup is free), and free tickets on Sane for events linked to it (see
 * docs/v2/SANE-READINESS.md). Pages never branch on the provider; they render
 * the action.
 */
export interface TicketingAction {
  kind: 'rsvp' | 'waitlist' | 'buy' | 'follow' | 'none';
  label: string;
  href?: string;
  /** One sentence under the button: what happens when it is pressed. */
  note: string;
  /** True when the action leaves zurichjs.com. */
  external?: boolean;
}

export interface TicketingProvider {
  id: string;
  /** Pure: called at build time and again on the client by the state island. */
  actionFor(ev: Event, state: EventState): TicketingAction | undefined;
}

/** Free meetups: RSVP, waitlist and announcements all live on Meetup. */
export const meetupTicketing = (groupUrl: string): TicketingProvider => ({
  id: 'meetup',
  actionFor(ev, state) {
    switch (state) {
      case 'open':
        return {
          kind: 'rsvp',
          label: 'RSVP on Meetup',
          href: ev.meetupUrl ?? groupUrl,
          external: true,
          note: '',
        };
      case 'full':
        return {
          kind: 'waitlist',
          label: 'Join the waitlist on Meetup',
          href: ev.meetupUrl ?? groupUrl,
          external: true,
          note: 'This meetup is full. Meetup runs the waitlist, and places often open up on the day.',
        };
      case 'notopen':
        return {
          kind: 'follow',
          label: 'Follow the group on Meetup',
          href: groupUrl,
          external: true,
          note: 'RSVP opens on Meetup soon. Follow the group to get the announcement.',
        };
      case 'tbc':
        return { kind: 'follow', label: 'Follow the group on Meetup', href: groupUrl, external: true, note: 'Date and venue are still being arranged.' };
      case 'postponed':
        return { kind: 'follow', label: 'Follow the group on Meetup', href: groupUrl, external: true, note: '' };
      default:
        return undefined;
    }
  },
});

/**
 * Free tickets on Sane, side by side with Meetup (owner decision): Sane takes
 * the main button only while its registration is open; in every other Sane
 * state, Meetup's action applies (a meetup full on Sane points to the Meetup waitlist).
 */
export const saneTicketing: TicketingProvider = {
  id: 'sane',
  actionFor(ev, state) {
    if (state !== 'open' || ev.sane?.state !== 'open') return undefined;
    return {
      kind: 'rsvp',
      label: 'Get a free ticket',
      href: ev.sane.url,
      external: true,
      note: 'Opens Sane in a new tab. Your ticket arrives by email, and an RSVP on Meetup still counts.',
    };
  },
};

/** First provider with an answer wins. */
export const chainTicketing = (...providers: TicketingProvider[]): TicketingProvider => ({
  id: providers.map((p) => p.id).join('+'),
  actionFor: (ev, state) => {
    for (const p of providers) {
      const a = p.actionFor(ev, state);
      if (a) return a;
    }
    return undefined;
  },
});
