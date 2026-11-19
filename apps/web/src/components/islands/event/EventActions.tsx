import { calendarLinks, eventDisplayTitle, eventHref, presentEvent, type Event, type EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ticketing } from '~/lib/ticketing';
import { Button } from '@zurichjs/design/islands/Button';
import { Menu } from '@zurichjs/design/islands/Menu';
import { useEventState } from '../useEventState.ts';

/** Three connected dots (24 by 24). */
const SHARE_ICON = 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98';

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
  // As on conf.zurichjs.com: Google and Outlook open a prefilled entry, Apple and other apps open the event's .ics file.
  const links = calendarLinks(ev, url);
  const calendars = links
    ? [
        { label: 'Google Calendar', href: links.google, external: true, onSelect: () => track('ics_download', { eventId: ev.id, calendar: 'google' }) },
        { label: 'Outlook', href: links.outlook, external: true, onSelect: () => track('ics_download', { eventId: ev.id, calendar: 'outlook' }) },
        { label: 'Apple / iCal', href: `${eventHref(ev)}.ics`, onSelect: () => track('ics_download', { eventId: ev.id, calendar: 'ics' }) },
      ]
    : [];
  const handoff = p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist';

  return (
    <div class="flex flex-col gap-4">
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
        {p.dateKnown && state !== 'past' && state !== 'cancelled' && calendars.length > 0 && <Menu label="Add to calendar" variant="secondary" inverse items={calendars} />}
        <Button variant="secondary" inverse icon={SHARE_ICON} label="Share this meetup" onClick={share} />
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
