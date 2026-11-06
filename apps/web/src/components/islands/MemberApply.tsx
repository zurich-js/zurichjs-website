/**
 * The membership request on /membership/account (phase 3 of docs/v2/MEMBERSHIP.md).
 * Posts to /api/membership/apply with the signed-in person's token. Nothing is charged.
 * The level and cycle chosen on /membership come along (stored in this browser only).
 */
import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { ChipGroup, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { CYCLES, TIERS, TIER_KEYS, chf, feeLabel, type Cycle, type TierKey } from '../../lib/membership.ts';
import type { MemberView } from '../../pages/api/membership/me.ts';
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

interface Props {
  /** A fresh access token, or null when the session ended. */
  token: () => Promise<string | null>;
  /** The previous request or membership, if it was declined or ended. */
  previous: MemberView | null;
  contactEmail: string;
  onApplied: (m: MemberView) => void;
  onSignedOut: () => void;
}

type Kind = 'person' | 'organisation';

export default function MemberApply({ token, previous, contactEmail, onApplied, onSignedOut }: Props) {
  const [choice] = useState(readChoice);
  const [kind, setKind] = useState<Kind>(previous?.organisationName ? 'organisation' : 'person');
  const [level, setLevel] = useState<TierKey>(previous?.level ?? choice.level);
  const [cycle, setCycle] = useState<Cycle>(previous?.cycle ?? choice.cycle);
  const [f, setF] = useState({ name: previous?.name ?? '', organisationName: previous?.organisationName ?? '', message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [serverField, setServerField] = useState<{ field: string; error: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);

  const errs = {
    name: f.name.trim() ? '' : kind === 'organisation' ? 'Add the name of the person who signs for the organisation.' : 'Add your full name.',
    organisationName: kind === 'organisation' && !f.organisationName.trim() ? 'Add the organisation’s name.' : '',
  };
  const fieldError = (k: keyof typeof errs) => (tried ? errs[k] : '') || (serverField?.field === k ? serverField.error : '');
  const valid = !errs.name && !errs.organisationName;

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
    try {
      const t = await token();
      if (!t) return onSignedOut();
      const res = await fetch('/api/membership/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${t}` },
        body: JSON.stringify({ kind, name: f.name, organisationName: kind === 'organisation' ? f.organisationName : undefined, level, cycle, message: f.message || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; member?: MemberView; error?: string; field?: string };
      if (res.status === 401) return onSignedOut();
      if (!res.ok || !body.ok || !body.member) {
        if (body.field && body.error) setServerField({ field: body.field, error: body.error });
        throw new Error(body.error ?? '');
      }
      track('form_submit', { form: 'membership_apply', tier: level, cycle });
      onApplied(body.member);
    } catch (err) {
      setServerError((err as Error).message || `We couldn’t send your request. Try again, or write to ${contactEmail}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="h-apply" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-[clamp(32px,5vw,64px)] items-start">
      <div class="flex flex-col gap-3.5">
        <h2 id="h-apply" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
          Ask to join
        </h2>
        {previous && (
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
            {previous.status === 'rejected' ? 'Your last request was not approved.' : 'Your membership has ended.'} You can ask again here.
          </p>
        )}
        <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
          Nothing is charged now. An organiser looks at your request; if it is approved, you sign the membership declaration here, and only then set up payment.
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
          label={kind === 'organisation' ? 'Your full name (you sign for the organisation)' : 'Full name'}
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
        <TextArea
          label="Anything you want to tell us (optional)"
          name="message"
          rows={3}
          value={f.message}
          onInput={(e) => setF({ ...f, message: (e.target as HTMLTextAreaElement).value })}
          maxLength={1000}
        />
        <p class="m-0 text-[16px] text-ink-2" aria-live="polite">
          {TIERS[level].name}, {feeLabel(TIERS[level], cycle)}. Charged only after approval and your signature.
        </p>
        {serverError && (
          <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
            {serverError}
          </p>
        )}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Sending…' : 'Send my request'}
        </SubmitButton>
      </form>
    </section>
  );
}
