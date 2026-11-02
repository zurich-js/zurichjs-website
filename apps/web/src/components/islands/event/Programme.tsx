import { feedbackAvailability, talkAnchor, talkFormatLine, untimedNote, type AgendaItem, type Event, type EventState, type ProgrammeMoment } from '@zurichjs/events';
import { submitRating } from '~/lib/rating';
import { useEffect, useState } from 'preact/hooks';
import { cx, monogramClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { RatingSheet, type RateTarget } from '@zurichjs/design/islands/RatingSheet';
import { useEventState } from '../useEventState.ts';
import { Check } from '@zurichjs/design/islands/Check';
import { feedbackRequested } from './feedbackMode.ts';

export interface ProgrammeSpeaker {
  id: string;
  name: string;
  role: string;
  initials: string;
}

const KIND_LABEL: Partial<Record<AgendaItem['kind'], string>> = { doors: 'Doors', intro: 'Welcome', break: 'Break', networking: 'Networking', close: 'Close' };

/**
 * The whole evening in running order: doors, welcome, every talk with its
 * own time, breaks and networking. Server-rendered in full for search
 * engines. Each talk has a stable #talk-… anchor.
 *
 * Times come only from the agenda. Without them the talks are listed in
 * order under one note, with no per-talk placeholder.
 *
 * Ratings: one per speaker per talk (a talk with two speakers gets two),
 * offered during the 48-hour feedback window, and afterwards when the page
 * is opened with the legacy `?feedback=true` link. Before the start the
 * link opens nothing here: FeedbackGate explains when feedback opens. A
 * draft preview build (`preview`) opens the ratings early for organisers.
 */
export default function Programme({
  ev,
  initial,
  speakers,
  summaries = {},
  heading = 'Programme',
  preview = false,
}: {
  ev: Event;
  initial: EventState;
  speakers: ProgrammeSpeaker[];
  /** Recap summaries by talk title, shown under each talk after the event. */
  summaries?: Record<string, string>;
  heading?: string;
  /** Draft preview build: `?feedback=true` opens the ratings on any date, so organisers can check them. */
  preview?: boolean;
}) {
  const state = useEventState(ev, initial);
  const [requested, setRequested] = useState(false);
  useEffect(() => setRequested(feedbackRequested(location)), []);
  const forced = requested && (preview || feedbackAvailability(ev, state).open);
  useEffect(() => {
    if (forced) requestAnimationFrame(() => document.getElementById('programme')?.scrollIntoView());
  }, [forced]);
  const rating = state === 'live' || forced;
  const [rated, setRated] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<RateTarget | null>(null);
  const byId = new Map(speakers.map((s) => [s.id, s]));

  const targets: RateTarget[] = ev.agenda.flatMap((a) => {
    if (!a.talk) return [];
    const talkId = a.talk.id;
    const ids = a.talk.speakerIds.length ? a.talk.speakerIds : [''];
    return ids.map((sid) => ({
      key: `${talkId ?? a.title}:${sid}`,
      title: a.talk!.title,
      sub: [byId.get(sid)?.name, a.time].filter(Boolean).join(' · '),
      talkId,
      speakerId: sid || undefined,
    }));
  });
  const pending = targets.filter((t) => !rated[t.key] && t.key !== target?.key);
  const moment: ProgrammeMoment = state === 'past' ? 'past' : state === 'live' ? 'now' : 'future';
  const note = untimedNote(ev, moment);
  // Without any time the programme is a plain ordered list: no empty time column.
  const anyTime = ev.agenda.some((a) => a.time);

  return (
    <section id="programme" aria-labelledby="h-programme" class="flex flex-col gap-6 scroll-mt-6">
      <div class="flex flex-col gap-1.5">
        <h2 id="h-programme" class="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">
          {heading}
        </h2>
        {note && <p class="m-0 text-[16px] text-ink-2">{note}</p>}
      </div>
      {forced && state !== 'live' && (
        <div id="feedback" class="bg-yellow rounded-card p-5 flex flex-col gap-2 scroll-mt-6">
          <h3 class="m-0 text-[20px] font-bold">Feedback for {ev.title}</h3>
          <p class="m-0 text-[17px] leading-normal">
            Rate each talk below. Each speaker reads the ratings and comments for their own talk, and the organisers read everything. Nothing is published.
          </p>
          <a href={`/feedback?event=${ev.slug}`} class="self-start font-bold underline underline-offset-[3px] text-[17px]">
            Tell us about the evening as a whole
          </a>
        </div>
      )}
      <ol class="m-0 p-0 list-none flex flex-col gap-6">
        {ev.agenda.map((a, i) => {
          const anchor = a.talk ? talkAnchor(a.talk) : undefined;
          const summary = a.talk ? summaries[a.talk.title] : undefined;
          return (
            <li key={i} id={anchor} class={cx('grid gap-[18px] scroll-mt-24', anyTime ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)]')}>
              {anyTime && <div class="text-[18px] font-bold pt-px tabular-nums">{a.time && <time>{a.time}</time>}</div>}
              <div class="flex flex-col gap-2 min-w-0">
                {!a.talk && KIND_LABEL[a.kind] && !a.title.toLowerCase().includes(KIND_LABEL[a.kind]!.toLowerCase()) && (
                  <div class="text-[15px] text-ink-2">{KIND_LABEL[a.kind]}</div>
                )}
                <h3 class={cx('m-0 font-bold leading-[1.3] text-pretty', a.talk ? 'text-[22px]' : 'text-[19px]')}>
                  {anchor ? (
                    <a href={`#${anchor}`} class="no-underline hover:underline">
                      {a.title}
                    </a>
                  ) : (
                    a.title
                  )}
                </h3>
                {a.talk && (
                  <div class="flex flex-col gap-2.5">
                    <div class="flex flex-wrap gap-x-[18px] gap-y-2">
                      {a.talk.speakerIds.map((id) => {
                        const s = byId.get(id);
                        if (!s) return null;
                        return (
                          <a key={id} href={`/speakers/${id}`} class="no-underline flex items-center gap-2.5 text-[17px] font-bold text-left">
                            <span aria-hidden="true" class={monogramClass('grey', 'avatar', 'w-9 h-9 flex-none text-[13px]')}>
                              {s.initials}
                            </span>
                            <span>
                              <span class="underline underline-offset-[3px]">{s.name}</span> <span class="font-normal text-ink-2">{s.role}</span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                    {summary && <p class="m-0 text-[17px] leading-[1.55] max-w-[640px]">{summary}</p>}
                    {a.talk.description && <p class="m-0 text-[17px] leading-[1.55] text-ink-2 max-w-[640px]">{a.talk.description}</p>}
                    <div class="text-[15px] text-ink-2">{[talkFormatLine(a.talk), a.talk.level, a.talk.language ?? 'English'].filter(Boolean).join(' · ')}</div>
                    {!!a.talk.tags?.length && (
                      <ul class="m-0 p-0 list-none flex flex-wrap gap-1.5" aria-label="Topics">
                        {a.talk.tags.map((t) => (
                          <li key={t} class="text-[14px] px-2.5 py-0.5 rounded-pill bg-grey">
                            {t}
                          </li>
                        ))}
                      </ul>
                    )}
                    {a.talk.slidesUrl && (
                      <a href={a.talk.slidesUrl} class="self-start text-[16px] font-bold underline underline-offset-[3px]" target="_blank" rel="noopener">
                        Slides (opens in a new tab)
                      </a>
                    )}
                    {rating && (
                      <div class="flex flex-wrap gap-2 mt-1">
                        {targets
                          .filter((t) => t.talkId === a.talk!.id && t.title === a.talk!.title)
                          .map((t) => {
                            const who = t.speakerId ? byId.get(t.speakerId)?.name : undefined;
                            const many = a.talk!.speakerIds.length > 1;
                            return (
                              <Button key={t.key} variant={rated[t.key] ? 'grey' : 'yellow'} size="sm" class="border-black!" onClick={() => setTarget(t)}>
                                {rated[t.key] ? (
                                  <>
                                    Rated{many && who ? ` ${who}` : ''} <Check /> · change
                                  </>
                                ) : many && who ? (
                                  `Rate ${who}`
                                ) : (
                                  'Rate this talk'
                                )}
                              </Button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
                {a.note && <p class="m-0 text-[17px] text-ink-2">{a.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      <RatingSheet
        onSubmit={submitRating}
        eventId={ev.id}
        target={target}
        pending={pending}
        onRated={(k, n) => setRated((r) => ({ ...r, [k]: n }))}
        onNext={setTarget}
        onClose={() => setTarget(null)}
      />
    </section>
  );
}
