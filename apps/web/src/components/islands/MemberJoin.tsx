/**
 * Joining on /membership/account (docs/v2/MEMBERSHIP.md): who joins, level and
 * cycle (quarterly or yearly only), the membership terms tick, then Stripe
 * Checkout. Anyone can join; the membership starts with the first payment.
 * The level and cycle chosen on /membership come along (this browser only).
 */
import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ChipGroup, TextField } from '@zurichjs/design/islands/Field';
import { cx } from '@zurichjs/design/recipes';
import { TERMS } from '@zurichjs/membership/terms';
import { CYCLES, TIERS, TIER_KEYS, chf, feeLabel, type Cycle, type TierKey } from '../../lib/membership.ts';
import type { MemberView } from '../../server/membership.ts';
import { SubmitButton, useFocusFirstError } from './forms/shared.tsx';

const CHOICE_KEY = 'zurichjs-membership-choice';

/** The level and cycle picked on /membership (query string, else this browser's last choice). */
export function readChoice(): { level: TierKey; cycle: Cycle } {
  const fallback = { level: 'supporter' as TierKey, cycle: 'yearly' as Cycle };
  try {
    const q = new URLSearchParams(location.search);
    const saved = JSON.parse(localStorage.getItem(CHOICE_KEY) ?? '{}') as { level?: string; cycle?: string };
    const level = q.get('level') ?? saved.level;
    const cycle = q.get('cycle') ?? saved.cycle;
    const choice = {
      level: TIER_KEYS.includes(level as TierKey) ? (level as TierKey) : fallback.level,
      cycle: CYCLES.some((c) => c.value === cycle) ? (cycle as Cycle) : fallback.cycle,
    };
    // Kept so the choice survives signing in by email link on this device.
    localStorage.setItem(CHOICE_KEY, JSON.stringify(choice));
    return choice;
  } catch {
    return fallback;
  }
}

/** The membership terms tick, shared by joining and by switching to automatic payment. */
export function TermsCheckbox({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div class="flex flex-col gap-1.5">
      <label class="flex gap-3 items-start text-[17px] leading-[1.5] cursor-pointer">
        <input
          type="checkbox"
          name="terms"
          checked={checked}
          onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? 'terms-error' : undefined}
          class={cx('mt-1 w-5 h-5 flex-none accent-black', error && 'outline-2 outline-danger')}
        />
        <span>
          I accept the{' '}
          <a href={TERMS.path} target="_blank" rel="noopener" class="font-bold text-black">
            membership terms
          </a>
          , which follow the association’s bylaws.
        </span>
      </label>
      {error && (
        <span id="terms-error" class="text-[14px] text-danger pl-8" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  );
}

/** Sends the person to Stripe Checkout; returns an error sentence, or nothing (the page is leaving). */
export async function startCheckout(body: Record<string, unknown>, onSignedOut: () => void, contactEmail: string): Promise<{ error?: string; field?: string } | void> {
  const res = await fetch('/api/membership/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, termsVersion: TERMS.version }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string; field?: string };
  if (res.status === 401) return onSignedOut();
  if (!res.ok || !data.ok || !data.url) return { error: data.error ?? `We couldn’t start the payment. Try again, or write to ${contactEmail}.`, field: data.field };
  location.assign(data.url);
}

interface Props {
  /** An earlier membership that ended, or a sign-up whose payment was not finished. */
  previous: MemberView | null;
  contactEmail: string;
  onSignedOut: () => void;
}

type Kind = 'person' | 'organisation';

export default function MemberJoin({ previous, contactEmail, onSignedOut }: Props) {
  const [choice] = useState(readChoice);
  const [kind, setKind] = useState<Kind>(previous?.organisationName ? 'organisation' : 'person');
  const [level, setLevel] = useState<TierKey>(previous?.level ?? choice.level);
  const [cycle, setCycle] = useState<Cycle>(previous?.cycle ?? choice.cycle);
  const [f, setF] = useState({ name: previous?.name ?? '', organisationName: previous?.organisationName ?? '' });
  const [accepted, setAccepted] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverField, setServerField] = useState<{ field: string; error: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);

  const errs = {
    name: f.name.trim() ? '' : kind === 'organisation' ? 'Add the name of the person who joins for the organisation.' : 'Add your full name.',
    organisationName: kind === 'organisation' && !f.organisationName.trim() ? 'Add the organisation’s name.' : '',
    terms: accepted ? '' : 'Accept the membership terms to continue.',
  };
  const fieldError = (k: keyof typeof errs) => (tried ? errs[k] : '') || (serverField?.field === k ? serverField.error : '');
  const valid = !errs.name && !errs.organisationName && !errs.terms;

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
    setServerField(null);
    track('form_submit', { form: 'membership_join', tier: level, cycle });
    const result: { error?: string; field?: string } | void = await startCheckout(
      { kind, name: f.name, organisationName: kind === 'organisation' ? f.organisationName : undefined, level, cycle },
      onSignedOut,
      contactEmail,
    ).catch(() => ({ error: 'We couldn’t start the payment. Check your connection and try again.' }));
    if (result?.error) {
      if (result.field) setServerField({ field: result.field, error: result.error });
      setServerError(result.error);
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="h-join" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(32px,5vw,64px)] items-start">
      <div class="flex flex-col gap-3.5">
        <h2 id="h-join" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
          {previous?.status === 'pending' ? 'Finish joining' : 'Join'}
        </h2>
        {previous?.status === 'pending' && (
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">Your payment was not finished, so nothing was charged. Check your details and continue.</p>
        )}
        {previous?.status === 'ended' && <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">Your membership has ended. You are welcome to join again.</p>}
        <p class="m-0 text-[18px] leading-[1.6] text-grey-text text-pretty">
          You pay securely with Stripe. Your membership starts with the first payment, and you get your certificate of membership by email.
        </p>
        <p class="m-0 text-[17px] leading-[1.6] text-ink-2 text-pretty">
          Already a member? Sign in with the email you joined with, or write to{' '}
          <a href={`mailto:${contactEmail}`} class="font-bold text-black">
            {contactEmail}
          </a>
          .
        </p>
      </div>
      <form ref={formRef} onSubmit={submit} noValidate class="bg-white border border-grey-frame rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5">
        <ChipGroup<Kind>
          label="Joining as"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'person', label: 'A person' },
            { value: 'organisation', label: 'An organisation' },
          ]}
        />
        {kind === 'organisation' && (
          <TextField
            label="Organisation"
            name="organisation"
            autoComplete="organization"
            value={f.organisationName}
            onInput={(e) => setF({ ...f, organisationName: (e.target as HTMLInputElement).value })}
            invalid={!!fieldError('organisationName')}
            error={fieldError('organisationName') || undefined}
          />
        )}
        <TextField
          label={kind === 'organisation' ? 'Your full name (you join for the organisation)' : 'Full name'}
          name="name"
          autoComplete="name"
          value={f.name}
          onInput={(e) => setF({ ...f, name: (e.target as HTMLInputElement).value })}
          invalid={!!fieldError('name')}
          error={fieldError('name') || undefined}
        />
        <ChipGroup<TierKey> label="Membership" value={level} onChange={setLevel} options={TIER_KEYS.map((k) => ({ value: k, label: TIERS[k].name }))} />
        <ChipGroup<Cycle>
          label="Billing"
          value={cycle}
          onChange={setCycle}
          options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${chf(TIERS[level].fees[c.value])}` }))}
        />
        <p class="m-0 text-[16px] text-grey-text" aria-live="polite">
          {TIERS[level].name}, {feeLabel(TIERS[level], cycle)}, renewing automatically. You can switch between quarterly and yearly later.
        </p>
        <TermsCheckbox checked={accepted} onChange={setAccepted} error={fieldError('terms') || undefined} />
        {serverError && !serverField && (
          <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
            {serverError}
          </p>
        )}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Opening Stripe…' : 'Continue to payment'}
        </SubmitButton>
      </form>
    </section>
  );
}
