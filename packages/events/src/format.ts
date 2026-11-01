/** Date formatting in Europe/Zurich, en-GB, matching the V2 design copy. */
const TZ = 'Europe/Zurich';

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });
const part = (iso: string, opts: Intl.DateTimeFormatOptions) => fmt(opts).format(new Date(iso));

/** "Wed 18 Nov 2026" */
export const dateLong = (iso: string) => `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "18 Nov 2026" */
export const dateShort = (iso: string) => `${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "Nov 2026" */
export const monthYear = (iso: string) => `${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;

/** "18:30" (h23, so midnight is never "24:00") */
export const time = (iso: string) => part(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** "CET" in winter, "CEST" in summer, for the given instant in Zurich. */
export const zoneLabel = (iso: string) => {
  const name = fmt({ timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName')?.value;
  // en-GB names the zone "CET"/"CEST"; some runtimes answer "GMT+1"/"GMT+2".
  return name === 'GMT+2' ? 'CEST' : name === 'GMT+1' ? 'CET' : (name ?? 'CET');
};

/** "2026-11-12" for the instant, as a calendar day in Zurich. */
export const zurichDay = (iso: string | Date) => {
  const p = Object.fromEntries(
    fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(typeof iso === 'string' ? new Date(iso) : iso)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
};

const offsetMinutes = (utc: Date) => {
  const p = Object.fromEntries(
    fmt({ hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(utc)
      .map((x) => [x.type, x.value]),
  );
  return (Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - utc.getTime()) / 60_000;
};

/**
 * Zurich wall-clock time on a Zurich calendar day → the instant.
 * ("2026-12-09", "18:30") → 2026-12-09T17:30:00.000Z. Handles summer time.
 */
export function zurichWallTime(day: string, hhmm: string): Date {
  const d = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!d || !t) throw new Error(`Expected YYYY-MM-DD and HH:MM, got "${day}" "${hhmm}"`);
  const naive = Date.UTC(+d[1]!, +d[2]! - 1, +d[3]!, +t[1]!, +t[2]!);
  // Two passes settle the offset around the summer-time changes.
  let utc = naive - offsetMinutes(new Date(naive)) * 60_000;
  utc = naive - offsetMinutes(new Date(utc)) * 60_000;
  return new Date(utc);
}

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
export const dateTimeNoYear = (iso: string) => `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })}, ${time(iso)}`;

export const chf = (n: number) => `CHF ${n}`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
