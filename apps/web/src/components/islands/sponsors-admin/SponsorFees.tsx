/**
 * Who covers card processing fees on a recurring sponsorship, in the board's view of a sponsor
 * (/api/membership/admin/sponsors/[id]/fees). Not started yet: a new offer. Running by card: the
 * sponsor confirms a fee on their page (copy the link), and switching back to ZurichJS applies at once.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import type { FeeChoice } from '@zurichjs/sponsorship';
import type { gateView, QuoteView } from '../../../server/sponsor-fees.ts';
import { api, post } from '../admin-api.ts';
import { FeeChoiceField } from './fees.tsx';
import { Block, CopyLink, Notice } from './shared.tsx';

type Gate = ReturnType<typeof gateView>;
interface State {
  inForce: QuoteView | null;
  open: QuoteView | null;
  gate: Gate;
  locked: string | null;
  url?: string;
}

const line = (q: QuoteView) => (q.surcharge ? `${q.base} plus a fee of ${q.surcharge} ${q.per}, ${q.total} ${q.per}` : `${q.total} ${q.per} (ZurichJS covers the fees)`);

export function SponsorFees({ id, pending, onSignedOut }: { id: string; pending: boolean; onSignedOut: () => void }) {
  const [data, setData] = useState<State | null>(null);
  const [choice, setChoice] = useState<FeeChoice>('absorb');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const path = `/api/membership/admin/sponsors/${encodeURIComponent(id)}/fees`;

  useEffect(() => {
    void api<State>(path).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      if (status !== 200) return setError(body.error ?? 'Could not load the fees.');
      setData(body);
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per sponsor
  }, []);

  const save = async () => {
    setBusy(true);
    setError('');
    setDone('');
    const { status, body } = await post<State>(path, { feeChoice: choice });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not save.');
    setData(body);
    setDone(
      pending
        ? 'Offer saved. They see it on their sponsorship page and agree to it before paying.'
        : choice === 'absorb'
          ? 'ZurichJS covers the fees from the next renewal.'
          : 'Sent to confirm. Nothing changes until they confirm it on their sponsorship page.',
    );
  };

  return (
    <Block id="h-sponsor-fees" title="Processing fees" intro="Who covers card processing fees on this sponsorship. A fee the sponsor covers is its own line on every renewal.">
      {!data && !error && <p class="m-0 text-compact text-ink-2">Loading…</p>}
      {data && (
        <>
          <p class="m-0 text-compact">{data.inForce ? `In force: ${line(data.inForce)}.` : 'In force: ZurichJS covers the fees (nothing recorded yet).'}</p>
          {data.open && <p class="m-0 text-compact">{pending ? `Offered: ${line(data.open)}.` : `Waiting for the sponsor to confirm: ${line(data.open)}.`}</p>}
          {data.locked ? (
            <p class="m-0 text-compact text-ink-2">{data.locked}</p>
          ) : (
            <>
              <FeeChoiceField gate={data.gate} value={choice} onChange={setChoice} />
              <div>
                <Button variant="secondary" disabled={busy} onClick={() => void save()}>
                  {busy ? 'Saving…' : pending ? 'Save the offer' : choice === 'absorb' ? 'ZurichJS covers the fees' : 'Send to confirm'}
                </Button>
              </div>
            </>
          )}
          {data.url && <CopyLink label="Link to confirm" url={data.url} />}
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice kind="done">{done}</Notice>}
    </Block>
  );
}
