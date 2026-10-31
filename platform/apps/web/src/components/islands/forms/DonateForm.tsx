import { submitForm } from '@zurichjs/forms/client';
import { useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { cx } from '~/lib/ui';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Honeypot, SubmitButton, fieldErrors, honeypotValue, useFocusFirstError } from './shared';

const AMOUNTS: { v: number | 'custom'; label: string; sub: string }[] = [
  { v: 15, label: 'CHF 15', sub: 'A round of coffees' },
  { v: 25, label: 'CHF 25', sub: 'Drinks for a table' },
  { v: 50, label: 'CHF 50', sub: 'Part of a speaker’s train ticket' },
  { v: 'custom', label: 'Other', sub: 'Your amount' },
];

/** One-off donation on /donate: Twint or card through Stripe Checkout. */
export default function DonateForm({ nextHref }: { nextHref: string }) {
  const [amt, setAmt] = useState<number | 'custom'>(25);
  const [custom, setCustom] = useState('');
  const [method, setMethod] = useState<'twint' | 'card'>('twint');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [err, setErr] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);

  const cNum = parseFloat(custom);
  const isCustom = amt === 'custom';
  const value = isCustom ? (cNum >= 2 && cNum <= 5000 ? cNum : null) : amt;
  const valid = value !== null && Object.keys(fieldErrors('donate', { amountChf: value, method }, { amountChf: '' })).length === 0;
  const customBad = tried && isCustom && !valid;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!valid || !value) {
      setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    setErr('');
    const r = await submitForm('donate', { amountChf: value, method, website_url: honeypotValue(formRef.current) });
    if (!r.ok) {
      setBusy(false);
      return setErr(r.error);
    }
    track('form_submit', { form: 'donate', amountChf: value, method });
    if (r.url) {
      window.location.href = r.url; // Stripe Checkout
      return;
    }
    setBusy(false);
    setPaid(value);
  };

  return (
    <section aria-labelledby="h-amt" class="bg-grey rounded-[clamp(24px,3vw,36px)] p-[clamp(22px,3.4vw,40px)] flex flex-col gap-[22px]">
      <h2 id="h-amt" class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
        Choose an amount
      </h2>
      <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-[22px]">
        <Honeypot />
        <div role="radiogroup" aria-label="Amount" class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
          {AMOUNTS.map((a) => {
            const on = amt === a.v;
            return (
              <button
                key={String(a.v)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setAmt(a.v);
                  setTried(false);
                }}
                class={cx(
                  'cursor-pointer min-h-[104px] rounded-card border-2 flex flex-col items-start justify-center gap-1.5 py-[18px] px-[22px] text-left',
                  on ? 'bg-yellow border-black' : 'bg-white border-white hover:border-grey-line',
                )}
              >
                <span class="text-[28px] leading-none font-bold">{a.label}</span>
                <span class="text-[16px] leading-[1.35] text-ink-2">{a.sub}</span>
              </button>
            );
          })}
        </div>
        {isCustom && (
          <label class="flex flex-col gap-1.5 text-[16px] font-bold">
            Your amount in CHF
            <input
              name="amountChf"
              value={custom}
              onInput={(e) => setCustom(e.currentTarget.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={customBad || undefined}
              aria-describedby="donate-amount-hint"
              class={cx('min-h-[52px] border rounded-[14px] px-3.5 text-[20px] font-bold bg-white max-w-[220px]', customBad ? 'border-danger' : 'border-grey-line')}
            />
            <span id="donate-amount-hint" aria-live="polite" class={cx('font-normal text-[14px]', customBad ? 'text-danger' : 'text-grey-text')}>
              {customBad ? 'Enter an amount between CHF 2 and CHF 5000.' : 'Minimum CHF 2.'}
            </span>
          </label>
        )}
        <div role="radiogroup" aria-labelledby="donate-method" class="flex flex-col gap-2">
          <div id="donate-method" class="text-[16px] font-bold">
            Pay with
          </div>
          <div class="flex gap-2 flex-wrap">
            {(['twint', 'card'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => setMethod(m)}
                class={cx(
                  'cursor-pointer min-h-[48px] px-[22px] rounded-pill border border-black font-bold text-[17px]',
                  method === m ? 'bg-black text-white' : 'bg-white text-black',
                )}
              >
                {m === 'twint' ? 'Twint' : 'Card'}
              </button>
            ))}
          </div>
        </div>
        <SubmitButton variant="yellow" class="min-h-[56px] text-[19px]" busy={busy}>
          {busy ? 'One moment…' : value ? `Donate CHF ${value} with ${method === 'twint' ? 'Twint' : 'card'}` : 'Donate'}
        </SubmitButton>
        {err && (
          <p role="alert" class="m-0 text-[15px] text-danger">
            {err}
          </p>
        )}
        <div class="text-[15px] leading-[1.5] text-ink-2">One-off payment through Stripe. You get a receipt by email.</div>
      </form>

      <Modal open={paid !== null} onClose={() => setPaid(null)} labelledBy="dn-h">
        <div role="status" class="flex flex-col gap-3.5">
          <h2 id="dn-h" class="m-0 text-[28px] font-bold">
            Thank you.
          </h2>
          <p class="m-0 text-[17px] leading-[1.55]">
            Online payments aren’t switched on yet, so nothing was charged for your CHF {paid}. Email hello@zurichjs.com and we’ll send you the TWINT details.
          </p>
          <div class="flex gap-2.5">
            <Button href={nextHref} variant="white" class="flex-1 text-[16px]">
              See the next meetup
            </Button>
            <Button variant="black" class="flex-1 text-[16px]" onClick={() => setPaid(null)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
