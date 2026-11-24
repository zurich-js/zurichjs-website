/**
 * Processing fees in the board's views: who covers them on an offer, and the fee settings (the
 * gate and the card tariffs). The server computes every amount; these only show it.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextField } from '@zurichjs/design/islands/Field';
import { FEE_CHOICE_LABEL, type FeeChoice } from '@zurichjs/sponsorship';
import { longDate } from '../../../server/dates.ts';
import type { paymentView } from '../../../pages/api/membership/admin/sponsors/[id]/payments.ts';
import type { PaymentLinkPreview } from '../../../pages/api/membership/admin/sponsors/[id]/payment-link.ts';
import type { gateView, quoteView, tariffView } from '../../../server/sponsor-fees.ts';
import { api, post } from '../admin-api.ts';
import { SubmitButton, optional } from '../forms/shared.tsx';
import { Block, Notice, inputValue, type FieldError } from './shared.tsx';

export type QuoteView = ReturnType<typeof quoteView>;
type Gate = ReturnType<typeof gateView>;
type TariffView = ReturnType<typeof tariffView>;

const FEES = '/api/membership/admin/fees';

/** The latest `onSignedOut`, for effects that should not re-run when the parent re-renders. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** The fee gate, loaded once: null while loading. */
export function useFeeGate(onSignedOut: () => void) {
  const [gate, setGate] = useState<Gate | null>(null);
  const signedOut = useLatest(onSignedOut);
  useEffect(() => {
    let current = true;
    void api<{ gate: Gate }>(FEES).then(({ status, body }) => {
      if (!current) return;
      if (status === 401) return signedOut.current();
      setGate(status === 200 ? body.gate : { open: false, reason: body.error ?? 'Could not load the fee settings. ZurichJS covers the fees.' });
    });
    return () => {
      current = false;
    };
  }, [signedOut]);
  return gate;
}

/** The server's figures for an offer before it is made: null while loading or after an error. */
export function usePreview(id: string, feeChoice: FeeChoice, onSignedOut: () => void) {
  const [preview, setPreview] = useState<PaymentLinkPreview | null>(null);
  const [error, setError] = useState('');
  const signedOut = useLatest(onSignedOut);
  useEffect(() => {
    let current = true;
    setPreview(null);
    setError('');
    void api<{ preview: PaymentLinkPreview }>(`/api/membership/admin/sponsors/${encodeURIComponent(id)}/payment-link?feeChoice=${feeChoice}`).then(({ status, body }) => {
      if (!current) return;
      if (status === 401) return signedOut.current();
      if (status !== 200) return setError(body.error ?? 'Could not work out the amounts. Try again.');
      setPreview(body.preview);
    });
    return () => {
      current = false;
    };
  }, [id, feeChoice, signedOut]);
  return { preview, error };
}

/** What the sponsor will be asked to pay, and what the card payment should cost and leave, before the link is made. */
export function OfferPreview({ preview: p, error }: { preview: PaymentLinkPreview | null; error: string }) {
  if (error) return <Notice kind="error">{error}</Notice>;
  if (!p) return <p class="m-0 text-compact text-ink-2">Working out the amounts…</p>;
  const rows: [string, string][] = [
    ['For', p.purpose],
    ['Amount', p.base],
    ...(p.surcharge ? ([['Processing fee the sponsor pays', p.surcharge]] as [string, string][]) : []),
    ['Total the sponsor pays', p.total],
    ...(p.estimate
      ? ([
          [`Card fee, estimated from tariff ${p.estimate.tariffVersion}`, p.estimate.fee],
          ['ZurichJS receives, estimated', p.estimate.net],
        ] as [string, string][])
      : []),
  ];
  return (
    <div class="flex flex-col gap-2">
      <dl class="m-0 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} class="flex min-w-0 flex-col gap-0.5">
            <dt class="text-meta text-grey-text">{k}</dt>
            <dd class="m-0 text-body font-bold break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <p class="m-0 text-compact text-ink-2">
        {p.estimate
          ? 'The actual card fee is recorded once Stripe reports it.'
          : 'No card tariff is entered, so the card fee is not estimated. Stripe reports the actual fee after payment.'}
      </p>
    </div>
  );
}

/** Who covers processing fees on this offer. "Sponsor covers the fees" shows only with the gate open. */
export function FeeChoiceField({ gate, value, onChange }: { gate: Gate | null; value: FeeChoice; onChange: (v: FeeChoice) => void }) {
  if (!gate) return <p class="m-0 text-compact text-ink-2">Loading the fee settings…</p>;
  if (!gate.open)
    return (
      <div class="flex flex-col gap-1">
        <p class="m-0 text-compact font-bold">{FEE_CHOICE_LABEL.absorb}</p>
        <p class="m-0 text-compact text-ink-2">{gate.reason}</p>
      </div>
    );
  return (
    <div class="flex flex-col gap-1">
      <ChipGroup label="Processing fees" value={value} onChange={onChange} options={(['absorb', 'pass_through'] as const).map((c) => ({ value: c, label: FEE_CHOICE_LABEL[c] }))} />
      {value === 'pass_through' && (
        <p class="m-0 text-compact text-ink-2">
          The sponsor pays a surcharge at tariff {gate.tariff.version} ({gate.tariff.rateLabel} plus {gate.tariff.fixedLabel} per payment), under policy {gate.policyVersion}. It is
          its own line on the payment page and the receipt.
        </p>
      )}
    </div>
  );
}

/** The board's fee settings: whether "Sponsor covers the fees" is available, and the card tariffs. */
export function FeeSettings({ onSignedOut }: { onSignedOut: () => void }) {
  const [data, setData] = useState<{ gate: Gate; tariffs: TariffView[] } | null>(null);
  const [loadError, setLoadError] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ version: '', ratePercent: '', fixedChf: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [done, setDone] = useState('');
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  const signedOut = useLatest(onSignedOut);
  useEffect(() => {
    let current = true;
    void api<{ gate: Gate; tariffs: TariffView[] }>(FEES).then(({ status, body }) => {
      if (!current) return;
      if (status === 401) return signedOut.current();
      if (status !== 200) return setLoadError(body.error ?? 'Could not load the fee settings.');
      setData(body);
    });
    return () => {
      current = false;
    };
  }, [signedOut]);

  const save = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const { status, body } = await post<{ gate: Gate; tariffs: TariffView[] }>(FEES, f);
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not save the tariff.' });
    setData(body);
    setAdding(false);
    setDone(`Tariff ${f.version} saved.`);
    setF({ version: '', ratePercent: '', fixedChf: '', note: '' });
  };

  return (
    <Block
      id="h-fees"
      title="Processing fees"
      intro="ZurichJS covers card processing fees unless an offer says the sponsor covers them. That choice needs a card tariff here and a surcharge policy the owner approved."
    >
      {!data && !loadError && <p class="m-0 text-compact text-ink-2">Loading the fee settings…</p>}
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {data && (
        <>
          <p class="m-0 text-body">
            {data.gate.open
              ? `“Sponsor covers the fees” is available: tariff ${data.gate.tariff.version}, policy ${data.gate.policyVersion}.`
              : `“Sponsor covers the fees” is off. ${data.gate.reason}`}
          </p>
          {data.tariffs.length > 0 && (
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
              {data.tariffs.map((t) => (
                <li key={t.version} class="text-compact">
                  <strong>{t.version}</strong>: {t.rateLabel} plus {t.fixedLabel} per card payment, entered {longDate(t.enteredAt.slice(0, 10))}
                  {t.note ? `. ${t.note}` : ''}
                </li>
              ))}
            </ul>
          )}
          {done && <Notice kind="done">{done}</Notice>}
          {!adding ? (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setAdding(true);
                  setDone('');
                }}
              >
                Add a tariff
              </Button>
            </div>
          ) : (
            <form class="flex flex-col gap-4" noValidate onSubmit={save}>
              <p class="m-0 text-compact text-ink-2">Copy the rates from the Stripe account’s pricing page. A tariff is never changed; a new rate is a new version.</p>
              <TextField
                label="Version"
                hint="For example stripe-ch-2026-12"
                value={f.version}
                error={err('version')}
                invalid={!!err('version')}
                onInput={(e) => setF({ ...f, version: inputValue(e) })}
              />
              <TextField
                label="Rate per card payment (%)"
                inputMode="decimal"
                value={f.ratePercent}
                error={err('ratePercent')}
                invalid={!!err('ratePercent')}
                onInput={(e) => setF({ ...f, ratePercent: inputValue(e) })}
              />
              <TextField
                label="Fixed fee per card payment (CHF)"
                inputMode="decimal"
                value={f.fixedChf}
                error={err('fixedChf')}
                invalid={!!err('fixedChf')}
                onInput={(e) => setF({ ...f, fixedChf: inputValue(e) })}
              />
              <TextField label={optional('Where the rate comes from')} value={f.note} onInput={(e) => setF({ ...f, note: inputValue(e) })} />
              {error && !['version', 'ratePercent', 'fixedChf'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
              <div class="flex flex-wrap gap-3">
                <SubmitButton busy={busy}>{busy ? 'Saving…' : 'Save the tariff'}</SubmitButton>
                <Button variant="secondary" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </Block>
  );
}

type Payment = ReturnType<typeof paymentView>;
export function SponsorPayments({ id, onSignedOut, onChanged }: { id: string; onSignedOut: () => void; onChanged: () => void }) {
  const url = `/api/membership/admin/sponsors/${encodeURIComponent(id)}/payments`;
  const signedOut = useLatest(onSignedOut);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [settlements, setSettlements] = useState<Record<string, string>>({});
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let current = true;
    setError('');
    void api<{ payments: Payment[] }>(url)
      .then(({ status, body }) => {
        if (!current) return;
        if (status === 401) return signedOut.current();
        if (status !== 200) return setError(body.error ?? 'Could not load payments.');
        setPayments(body.payments);
      })
      .catch(() => {
        if (current) setError('Could not load payments.');
      });
    return () => {
      current = false;
    };
  }, [url, signedOut, reload]);
  const decide = async (action: 'reconcile' | 'accept' | 'dismiss', sessionId?: string) => {
    setBusy(true);
    setError('');
    try {
      const { status, body } = await post<{ payments: Payment[] }>(url, { action, sessionId, note: sessionId ? settlements[sessionId] : undefined });
      if (status === 401) return signedOut.current();
      if (status !== 200) return setError(body.error ?? 'Could not update the payment.');
      setPayments(body.payments);
      onChanged();
    } catch {
      setError('Could not update the payment. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Block id="h-payments" title="Card payments">
      {error && (
        <>
          <Notice kind="error">{error}</Notice>
          <Button variant="secondary" onClick={() => setReload((n) => n + 1)}>
            Reload payments
          </Button>
        </>
      )}
      {!payments && !error && <p>Loading payments…</p>}
      {payments?.length === 0 && <p>No payments recorded.</p>}
      {payments?.map((p) => (
        <div key={p.sessionId} class="flex flex-col gap-2">
          <strong>{p.amount}</strong>
          <span>{p.sessionId}</span>
          <span>
            {p.reason ?? 'Payment received.'} {p.resolution && `Board decision: ${p.resolution}.`}
          </span>
          <span>{p.fee ? `Stripe fee ${p.fee}. ZurichJS received ${p.net}.` : 'Stripe fee pending.'}</span>
          {p.outcome === 'review' && !p.resolution && (
            <>
              <TextField
                label="How this payment was settled"
                value={settlements[p.sessionId] ?? ''}
                onInput={(e) => setSettlements({ ...settlements, [p.sessionId]: inputValue(e) })}
              />
              <div class="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={busy} onClick={() => void decide('accept', p.sessionId)}>
                  Accept payment for sponsorship
                </Button>
                <Button variant="secondary" disabled={busy || !settlements[p.sessionId]?.trim()} onClick={() => void decide('dismiss', p.sessionId)}>
                  Record settlement
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      {payments?.some((p) => p.fee === null) && (
        <Button variant="secondary" disabled={busy} onClick={() => void decide('reconcile')}>
          Check actual fees with Stripe
        </Button>
      )}
    </Block>
  );
}
