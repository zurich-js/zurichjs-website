import { presentEvent, type Event, type EventState } from '@zurichjs/events';
import { noticeClass, type NoticeTone } from '@zurichjs/design/recipes';
import { Heading } from '@zurichjs/design/islands/Heading';
import { useEventState } from '../useEventState.ts';

// Yellow is only for buttons and one CTA section (Bogdan's review): the 'yellow' and 'grey' banners are notes.
const TONE: Record<'yellow' | 'grey' | 'danger', NoticeTone> = { yellow: 'note', grey: 'note', danger: 'danger' };

/** Status banner (postponed, cancelled, feedback open), in the Notice look with its own heading. Follows the clock. */
export default function EventBanner({ ev, initial }: { ev: Event; initial: EventState }) {
  const state = useEventState(ev, initial);
  const banner = presentEvent(ev, { override: state }).banner;
  if (!banner) return null;
  return (
    <div role="status" class={noticeClass(TONE[banner.tone])}>
      <div class="flex flex-col gap-1.5 min-w-0">
        <Heading size="card">{banner.title}</Heading>
        <p class="m-0 text-compact">{banner.body}</p>
      </div>
    </div>
  );
}
