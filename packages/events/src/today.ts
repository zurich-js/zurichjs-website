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

const TIER_ORDER = ['champion', 'builder', 'friend', 'supporter', undefined];

/** Partners grouped for display. Only partners marked current are ever called current sponsors. */
export function groupPartners(partners: Partner[]) {
  const byTier = (a: Partner, b: Partner) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || a.name.localeCompare(b.name);
  const has = (p: Partner, k: Partner['kinds'][number]) => p.kinds.includes(k);
  const sponsors = partners.filter((p) => has(p, 'sponsor'));
  return {
    currentSponsors: sponsors.filter((p) => p.current).sort(byTier),
    pastSponsors: sponsors.filter((p) => !p.current).sort(byTier),
    venues: partners.filter((p) => has(p, 'venue') || has(p, 'food')).sort((a, b) => a.name.localeCompare(b.name)),
    community: partners.filter((p) => p.current && (has(p, 'community') || has(p, 'conference'))).sort((a, b) => a.name.localeCompare(b.name)),
    supporting: partners.filter((p) => p.current && has(p, 'supporting')).sort((a, b) => a.name.localeCompare(b.name)),
    pastPartners: partners.filter((p) => !p.current && !has(p, 'sponsor') && !has(p, 'venue') && !has(p, 'food')).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** "Since 2025", "2024–2025", or undefined when no dates are recorded. */
export const partnerPeriod = (p: Pick<Partner, 'since' | 'until'>) => {
  const y = (d?: string) => d?.slice(0, 4);
  if (p.since && p.until) return y(p.since) === y(p.until) ? `In ${y(p.since)}` : `${y(p.since)}–${y(p.until)}`;
  if (p.since) return `Since ${y(p.since)}`;
  if (p.until) return `Until ${y(p.until)}`;
  return undefined;
};
