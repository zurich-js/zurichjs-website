import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { Button } from '@zurichjs/design/islands/Button';
import { Notice } from '@zurichjs/design/islands/Notice';
import { SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen, useSubmitOnce } from './shared.tsx';

const TOPICS = ['General question', 'Slack invite', 'Speaking', 'Hosting or sponsoring', 'Press or media', 'Problem with the website'];
/** ?topic= presets the topic, e.g. "Ask us for a Slack invite" links to /contact?topic=slack. */
const PRESETS: Record<string, { topic: string; message?: string }> = {
  slack: { topic: 'Slack invite', message: 'Hi, could you send me an invite to the ZurichJS Slack?' },
  speaking: { topic: 'Speaking' },
  hosting: { topic: 'Hosting or sponsoring' },
  press: { topic: 'Press or media' },
  website: { topic: 'Problem with the website' },
};
/** Code of conduct concerns never go through this form (it also posts to the organisers' Slack): ?topic=conduct points to the private route. */
const CONDUCT = 'conduct';
const MESSAGES = { name: 'Add your name.', email: 'Enter an email like name@example.com.', message: 'Write a short message.' };

/** Contact form on /contact. */
export default function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', topic: TOPICS[0]!, message: '' });
  const [tried, setTried] = useState(false);
  const { busy, run } = useSubmitOnce();
  const [sent, setSent] = useState(false);
  const [conduct, setConduct] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('topic') ?? '';
    if (q === CONDUCT) return setConduct(true);
    const preset = PRESETS[q];
    if (preset) setF((p) => ({ ...p, topic: preset.topic, message: p.message || preset.message || '' }));
  }, []);

  const errs = fieldErrors('contact', f, MESSAGES);
  const valid = Object.keys(errs).length === 0;
  const bad = (k: keyof typeof MESSAGES) => tried && !!errs[k];

  const submit = (e: Event) => {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    void run(async () => {
      setServerError('');
      const r = await submitForm('contact', { ...f, website_url: honeypotValue(formRef.current) });
      if (!r.ok) return setServerError(r.error);
      track('form_submit', { form: 'contact' });
      setSent(true);
    });
  };

  if (sent)
    return (
      <Notice tone="success" live focusRef={doneRef} title="Message sent.">
        <p class="m-0 text-body">An organiser will reply to {f.email}.</p>
        <Button
          variant="secondary"
          class="self-start mt-1.5"
          onClick={() => {
            setSent(false);
            setTried(false);
            setF({ ...f, message: '' });
          }}
        >
          Send another message
        </Button>
      </Notice>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-4">
      <Honeypot />
      {conduct && (
        <Notice title="Reporting a code of conduct concern?">
          <p class="m-0 text-body">
            Please don’t use this form.{' '}
            <a href="#conduct" class="font-bold text-black">
              Use the private route
            </a>{' '}
            instead: email hello@zurichjs.com or speak to a team member at an event.
          </p>
        </Notice>
      )}
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          required
          value={f.name}
          onInput={(e) => setF({ ...f, name: e.currentTarget.value })}
          invalid={bad('name')}
          error={bad('name') ? errs.name : ''}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
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
        required
        value={f.message}
        onInput={(e) => setF({ ...f, message: e.currentTarget.value })}
        invalid={bad('message')}
        error={bad('message') ? errs.message : ''}
      />
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="cta" grow busy={busy}>
          {busy ? 'Sending…' : 'Send message'}
        </SubmitButton>
        <span role="alert" class="text-meta text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
        {serverError && (
          <span class="text-meta text-ink-2 basis-full">
            Your message is still here. Try again, or email it to{' '}
            <a href={`mailto:hello@zurichjs.com?subject=${encodeURIComponent(`${f.topic} from ${f.name}`)}&body=${encodeURIComponent(f.message)}`} class="font-bold text-black">
              hello@zurichjs.com
            </a>
            .
          </span>
        )}
      </div>
      <p class="m-0 text-meta text-ink-2">
        Messages reach the organisers by email and in their team chat. For a code of conduct concern, use the{' '}
        <a href="#conduct" class="font-bold text-black">
          private route
        </a>{' '}
        instead.
      </p>
    </form>
  );
}
