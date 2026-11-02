import { feedbackAvailability, feedbackNotice, type Event, type EventState } from '@zurichjs/events';
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { useEventState } from '../useEventState.ts';
import { feedbackRequested } from './feedbackMode.ts';

/**
 * Answers a legacy `?feedback=true` link when the talk ratings cannot open:
 * before the meetup starts ("Feedback opens when the meetup starts: …"), for a
 * cancelled, postponed or undated meetup, and for a social evening without
 * talks (only the evening feedback). Renders nothing otherwise, so the
 * Programme's ratings stay the only feedback UI for events with talks.
 */
export default function FeedbackGate({ ev, initial, preview = false }: { ev: Event; initial: EventState; preview?: boolean }) {
  const state = useEventState(ev, initial);
  const [requested, setRequested] = useState(false);
  useEffect(() => setRequested(feedbackRequested(location)), []);
  // A draft preview build treats feedback as open, so organisers can check it before the day.
  const availability = preview ? ({ open: true, talks: ev.agenda.some((a) => a.talk) } as const) : feedbackAvailability(ev, state);
  const notice = requested ? feedbackNotice(ev, availability) : undefined;
  const shown = !!notice;
  useEffect(() => {
    if (shown) requestAnimationFrame(() => document.getElementById('feedback')?.scrollIntoView());
  }, [shown]);
  if (!notice) return null;
  return (
    <section id="feedback" aria-labelledby="h-feedback-gate" class="bg-yellow rounded-card p-5 flex flex-col gap-2 scroll-mt-6">
      <h2 id="h-feedback-gate" class="m-0 text-[20px] font-bold">
        {notice.title}
      </h2>
      <p class="m-0 text-[17px] leading-normal">{notice.body}</p>
      {notice.evening && (
        <Button href={`/feedback?event=${ev.slug}`} variant="black" class="self-start text-[17px] mt-1">
          Feedback on the evening
        </Button>
      )}
    </section>
  );
}
