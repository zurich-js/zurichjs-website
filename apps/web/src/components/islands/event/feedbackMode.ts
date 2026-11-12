/**
 * Legacy feedback links: the old site sent attendees to
 * /events/<slug>?feedback=true (QR codes, emails, Slack). Those links must
 * keep opening the talk ratings for that event, on any date.
 */
export const feedbackRequested = (loc: Pick<Location, 'search' | 'hash'>) => {
  const q = new URLSearchParams(loc.search).get('feedback');
  return (q !== null && q !== 'false' && q !== '0') || loc.hash === '#feedback';
};
