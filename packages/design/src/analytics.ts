/**
 * Analytics facade. Elements carry `data-track="<event>"` plus `data-track-*`
 * properties; one delegated listener in BaseLayout forwards clicks to PostHog
 * when it is configured (PUBLIC_POSTHOG_KEY). Outbound RSVP clicks are
 * handoffs, not registrations, and are named that way.
 */
export type TrackName = 'rsvp_handoff_click' | 'conf_outbound_click' | 'share_click' | 'ics_download' | 'form_submit' | 'rating_submit' | 'donate_checkout';

export function track(name: TrackName, props: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  (window as unknown as { posthog?: { capture: (n: string, p: Record<string, unknown>) => void } }).posthog?.capture(name, props);
}

/** Attributes for a tracked link in .astro markup. */
export const trackAttrs = (name: TrackName, props: Record<string, string> = {}) => ({
  'data-track': name,
  ...Object.fromEntries(Object.entries(props).map(([k, v]) => [`data-track-${k}`, v])),
});

export const confLink = (path = '', placement = 'nav') => {
  const u = new URL(path || '/', 'https://conf.zurichjs.com');
  u.searchParams.set('utm_source', 'zurichjs.com');
  u.searchParams.set('utm_medium', placement);
  return u.toString();
};
