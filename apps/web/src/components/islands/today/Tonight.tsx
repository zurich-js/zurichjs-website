import {
  dateLong,
  directionsUrl,
  itemMinutes,
  itemStartsAt,
  talkFormatLine,
  scheduleFacts,
  timesLine,
  todayPhase,
  untimedNote,
  venueAddress,
  type Event,
  type TodayPhase,
} from '@zurichjs/events';
import { submitRating } from '~/lib/rating';
import { useEffect, useState } from 'preact/hooks';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { RatingSheet, type RateTarget } from '@zurichjs/design/islands/RatingSheet';
import { Check } from '@zurichjs/design/islands/Check';
import { RichText } from '~/components/RichText';

/**
 * The Tonight page (/today). Several islands from this one module share a
 * tiny store and the clock:
 *   part="opening"   heading, now / next cards and actions, on black
 *   part="programme" the running order with a "Now" marker and per-talk rating
 *   part="feedback"  "How was tonight?", only from the start until feedback closes
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
  /** Speaker id → what the programme shows of them: role and a small photo (avatar URL). */
  people?: Record<string, { name: string; role?: string; avatar?: string; initials: string }>;
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

export default function Tonight({ part, ev, names = {}, people = {}, now: nowIso }: Props) {
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
            {phase === 'live' ? 'How is today’s meetup going?' : `How was ${ev.title}?`}
          </h2>
          <p class="m-0 text-[18px] leading-[1.55]">
            {ev.agenda.some((a) => a.talk)
              ? 'Rate the talks in the programme above: each speaker reads the ratings and comments for their own talk. For the evening as a whole, answer a few open questions for the organisers.'
              : 'Tell the organisers how the evening went in a few open questions. Only the organisers read your answers.'}
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

  const note = untimedNote(ev, phase === 'upcoming' ? 'future' : 'now');
  const anyTime = items.some((it) => it.time);
  const minutes = itemMinutes(ev.agenda);

  return (
    <div class="flex flex-col gap-2">
      {note && <p class="m-0 mb-2 text-[16px] text-ink-2">{note}</p>}
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
                'grid gap-x-3.5 gap-y-2.5 md:gap-[18px] items-start py-4 px-[18px] rounded-[20px]',
                anyTime ? 'grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto]',
                isNow ? 'bg-yellow' : done ? 'bg-white' : 'bg-grey-soft',
              )}
            >
              {anyTime && (
                <div class="flex flex-col gap-1 items-start">
                  {r.time && (
                    <time class={cx('px-2.5 py-1 rounded-lg text-[15px] font-bold tabular-nums leading-none', done ? 'bg-grey text-grey-text' : 'bg-black text-yellow')}>
                      {r.time}
                    </time>
                  )}
                  {isNow && <span class="text-[13px] font-bold py-0.5 px-2.5 rounded-pill bg-black text-yellow">Now</span>}
                </div>
              )}
              <div class="flex flex-col gap-2 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  {r.talk ? (
                    <span class="text-[14px] font-bold text-ink-2">{talkFormatLine(r.talk)}</span>
                  ) : (
                    minutes[r.i] && <span class="text-[14px] font-bold text-ink-2 tabular-nums">{minutes[r.i]} min</span>
                  )}
                </div>
                <span class={cx('font-bold leading-[1.3] text-pretty', r.talk ? 'text-[20px]' : 'text-[17px]', done && 'text-grey-text')}>{r.title}</span>
                {r.talk ? (
                  <>
                    {r.talk.description && (
                      <RichText
                        text={r.talk.description}
                        clampLines={3}
                        moreLabels={['See more ↓', 'See less ↑']}
                        moreClass="p-0 bg-transparent border-0 text-[14px] font-bold text-grey-text hover:text-black cursor-pointer"
                        class="text-[16px] leading-[1.55] text-ink-2 max-w-[720px]"
                      />
                    )}
                    {r.talk.speakerIds.length > 0 && (
                      // Equal-width speaker cards, whatever the length of the name or role.
                      <ul class="m-0 p-0 list-none grid grid-cols-[repeat(auto-fill,minmax(min(100%,250px),1fr))] gap-2 max-w-[780px]" aria-label={`Speakers: ${r.title}`}>
                        {r.talk.speakerIds.map((id) => {
                          const p = people[id];
                          return (
                            <li key={id}>
                              <a
                                href={`/speakers/${id}`}
                                class="flex w-full h-full items-center gap-2.5 py-1.5 pl-1.5 pr-4 rounded-pill bg-white text-black no-underline hover:bg-grey-hover"
                              >
                                {p?.avatar ? (
                                  <img src={p.avatar} alt="" width={36} height={36} loading="lazy" decoding="async" class="w-9 h-9 rounded-full object-cover bg-grey flex-none" />
                                ) : (
                                  <span aria-hidden="true" class="w-9 h-9 rounded-full bg-grey flex items-center justify-center text-[13px] font-bold flex-none">
                                    {p?.initials ?? '?'}
                                  </span>
                                )}
                                <span class="flex flex-col leading-tight min-w-0">
                                  <span class="text-[15px] font-bold truncate">{p?.name ?? names[id] ?? id}</span>
                                  {p?.role && <span class="text-[13px] text-ink-2 truncate">{p.role}</span>}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  r.note && <span class={cx('text-[16px]', done ? 'text-grey-text' : 'text-ink-2')}>{who(r)}</span>
                )}
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
          <Button href="/cfp" variant="yellow" grow>
            Propose a talk
          </Button>
          <Button href="/events?tab=past" variant="outline-white" grow>
            Past meetups
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
  const { doors, starts } = scheduleFacts(ev);
  const lastTalk = items.filter((it) => it.talk && (phase === 'after' || it.i <= cur)).pop();
  const unratedLast = !!lastTalk && !Object.keys(rated).some((k) => k.startsWith(`${lastTalk.talk!.id ?? lastTalk.title}:`));

  return (
    <div class="flex flex-col gap-[18px]">
      <div class="text-[16px] font-bold text-yellow">{phase === 'after' ? 'Thanks for coming' : 'Today'}</div>
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
                : starts
                  ? `Starts at ${starts}`
                  : 'Arriving'
              : phase === 'after'
                ? 'That’s a wrap'
                : nowItem
                  ? `Now${nowItem.time ? ` · since ${nowItem.time}` : ''}`
                  : starts
                    ? `Started at ${starts}`
                    : 'Under way'}
          </div>
          <div class="text-[22px] leading-tight font-bold text-pretty">
            {phase === 'today' ? 'Find the venue' : phase === 'after' ? 'Thanks for coming' : nowItem ? nowItem.title : 'Find a seat'}
          </div>
          <div class="text-[16px] text-grey-light">
            {phase === 'today'
              ? findVenue
              : phase === 'after'
                ? ev.agenda.some((a) => a.talk)
                  ? 'Rate the talks while they are fresh.'
                  : 'Tell us how the evening went.'
                : nowItem
                  ? who(nowItem)
                  : findVenue}
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
