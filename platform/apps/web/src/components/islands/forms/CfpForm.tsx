import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { cx, surfaceClass } from '~/lib/ui';
import { Button } from '../ui/Button';
import { Checkbox, TextArea, TextField } from '../ui/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

const FORMATS = [
  { v: 5, label: 'Lightning', min: '5 min' },
  { v: 25, label: 'Standard', min: '25 min' },
  { v: 35, label: 'Deep dive', min: '35 min' },
];
const DRAFT_KEY = 'zurichjs-cfp-draft';
const STAGES = [
  ['Received', 'We have your proposal.'],
  ['Accepted', 'An organiser says yes.'],
  ['Scheduled', 'We pick a meetup together.'],
  ['Given', 'It appears on your speaker page.'],
] as const;
const MESSAGES = {
  name: 'Add your name so we know who to reply to.',
  email: 'Enter an email like name@example.com so we can reply.',
  title: 'Add a working title. You can change it later.',
};
/** Opening sentence per step; the opening is static HTML, so the island keeps it in step. */
export const CFP_SUBS = [
  'Does it have to be about JavaScript? Not really. No account needed, and if you’ve spoken with us before, we match your proposal to your speaker page by email.',
  'Step 2 of 2: your proposal.',
  '',
];

interface Draft {
  name: string;
  email: string;
  firstTalk: boolean;
  title: string;
  abstract: string;
  format: number;
}
const EMPTY: Draft = { name: '', email: '', firstTalk: false, title: '', abstract: '', format: 25 };

interface Props {
  nextHref: string;
  confHref: string;
  confCfp: string;
  confState: string;
}

/** Talk proposal on /cfp: choose meetup or conference, then a one-page proposal. The draft stays in this browser. */
export default function CfpForm({ nextHref, confHref, confCfp, confState }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const loaded = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(step === 2);

  // The draft lives in this browser only. `#proposal` opens the form directly.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* ignore */
    }
    loaded.current = true;
    const open = () => location.hash === '#proposal' && setStep((s) => (s === 0 ? 1 : s));
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* ignore */
    }
  }, [d]);

  // Keep the opening sentence in step with the form.
  const firstRender = useRef(true);
  useEffect(() => {
    const sub = document.getElementById('cfp-sub');
    if (sub) {
      sub.textContent = CFP_SUBS[step] ?? '';
      if (sub.parentElement) sub.parentElement.hidden = !CFP_SUBS[step];
    }
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (step === 1) formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    if (step === 0) startRef.current?.focus();
  }, [step]);

  const errs = fieldErrors('cfp', { ...d, format: 'Standard' }, MESSAGES);
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
    const r = await submitForm('cfp', { ...d, format: FORMATS.find((f) => f.v === d.format)?.label ?? 'Standard', website_url: honeypotValue(formRef.current) });
    setBusy(false);
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'cfp' });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setStep(2);
    window.scrollTo(0, 0);
  };

  return (
    <div class="max-w-[880px] flex flex-col gap-7">
      {step === 0 && (
        <>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
            <button ref={startRef} type="button" onClick={() => setStep(1)} class="text-left cursor-pointer border-0 bg-yellow rounded-card p-7 flex flex-col gap-2.5">
              <span class="text-[24px] font-bold">At a ZurichJS meetup</span>
              <span class="text-[17px] leading-normal">Open all year. Lightning (5 min), standard (25 min) or deep dive (35 min). Good for a first talk.</span>
              <span class="font-bold text-[17px] mt-1.5 underline underline-offset-[3px]">Start a proposal</span>
            </button>
            <a
              href={confHref}
              target="_blank"
              rel="noopener"
              onClick={() => track('conf_outbound_click', { placement: 'cfp', confState })}
              class="no-underline text-black text-left bg-grey rounded-card p-7 flex flex-col gap-2.5"
            >
              <span class="text-[24px] font-bold">At ZurichJS Conf</span>
              <span class="text-[17px] leading-normal text-ink-2">The conference runs its own call for papers. {confCfp}</span>
              <span class="font-bold text-[17px] mt-1.5 underline underline-offset-[3px]">Go to conf.zurichjs.com</span>
            </a>
          </div>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-12 gap-y-4 pt-3">
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Does it have to be about JavaScript?</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                Not really. We’ve had talks about Laravel, career development, infrastructure, developer experience, observability and systems architecture. Most of the ideas
                developers care about go beyond a single language.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">We look after our speakers</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                Every speaker is supported individually, from mentoring and preparation to travel, accommodation, and technical checks. First talk? Even better.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Rendered at every step so the fields are in the HTML; shown at step 1. */}
      <form
        ref={formRef}
        id="proposal"
        onSubmit={submit}
        noValidate
        hidden={step !== 1}
        class={cx('relative flex-col gap-8', step === 1 ? 'flex' : 'hidden')}
        aria-label="Talk proposal"
      >
        <Honeypot />
        <fieldset class="border-0 p-0 m-0 flex flex-col gap-4 min-w-0">
          <legend class="text-[24px] font-bold mb-3.5 p-0">About you</legend>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            <TextField
              label="Name"
              name="name"
              autoComplete="name"
              value={d.name}
              onInput={(e) => setD({ ...d, name: e.currentTarget.value })}
              invalid={bad('name')}
              error={bad('name') ? errs.name : ''}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              value={d.email}
              onInput={(e) => setD({ ...d, email: e.currentTarget.value })}
              invalid={bad('email')}
              error={bad('email') ? errs.email : ''}
              hint={!bad('email') ? 'Only used to reply and to find your existing speaker page.' : undefined}
            />
          </div>
          <Checkbox
            label="This would be my first talk. I’d like help preparing."
            name="firstTalk"
            checked={d.firstTalk}
            onChange={(e) => setD({ ...d, firstTalk: e.currentTarget.checked })}
          />
        </fieldset>
        <fieldset class="border-0 p-0 m-0 flex flex-col gap-4 min-w-0">
          <legend class="text-[24px] font-bold mb-3.5 p-0">Your talk</legend>
          <TextField
            label="Title"
            name="title"
            value={d.title}
            onInput={(e) => setD({ ...d, title: e.currentTarget.value })}
            invalid={bad('title')}
            error={bad('title') ? errs.title : ''}
          />
          <TextArea
            label="What will people learn?"
            name="abstract"
            rows={4}
            value={d.abstract}
            onInput={(e) => setD({ ...d, abstract: e.currentTarget.value })}
            error=""
            hint="Two or three sentences is enough. We use it on the event page."
          />
          <div role="radiogroup" aria-label="Format" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-2.5">
            {FORMATS.map((f) => {
              const on = d.format === f.v;
              return (
                <button
                  key={f.v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setD({ ...d, format: f.v })}
                  class={cx(
                    'cursor-pointer text-left min-h-[68px] py-3 px-[18px] rounded-2xl flex flex-col gap-0.5',
                    on ? 'border-2 border-black bg-yellow' : 'border border-grey-line bg-white',
                  )}
                >
                  <span class="font-bold text-[17px]">{f.label}</span>
                  <span class="text-[15px] text-ink-2">{f.min}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <div class="flex flex-wrap gap-4 items-center">
          <SubmitButton variant="black" size="lg" busy={busy}>
            {busy ? 'Sending…' : 'Send proposal'}
          </SubmitButton>
          <Button variant="link" class="text-[17px]" onClick={() => setStep(0)}>
            Back
          </Button>
          <span class="text-[15px] text-ink-2">Your draft is kept in this browser.</span>
          <span role="alert" class="text-[15px] text-danger">
            {tried && !valid ? 'Fix the highlighted fields.' : serverError}
          </span>
        </div>
      </form>

      {step === 2 && (
        <div ref={doneRef} tabIndex={-1} role="status" class="flex flex-col gap-7 outline-hidden">
          <div class={surfaceClass('yellow', 'p-7 flex flex-col gap-2')}>
            <h2 class="m-0 text-[28px] font-bold">Thanks. Your proposal is in.</h2>
            <p class="m-0 text-[18px] leading-normal">Organisers review proposals when planning each meetup and reply to {d.email || 'your email'} either way.</p>
          </div>
          <ol class="m-0 p-0 list-none grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-5">
            {STAGES.map(([label, desc], i) => (
              <li key={label} class="flex flex-col gap-1.5">
                <span class={cx('w-9 h-9 rounded-full flex items-center justify-center font-bold', i === 0 ? 'bg-yellow' : 'bg-grey')}>{i + 1}</span>
                <span class="text-[18px] font-bold">{label}</span>
                <span class="text-[16px] text-ink-2 leading-[1.45]">{desc}</span>
              </li>
            ))}
          </ol>
          <Button href={nextHref} variant="outline-black" class="self-start text-[17px]">
            Meanwhile, come to the next meetup
          </Button>
        </div>
      )}
    </div>
  );
}
