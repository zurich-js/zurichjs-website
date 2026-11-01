/** Meetups are planned in Zurich local time; Sanity stores UTC. */
const ZONE = 'Europe/Zurich';

const offsetMinutes = (utc: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(utc)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!);
  return (asUtc - utc.getTime()) / 60_000;
};

/** "2026-12-09" + "18:30" (Zurich) → "2026-12-09T17:30:00.000Z". Handles summer time. */
export function zurichToUtcIso(date: string, time: string): string {
  const d = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{2}):(\d{2})$/);
  if (!d || !t) throw new Error(`Expected YYYY-MM-DD and HH:MM, got "${date}" "${time}"`);
  const naive = Date.UTC(+d[1]!, +d[2]! - 1, +d[3]!, +t[1]!, +t[2]!);
  // Two passes settle the offset around DST changes.
  let utc = naive - offsetMinutes(new Date(naive)) * 60_000;
  utc = naive - offsetMinutes(new Date(utc)) * 60_000;
  return new Date(utc).toISOString();
}

/** "2026-12-09T17:30:00.000Z" → "Wed 9 Dec 2026, 18:30" in Zurich. */
export function formatZurich(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${date}, ${time}`;
}
