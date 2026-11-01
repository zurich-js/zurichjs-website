import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, honeypotValue, useFocusWhen } from './shared';

type Done = { email: string; outcome: 'added' | 'already' | 'off' };

/** Conference waitlist on /waitlist/conf: adds the email to the ZurichJS newsletter (EmailOctopus) through /api/subscribe. */
export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const doneRef = useFocusWhen<HTMLDivElement>(!!done);
  const bad = tried && !isEmail(email);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setTried(true);
      inputRef.current?.querySelector('input')?.focus();
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), website_url: honeypotValue(formRef.current) }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; subscribed?: boolean; already?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? '');
      track('form_submit', { form: 'conf_waitlist' });
      setDone({ email: email.trim(), outcome: !body.subscribed ? 'off' : body.already ? 'already' : 'added' });
    } catch (err) {
      setServerError((err as Error).message || 'We couldn’t add you right now. Please try again or email hello@zurichjs.com.');
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-hidden">
        <div class="text-[28px] font-bold leading-[1.15]">
          {done.outcome === 'off' ? 'Not saved yet.' : done.outcome === 'already' ? 'You’re already on the list.' : 'You’re on the list.'}
        </div>
        <p class="m-0 text-[18px] leading-[1.55]">
          {done.outcome === 'off'
            ? 'Signups aren’t switched on yet, so your email wasn’t saved. Email hello@zurichjs.com and we’ll add you by hand.'
            : `We’ll write to ${done.email} when conference tickets and speakers are announced. Every email has an unsubscribe link.`}
        </p>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative bg-grey rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-4">
      <Honeypot />
      <div ref={inputRef}>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          invalid={bad}
          error={bad ? 'Enter an email like name@example.com.' : ''}
        />
      </div>
      <SubmitButton variant="black" size="lg" busy={busy} class="w-full">
        {busy ? 'Adding you…' : 'Join the waitlist'}
      </SubmitButton>
      <span role="alert" class="text-[15px] text-danger empty:hidden">
        {serverError}
      </span>
      <p class="m-0 text-[15px] leading-normal text-ink-2">
        Your email joins the ZurichJS newsletter, sent with EmailOctopus, which carries conference and meetup news. See the{' '}
        <a href="/policies/privacy-policy" class="font-bold text-black">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
