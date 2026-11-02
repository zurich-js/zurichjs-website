import { scheduleFacts } from './schedule.ts';
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

/**
 * RFC 5545 calendar file for one event, or null when the date is not fixed.
 * Times are UTC (the instant is exact in every calendar, in summer and winter).
 * The UID is the public URL segment, so downloading again updates the same
 * calendar entry instead of adding a second one; SEQUENCE follows the last edit.
 */
export function buildIcs(ev: Event, url: string, stamp: Date = new Date()): string | null {
  if (!ev.startsAt) return null;
  const end = ev.endsAt ?? new Date(Date.parse(ev.startsAt) + 3 * 3600_000).toISOString();
  const loc = ev.venue ? [ev.venue.name, ev.venue.street, [ev.venue.zip, ev.venue.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  const f = scheduleFacts(ev);
  const programme = ev.agenda.map((a) => `${a.time ? `${a.time} ` : ''}${a.title}`).join('\n');
  const description = [
    ev.description,
    f.doors ? `Doors ${f.doors} (${f.zone}).` : '',
    programme ? `Programme:\n${programme}` : '',
    'RSVP on Meetup; details on the event page:',
    url,
  ]
    .filter(Boolean)
    .join('\n\n');
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
    `DTSTART:${utc(ev.startsAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(eventDisplayTitle(ev.title))}`,
    `DESCRIPTION:${esc(description)}`,
    loc ? `LOCATION:${esc(loc)}` : '',
    `URL:${url}`,
    `STATUS:${ev.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map(fold)
    .join('\r\n');
}
