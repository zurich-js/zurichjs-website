import { useEffect, useRef, useState } from 'preact/hooks';
import { TextArea, TextField } from '@zurichjs/design/islands/Field';
import { SubmitButton, useFocusFirstError, useFocusWhen } from './shared.tsx';

interface Profile {
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  twitter?: string;
  bluesky?: string;
  interests?: string[];
  image?: string;
}

const FIELDS: { k: keyof Profile; label: string; hint?: string; type?: string }[] = [
  { k: 'name', label: 'Name, as it should appear' },
  { k: 'title', label: 'Job title (optional)' },
  { k: 'company', label: 'Company (optional)' },
  { k: 'website', label: 'Website (optional)', type: 'url' },
  { k: 'github', label: 'GitHub (optional)', type: 'url' },
  { k: 'linkedin', label: 'LinkedIn (optional)', type: 'url' },
  { k: 'twitter', label: 'X (optional)', type: 'url' },
  { k: 'bluesky', label: 'Bluesky (optional)', type: 'url' },
];

/** Profile completion for accepted speakers. Reads ?token=, saves a draft for the organisers to publish. */
export default function SpeakerProfileForm() {
  const [token, setToken] = useState('');
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'saving' | 'saved'>('loading');
  const [p, setP] = useState<Profile>({});
  const [interests, setInterests] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [preview, setPreview] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const doneRef = useFocusWhen<HTMLDivElement>(state === 'saved');
  const focusError = useFocusFirstError(formRef);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('token') ?? '';
    setToken(t);
    if (!t) return setState('invalid');
    fetch(`/api/speaker-profile?token=${encodeURIComponent(t)}`)
      .then(async (r) => ({ ok: r.ok, body: (await r.json().catch(() => ({}))) as { profile?: Profile; error?: string } }))
      .then(({ ok, body }) => {
        if (!ok || !body.profile) {
          setError(body.error ?? 'This link is not valid or has expired. Ask the organisers for a new one.');
          return setState('invalid');
        }
        setP(body.profile);
        setPreview(body.profile.image);
        setInterests((body.profile.interests ?? []).join(', '));
        setState('ready');
      })
      .catch(() => {
        setError('We couldn’t load your profile. Check your connection and reload the page.');
        setState('invalid');
      });
  }, []);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (state === 'saving') return;
    if (!p.name?.trim()) {
      setNameError('Add your name as it should appear on the site.');
      setError('Fix the highlighted field.');
      focusError();
      return;
    }
    setNameError('');
    const fd = new FormData(formRef.current!);
    setState('saving');
    setError('');
    try {
      const r = await fetch(`/api/speaker-profile?token=${encodeURIComponent(token)}`, { method: 'POST', body: fd });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !body.ok) throw new Error(body.error || 'We couldn’t save that. Please try again.');
      setState('saved');
    } catch (err) {
      setError((err as Error).message);
      setState('ready');
    }
  };

  if (state === 'loading') return <p class="m-0 text-[18px] text-ink-2">Loading your profile…</p>;
  if (state === 'invalid')
    return (
      <p role="alert" class="m-0 text-[18px]">
        {error || 'This link is not valid or has expired.'} Write to{' '}
        <a href="mailto:hello@zurichjs.com" class="font-bold text-black">
          hello@zurichjs.com
        </a>{' '}
        and we’ll send a new one.
      </p>
    );
  if (state === 'saved')
    return (
      <div ref={doneRef} tabIndex={-1} role="status" class="bg-success-soft rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-2 max-w-[720px] outline-hidden">
        <div class="text-[26px] font-bold">Saved for review.</div>
        <p class="m-0 text-[18px] leading-[1.55]">An organiser checks your profile and publishes it. You can use the same link to change it again until it expires.</p>
      </div>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate encType="multipart/form-data" class="flex flex-col gap-5 max-w-[720px]">
      <div class="flex flex-col gap-2">
        <label class="text-[16px] font-bold" htmlFor="sp-photo">
          Photo (optional)
        </label>
        <div class="flex items-center gap-4">
          {preview && <img src={preview} alt="How you appear now" width={96} height={96} class="w-24 h-24 rounded-2xl object-cover bg-grey" />}
          <input
            id="sp-photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="sp-photo-hint"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f && f.size > 5 * 1024 * 1024) {
                setError('The photo is larger than 5 MB. Please choose a smaller one.');
                e.currentTarget.value = '';
                return;
              }
              if (f) setPreview(URL.createObjectURL(f));
            }}
            class="text-[16px]"
          />
        </div>
        <span id="sp-photo-hint" class="text-[15px] text-ink-2">
          JPEG, PNG or WebP, up to 5 MB. A square photo of your face works best.
        </span>
      </div>
      {FIELDS.map((f) => (
        <TextField
          key={f.k}
          label={f.label}
          name={f.k}
          type={f.type ?? 'text'}
          {...(f.type === 'url' ? { inputMode: 'url' as const, autoCapitalize: 'none' } : {})}
          {...(f.k === 'name'
            ? { required: true, autoComplete: 'name', invalid: !!nameError, error: nameError }
            : f.k === 'title'
              ? { autoComplete: 'organization-title' }
              : f.k === 'company'
                ? { autoComplete: 'organization' }
                : {})}
          value={(p[f.k] as string | undefined) ?? ''}
          onInput={(e) => setP({ ...p, [f.k]: e.currentTarget.value })}
        />
      ))}
      <TextArea
        label="Short bio (optional)"
        hint="Two or three sentences in the third person, plain text."
        name="bio"
        rows={4}
        maxLength={1200}
        value={p.bio ?? ''}
        onInput={(e) => setP({ ...p, bio: e.currentTarget.value })}
      />
      <TextField
        label="Topics you talk about (optional)"
        hint="Separated by commas, for example: React, testing, accessibility."
        name="interests"
        value={interests}
        onInput={(e) => setInterests(e.currentTarget.value)}
      />
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="black" size="lg" busy={state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save for review'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {error}
        </span>
      </div>
      <p class="m-0 text-[15px] text-ink-2">Nothing is published until an organiser approves it. Your email address is never shown on the site.</p>
    </form>
  );
}
