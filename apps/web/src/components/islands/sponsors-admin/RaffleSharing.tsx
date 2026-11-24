/**
 * Sharing a raffle's entrant contacts with its sponsor, in the board's view
 * (/api/membership/admin/raffles/[id]/sharing). The board previews the entrants whose permission
 * counts now, narrows the selection, chooses the recipient, the fields and how long, confirms, and
 * releases. Releases can be withdrawn; entries are erased after the retention period. Off unless the
 * owner configured the sharing gate.
 */
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, SelectField, TextField } from '@zurichjs/design/islands/Field';
import { longDate, shortDateTime } from '../../../server/dates.ts';
import type { SharingSummary } from '../../../server/raffle.ts';
import { api, post } from '../admin-api.ts';
import { Notice, inputValue } from './shared.tsx';

interface Data {
  gate: { open: true; version: string; retentionDays: number } | { open: false; reason: string };
  offered: boolean;
  purpose: string | null;
  counts: { given: number; valid: number; withdrawn: number };
  preview: { id: string; name: string; email: string }[];
  recipients: { id: string; name: string; email: string }[];
  shares: { id: string; recipient: string; fields: string[]; count: number; createdAt: string; expiresAt: string; revokedAt: string | null }[];
  erasableFrom: string | null;
}

export function RaffleSharing({ raffleId, summary, onSignedOut }: { raffleId: string; summary: SharingSummary; onSignedOut: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [recipient, setRecipient] = useState('');
  const [fields, setFields] = useState<string[]>(['name', 'email']);
  const [days, setDays] = useState('7');
  const [sure, setSure] = useState(false);
  const [erase, setErase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const path = `/api/membership/admin/raffles/${encodeURIComponent(raffleId)}/sharing`;

  const load = async () => {
    setError('');
    const { status, body } = await api<Data>(path);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not load the sharing.');
    setData(body);
  };
  const send = async (payload: object, message: string) => {
    setBusy(true);
    setError('');
    setDone('');
    const { status, body } = await post<Data>(path, payload);
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'That did not work.');
    setData(body);
    setPicked([]);
    setSure(false);
    setErase(false);
    setDone(message);
  };

  if (!summary.offered) return <p class="m-0 text-compact text-ink-2">Entrants were not asked to share their contact for this raffle, so nothing can be shared.</p>;
  if (!data)
    return (
      <div class="flex flex-col gap-2">
        <p class="m-0 text-compact">Sharing with the sponsor: {summary.purpose}.</p>
        <div>
          <Button variant="secondary" onClick={() => void load()}>
            Sharing
          </Button>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
      </div>
    );

  const chosen = data.preview.filter((p) => picked.includes(p.id));
  const who = data.recipients.find((c) => c.id === recipient);
  const erasable = data.erasableFrom && data.erasableFrom <= new Date().toISOString();
  return (
    <div class="flex flex-col gap-4">
      <p class="m-0 text-compact">
        {data.counts.valid} {data.counts.valid === 1 ? 'entrant’s' : 'entrants’'} permission counts now ({data.counts.given} given, {data.counts.withdrawn} withdrawn). Purpose:{' '}
        {data.purpose}.
      </p>
      {!data.gate.open && <p class="m-0 text-compact text-ink-2">{data.gate.reason}</p>}
      {data.gate.open && data.preview.length > 0 && (
        <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
          <legend class="mb-2 p-0 text-compact font-bold">Release to the sponsor</legend>
          <div class="flex flex-wrap gap-3">
            <Button variant="plain" onClick={() => setPicked(data.preview.map((p) => p.id))}>
              Select all
            </Button>
            <Button variant="plain" onClick={() => setPicked([])}>
              Select none
            </Button>
          </div>
          {data.preview.map((p) => (
            <Checkbox
              key={p.id}
              label={`${p.name}, ${p.email}`}
              checked={picked.includes(p.id)}
              onChange={() => setPicked(picked.includes(p.id) ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
            />
          ))}
          <SelectField label="To" value={recipient} onChange={(e) => setRecipient(inputValue(e))}>
            <option value="">Choose a sponsor contact</option>
            {data.recipients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}, {c.email}
              </option>
            ))}
          </SelectField>
          <div class="flex flex-wrap gap-4">
            {(['name', 'email'] as const).map((k) => (
              <Checkbox
                key={k}
                label={k === 'name' ? 'Name' : 'Email'}
                checked={fields.includes(k)}
                onChange={() => setFields(fields.includes(k) ? fields.filter((x) => x !== k) : [...fields, k])}
              />
            ))}
          </div>
          <TextField label="Days they can see it" inputMode="numeric" value={days} hint="From 1 to 30." onInput={(e) => setDays(inputValue(e))} />
          <Checkbox
            label={`I release ${chosen.length} ${chosen.length === 1 ? 'contact' : 'contacts'} (${fields.join(' and ') || 'nothing'}) to ${who?.name ?? 'the chosen contact'} for ${days} days, only to ${data.purpose}.`}
            checked={sure}
            onChange={(e) => setSure((e.target as HTMLInputElement).checked)}
          />
          <div>
            <Button
              variant="primary"
              disabled={busy || !sure || !chosen.length || !who}
              onClick={() =>
                void send(
                  { action: 'release', entryIds: picked, recipientContactId: recipient, fields, days: Number(days), confirm: true },
                  'Released. They see it on their sponsorship page.',
                )
              }
            >
              {busy ? 'Releasing…' : 'Release'}
            </Button>
          </div>
        </fieldset>
      )}
      {data.gate.open && data.preview.length === 0 && <p class="m-0 text-compact text-ink-2">Nobody’s permission counts yet.</p>}
      {data.shares.length > 0 && (
        <ul class="m-0 flex list-none flex-col gap-2 p-0 text-compact">
          {data.shares.map((s) => (
            <li key={s.id} class="flex flex-wrap items-center gap-3">
              <span>
                {s.count} to {s.recipient} ({s.fields.join(', ')}), {shortDateTime(s.createdAt)}, {s.revokedAt ? 'withdrawn' : `until ${longDate(s.expiresAt.slice(0, 10))}`}
              </span>
              {!s.revokedAt && (
                <Button variant="plain" disabled={busy} onClick={() => void send({ action: 'revoke', shareId: s.id }, 'Release withdrawn.')}>
                  Withdraw
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.erasableFrom && (
        <div class="flex flex-col gap-2">
          <p class="m-0 text-compact text-ink-2">
            {erasable ? 'The retention period has passed.' : `The retention period runs until ${longDate(data.erasableFrom.slice(0, 10))}.`} Erasing removes every entrant’s name
            and email; draws and counts stay.
          </p>
          {erasable && (
            <>
              <Checkbox label="I erase every entrant’s name and email for this raffle." checked={erase} onChange={(e) => setErase((e.target as HTMLInputElement).checked)} />
              <div>
                <Button variant="secondary" disabled={busy || !erase} onClick={() => void send({ action: 'erase', confirm: true }, 'Entries erased.')}>
                  Erase entries
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice kind="done">{done}</Notice>}
    </div>
  );
}
