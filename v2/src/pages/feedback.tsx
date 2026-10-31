import { useRouter } from 'next/router';
import { useState, type FormEvent } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageOpening } from '@/components/layout/PageOpening';
import { Button } from '@/components/ui/Button';
import { Checkbox, TextArea, TextField, isEmail } from '@/components/forms/Field';
import { StarRating } from '@/components/ui/StarRating';
import { Surface } from '@/components/ui/Surface';
import { track } from '@/lib/analytics';
import { eventById, eventHref, pastEvents } from '@/lib/events';
import { dateLong, monthYear } from '@/lib/format';
import { submitForm } from '@/lib/forms';
import { useNextMeetupHref, useNow } from '@/lib/hooks';

const OPEN = [
  ['more', 'What should we do more of?', 'Formats, topics, moments in the evening, anything you wish there was more of.', 3],
  ['less', 'What should we do less of, or stop doing?', 'Nothing is off limits. We would rather hear it from you than guess.', 3],
  ['next', 'Who or what would you like to hear about next?', 'A topic, a speaker, a company, a question you keep running into at work.', 2],
  ['first', 'Was anything confusing or awkward about coming?', 'Finding the venue, RSVPing, arriving alone, the food, the timing, the language.', 2],
  ['friend', 'How would you describe tonight to a friend?', 'Your words, not ours. We might quote this if you allow it below.', 2],
] as const;

/** Event-level feedback only. Talk ratings live on the event page and /today. */
export default function FeedbackPage() {
  const router = useRouter();
  const now = useNow();
  const nextHref = useNextMeetupHref();
  const ev = (typeof router.query.event === 'string' && eventById(router.query.event)) || pastEvents(now)[0];
  const [overall, setOverall] = useState(0);
  const [text, setText] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState(false);
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');

  const emailBad = tried && !!email && !isEmail(email);
  const overallBad = tried && !overall;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!overall || (email && !isEmail(email))) return setTried(true);
    setBusy(true);
    setServerError('');
    const r = await submitForm('feedback', { eventId: ev?.id, overall, ...text, quote, email });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track({ name: 'form_submit', form: 'feedback' });
    setSent(true);
    window.scrollTo(0, 0);
  };

  const title = ev ? `How was the ${ev.startsAt ? monthYear(ev.startsAt).split(' ')[0] : ''} meetup?` : 'How was the meetup?';
  const sub = ev ? `${ev.title} · ${ev.startsAt ? dateLong(ev.startsAt) : ''}. About five minutes, mostly in your own words. Answers stay private unless you agree to be quoted.` : undefined;

  return (
    <Layout
      title="Feedback"
      noIndex
      opening={<PageOpening title={title} crumb={ev ? { label: 'Past event', href: eventHref(ev), here: 'Feedback' } : undefined} sub={sub} />}
    >
      <main className="px-gut pt-[clamp(56px,7vw,104px)] pb-[clamp(64px,8vw,112px)] flex flex-col gap-8">
        {!sent ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-[clamp(36px,4vw,52px)] max-w-[760px]">
            <fieldset className="border-0 p-0 m-0 flex flex-col gap-3">
              <legend className="text-[clamp(24px,2.4vw,30px)] font-bold mb-3 p-0">Overall, how was the evening?</legend>
              <p className="m-0 mb-1 text-[17px] leading-[1.55] text-ink-2">The only required question. The open ones below matter more. Talks are rated separately, on the event page and on /today, while the evening is fresh.</p>
              <StarRating value={overall} onChange={setOverall} label="Overall rating, 1 to 5" invalid={overallBad} size="lg" />
              {overallBad && (
                <span className="text-[15px] text-danger" role="alert">
                  Pick a score from 1 to 5.
                </span>
              )}
            </fieldset>

            <fieldset className="border-0 p-0 m-0 flex flex-col gap-[22px]">
              <legend className="text-[clamp(24px,2.4vw,30px)] font-bold mb-1.5 p-0">Help us shape the next one</legend>
              <p className="m-0 text-[17px] leading-[1.55] text-ink-2">All optional. A sentence is plenty; a paragraph is a gift.</p>
              {OPEN.map(([k, label, hint, rows]) => (
                <TextArea key={k} label={label} hint={hint} rows={rows} labelSize="lg" value={text[k] ?? ''} onChange={(e) => setText({ ...text, [k]: e.target.value })} />
              ))}
            </fieldset>

            <div className="flex flex-col gap-3.5">
              <Checkbox label="You can quote my comments on the ZurichJS website, with my first name only." checked={quote} onChange={(e) => setQuote(e.target.checked)} />
              <TextField
                label="Email, if you’d like a reply (optional)"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={emailBad}
                error={emailBad ? 'Check the email, or leave it empty.' : ''}
                className="max-w-[440px]"
              />
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Button type="submit" variant="black" size="lg" grow disabled={busy}>
                {busy ? 'Sending…' : 'Send feedback'}
              </Button>
              <span role="alert" className="text-[15px] text-danger">
                {tried && (overallBad || emailBad) ? 'One answer needs attention above.' : serverError}
              </span>
            </div>
          </form>
        ) : (
          <div role="status" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-4 max-w-[1000px]">
            <Surface tone="yellow" className="!rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3">
              <div className="text-[28px] font-bold leading-[1.15]">Thanks. That helps.</div>
              <p className="m-0 text-[18px] leading-[1.55]">Speakers see the ratings and comments for their talk. Organisers use the rest to plan the next programme.</p>
              <Button href={nextHref} variant="black" className="self-start mt-1.5 text-[17px]">
                See the next meetup
              </Button>
            </Surface>
            {ev && (
              <Surface className="!rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3">
                <div className="text-[24px] font-bold leading-[1.2]">Photos from the evening</div>
                <p className="m-0 text-[17px] leading-[1.55] text-ink-2">The recap page has the talks, speakers and photos.</p>
                <Button href={eventHref(ev)} variant="white" className="self-start mt-1.5 text-[17px]">
                  Open the recap
                </Button>
              </Surface>
            )}
          </div>
        )}
      </main>
    </Layout>
  );
}
