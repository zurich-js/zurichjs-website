/**
 * One calendar file per dated event (/events/<slug>.ics), for Apple Calendar and any app that reads .ics.
 * The "Add to calendar" menu links here; Google Calendar and Outlook get prefilled links instead (calendarLinks).
 * Not in the sitemap. The UID is the slug, so opening it again updates the same entry.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { buildIcs, eventHref, type Event } from '@zurichjs/events';
import { canonicalUrl } from '@zurichjs/seo';
import { BUILD_TIME, content } from '~/lib/content';

export const getStaticPaths: GetStaticPaths = async () => {
  const { events } = await content();
  return events.filter((ev) => !!ev.startsAt).map((ev) => ({ params: { slug: ev.slug }, props: { ev } }));
};

export const GET: APIRoute = ({ props }) => {
  const ev = (props as { ev: Event }).ev;
  const ics = buildIcs(ev, canonicalUrl(eventHref(ev)), BUILD_TIME);
  return new Response(ics ?? '', { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
};
