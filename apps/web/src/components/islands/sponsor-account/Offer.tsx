/**
 * The offer the board sent, on /partners/account while the sponsorship waits for payment: what it
 * pays for, the amount, the processing fee when the sponsor covers it, and the total, before they
 * pay through the link. The amounts come frozen from the server (fees.ts); nothing is computed here.
 */
import { Heading } from '@zurichjs/design/islands/Heading';
import { buttonClass, cardClass } from '@zurichjs/design/recipes';
import type { QuoteView } from '../../../server/sponsor-fees.ts';

export interface OfferView {
  quote: QuoteView;
  payUrl: string | null;
  /** Its payment link is not published yet. */
  preparing: boolean;
}

export function Offer({ offer, contactEmail }: { offer: OfferView; contactEmail: string }) {
  const q = offer.quote;
  const per = (v: string) => (q.per ? `${v} ${q.per}` : v);
  const rows: [string, string][] = [
    ['For', q.purpose],
    [q.surcharge ? 'Amount' : 'Total', per(q.base)],
    ...(q.surcharge
      ? ([
          ['Payment processing fee', per(q.surcharge)],
          ['Total', per(q.total)],
        ] as [string, string][])
      : []),
  ];
  return (
    <section aria-labelledby="h-offer" class={cardClass('outline', 'lg')}>
      <Heading id="h-offer" size="subsection">
        Your offer
      </Heading>
      <dl class="m-0 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} class="flex min-w-0 flex-col gap-0.5">
            <dt class="text-meta text-grey-text">{k}</dt>
            <dd class="m-0 text-lead font-bold break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <p class="m-0 text-compact text-ink-2 text-pretty">
        {q.surcharge
          ? 'You cover the card processing fee: it is a separate line on the payment page and your receipt. The fee is our estimate; what the card company charges can differ slightly.'
          : 'ZurichJS covers the card processing fees.'}
      </p>
      {q.interval && q.surcharge ? (
        <p class="m-0 text-compact text-ink-2 text-pretty">The fee is charged with every renewal. To start, agree to it under Payment below, then continue to Stripe.</p>
      ) : q.interval ? null : offer.payUrl ? (
        <div>
          <a class={buttonClass({ variant: 'cta' })} href={offer.payUrl} rel="noopener">
            Pay {q.total} by card
          </a>
        </div>
      ) : (
        <p class="m-0 text-compact text-ink-2">
          {offer.preparing ? 'We are preparing the payment link for this offer. It shows here once it is ready.' : 'We send you the payment link.'} Questions: {contactEmail}.
        </p>
      )}
    </section>
  );
}
