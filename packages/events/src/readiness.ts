/**
 * What the public event page needs before an event can be published, per editorial status.
 * Same rules as the Sanity Studio's `lib/readiness.ts` (zurich-js/zurich-js-website-sanity-studio);
 * keep both in step (test/readiness.test.ts holds the shared cases). Works on the raw Sanity
 * document shape, so the Slack agent can check a draft before anyone publishes it.
 */
import type { EventStatus } from './types.ts';

export interface EventDocumentForReadiness {
  title?: string | null;
  id?: { current?: string | null } | null;
  status?: EventStatus | null;
  datetime?: string | null;
  dateText?: string | null;
  location?: string | null;
  venue?: { name?: string | null; city?: string | null } | null;
  description?: string | null;
  meetupUrl?: string | null;
  talks?: unknown[] | null;
  agenda?: unknown[] | null;
}

export interface ReadinessCheck {
  ok: boolean;
  label: string;
  /** Why the page needs it, in plain words. */
  why: string;
}

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : !!v);

export function readiness(ev: EventDocumentForReadiness): ReadinessCheck[] {
  const status = ev.status ?? 'scheduled';
  const dated = status === 'scheduled' || status === 'rsvp-soon' || status === 'full';
  const checks: ReadinessCheck[] = [
    { ok: has(ev.title), label: 'Title', why: 'Shown as the page heading and in search results.' },
    { ok: has(ev.id?.current), label: 'URL (ID)', why: 'The event page lives at /events/<ID>. Do not change it after publishing.' },
    { ok: has(ev.description) && (ev.description?.length ?? 0) >= 50, label: 'Description (50+ characters)', why: 'Used on the page, in search snippets and in link previews.' },
  ];
  if (dated) {
    checks.push({ ok: has(ev.datetime), label: 'Date and doors time', why: 'Scheduled, RSVP-soon and full events show a date.' });
    checks.push({ ok: has(ev.venue?.name) || has(ev.location), label: 'Venue', why: 'People need to know where to go.' });
    checks.push({ ok: has(ev.talks) || has(ev.agenda), label: 'Programme (talks or agenda)', why: 'The page lists the talks.' });
  }
  if (status === 'tbc') checks.push({ ok: has(ev.dateText), label: 'Month text (e.g. “January 2027”)', why: 'TBC events show the month instead of a date.' });
  if (status === 'scheduled' || status === 'full') {
    checks.push({ ok: has(ev.meetupUrl), label: 'Meetup event link', why: 'The RSVP and waitlist buttons hand off to this Meetup event.' });
  }
  return checks;
}

export const isReady = (ev: EventDocumentForReadiness) => readiness(ev).every((c) => c.ok);
