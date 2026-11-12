import {
  dateLong,
  directionsUrl,
  itemMinutes,
  itemStartsAt,
  talkFormatLine,
  timesLine,
  todayPhase,
  untimedNote,
  venueAddress,
  type Event,
  type TodayPhase,
} from '@zurichjs/events';
import { submitRating } from '~/lib/rating';
import { useEffect, useState } from 'preact/hooks';
import { cx, tagClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { RatingSheet, type RateTarget } from '@zurichjs/design/islands/RatingSheet';
import { Check } from '@zurichjs/design/islands/Check';
import { RichText } from '~/components/RichText';

/**
 * The Tonight page (/today). Several islands from this one module share a
 * tiny store and the clock:
 *   part="opening"   heading, date, venue and actions, on black
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
      <section aria-labelledby="h-rate" class="mx-gut bg-grey-soft rounded-block p-card-lg grid grid-cols-auto-md gap-x-10 gap-y-5 items-center">
        <div class="flex flex-col gap-2.5">
          <h2 id="h-rate" class="m-0 text-subsection font-bold text-balance">
            {phase === 'live' ? 'How is today’s meetup going?' : `How was ${ev.title}?`}
          </h2>
          <p class="m-0 text-body">
            {ev.agenda.some((a) => a.talk)
              ? 'Rate the talks in the programme above: each speaker reads the ratings and comments for their own talk. For the evening as a whole, answer a few open questions for the organisers.'
              : 'Tell the organisers how the evening went in a few open questions. Only the organisers read your answers.'}
          </p>
        </div>
        <div class="flex flex-wrap gap-2.5 justify-end">
          <Button href={`/feedback?event=${ev.slug}`} grow>
            Feedback on the evening
          </Button>
        </div>
      </section>
    );
  }

  if (part === 'opening') return <Opening ev={ev} phase={phase} now={now} rated={rated} />;

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
      {note && <p class="m-0 mb-2 text-compact text-ink-2">{note}</p>}
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
                'grid gap-x-3.5 gap-y-2.5 md:gap-4 items-start p-card-sm rounded-card',
                anyTime ? 'grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[72px_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_auto]',
                isNow ? 'bg-white outline-2 outline-black' : done ? 'bg-white' : 'bg-grey-soft',
              )}
            >
              {anyTime && (
                <div class="flex flex-col gap-1 items-start">
                  {r.time && <time class={tagClass('sm', done ? 'grey' : 'black', 'tabular-nums font-bold')}>{r.time}</time>}
                  {isNow && <span class={tagClass('sm', 'black')}>Now</span>}
                </div>
              )}
              <div class="flex flex-col gap-2 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  {r.talk ? (
                    <span class="text-meta font-bold text-ink-2">{talkFormatLine(r.talk)}</span>
                  ) : (
                    minutes[r.i] && <span class="text-meta font-bold text-ink-2 tabular-nums">{minutes[r.i]} min</span>
                  )}
                </div>
                <span class={cx('font-bold text-pretty', r.talk ? 'text-card-title' : 'text-body', done && 'text-grey-text')}>{r.title}</span>
                {r.talk ? (
                  <>
                    {r.talk.description && (
                      <RichText
                        text={r.talk.description}
                        clampLines={3}
                        moreLabels={['See more ↓', 'See less ↑']}
                        moreClass="p-0 bg-transparent border-0 text-meta font-bold text-grey-text hover:text-black cursor-pointer"
                        class="text-compact text-ink-2 max-w-reading"
                      />
                    )}
                    {r.talk.speakerIds.length > 0 && (
                      // Equal-width speaker cards, whatever the length of the name or role.
                      <ul class="m-0 p-0 list-none grid grid-cols-auto-sm gap-2 max-w-reading" aria-label={`Speakers: ${r.title}`}>
                        {r.talk.speakerIds.map((id) => {
                          const p = people[id];
                          return (
                            <li key={id}>
                              <a
                                href={`/speakers/${id}`}
                                class="flex w-full h-full items-center gap-2.5 py-1.5 pl-1.5 pr-4 rounded-pill bg-white text-black no-underline hover:bg-grey-hover"
                              >
                                {p?.avatar ? (
                                  <img src={p.avatar} alt="" width={36} height={36} loading="lazy" decoding="async" class="size-9 rounded-full object-cover bg-grey flex-none" />
                                ) : (
                                  <span aria-hidden="true" class="size-9 rounded-full bg-grey flex items-center justify-center text-meta font-bold flex-none">
                                    {p?.initials ?? '?'}
                                  </span>
                                )}
                                <span class="flex flex-col leading-tight min-w-0">
                                  <span class="text-compact font-bold truncate">{p?.name ?? names[id] ?? id}</span>
                                  {p?.role && <span class="text-meta text-ink-2 truncate">{p.role}</span>}
                                </span>
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  r.note && <span class={cx('text-compact', done ? 'text-grey-text' : 'text-ink-2')}>{who(r)}</span>
                )}
              </div>
              {mine.length > 0 && (
                <div class="flex flex-wrap md:flex-col md:items-end gap-2 justify-self-start md:justify-self-end col-span-full md:col-auto">
                  {mine.map((x) => {
                    const many = mine.length > 1;
                    const name = x.speakerId ? names[x.speakerId] : undefined;
                    return (
                      <Button key={x.key} variant={rated[x.key] ? 'secondary' : 'primary'} onClick={() => setShared({ target: x })}>
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

function Opening({ ev, phase, now, rated }: { ev?: Event; phase: TodayPhase; now: Date; rated: Record<string, number> }) {
  const h1 = 'm-0 text-title font-bold max-w-wide text-balance';
  const sub = 'm-0 min-h-12 text-lead max-w-reading text-pretty';

  if (!ev || phase === 'none') {
    return (
      <div class="flex flex-col gap-4">
        <h1 class={h1}>No meetup on the calendar right now</h1>
        <p class={sub}>The next one is being planned and is announced on Meetup first. Meanwhile, look back at past meetups, propose a talk or offer to host one.</p>
        <div class="flex flex-wrap gap-3 pt-1">
          <Button href="/cfp" variant="cta" grow>
            Propose a talk
          </Button>
          <Button href="/events?tab=past" variant="secondary" inverse grow>
            Past meetups
          </Button>
          <Button href="/partners" variant="secondary" inverse grow>
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

  if (phase === 'upcoming') {
    return (
      <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <h1 class={h1}>{ev.title}</h1>
          <p class={sub}>
            <b>{date}</b>
            {times && <> · {times}</>}
          </p>
          <p class="m-0 text-body text-grey-light max-w-reading">{where}</p>
          <p class="m-0 text-body text-grey-light max-w-reading">This page becomes the evening’s guide on the day: arrival, the running order and talk ratings.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button href={href} variant="cta" grow>
            Event details and RSVP
          </Button>
          {ev.venue && (
            <Button href={directionsUrl(ev.venue)} variant="secondary" inverse grow external>
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
  const lastTalk = items.filter((it) => it.talk && (phase === 'after' || it.i <= cur)).pop();
  const unratedLast = !!lastTalk && !Object.keys(rated).some((k) => k.startsWith(`${lastTalk.talk!.id ?? lastTalk.title}:`));

  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-col gap-3">
        <h1 class={h1}>{ev.title}</h1>
        <p class={sub}>
          <b>{date}</b>
          {times && <> · {times}</>}
        </p>
        <p class="m-0 text-body text-grey-light max-w-reading">{where}</p>
      </div>
      <div class="flex flex-wrap gap-3">
        {phase === 'today' ? (
          <Button href="#venue" variant="cta" grow>
            Venue and arrival
          </Button>
        ) : unratedLast ? (
          <Button href="#programme" variant="cta" grow>
            Rate the talks
          </Button>
        ) : (
          <Button href={`/feedback?event=${ev.slug}`} variant="cta" grow>
            Feedback on the evening
          </Button>
        )}
        <Button href={href} variant="secondary" inverse grow>
          Event details
        </Button>
      </div>
    </div>
  );
}
