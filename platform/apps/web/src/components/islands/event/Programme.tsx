import type { Event, EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { cx, monogramClass } from '~/lib/ui';
import { Button } from '../ui/Button';
import { RatingSheet, type RateTarget } from '../ui/RatingSheet';
import { useEventState } from '../useEventState';

export interface ProgrammeSpeaker {
  id: string;
  name: string;
  role: string;
  initials: string;
}

/**
 * The programme. Server-rendered in full for search engines; during the
 * 48-hour feedback window each talk gets a "Rate this talk" button.
 */
export default function Programme({ ev, initial, speakers }: { ev: Event; initial: EventState; speakers: ProgrammeSpeaker[] }) {
  const state = useEventState(ev, initial);
  const live = state === 'live';
  const [rated, setRated] = useState<Record<string, number>>({});
  const [target, setTarget] = useState<RateTarget | null>(null);
  const byId = new Map(speakers.map((s) => [s.id, s]));
  const keyOf = (i: number) => ev.agenda[i]?.talk?.id ?? `talk-${i}`;
  const toTarget = (i: number): RateTarget => {
    const a = ev.agenda[i]!;
    return { key: keyOf(i), title: a.title, sub: `${(a.talk?.speakerIds ?? []).map((id) => byId.get(id)?.name ?? id).join(', ')} · ${a.time}` };
  };
  const talkIdx = ev.agenda.map((a, i) => (a.talk ? i : -1)).filter((i) => i >= 0);
  const pending = talkIdx.filter((i) => !rated[keyOf(i)] && keyOf(i) !== target?.key).map(toTarget);

  return (
    <section id="programme" class="flex flex-col gap-6 scroll-mt-6">
      <h2 class="m-0 text-[clamp(26px,2.6vw,34px)] font-bold">Programme</h2>
      {ev.agenda.map((a, i) => (
        <div key={i} class="grid grid-cols-[64px_minmax(0,1fr)] gap-[18px]">
          <div class="text-[18px] font-bold pt-px">{a.time}</div>
          <div class="flex flex-col gap-2 min-w-0">
            <h3 class={cx('m-0 font-bold leading-[1.3] text-pretty', a.talk ? 'text-[22px]' : 'text-[19px]')}>{a.title}</h3>
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
                {a.talk.description && <p class="m-0 text-[17px] leading-[1.55] text-ink-2 max-w-[640px]">{a.talk.description}</p>}
                <div class="text-[15px] text-ink-2">
                  {[a.talk.durationMin ? `${a.talk.durationMin} min` : '', a.talk.level, a.talk.language ?? 'English'].filter(Boolean).join(' · ')}
                </div>
                {live && (
                  <Button variant={rated[keyOf(i)] ? 'grey' : 'yellow'} size="sm" class="self-start mt-1 border-black!" onClick={() => setTarget(toTarget(i))}>
                    {rated[keyOf(i)] ? 'Rated ✓ · change' : 'Rate this talk'}
                  </Button>
                )}
              </div>
            )}
            {a.note && <p class="m-0 text-[17px] text-ink-2">{a.note}</p>}
          </div>
        </div>
      ))}
      <RatingSheet eventId={ev.id} target={target} pending={pending} onRated={(k, n) => setRated((r) => ({ ...r, [k]: n }))} onNext={setTarget} onClose={() => setTarget(null)} />
    </section>
  );
}
