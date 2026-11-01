import { dateLong, directionsUrl, itemStartsAt, timesLine, todayPhase, venueAddress, type Event, type TodayPhase } from '@zurichjs/events';
import { submitRating } from '~/lib/rating';
import { useEffect, useState } from 'preact/hooks';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { RatingSheet, type RateTarget } from '@zurichjs/design/islands/RatingSheet';
import { Check } from '@zurichjs/design/islands/Check';

/**
 * The Tonight page (/today). Several islands from this one module share a
 * tiny store and the clock:
 *   part="opening"   heading, now / next cards and actions, on black
 *   part="programme" the running order with a "Now" marker and per-talk rating
 *   part="feedback"  "How was tonight?", only from doors until feedback closes
 * They server-render as of the build, then follow the browser clock every
 * minute, so the wording is right on the day even without a rebuild.
 * In development, `?at=2026-11-18T19:40` previews a moment.
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

interface Props {
  part: 'opening' | 'programme' | 'feedback';
  /** The meetup the page is about (picked at build time), or undefined when nothing is planned. */
  ev?: Event;
  /** Speaker id → name. */
  names?: Record<string, string>;
  /** Build time (ISO), the clock for the server render. */
  now: string;
}

/** One rating per speaker per talk. */
function targetsFor(ev: Event, names: Record<string, string>, items: { i: number }[]): RateTarget[] {
  return items.flatMap(({ i }) => {
    const a = ev.agenda[i]!;
    if (!a.talk) return [];
    const ids = a.talk.speakerIds.length ? a.talk.speakerIds : [''];
    return ids.map((sid) => ({
      key: `${a.talk!.id ?? a.title}:${sid}`,
      title: a.talk!.title,
      sub: [names[sid], a.time].filter(Boolean).join(' · '),
      talkId: a.talk!.id,
      speakerId: sid || undefined,
    }));
  });
}

export default function Tonight({ part, ev, names = {}, now: nowIso }: Props) {
  const now = useClock(nowIso);
  const { rated, target } = useShared();
  const phase: TodayPhase = todayPhase(ev, now);

  if (part === 'feedback') {
    if (!ev || (phase !== 'live' && phase !== 'after')) return null;
    return (
      <section
        aria-labelledby="h-rate"
        class="mx-gut bg-yellow rounded-block p-[clamp(24px,3.6vw,48px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-10 gap-y-5 items-center"
      >
        <div class="flex flex-col gap-2.5">
          <h2 id="h-rate" class="m-0 text-[clamp(26px,2.8vw,38px)] leading-[1.15] font-bold">
            {phase === 'live' ? 'How is tonight going?' : `How was ${ev.title}?`}
          </h2>
          <p class="m-0 text-[18px] leading-[1.55]">
            Rate the talks in the programme above: each speaker reads the ratings and comments for their own talk. For the evening as a whole, answer a few open questions for the
            organisers.
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5 justify-end">
          <Button href={`/feedback?event=${ev.slug}`} variant="black" grow>
            Feedback on the evening
          </Button>
        </div>
      </section>
    );
  }

  if (part === 'opening') return <Opening ev={ev} phase={phase} now={now} names={names} rated={rated} />;

  if (!ev) return null;
  const items = ev.agenda.map((a, i) => ({ ...a, i, at: itemStartsAt(ev, a) }));
  const t = now.getTime();
  const evening = phase === 'live' || phase === 'after';
  const cur = phase === 'live' ? items.reduce((acc, it) => (it.at && it.at.getTime() <= t ? it.i : acc), -1) : phase === 'after' ? items.length : -1;
  const started = items.filter((it) => it.talk && (phase === 'after' || (phase === 'live' && (!it.at || it.i <= cur))));
  const all = targetsFor(ev, names, started);
  const pending = all.filter((x) => !rated[x.key] && x.key !== target?.key);
  const who = (it: { talk?: { speakerIds: string[] }; note?: string }) => (it.talk ? it.talk.speakerIds.map((id) => names[id] ?? id).join(', ') : (it.note ?? ''));

  return (
    <div class="flex flex-col gap-2">
      {!items.some((it) => it.talk && it.time) && items.some((it) => it.talk) && (
        <p class="m-0 mb-2 text-[16px] text-ink-2">Talks in running order. Exact talk times follow closer to the day.</p>
      )}
      <ol class="m-0 p-0 list-none flex flex-col gap-2">
        {items.map((r) => {
          const isNow = phase === 'live' && r.i === cur;
          const done = phase === 'after' || (phase === 'live' && r.i < cur);
          const canRate = evening && !!r.talk && started.some((s) => s.i === r.i);
          const mine = canRate ? all.filter((x) => x.talkId === r.talk!.id && x.title === r.talk!.title) : [];
          return (
            <li
              key={r.i}
              aria-current={isNow ? 'time' : undefined}
              class={cx(
                'grid grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2.5 md:gap-[18px] items-center py-4 px-[18px] rounded-[20px]',
                isNow ? 'bg-yellow' : done ? 'bg-white' : 'bg-grey-soft',
              )}
            >
              <div class="flex flex-col gap-1 items-start">
                <span class={cx('text-[18px] font-bold tabular-nums', done && 'text-grey-text')}>{r.time || <span class="sr-only">Time not fixed yet</span>}</span>
                {isNow && <span class="text-[13px] font-bold py-0.5 px-2.5 rounded-pill bg-black text-yellow">Now</span>}
              </div>
              <div class="flex flex-col gap-[3px] min-w-0">
                <span class={cx('font-bold leading-[1.3] text-pretty', r.talk ? 'text-[19px]' : 'text-[17px]', done && 'text-grey-text')}>{r.title}</span>
                {(r.talk || r.note) && <span class={cx('text-[16px]', done ? 'text-grey-text' : 'text-ink-2')}>{who(r)}</span>}
              </div>
              {mine.length > 0 && (
                <div class="flex flex-wrap gap-2 justify-self-start md:justify-self-end col-span-full md:col-auto">
                  {mine.map((x) => {
                    const many = mine.length > 1;
                    const name = x.speakerId ? names[x.speakerId] : undefined;
                    return (
                      <Button key={x.key} variant={rated[x.key] ? 'grey' : 'white'} size="sm" class="border-black!" onClick={() => setShared({ target: x })}>
                        {rated[x.key] ? (
                          <>
                            Rated{many && name ? ` ${name}` : ''} <Check />
                          </>
                        ) : many && name ? (
                          `Rate ${name}`
                        ) : (
                          'Rate this talk'
                        )}
                      </Button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <RatingSheet
        onSubmit={submitRating}
        eventId={ev.id}
        target={target}
        pending={pending}
        onRated={(key, n) => setShared({ rated: { ...shared.rated, [key]: n } })}
        onNext={(x) => setShared({ target: x })}
        onClose={() => setShared({ target: null })}
      />
    </div>
  );
}

function Opening({ ev, phase, now, names, rated }: { ev?: Event; phase: TodayPhase; now: Date; names: Record<string, string>; rated: Record<string, number> }) {
  const h1 = 'm-0 text-[clamp(36px,5.4vw,72px)] leading-[1.08] font-bold max-w-[1000px] text-balance';
  const sub = 'm-0 text-[clamp(18px,1.6vw,21px)] leading-normal max-w-[700px] text-pretty';

  if (!ev || phase === 'none') {
    return (
      <div class="flex flex-col gap-[18px]">
        <h1 class={h1}>No meetup on the calendar right now</h1>
        <p class={sub}>The next one is being planned and is announced on Meetup first. Meanwhile, look back at past meetups, propose a talk or offer to host one.</p>
        <div class="flex flex-wrap gap-3 pt-1">
          <Button href="/events?tab=past" variant="yellow" grow>
            Past meetups
          </Button>
          <Button href="/cfp" variant="outline-white" grow>
            Propose a talk
          </Button>
          <Button href="/partners" variant="outline-white" grow>
            Host a meetup
          </Button>
        </div>
      </div>
    );
  }

  const href = `/events/${ev.slug}`;
  const date = dateLong(ev.startsAt!);
  const times = timesLine(ev);
  const where = ev.venue ? `${ev.venue.name}, ${venueAddress(ev.venue)}` : 'Venue to be confirmed';
  const findVenue = ev.venue ? (
    <a href="#venue" class="text-white underline underline-offset-[3px]">
      {where}
    </a>
  ) : (
    where
  );

  if (phase === 'upcoming') {
    return (
      <div class="flex flex-col gap-[18px]">
        <div class="text-[16px] font-bold text-yellow">Next meetup</div>
        <h1 class={h1}>{ev.title}</h1>
        <p class={sub}>
          <b class="text-yellow">{date}</b>
          {times && <> · {times}</>}
          <br />
          <span class="text-grey-light">{findVenue}</span>
        </p>
        <p class="m-0 text-[17px] text-grey-light max-w-[700px]">This page becomes the evening’s guide on the day: arrival, the running order and talk ratings.</p>
        <div class="flex flex-wrap gap-3 pt-1">
          <Button href={href} variant="yellow" grow>
            Event details and RSVP
          </Button>
          {ev.venue && (
            <Button href={directionsUrl(ev.venue)} variant="outline-white" grow external>
              Directions
            </Button>
          )}
        </div>
      </div>
    );
  }

  const items = ev.agenda.map((a, i) => ({ ...a, i, at: itemStartsAt(ev, a) }));
  const t = now.getTime();
  const cur = phase === 'live' ? items.reduce((acc, it) => (it.at && it.at.getTime() <= t ? it.i : acc), -1) : -1;
  const nowItem = cur >= 0 ? items[cur] : undefined;
  const nextItem = phase === 'live' ? items.slice(cur + 1).find((it) => it.at) : items.find((it) => it.kind !== 'doors' && it.at);
  const who = (it: { talk?: { speakerIds: string[] }; note?: string }) => (it.talk ? it.talk.speakerIds.map((id) => names[id] ?? id).join(', ') : (it.note ?? ''));
  const doors = timesLine(ev).match(/Doors (\d{2}:\d{2})/)?.[1];
  const lastTalk = items.filter((it) => it.talk && (phase === 'after' || it.i <= cur)).pop();
  const unratedLast = !!lastTalk && !Object.keys(rated).some((k) => k.startsWith(`${lastTalk.talk!.id ?? lastTalk.title}:`));

  return (
    <div class="flex flex-col gap-[18px]">
      <div class="text-[16px] font-bold text-yellow">{phase === 'after' ? 'Thanks for coming' : 'Tonight'}</div>
      <h1 class={h1}>{ev.title}</h1>
      <p class={sub}>
        <b class="text-yellow">{date}</b>
        {times && <> · {times}</>}
      </p>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-3 max-w-[880px]" aria-live="polite">
        <div class="rounded-card bg-ink text-white py-5 px-[22px] flex flex-col gap-1.5">
          <div class="text-[15px] font-bold text-yellow">
            {phase === 'today'
              ? doors
                ? `Doors open at ${doors}`
                : 'Arriving'
              : phase === 'after'
                ? 'That’s a wrap'
                : nowItem
                  ? `Now${nowItem.time ? ` · since ${nowItem.time}` : ''}`
                  : 'Doors are open'}
          </div>
          <div class="text-[22px] leading-tight font-bold text-pretty">
            {phase === 'today' ? 'Find the venue' : phase === 'after' ? 'Thanks for coming' : nowItem ? nowItem.title : 'Find a seat'}
          </div>
          <div class="text-[16px] text-grey-light">
            {phase === 'today' ? findVenue : phase === 'after' ? 'Rate the talks while they are fresh.' : nowItem ? who(nowItem) : findVenue}
          </div>
          {phase === 'today' && ev.venue && (
            <a href={directionsUrl(ev.venue)} target="_blank" rel="noopener" class="text-[16px] font-bold text-yellow underline underline-offset-[3px] mt-1 self-start">
              Get directions (opens Google Maps)
            </a>
          )}
        </div>
        {phase !== 'after' && nextItem && (
          <div class="rounded-card py-5 px-[22px] flex flex-col gap-1.5 shadow-[inset_0_0_0_2px_#19191B]">
            <div class="text-[15px] font-bold text-grey-mid">
              {phase === 'today' ? 'First up' : 'Next'}
              {nextItem.time ? ` · ${nextItem.time}` : ''}
            </div>
            <div class="text-[20px] leading-tight font-bold text-pretty">{nextItem.title}</div>
            <div class="text-[16px] text-grey-mid">{who(nextItem)}</div>
          </div>
        )}
      </div>
      <div class="flex flex-wrap gap-3">
        {phase === 'today' ? (
          <Button href="#venue" variant="yellow" grow>
            Venue and arrival
          </Button>
        ) : unratedLast ? (
          <Button href="#programme" variant="yellow" grow>
            Rate the talks
          </Button>
        ) : (
          <Button href={`/feedback?event=${ev.slug}`} variant="yellow" grow>
            Feedback on the evening
          </Button>
        )}
        <Button href={href} variant="outline-white" grow>
          Event details
        </Button>
      </div>
    </div>
  );
}
