import { REQUIRED, VOLUNTEER_AVAILABILITY, VOLUNTEER_INTERESTS, submitForm, type VolunteerAvailability } from '@zurichjs/forms/client';
import type { ComponentChildren } from 'preact';
import { useId, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared.tsx';

type Interest = (typeof VOLUNTEER_INTERESTS)[number];
interface Answers {
  name: string;
  email: string;
  linkedinProfile: string;
  githubProfile: string;
  availability: VolunteerAvailability | '';
  availabilityOther: string;
  interests: Interest[];
  message: string;
}
const EMPTY: Answers = { name: '', email: '', linkedinProfile: '', githubProfile: '', availability: '', availabilityOther: '', interests: [], message: '' };

/** Every field the form shows. Empty strings keep the shared messages, which differ for "missing" and "wrong format". */
const MESSAGES: Record<string, string> = Object.fromEntries([...Object.keys(REQUIRED.volunteer), 'githubProfile', 'availabilityOther'].map((k) => [k, '']));

/** Pill-shaped native checkbox or radio, so keyboard and screen readers get the real control. */
function Choice({
  type,
  name,
  label,
  checked,
  invalid,
  describedBy,
  onChange,
}: {
  type: 'checkbox' | 'radio';
  name: string;
  label: ComponentChildren;
  checked: boolean;
  invalid: boolean;
  describedBy?: string;
  onChange: () => void;
}) {
  return (
    <label
      class={cx(
        'min-h-[44px] px-4 rounded-pill border flex items-center gap-2.5 text-[16px] font-bold cursor-pointer',
        checked ? 'bg-black text-white border-black' : 'bg-white text-black hover:bg-grey',
        !checked && (invalid ? 'border-danger' : 'border-black'),
      )}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        class={cx('w-[18px] h-[18px] m-0 flex-none cursor-pointer', checked ? 'accent-yellow' : 'accent-black')}
      />
      {label}
    </label>
  );
}

/** Volunteer application on /cfv. Sent to the organisers by email and Slack with every answer (see forwardForm). */
export default function VolunteerForm({ nextHref }: { nextHref: string }) {
  const [f, setF] = useState<Answers>(EMPTY);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);
  const id = useId();

  const payload = { ...f, availabilityOther: f.availability === 'other' ? f.availabilityOther : '' };
  const errs = fieldErrors('volunteer', payload, MESSAGES);
  const valid = Object.keys(errs).length === 0;
  const bad = (k: keyof Answers) => tried && !!errs[k];
  const err = (k: keyof Answers) => (bad(k) ? errs[k] : '');
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (i: Interest) => setF((p) => ({ ...p, interests: p.interests.includes(i) ? p.interests.filter((x) => x !== i) : [...p.interests, i] }));

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    setServerError('');
    const r = await submitForm('volunteer', { ...payload, website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'cfv' });
    setSent(true);
  };

  if (sent)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-success-soft rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 max-w-[640px] outline-hidden">
        <h2 class="m-0 text-[28px] font-bold leading-[1.15]">Thanks. Your application is in.</h2>
        <p class="m-0 text-[18px] leading-[1.55]">Someone from the organising team will email you at {f.email} within 7 days to talk about the next steps.</p>
        <Button href={nextHref} variant="black" class="self-start mt-1.5 text-[17px]">
          See the next meetup
        </Button>
      </div>
    );

  const legend = 'text-[16px] font-bold mb-2 p-0';
  const errorLine = (k: keyof Answers, elId: string) => (
    <span id={elId} class="text-[14px] text-danger min-h-[1.2em]" aria-live="polite">
      {err(k)}
    </span>
  );
  const optional = <span class="font-normal text-grey-text"> (optional)</span>;
  const mailBody = [
    `Name: ${f.name}`,
    `Email: ${f.email}`,
    `LinkedIn: ${f.linkedinProfile}`,
    `GitHub: ${f.githubProfile}`,
    `Availability: ${f.availability ? VOLUNTEER_AVAILABILITY[f.availability] : ''}${f.availability === 'other' ? `: ${f.availabilityOther}` : ''}`,
    `Interests: ${f.interests.join(', ')}`,
    '',
    f.message,
  ].join('\n');

  return (
    <form ref={formRef} onSubmit={submit} noValidate aria-label="Volunteer application" class="relative flex flex-col gap-6 max-w-[720px]">
      <Honeypot />
      <p class="m-0 text-[16px] text-ink-2">Every field is required unless it says optional.</p>
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-3.5">
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          required
          value={f.name}
          onInput={(e) => set('name', e.currentTarget.value)}
          invalid={bad('name')}
          error={err('name')}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={f.email}
          onInput={(e) => set('email', e.currentTarget.value)}
          invalid={bad('email')}
          error={err('email')}
        />
        <TextField
          label="LinkedIn profile"
          name="linkedinProfile"
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://www.linkedin.com/in/your-name"
          required
          value={f.linkedinProfile}
          onInput={(e) => set('linkedinProfile', e.currentTarget.value)}
          invalid={bad('linkedinProfile')}
          error={err('linkedinProfile')}
        />
        <TextField
          label={<span>GitHub username or link{optional}</span>}
          name="githubProfile"
          autoCapitalize="none"
          spellcheck={false}
          value={f.githubProfile}
          onInput={(e) => set('githubProfile', e.currentTarget.value)}
          invalid={bad('githubProfile')}
          error={err('githubProfile')}
        />
      </div>

      <fieldset class="border-0 p-0 m-0 flex flex-col gap-1.5 min-w-0">
        <legend class={legend}>How much time do you have?</legend>
        <div class="flex flex-wrap gap-2">
          {(Object.entries(VOLUNTEER_AVAILABILITY) as [VolunteerAvailability, string][]).map(([value, label]) => (
            <Choice
              key={value}
              type="radio"
              name="availability"
              label={label}
              checked={f.availability === value}
              invalid={bad('availability')}
              describedBy={bad('availability') ? `${id}-availability` : undefined}
              onChange={() => set('availability', value)}
            />
          ))}
        </div>
        {errorLine('availability', `${id}-availability`)}
        {f.availability === 'other' && (
          <TextField
            label="Tell us how much time you have"
            name="availabilityOther"
            required
            value={f.availabilityOther}
            onInput={(e) => set('availabilityOther', e.currentTarget.value)}
            invalid={bad('availabilityOther')}
            error={err('availabilityOther')}
          />
        )}
      </fieldset>

      <fieldset class="border-0 p-0 m-0 flex flex-col gap-1.5 min-w-0">
        <legend class={legend}>What would you like to help with?</legend>
        <p id={`${id}-interests-hint`} class="m-0 mb-1 text-[16px] text-grey-text">
          Choose one or more.
        </p>
        <div class="flex flex-wrap gap-2">
          {VOLUNTEER_INTERESTS.map((i) => (
            <Choice
              key={i}
              type="checkbox"
              name="interests"
              label={i}
              checked={f.interests.includes(i)}
              invalid={bad('interests')}
              describedBy={`${id}-interests-hint${bad('interests') ? ` ${id}-interests` : ''}`}
              onChange={() => toggle(i)}
            />
          ))}
        </div>
        {errorLine('interests', `${id}-interests`)}
      </fieldset>

      <TextArea
        label="Why do you want to volunteer with ZurichJS?"
        hint="Your skills, your experience and what you’d like to do."
        name="message"
        rows={5}
        required
        value={f.message}
        onInput={(e) => set('message', e.currentTarget.value)}
        invalid={bad('message')}
        error={err('message')}
      />

      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" class="self-start" busy={busy}>
          {busy ? 'Sending…' : 'Send application'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
        {serverError && (
          <span class="text-[15px] text-ink-2 basis-full">
            Your answers are still here. You can also email them to{' '}
            <a href={`mailto:hello@zurichjs.com?subject=${encodeURIComponent('Volunteer application')}&body=${encodeURIComponent(mailBody)}`} class="font-bold text-black">
              hello@zurichjs.com
            </a>
            .
          </span>
        )}
      </div>
    </form>
  );
}
