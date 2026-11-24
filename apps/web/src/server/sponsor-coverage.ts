/**
 * The meetups a sponsorship covers (docs/domains/sponsorship/overview.md, "Covered meetups"), as the
 * sponsor and the board see them: the stored coverage rows, with each meetup's state checked
 * against Sanity at request time. When Sanity cannot be reached the stored title and date are
 * shown, the state is worked out from the date alone, and `checked` is false so the page can say so.
 */
import type { CoverageRow, Sponsor, SponsorMeetup } from '@zurichjs/sponsorship';
import type { Env } from './http.ts';
import { groqQuery } from './sanity.ts';
import { zurichDay } from './sponsor.ts';

/** `moved`: the meetup is postponed. `unknown`: Sanity has no published meetup with that id any more. */
export type CoveredState = 'upcoming' | 'past' | 'cancelled' | 'moved' | 'unknown';

export interface CoveredMeetup extends SponsorMeetup {
  state: CoveredState;
  /** The public meetup page, or null when Sanity was not reached or no longer lists the meetup. */
  url: string | null;
}

/** A meetup as Sanity has it now. */
export interface LiveMeetup {
  id: string;
  title: string;
  /** ISO start, or null when not dated. */
  datetime: string | null;
  status: string | null;
  /** The public page's slug (`/events/<slug>`), or null. */
  slug?: string | null;
}

export type LiveLookup = (eventIds: string[]) => Promise<LiveMeetup[]>;

/** Published meetups by id, from Sanity at request time. */
export const sanityMeetups =
  (env: Env, fetchImpl?: typeof fetch): LiveLookup =>
  async (ids) =>
    ids.length ? groqQuery(env, fetchImpl)<LiveMeetup[]>(`*[_type == "events" && _id in $ids]{"id": _id, title, datetime, status, "slug": id.current}`, { ids }) : [];

const stateOf = (date: string, today: string, status: string | null | undefined): CoveredState =>
  status === 'cancelled' ? 'cancelled' : status === 'postponed' ? 'moved' : date < today ? 'past' : 'upcoming';

/** Covered now (taken-off rows left out), with live state; `checked` is false when Sanity failed. */
export async function coveredMeetups(rows: SponsorMeetup[], lookup: LiveLookup, now: Date = new Date()): Promise<{ meetups: CoveredMeetup[]; checked: boolean }> {
  const today = zurichDay(now);
  const live = await lookup(rows.map((r) => r.eventId)).catch((cause: Error) => {
    console.warn(`[sponsorship] covered meetups not checked against Sanity: ${cause.message}`);
    return null;
  });
  if (!live) return { meetups: rows.map((r) => ({ ...r, state: stateOf(r.date, today, null), url: null })), checked: false };
  const byId = new Map(live.map((m) => [m.id, m]));
  return {
    checked: true,
    meetups: rows.map((r) => {
      const m = byId.get(r.eventId);
      if (!m) return { ...r, state: 'unknown' as const, url: null };
      const date = m.datetime ? zurichDay(new Date(m.datetime)) : r.date;
      const url = m.slug ? `/events/${encodeURIComponent(m.slug)}` : null;
      return { eventId: r.eventId, title: m.title || r.title, date, state: stateOf(date, today, m.status), url };
    }),
  };
}

/**
 * Whether the board may take a meetup off, decided on the date the sponsor sees: the meetup's
 * current date in Sanity, or the stored date when Sanity no longer lists it. When Sanity cannot be
 * reached the date cannot be verified, and the row stays.
 */
export async function removalCheck(row: SponsorMeetup, lookup: LiveLookup, now: Date): Promise<'removable' | 'happened' | 'unverified'> {
  const { meetups, checked } = await coveredMeetups([row], lookup, now);
  if (!checked) return 'unverified';
  return meetups[0]!.state === 'past' ? 'happened' : 'removable';
}

/**
 * The board's history: every row, with who confirmed it and whether it was taken off. Rows still
 * covered carry `current`, the meetup as the sponsor sees it now (date and state from Sanity).
 */
export const coverageHistoryView = (rows: CoverageRow[], current: CoveredMeetup[] = []) => {
  const now = new Map(current.map((m) => [m.eventId, m]));
  return rows.map((r) => {
    const live = r.removedAt ? undefined : now.get(r.eventId);
    return {
      eventId: r.eventId,
      title: r.title,
      date: r.date,
      confirmedAt: r.confirmedAt,
      confirmedBy: r.confirmedBy,
      removedAt: r.removedAt,
      removedBy: r.removedBy,
      current: live ? { date: live.date, state: live.state, url: live.url } : null,
    };
  });
};

/** The board's view of a sponsorship's coverage, checked against Sanity like the sponsor's. */
export async function coverageForBoard(rows: CoverageRow[], lookup: LiveLookup, now: Date) {
  const active = rows.filter((r) => !r.removedAt).map((r) => ({ eventId: r.eventId, title: r.title, date: r.date }));
  const live = await coveredMeetups(active, lookup, now);
  return { coverage: coverageHistoryView(rows, live.meetups), checked: live.checked };
}

/** Why the board cannot change coverage here, or null. One-time sponsorships keep their meetups in the bundle. */
export function coverageLocked(s: Pick<Sponsor, 'cycle' | 'status'>): string | null {
  if (s.cycle === 'once') return 'A one-time sponsorship covers the meetups in its plan. Change them under Meetups.';
  if (s.status === 'ended') return 'This sponsorship has ended. Its covered meetups stay as they were.';
  return null;
}
