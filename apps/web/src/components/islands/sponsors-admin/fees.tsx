/**
 * Processing fees in the board's views: who covers them on an offer, and the fee settings (the
 * gate and the card tariffs). The server computes every amount; these only show it.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextField } from '@zurichjs/design/islands/Field';
import { FEE_CHOICE_LABEL, type FeeChoice } from '@zurichjs/sponsorship';
import { longDate } from '../../../server/dates.ts';
import type { gateView, quoteView, tariffView } from '../../../server/sponsor-fees.ts';
import { api, post } from '../admin-api.ts';
import { SubmitButton, optional } from '../forms/shared.tsx';
import { Block, Notice, inputValue, type FieldError } from './shared.tsx';

export type QuoteView = ReturnType<typeof quoteView>;
type Gate = ReturnType<typeof gateView>;
type TariffView = ReturnType<typeof tariffView>;

const FEES = '/api/membership/admin/fees';

/** The fee gate, loaded once: null while loading. */
export function useFeeGate(onSignedOut: () => void) {
  const [gate, setGate] = useState<Gate | null>(null);
  useEffect(() => {
    void api<{ gate: Gate }>(FEES).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      setGate(status === 200 ? body.gate : { open: false, reason: body.error ?? 'Could not load the fee settings. ZurichJS covers the fees.' });
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  return gate;
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

  useEffect(() => {
    void api<{ gate: Gate; tariffs: TariffView[] }>(FEES).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      if (status !== 200) return setLoadError(body.error ?? 'Could not load the fee settings.');
      setData(body);
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

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
