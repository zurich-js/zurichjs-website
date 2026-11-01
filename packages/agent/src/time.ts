import { zurichWallTime } from '@zurichjs/events';

/** Meetups are planned in Zurich local time; Sanity stores UTC. */
const ZONE = 'Europe/Zurich';

/** "2026-12-09" + "18:30" (Zurich) → "2026-12-09T17:30:00.000Z". Handles summer time. */
export const zurichToUtcIso = (date: string, time: string): string => zurichWallTime(date, time).toISOString();

/** "2026-12-09T17:30:00.000Z" → "Wed 9 Dec 2026, 18:30" in Zurich. */
export function formatZurich(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${date}, ${time}`;
}
