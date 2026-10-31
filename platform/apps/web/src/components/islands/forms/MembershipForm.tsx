import { useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { cx } from '~/lib/ui';
import { Button } from '../ui/Button';
import { ChipGroup, TextArea, TextField, isEmail } from '../ui/Field';
import { Honeypot, SubmitButton, honeypotValue, useFocusFirstError, useFocusWhen } from './shared';

type Tier = 'basic' | 'supporter';
type Cycle = 'monthly' | 'quarterly' | 'yearly';

/** Membership fees of the Swiss JavaScript Group (production /membership). */
const TIERS: Record<Tier, { name: 'Basic Member' | 'Supporter'; tagline: string; monthly: number; quarterly: number; yearly: number; benefits: string[] }> = {
  basic: {
    name: 'Basic Member',
    tagline: 'For curious Zurchers who want in.',
    monthly: 14.5,
    quarterly: 50,
    yearly: 175,
    benefits: ['Cancel anytime', 'Stay informed and vote on small decisions'],
  },
  supporter: {
    name: 'Supporter',
    tagline: 'For people shaping the tech scene.',
    monthly: 21,
    quarterly: 75,
    yearly: 250,
    benefits: ['Everything in Basic', 'Access to exclusive events', 'Voting rights'],
  },
};
const CYCLES: { value: Cycle; label: string; unit: string }[] = [
  { value: 'monthly', label: 'Monthly', unit: 'month' },
  { value: 'quarterly', label: 'Quarterly', unit: 'quarter' },
  { value: 'yearly', label: 'Yearly', unit: 'year' },
];
const chf = (n: number) => `CHF ${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** Tier cards plus the membership request form on /membership. Posts to /api/verein-inquiry; nothing is charged. */
export default function MembershipForm() {
  const [tier, setTier] = useState<Tier>('basic');
  const [cycle, setCycle] = useState<Cycle>('quarterly');
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const formSection = useRef<HTMLElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  const errs = { name: f.name.trim() ? '' : 'Add your name.', email: isEmail(f.email) ? '' : 'Enter an email like name@example.com.' };
  const valid = !errs.name && !errs.email;
  const t = TIERS[tier];
  const unit = CYCLES.find((c) => c.value === cycle)!.unit;

  const choose = (k: Tier) => {
    setTier(k);
    formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    setServerError('');
    try {
      const res = await fetch('/api/verein-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, tier: t.name, billingCycle: cycle, website_url: honeypotValue(formRef.current) }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? 'We couldn’t send that right now. Please try again or email hello@zurichjs.com.');
      track('form_submit', { form: 'membership', tier, cycle });
      setSent(true);
    } catch (err) {
      setServerError((err as Error).message || 'We couldn’t send that right now. Please try again or email hello@zurichjs.com.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="flex flex-col gap-[clamp(48px,6vw,80px)]">
      <section aria-labelledby="h-tiers" class="flex flex-col gap-6">
        <h2 id="h-tiers" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
          Two ways to be a member
        </h2>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
          {(Object.keys(TIERS) as Tier[]).map((k) => {
            const x = TIERS[k];
            return (
              <article key={k} class={cx('rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5', k === 'supporter' ? 'bg-yellow' : 'bg-grey')}>
                <div class="flex flex-col gap-1.5">
                  <h3 class="m-0 text-[clamp(24px,2.4vw,32px)] leading-[1.2] font-bold">{x.name}</h3>
                  <p class="m-0 text-[17px] leading-[1.5] text-ink-2">{x.tagline}</p>
                </div>
                <div class="flex flex-wrap gap-x-8 gap-y-3">
                  <div class="flex flex-col">
                    <span class="text-[clamp(34px,3.6vw,44px)] leading-none font-bold">{chf(x.quarterly)}</span>
                    <span class="text-[15px] text-ink-2 pt-1">a quarter</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[clamp(34px,3.6vw,44px)] leading-none font-bold">{chf(x.yearly)}</span>
                    <span class="text-[15px] text-ink-2 pt-1">a year</span>
                  </div>
                </div>
                <p class="m-0 text-[17px]">Or {chf(x.monthly)} a month.</p>
                <ul class="m-0 p-0 list-none flex flex-col gap-2">
                  {x.benefits.map((b) => (
                    <li key={b} class="flex gap-2.5 items-start text-[17px] leading-[1.45]">
                      <span aria-hidden="true" class="mt-[3px] w-5 h-5 flex-none rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center">
                        ✓
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <Button variant={k === 'supporter' ? 'black' : 'outline-black'} class="self-start mt-auto" onClick={() => choose(k)} aria-controls="membership-form">
                  Choose {x.name}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section
        ref={formSection}
        id="membership-form"
        aria-labelledby="h-join"
        class="scroll-mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(32px,5vw,80px)] items-start"
      >
        <div class="flex flex-col gap-3.5">
          <h2 id="h-join" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
            Ask to join
          </h2>
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
            Nothing is charged on this page. Your request goes to the organisers by email, and one of them replies with the next steps and how to pay the fee.
          </p>
        </div>

        {sent ? (
          <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-none">
            <div class="text-[28px] font-bold leading-[1.15]">Request sent.</div>
            <p class="m-0 text-[18px] leading-[1.55]">
              An organiser will reply to {f.email} about joining as {t.name} ({chf(t[cycle])} a {unit}). Nothing has been charged.
            </p>
            <Button
              variant="outline-black"
              class="self-start mt-1.5 text-[17px] !border"
              onClick={() => {
                setSent(false);
                setTried(false);
                setF({ name: '', email: '', message: '' });
              }}
            >
              Send another request
            </Button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={submit} noValidate class="relative bg-grey rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5">
            <Honeypot />
            <ChipGroup label="Membership" value={tier} onChange={setTier} options={(Object.keys(TIERS) as Tier[]).map((k) => ({ value: k, label: TIERS[k].name }))} />
            <ChipGroup label="Pay" value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${chf(t[c.value])}` }))} />
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
              <TextField
                label="Name"
                name="name"
                autoComplete="name"
                value={f.name}
                onInput={(e) => setF({ ...f, name: e.currentTarget.value })}
                invalid={tried && !!errs.name}
                error={tried ? errs.name : ''}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                value={f.email}
                onInput={(e) => setF({ ...f, email: e.currentTarget.value })}
                invalid={tried && !!errs.email}
                error={tried ? errs.email : ''}
              />
            </div>
            <TextArea label="Message (optional)" name="message" rows={3} maxLength={2000} value={f.message} onInput={(e) => setF({ ...f, message: e.currentTarget.value })} />
            <SubmitButton variant="black" size="lg" busy={busy} class="w-full">
              {busy ? 'Sending…' : `Ask to join as ${t.name}, ${chf(t[cycle])} a ${unit}`}
            </SubmitButton>
            <span role="alert" class="text-[15px] text-danger empty:hidden">
              {tried && !valid ? 'Fix the highlighted fields.' : serverError}
            </span>
          </form>
        )}
      </section>
    </div>
  );
}
