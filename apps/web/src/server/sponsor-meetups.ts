/**
 * Upcoming meetups a one-meetup sponsorship can be for: published, dated, not cancelled or
 * postponed, from Sanity at request time (so a meetup added today can be chosen today).
 */
import type { Env } from './http.ts';
import { groqQuery } from './sanity.ts';
import type { Meetup } from './sponsor-route.ts';

const zurichDay = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date(iso));

export async function upcomingMeetups(env: Env, fetchImpl?: typeof fetch): Promise<Meetup[]> {
  const rows = await groqQuery(
    env,
    fetchImpl,
  )<{ _id: string; title: string; datetime: string }[]>(
    `*[_type == "events" && defined(datetime) && datetime > now() && !(status in ["cancelled", "postponed"])] | order(datetime asc)[0...12]{_id, title, datetime}`,
  );
  return rows.map((r) => ({ id: r._id, title: r.title, date: zurichDay(r.datetime) }));
}
