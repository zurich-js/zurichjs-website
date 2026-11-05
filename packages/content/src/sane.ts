/**
 * Free tickets on Sane (docs/v2/SANE-READINESS.md). For each event linked to
 * Sane in Sanity (`events.sane`), the build reads Sane's public event and
 * attaches `sane: { url, state }`. Sane's CORS rule forbids browsers on
 * zurichjs.com, so this runs at build time only.
 *
 * Any failure (network, timeout, 404 for a draft, an unexpected answer) logs
 * one line and leaves `sane` unset: the event then hands off to Meetup. A Sane
 * problem never fails the build.
 */
import type { Event, SaneEvent, SaneRegistrationState } from '@zurichjs/events';
import type { RawEvent } from './map.ts';

type Env = Record<string, string | undefined>;

const STATES: SaneRegistrationState[] = ['open', 'not_open_yet', 'sold_out', 'closed', 'ended', 'cancelled'];
const TIMEOUT_MS = 8_000;

const trimSlash = (url: string) => url.replace(/\/+$/, '');

export const saneConfig = (env: Env) => ({
  apiUrl: trimSlash(env.SANE_API_URL || 'https://api.sane.events'),
  webUrl: trimSlash(env.SANE_WEB_URL || 'https://sane.events'),
});

interface SaneRef {
  organization: string;
  event: string;
}

const saneRef = (r: RawEvent): SaneRef | undefined =>
  r.sane?.organization?.trim() && r.sane.event?.trim() ? { organization: r.sane.organization.trim(), event: r.sane.event.trim() } : undefined;

/** Reads one event from Sane's public API. Throws on anything but a well-formed answer. */
export async function fetchSaneEvent(ref: SaneRef, env: Env, fetchImpl: typeof fetch = fetch): Promise<SaneEvent> {
  const { apiUrl, webUrl } = saneConfig(env);
  const res = await fetchImpl(`${apiUrl}/v1/public/events/${encodeURIComponent(ref.organization)}/${encodeURIComponent(ref.event)}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { event?: { path?: unknown }; registration?: { state?: unknown } } | null;
  const path = body?.event?.path;
  const state = body?.registration?.state;
  if (typeof path !== 'string' || !path.startsWith('/')) throw new Error('no event.path in the answer');
  if (!STATES.includes(state as SaneRegistrationState)) throw new Error(`unknown registration.state ${JSON.stringify(state)}`);
  return { url: `${webUrl}${path}`, state: state as SaneRegistrationState };
}

/**
 * Attaches Sane's link and registration state to the events linked to Sane.
 * Only those events are fetched, in parallel, each with a timeout.
 */
export async function attachSane(
  events: Event[],
  raw: RawEvent[],
  env: Env,
  { fetchImpl = fetch, log = console.warn }: { fetchImpl?: typeof fetch; log?: (msg: string) => void } = {},
): Promise<Event[]> {
  const refs = new Map<string, SaneRef>();
  for (const r of raw) {
    const ref = saneRef(r);
    if (ref) refs.set(r._id, ref);
  }
  return Promise.all(
    events.map(async (ev) => {
      const ref = refs.get(ev.id);
      if (!ref) return ev;
      try {
        return { ...ev, sane: await fetchSaneEvent(ref, env, fetchImpl) };
      } catch (err) {
        log(`[sane] ${ref.organization}/${ref.event} for event "${ev.slug}" could not be read (${(err as Error).message}): the event links to Meetup instead.`);
        return ev;
      }
    }),
  );
}
