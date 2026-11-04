import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '@zurichjs/design/analytics';
import { cx, optionClass, optionInput } from '@zurichjs/design/recipes';
import { TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Honeypot, SubmitButton, honeypotValue, useFocusWhen } from './shared.tsx';

type Recurrence = 'once' | 'monthly';

/** Production's preset amounts and what each one pays for (origin/main: buy-us-a-coffee). */
const PRESETS: { amount: number; covers: string }[] = [
  { amount: 10, covers: 'Storage and tooling for the organisers.' },
  { amount: 20, covers: 'Snacks for a meetup.' },
  { amount: 30, covers: 'Drinks for the next meetup.' },
  { amount: 40, covers: 'One large pizza at a meetup.' },
  { amount: 50, covers: 'Helps make sure the next meetup can happen.' },
];
const MIN = 5;
const MAX = 1000;
const chf = (n: number) => `CHF ${Number.isInteger(n) ? n : n.toFixed(2)}`;

/**
 * Online donation on /donate: one-time or monthly, in Swiss francs, paid on
 * Stripe's hosted page. Nothing is charged here; the button hands over to
 * Stripe, which confirms the payment. Separate from membership.
 *
 * When Stripe can't be reached, the error names only the alternatives the
 * page really shows: Twint when `twint` (a QR in Site settings), always email.
 */
export default function DonateForm({ portalUrl, email: contactEmail, twint = false }: { portalUrl?: string; email: string; twint?: boolean }) {
  const [recurrence, setRecurrence] = useState<Recurrence>('once');
  const [preset, setPreset] = useState<number | null>(20);
  const [custom, setCustom] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  /** The payment couldn't start (server or network): offer the other ways to give. */
  const [offerOther, setOfferOther] = useState(false);
  const [notice, setNotice] = useState<'canceled' | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useFocusWhen<HTMLDivElement>(!!notice);
  const attempt = useRef(Math.random().toString(36).slice(2, 12) + Date.now().toString(36));

  // Back from Stripe without paying (also the old ?canceled=true links).
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('canceled') === '1' || q.get('canceled') === 'true') setNotice('canceled');
    // Old success links (/buy-us-a-coffee?success=true…) land here: send them to the thanks page.
    if (q.get('success') === 'true') location.replace('/donate/thanks');
    // The browser's Back button from Stripe can restore this page from the
    // back-forward cache with the button still "Opening the payment page…".
    const restored = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      inFlight.current = false;
      setBusy(false);
      attempt.current = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    };
    addEventListener('pageshow', restored);
    return () => removeEventListener('pageshow', restored);
  }, []);

  const customNum = custom.trim() ? Number(custom.replace(',', '.')) : NaN;
  const amount = preset ?? customNum;
  const amountBad = !Number.isFinite(amount) || amount < MIN || amount > MAX;
  const emailBad = !!email && !isEmail(email);
  const summary = amountBad ? '' : recurrence === 'monthly' ? `You’ll give ${chf(amount)} every month until you cancel.` : `You’ll give ${chf(amount)} once.`;

  const submit = async (e: Event) => {
    e.preventDefault();
    // One request at a time, even if Enter or the button is pressed twice before the re-render.
    if (inFlight.current) return;
    setOfferOther(false);
    const focusField = (name: string) => formRef.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();
    if (amountBad) {
      focusField('amount');
      return setError(`Choose an amount from CHF ${MIN} to CHF ${MAX}.`);
    }
    if (emailBad) {
      focusField('email');
      return setError('Check the email, or leave it empty.');
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/donate/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amount, recurrence, email: email.trim() || undefined, attempt: attempt.current, website_url: honeypotValue(formRef.current) }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !body.ok || !body.url) throw new Error(body.error || 'We couldn’t start the payment. Nothing was charged. Please try again.');
      track('donate_checkout', { recurrence, amount });
      location.assign(body.url);
    } catch (err) {
      const message = (err as Error).message;
      setError(!message || err instanceof TypeError ? 'We couldn’t reach the server. Nothing was charged. Please try again.' : message);
      setOfferOther(true);
      attempt.current = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="relative flex flex-col gap-5" aria-describedby="donate-summary">
      <Honeypot />
      {notice === 'canceled' && (
        <div ref={noticeRef} tabIndex={-1} role="status" class="rounded-[20px] bg-grey p-4 text-[17px] outline-hidden">
          <b>No payment was made.</b> You left the payment page before paying. You can try again below.
        </div>
      )}
      {/* How often: one pill with a segment per option, like the membership and sponsorship switches. */}
      <div role="radiogroup" aria-label="How often" class="self-start inline-flex p-1 rounded-pill bg-grey">
        {(
          [
            ['once', 'One-time'],
            ['monthly', 'Monthly'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={recurrence === value}
            onClick={() => setRecurrence(value)}
            class={cx(
              'min-h-[44px] px-4 md:min-w-[120px] md:px-6 rounded-pill border-0 font-bold text-[16px] cursor-pointer transition-colors',
              recurrence === value ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-grey-hover',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <fieldset class="border-0 p-0 m-0 flex flex-col gap-2.5 min-w-0">
        <legend class="text-[16px] font-bold mb-2 p-0">Amount in Swiss francs</legend>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <label key={p.amount} class={optionClass(false, 'text-[17px]')}>
              <input
                type="radio"
                name="preset"
                value={p.amount}
                checked={preset === p.amount}
                onChange={() => {
                  setPreset(p.amount);
                  setCustom('');
                  setError('');
                }}
                class={optionInput}
              />
              {chf(p.amount)}
            </label>
          ))}
        </div>
        {preset !== null && <p class="m-0 text-[16px] text-ink-2">{PRESETS.find((p) => p.amount === preset)?.covers}</p>}
        <TextField
          label="Or another amount (CHF 5 to 1000)"
          name="amount"
          inputMode="decimal"
          value={custom}
          onInput={(e) => {
            setCustom(e.currentTarget.value);
            setPreset(null);
            setError('');
          }}
          invalid={preset === null && !!custom && amountBad}
          error={preset === null && !!custom && amountBad ? `Enter an amount from ${MIN} to ${MAX}.` : ''}
          class="max-w-[260px]"
        />
      </fieldset>
      <TextField
        label="Email for the receipt (optional)"
        hint="Stripe asks for it on the next page if you leave it empty."
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onInput={(e) => setEmail(e.currentTarget.value)}
        invalid={emailBad}
        error={emailBad ? 'Check the email, or leave it empty.' : ''}
        class="max-w-[440px]"
      />
      <p id="donate-summary" class="m-0 text-[18px] font-bold min-h-[1lh]" aria-live="polite">
        {summary}
      </p>
      <div class="flex flex-wrap gap-3 items-center">
        <SubmitButton variant="yellow" size="lg" busy={busy}>
          {busy ? 'Opening the payment page…' : 'Continue to secure payment'}
        </SubmitButton>
        <span role="alert" class="text-[15px] text-danger">
          {error}
          {error && offerOther && (
            <>
              {' '}
              {twint ? (
                <>
                  You can still give by Twint or by email, under{' '}
                  <a href="#other-ways" class="font-bold text-black">
                    Other ways to give
                  </a>
                  .
                </>
              ) : (
                <>
                  To give another way, write to{' '}
                  <a href={`mailto:${contactEmail}?subject=${encodeURIComponent('Donation to ZurichJS')}`} class="font-bold text-black">
                    {contactEmail}
                  </a>
                  .
                </>
              )}
            </>
          )}
        </span>
      </div>
      <p class="m-0 text-[15px] leading-[1.55] text-ink-2">
        Payment happens on Stripe’s secure page; nothing is charged here. Stripe confirms the payment and emails a receipt.
        {recurrence === 'monthly' && (
          <>
            {' '}
            You can cancel a monthly donation at any time{portalUrl ? ' ' : ' by writing to '}
            {portalUrl ? (
              <a href={portalUrl} class="font-bold text-black">
                in the Stripe customer portal
              </a>
            ) : (
              <a href={`mailto:${contactEmail}?subject=${encodeURIComponent('Cancel my monthly donation')}`} class="font-bold text-black">
                {contactEmail}
              </a>
            )}
            .
          </>
        )}
      </p>
    </form>
  );
}
