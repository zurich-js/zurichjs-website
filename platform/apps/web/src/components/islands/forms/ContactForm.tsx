import { submitForm } from '@zurichjs/forms/client';
import { useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

const TOPICS = ['General question', 'Speaking', 'Hosting or sponsoring', 'Press or media', 'Problem with the website'];
const MESSAGES = { name: 'Add your name.', email: 'Enter an email like name@example.com.', message: 'Write a short message.' };

/** Contact form on /contact. */
export default function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', topic: TOPICS[0]!, message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  const errs = fieldErrors('contact', f, MESSAGES);
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
    const r = await submitForm('contact', { ...f, website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'contact' });
    setSent(true);
  };

  if (sent)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-none">
        <div class="text-[28px] font-bold leading-[1.15]">Message sent.</div>
        <p class="m-0 text-[18px] leading-[1.55]">An organiser will reply to {f.email}.</p>
        <Button
          variant="outline-black"
          class="self-start mt-1.5 text-[17px] !border"
          onClick={() => {
            setSent(false);
            setTried(false);
            setF({ ...f, message: '' });
          }}
        >
          Send another message
        </Button>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-4">
      <Honeypot />
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        <TextField
          label="Name"
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
      <SelectField label="Topic" name="topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.currentTarget.value })}>
        {TOPICS.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </SelectField>
      <TextArea
        label="Message"
        name="message"
        rows={6}
        value={f.message}
        onInput={(e) => setF({ ...f, message: e.currentTarget.value })}
        invalid={bad('message')}
        error={bad('message') ? errs.message : ''}
      />
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" grow busy={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
      </div>
    </form>
  );
}
