import { buildIcs, eventDisplayTitle, presentEvent, type Event, type EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ticketing } from '~/lib/ticketing';
import { Button } from '@zurichjs/design/islands/Button';
import { useEventState } from '../useEventState.ts';

interface Props {
  ev: Event;
  initial: EventState;
  url: string;
}

/** Actions in the event opening: primary action for the current state, add to calendar, share. */
export default function EventActions({ ev, initial, url }: Props) {
  const state = useEventState(ev, initial);
  const p = presentEvent(ev, { override: state, ticketing });
  const [status, setStatus] = useState('');
  const say = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const share = async () => {
    track('share_click', { eventId: ev.id });
    const data = { title: eventDisplayTitle(ev.title), text: `${p.dateLineShort} · ${p.venueShort}`, url: `${url}?utm_source=share` };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return; // dismissed
      }
    }
    if (!navigator.clipboard) return say(`Copy this link: ${url}`);
    navigator.clipboard.writeText(data.url).then(
      () => say('Link copied.'),
      () => say(`Couldn’t copy. The link is ${url}`),
    );
  };
  const addToCalendar = () => {
    const ics = buildIcs(ev, url);
    if (!ics) return;
    track('ics_download', { eventId: ev.id });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = `zurichjs-${ev.slug}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    say('Calendar file downloaded. Open it to add the meetup.');
  };
  const handoff = p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist';

  return (
    <div class="flex flex-col gap-[18px]">
      <div class="flex flex-wrap gap-3 items-center">
        {p.cta.kind === 'feedback' ? (
          ev.agenda.some((a) => a.talk) ? (
            <>
              <Button href="#programme" variant="cta">
                Rate the talks
              </Button>
              <Button href={`/feedback?event=${ev.slug}`} variant="secondary" inverse>
                Feedback on the evening
              </Button>
            </>
          ) : (
            <Button href={`/feedback?event=${ev.slug}`} variant="cta">
              Feedback on the evening
            </Button>
          )
        ) : (
          p.cta.href && (
            <Button href={p.cta.href} variant="cta" external={p.cta.external} onClick={handoff ? () => track('rsvp_handoff_click', { eventId: ev.id }) : undefined}>
              {p.cta.label}
            </Button>
          )
        )}
        {p.dateKnown && state !== 'past' && state !== 'cancelled' && (
          <Button variant="secondary" inverse onClick={addToCalendar}>
            Add to calendar
          </Button>
        )}
        <Button variant="secondary" inverse onClick={share}>
          Share
        </Button>
      </div>
      <div role="status" class="text-compact text-grey-mid empty:hidden">
        {status}
      </div>
      {state === 'past' && initial !== 'past' ? (
        <div class="text-compact text-grey-mid">This meetup has taken place. Reload the page for the recap.</div>
      ) : (
        p.ctaNote && <div class="text-compact text-grey-mid">{p.ctaNote}</div>
      )}
    </div>
  );
}
