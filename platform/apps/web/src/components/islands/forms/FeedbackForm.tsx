import { dateLong, eventHref, monthYear } from '@zurichjs/events';
import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { surfaceClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { StarRating } from '@zurichjs/design/islands/StarRating';
import { Honeypot, SubmitButton, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

export interface FeedbackEvent {
  id: string;
  slug: string;
  title: string;
  startsAt?: string;
}

const OPEN = [
  ['more', 'What should we do more of?', 'Formats, topics, moments in the evening, anything you wish there was more of.', 3],
  ['less', 'What should we do less of, or stop doing?', 'Nothing is off limits. We would rather hear it from you than guess.', 3],
  ['next', 'Who or what would you like to hear about next?', 'A topic, a speaker, a company, a question you keep running into at work.', 2],
  ['first', 'Was anything confusing or awkward about coming?', 'Finding the venue, RSVPing, arriving alone, the food, the timing, the language.', 2],
  ['friend', 'How would you describe tonight to a friend?', 'Your words, not ours. We might quote this if you allow it below.', 2],
] as const;

/** Opening copy for an event, shared with feedback.astro so server and island agree. */
export const feedbackTitle = (ev?: FeedbackEvent) => (ev ? `How was the ${ev.startsAt ? monthYear(ev.startsAt).split(' ')[0] : ''} meetup?` : 'How was the meetup?');
export const feedbackSub = (ev?: FeedbackEvent) =>
  ev ? `${ev.title} · ${ev.startsAt ? dateLong(ev.startsAt) : ''}. About five minutes, mostly in your own words. Answers stay private unless you agree to be quoted.` : '';

interface Props {
  events: FeedbackEvent[];
  initialId?: string;
  nextHref: string;
}

/** Event-level feedback on /feedback. Talk ratings live on the event page. `?event=<slug>` picks the event. */
export default function FeedbackForm({ events, initialId, nextHref }: Props) {
  const [evId, setEvId] = useState(initialId);
  const ev = events.find((e) => e.id === evId);
  const [overall, setOverall] = useState(0);
  const [text, setText] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState(false);
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  // `?event=<slug>` (or id) switches the event; the static opening follows.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('event');
    const found = q ? events.find((e) => e.slug === q || e.id === q) : undefined;
    if (!found || found.id === initialId) return;
    setEvId(found.id);
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = feedbackTitle(found);
    const sub = document.getElementById('feedback-sub');
    if (sub) sub.textContent = feedbackSub(found);
    const crumb = document.querySelector<HTMLAnchorElement>('nav[aria-label="Breadcrumb"] a');
    if (crumb) crumb.href = eventHref(found);
  }, [events, initialId]);

  const emailBad = tried && !!email && !isEmail(email);
  const overallBad = tried && !overall;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!overall || (email && !isEmail(email))) {
      setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    setServerError('');
    const r = await submitForm('feedback', { eventId: ev?.id, overall, ...text, quote, email, website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'feedback' });
    setSent(true);
    window.scrollTo(0, 0);
  };

  if (sent)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4 max-w-[1000px] outline-hidden">
        <div class={surfaceClass('yellow', 'rounded-[28px]! p-[clamp(24px,3vw,36px)] flex flex-col gap-3')}>
          <div class="text-[28px] font-bold leading-[1.15]">Thanks. That helps.</div>
          <p class="m-0 text-[18px] leading-[1.55]">Speakers see the ratings and comments for their talk. Organisers use the rest to plan the next programme.</p>
          <Button href={nextHref} variant="black" class="self-start mt-1.5 text-[17px]">
            See the next meetup
          </Button>
        </div>
        {ev && (
          <div class={surfaceClass('grey', 'rounded-[28px]! p-[clamp(24px,3vw,36px)] flex flex-col gap-3')}>
            <div class="text-[24px] font-bold leading-[1.2]">Photos from the evening</div>
            <p class="m-0 text-[17px] leading-[1.55] text-ink-2">The recap page has the talks, speakers and photos.</p>
            <Button href={eventHref(ev)} variant="white" class="self-start mt-1.5 text-[17px]">
              Open the recap
            </Button>
          </div>
        )}
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-[clamp(36px,4vw,52px)] max-w-[760px]">
      <Honeypot />
      <fieldset class="border-0 p-0 m-0 flex flex-col gap-3 min-w-0">
        <legend class="text-[clamp(24px,2.4vw,30px)] font-bold mb-3 p-0">Overall, how was the evening?</legend>
        <p class="m-0 mb-1 text-[17px] leading-[1.55] text-ink-2">
          The only required question. The open ones below matter more. Talks are rated separately, on the event page and on /today, while the evening is fresh.
        </p>
        <StarRating value={overall} onChange={setOverall} label="Overall rating, 1 to 5" invalid={overallBad} size="lg" />
        {overallBad && (
          <span class="text-[15px] text-danger" role="alert">
            Pick a score from 1 to 5.
          </span>
        )}
      </fieldset>

      <fieldset class="border-0 p-0 m-0 flex flex-col gap-[22px] min-w-0">
        <legend class="text-[clamp(24px,2.4vw,30px)] font-bold mb-1.5 p-0">Help us shape the next one</legend>
        <p class="m-0 text-[17px] leading-[1.55] text-ink-2">All optional. A sentence is plenty; a paragraph is a gift.</p>
        {OPEN.map(([k, label, hint, rows]) => (
          <TextArea key={k} name={k} label={label} hint={hint} rows={rows} labelSize="lg" value={text[k] ?? ''} onInput={(e) => setText({ ...text, [k]: e.currentTarget.value })} />
        ))}
      </fieldset>

      <div class="flex flex-col gap-3.5">
        <Checkbox
          label="You can quote my comments on the ZurichJS website, with my first name only."
          name="quote"
          checked={quote}
          onChange={(e) => setQuote(e.currentTarget.checked)}
        />
        <TextField
          label="Email, if you’d like a reply (optional)"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          invalid={emailBad}
          error={emailBad ? 'Check the email, or leave it empty.' : ''}
          class="max-w-[440px]"
        />
      </div>

      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" grow busy={busy}>
          {busy ? 'Sending…' : 'Send feedback'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {tried && (overallBad || emailBad) ? 'One answer needs attention above.' : serverError}
        </span>
      </div>
    </form>
  );
}
