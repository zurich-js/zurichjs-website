import { chainTicketing, meetupTicketing, saneTicketing } from '@zurichjs/events';

/** Meetup group page: RSVP announcements and follow link. */
export const MEETUP_GROUP_URL = 'https://www.meetup.com/zurich-js/';

/**
 * Every meetup is free. Events linked to Sane offer a free ticket there while
 * Sane's registration is open; otherwise (and for every other event) the
 * action hands off to Meetup (docs/v2/SANE-READINESS.md). Safe to import in islands.
 */
export const ticketing = chainTicketing(saneTicketing, meetupTicketing(MEETUP_GROUP_URL));
