import { buildIcs, presentEvent, type Event, type EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { ticketing } from '~/lib/ticketing';
import { Button } from '../ui/Button';
import { useEventState } from '../useEventState';

interface Props {
  ev: Event;
  initial: EventState;
  url: string;
}

/** Actions in the event opening: primary action for the current state, add to calendar, share. */
export default function EventActions({ ev, initial, url }: Props) {
  const state = useEventState(ev, initial);
  const p = presentEvent(ev, { override: state, ticketing });
  const [copied, setCopied] = useState(false);

  const copy = (text: string) =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  const share = async () => {
    track('share_click', { eventId: ev.id });
    const data = { title: `ZurichJS: ${ev.title}`, text: `${p.dateLineShort} · ${p.venueShort}`, url: `${url}?utm_source=share` };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* dismissed */
      }
    } else copy(data.url);
  };
  const addToCalendar = () => {
    const ics = buildIcs(ev, url);
    if (!ics) return;
    track('ics_download', { eventId: ev.id });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `zurichjs-${ev.slug}.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const handoff = p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist';

  return (
    <div class="flex flex-col gap-[18px]">
      <div class="flex flex-wrap gap-3 items-center">
        {p.cta.kind === 'feedback' ? (
          <>
            <Button href="#programme" variant="yellow">
              Rate the talks
            </Button>
            <Button href={`/feedback?event=${ev.slug}`} variant="outline-white">
              Feedback on the evening
            </Button>
          </>
        ) : (
          p.cta.href && (
            <Button href={p.cta.href} variant="yellow" external={p.cta.external} onClick={handoff ? () => track('rsvp_handoff_click', { eventId: ev.id }) : undefined}>
              {p.cta.label}
            </Button>
          )
        )}
        {p.dateKnown && state !== 'past' && state !== 'cancelled' && (
          <Button variant="outline-white" class="text-[17px] px-5" onClick={addToCalendar}>
            Add to calendar
          </Button>
        )}
        <Button variant="outline-white" class="text-[17px] px-5" onClick={share}>
          {copied ? 'Link copied' : 'Share'}
        </Button>
      </div>
      {state === 'past' && initial !== 'past' ? (
        <div class="text-[15px] text-grey-mid">This meetup has taken place. Reload the page for the recap.</div>
      ) : (
        p.ctaNote && <div class="text-[15px] text-grey-mid">{p.ctaNote}</div>
      )}
    </div>
  );
}
