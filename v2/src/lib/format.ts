const TZ = 'Europe/Zurich';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });

export const toDate = (iso: string) => new Date(iso);

/** "Wed 18 Nov 2026" */
export function dateLong(iso: string): string {
  const d = toDate(iso);
  return `${fmt({ weekday: 'short' }).format(d)} ${fmt({ day: 'numeric' }).format(d)} ${fmt({ month: 'short' }).format(d)} ${fmt({ year: 'numeric' }).format(d)}`;
}

/** "18 Nov 2026" */
export function dateShort(iso: string): string {
  const d = toDate(iso);
  return `${fmt({ day: 'numeric' }).format(d)} ${fmt({ month: 'short' }).format(d)} ${fmt({ year: 'numeric' }).format(d)}`;
}

/** "Nov 2026" */
export function monthYear(iso: string): string {
  const d = toDate(iso);
  return `${fmt({ month: 'short' }).format(d)} ${fmt({ year: 'numeric' }).format(d)}`;
}

/** "18:30" */
export function time(iso: string): string {
  return fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(toDate(iso));
}

/** Parts for the date tile in event lists. */
export function dateParts(iso: string): { mon: string; day: string; year: string } {
  const d = toDate(iso);
  return { mon: fmt({ month: 'short' }).format(d), day: fmt({ day: 'numeric' }).format(d), year: fmt({ year: 'numeric' }).format(d) };
}

/** "Wed 18 Nov 2026, 18:30–21:30" */
export function dateTimeRange(startIso: string, endIso?: string): string {
  return `${dateLong(startIso)}, ${time(startIso)}${endIso ? `–${time(endIso)}` : ''}`;
}

/** "Wed 18 Nov 2026, 18:30" */
export function dateTime(startIso: string): string {
  return `${dateLong(startIso)}, ${time(startIso)}`;
}

/** "Fri 20 Nov, 21:30" (no year, for deadlines close to the event) */
export function dateTimeNoYear(iso: string): string {
  const d = toDate(iso);
  return `${fmt({ weekday: 'short' }).format(d)} ${fmt({ day: 'numeric' }).format(d)} ${fmt({ month: 'short' }).format(d)}, ${time(iso)}`;
}

export const chf = (n: number) => `CHF ${n}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
