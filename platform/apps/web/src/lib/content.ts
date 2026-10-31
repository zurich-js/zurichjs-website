/** Build-time content access for pages. One fetch per build (see @zurichjs/content). */
import { loadContent } from '@zurichjs/content';
import { nextMeetup } from '@zurichjs/events';

export { ticketing } from './ticketing';

export { PHOTOS, SITE } from '@zurichjs/content';
export const content = () => loadContent(import.meta.env.MODE === 'test' ? { ...process.env, CONTENT_SOURCE: 'sample' } : process.env);

/** The build time is the reference clock for prerendered state; islands re-check it in the browser. */
export const BUILD_TIME = new Date();

export async function nextMeetupHref() {
  const c = await content();
  const ev = nextMeetup(c.events, BUILD_TIME);
  return ev ? `/events/${ev.slug}` : '/events';
}
