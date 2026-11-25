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
import { post } from '../admin-api.ts';

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
    const { status, body } = await post('/api/sponsorship/fees', { quoteId: q.id, confirm: true });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not confirm the processing fee.');
    onChanged();
  };

  return (
    <section aria-labelledby="h-fees" class={cardClass('outline', 'lg')}>
      <Heading id="h-fees" size="subsection">
        {q ? 'Processing fee to confirm' : 'Current processing fee'}
      </Heading>
      {current && (
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
            onChange={(e) => setAcceptedId(e.currentTarget.checked ? q.id : null)}
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
