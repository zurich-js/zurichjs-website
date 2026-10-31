/** Date formatting in Europe/Zurich, en-GB, matching the V2 design copy. */
const TZ = 'Europe/Zurich';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const part = (iso: string, opts: Intl.DateTimeFormatOptions) => fmt(opts).format(new Date(iso));

/** "Wed 18 Nov 2026" */
export const dateLong = (iso: string) =>
  `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "18 Nov 2026" */
export const dateShort = (iso: string) => `${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "Nov 2026" */
export const monthYear = (iso: string) => `${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "18:30" */
export const time = (iso: string) => part(iso, { hour: '2-digit', minute: '2-digit', hour12: false });

/** Parts for the date tile in event lists. */
export const dateParts = (iso: string) => ({
  mon: part(iso, { month: 'short' }),
  day: part(iso, { day: 'numeric' }),
  year: part(iso, { year: 'numeric' }),
});

/** "Wed 18 Nov 2026, 18:30–21:30" */
export const dateTimeRange = (startIso: string, endIso?: string) => `${dateLong(startIso)}, ${time(startIso)}${endIso ? `–${time(endIso)}` : ''}`;

/** "Wed 18 Nov 2026, 18:30" */
export const dateTime = (startIso: string) => `${dateLong(startIso)}, ${time(startIso)}`;

/** "Fri 20 Nov, 21:30" (no year, for deadlines close to the event) */
export const dateTimeNoYear = (iso: string) =>
  `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })}, ${time(iso)}`;

export const chf = (n: number) => `CHF ${n}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
