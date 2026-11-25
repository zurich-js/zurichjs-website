/**
 * The processing fee of a running recurring sponsorship on /partners/account: the fee in force, and
 * a fee the board offered for the sponsor to confirm (POST /api/sponsorship/fees). A confirmed fee
 * applies from the next renewal and is its own line on every receipt. Amounts come from the server.
 */
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { cardClass } from '@zurichjs/design/recipes';
import type { QuoteView } from '../../../server/sponsor-fees.ts';

export interface FeesView {
  inForce: QuoteView | null;
  toConfirm: QuoteView | null;
}

export function Fees({ fees, onSignedOut, onChanged }: { fees: FeesView; onSignedOut: () => void; onChanged: () => void }) {
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const q = fees.toConfirm?.plan ? null : fees.toConfirm;
  const agree = !!q && q.id === acceptedId;
  const current = fees.inForce?.feeChoice === 'pass_through' ? fees.inForce : null;
  if (!q && !current) return null;

  const confirm = async () => {
    if (!q || !agree || busy) return;
    setBusy(true);
    setError('');
    const res = await fetch('/api/sponsorship/fees', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ quoteId: q.id, confirm: true }),
    }).catch(() => null);
    setBusy(false);
    if (res?.status === 401) return onSignedOut();
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }) : null;
    if (!res?.ok || !data?.ok) return setError(data?.error ?? 'We couldn’t reach the site. Check your connection and try again.');
    onChanged();
  };

  return (
    <section aria-labelledby="h-fees" class={cardClass('outline', 'lg')}>
      <Heading id="h-fees" size="subsection">
        {q ? 'Processing fee to confirm' : 'Processing fee'}
      </Heading>
      {current && !q && (
        <p class="m-0 text-body text-ink-2 text-pretty">
          You cover the card processing fee: {current.surcharge} {current.per}, a separate line on every renewal ({current.total} {current.per} in total).
        </p>
      )}
      {q && (
        <>
          <p class="m-0 text-body text-ink-2 text-pretty">
            {q.surcharge
              ? `From the next renewal, you would pay ${q.base} plus an estimated processing fee of ${q.surcharge}, totalling ${q.total} ${q.per}.`
              : `ZurichJS offers to cover the processing fee. You would pay ${q.total} ${q.per} from the next renewal.`}
          </p>
          <Checkbox
            label={`I agree to the total of ${q.total} ${q.per} from the next renewal.`}
            checked={agree}
            onChange={(e) => setAcceptedId((e.target as HTMLInputElement).checked ? q.id : null)}
          />
          {error && <Notice tone="danger" live title={error} />}
          <div>
            <Button variant="primary" disabled={!agree || busy} onClick={() => void confirm()}>
              {busy ? 'Confirming…' : 'Confirm the fee'}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
