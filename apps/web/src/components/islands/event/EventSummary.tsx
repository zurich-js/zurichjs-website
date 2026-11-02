import { presentEvent, timesLine, type Event, type EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ticketing } from '~/lib/ticketing';
import { Button } from '@zurichjs/design/islands/Button';
import { useEventState } from '../useEventState.ts';

/** Sticky summary panel: when, where, cost, status and the action for the current state. */
export default function EventSummary({ ev, initial, url }: { ev: Event; initial: EventState; url: string }) {
  const state = useEventState(ev, initial);
  const p = presentEvent(ev, { override: state, ticketing });
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');
  const times = p.dateKnown ? timesLine(ev) : '';
  const handoff = p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist';
  return (
    <aside aria-label="Event summary" class="md:sticky md:top-[72px] bg-grey rounded-card p-6 flex flex-col gap-[18px]">
      <div class="flex flex-col gap-0.5">
        <div class="text-[15px] text-ink-2">When</div>
        <div class="text-[19px] font-bold">{p.whenShort}</div>
        {times && <div class="text-[16px] text-ink-2">{times}</div>}
      </div>
      <div class="flex flex-col gap-0.5">
        <div class="text-[15px] text-ink-2">Where</div>
        <div class="text-[19px] font-bold">{p.venueShort}</div>
        {p.venueSub && <div class="text-[16px] text-ink-2">{p.venueSub}</div>}
        {ev.venue && (
          <a href="#venue" class="text-[16px] font-bold underline underline-offset-[3px] self-start">
            Directions
          </a>
        )}
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-[15px] text-ink-2">Cost</div>
          <div class="text-[19px] font-bold">Free</div>
        </div>
        <div>
          <div class="text-[15px] text-ink-2">Status</div>
          <div class="text-[19px] font-bold">{p.stateLabel}</div>
        </div>
      </div>
      {p.cta.kind === 'feedback' ? (
        <Button href={`/feedback?event=${ev.slug}`} variant="black" size="lg">
          Feedback on the evening
        </Button>
      ) : (
        p.cta.href && (
          <Button href={p.cta.href} variant="black" size="lg" external={p.cta.external} onClick={handoff ? () => track('rsvp_handoff_click', { eventId: ev.id }) : undefined}>
            {p.cta.label}
          </Button>
        )
      )}
      {p.ctaNote && <div class="text-[15px] leading-normal text-ink-2">{p.ctaNote}</div>}
      <Button
        variant="link"
        class="self-start text-[16px]"
        onClick={() => {
          const done = (r: 'ok' | 'fail') => {
            setCopied(r);
            setTimeout(() => setCopied(''), 2500);
          };
          if (!navigator.clipboard) return done('fail');
          navigator.clipboard.writeText(url).then(
            () => done('ok'),
            () => done('fail'),
          );
        }}
      >
        Copy link
      </Button>
      <div role="status" class="text-[15px] text-ink-2 min-h-[1lh] -mt-3">
        {copied === 'ok' ? 'Link copied.' : copied === 'fail' ? `Couldn’t copy. The link is ${url}` : ''}
      </div>
    </aside>
  );
}
