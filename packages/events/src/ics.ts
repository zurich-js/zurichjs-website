import { eventEndsAt, timesLine } from './schedule.ts';
import type { Event } from './types.ts';

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** "ZurichJS: 2nd Anniversary", but never "ZurichJS: ZurichJS: …". */
export const eventDisplayTitle = (title: string) => (/^zurich\s*js\b/i.test(title.trim()) ? title.trim() : `ZurichJS: ${title.trim()}`);

/** RFC 5545 lines are folded at 75 octets. */
const bytes = (s: string) => new TextEncoder().encode(s).length;
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (bytes(rest) > 75) {
    let n = 75;
    while (bytes(rest.slice(0, n)) > 75) n--;
    out.push(rest.slice(0, n));
    rest = ` ${rest.slice(n)}`;
  }
  out.push(rest);
  return out.join('\r\n');
};

/** How long a calendar entry blocks when nobody recorded an end time. Said so in the entry. */
const ASSUMED_LENGTH_MS = 3 * 3600_000;

/** What every calendar gets: title, start and end, place and description. Null when the date is not fixed. */
function calendarEntry(ev: Event, url: string) {
  if (!ev.startsAt) return null;
  const knownEnd = eventEndsAt(ev);
  const end = (knownEnd ?? new Date(Date.parse(ev.startsAt) + ASSUMED_LENGTH_MS)).toISOString();
  const location = ev.venue ? [ev.venue.name, ev.venue.street, [ev.venue.zip, ev.venue.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  const times = timesLine(ev);
  const programme = ev.agenda.map((a) => `${a.time ? `${a.time} ` : ''}${a.title}`).join('\n');
  const description = [
    ev.description,
    times ? `${times}.${knownEnd ? '' : ' End time not fixed; this entry blocks three hours.'}` : '',
    programme ? `Programme:\n${programme}` : '',
    'RSVP on Meetup; details on the event page:',
    url,
  ]
    .filter(Boolean)
    .join('\n\n');
  return { title: eventDisplayTitle(ev.title), start: ev.startsAt, end, location, description };
}

/**
 * Links that open a prefilled entry in Google Calendar and Outlook, as on conf.zurichjs.com. Apple Calendar and
 * other apps use the event's .ics file (/events/<slug>.ics). Null when the date is not fixed.
 */
export function calendarLinks(ev: Event, url: string): { google: string; outlook: string } | null {
  const e = calendarEntry(ev, url);
  if (!e) return null;
  const google = new URL('https://calendar.google.com/calendar/render');
  google.searchParams.set('action', 'TEMPLATE');
  google.searchParams.set('text', e.title);
  google.searchParams.set('dates', `${utc(e.start)}/${utc(e.end)}`);
  google.searchParams.set('details', e.description);
  if (e.location) google.searchParams.set('location', e.location);
  const outlook = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  outlook.searchParams.set('path', '/calendar/action/compose');
  outlook.searchParams.set('rru', 'addevent');
  outlook.searchParams.set('subject', e.title);
  outlook.searchParams.set('startdt', new Date(e.start).toISOString());
  outlook.searchParams.set('enddt', e.end);
  outlook.searchParams.set('body', e.description);
  if (e.location) outlook.searchParams.set('location', e.location);
  return { google: google.toString(), outlook: outlook.toString() };
}

/**
 * RFC 5545 calendar file for one event, or null when the date is not fixed.
 * Times are UTC (the instant is exact in every calendar, in summer and winter).
 * DTSTART is the event's `datetime` (the Meetup start). DTEND is `endsAt` or
 * the agenda's close line; when neither exists the entry blocks three hours
 * and its description says the end time is not fixed.
 * The UID is the public URL segment, so downloading again updates the same
 * calendar entry instead of adding a second one; SEQUENCE follows the last edit.
 */
export function buildIcs(ev: Event, url: string, stamp: Date = new Date()): string | null {
  const e = calendarEntry(ev, url);
  if (!e) return null;
  const sequence = ev.updatedAt ? Math.floor(Date.parse(ev.updatedAt) / 1000) % 2_000_000_000 : 0;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZurichJS//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.slug}@zurichjs.com`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${utc(stamp.toISOString())}`,
    `DTSTART:${utc(e.start)}`,
    `DTEND:${utc(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    e.location ? `LOCATION:${esc(e.location)}` : '',
    `URL:${url}`,
    `STATUS:${ev.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map(fold)
    .join('\r\n');
}
