import { useEffect, useState } from 'preact/hooks';
import { Button } from '../ui/Button';

/**
 * What happened at Stripe, for /success and /checkout/success. Reads the
 * query: `type=donation` (donations), `session_id` + `event` (tickets, from
 * /api/stripe/checkout-sessions) and production's base64 `data` parameter
 * from sessions the old site started. Ticket sessions are looked up so the
 * page says exactly what was paid.
 */
type View =
  | { kind: 'generic' }
  | { kind: 'donation' }
  | { kind: 'checking' }
  | { kind: 'paid'; event?: string; quantity: number | null; amount: string | null }
  | { kind: 'unpaid'; event?: string }
  | { kind: 'unknown'; event?: string };

interface SessionInfo {
  ok: boolean;
  paymentStatus?: string;
  status?: string;
  eventId?: string | null;
  quantity?: number | null;
  amountTotal?: number | null;
  currency?: string | null;
}

const SLUG = /^[A-Za-z0-9_:.-]{1,160}$/;

function legacyEvent(data: string | null): string | undefined {
  if (!data) return undefined;
  try {
    const d = JSON.parse(atob(data)) as { event_id?: unknown };
    return typeof d.event_id === 'string' && SLUG.test(d.event_id) ? d.event_id : undefined;
  } catch {
    return undefined;
  }
}

const money = (amount: number, currency: string) => `${currency.toUpperCase()} ${Number.isInteger(amount / 100) ? amount / 100 : (amount / 100).toFixed(2)}`;

export default function CheckoutResult() {
  const [view, setView] = useState<View>({ kind: 'generic' });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('type') === 'donation') return setView({ kind: 'donation' });
    const sessionId = q.get('session_id');
    const ev = q.get('event') ?? undefined;
    const event = ev && SLUG.test(ev) ? ev : legacyEvent(q.get('data'));
    if (!sessionId) return;
    setView({ kind: 'checking' });
    fetch(`/api/stripe/checkout-sessions?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json() as Promise<SessionInfo>)
      .then((s) => {
        const slug = s.eventId && SLUG.test(s.eventId) ? s.eventId : event;
        if (!s.ok) return setView({ kind: 'unknown', event: slug });
        if (s.paymentStatus === 'paid' || s.paymentStatus === 'no_payment_required')
          return setView({
            kind: 'paid',
            event: slug,
            quantity: s.quantity ?? null,
            amount: typeof s.amountTotal === 'number' && s.currency ? money(s.amountTotal, s.currency) : null,
          });
        setView({ kind: 'unpaid', event: slug });
      })
      .catch(() => setView({ kind: 'unknown', event }));
  }, []);

  const eventHref = (v: { event?: string }) => (v.event ? `/events/${v.event}` : '/events');
  const body = 'flex flex-col gap-4 max-w-[720px]';
  const h2 = 'm-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold';
  const p = 'm-0 text-[18px] leading-[1.55] text-ink-2';
  const help = (
    <p class={p}>
      Questions? Email{' '}
      <a href="mailto:hello@zurichjs.com" class="font-bold text-black">
        hello@zurichjs.com
      </a>
      .
    </p>
  );

  switch (view.kind) {
    case 'donation':
      return (
        <div role="status" class={body}>
          <h2 class={h2}>Your donation went through.</h2>
          <p class={p}>Stripe took the payment for ZurichJS and emails your receipt to the address you used at checkout. It goes towards venues, food and speaker travel.</p>
          {help}
          <div class="flex flex-wrap gap-3 pt-1">
            <Button href="/events" variant="black">
              See upcoming meetups
            </Button>
          </div>
        </div>
      );
    case 'checking':
      return (
        <div role="status" aria-busy="true" class={body}>
          <h2 class={h2}>Checking your payment…</h2>
          <p class={p}>This takes a second.</p>
        </div>
      );
    case 'paid':
      return (
        <div role="status" class={body}>
          <h2 class={h2}>You’re in.</h2>
          <p class={p}>
            {view.amount ? `Stripe took ${view.amount}` : 'Your payment went through'}
            {view.quantity ? ` for ${view.quantity} ${view.quantity === 1 ? 'ticket' : 'tickets'}` : ''}. An organiser emails your ticket to the address you used at checkout within
            24 hours.
          </p>
          <p class={p}>
            Nothing after a day? Email{' '}
            <a href="mailto:hello@zurichjs.com" class="font-bold text-black">
              hello@zurichjs.com
            </a>{' '}
            with the email you paid with.
          </p>
          <div class="flex flex-wrap gap-3 pt-1">
            <Button href={eventHref(view)} variant="black">
              {view.event ? 'Back to the event' : 'See upcoming meetups'}
            </Button>
          </div>
        </div>
      );
    case 'unpaid':
      return (
        <div role="status" class={body}>
          <h2 class={h2}>Your payment hasn’t gone through.</h2>
          <p class={p}>Stripe hasn’t confirmed this payment, so nothing was charged and no place is booked. You can try again from the event page.</p>
          {help}
          <div class="flex flex-wrap gap-3 pt-1">
            <Button href={view.event ? `${eventHref(view)}#tickets` : '/events'} variant="black">
              Try again
            </Button>
          </div>
        </div>
      );
    case 'unknown':
      return (
        <div role="status" class={body}>
          <h2 class={h2}>We couldn’t check this payment.</h2>
          <p class={p}>If you finished paying on Stripe, an organiser emails your ticket to the address you used at checkout within 24 hours.</p>
          {help}
          <div class="flex flex-wrap gap-3 pt-1">
            <Button href={eventHref(view)} variant="black">
              {view.event ? 'Back to the event' : 'See upcoming meetups'}
            </Button>
          </div>
        </div>
      );
    default:
      return (
        <div class={body}>
          <h2 class={h2}>Thanks for supporting ZurichJS.</h2>
          <p class={p}>If you just bought a meetup ticket, an organiser emails it to the address you used at checkout within 24 hours. A donation needs nothing more from you.</p>
          {help}
          <div class="flex flex-wrap gap-3 pt-1">
            <Button href="/events" variant="black">
              See upcoming meetups
            </Button>
            <Button href="/" variant="outline-black">
              Home
            </Button>
          </div>
        </div>
      );
  }
}
