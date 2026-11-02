import { useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx } from '@zurichjs/design/recipes';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, honeypotValue, useFocusFirstError, useFocusWhen } from './shared.tsx';
import { Check } from '@zurichjs/design/islands/Check';
import { CYCLES, TIERS, TIER_KEYS, chf, feeLabel, perYear, type Cycle, type TierKey } from '../../../lib/membership.ts';

/** Tier cards plus the membership request form on /membership. Posts to /api/verein-inquiry; nothing is charged. */
export default function MembershipForm() {
  const [tier, setTier] = useState<TierKey>('basic');
  const [cycle, setCycle] = useState<Cycle>('quarterly');
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
          Two ways to be a member
        </h2>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] gap-4">
          {TIER_KEYS.map((k) => {
            const x = TIERS[k];
            return (
              <article key={k} class={cx('rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5', k === 'supporter' ? 'bg-yellow' : 'bg-grey')}>
                <div class="flex flex-col gap-1.5">
                  <h3 class="m-0 text-[clamp(24px,2.4vw,32px)] leading-[1.2] font-bold">{x.name}</h3>
                  <p class="m-0 text-[17px] leading-normal text-ink-2">{x.tagline}</p>
                </div>
                <dl class="m-0 flex flex-wrap gap-x-8 gap-y-3">
                  {CYCLES.map((c) => (
                    <div key={c.value} class="flex flex-col">
                      <dt class="order-2 text-[15px] text-ink-2 pt-1">a {c.unit}</dt>
                      <dd class="order-1 m-0 text-[clamp(30px,3.2vw,40px)] leading-none font-bold">{chf(x.fees[c.value])}</dd>
                    </div>
                  ))}
                </dl>
                <p class="m-0 text-[16px] leading-[1.5] text-ink-2">Over a year: {CYCLES.map((c) => `${chf(perYear(x, c.value))} paid ${c.label.toLowerCase()}`).join(', ')}.</p>
                <ul class="m-0 p-0 list-none flex flex-col gap-2">
                  {x.benefits.map((b) => (
                    <li key={b} class="flex gap-2.5 items-start text-[17px] leading-[1.45]">
                      <span aria-hidden="true" class="mt-[3px] w-5 h-5 flex-none rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center">
                        <Check class="w-3 h-3" />
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
        <div class="flex flex-col gap-2 max-w-[760px] text-[17px] leading-[1.55] text-ink-2">
          <p class="m-0">Each billing cycle is its own price, so paying quarterly costs more over a year than paying monthly or yearly. You pick one when you ask to join.</p>
          <p class="m-0">
            Voting: Basic Members vote on small decisions; Supporters have voting rights. For what that covers in practice, write to{' '}
            <a href="mailto:hello@zurichjs.com?subject=Membership%20voting" class="font-bold text-black">
              hello@zurichjs.com
            </a>
            .
          </p>
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
            This sends a membership request; it doesn’t sign you up or charge anything. The organisers get it by email, and one of them replies with the next steps and how to pay
            the fee.
          </p>
        </div>

        {sent ? (
          <div ref={doneRef} tabIndex={-1} role="status" class="bg-yellow rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 outline-hidden">
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
            <SubmitButton variant="black" size="lg" busy={busy} class="w-full">
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
