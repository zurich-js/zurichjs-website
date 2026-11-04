import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, honeypotValue, useFocusFirstError, useFocusWhen } from './shared.tsx';
import { Check } from '@zurichjs/design/islands/Check';
import { CYCLES, TIERS, TIER_KEYS, chf, feeLabel, perYear, type Cycle, type TierKey } from '../../../lib/membership.ts';

/** The billing switch: yearly first, as it costs less. */
const BILLING = [...CYCLES].reverse();

/** Tier cards plus the membership request form on /membership. Posts to /api/verein-inquiry; nothing is charged. */
export default function MembershipForm() {
  const [tier, setTier] = useState<TierKey>('supporter');
  const [cycle, setCycle] = useState<Cycle>('yearly');
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const formSection = useRef<HTMLElement>(null);
  const focusError = useFocusFirstError(formRef);
  const doneRef = useFocusWhen<HTMLDivElement>(sent);

  const errs = { name: f.name.trim() ? '' : 'Add your name.', email: isEmail(f.email) ? '' : 'Enter an email like name@example.com.' };
  const valid = !errs.name && !errs.email;
  const t = TIERS[tier];
  const fee = feeLabel(t, cycle);
  const unit = CYCLES.find((c) => c.value === cycle)!.unit;

  const choose = (k: TierKey) => {
    setTier(k);
    formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    // One request at a time, even if Enter or the button is pressed twice before the re-render.
    if (inFlight.current) return;
    if (!valid) {
      setTried(true);
      focusError();
      return;
    }
    inFlight.current = true;
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
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <div class="flex flex-col gap-[clamp(48px,6vw,80px)]">
      <section aria-labelledby="h-tiers" class="flex flex-col gap-6">
        <h2 id="h-tiers" class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">
          Choose your membership
        </h2>
        {/* One billing choice for the cards and the form below: a single pill with a segment per cycle. */}
        <div role="radiogroup" aria-label="Billing" class="self-center inline-flex p-1 rounded-pill bg-grey">
          {BILLING.map((c) => {
            const on = c.value === cycle;
            return (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCycle(c.value)}
                class={cx(
                  'min-h-[44px] min-w-[120px] px-6 rounded-pill border-0 font-bold text-[16px] cursor-pointer transition-colors',
                  on ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-grey-hover',
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4 items-stretch">
          {TIER_KEYS.map((k) => {
            const x = TIERS[k];
            const featured = k === 'supporter';
            return (
              <article key={k} class={cx('rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-6', featured ? 'bg-grey outline-2 outline-black' : 'bg-grey')}>
                <div class="flex flex-col gap-1">
                  <h3 class="m-0 text-[clamp(26px,2.6vw,34px)] leading-[1.15] font-bold">{x.name}</h3>
                  <p class="m-0 text-[17px] leading-normal text-ink-2">{x.tagline}</p>
                </div>
                <div class="flex flex-col gap-1.5" aria-live="polite">
                  <p class="m-0 flex items-baseline gap-2 flex-wrap">
                    <span class="text-[clamp(40px,4.4vw,56px)] leading-none font-bold">{chf(x.fees[cycle])}</span>
                    <span class="text-[18px] text-ink-2">per {unit}</span>
                  </p>
                  <p class="m-0 text-[16px] text-ink-2 min-h-[1.5em]">
                    {cycle === 'yearly'
                      ? `Save ${chf(perYear(x, 'quarterly') - perYear(x, 'yearly'))} compared with paying quarterly.`
                      : `${chf(perYear(x, 'quarterly'))} over a year.`}
                  </p>
                </div>
                <div class="flex flex-col gap-2">
                  <p class="m-0 text-[18px] font-bold">That’s {chf(x.perMonth)} a month, about</p>
                  <ul class="m-0 p-0 list-none flex flex-col gap-1 text-[17px] leading-[1.45] text-ink-2">
                    {x.comparisons.map((c) => (
                      <li key={c}>… {c}</li>
                    ))}
                  </ul>
                </div>
                <div class="flex flex-col gap-2.5">
                  {x.benefitsTitle && <p class="m-0 text-[17px] font-bold">{x.benefitsTitle}</p>}
                  <ul class="m-0 p-0 list-none flex flex-col gap-2">
                    {x.benefits.map((b) => (
                      <li key={b} class="flex gap-2.5 items-start text-[17px] leading-[1.45]">
                        <span aria-hidden="true" class="mt-[3px] w-5 h-5 flex-none rounded-full bg-black text-white flex items-center justify-center">
                          <Check class="w-3 h-3" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant={featured ? 'black' : 'outline-black'} class="self-start mt-auto" onClick={() => choose(k)} aria-controls="membership-form">
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
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">Nothing is charged here. An organiser replies by email with the next steps and how to pay.</p>
        </div>

        {sent ? (
          <div ref={doneRef} tabIndex={-1} role="status" class="bg-success-soft rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-hidden">
            <div class="text-[28px] font-bold leading-[1.15]">Request sent.</div>
            <p class="m-0 text-[18px] leading-[1.55]">
              An organiser will reply to {f.email} about joining as {t.name} ({fee}). Nothing has been charged.
            </p>
            <Button
              variant="outline-black"
              class="self-start mt-1.5 text-[17px] border!"
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
            <ChipGroup label="Membership" value={tier} onChange={setTier} options={TIER_KEYS.map((k) => ({ value: k, label: TIERS[k].name }))} />
            <ChipGroup label="Billing cycle" value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${chf(t.fees[c.value])}` }))} />
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3.5">
              <TextField
                label="Name"
                name="name"
                required
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
                required
                autoComplete="email"
                value={f.email}
                onInput={(e) => setF({ ...f, email: e.currentTarget.value })}
                invalid={tried && !!errs.email}
                error={tried ? errs.email : ''}
              />
            </div>
            <TextArea label="Message (optional)" name="message" rows={3} maxLength={2000} value={f.message} onInput={(e) => setF({ ...f, message: e.currentTarget.value })} />
            <SubmitButton variant="yellow" size="lg" busy={busy} class="w-full">
              {busy ? 'Sending…' : `Send request: ${t.name}, ${fee}`}
            </SubmitButton>
            <span role="alert" class="text-[15px] text-danger empty:hidden">
              {tried && !valid ? 'Fix the highlighted fields.' : serverError}
            </span>
            {serverError && (
              <p class="m-0 text-[15px] text-ink-2">
                Your answers are still here. You can also email{' '}
                <a
                  href={`mailto:hello@zurichjs.com?subject=${encodeURIComponent(`Membership request: ${t.name}`)}&body=${encodeURIComponent(`Name: ${f.name}\nEmail: ${f.email}\nTier: ${t.name}\nBilling: ${cycle} (${fee})\n\n${f.message}`)}`}
                  class="font-bold text-black"
                >
                  hello@zurichjs.com
                </a>{' '}
                with the same details.
              </p>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
