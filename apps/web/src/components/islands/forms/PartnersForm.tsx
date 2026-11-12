import { submitForm } from '@zurichjs/forms/client';
import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { Button } from '@zurichjs/design/islands/Button';
import { Notice } from '@zurichjs/design/islands/Notice';
import { ChipGroup, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError, useFocusWhen } from './shared.tsx';
import { WAY_LABEL, intentFromQuery, intentLabel, partnerPayload, type Tier, type Way, TIERS, asTier, asWay } from './partners-intent.ts';

const MESSAGES = { org: 'Add your company or organisation.', name: 'Add your name so we know who to reply to.', email: 'Enter an email like name@company.com.' };

/** What to tell us, per intent: the message field's hint. */
const PROMPTS: Record<Way, string> = {
  partner: 'Which option suits you (yearly, monthly or one-time), and who you would like to reach.',
  host: 'Where your space is, how many people it holds, which months suit you, and whether you could also cover food or speaker travel.',
  food: 'Which meetup or months you have in mind, and roughly how many people you could cater for.',
  community: 'Your community or event, and what you would like to do together.',
  unsure: 'What your team works on and what you would like to get out of it.',
};

/** Set by the "Choose this" links on /partners (see partners.astro), possibly before this island hydrates. */
declare global {
  interface Window {
    __zjsPartnerWay?: string;
    __zjsPartnerTier?: string;
  }
}

/** Partner inquiry on /partners. */
export default function PartnersForm({ nextHref, email }: { nextHref: string; email: string }) {
  const [f, setF] = useState({ org: '', name: '', email: '', phone: '', way: 'unsure' as Way, tier: '' as Tier | '', capacity: '', msg: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const busyRef = useRef(false);
  const synced = useRef(false);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  // The tiers and cards above preselect a way of helping (and a sponsorship tier), from the link or the URL.
  useEffect(() => {
    const initial = intentFromQuery(new URLSearchParams(location.search), { way: window.__zjsPartnerWay, tier: window.__zjsPartnerTier });
    if (initial) setF((p) => ({ ...p, ...initial }));
    const onWay = (e: Event) => {
      const w = asWay((e as CustomEvent<string>).detail);
      if (w) setF((p) => ({ ...p, way: w, tier: w === 'partner' ? asTier(window.__zjsPartnerTier) : '' }));
    };
    document.addEventListener('zjs:partner-way', onWay);
    return () => document.removeEventListener('zjs:partner-way', onWay);
  }, []);

  // Keep the choice in the address, so a reload or a shared link keeps it.
  useEffect(() => {
    // Not on the first render: a plain /partners visit keeps its plain address.
    if (!synced.current) {
      synced.current = true;
      return;
    }
    const u = new URL(location.href);
    if (u.searchParams.get('way') === f.way && (u.searchParams.get('tier') ?? '') === f.tier) return;
    u.searchParams.set('way', f.way);
    if (f.tier) u.searchParams.set('tier', f.tier);
    else u.searchParams.delete('tier');
    history.replaceState(history.state, '', u);
    window.__zjsPartnerWay = f.way;
    window.__zjsPartnerTier = f.tier;
  }, [f.way, f.tier]);

  const errs = fieldErrors('partners', f, MESSAGES);
  const valid = Object.keys(errs).length === 0;
  const bad = (k: keyof typeof MESSAGES) => tried && !!errs[k];
  const set = (k: keyof typeof f) => (e: { currentTarget: { value: string } }) => setF({ ...f, [k]: e.currentTarget.value });

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busyRef.current) return;
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setServerError('');
    const r = await submitForm('partners', { ...partnerPayload(f), website_url: honeypotValue(formRef.current) });
    busyRef.current = false;
    setBusy(false);
    // Everything typed stays in the form, so a failed send can simply be retried.
    if (!r.ok) return setServerError(r.error);
    track('form_submit', { form: 'partners' });
    setSent(true);
  };

  if (sent)
    return (
      <Notice tone="success" live focusRef={doneRef} title="Thanks, we have your inquiry.">
        <p class="m-0 text-body">
          You asked about: <b>{intentLabel(f.way, f.tier)}</b>. The organisers have it, and one of us will reply to {f.email} from {email} to plan the next step. Nothing is agreed
          until you confirm.
        </p>
        <div class="flex flex-wrap gap-2.5 mt-1.5">
          <Button href={nextHref} variant="cta">
            See the next meetup
          </Button>
          <Button href="/about" variant="secondary">
            About ZurichJS
          </Button>
        </div>
      </Notice>
    );

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-4">
      <Honeypot />
      <ChipGroup<Way>
        label="What would you like to talk about?"
        value={f.way}
        onChange={(way) => setF({ ...f, way, tier: way === 'partner' ? f.tier : '' })}
        options={(Object.keys(WAY_LABEL) as Way[]).map((value) => ({ value, label: WAY_LABEL[value] }))}
      />
      {f.way === 'partner' && (
        <SelectField label="Sponsorship package (optional)" name="tier" value={f.tier} onChange={(e) => setF({ ...f, tier: asTier(e.currentTarget.value) })}>
          <option value="">Not decided yet</option>
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </SelectField>
      )}
      <p class="m-0 text-body" data-testid="partner-intent">
        You’re asking about: <b>{intentLabel(f.way, f.tier)}</b>
      </p>
      <TextField label="Organisation" name="org" autoComplete="organization" value={f.org} onInput={set('org')} invalid={bad('org')} error={bad('org') ? errs.org : ''} />
      <div class="grid grid-cols-auto-sm gap-3.5">
        <TextField label="Your name" name="name" autoComplete="name" value={f.name} onInput={set('name')} invalid={bad('name')} error={bad('name') ? errs.name : ''} />
        <TextField
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          value={f.email}
          onInput={set('email')}
          invalid={bad('email')}
          error={bad('email') ? errs.email : ''}
        />
      </div>
      <TextField
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        value={f.phone}
        onInput={set('phone')}
        hint="If you’d rather talk it through on a call."
      />
      {f.way === 'host' && <TextField label="How many people your space holds (optional)" name="capacity" inputMode="numeric" value={f.capacity} onInput={set('capacity')} />}
      <TextArea label="Anything we should know? (optional)" name="msg" rows={4} value={f.msg} onInput={set('msg')} hint={PROMPTS[f.way]} />
      <p class="m-0 text-compact text-ink-2">
        Sending passes your inquiry to the organisers. One of us replies from {email} to talk it through. Nothing is agreed until you confirm.
      </p>
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="cta" grow busy={busy}>
          {busy ? 'Sending…' : 'Send inquiry'}
        </SubmitButton>
        <span role="alert" class="text-meta text-danger">
          {tried && !valid ? 'Fix the highlighted fields.' : serverError}
        </span>
      </div>
    </form>
  );
}
