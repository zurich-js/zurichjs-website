import { MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, submitForm } from '@zurichjs/forms/client';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx, surfaceClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Honeypot, RequiredNote, SubmitButton, fieldErrors, honeypotValue, optional, useFocusFirstError, useFocusWhen, useSubmitOnce } from './shared.tsx';

const DRAFT_KEY = 'zurichjs-cfp-draft';
const EMAIL = 'hello@zurichjs.com';
const STAGES = [
  ['Received', 'We have your proposal.'],
  ['Accepted', 'An organiser says yes.'],
  ['Scheduled', 'We pick a meetup together.'],
  ['Given', 'It appears on your speaker page.'],
] as const;
const MESSAGES = {
  name: 'Add your name so we know who to reply to.',
  email: 'Enter an email like name@example.com so we can reply.',
  jobTitle: 'Add your job title, for example Frontend developer.',
  bio: 'Add a short bio. Two or three sentences is enough.',
  linkedin: 'Paste your LinkedIn profile link, like https://www.linkedin.com/in/your-name.',
  title: 'Add a working title. You can change it later.',
  abstract: 'Tell us what people will learn, in a few sentences.',
  format: '',
  level: 'Choose who the talk is for.',
  topics: 'Choose at least one topic.',
};
type Field = keyof typeof MESSAGES;

/** Opening sentence per step; the opening is static HTML, so the island keeps it in step. */
export const CFP_SUBS = [
  'Propose a talk for a ZurichJS meetup. This page is our call for papers (CFP): open all year, no account needed, and first-time speakers are welcome.',
  'Step 2 of 2: your proposal.',
  '',
];

type Length = (typeof TALK_LENGTHS)[number]['value'];
type Level = (typeof TALK_LEVELS)[number]['value'] | '';
interface Draft {
  name: string;
  email: string;
  returning: boolean;
  jobTitle: string;
  bio: string;
  linkedin: string;
  github: string;
  twitter: string;
  firstTalk: boolean;
  title: string;
  abstract: string;
  format: Length;
  level: Level;
  topics: string[];
}
const EMPTY: Draft = {
  name: '',
  email: '',
  returning: false,
  jobTitle: '',
  bio: '',
  linkedin: '',
  github: '',
  twitter: '',
  firstTalk: false,
  title: '',
  abstract: '',
  format: 'Standard',
  level: '',
  topics: [],
};

/** Reads a saved draft, including drafts from the earlier form (format in minutes, 35 for a deep dive). */
function readDraft(raw: string): Draft {
  const saved = JSON.parse(raw) as Partial<Omit<Draft, 'format'>> & { format?: unknown };
  const format: Length = saved.format === 5 || saved.format === 'Lightning' ? 'Lightning' : 'Standard';
  const topics = Array.isArray(saved.topics) ? saved.topics.filter((t): t is string => (TALK_TOPICS as readonly string[]).includes(String(t))) : [];
  const level = TALK_LEVELS.some((l) => l.value === saved.level) ? (saved.level as Level) : '';
  return { ...EMPTY, ...saved, format, topics, level };
}

function saveDraft(d: Draft) {
  try {
    if (JSON.stringify(d) === JSON.stringify(EMPTY)) localStorage.removeItem(DRAFT_KEY);
    else localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* storage blocked: the form still works, nothing is saved */
  }
}

const lengthLabel = (v: Length) => TALK_LENGTHS.find((l) => l.value === v)!;

/** The proposal as plain text, for the email fallback. */
const asText = (d: Draft) =>
  [
    `Title: ${d.title}`,
    `Length: ${lengthLabel(d.format).label} (${lengthLabel(d.format).hint})`,
    `Level: ${TALK_LEVELS.find((l) => l.value === d.level)?.label ?? ''}`,
    `Topics: ${d.topics.join(', ')}`,
    '',
    d.abstract,
    '',
    `Name: ${d.name}`,
    `Job title: ${d.jobTitle}`,
    `LinkedIn: ${d.linkedin}`,
    d.github && `GitHub: ${d.github}`,
    d.twitter && `X: ${d.twitter}`,
    d.returning && 'I have spoken at ZurichJS before.',
    d.firstTalk && 'This would be my first talk. I would like help preparing.',
    '',
    d.bio,
  ]
    .filter((l) => l !== false && l !== '' && l !== undefined)
    .join('\n');

/** A group of native radios or checkboxes shown as cards or pills; the input itself stays keyboard-operable. */
function ChoiceGroup({
  legend,
  hint,
  error,
  radio,
  children,
  class: extra,
}: {
  legend: string;
  hint?: ComponentChildren;
  error?: string;
  /** One choice only: the group is a radiogroup, which carries the invalid state (radios cannot). */
  radio?: boolean;
  children: ComponentChildren;
  class?: string;
}) {
  const id = `cfp-${legend.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <fieldset
      role={radio ? 'radiogroup' : undefined}
      aria-invalid={(radio && !!error) || undefined}
      class="border-0 p-0 m-0 flex flex-col gap-2 min-w-0"
      aria-describedby={[hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined}
    >
      <legend class="text-[16px] font-bold p-0 mb-1.5">{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} class="m-0 mb-1 text-[16px] text-grey-text leading-[1.45]">
          {hint}
        </p>
      )}
      <div class={extra}>{children}</div>
      <span id={`${id}-error`} class="text-[14px] text-danger min-h-[1.2em]" aria-live="polite">
        {error}
      </span>
    </fieldset>
  );
}

/** The native input covers its card or pill, invisible: clicks, taps and the keyboard all reach it. */
const hiddenInput = 'absolute inset-0 w-full h-full m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed';
const choice = 'relative has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2 cursor-pointer';

interface Props {
  nextHref: string;
  confHref: string;
  confCfp: string;
  confState: string;
}

/**
 * Talk proposals on /cfp: choose meetup or conference, then the proposal.
 * Production's fields (speaker profile, length, level, topics); the photo is
 * asked for after acceptance through the private profile link. The draft
 * stays in this browser and is cleared after a successful send.
 */
export default function CfpForm({ nextHref, confHref, confCfp, confState }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const { busy, run } = useSubmitOnce();
  const [serverError, setServerError] = useState('');
  const [cleared, setCleared] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(step === 2);
  // Saved on every change, not in an effect, so the last keystroke survives a reload or a closed tab.
  const latest = useRef(d);
  latest.current = d;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    const next = { ...latest.current, [k]: v };
    latest.current = next;
    setCleared(false);
    setD(next);
    saveDraft(next);
  };

  // The draft lives in this browser only. `#proposal` opens the form directly.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD(readDraft(raw));
    } catch {
      /* ignore */
    }
    const open = () => location.hash === '#proposal' && setStep((s) => (s === 0 ? 1 : s));
    open();
    window.addEventListener('hashchange', open);
    return () => window.removeEventListener('hashchange', open);
  }, []);

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

  const errs = fieldErrors('cfp', d, MESSAGES);
  const valid = Object.keys(errs).length === 0;
  const bad = (k: Field) => tried && !!errs[k];
  const err = (k: Field) => (bad(k) ? errs[k] : '');
  const opt = (label: string) => (d.returning ? optional(label) : label);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setD(EMPTY);
    setTried(false);
    setServerError('');
    setCleared(true);
    formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  };

  const submit = (e: Event) => {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    void run(async () => {
      setServerError('');
      const r = await submitForm('cfp', { ...d, website_url: honeypotValue(formRef.current) });
      if (!r.ok) return setServerError(r.error);
      track('form_submit', { form: 'cfp' });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setStep(2);
      window.scrollTo(0, 0);
    });
  };

  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(`Talk proposal: ${d.title}`)}&body=${encodeURIComponent(asText(d))}`;

  return (
    <div class="max-w-[880px] flex flex-col gap-7">
      {step === 0 && (
        <>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
            <button ref={startRef} type="button" onClick={() => setStep(1)} class="text-left cursor-pointer border-0 bg-yellow rounded-card p-7 flex flex-col gap-2.5">
              <span class="text-[24px] font-bold">At a ZurichJS meetup</span>
              <span class="text-[17px] leading-normal">Open all year. A lightning talk (5 minutes) or a standard talk (25 minutes). Good for a first talk.</span>
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
              <span class="text-[17px] leading-normal text-ink-2">The conference runs its own talk proposals. {confCfp}</span>
              <span class="font-bold text-[17px] mt-1.5 underline underline-offset-[3px]">Go to conf.zurichjs.com</span>
            </a>
          </div>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-x-12 gap-y-8 pt-3">
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Does it have to be about JavaScript?</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                Mostly JavaScript and the web, but not only. Past talks covered Laravel, career development, communication, observability and infrastructure as code. Talks from
                beginner to advanced level are welcome.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">First talk? We help</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                First-time speakers are welcome. Tick the box in the form and an organiser helps you prepare, with guidance on public speaking.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">How it works</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                We host a meetup most months, with two or three talks. Organisers pick talks for each meetup by theme and availability, and reply by email.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Travel</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                We can’t promise to cover travel or accommodation for meetup speakers. If you would travel in, say so in your proposal and we’ll tell you what we can offer for that
                meetup. Either way, we’re happy to help with travel tips and local recommendations.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">What we ask for</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                About you: your name, email, job title, a short bio and LinkedIn, with GitHub and X if you like. About the talk: a title, a description, the length, the level and
                its topics. No photo yet: if your talk is accepted, we send you a private link to add one and check your speaker page.
              </p>
            </div>
            <div class="flex flex-col gap-3">
              <h2 class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">Spoken here before?</h2>
              <p class="m-0 text-[18px] leading-[1.6] text-ink-2">
                Use the same email and we match your proposal to your speaker page. To update your photo, bio or links, ask us at{' '}
                <a href={`mailto:${EMAIL}?subject=${encodeURIComponent('Speaker profile link')}`} class="font-bold text-black">
                  {EMAIL}
                </a>{' '}
                for your private profile link.
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
        <div class="flex flex-col gap-2">
          <RequiredNote />
          <p class="m-0 text-[16px] leading-[1.5] text-ink-2">
            Your answers, including your name and email, are saved in this browser only, until you send the proposal or clear them.{' '}
            <button type="button" onClick={clearDraft} class="p-0 border-0 bg-transparent font-bold text-black underline underline-offset-[3px] cursor-pointer text-[16px]">
              Clear saved answers
            </button>
          </p>
          <p role="status" class="m-0 text-[16px] text-ink-2 empty:hidden">
            {cleared ? 'Saved answers cleared.' : ''}
          </p>
        </div>
        <fieldset class="border-0 p-0 m-0 flex flex-col gap-4 min-w-0">
          <legend class="text-[24px] font-bold mb-3.5 p-0">About you</legend>
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            <TextField
              label="Name"
              name="name"
              autoComplete="name"
              required
              value={d.name}
              onInput={(e) => set('name', e.currentTarget.value)}
              invalid={bad('name')}
              error={err('name')}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={d.email}
              onInput={(e) => set('email', e.currentTarget.value)}
              invalid={bad('email')}
              error={err('email')}
              hint="Only used to reply and to find your existing speaker page."
            />
          </div>
          <Checkbox label="I’ve spoken at ZurichJS before." name="returning" checked={d.returning} onChange={(e) => set('returning', e.currentTarget.checked)} />
          {d.returning && (
            <p class="m-0 text-[16px] leading-[1.5] text-ink-2">
              Leave the profile fields below empty to keep your speaker page as it is. Anything you add goes to the organisers, who update your page; it isn’t published straight
              away.
            </p>
          )}
          <TextField
            label={opt('Job title')}
            name="jobTitle"
            autoComplete="organization-title"
            required={!d.returning}
            placeholder="For example Senior frontend developer"
            value={d.jobTitle}
            onInput={(e) => set('jobTitle', e.currentTarget.value)}
            invalid={bad('jobTitle')}
            error={err('jobTitle')}
          />
          <TextArea
            label={opt('Short bio')}
            name="bio"
            rows={4}
            maxLength={3000}
            required={!d.returning}
            hint="Two or three sentences, for your speaker page: what you work on and what you care about."
            value={d.bio}
            onInput={(e) => set('bio', e.currentTarget.value)}
            invalid={bad('bio')}
            error={err('bio')}
          />
          <TextField
            label={opt('LinkedIn profile')}
            name="linkedin"
            type="url"
            inputMode="url"
            autoComplete="url"
            required={!d.returning}
            placeholder="https://www.linkedin.com/in/your-name"
            value={d.linkedin}
            onInput={(e) => set('linkedin', e.currentTarget.value)}
            invalid={bad('linkedin')}
            error={err('linkedin')}
          />
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            <TextField
              label={optional('GitHub')}
              name="github"
              hint="Username or link."
              autoCapitalize="none"
              spellcheck={false}
              value={d.github}
              onInput={(e) => set('github', e.currentTarget.value)}
            />
            <TextField
              label={optional('X')}
              name="twitter"
              hint="Handle or link."
              autoCapitalize="none"
              spellcheck={false}
              value={d.twitter}
              onInput={(e) => set('twitter', e.currentTarget.value)}
            />
          </div>
          <p class="m-0 text-[16px] leading-[1.5] text-ink-2">
            <strong class="text-black">Photo:</strong> not needed now. If your talk is accepted, we send you a private link to add one. A square photo of your face, at least 400 by
            400 pixels, works best.
          </p>
          <Checkbox
            label="This would be my first talk. I’d like help preparing."
            name="firstTalk"
            checked={d.firstTalk}
            onChange={(e) => set('firstTalk', e.currentTarget.checked)}
          />
        </fieldset>
        <fieldset class="border-0 p-0 m-0 flex flex-col gap-4 min-w-0">
          <legend class="text-[24px] font-bold mb-3.5 p-0">Your talk</legend>
          <TextField label="Title" name="title" required value={d.title} onInput={(e) => set('title', e.currentTarget.value)} invalid={bad('title')} error={err('title')} />
          <TextArea
            label="What will people learn?"
            name="abstract"
            rows={5}
            maxLength={5000}
            required
            value={d.abstract}
            onInput={(e) => set('abstract', e.currentTarget.value)}
            invalid={bad('abstract')}
            error={err('abstract')}
            hint="The key takeaways, and any demos or examples you’ll show. A short paragraph is enough; we use it on the event page."
          />
          <ChoiceGroup legend="Length" radio class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2.5">
            {TALK_LENGTHS.map((l) => (
              <label
                key={l.value}
                class={cx(
                  choice,
                  'min-h-[68px] py-3 px-[18px] rounded-2xl flex flex-col gap-0.5 border border-grey-line bg-white has-checked:border-black has-checked:bg-yellow has-checked:outline-1 has-checked:outline-black',
                )}
              >
                <input type="radio" name="format" value={l.value} checked={d.format === l.value} onChange={() => set('format', l.value)} class={hiddenInput} />
                <span class="font-bold text-[17px]">{l.label}</span>
                <span class="text-[15px] text-ink-2">{l.hint}</span>
              </label>
            ))}
          </ChoiceGroup>
          <ChoiceGroup legend="Level" radio error={err('level')} class="flex flex-wrap gap-2">
            {TALK_LEVELS.map((l) => (
              <label
                key={l.value}
                class={cx(
                  choice,
                  'min-h-[44px] px-[18px] inline-flex items-center rounded-pill border border-black font-bold text-[16px] bg-white hover:bg-grey has-checked:bg-black has-checked:text-white',
                )}
              >
                <input type="radio" name="level" value={l.value} checked={d.level === l.value} onChange={() => set('level', l.value)} class={hiddenInput} />
                {l.label}
              </label>
            ))}
          </ChoiceGroup>
          <ChoiceGroup legend="Topics" hint={`Choose up to ${MAX_TOPICS}.`} error={err('topics')} class="flex flex-wrap gap-2">
            {TALK_TOPICS.map((t) => {
              const on = d.topics.includes(t);
              return (
                <label
                  key={t}
                  class={cx(
                    choice,
                    'min-h-[44px] px-4 inline-flex items-center rounded-pill border border-black text-[16px] bg-white hover:bg-grey has-checked:bg-black has-checked:text-white has-disabled:opacity-50 has-disabled:cursor-not-allowed',
                  )}
                >
                  <input
                    type="checkbox"
                    name="topics"
                    value={t}
                    checked={on}
                    disabled={!on && d.topics.length >= MAX_TOPICS}
                    onChange={() => set('topics', on ? d.topics.filter((x) => x !== t) : [...d.topics, t])}
                    aria-invalid={bad('topics') || undefined}
                    class={hiddenInput}
                  />
                  {t}
                </label>
              );
            })}
          </ChoiceGroup>
        </fieldset>
        <div class="flex flex-wrap gap-4 items-center">
          <SubmitButton variant="black" size="lg" busy={busy}>
            {busy ? 'Sending…' : 'Send proposal'}
          </SubmitButton>
          <Button variant="link" class="text-[17px]" onClick={() => setStep(0)}>
            Back
          </Button>
          <span role="alert" class="text-[15px] text-danger">
            {tried && !valid ? 'Fix the highlighted fields.' : serverError}
          </span>
          {serverError && (
            <span class="text-[15px] text-ink-2 basis-full">
              Your proposal is still here. You can try again, or email it to{' '}
              <a href={mailto} class="font-bold text-black">
                {EMAIL}
              </a>
              .
            </span>
          )}
        </div>
      </form>

      {step === 2 && (
        <div ref={doneRef} tabIndex={-1} role="status" class="flex flex-col gap-7 outline-hidden">
          <div class={surfaceClass('yellow', 'p-7 flex flex-col gap-2')}>
            <h2 class="m-0 text-[28px] font-bold">Thanks. Your proposal is in.</h2>
            <p class="m-0 text-[18px] leading-normal">
              Organisers review proposals when planning each meetup and reply to {d.email || 'your email'}. If your talk is accepted, we send you a private link to add your photo
              and check your speaker page. Your saved answers were cleared from this browser.
            </p>
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
          <p class="m-0 text-[17px] leading-[1.55] text-ink-2">
            A question about your proposal? Write to{' '}
            <a href={`mailto:${EMAIL}`} class="font-bold text-black">
              {EMAIL}
            </a>
            .
          </p>
          <Button href={nextHref} variant="outline-black" class="self-start text-[17px]">
            Meanwhile, come to the next meetup
          </Button>
        </div>
      )}
    </div>
  );
}
