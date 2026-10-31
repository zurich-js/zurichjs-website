import type { Event } from '@/data/types';

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/** Builds an .ics file for one event and triggers a download. Client-side only. */
export function downloadIcs(ev: Event, url: string) {
  if (!ev.startsAt) return;
  const end = ev.endsAt ?? new Date(new Date(ev.startsAt).getTime() + 3 * 3600_000).toISOString();
  const loc = ev.venue ? [ev.venue.name, ev.venue.street, [ev.venue.zip, ev.venue.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZurichJS//Events//EN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@zurichjs.com`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(ev.startsAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(`ZurichJS: ${ev.title}`)}`,
    `DESCRIPTION:${esc(`${ev.description}\n${url}`)}`,
    loc ? `LOCATION:${esc(loc)}` : '',
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `zurichjs-${ev.slug}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
