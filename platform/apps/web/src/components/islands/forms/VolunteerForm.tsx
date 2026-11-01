import { submitForm } from '@zurichjs/forms/client';
import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

type Way = 'night' | 'photos' | 'website' | 'unsure';
const MESSAGES = { name: 'Add your name.', email: 'Enter an email like name@example.com.' };

/** Volunteer form on /cfv. Sent as a contact message with the topic "Volunteering". */
export default function VolunteerForm({ nextHref }: { nextHref: string }) {
  const [f, setF] = useState({ name: '', email: '', way: 'night' as Way, message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  const payload = { ...f, topic: 'Volunteering', message: f.message || `I’d like to help: ${f.way}` };
  const errs = fieldErrors('contact', payload, MESSAGES);
  const valid = Object.keys(errs).length === 0;
  const bad = (k: keyof typeof MESSAGES) => tried && !!errs[k];

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    setServerError('');
    const r = await submitForm('contact', { ...payload, website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'cfv' });
    setSent(true);
  };

  if (sent)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3 max-w-[640px] outline-hidden">
        <div class="text-[28px] font-bold leading-[1.15]">Thanks. We’ll be in touch.</div>
        <p class="m-0 text-[18px] leading-[1.55]">An organiser replies to {f.email} before the next meetup.</p>
        <Button href={nextHref} variant="black" class="self-start mt-1.5 text-[17px]">
          See the next meetup
        </Button>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-[18px] max-w-[640px]">
      <Honeypot />
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3.5">
        <TextField
          label="Your name"
          name="name"
          autoComplete="name"
          value={f.name}
          onInput={(e) => setF({ ...f, name: e.currentTarget.value })}
          invalid={bad('name')}
          error={bad('name') ? errs.name : ''}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={f.email}
          onInput={(e) => setF({ ...f, email: e.currentTarget.value })}
          invalid={bad('email')}
          error={bad('email') ? errs.email : ''}
        />
      </div>
      <ChipGroup<Way>
        label="How would you like to help?"
        value={f.way}
        onChange={(way) => setF({ ...f, way })}
        options={[
          { value: 'night', label: 'On the night' },
          { value: 'photos', label: 'Photos or video' },
          { value: 'website', label: 'Website or tooling' },
          { value: 'unsure', label: 'Not sure yet' },
        ]}
      />
      <TextArea label="Anything we should know? (optional)" name="message" rows={4} value={f.message} onInput={(e) => setF({ ...f, message: e.currentTarget.value })} />
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" class="self-start" busy={busy}>
          {busy ? 'Sending…' : 'Send'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
      </div>
    </form>
  );
}
