import { meetupTicketing } from '@zurichjs/events';

/** Meetup group page: RSVP announcements and follow link. */
export const MEETUP_GROUP_URL = 'https://www.meetup.com/zurich-js/';

/**
 * Every meetup is free and hands off to Meetup. Sane plugs in here later with
 * chainTicketing(saneTicketing, meetupTicketing(...)) (docs/v2/SANE-READINESS.md).
 * Safe to import in islands.
 */
export const ticketing = meetupTicketing(MEETUP_GROUP_URL);
