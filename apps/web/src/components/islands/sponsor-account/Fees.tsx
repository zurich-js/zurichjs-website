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
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const q = fees.toConfirm;
  const current = fees.inForce?.feeChoice === 'pass_through' ? fees.inForce : null;
  if (!q && !current) return null;

  const confirm = async () => {
    if (!q || busy) return;
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
            We asked you to cover the card processing fee from your next renewal: {q.surcharge} {q.per} on top of {q.base}, so {q.total} {q.per}. Nothing changes until you confirm,
            and nothing is charged now. The fee is our estimate.
          </p>
          <Checkbox
            label={`I agree to pay the processing fee of ${q.surcharge} ${q.per} from the next renewal.`}
            checked={agree}
            onChange={(e) => setAgree((e.target as HTMLInputElement).checked)}
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
