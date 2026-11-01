import { useEffect, useState } from 'preact/hooks';

interface Summary {
  status: 'paid' | 'open' | 'unpaid';
  amount: number;
  currency: string;
  recurrence: 'once' | 'monthly';
}

/** Says back what Stripe confirmed. The page never claims a payment Stripe has not confirmed. */
export default function DonateThanks({ portalUrl, email }: { portalUrl?: string; email: string }) {
  const [s, setS] = useState<Summary | null | 'loading'>('loading');
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('session_id');
    if (!id) return setS(null);
    fetch(`/api/donate/session?session_id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((b: (Summary & { ok: boolean }) | null) => setS(b?.ok ? b : null))
      .catch(() => setS(null));
  }, []);

  const amount = s && s !== 'loading' ? `${s.currency} ${Number.isInteger(s.amount) ? s.amount : s.amount.toFixed(2)}` : '';
  return (
    <div role="status" class="flex flex-col gap-3 text-[18px] leading-[1.55]">
      {s === 'loading' ? (
        <p class="m-0 text-ink-2">Checking your payment with Stripe…</p>
      ) : s && s.status === 'paid' ? (
        <p class="m-0">
          Stripe confirmed your donation of <b>{amount}</b>
          {s.recurrence === 'monthly' ? ' every month' : ''}. A receipt is on its way to your email.
        </p>
      ) : s ? (
        <p class="m-0">Stripe hasn’t confirmed the payment yet. If it doesn’t go through, nothing is charged. A receipt follows by email once it does.</p>
      ) : (
        <p class="m-0">If you completed the payment, Stripe emails you a receipt. If you didn’t, nothing was charged.</p>
      )}
      {s && s !== 'loading' && s.recurrence === 'monthly' && (
        <p class="m-0 text-[17px] text-ink-2">
          You can change or cancel your monthly donation at any time{' '}
          {portalUrl ? (
            <a href={portalUrl} class="font-bold text-black">
              in the Stripe customer portal
            </a>
          ) : (
            <>
              by writing to{' '}
              <a href={`mailto:${email}?subject=${encodeURIComponent('My monthly donation')}`} class="font-bold text-black">
                {email}
              </a>
            </>
          )}
          .
        </p>
      )}
      <p class="m-0 text-[17px] text-ink-2">
        A donation supports ZurichJS but isn’t a membership. Questions:{' '}
        <a href={`mailto:${email}`} class="font-bold text-black">
          {email}
        </a>
        .
      </p>
    </div>
  );
}
