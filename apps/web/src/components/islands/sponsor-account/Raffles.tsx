/**
 * "Raffle add-ons" on /partners/account (GET/POST /api/sponsorship/raffles). A raffle is paid for
 * apart from the sponsorship and is not part of any tier. The sponsor proposes one for an upcoming
 * meetup, the board makes an offer, the sponsor accepts the raffle terms of that offer and pays
 * through its link. Amounts come from the server; nothing is computed here.
 */
import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, SelectField, TextField } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { buttonClass, cardClass } from '@zurichjs/design/recipes';
import { longDate } from '../../../server/dates.ts';
import type { RaffleView } from '../../../server/raffle.ts';
import { api, post } from '../admin-api.ts';
import { TextButton } from '../forms/shared.tsx';

type SponsorRaffle = RaffleView & {
  deletionTasks: { shareId: string; entryId: string; consentId: string; acknowledged: boolean }[];
  shares: { id: string; expiresAt: string; count: number }[];
};

interface Data {
  raffles: SponsorRaffle[];
  eligible: boolean;
  reason: string | null;
  terms: { open: boolean; version?: string; url?: string };
}
interface Meetup {
  id: string;
  title: string;
  date: string;
}
type Res<T> = { ok: true; data: T } | { ok: false; error: string; field?: string };

async function call<T>(path: string, body: unknown, onSignedOut: () => void): Promise<Res<T> | null> {
  const { status, body: data } = body === undefined ? await api<T>(path) : await post<T>(path, body);
  if (status === 401) {
    onSignedOut();
    return null;
  }
  if (status !== 200 || !data.ok) return { ok: false, error: data.error ?? 'We couldn’t load the raffle details.', field: data.field };
  return { ok: true, data };
}

const body = 'm-0 text-body text-ink-2 text-pretty';
const hint = 'm-0 text-compact text-ink-2 text-pretty';

export function Raffles({ contactEmail, onSignedOut }: { contactEmail: string; onSignedOut: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [proposing, setProposing] = useState(false);
  const [flash, setFlash] = useState('');

  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;
  const revision = useRef({ value: 0 });
  const load = useCallback(async () => {
    const at = ++revision.current.value;
    setError('');
    const r = await call<Data>('/api/sponsorship/raffles', undefined, () => signedOut.current());
    if (at !== revision.current.value || !r) return;
    if (!r.ok) return setError(r.error);
    setData(r.data);
  }, []);
  useEffect(() => {
    const request = revision.current;
    void load();
    return () => {
      request.value++;
    };
  }, [load]);

  return (
    <section aria-labelledby="h-raffles" aria-busy={!data && !error} class={cardClass('outline', 'lg')}>
      <Heading id="h-raffles" size="subsection" focus class="scroll-mt-header">
        Raffle add-ons
      </Heading>
      <p class={body}>
        Add a raffle to a meetup you sponsor: you fund a prize, and ZurichJS runs the entry, the draw and the prize. It is paid for apart from your sponsorship and is not part of
        any tier.
      </p>
      {!data && !error && (
        <p role="status" class={body}>
          Loading your raffles…
        </p>
      )}
      {error && (
        <>
          <Notice tone="danger" live title={error} />
          <div>
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        </>
      )}
      {flash && <Notice tone="success" live title={flash} />}
      {data && (
        <>
          {data.raffles.length === 0 && <p class={hint}>No raffles yet.</p>}
          {data.raffles.length > 0 && (
            <ul class="m-0 flex list-none flex-col gap-4 p-0">
              {data.raffles.map((r) => (
                <RaffleItem
                  key={`${r.id}:${r.quote?.id}:${r.termsVersion}`}
                  r={r}
                  terms={data.terms}
                  onSignedOut={onSignedOut}
                  onChanged={(text) => {
                    setFlash(text);
                    void load();
                  }}
                />
              ))}
            </ul>
          )}
          {!data.eligible ? (
            <p class={hint}>
              {data.reason} Questions: {contactEmail}.
            </p>
          ) : proposing ? (
            <Propose
              onSignedOut={onSignedOut}
              onCancel={() => setProposing(false)}
              onDone={() => {
                setProposing(false);
                setFlash('Thank you. We look at your proposal and send you an offer.');
                void load();
              }}
            />
          ) : (
            <div>
              <Button
                variant="secondary"
                onClick={() => {
                  setFlash('');
                  setProposing(true);
                }}
              >
                Propose a raffle
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RaffleItem({ r, terms, onSignedOut, onChanged }: { r: SponsorRaffle; terms: Data['terms']; onSignedOut: () => void; onChanged: (text: string) => void }) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const waiting = r.stage === 'offered' && !r.accepted;
  const termsMatch = terms.open && terms.version === r.termsVersion;

  const send = async (payload: object, what: string, done: string) => {
    setBusy(what);
    setError('');
    const res = await call<{ raffle: RaffleView }>(`/api/sponsorship/raffles/${encodeURIComponent(r.id)}`, payload, onSignedOut);
    setBusy('');
    if (!res) return;
    if (!res.ok) return setError(res.error);
    onChanged(done);
  };

  const q = r.quote;
  return (
    <li id={`raffle-${r.id}`} class={cardClass('filled', 'md', 'scroll-mt-header')}>
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
        <div class="flex min-w-0 flex-col">
          <span class="text-lead font-bold break-words">
            {r.quantity > 1 ? `${r.quantity} × ` : ''}
            {r.prize}
          </span>
          <span class="text-compact text-ink-2">
            {r.eventTitle}, {r.eventDateLabel}
          </span>
        </div>
        <Tag tone={r.stage === 'ready' || r.stage === 'offered' ? 'black' : 'grey'}>{r.stageLabel}</Tag>
      </div>
      {r.fulfilment === 'in_kind' ? (
        <p class={hint}>You send the prize to us; there is nothing to pay.</p>
      ) : q ? (
        <dl class="m-0 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <div class="flex flex-col gap-0.5">
            <dt class="text-meta text-grey-text">Prize amount</dt>
            <dd class="m-0 text-body font-bold">{q.base}</dd>
          </div>
          {q.surcharge && (
            <div class="flex flex-col gap-0.5">
              <dt class="text-meta text-grey-text">Payment processing fee</dt>
              <dd class="m-0 text-body font-bold">{q.surcharge}</dd>
            </div>
          )}
          <div class="flex flex-col gap-0.5">
            <dt class="text-meta text-grey-text">Total</dt>
            <dd class="m-0 text-body font-bold">{q.total}</dd>
          </div>
        </dl>
      ) : r.stage === 'proposed' ? (
        <p class={hint}>Your budget: {r.budget}. We send you an offer with the amount.</p>
      ) : null}
      {q?.surcharge && <p class={hint}>You cover the card processing fee: it is a separate line on the payment page and your receipt. The fee is our estimate.</p>}
      {r.funding !== 'unpaid' && r.funding !== 'in_kind' && <p class={hint}>{r.fundingLabel}.</p>}
      {r.entries !== null && (
        <p class={hint}>
          {r.entries} {r.entries === 1 ? 'entry' : 'entries'}
          {r.winningCode ? `. Winning claim code ${r.winningCode}; we contact the winner.` : '.'} We never share who entered unless each person agreed.{' '}
          <a class="font-bold text-black" href={`/raffle?r=${encodeURIComponent(r.id)}`}>
            Entry page
          </a>
        </p>
      )}
      {r.reason && (r.stage === 'declined' || r.stage === 'cancelled' || r.stage === 'on_hold') && <p class={hint}>{r.reason}</p>}
      {waiting &&
        (termsMatch ? (
          <div class="flex flex-col gap-3">
            <Checkbox
              label={
                <>
                  I accept the{' '}
                  <a class="font-bold text-black" href={terms.url} target="_blank" rel="noopener">
                    raffle terms
                  </a>{' '}
                  (version {r.termsVersion}) for this raffle
                </>
              }
              checked={agree}
              onChange={(e) => setAgree(e.currentTarget.checked)}
            />
            <div class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
              <Button
                variant="primary"
                disabled={!agree || !!busy}
                onClick={() => void send({ action: 'accept', quoteId: r.quote?.id ?? null, termsVersion: r.termsVersion, confirm: true }, 'accept', 'Terms accepted.')}
              >
                {busy === 'accept' ? 'Accepting…' : 'Accept the offer'}
              </Button>
              <TextButton disabled={!!busy} onClick={() => void send({ action: 'withdraw' }, 'withdraw', 'Raffle withdrawn.')}>
                Withdraw
              </TextButton>
            </div>
          </div>
        ) : (
          <p class={hint}>The raffle terms changed since this offer. We send you a new one.</p>
        ))}
      {r.payUrl && r.accepted && (
        <div>
          <a class={buttonClass({ variant: 'cta' })} href={r.payUrl} rel="noopener">
            Pay {q?.total} by card
          </a>
        </div>
      )}
      {r.deletionTasks
        ?.filter((task) => !task.acknowledged)
        .map((task) => (
          <div key={task.shareId + task.consentId}>
            <p>Permission was withdrawn for reference {task.entryId}. Delete or suppress your copy under the recipient policy.</p>
            <Button
              variant="secondary"
              disabled={!!busy}
              onClick={() => void send({ action: 'acknowledge_deletion', shareId: task.shareId, consentId: task.consentId }, 'acknowledge', 'Your acknowledgement was recorded.')}
            >
              Confirm deletion or suppression
            </Button>
          </div>
        ))}
      {r.shares.map((s) => (
        <SharedContacts key={s.id} raffleId={r.id} share={s} onSignedOut={onSignedOut} />
      ))}
      {r.stage === 'proposed' && (
        <div>
          <TextButton disabled={!!busy} onClick={() => void send({ action: 'withdraw' }, 'withdraw', 'Raffle withdrawn.')}>
            {busy === 'withdraw' ? 'Withdrawing…' : 'Withdraw'}
          </TextButton>
        </div>
      )}
      {error && <Notice tone="danger" live title={error} />}
    </li>
  );
}

function Propose({ onSignedOut, onCancel, onDone }: { onSignedOut: () => void; onCancel: () => void; onDone: () => void }) {
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);
  const [f, setF] = useState({ eventId: '', prize: '', quantity: '1', budgetChf: '', fulfilment: 'zurichjs' as 'zurichjs' | 'in_kind' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const err = (k: string) => (error?.field === k ? error.message : undefined);

  useEffect(() => {
    let active = true;
    void call<{ meetups: Meetup[] }>('/api/sponsorship/meetups', undefined, onSignedOut).then((r) => {
      if (!active || !r) return;
      if (!r.ok) setError({ field: 'eventId', message: r.error });
      setMeetups(r.ok ? r.data.meetups : []);
    });
    return () => {
      active = false;
    };
  }, [onSignedOut]);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await call('/api/sponsorship/raffles', { ...f, quantity: Number(f.quantity), budgetChf: f.fulfilment === 'zurichjs' ? Number(f.budgetChf) : undefined }, onSignedOut);
    setBusy(false);
    if (!r) return;
    if (!r.ok) return setError({ field: r.field, message: r.error });
    onDone();
  };

  return (
    <form class="flex flex-col gap-4" noValidate onSubmit={submit}>
      <Heading as="h3" size="card">
        Propose a raffle
      </Heading>
      <SelectField
        label="Meetup"
        value={f.eventId}
        error={err('eventId')}
        invalid={!!err('eventId')}
        onChange={(e) => setF({ ...f, eventId: (e.target as HTMLSelectElement).value })}
      >
        <option value="">{!meetups ? 'Loading the meetups…' : meetups.length || err('eventId') ? 'Choose an upcoming meetup' : 'No upcoming meetup is published yet'}</option>
        {(meetups ?? []).map((m) => (
          <option key={m.id} value={m.id}>
            {m.title}, {longDate(m.date)}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Prize"
        hint="What the winner gets, for example a mechanical keyboard"
        value={f.prize}
        error={err('prize')}
        invalid={!!err('prize')}
        onInput={(e) => setF({ ...f, prize: (e.target as HTMLInputElement).value })}
      />
      <TextField
        label="How many"
        inputMode="numeric"
        value={f.quantity}
        error={err('quantity')}
        invalid={!!err('quantity')}
        onInput={(e) => setF({ ...f, quantity: (e.target as HTMLInputElement).value })}
      />
      <ChipGroup
        label="Who provides the prize"
        value={f.fulfilment}
        onChange={(v) => setF({ ...f, fulfilment: v })}
        options={[
          { value: 'zurichjs', label: 'ZurichJS buys it with your money' },
          { value: 'in_kind', label: 'You send it to us' },
        ]}
      />
      {f.fulfilment === 'zurichjs' && (
        <TextField
          label="Budget (CHF)"
          inputMode="numeric"
          value={f.budgetChf}
          error={err('budgetChf')}
          invalid={!!err('budgetChf')}
          onInput={(e) => setF({ ...f, budgetChf: (e.target as HTMLInputElement).value })}
        />
      )}
      <p class={hint}>Nothing is charged now. We confirm the meetup and send you an offer with the amount and the raffle terms.</p>
      {error && !['eventId', 'prize', 'quantity', 'budgetChf'].includes(error.field ?? '') && <Notice tone="danger" live title={error.message} />}
      <div class="flex flex-col gap-3 md:flex-row md:items-center">
        <Button type="submit" variant="primary" disabled={busy || !meetups?.length}>
          {busy ? 'Sending…' : 'Send the proposal'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Contacts the board released to this person, read on demand. Each read is narrowed to the
 * entrants whose permission still counts, so someone who withdrew is gone from the list.
 */
function SharedContacts({ raffleId, share, onSignedOut }: { raffleId: string; share: { id: string; expiresAt: string; count: number }; onSignedOut: () => void }) {
  const [data, setData] = useState<{ purpose: string; rows: { reference: string; name: string; email: string }[]; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setBusy(true);
    setError('');
    const r = await call<{ purpose: string; rows: { reference: string; name: string; email: string }[]; expiresAt: string }>(
      `/api/sponsorship/raffles/${encodeURIComponent(raffleId)}/share?s=${encodeURIComponent(share.id)}`,
      undefined,
      onSignedOut,
    );
    setBusy(false);
    if (!r) return;
    if (!r.ok) return setError(r.error);
    setData(r.data);
  };
  const until = longDate(share.expiresAt.slice(0, 10));
  return (
    <div class="flex flex-col gap-3">
      {!data ? (
        <div>
          <Button variant="secondary" disabled={busy} onClick={() => void load()}>
            {busy ? 'Loading…' : `See the contacts we shared (until ${until})`}
          </Button>
        </div>
      ) : (
        <>
          <p class={hint}>
            Use these only to {data.purpose}. Each person agreed and can withdraw at any time: they then drop off this list, and you delete or stop using their data, as the
            recipient policy says. We cannot recall copies you made. Available until {until}.
          </p>
          {data.rows.length ? (
            <ul class="m-0 flex list-none flex-col gap-1 p-0 text-compact">
              {data.rows.map((x) => (
                <li key={x.reference} class="break-words">
                  {[x.name, x.email].filter(Boolean).join(', ')} (reference {x.reference})
                </li>
              ))}
            </ul>
          ) : (
            <p class={hint}>Nobody on this list has a permission that counts now.</p>
          )}
        </>
      )}
      {error && <Notice tone="danger" live title={error} />}
    </div>
  );
}
