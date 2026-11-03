import { CFP_AGREE_ERROR, MAX_TOPICS, TALK_LENGTHS, TALK_LEVELS, TALK_TOPICS, submitForm } from '@zurichjs/forms/client';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx, surfaceClass } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { SocialLabel } from './SocialLabel.tsx';
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
  agree: CFP_AGREE_ERROR,
};
type Field = keyof typeof MESSAGES;

/** The opening sentence: shown with the form, hidden once the proposal is sent. */
export const CFP_SUB = 'Propose a talk for a ZurichJS meetup. This page is our call for papers (CFP): open all year, no account needed, and first-time speakers are welcome.';

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
  bluesky: string;
  company: string;
  website: string;
  firstTalk: boolean;
  title: string;
  abstract: string;
  format: Length;
  level: Level;
  topics: string[];
  agree: boolean;
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
  bluesky: '',
  company: '',
  website: '',
  firstTalk: false,
  title: '',
  abstract: '',
  format: 'Standard',
  level: '',
  topics: [],
  agree: false,
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
    d.company && `Company: ${d.company}`,
    `LinkedIn: ${d.linkedin}`,
    d.github && `GitHub: ${d.github}`,
    d.twitter && `X: ${d.twitter}`,
    d.bluesky && `Bluesky: ${d.bluesky}`,
    d.website && `Website: ${d.website}`,
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
const section = 'border-0 p-0 m-0 flex flex-col gap-4 min-w-0';
const sectionTitle = 'text-[24px] font-bold mb-3.5 p-0';

const hiddenInput = 'absolute inset-0 w-full h-full m-0 opacity-0 cursor-pointer disabled:cursor-not-allowed';
const choice = 'relative has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2 cursor-pointer';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_SIDE = 1600;

/** Shrinks a photo to at most 1600 px on its longer side, as JPEG, so it uploads quickly (well under the 5 MB limit). */
async function shrinkPhoto(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, PHOTO_MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

/** The optional speaker photo: a file picker with a round preview, like the speaker pages show it. */
function PhotoField({ photo, error, onChange }: { photo: { file: Blob; url: string } | null; error: string; onChange: (f: File | null) => void }) {
  return (
    <div class="flex flex-col gap-2">
      <span id="cfp-photo-label" class="text-[16px] font-bold">
        {optional('Photo')}
      </span>
      <div class="flex items-center gap-4 flex-wrap">
        <span class="w-20 h-20 rounded-full bg-grey overflow-hidden flex-none flex items-center justify-center text-grey-text text-[14px]">
          {photo ? <img src={photo.url} alt="Preview of your upload" class="w-full h-full object-cover" /> : 'No photo'}
        </span>
        <div class="flex flex-col gap-1.5">
          <label class="inline-flex self-start items-center min-h-[44px] px-5 rounded-pill border-2 border-black bg-white font-bold text-[16px] cursor-pointer hover:bg-grey has-focus-visible:outline-3 has-focus-visible:outline-blue has-focus-visible:outline-offset-2">
            {photo ? 'Choose another photo' : 'Choose a photo'}
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              aria-labelledby="cfp-photo-label"
              aria-describedby="cfp-photo-hint"
              aria-invalid={!!error || undefined}
              class="sr-only"
              onChange={(e) => onChange(e.currentTarget.files?.[0] ?? null)}
            />
          </label>
          {photo && (
            <button
              type="button"
              onClick={() => onChange(null)}
              class="self-start p-0 border-0 bg-transparent font-bold text-black underline underline-offset-[3px] cursor-pointer text-[15px]"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
      <span id="cfp-photo-hint" class="text-[16px] text-grey-text leading-[1.45]">
        A square photo of your face works best: JPEG, PNG or WebP.
      </span>
      {error && (
        <span role="alert" class="text-[14px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

interface Props {
  nextHref: string;
}

/** Notes beside the form: what people ask before proposing. */
const NOTES = [
  [
    'Does it have to be about JavaScript?',
    'Mostly JavaScript and the web, but not only. Past talks covered Laravel, career development, communication, observability and infrastructure as code.',
  ],
  ['First talk? We help', 'First-time speakers are welcome. Tick the box in the form and an organiser helps you prepare.'],
  ['How talks are picked', 'We host a meetup most months, with two or three talks. Organisers pick talks for each one by theme and by the speaking slots available.'],
] as const;

/**
 * Talk proposals for meetups on /cfp (ZurichJS Conf's call for papers is over).
 * Production's fields (speaker profile, length, level, topics); the photo is
 * asked for after acceptance through the private profile link. The draft
 * stays in this browser and is cleared after a successful send.
 */
export default function CfpForm({ nextHref }: Props) {
  const [sent, setSent] = useState(false);
  // The photo is never saved with the draft: it stays in memory until the proposal is sent.
  const [photo, setPhoto] = useState<{ file: Blob; url: string } | null>(null);
  const [photoError, setPhotoError] = useState('');
  const choosePhoto = async (f: File | null) => {
    setPhotoError('');
    if (photo) URL.revokeObjectURL(photo.url);
    if (!f) return setPhoto(null);
    if (!PHOTO_TYPES.includes(f.type)) {
      setPhoto(null);
      return setPhotoError('Use a JPEG, PNG or WebP photo.');
    }
    const file = await shrinkPhoto(f);
    if (file.size > 5 * 1024 * 1024) {
      setPhoto(null);
      return setPhotoError('The photo is larger than 5 MB. Please choose a smaller one.');
    }
    setPhoto({ file, url: URL.createObjectURL(file) });
  };
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const { busy, run } = useSubmitOnce();
  const [serverError, setServerError] = useState('');
  const [cleared, setCleared] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);
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

  // The draft lives in this browser only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD(readDraft(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // The opening sentence is static HTML: hide it once the proposal is sent.
  useEffect(() => {
    const sub = document.getElementById('cfp-sub');
    if (sub?.parentElement) sub.parentElement.hidden = sent;
  }, [sent]);

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
    void choosePhoto(null);
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
      const r = await submitForm('cfp', { ...d, website_url: honeypotValue(formRef.current) }, photo?.file);
      if (!r.ok) return setServerError(r.error);
      track('form_submit', { form: 'cfp' });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setSent(true);
      window.scrollTo(0, 0);
    });
  };

  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(`Talk proposal: ${d.title}`)}&body=${encodeURIComponent(asText(d))}`;

  return (
    <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-x-[clamp(40px,6vw,96px)] gap-y-12 items-start">
      {!sent && (
        <form ref={formRef} id="proposal" onSubmit={submit} noValidate class="relative flex flex-col gap-10 min-w-0 max-w-[760px] scroll-mt-6" aria-label="Talk proposal">
          <Honeypot />
          <div class="flex flex-col gap-2">
            <RequiredNote />
            <p class="m-0 text-[16px] leading-[1.5] text-ink-2">
              Your answers, including your name and email, are saved in this browser only, until you send the proposal or clear them.{' '}
              <button type="button" onClick={clearDraft} class="p-0 border-0 bg-transparent font-bold text-black underline underline-offset-[3px] cursor-pointer text-[16px]">
                Clear saved answers
              </button>
            </p>
            <p role="status" class="m-0 text-[16px] font-bold text-success empty:hidden">
              {cleared ? 'Saved answers cleared.' : ''}
            </p>
          </div>
          <fieldset class={section}>
            <legend class={sectionTitle}>About you</legend>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4 items-start">
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
              />
            </div>
            <p class="m-0 -mt-2 text-[16px] leading-[1.5] text-grey-text">Your email is only used to reply, and to find your speaker page if you’ve spoken here before.</p>
            <div class="flex flex-col gap-3">
              <Checkbox label="I’ve spoken at ZurichJS before." name="returning" checked={d.returning} onChange={(e) => set('returning', e.currentTarget.checked)} />
              {d.returning && (
                <p class="m-0 pl-[34px] text-[16px] leading-[1.5] text-ink-2">
                  Leave your profile below empty to keep your speaker page as it is. Anything you add goes to the organisers, who update your page; it isn’t published straight
                  away.
                </p>
              )}
              <Checkbox
                label="This would be my first talk. I’d like help preparing."
                name="firstTalk"
                checked={d.firstTalk}
                onChange={(e) => set('firstTalk', e.currentTarget.checked)}
              />
            </div>
          </fieldset>

          <fieldset class={section}>
            <legend class={sectionTitle}>Speaker profile</legend>
            <p class="m-0 -mt-2 text-[16px] leading-[1.5] text-grey-text">What appears on your speaker page if your talk is accepted.</p>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4 items-start">
              <TextField
                label={opt('Job title')}
                name="jobTitle"
                autoComplete="organization-title"
                required={!d.returning}
                placeholder="Senior frontend developer"
                value={d.jobTitle}
                onInput={(e) => set('jobTitle', e.currentTarget.value)}
                invalid={bad('jobTitle')}
                error={err('jobTitle')}
              />
              <TextField label={optional('Company')} name="company" autoComplete="organization" value={d.company} onInput={(e) => set('company', e.currentTarget.value)} />
            </div>
            <TextArea
              label={opt('Bio')}
              name="bio"
              rows={4}
              maxLength={3000}
              required={!d.returning}
              hint="Two or three sentences: what you work on and what you care about."
              value={d.bio}
              onInput={(e) => set('bio', e.currentTarget.value)}
              invalid={bad('bio')}
              error={err('bio')}
            />
            <PhotoField photo={photo} error={photoError} onChange={choosePhoto} />
          </fieldset>

          <fieldset class={section}>
            <legend class={sectionTitle}>Socials</legend>
            <p class="m-0 -mt-2 text-[16px] leading-[1.5] text-grey-text">Usernames, handles or links all work, except LinkedIn, which needs the full link.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <TextField
                label={<SocialLabel kind="linkedin" text={opt('LinkedIn')} />}
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
              <TextField
                label={<SocialLabel kind="github" text={optional('GitHub')} />}
                name="github"
                placeholder="your-name"
                autoCapitalize="none"
                spellcheck={false}
                value={d.github}
                onInput={(e) => set('github', e.currentTarget.value)}
              />
              <TextField
                label={<SocialLabel kind="x" text={optional('X')} />}
                name="twitter"
                placeholder="@your-name"
                autoCapitalize="none"
                spellcheck={false}
                value={d.twitter}
                onInput={(e) => set('twitter', e.currentTarget.value)}
              />
              <TextField
                label={<SocialLabel kind="bluesky" text={optional('Bluesky')} />}
                name="bluesky"
                placeholder="@your-name.bsky.social"
                autoCapitalize="none"
                spellcheck={false}
                value={d.bluesky}
                onInput={(e) => set('bluesky', e.currentTarget.value)}
              />
              <TextField
                label={<SocialLabel kind="website" text={optional('Website')} />}
                name="website"
                type="url"
                inputMode="url"
                placeholder="https://your-site.dev"
                autoCapitalize="none"
                spellcheck={false}
                value={d.website}
                onInput={(e) => set('website', e.currentTarget.value)}
              />
            </div>
          </fieldset>

          <fieldset class={section}>
            <legend class={sectionTitle}>Your talk</legend>
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
          <fieldset class={section}>
            <legend class={sectionTitle}>Before you send</legend>
            <div class={cx('rounded-card p-5 flex flex-col gap-2', bad('agree') ? 'bg-danger/10' : 'bg-grey')}>
              <Checkbox
                label="I understand that travel and accommodation can’t be covered for meetup talks, because our events are free, and that acceptance depends on the theme and on the speaking slots at upcoming meetups."
                name="agree"
                required
                checked={d.agree}
                onChange={(e) => set('agree', e.currentTarget.checked)}
                aria-invalid={bad('agree') || undefined}
                aria-describedby={bad('agree') ? 'cfp-agree-error' : undefined}
              />
              {bad('agree') && (
                <p id="cfp-agree-error" class="m-0 pl-[34px] text-[15px] text-danger">
                  {err('agree')}
                </p>
              )}
            </div>
          </fieldset>
          <div class="flex flex-wrap gap-4 items-center">
            <SubmitButton variant="black" size="lg" busy={busy}>
              {busy ? 'Sending…' : 'Send proposal'}
            </SubmitButton>
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
      )}

      {!sent && (
        <aside aria-label="Before you propose" class="flex flex-col gap-7 md:sticky md:top-6">
          {NOTES.map(([h, p]) => (
            <div key={h} class="flex flex-col gap-1.5">
              <h2 class="m-0 text-[20px] font-bold leading-[1.25]">{h}</h2>
              <p class="m-0 text-[16px] leading-[1.55] text-ink-2">{p}</p>
            </div>
          ))}
          <div class="flex flex-col gap-1.5">
            <h2 class="m-0 text-[20px] font-bold leading-[1.25]">Spoken here before?</h2>
            <p class="m-0 text-[16px] leading-[1.55] text-ink-2">
              Use the same email and we match your proposal to your speaker page. Anything new you send, like a photo or links, goes to the organisers, who update your page.
            </p>
          </div>
        </aside>
      )}

      {sent && (
        <div ref={doneRef} tabIndex={-1} role="status" class="md:col-span-2 max-w-[880px] flex flex-col gap-7 outline-hidden">
          <div class={surfaceClass('success', 'p-7 flex flex-col gap-2')}>
            <h2 class="m-0 text-[28px] font-bold">Thank you very much. Your proposal is in.</h2>
            <p class="m-0 text-[18px] leading-normal">
              We’ll reach out in the coming days about your proposal, at {d.email || 'your email'}. Your saved answers were cleared from this browser.
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
