import { dateLong, eventHref, monthYear } from '@zurichjs/events';
import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cardClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Checkbox, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { StarRating } from '@zurichjs/design/islands/StarRating';
import { Honeypot, SubmitButton, honeypotValue, useFocusFirstError, useFocusWhen } from './shared.tsx';

export interface FeedbackEvent {
  id: string;
  slug: string;
  title: string;
  startsAt?: string;
  /** False for a social evening: no "Rate the talks" link. */
  hasTalks?: boolean;
}

const OPEN = [
  ['more', 'What should we do more of?', 'Formats, topics, moments in the evening, anything you wish there was more of.', 3],
  ['less', 'What should we do less of, or stop doing?', 'Nothing is off limits. We would rather hear it from you than guess.', 3],
  ['next', 'Who or what would you like to hear about next?', 'A topic, a speaker, a company, a question you keep running into at work.', 2],
  ['first', 'Was anything confusing or awkward about coming?', 'Finding the venue, RSVPing, arriving alone, the food, the timing, the language.', 2],
  ['friend', 'How would you describe the evening to a friend?', 'Your words, not ours. We only quote it on the website if you allow that below.', 2],
] as const;

/** Opening copy for an event, shared with feedback.astro so server and island agree. */
export const feedbackTitle = (ev?: FeedbackEvent) => (ev ? `How was the ${ev.startsAt ? monthYear(ev.startsAt).split(' ')[0] : ''} meetup?` : 'How was the meetup?');
export const feedbackSub = (ev?: FeedbackEvent) =>
  ev ? `${ev.title} · ${ev.startsAt ? dateLong(ev.startsAt) : ''}. About five minutes, mostly in your own words. Only the organisers read your answers.` : '';

interface Props {
  events: FeedbackEvent[];
  initialId?: string;
  nextHref: string;
}

/**
 * Event-level feedback on /feedback (the evening as a whole). Talk ratings are
 * separate: on the event page via "Rate the talks" (`?feedback=true`) and on
 * the Tonight page. `?event=<slug>` picks the event.
 */
export default function FeedbackForm({ events, initialId, nextHref }: Props) {
  const [evId, setEvId] = useState(initialId);
  const ev = events.find((e) => e.id === evId);
  const [overall, setOverall] = useState(0);
  const [text, setText] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState(false);
  const [quoteName, setQuoteName] = useState('');
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
    const r = await submitForm('feedback', {
      eventId: ev?.id,
      overall,
      ...text,
      quote,
      quoteName: quote ? quoteName.trim() : '',
      email,
      website_url: honeypotValue(formRef.current),
    });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'feedback' });
    setSent(true);
    window.scrollTo(0, 0);
  };

  if (sent)
    return (
      <div class="grid grid-cols-auto-md gap-4 max-w-wide items-start">
        <Notice tone="success" live focusRef={doneRef} title="Thanks. That helps.">
          <p class="m-0 text-body">
            The organisers read every answer and use it to plan the next programme.{quote ? ' We may quote what you wrote on the website, as you allowed.' : ''}
          </p>
          <Button href={nextHref} variant="cta" class="self-start mt-1.5">
            See the next meetup
          </Button>
        </Notice>
        {ev && (
          <div class={cardClass('filled', 'md')}>
            <p class="m-0 text-card-title font-bold">Photos from the evening</p>
            <p class="m-0 text-body text-ink-2">
              {ev.hasTalks === false ? 'The event page has photos once they are online.' : 'The event page has the programme, photos once they are online, and the talk ratings.'}
            </p>
            <div class="flex flex-wrap gap-2.5 mt-1.5">
              <Button href={eventHref(ev)} variant="secondary">
                Open the event page
              </Button>
              {ev.hasTalks !== false && (
                <Button href={`${eventHref(ev)}?feedback=true#programme`} variant="secondary">
                  Rate the talks
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-9 md:gap-13 max-w-reading">
      <Honeypot />
      <fieldset class="border-0 p-0 m-0 flex flex-col gap-3 min-w-0">
        <legend class="text-subsection font-bold mb-3 p-0">Overall, how was the evening?</legend>
        <p class="m-0 mb-1 text-body text-ink-2">
          The only required question. The open ones below matter more.
          {ev && ev.hasTalks !== false && (
            <>
              {' '}
              To rate individual talks, use{' '}
              <a href={`${eventHref(ev)}?feedback=true#programme`} class="underline underline-offset-[3px] font-bold text-black">
                Rate the talks
              </a>{' '}
              on the event page.
            </>
          )}
        </p>
        <StarRating value={overall} onChange={setOverall} label="Overall rating, 1 to 5" invalid={overallBad} size="lg" />
        {overallBad && (
          <span class="text-meta text-danger" role="alert">
            Pick a score from 1 to 5.
          </span>
        )}
      </fieldset>

      <fieldset class="border-0 p-0 m-0 flex flex-col gap-5 min-w-0">
        <legend class="text-subsection font-bold mb-1.5 p-0">Help us shape the next one</legend>
        <p class="m-0 text-body text-ink-2">All optional. A sentence is plenty; a paragraph is a gift.</p>
        {OPEN.map(([k, label, hint, rows]) => (
          <TextArea key={k} name={k} label={label} hint={hint} rows={rows} labelSize="lg" value={text[k] ?? ''} onInput={(e) => setText({ ...text, [k]: e.currentTarget.value })} />
        ))}
      </fieldset>

      <div class="flex flex-col gap-3.5">
        <p class="m-0 text-compact text-ink-2">
          Who reads this: the ZurichJS organisers. Speakers don’t see this form; they see only the ratings for their own talk. Nothing here is published unless you tick the box
          below.
        </p>
        <Checkbox label="You may quote my answers on the ZurichJS website." name="quote" checked={quote} onChange={(e) => setQuote(e.currentTarget.checked)} />
        {quote && (
          <TextField
            label="Name to show with the quote (optional)"
            hint="For example your first name. Leave empty to be quoted anonymously."
            name="quoteName"
            autoComplete="given-name"
            value={quoteName}
            onInput={(e) => setQuoteName(e.currentTarget.value)}
            class="max-w-110"
          />
        )}
        <TextField
          label="Email, if you’d like a reply (optional)"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          invalid={emailBad}
          error={emailBad ? 'Check the email, or leave it empty.' : ''}
          class="max-w-110"
        />
      </div>

      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="cta" grow busy={busy}>
          {busy ? 'Sending…' : 'Send feedback'}
        </SubmitButton>
        <span role="alert" class="text-meta text-danger">
          {tried && (overallBad || emailBad) ? 'One answer needs attention above.' : serverError}
        </span>
      </div>
    </form>
  );
}
