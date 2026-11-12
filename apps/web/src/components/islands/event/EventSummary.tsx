import { presentEvent, type Event, type EventState } from '@zurichjs/events';
import { useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ticketing } from '~/lib/ticketing';
import { Button } from '@zurichjs/design/islands/Button';
import { cardClass, cx } from '@zurichjs/design/recipes';
import { useEventState } from '../useEventState.ts';

/** A chain link (24 by 24). */
const LINK_ICON = 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71';

/** Sticky summary panel: the date, cost, status, and the action for the current state with a copy-link button. The venue card sits above it. */
export default function EventSummary({ ev, initial, url }: { ev: Event; initial: EventState; url: string }) {
  const state = useEventState(ev, initial);
  const p = presentEvent(ev, { override: state, ticketing });
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');
  const handoff = p.cta.kind === 'rsvp' || p.cta.kind === 'waitlist';
  const copy = () => {
    const done = (r: 'ok' | 'fail') => {
      setCopied(r);
      setTimeout(() => setCopied(''), 2500);
    };
    if (!navigator.clipboard) return done('fail');
    navigator.clipboard.writeText(url).then(
      () => done('ok'),
      () => done('fail'),
    );
  };
  return (
    <aside aria-label="Event summary" class={cardClass('outline', 'md', 'md:sticky md:top-26')}>
      <div class="text-body font-bold">{p.whenShort}</div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-compact text-ink-2">Cost</div>
          <div class="text-body font-bold">Free</div>
        </div>
        <div>
          <div class="text-compact text-ink-2">Status</div>
          <div class="text-body font-bold">{p.stateLabel}</div>
        </div>
      </div>
      <div class="flex gap-2 items-center">
        {p.cta.kind === 'feedback' ? (
          <Button href={`/feedback?event=${ev.slug}`} variant="primary" class="flex-1">
            Feedback on the evening
          </Button>
        ) : (
          p.cta.href && (
            <Button
              href={p.cta.href}
              variant="primary"
              class="flex-1"
              external={p.cta.external}
              onClick={handoff ? () => track('rsvp_handoff_click', { eventId: ev.id }) : undefined}
            >
              {p.cta.label}
            </Button>
          )
        )}
        <Button variant="secondary" icon={LINK_ICON} label="Copy the link to this meetup" onClick={copy} />
      </div>
      {p.ctaNote && <div class="text-compact text-ink-2">{p.ctaNote}</div>}
      <div role="status" class={cx('text-compact empty:hidden', copied === 'ok' ? 'font-bold text-success' : 'text-ink-2')}>
        {copied === 'ok' ? 'Link copied.' : copied === 'fail' ? `Couldn’t copy. The link is ${url}` : ''}
      </div>
    </aside>
  );
}
