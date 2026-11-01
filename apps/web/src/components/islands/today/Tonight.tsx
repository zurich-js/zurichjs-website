import type { Event } from '@zurichjs/events';
import { submitRating } from '~/lib/rating';
import { useEffect, useState } from 'preact/hooks';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { RatingSheet, type RateTarget } from '@zurichjs/design/islands/RatingSheet';
import { Check } from '@zurichjs/design/islands/Check';

/**
 * The evening at a glance (/today). Two islands from this one module share a
 * tiny store: part="opening" (now / next cards and the primary action, on
 * black) and part="programme" (the running order with a "Now" marker and
 * per-talk rating). Both server-render as of the build time, then follow the
 * browser clock every minute. In development, `?at=2026-11-18T19:40` previews
 * a moment of the evening.
 */

interface Shared {
  rated: Record<string, number>;
  target: RateTarget | null;
}
let shared: Shared = { rated: {}, target: null };
const subs = new Set<() => void>();
const setShared = (patch: Partial<Shared>) => {
  shared = { ...shared, ...patch };
  subs.forEach((f) => f());
};
function useShared(): Shared {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    subs.add(f);
    return () => void subs.delete(f);
  }, []);
  return shared;
}

function useClock(initialIso: string): Date {
  const [now, setNow] = useState(() => new Date(initialIso));
  useEffect(() => {
    if (import.meta.env.DEV) {
      const at = new URLSearchParams(location.search).get('at');
      const d = at ? new Date(at) : null;
      if (d && !Number.isNaN(d.getTime())) return setNow(d);
    }
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Agenda item start as a Date, on the event's day, in the event's UTC offset. */
function itemStart(startsAt: string, time: string): Date {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const offset = /([+-]\d{2}:\d{2}|Z)$/.exec(startsAt)?.[1] ?? 'Z';
  const d = new Date(`${startsAt.slice(0, 10)}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00${offset}`);
  return Number.isNaN(d.getTime()) ? new Date(startsAt) : d;
}

interface Props {
  part: 'opening' | 'programme';
  ev: Event;
  /** Speaker id → name. */
  names: Record<string, string>;
  /** Build time (ISO), the clock for the server render. */
  now: string;
  /** Opening only. */
  venue?: string;
  eventHref?: string;
}

export default function Tonight({ part, ev, names, now: nowIso, venue = '', eventHref = '' }: Props) {
  const now = useClock(nowIso);
  const { rated, target } = useShared();
  if (!ev.startsAt) return null;

  const items = ev.agenda.map((a, i) => ({ ...a, i, at: itemStart(ev.startsAt!, a.time) }));
  const cur = items.reduce((acc, it) => (it.at.getTime() <= now.getTime() ? it.i : acc), -1);
  const last = items[items.length - 1];
  const beforeDoors = cur < 0;
  const wrapped = !beforeDoors && ((cur >= items.length - 1 && last?.title.toLowerCase() === 'close') || (!!ev.endsAt && now.getTime() >= Date.parse(ev.endsAt)));
  const nowItem = beforeDoors || wrapped ? null : items[cur];
  const nextItem = items[cur + 1];
  const who = (it: { talk?: { speakerIds: string[] }; note?: string }) => (it.talk ? it.talk.speakerIds.map((id) => names[id] ?? id).join(', ') : (it.note ?? ''));
  const keyOf = (i: number) => ev.agenda[i]?.talk?.id ?? `talk-${i}`;
  const toTarget = (i: number): RateTarget => ({ key: keyOf(i), title: ev.agenda[i]!.title, sub: `${who(ev.agenda[i]!)} · ${ev.agenda[i]!.time}` });
  const started = items.filter((it) => it.talk && (wrapped || it.i <= cur));
  const lastTalk = started[started.length - 1];
  const feedbackHref = `/feedback?event=${ev.slug}`;

  if (part === 'opening') {
    const rateTalk = !!lastTalk && !rated[keyOf(lastTalk.i)];
    return (
      <div class="flex flex-col gap-5 pt-1">
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 max-w-[880px]" aria-live="polite">
          <div class="rounded-card bg-ink text-white py-5 px-[22px] flex flex-col gap-1.5">
            <div class="text-[15px] font-bold text-yellow">
              {beforeDoors ? `Doors open at ${items[0]?.time ?? '18:30'}` : wrapped ? 'That’s a wrap' : `Now · since ${nowItem!.time}`}
            </div>
            <div class="text-[22px] leading-tight font-bold text-pretty">{beforeDoors ? 'Find the venue' : wrapped ? 'Thanks for coming tonight' : nowItem!.title}</div>
            <div class="text-[16px] text-grey-light">{beforeDoors ? venue : wrapped ? 'Rate the talks while they are fresh.' : who(nowItem!)}</div>
          </div>
          {!wrapped && nextItem && (
            <div class="rounded-card py-5 px-[22px] flex flex-col gap-1.5 shadow-[inset_0_0_0_2px_#19191B]">
              <div class="text-[15px] font-bold text-grey-mid">Next · {nextItem.time}</div>
              <div class="text-[20px] leading-tight font-bold text-pretty">{nextItem.title}</div>
              <div class="text-[16px] text-grey-mid">{who(nextItem)}</div>
            </div>
          )}
        </div>
        <div class="flex flex-wrap gap-3">
          {rateTalk ? (
            <Button variant="yellow" grow onClick={() => setShared({ target: toTarget(lastTalk!.i) })}>
              Rate this talk
            </Button>
          ) : (
            <Button href={feedbackHref} variant="yellow" grow>
              Rate the evening
            </Button>
          )}
          <Button href={eventHref} variant="outline-white" grow>
            Event details
          </Button>
        </div>
      </div>
    );
  }

  const pending = started.filter((t) => !rated[keyOf(t.i)] && keyOf(t.i) !== target?.key).map((t) => toTarget(t.i));
  return (
    <div class="flex flex-col gap-2">
      {items.map((r) => {
        const isNow = r.i === cur && !wrapped;
        const done = r.i < cur || wrapped;
        const canRate = !!r.talk && (r.i <= cur || wrapped);
        const k = keyOf(r.i);
        return (
          <div
            key={r.i}
            aria-current={isNow ? 'time' : undefined}
            class={cx(
              'grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 md:gap-[18px] items-center py-4 px-[18px] rounded-[20px]',
              isNow ? 'bg-yellow' : done ? 'bg-white' : 'bg-grey-soft',
            )}
          >
            <div class="flex flex-col gap-1 items-start">
              <span class={cx('text-[18px] font-bold', done && 'text-grey-text')}>{r.time}</span>
              {isNow && <span class="text-[13px] font-bold py-0.5 px-2.5 rounded-pill bg-black text-yellow">Now</span>}
            </div>
            <div class="flex flex-col gap-[3px] min-w-0">
              <span class={cx('font-bold leading-[1.3] text-pretty', r.talk ? 'text-[19px]' : 'text-[17px]', done && 'text-grey-text')}>{r.title}</span>
              {(r.talk || r.note) && <span class={cx('text-[16px]', done ? 'text-grey-text' : 'text-ink-2')}>{who(r)}</span>}
            </div>
            {canRate && (
              <Button
                variant={rated[k] ? 'grey' : 'white'}
                size="sm"
                class="justify-self-start md:justify-self-end col-span-full md:col-auto border-black!"
                onClick={() => setShared({ target: toTarget(r.i) })}
              >
                {rated[k] ? (
                  <>
                    Rated <Check />
                  </>
                ) : (
                  'Rate this talk'
                )}
              </Button>
            )}
          </div>
        );
      })}
      <RatingSheet
        onSubmit={submitRating}
        eventId={ev.id}
        target={target}
        pending={pending}
        onRated={(key, n) => setShared({ rated: { ...shared.rated, [key]: n } })}
        onNext={(t) => setShared({ target: t })}
        onClose={() => setShared({ target: null })}
      />
    </div>
  );
}
