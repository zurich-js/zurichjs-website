import { resolveState, type Event, type EventState } from '@zurichjs/events';
import { useEffect, useState } from 'preact/hooks';

const STATES: EventState[] = ['open', 'notopen', 'tbc', 'full', 'postponed', 'cancelled', 'live', 'past'];

/**
 * The event's state, kept in step with the clock. Server render (build time)
 * uses `initial`; in the browser it re-evaluates on mount and every minute, so
 * a page built before doors switches to feedback mode without a rebuild.
 * In development, `?state=live` previews any state.
 */
export function useEventState(ev: Event, initial: EventState): EventState {
  const [state, setState] = useState(initial);
  useEffect(() => {
    const preview = import.meta.env.DEV ? new URLSearchParams(location.search).get('state') : null;
    if (preview && (STATES as string[]).includes(preview)) return setState(preview as EventState);
    const tick = () => setState(resolveState(ev, new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [ev]);
  return state;
}
