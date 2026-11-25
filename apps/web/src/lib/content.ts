/** Build-time content access for pages. One fetch per build (see @zurichjs/content). */
import { isPreview, loadContent } from '@zurichjs/content';
import { nextMeetup } from '@zurichjs/events';
import { LOGO_BASE, publicPartners, publicSponsorships } from '../server/sponsor-public.ts';

export { ticketing } from './ticketing.ts';

export { SITE, slackLink } from '@zurichjs/content';
/** Draft preview build (SANITY_PERSPECTIVE=drafts): noindex everywhere, robots.txt disallows all. */
export const PREVIEW = isPreview(process.env);
/**
 * The database gives the partners and decides who is a current sponsor and at which tier. Tests never
 * read it. The dev server reads it again every few seconds, so a change in /admin shows on a reload.
 */
const DATABASE = import.meta.env.DEV
  ? { partners: publicPartners(LOGO_BASE.dev), sponsorships: publicSponsorships, refreshMs: 5_000 }
  : { partners: publicPartners(LOGO_BASE.build), sponsorships: publicSponsorships };
export const content = () => (import.meta.env.MODE === 'test' ? loadContent({ ...process.env, CONTENT_SOURCE: 'sample' }) : loadContent(process.env, undefined, DATABASE));

/**
 * The build time is the reference clock for prerendered state; islands re-check it in the browser.
 * `BUILD_NOW` (ISO date) fixes it for deterministic builds (visual regression, previews of a given day).
 */
export const BUILD_TIME = process.env.BUILD_NOW ? new Date(process.env.BUILD_NOW) : new Date();

export async function nextMeetupHref() {
  const c = await content();
  const ev = nextMeetup(c.events, BUILD_TIME);
  return ev ? `/events/${ev.slug}` : '/events';
}

/** Public Google Maps Embed API key (restricted to zurichjs.com). Without it, event pages show directions only. */
export const MAPS_EMBED_KEY: string | undefined = import.meta.env.PUBLIC_GOOGLE_MAPS_EMBED_KEY || process.env.PUBLIC_GOOGLE_MAPS_EMBED_KEY || undefined;
