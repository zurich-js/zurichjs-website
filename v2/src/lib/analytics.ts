/**
 * Thin tracking facade. The current site uses PostHog; wire `track` to it here.
 * Outbound RSVP clicks are handoffs, not registrations, so they are named that way.
 */
export type TrackEvent =
  | { name: 'rsvp_handoff_click'; eventId: string }
  | { name: 'conf_outbound_click'; placement: string; confState: string }
  | { name: 'share_click'; eventId: string }
  | { name: 'ics_download'; eventId: string }
  | { name: 'form_submit'; form: string }
  | { name: 'rating_submit'; eventId: string; target: string };

export function track(e: TrackEvent) {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { posthog?: { capture: (n: string, p: Record<string, unknown>) => void } };
  const { name, ...props } = e;
  w.posthog?.capture(name, props);
}

export const confLink = (path = '', placement = 'nav') => {
  const u = new URL(path || '/', 'https://conf.zurichjs.com');
  u.searchParams.set('utm_source', 'zurichjs.com');
  u.searchParams.set('utm_medium', placement);
  return u.toString();
};
