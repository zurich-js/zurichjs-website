/**
 * The Tonight page (/today). It must never call a future meetup "tonight".
 *
 *   upcoming  before the event's day (Zurich calendar)      "Next meetup: Thursday 12 November"
 *   today     the event's day, before doors                  arrival, venue, programme
 *   live      from doors until the evening ends              now / next, rate the talks
 *   after     after the evening, until doors + 48 h          thanks, feedback
 *   none      nothing dated is coming up                     what to do meanwhile
 */
import { zurichDay } from './format';
import { FEEDBACK_WINDOW_MS } from './state';
import type { Event, Partner, SupporterRole } from './types';

export type TodayPhase = 'upcoming' | 'today' | 'live' | 'after' | 'none';

const EVENING_MS = 4 * 3600_000;
const dated = (e: Event) => !!e.startsAt && !['cancelled', 'postponed', 'tbc'].includes(e.status);

/** The meetup the page is about: one whose feedback window is open, else the next dated one. */
export function pickTodayEvent(events: Event[], now: Date): Event | undefined {
  const t = now.getTime();
  const list = events.filter(dated).sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!));
  const recent = list.filter((e) => Date.parse(e.startsAt!) <= t && t < Date.parse(e.startsAt!) + FEEDBACK_WINDOW_MS).pop();
  return recent ?? list.find((e) => Date.parse(e.startsAt!) > t);
}

export function todayPhase(ev: Event | undefined, now: Date): TodayPhase {
  if (!ev?.startsAt || !dated(ev)) return 'none';
  const t = now.getTime();
  const start = Date.parse(ev.startsAt);
  const end = ev.endsAt ? Date.parse(ev.endsAt) : start + EVENING_MS;
  if (t >= start + FEEDBACK_WINDOW_MS) return 'none';
  if (t >= end) return 'after';
  if (t >= start) return 'live';
  return zurichDay(now) === zurichDay(ev.startsAt) ? 'today' : 'upcoming';
}

const ROLE_ORDER: SupporterRole[] = ['venue', 'food', 'sponsor', 'community'];
export const ROLE_LABEL: Record<SupporterRole, string> = { venue: 'Venue host', food: 'Food and drinks', sponsor: 'Sponsor', community: 'Community partner' };

/** Who supports this event: its hosts (venue) and its listed supporters, once each, venue first. */
export function eventSupporters(ev: Pick<Event, 'hosts' | 'supporters'>, partners: Partner[]): { partner: Partner; role: SupporterRole }[] {
  const byId = new Map(partners.map((p) => [p.id, p]));
  const out = new Map<string, { partner: Partner; role: SupporterRole }>();
  for (const s of ev.supporters ?? []) {
    const partner = byId.get(s.partnerId);
    if (partner && !out.has(partner.id)) out.set(partner.id, { partner, role: s.role });
  }
  for (const id of ev.hosts ?? []) {
    const partner = byId.get(id);
    if (partner && !out.has(id)) out.set(id, { partner, role: 'venue' });
  }
  return [...out.values()].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
}
