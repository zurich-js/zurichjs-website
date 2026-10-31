import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { Button } from '../ui/Button';
import { ChipGroup, TextArea, TextField } from '../ui/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

export type Way = 'host' | 'food' | 'partner' | 'unsure';
const WAYS: Way[] = ['host', 'food', 'partner', 'unsure'];
const MESSAGES = { org: 'Add your company or organisation.', name: 'Add your name so we know who to reply to.', email: 'Enter an email like name@company.com.' };

/** Set by the "Choose this" links on /partners (see partners.astro), possibly before this island hydrates. */
declare global {
  interface Window {
    __zjsPartnerWay?: string;
  }
}
const asWay = (v: unknown): Way | null => ((WAYS as unknown[]).includes(v) ? (v as Way) : null);

/** Partner inquiry on /partners. */
export default function PartnersForm({ nextHref }: { nextHref: string }) {
  const [f, setF] = useState({ org: '', name: '', email: '', way: 'host' as Way, msg: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  // The cards above preselect a way of helping.
  useEffect(() => {
    const initial = asWay(window.__zjsPartnerWay);
    if (initial) setF((p) => ({ ...p, way: initial }));
    const onWay = (e: Event) => {
      const w = asWay((e as CustomEvent<string>).detail);
      if (w) setF((p) => ({ ...p, way: w }));
    };
    document.addEventListener('zjs:partner-way', onWay);
    return () => document.removeEventListener('zjs:partner-way', onWay);
  }, []);

  const errs = fieldErrors('partners', f, MESSAGES);
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
    const r = await submitForm('partners', { ...f, website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'partners' });
    setSent(true);
  };

  if (sent)
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-[28px] p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-hidden">
        <div class="text-[28px] font-bold leading-[1.15]">Thanks, we have your inquiry.</div>
        <p class="m-0 text-[18px] leading-[1.55]">An organiser will reply to {f.email} to plan the next step.</p>
        <div class="flex flex-wrap gap-2.5 mt-1.5">
          <Button href={nextHref} variant="black" class="text-[17px]">
            See the next meetup
          </Button>
          <Button href="/about" variant="outline-black" class="text-[17px] border!">
            About ZurichJS
          </Button>
        </div>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-[18px]">
      <Honeypot />
      <TextField
        label="Organisation"
        name="org"
        autoComplete="organization"
        value={f.org}
        onInput={(e) => setF({ ...f, org: e.currentTarget.value })}
        invalid={bad('org')}
        error={bad('org') ? errs.org : ''}
      />
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
          label="Work email"
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
          { value: 'host', label: 'Host a meetup' },
          { value: 'food', label: 'Food and drinks' },
          { value: 'partner', label: 'Community partner' },
          { value: 'unsure', label: 'Not sure yet' },
        ]}
      />
      <TextArea
        label="Anything we should know? (optional)"
        name="msg"
        rows={4}
        value={f.msg}
        onInput={(e) => setF({ ...f, msg: e.currentTarget.value })}
        aria-describedby="partners-msg-hint"
      />
      <span id="partners-msg-hint" class="text-[14px] text-grey-text -mt-3">
        Room size, preferred months, or what your team works on.
      </span>
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" grow busy={busy}>
          {busy ? 'Sending…' : 'Send inquiry'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
      </div>
    </form>
  );
}
