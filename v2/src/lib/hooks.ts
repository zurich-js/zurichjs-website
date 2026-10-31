import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { EventState } from '@/data/types';
import { eventHref, nextMeetup } from './events';

/** The clock, refreshed once a minute so live/feedback windows switch without a reload. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useNextMeetupHref(): string {
  const now = useNow();
  const ev = nextMeetup(now);
  return ev ? eventHref(ev) : '/events';
}

const STATES: EventState[] = ['open', 'notopen', 'tbc', 'full', 'postponed', 'cancelled', 'live', 'past'];

/**
 * Outside production, `?state=live` (etc.) previews an event page in any state,
 * the way the prototype's control bar did. Ignored in production builds.
 */
export function useStatePreview(): EventState | undefined {
  const { query } = useRouter();
  if (process.env.NODE_ENV === 'production') return undefined;
  const s = typeof query.state === 'string' ? query.state : undefined;
  return s && (STATES as string[]).includes(s) ? (s as EventState) : undefined;
}

/** Outside production, `?at=2026-11-18T19:10` previews /today at a given time. */
export function usePreviewClock(): Date {
  const { query } = useRouter();
  const now = useNow();
  if (process.env.NODE_ENV !== 'production' && typeof query.at === 'string') {
    const d = new Date(query.at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return now;
}

/** Copies text and reports success for a couple of seconds. */
export function useCopy(): [boolean, (text: string) => void] {
  const [done, setDone] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    });
  };
  return [done, copy];
}
