/**
 * Raffle add-ons in the board's view of a sponsor: the proposal, the offer (amount and who covers
 * fees, under the approved raffle terms), gift accounting, readiness, holds, cancellations and
 * refunds, and the flags that need a decision. Every amount comes from the server. The rules are in
 * /api/membership/admin/raffles/[id].
 */
import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextField } from '@zurichjs/design/islands/Field';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass } from '@zurichjs/design/recipes';
import type { FeeChoice } from '@zurichjs/sponsorship';
import { longDate, shortDateTime } from '../../../server/dates.ts';
import type { AdminRaffleView } from '../../../server/raffle.ts';
import type { gateView } from '../../../server/sponsor-fees.ts';
import { api, post } from '../admin-api.ts';
import { FeeChoiceField } from './fees.tsx';
import { RaffleSharing } from './RaffleSharing.tsx';
import { Block, CopyLink, Notice, inputValue } from './shared.tsx';

type Gate = ReturnType<typeof gateView>;
type Terms = { open: true; version: string } | { open: false; reason: string };

const FLAG_LABEL: Record<string, string> = {
  late_payment: 'Paid after the sponsorship stopped being eligible',
  amount_mismatch: 'Payment differs from the offer',
  meetup_changed: 'Host meetup changed',
  refund_review: 'Money in: decide on a refund',
};
const SETTLEMENT: Record<AdminRaffleView['settlement']['state'], (s: AdminRaffleView['settlement']) => string> = {
  in_kind: () => 'Prize sent by the sponsor; no money involved.',
  nothing_yet: () => 'No money in or out yet.',
  not_spent: (s) => `Received ${s.receivedLabel}; nothing spent yet.`,
  underspend: (s) => `Spent ${s.spentLabel}, ${s.differenceLabel} under the amount. The board decides what happens with it.`,
  overspend: (s) => `Spent ${s.spentLabel}, ${s.differenceLabel} over the amount. The board decides who covers it.`,
  balanced: (s) => `Spent ${s.spentLabel}, as offered.`,
};

type Form = 'offer' | 'decline' | 'ledger' | 'in_kind' | 'hold' | 'cancel' | 'refunded' | 'open' | 'draw' | 'redraw' | 'fulfil' | null;

export function Raffles({ id, onSignedOut }: { id: string; onSignedOut: () => void }) {
  const [data, setData] = useState<{ raffles: AdminRaffleView[]; terms: Terms; rules: Terms; fees: Gate } | null>(null);
  const [error, setError] = useState('');
  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;
  const revision = useRef({ value: 0 });
  const load = useCallback(async () => {
    const at = ++revision.current.value;
    const { status, body } = await api<{ raffles: AdminRaffleView[]; terms: Terms; rules: Terms; fees: Gate }>(`/api/membership/admin/raffles?sponsorId=${encodeURIComponent(id)}`);
    if (at !== revision.current.value) return;
    if (status === 401) return signedOut.current();
    if (status !== 200) return setError(body.error ?? 'Could not load the raffles.');
    setError('');
    setData(body);
  }, [id]);
  useEffect(() => {
    const request = revision.current;
    void load();
    return () => {
      request.value++;
    };
  }, [load]);

  return (
    <Block
      id="h-raffles"
      title="Raffle add-ons"
      intro="Paid apart from the sponsorship. ZurichJS runs the raffle. Entrant names and emails show here only where the board needs them (the winner, a release), never in Slack."
    >
      {!data && !error && <p class="m-0 text-compact text-ink-2">Loading the raffles…</p>}
      {error && <Notice kind="error">{error}</Notice>}
      {data && !data.terms.open && <p class="m-0 text-compact text-ink-2">{data.terms.reason}</p>}
      {data && data.raffles.length === 0 && <p class="m-0 text-compact text-ink-2">No raffle proposed yet.</p>}
      {data?.raffles.map((r) => (
        <RaffleCard key={r.id} r={r} terms={data.terms} rules={data.rules} fees={data.fees} onSignedOut={onSignedOut} onChanged={load} />
      ))}
    </Block>
  );
}

function RaffleCard({
  r,
  terms,
  rules,
  fees,
  onSignedOut,
  onChanged,
}: {
  r: AdminRaffleView;
  terms: Terms;
  rules: Terms;
  fees: Gate;
  onSignedOut: () => void;
  onChanged: () => Promise<void>;
}) {
  const [form, setForm] = useState<Form>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const [feeChoice, setFeeChoice] = useState<FeeChoice>('absorb');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const act = async (action: string, extra: object, message: string) => {
    setBusy(true);
    setError('');
    setDone('');
    const { status, body } = await post<{ raffle: AdminRaffleView }>(`/api/membership/admin/raffles/${encodeURIComponent(r.id)}`, { action, ...extra });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'That did not work.');
    setForm(null);
    setF({});
    setDone(message);
    await onChanged();
  };
  const field = (key: string, label: string, hint?: string) => (
    <TextField key={key} label={label} hint={hint} value={f[key] ?? ''} onInput={(e) => setF({ ...f, [key]: inputValue(e) })} />
  );
  const open = (which: Form) => {
    setDone('');
    setError('');
    setForm(form === which ? null : which);
  };
  const s = r.stage;
  const money = r.funding === 'paid' || r.funding === 'refund_pending';
  const actions: [Form | 'ready' | 'refund' | 'resume' | 'close', string][] = [
    ...(s === 'ready' && rules.open ? [['open', 'Open entries'] as [Form, string]] : []),
    ...(s === 'open' ? [['close', 'Close entries'] as ['close', string]] : []),
    ...(s === 'closed' ? [['draw', 'Draw the winner'] as [Form, string]] : []),
    ...(s === 'drawn' && r.claimDecision === 'expired' ? [['redraw', 'Draw again'] as [Form, string]] : []),
    ...(s === 'drawn' && r.claimDecision === 'claimed' ? [['fulfil', 'Prize delivered'] as [Form, string]] : []),
    ...((s === 'proposed' || s === 'on_hold') && terms.open ? [['offer', s === 'on_hold' ? 'Send a new offer' : 'Make an offer'] as [Form, string]] : []),
    ...(s === 'proposed' ? [['decline', 'Decline'] as [Form, string]] : []),
    ...(r.fulfilment === 'in_kind' && r.funding === 'unpaid' && s === 'offered' ? [['in_kind', 'Prize arrived'] as [Form, string]] : []),
    ...(r.fulfilment === 'zurichjs' && money ? [['ledger', 'Record a cost'] as [Form, string]] : []),
    ...(s === 'offered' ? [['ready', 'Mark ready'] as ['ready', string]] : []),
    ...(s === 'on_hold' ? [['resume', 'Go ahead'] as ['resume', string]] : []),
    ...(['offered', 'ready'].includes(s) ? [['hold', 'Put on hold'] as [Form, string]] : []),
    ...(['proposed', 'offered', 'ready', 'on_hold'].includes(s) ? [['cancel', 'Cancel'] as [Form, string]] : []),
    ...(r.funding === 'paid' && r.flags.includes('refund_review') ? [['refund', 'Decide: refund'] as ['refund', string]] : []),
    ...(r.funding === 'refund_pending' ? [['refunded', 'Record the refund'] as [Form, string]] : []),
  ];

  return (
    <article aria-label={`${r.prize}, ${r.eventTitle}`} class={cardClass('outline', 'md')}>
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between md:gap-4">
        <div class="flex min-w-0 flex-col">
          <span class="text-body font-bold break-words">
            {r.quantity > 1 ? `${r.quantity} × ` : ''}
            {r.prize}
          </span>
          <span class="text-compact text-ink-2">
            {r.eventTitle}, {r.eventDateLabel}. {r.fulfilment === 'in_kind' ? 'Sponsor sends the prize.' : `Budget ${r.budget}.`}
          </span>
        </div>
        <div class="flex flex-wrap gap-2">
          <Tag tone="black">{r.stageLabel.split(',')[0]}</Tag>
          <Tag>{r.fundingLabel}</Tag>
        </div>
      </div>
      {r.flags.length > 0 && (
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {r.flags.map((flag) => (
            <li key={flag} class="flex flex-wrap items-center gap-3 text-compact">
              <Tag tone="black">{FLAG_LABEL[flag] ?? flag}</Tag>
              <Button variant="plain" disabled={busy} onClick={() => void act('clear_flag', { flag }, 'Flag cleared.')}>
                Clear
              </Button>
            </li>
          ))}
        </ul>
      )}
      {r.quote && (
        <p class="m-0 text-compact">
          Offer: {r.quote.surcharge ? `${r.quote.base} plus a processing fee of ${r.quote.surcharge}, ${r.quote.total}` : r.quote.total} ({r.quote.feeChoiceLabel}). Terms{' '}
          {r.termsVersion}, {r.accepted ? 'accepted' : 'not accepted yet'}.
        </p>
      )}
      {!r.quote && r.termsVersion && (
        <p class="m-0 text-compact">
          Terms {r.termsVersion}, {r.accepted ? 'accepted' : 'not accepted yet'}.
        </p>
      )}
      <p class="m-0 text-compact text-ink-2">{SETTLEMENT[r.settlement.state](r.settlement)}</p>
      {r.payments?.map((p) => (
        <p key={p.session}>
          {p.session}. {p.review ?? 'Payment matched.'} {p.fee ? `Stripe fee ${p.fee}. Net ${p.net}.` : 'Stripe fee pending.'}
        </p>
      ))}
      {r.payments?.some((p) => !p.fee) && (
        <Button variant="secondary" disabled={!!busy} onClick={() => void act('reconcile', {}, 'Checked actual fees.')}>
          Check actual fees
        </Button>
      )}
      {r.ledger.length > 0 && (
        <ul class="m-0 flex list-none flex-col gap-1 p-0 text-compact text-ink-2">
          {r.ledger.map((e) => (
            <li key={e.id}>
              {longDate(e.at.slice(0, 10))}: {e.note}, {e.amount}
              {e.reference ? ` (${e.reference})` : ''}
            </li>
          ))}
        </ul>
      )}
      {s === 'drawn' && !r.claimDecision && (
        <div class="flex flex-wrap gap-3">
          <Button variant="secondary" disabled={busy} onClick={() => void act('claim', { seq: r.draws.at(-1)?.seq }, 'Claim recorded.')}>
            Record winner claim
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void act('expire', { seq: r.draws.at(-1)?.seq }, 'Claim expiry recorded.')}>
            Record expiry under the published rules
          </Button>
        </div>
      )}
      {s === 'ready' && !rules.open && <p class="m-0 text-compact text-ink-2">{rules.reason}</p>}
      {r.entries !== null && (
        <p class="m-0 text-compact">
          {r.entries} {r.entries === 1 ? 'entry' : 'entries'}, {r.verifiedEntries} with a confirmed email.{r.closesAt ? ` Entries close ${shortDateTime(r.closesAt)}.` : ''} Rules{' '}
          {r.rulesVersion}.
        </p>
      )}
      {r.entryUrl && s === 'open' && <CopyLink label="Entry page" url={r.entryUrl} />}
      {r.draws.length > 0 && (
        <ol class="m-0 flex flex-col gap-1 pl-5 text-compact">
          {r.draws.map((d) => (
            <li key={d.seq}>
              {d.seq === 1 ? 'Drawn' : `Drawn again (${d.reason})`} {shortDateTime(d.at)} from {d.eligibleCount} entries: code {d.claimCode}, {d.name}, {d.email}. Entries
              fingerprint {d.entriesHash.slice(0, 12)}.
            </li>
          ))}
        </ol>
      )}
      {r.sharing && r.entries !== null && <RaffleSharing raffleId={r.id} summary={r.sharing} onSignedOut={onSignedOut} />}
      {r.reason && <p class="m-0 text-compact text-ink-2">Note to the sponsor: {r.reason}</p>}
      {actions.length > 0 && (
        <div class="flex flex-wrap gap-3">
          {actions.map(([key, label]) =>
            key === 'ready' ? (
              <Button key={key} variant="secondary" disabled={busy} onClick={() => void act('ready', {}, 'Marked ready.')}>
                {label}
              </Button>
            ) : key === 'refund' ? (
              <Button
                key={key}
                variant="secondary"
                disabled={busy}
                onClick={() => void act('refund', { decision: 'refund' }, 'Refund decided. Make it in Stripe, then record it.')}
              >
                {label}
              </Button>
            ) : key === 'close' ? (
              <Button key={key} variant="secondary" disabled={busy} onClick={() => void act('close', {}, 'Entries closed.')}>
                {label}
              </Button>
            ) : key === 'resume' ? (
              <Button key={key} variant="secondary" disabled={busy} onClick={() => void act('resume', {}, 'It goes ahead.')}>
                {label}
              </Button>
            ) : (
              <Button key={key} variant={form === key ? 'primary' : 'secondary'} aria-expanded={form === key} disabled={busy} onClick={() => open(key)}>
                {label}
              </Button>
            ),
          )}
        </div>
      )}
      {form && (
        <form
          class="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (busy) return;
            if (form === 'offer') void act('offer', { amountChf: f.amountChf, feeChoice }, 'Offer sent. The sponsor sees it on their sponsorship page.');
            if (form === 'decline') void act('decline', { reason: f.reason }, 'Declined.');
            if (form === 'in_kind') void act('in_kind', { note: f.note, reference: f.reference }, 'Recorded: the prize arrived.');
            if (form === 'ledger') void act('ledger', { kind: f.kind ?? 'prize_purchase', amountChf: f.amountChf, note: f.note, reference: f.reference }, 'Cost recorded.');
            if (form === 'hold') void act('hold', { reason: f.reason, meetupChanged: f.meetupChanged === 'yes' }, 'On hold.');
            if (form === 'cancel') void act('cancel', { reason: f.reason }, 'Cancelled.');
            if (form === 'refunded') void act('refunded', { amountChf: f.amountChf, reference: f.reference }, 'Refund recorded.');
            if (form === 'open')
              void act(
                'open',
                {
                  closesAt: f.closesAt ? new Date(f.closesAt).toISOString() : '',
                  ...(f.sharePurpose || f.privacyUrl ? { sharing: { purpose: f.sharePurpose ?? '', privacyUrl: f.privacyUrl ?? '' } } : {}),
                },
                'Entries are open. Share the entry page.',
              );
            if (form === 'draw') void act('draw', {}, 'Drawn. The entry page shows the winning claim code.');
            if (form === 'redraw') void act('redraw', { afterSeq: r.draws.at(-1)?.seq, reason: f.reason }, 'Drawn again. The new winner’s notification is queued.');
            if (form === 'fulfil') void act('fulfil', { seq: r.draws.at(-1)?.seq, note: f.note }, 'Recorded as delivered.');
          }}
        >
          {form === 'offer' &&
            (r.fulfilment === 'in_kind' ? (
              <p class="m-0 text-compact">The sponsor sends the prize: the offer has no payment. It is made under raffle terms {terms.open ? terms.version : ''}.</p>
            ) : (
              <>
                {field('amountChf', 'Amount (CHF)', `They proposed ${r.budget}.`)}
                <FeeChoiceField gate={fees} value={feeChoice} onChange={setFeeChoice} />
              </>
            ))}
          {(form === 'decline' || form === 'hold' || form === 'cancel') && field('reason', 'Reason', 'The sponsor sees it.')}
          {form === 'hold' && (
            <ChipGroup
              label="Why"
              value={f.meetupChanged ?? 'no'}
              onChange={(v) => setF({ ...f, meetupChanged: v })}
              options={[
                { value: 'no', label: 'Something else' },
                { value: 'yes', label: 'The host meetup changed' },
              ]}
            />
          )}
          {form === 'in_kind' && (
            <>
              {field('note', 'What arrived')}
              {field('reference', 'Delivery note (optional)')}
            </>
          )}
          {form === 'ledger' && (
            <>
              <ChipGroup
                label="Cost"
                value={(f.kind as 'prize_purchase' | 'delivery') ?? 'prize_purchase'}
                onChange={(v) => setF({ ...f, kind: v })}
                options={[
                  { value: 'prize_purchase', label: 'Prize' },
                  { value: 'delivery', label: 'Delivery' },
                ]}
              />
              {field('amountChf', 'Amount (CHF)')}
              {field('note', 'What it was')}
              {field('reference', 'Receipt number (optional)')}
            </>
          )}
          {form === 'open' && (
            <>
              <TextField
                label="Entries close"
                type="datetime-local"
                value={f.closesAt ?? ''}
                hint={`Zurich time, by the end of ${r.eventDateLabel}.`}
                onInput={(e) => setF({ ...f, closesAt: inputValue(e) })}
              />
              {r.sharing?.gateOpen ? (
                <>
                  {field(
                    'sharePurpose',
                    'Sharing with the sponsor: purpose (optional)',
                    'Entrants read it in the box: “… have my name and email to …”. Leave empty for no sharing.',
                  )}
                  {field('privacyUrl', 'The sponsor’s privacy notice (https)')}
                </>
              ) : (
                <p class="m-0 text-compact text-ink-2">{r.sharing?.reason ?? 'Sharing with the sponsor is off.'}</p>
              )}
              <p class="m-0 text-compact text-ink-2">
                Opening freezes the prize, the meetup, the closing time, the entrant rules {rules.open ? rules.version : ''} and any sharing.
              </p>
            </>
          )}
          {form === 'draw' && (
            <p class="m-0 text-compact">
              One winner, chosen at random from all {r.entries ?? 0} entries, recorded with a fingerprint of the entries. It happens once: drawing again needs a reason.
            </p>
          )}
          {form === 'redraw' && field('reason', 'Why draw again', 'As the published rules allow, for example no reply in time.')}
          {form === 'fulfil' && field('note', 'How the prize reached the winner')}
          {form === 'refunded' && (
            <>
              {field('amountChf', 'Refunded (CHF)')}
              {field('reference', 'Stripe refund id or bank reference')}
            </>
          )}
          <div class="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Saving…' : form === 'draw' ? 'Draw now' : 'Save'}
            </Button>
            <Button variant="secondary" onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {done && <Notice kind="done">{done}</Notice>}
    </article>
  );
}
