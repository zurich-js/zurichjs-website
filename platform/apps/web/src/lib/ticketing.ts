import { chainTicketing, meetupTicketing, stripeTicketing } from '@zurichjs/events';

/** Meetup group page: RSVP announcements and follow link. */
export const MEETUP_GROUP_URL = 'https://www.meetup.com/zurich-js/';

/**
 * Free meetups hand off to Meetup; pro meetups with a Stripe price sell tickets here.
 * Sane plugs in here later (docs/v2/SANE-READINESS.md). Safe to import in islands.
 */
export const ticketing = chainTicketing(stripeTicketing, meetupTicketing(MEETUP_GROUP_URL));
