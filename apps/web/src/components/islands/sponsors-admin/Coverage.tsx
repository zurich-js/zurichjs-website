/**
 * The meetups a recurring sponsorship covers, in the board's view of a sponsor. Only meetups
 * confirmed here show on the sponsor's dashboard. Taking one off keeps it in the history below;
 * a meetup that has happened (on its current date in Sanity, as the sponsor sees it) cannot be taken off.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Loading } from '@zurichjs/design/islands/Loading';
import { Button } from '@zurichjs/design/islands/Button';
import { SelectField } from '@zurichjs/design/islands/Field';
import { Tag } from '@zurichjs/design/islands/Tag';
import { longDate } from '../../../server/dates.ts';
import type { AdminSponsorView } from '../../../server/sponsor.ts';
import type { coverageHistoryView } from '../../../server/sponsor-coverage.ts';
import { api, post } from '../admin-api.ts';
import { BASE, Block, Notice, inputValue, useMeetups } from './shared.tsx';

type Row = ReturnType<typeof coverageHistoryView>[number];

export function Coverage({ id, sponsor: s, onChanged, onSignedOut }: { id: string; sponsor: AdminSponsorView; onChanged: () => void; onSignedOut: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [checked, setChecked] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState('');
  const { meetups, error: meetupsError } = useMeetups(true, onSignedOut);

  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;

  useEffect(() => {
    let current = true;
    setRows(null);
    setError('');
    void api<{ coverage: Row[]; checked: boolean; locked: string | null }>(`${BASE}/${id}/coverage`)
      .then(({ status, body }) => {
        if (!current) return;
        if (status === 401) return signedOut.current();
        if (status !== 200) return setError(body.error ?? 'Could not load the covered meetups.');
        setRows(body.coverage);
        setChecked(body.checked);
        setLocked(body.locked);
      })
      .catch(() => {
        if (current) setError('Could not load the covered meetups. Reload the page to try again.');
      });
    return () => {
      current = false;
    };
  }, [id, s.status]);

  const change = async (action: 'add' | 'remove', eventId: string, title: string) => {
    setBusy(`${action}:${eventId}`);
    setError('');
    setDone('');
    const response = await post<{ coverage: Row[]; checked: boolean }>(`${BASE}/${id}/coverage`, { action, eventId })
      .catch(() => null)
      .finally(() => setBusy(''));
    if (!response) return setError('We couldn’t confirm this change. Reload the sponsor to check the covered meetups.');
    const { status, body } = response;
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not change the covered meetups.');
    setRows(body.coverage);
    setChecked(body.checked);
    setPick('');
    setDone(action === 'add' ? `${title} is now covered.` : `${title} was taken off. It stays in the history.`);
    onChanged();
  };

  const covered = (rows ?? []).filter((r) => !r.removedAt);
  const removed = (rows ?? []).filter((r) => r.removedAt);
  const choices = (meetups ?? []).filter((m) => !covered.some((r) => r.eventId === m.id));
  const chosen = choices.find((m) => m.id === pick);

  return (
    <Block
      id="h-coverage"
      title="Covered meetups"
      intro={`Being a sponsor does not cover every meetup. Confirm each meetup ${s.companyName} sponsors; only those show on their sponsorship page.`}
    >
      {!rows && !error && <Loading size="compact">Loading the covered meetups…</Loading>}
      {rows && covered.length === 0 && <p class="m-0 text-compact text-ink-2">No meetup is confirmed yet.</p>}
      {rows && covered.length > 0 && !checked && (
        <p class="m-0 text-compact text-ink-2">Sanity could not be reached, so dates are as last saved. Taking a meetup off waits until its current date can be checked.</p>
      )}
      {covered.length > 0 && (
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {covered.map((r) => (
            <li key={r.eventId} class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
              <span class="flex min-w-0 flex-col">
                <span class="text-body font-bold break-words">{r.title}</span>
                <span class="text-compact text-ink-2">{longDate(r.current?.date ?? r.date)}</span>
              </span>
              {r.current?.state === 'past' ? (
                <Tag>Happened</Tag>
              ) : (
                !locked && (
                  <Button variant="secondary" disabled={!!busy || !checked} onClick={() => void change('remove', r.eventId, r.title)}>
                    {busy === `remove:${r.eventId}` ? 'Taking off…' : 'Take off'}
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
      {locked && <p class="m-0 text-compact text-ink-2">{locked}</p>}
      {rows && !locked && (
        <div class="flex flex-col gap-3 md:flex-row md:items-end">
          <SelectField
            label="Add a meetup"
            hint={
              meetupsError ||
              (meetups?.length === 0 ? 'No upcoming meetup is published yet.' : meetups && !choices.length ? 'Every upcoming published meetup is covered already.' : undefined)
            }
            value={pick}
            onChange={(e) => setPick(inputValue(e))}
            disabled={!meetups || !choices.length}
          >
            <option value="">{meetups ? 'Choose an upcoming meetup' : 'Loading the meetups…'}</option>
            {choices.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}, {longDate(m.date)}
              </option>
            ))}
          </SelectField>
          <Button variant="secondary" disabled={!chosen || !!busy} onClick={() => chosen && void change('add', chosen.id, chosen.title)}>
            {busy.startsWith('add:') ? 'Adding…' : 'Add'}
          </Button>
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice kind="done">{done}</Notice>}
      {removed.length > 0 && (
        <details>
          <summary class="cursor-pointer py-2.5 text-compact font-bold">Taken off ({removed.length})</summary>
          <ul class="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-compact text-ink-2">
            {removed.map((r) => (
              <li key={r.eventId}>
                {r.title}, {longDate(r.date)}: taken off by {r.removedBy === 'board' ? 'the board' : r.removedBy} on {longDate(r.removedAt!.slice(0, 10))}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Block>
  );
}
