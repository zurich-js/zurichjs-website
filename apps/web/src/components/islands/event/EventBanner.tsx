import { presentEvent, type Event, type EventState } from '@zurichjs/events';
import { cx } from '@zurichjs/design/recipes';
import { useEventState } from '../useEventState.ts';

// Yellow is for buttons and one CTA section per page (Bogdan's review): the 'yellow' banner is black.
const TONE = { yellow: 'bg-black text-white on-black', grey: 'bg-grey', danger: 'bg-danger-soft' } as const;

/** Status banner (postponed, cancelled, feedback open). Follows the clock. */
export default function EventBanner({ ev, initial }: { ev: Event; initial: EventState }) {
  const state = useEventState(ev, initial);
  const banner = presentEvent(ev, { override: state }).banner;
  if (!banner) return null;
  return (
    <div role="status" class={cx('rounded-card py-[22px] px-6 text-black flex flex-col gap-1.5', TONE[banner.tone])}>
      <h2 class="m-0 text-[21px] font-bold">{banner.title}</h2>
      <p class="m-0 text-[17px] leading-normal">{banner.body}</p>
    </div>
  );
}
