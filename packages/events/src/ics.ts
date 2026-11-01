import type { Event } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** RFC 5545 calendar file for one event, or null when the date is not fixed. */
export function buildIcs(ev: Event, url: string, stamp: Date = new Date()): string | null {
  if (!ev.startsAt) return null;
  const end = ev.endsAt ?? new Date(Date.parse(ev.startsAt) + 3 * 3600_000).toISOString();
  const loc = ev.venue ? [ev.venue.name, ev.venue.street, [ev.venue.zip, ev.venue.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZurichJS//Events//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@zurichjs.com`,
    `DTSTAMP:${utc(stamp.toISOString())}`,
    `DTSTART:${utc(ev.startsAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(`ZurichJS: ${ev.title}`)}`,
    `DESCRIPTION:${esc(`${ev.description}\n${url}`)}`,
    loc ? `LOCATION:${esc(loc)}` : '',
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}
