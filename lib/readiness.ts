/**
 * What the public event page needs before an event can be published, per
 * editorial status. Mirrors the V2 site (platform/packages/events): the page
 * shows the date, venue and RSVP action only when the status says they exist.
 * Used by field validation, the "Readiness" document view and the badge.
 */
export type EventStatus = 'scheduled' | 'rsvp-soon' | 'tbc' | 'full' | 'postponed' | 'cancelled'

export interface EventDraft {
  title?: string
  id?: {current?: string}
  status?: EventStatus
  datetime?: string
  dateText?: string
  location?: string
  venue?: {name?: string; city?: string}
  description?: string
  meetupUrl?: string
  isProMeetup?: boolean
  stripePriceId?: string
  talks?: unknown[]
  agenda?: unknown[]
}

export interface Check {
  ok: boolean
  label: string
  /** Why the page needs it, in plain words. */
  why: string
}

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : !!v)

export function readiness(ev: EventDraft): Check[] {
  const status = ev.status ?? 'scheduled'
  const dated = status === 'scheduled' || status === 'rsvp-soon' || status === 'full'
  const checks: Check[] = [
    {ok: has(ev.title), label: 'Title', why: 'Shown as the page heading and in search results.'},
    {ok: has(ev.id?.current), label: 'URL (ID)', why: 'The event page lives at /events/<ID>. Do not change it after publishing.'},
    {ok: has(ev.description) && (ev.description?.length ?? 0) >= 50, label: 'Description (50+ characters)', why: 'Used on the page, in search snippets and in link previews.'},
  ]
  if (dated) {
    checks.push({ok: has(ev.datetime), label: 'Date and doors time', why: 'Scheduled, RSVP-soon and full events show a date.'})
    checks.push({ok: has(ev.venue?.name) || has(ev.location), label: 'Venue', why: 'People need to know where to go.'})
    checks.push({ok: has(ev.talks) || has(ev.agenda), label: 'Programme (talks or agenda)', why: 'The page lists the talks.'})
  }
  if (status === 'tbc') checks.push({ok: has(ev.dateText), label: 'Month text (e.g. “January 2027”)', why: 'TBC events show the month instead of a date.'})
  if ((status === 'scheduled' || status === 'full') && !ev.isProMeetup) {
    checks.push({ok: has(ev.meetupUrl), label: 'Meetup event link', why: 'The RSVP and waitlist buttons hand off to this Meetup event.'})
  }
  if (ev.isProMeetup) checks.push({ok: has(ev.stripePriceId), label: 'Stripe price ID', why: 'Pro meetups sell tickets on the site with this price.'})
  return checks
}

export const isReady = (ev: EventDraft) => readiness(ev).every((c) => c.ok)
