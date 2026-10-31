import { useEffect, useRef, useState } from 'preact/hooks';
import { track } from '~/lib/analytics';
import { buttonClass, cx } from '~/lib/ui';

interface Props {
  /** Sanity document id of the event. */
  eventId: string;
  /** URL slug (`id.current`); the checkout function checks the price against this event. */
  slug: string;
  title: string;
  stripePriceId: string;
}

interface Price {
  unitAmount: number | null;
  currency: string;
}
interface Coupon {
  code: string;
  percentOff: number | null;
  amountOff: number | null;
}

const MAX = 10;
const money = (rappen: number, currency = 'chf') => {
  const v = rappen / 100;
  return `${currency.toUpperCase()} ${Number.isInteger(v) ? v : v.toFixed(2)}`;
};

/**
 * Ticket section for paid "pro meetups" (`<section id="tickets">`, the target
 * of the event page's "Get a ticket" action). Quantity, optional discount
 * code, then Stripe Checkout through /api/stripe/checkout-sessions.
 */
export default function ProMeetupTickets({ eventId, slug, title, stripePriceId }: Props) {
  const [price, setPrice] = useState<Price | null | 'loading'>('loading');
  const [qty, setQty] = useState(1);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [codeMsg, setCodeMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [canceled, setCanceled] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  const applyCode = async (raw: string) => {
    const c = raw.trim();
    if (!c) {
      setCodeMsg('Enter a discount code.');
      return;
    }
    setChecking(true);
    setCodeMsg('');
    try {
      const res = await fetch(`/api/stripe/validate-coupon?code=${encodeURIComponent(c)}`);
      const body = (await res.json()) as { ok: boolean; error?: string; code?: string; percentOff?: number | null; amountOff?: number | null };
      if (res.ok && body.ok && body.code) {
        setCoupon({ code: body.code, percentOff: body.percentOff ?? null, amountOff: body.amountOff ?? null });
      } else {
        setCoupon(null);
        setCodeMsg(body.error ?? 'That discount code isn’t valid.');
      }
    } catch {
      setCodeMsg('Discount codes can’t be checked right now.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let alive = true;
    fetch(`/api/stripe/get-price?priceId=${encodeURIComponent(stripePriceId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { ok?: boolean; unitAmount?: number | null; currency?: string } | null) => {
        if (alive) setPrice(b?.ok && typeof b.unitAmount === 'number' ? { unitAmount: b.unitAmount, currency: b.currency ?? 'chf' } : null);
      })
      .catch(() => alive && setPrice(null));
    // Back from Stripe without paying, or a shared link with ?coupon=CODE.
    const q = new URLSearchParams(window.location.search);
    if (q.get('canceled') === 'true') setCanceled(true);
    const fromUrl = q.get('coupon');
    if (fromUrl) {
      setCodeOpen(true);
      setCode(fromUrl);
      void applyCode(fromUrl);
    }
    return () => {
      alive = false;
    };
  }, [stripePriceId]);

  useEffect(() => {
    if (codeOpen && !code) codeRef.current?.focus();
  }, [codeOpen, code]);

  const unit = price !== 'loading' && price?.unitAmount != null ? price.unitAmount : null;
  const currency = price !== 'loading' && price ? price.currency : 'chf';
  const subtotal = unit !== null ? unit * qty : null;
  const total =
    subtotal === null ? null : coupon?.percentOff ? Math.round(subtotal * (1 - coupon.percentOff / 100)) : coupon?.amountOff ? Math.max(0, subtotal - coupon.amountOff) : subtotal;
  const discountLabel = coupon ? (coupon.percentOff ? `${coupon.percentOff}% off` : coupon.amountOff ? `${money(coupon.amountOff, currency)} off` : 'Discount') : '';

  const checkout = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/stripe/checkout-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priceId: stripePriceId, eventId: slug, quantity: qty, ticketType: 'event', ...(coupon ? { couponCode: coupon.code } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (res.ok && body.url) {
        track('form_submit', { form: 'ticket', event: eventId, quantity: qty });
        window.location.href = body.url;
        return;
      }
      setErr(body.error ?? 'We couldn’t open the payment page. Nothing was charged. Please try again.');
    } catch {
      setErr('We couldn’t reach the payment page. Nothing was charged. Check your connection and try again.');
    }
    setBusy(false);
  };

  const step =
    'w-12 h-12 rounded-pill bg-white border border-black text-[22px] font-bold cursor-pointer disabled:cursor-not-allowed disabled:border-grey-line disabled:text-grey-line';

  return (
    <section id="tickets" aria-labelledby="h-tickets" class="bg-grey rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-6 scroll-mt-6">
      <div class="flex flex-col gap-2">
        <h2 id="h-tickets" class="m-0 text-[clamp(26px,2.6vw,34px)] leading-[1.15] font-bold">
          Tickets
        </h2>
        <p class="m-0 text-[17px] leading-normal text-ink-2">{title} is a pro meetup. A ticket holds your place and helps pay for speaker travel, the venue and food.</p>
      </div>

      {canceled && (
        <p role="status" class="m-0 bg-white rounded-[16px] px-4 py-3 text-[16px]">
          You left the payment page, so nothing was charged. Your place isn’t booked yet.
        </p>
      )}

      <div class="flex flex-wrap gap-x-8 gap-y-4 items-end justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-[16px] font-bold">Price</span>
          <span class="text-[28px] leading-none font-bold" aria-live="polite" aria-busy={price === 'loading' || undefined}>
            {price === 'loading' ? '…' : unit !== null ? money(unit, currency) : 'Price shown at checkout'}
          </span>
          {unit !== null && <span class="text-[15px] text-grey-text">per person</span>}
        </div>

        <div class="flex flex-col gap-1.5">
          <span id="qty-label" class="text-[16px] font-bold">
            Tickets
          </span>
          <div role="group" aria-labelledby="qty-label" class="flex items-center gap-2">
            <button type="button" class={step} aria-label="One ticket fewer" disabled={qty <= 1 || busy} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <output aria-live="polite" class="min-w-[40px] text-center text-[24px] font-bold">
              {qty}
            </output>
            <button type="button" class={step} aria-label="One ticket more" disabled={qty >= MAX || busy} onClick={() => setQty((q) => Math.min(MAX, q + 1))}>
              +
            </button>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-2.5">
        {!codeOpen && !coupon ? (
          <button type="button" class={buttonClass('link', 'md', false, 'self-start text-[16px] font-bold')} onClick={() => setCodeOpen(true)} aria-expanded={false}>
            I have a discount code
          </button>
        ) : coupon ? (
          <div class="flex flex-wrap items-center gap-3">
            <span class="bg-yellow rounded-pill px-4 py-2 text-[16px] font-bold">
              {coupon.code} · {discountLabel}
            </span>
            <button
              type="button"
              class={buttonClass('link', 'md', false, 'text-[16px]')}
              onClick={() => {
                setCoupon(null);
                setCode('');
                setCodeOpen(true);
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <form
            class="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void applyCode(code);
            }}
          >
            <label htmlFor="ticket-code" class="text-[16px] font-bold">
              Discount code
            </label>
            <div class="flex flex-wrap gap-2">
              <input
                id="ticket-code"
                ref={codeRef}
                value={code}
                onInput={(e) => setCode(e.currentTarget.value.replace(/[^A-Za-z0-9_-]/g, ''))}
                autoComplete="off"
                autoCapitalize="characters"
                maxLength={80}
                aria-invalid={!!codeMsg || undefined}
                aria-describedby="ticket-code-msg"
                class={cx('min-h-[48px] flex-[1_1_180px] min-w-0 rounded-[14px] border px-3.5 text-[17px] bg-white', codeMsg ? 'border-danger' : 'border-grey-line')}
              />
              <button type="submit" class={buttonClass('white', 'md')} disabled={checking}>
                {checking ? 'Checking…' : 'Apply'}
              </button>
            </div>
            <span id="ticket-code-msg" aria-live="polite" class="text-[14px] text-danger min-h-[1.2em]">
              {codeMsg}
            </span>
          </form>
        )}
      </div>

      <div class="flex flex-col gap-3">
        {total !== null && (
          <div class="flex items-baseline justify-between gap-4 text-[19px]">
            <span class="font-bold">Total</span>
            <span class="font-bold">
              {coupon && subtotal !== total && <s class="mr-2 font-normal text-grey-text">{money(subtotal!, currency)}</s>}
              {money(total, currency)}
            </span>
          </div>
        )}
        <button
          type="button"
          class={buttonClass('black', 'lg', false, 'w-full text-[19px]')}
          disabled={busy || price === 'loading'}
          aria-busy={busy || undefined}
          onClick={checkout}
        >
          {busy ? 'Opening Stripe…' : qty === 1 ? 'Continue to payment' : `Continue to payment for ${qty} tickets`}
        </button>
        {err && (
          <p role="alert" class="m-0 text-[15px] text-danger">
            {err}
          </p>
        )}
        <p class="m-0 text-[15px] leading-[1.55] text-ink-2">
          Stripe takes the payment for ZurichJS and shows the final amount before you pay. Tickets aren’t refundable unless we cancel or move the meetup; you can transfer yours to
          someone else up to 24 hours before (
          <a href="/policies/refund-policy" class="text-black font-bold">
            refund policy
          </a>
          ). If the price stops you from coming, email{' '}
          <a href="mailto:hello@zurichjs.com" class="text-black font-bold">
            hello@zurichjs.com
          </a>
          .
        </p>
      </div>
    </section>
  );
}
