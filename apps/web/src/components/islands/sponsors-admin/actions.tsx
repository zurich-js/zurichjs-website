/**
 * What the board can do with one sponsorship, one inline form at a time (SponsorDetail.tsx).
 * Which actions show depends on the sponsorship: a change to confirm for a running recurring
 * one, the invited plan before the first payment, meetups and price for a one-time one, a
 * signed contract and a payment link, a bank transfer (paid that way or not started, never
 * with a Stripe subscription), and ending it. The API's rules are in the route headers under
 * /api/membership/admin/sponsors/[id].
 */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, FileField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { cardClass } from '@zurichjs/design/recipes';
import { RECURRING, TIERS, bundleLabel, changeTiming, chf, cycleInfo, fee, feeLabel, tierInfo, type Cycle, type Tier } from '@zurichjs/sponsorship';
import { lastDay, longDate } from '../../../server/dates.ts';
import type { AdminSponsorView } from '../../../server/sponsor.ts';
import { api, post } from '../admin-api.ts';
import { SubmitButton, optional } from '../forms/shared.tsx';
import { BASE, DATE, MeetupPicker, Notice, addMonths, francs, inputChecked, inputValue, listPrice, today, useMeetups, type FieldError } from './shared.tsx';

export type ActionKey = 'suggest' | 'plan' | 'bundle' | 'contract' | 'link' | 'payment' | 'end';
/** An open form: an action, or the change form opened on "end" from the end confirmation. */
export type OpenAction = ActionKey | 'suggest-end';

/** What an action reports when it is done: a sentence, and a link to send by hand when there is one. */
export interface Done {
  text: string;
  url?: string;
  urlLabel?: string;
}

const running = (s: AdminSponsorView) => s.status === 'active' || s.status === 'past_due';
/** A bank transfer can be recorded for sponsorships paid that way, or not started yet, never one Stripe charges. */
export const canRecordPayment = (s: AdminSponsorView) =>
  s.status !== 'ended' && s.status !== 'ending' && !s.hasSubscription && (s.paymentMode === 'manual' || s.status === 'pending');

export function actionsFor(s: AdminSponsorView): { key: ActionKey; label: string }[] {
  const once = s.cycle === 'once';
  const out: { key: ActionKey; label: string }[] = [];
  if (running(s) && !once) out.push({ key: 'suggest', label: 'Send a change to confirm' });
  if (s.status === 'pending' && !once) out.push({ key: 'plan', label: 'Change the invited plan' });
  if (once && s.status !== 'ended') out.push({ key: 'bundle', label: s.status === 'pending' ? 'Meetups and price' : 'Move meetups' });
  if (s.status !== 'ended') out.push({ key: 'contract', label: 'Attach signed contract' });
  if (once && s.status === 'pending' && s.hasContract) out.push({ key: 'link', label: s.paymentLinkUrl ? 'New payment link' : 'Create payment link' });
  if (canRecordPayment(s)) out.push({ key: 'payment', label: 'Record a bank transfer' });
  if (s.status === 'pending') out.push({ key: 'end', label: 'Withdraw invitation' });
  else if (s.status !== 'ended') out.push({ key: 'end', label: 'End outright (breach)' });
  return out;
}

interface Props {
  id: string;
  sponsor: AdminSponsorView;
  onDone: (done: Done) => void;
  onCancel: () => void;
  onSwitch: (key: OpenAction) => void;
  onSignedOut: () => void;
}

export function ActionForm({ action, ...p }: Props & { action: OpenAction }) {
  switch (action) {
    case 'suggest':
      return <SuggestChange {...p} />;
    case 'suggest-end':
      return <SuggestChange {...p} initialKind="end" />;
    case 'plan':
      return <InvitedPlan {...p} />;
    case 'bundle':
      return <Bundle {...p} />;
    case 'contract':
      return <AttachContract {...p} />;
    case 'link':
      return <PaymentLink {...p} />;
    case 'payment':
      return <RecordTransfer {...p} />;
    case 'end':
      return <End {...p} />;
  }
}

/** The frame of an open action: a title, what it does, the form. */
function Panel({ title, intro, children }: { title: string; intro?: string; children: ComponentChildren }) {
  return (
    <section aria-label={title} class={cardClass('outline', 'lg')}>
      <div class="flex flex-col gap-1">
        <Heading as="h4" size="card">
          {title}
        </Heading>
        {intro && <p class="m-0 text-compact text-ink-2">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Buttons({ busy, label, busyLabel, onCancel }: { busy: boolean; label: string; busyLabel: string; onCancel: () => void }) {
  return (
    <div class="flex flex-wrap gap-3">
      <SubmitButton busy={busy} grow>
        {busy ? busyLabel : label}
      </SubmitButton>
      <Button variant="secondary" grow onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export const planName = (tier: Tier, cycle: Cycle) => `${tierInfo(tier).name}, ${feeLabel(tier, cycle)}`;

/** When a confirmed plan change applies (server/sponsor-lifecycle.ts, appliesLabel). */
function timingText(s: AdminSponsorView, tier: Tier, cycle: Cycle) {
  const t = changeTiming(s, { tier, cycle });
  if (t === 'none') return 'That is the plan they have now.';
  if (s.paymentMode === 'manual' && !s.hasSubscription) return 'Applies as soon as they confirm. They pay by bank transfer, so adjust the next invoice.';
  if (t === 'now') return 'Applies as soon as they confirm. Stripe charges only the difference for the rest of the current term.';
  return `Applies from their next renewal${s.paidUntil ? ` on ${longDate(s.paidUntil)}` : ''}. Nothing is refunded or charged twice.`;
}

/* ------------------------------------------------------------------ a change to confirm */

function SuggestChange({ id, sponsor: s, onDone, onCancel, onSignedOut, initialKind = 'plan' }: Props & { initialKind?: 'plan' | 'end' }) {
  const [kind, setKind] = useState<'plan' | 'end'>(initialKind);
  const [tier, setTier] = useState<Tier>(s.tier);
  const [cycle, setCycle] = useState<Cycle>(s.cycle === 'once' ? 'yearly' : s.cycle);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const same = kind === 'plan' && tier === s.tier && cycle === s.cycle;

  return (
    <Panel
      title="Send a change to confirm"
      intro="For a change agreed with the sponsor. They get an email with a link that fills the change in on their sponsorship page. Nothing changes until they confirm it there."
    >
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (same) return setError({ field: 'tier', message: 'That is the plan they have now. Choose another tier or billing.' });
          setBusy(true);
          setError(null);
          const { status, body } = await post<{ url?: string; emailed?: number }>(
            `${BASE}/${id}/suggest`,
            kind === 'plan' ? { kind, tier, cycle, message: message || undefined } : { kind, message: message || undefined },
          );
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.url) return setError({ field: body.field, message: body.error ?? 'Could not send the change.' });
          onDone({
            text: `${body.emailed ? `Emailed to ${body.emailed === 1 ? 'their contact' : `${body.emailed} contacts`}.` : 'The email was not sent.'} Nothing changes until they confirm it on their sponsorship page.`,
            url: body.url,
            urlLabel: 'Or send them this link',
          });
        }}
      >
        <ChipGroup
          label="Change"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'plan', label: 'A new plan' },
            { value: 'end', label: 'End the sponsorship' },
          ]}
        />
        {kind === 'plan' ? (
          <>
            <ChipGroup label="Tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: t.name }))} />
            <ChipGroup label="Billing" value={cycle} onChange={setCycle} options={RECURRING.map((c) => ({ value: c, label: `${cycleInfo(c).label}, ${feeLabel(tier, c)}` }))} />
            <p class="m-0 text-compact">
              <b>{planName(tier, cycle)}.</b> {timingText(s, tier, cycle)}
            </p>
            {(err('tier') || err('cycle')) && <Notice kind="error">{err('tier') ?? err('cycle')}</Notice>}
          </>
        ) : (
          <p class="m-0 text-compact">
            If they confirm, it runs to the end of the paid period{s.paidThrough ? ` (paid through ${longDate(s.paidThrough)})` : ''} and then ends. Nothing is refunded.
          </p>
        )}
        <TextArea
          label={optional('Message to the sponsor')}
          hint="Shown in the email."
          rows={3}
          value={message}
          invalid={!!err('message')}
          error={err('message')}
          onInput={(e) => setMessage(inputValue(e))}
        />
        {error && !['tier', 'cycle', 'message'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <Buttons busy={busy} label="Email the change" busyLabel="Sending…" onCancel={onCancel} />
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ the invited plan */

function InvitedPlan({ id, sponsor: s, onDone, onCancel, onSignedOut }: Props) {
  const [tier, setTier] = useState<Tier>(s.tier);
  const [cycle, setCycle] = useState<Cycle>(s.cycle);
  const [resend, setResend] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Panel title="Change the invited plan" intro="Nobody has paid yet, so the plan changes now. They confirm it by paying.">
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const { status, body } = await post<{ emailed?: number }>(`${BASE}/${id}/plan`, { tier, cycle, resend, message: resend && message ? message : undefined });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not change the plan.' });
          onDone({ text: `Plan changed to ${planName(tier, cycle)}.${resend ? (body.emailed ? ' The invitation was emailed again.' : ' The invitation was not sent.') : ''}` });
        }}
      >
        <ChipGroup label="Tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: t.name }))} />
        <ChipGroup label="Billing" value={cycle} onChange={setCycle} options={RECURRING.map((c) => ({ value: c, label: `${cycleInfo(c).label}, ${feeLabel(tier, c)}` }))} />
        {(err('tier') || err('cycle')) && <Notice kind="error">{err('tier') ?? err('cycle')}</Notice>}
        <Checkbox label="Email the invitation again with the new plan" checked={resend} onChange={(e) => setResend(inputChecked(e))} />
        {resend && (
          <TextArea
            label={optional('Message in the email')}
            rows={3}
            value={message}
            invalid={!!err('message')}
            error={err('message')}
            onInput={(e) => setMessage(inputValue(e))}
          />
        )}
        {error && !['tier', 'cycle', 'message'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <Buttons busy={busy} label="Save the plan" busyLabel="Saving…" onCancel={onCancel} />
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ meetups and price */

function Bundle({ id, sponsor: s, onDone, onCancel, onSignedOut }: Props) {
  const paid = s.status !== 'pending';
  const { meetups, error: loadError } = useMeetups(true, onSignedOut);
  const [ids, setIds] = useState<string[]>(s.meetups.map((m) => m.eventId));
  const [priceText, setPriceText] = useState(s.pricePerMeetup === null ? '' : String(s.pricePerMeetup));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const price = francs(priceText);
  const priceOk = price === null || (Number.isInteger(price) && price >= 1);
  const current = s.meetups.map((m) => ({ id: m.eventId, title: m.title, date: m.date }));

  return (
    <Panel
      title={paid ? 'Move meetups' : 'Meetups and price'}
      intro={
        paid
          ? `It is paid: the meetups can move (for example when one is cancelled), but not the price or how many. Keep ${s.meetups.length === 1 ? 'one meetup' : `${s.meetups.length} meetups`}.`
          : 'Choose the meetups this sponsorship covers and, for a bundle, the price per meetup. An open checkout or payment link is switched off, so create a new link afterwards.'
      }
    >
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!ids.length) return setError({ field: 'eventIds', message: 'Choose at least one meetup.' });
          if (paid && ids.length !== s.meetups.length) return setError({ field: 'eventIds', message: `Keep ${s.meetups.length} meetups: only which ones can change.` });
          if (!paid && !priceOk) return setError({ field: 'pricePerMeetup', message: 'Give the price per meetup in whole francs, or leave it empty for the list price.' });
          setBusy(true);
          setError(null);
          const { status, body } = await post(`${BASE}/${id}/bundle`, paid ? { eventIds: ids } : { eventIds: ids, pricePerMeetup: price });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not save the meetups.' });
          onDone({ text: paid ? 'Meetups moved.' : `Saved: ${bundleLabel(s.tier, ids.length, price)}.` });
        }}
      >
        <MeetupPicker meetups={meetups} loadError={loadError} extra={current} value={ids} onChange={setIds} error={err('eventIds')} />
        {!paid && (
          <TextField
            label={optional('Price per meetup (CHF)')}
            hint={priceOk ? `${bundleLabel(s.tier, ids.length, price)}. Empty is the list price, ${chf(fee(s.tier, 'once'))}.` : undefined}
            name="pricePerMeetup"
            inputMode="numeric"
            placeholder={listPrice(s.tier)}
            value={priceText}
            invalid={!!err('pricePerMeetup')}
            error={err('pricePerMeetup')}
            onInput={(e) => setPriceText(inputValue(e))}
            class="max-w-xs"
          />
        )}
        {error && !['eventIds', 'pricePerMeetup'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <Buttons busy={busy} label="Save meetups" busyLabel="Saving…" onCancel={onCancel} />
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ a signed contract */

function AttachContract({ id, onDone, onCancel, onSignedOut }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [signedOn, setSignedOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <Panel
      title="Attach signed contract"
      intro="A contract signed outside the site (PDF, up to 10 MB). It replaces signing the agreement online, and the sponsor can download it from their page."
    >
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          if (!file) return setError({ field: 'file', message: 'Choose the signed contract (PDF).' });
          setBusy(true);
          setError(null);
          const data = new FormData();
          data.set('file', file);
          if (signedOn) data.set('signedOn', signedOn);
          const { status, body } = await api(`${BASE}/${id}/contracts`, { method: 'POST', body: data });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not attach the contract.' });
          onDone({ text: 'Contract attached. They can pay without signing online.' });
        }}
      >
        <FileField
          label="Signed contract"
          button="Choose the PDF"
          accept="application/pdf,.pdf"
          fileName={file?.name}
          invalid={!!err('file')}
          error={err('file')}
          onFile={setFile}
        />
        <TextField
          label={optional('Signed on')}
          type="date"
          name="signedOn"
          value={signedOn}
          invalid={!!err('signedOn')}
          error={err('signedOn')}
          onInput={(e) => setSignedOn(inputValue(e))}
          class="max-w-xs"
        />
        {error && !['file', 'signedOn'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <Buttons busy={busy} label="Attach contract" busyLabel="Uploading…" onCancel={onCancel} />
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ a payment link */

function PaymentLink({ id, sponsor: s, onDone, onCancel, onSignedOut }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Panel
      title={s.paymentLinkUrl ? 'New payment link' : 'Create payment link'}
      intro={`A Stripe link for one card payment of ${bundleLabel(s.tier, s.meetups.length, s.pricePerMeetup)}, usable once. Send it however you like; paying it starts the sponsorship.${s.paymentLinkUrl ? ' A new link switches the current one off.' : ''}`}
    >
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          const { status, body } = await post<{ url?: string }>(`${BASE}/${id}/payment-link`, {});
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.url) return setError(body.error ?? 'Could not create the payment link.');
          onDone({ text: 'Payment link created.', url: body.url, urlLabel: 'Payment link' });
        }}
      >
        {error && <Notice kind="error">{error}</Notice>}
        <Buttons busy={busy} label={s.paymentLinkUrl ? 'Create a new link' : 'Create the link'} busyLabel="Creating…" onCancel={onCancel} />
      </form>
    </Panel>
  );
}

/* ------------------------------------------------------------------ a bank transfer */

function RecordTransfer({ id, sponsor: s, onDone, onCancel, onSignedOut }: Props) {
  const [paidUntil, setPaidUntil] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  // Quick fills count from the current paid-until (the next term follows on), or from today when nothing is paid yet.
  const from = s.paidUntil ?? today();
  const received = francs(amount);
  const through = DATE.test(paidUntil) ? longDate(lastDay(paidUntil)) : '';

  const check = (): FieldError => {
    if (!DATE.test(paidUntil)) return { field: 'paidUntil', message: 'Give the first day not paid for.' };
    if (received !== null && !(Number.isInteger(received) && received >= 1)) return { field: 'amount', message: 'Give the amount in whole francs, or leave it empty.' };
    return null;
  };

  const record = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { status, body } = await post<{ confirmationTo?: string[]; alreadyRecorded: boolean }>(`${BASE}/${id}/payment`, {
      paidUntil,
      amount: received ?? undefined,
      reference: reference.trim() || undefined,
    });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) {
      setConfirming(false);
      return setError({ field: body.field, message: body.error ?? 'Could not record the payment.' });
    }
    if (body.alreadyRecorded) return onDone({ text: `This bank transfer was already recorded for the period through ${through}.` });
    const to = body.confirmationTo ?? [];
    onDone({
      text: `Bank transfer recorded: paid through ${through}. ${to.length ? `A confirmation goes to ${to.join(', ')}.` : 'No confirmation sent: they have no billing or primary contact.'}`,
    });
  };

  return (
    <Panel
      title="Record a bank transfer"
      intro={`For money received by bank transfer. Now ${s.paidThrough ? `paid through ${longDate(s.paidThrough)}` : 'not paid'}.${s.status === 'pending' || s.status === 'past_due' ? ' Recording it makes the sponsorship active.' : ''} The billing contact gets a written confirmation.`}
    >
      {!confirming ? (
        <form
          class="flex flex-col gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const bad = check();
            setError(bad);
            if (!bad) setConfirming(true);
          }}
        >
          <div class="flex flex-col gap-3">
            <TextField
              label="Paid until (the first day not paid for)"
              hint={through ? `Paid through ${through}.` : undefined}
              type="date"
              name="paidUntil"
              value={paidUntil}
              invalid={!!err('paidUntil')}
              error={err('paidUntil')}
              onInput={(e) => setPaidUntil(inputValue(e))}
              class="max-w-xs"
            />
            <div class="flex flex-wrap gap-2" role="group" aria-label="Fill in paid until">
              <Button variant="secondary" onClick={() => setPaidUntil(addMonths(from, 3))}>
                +1 quarter
              </Button>
              <Button variant="secondary" onClick={() => setPaidUntil(addMonths(from, 12))}>
                +1 year
              </Button>
            </div>
          </div>
          <div class="grid grid-cols-auto-sm gap-4">
            <TextField
              label={optional('Amount (CHF)')}
              name="amount"
              inputMode="numeric"
              placeholder={s.cycle === 'once' ? String(fee(s.tier, 'once')) : String(fee(s.tier, s.cycle))}
              value={amount}
              invalid={!!err('amount')}
              error={err('amount')}
              onInput={(e) => setAmount(inputValue(e))}
            />
            <TextField
              label={optional('Reference')}
              name="reference"
              value={reference}
              invalid={!!err('reference')}
              error={err('reference')}
              onInput={(e) => setReference(inputValue(e))}
            />
          </div>
          {error && !['paidUntil', 'amount', 'reference'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
          <Buttons busy={false} label="Continue" busyLabel="Continue" onCancel={onCancel} />
        </form>
      ) : (
        <div class="flex flex-col gap-5">
          <p class="m-0 text-body font-bold">
            Mark {s.companyName} paid through {through}?
          </p>
          <p class="m-0 text-compact">
            {received !== null ? `${chf(received)} received` : 'No amount noted'}
            {reference.trim() ? `, reference ${reference.trim()}` : ''}. The billing contact is emailed a confirmation.
          </p>
          <div class="flex flex-wrap gap-3">
            <Button variant="primary" grow disabled={busy} onClick={() => void record()}>
              {busy ? 'Recording…' : 'Yes, record it'}
            </Button>
            <Button variant="secondary" grow onClick={() => setConfirming(false)}>
              Go back
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ ending */

function End({ id, sponsor: s, onDone, onCancel, onSwitch, onSignedOut }: Props) {
  const withdraw = s.status === 'pending';
  const canSuggest = running(s) && s.cycle !== 'once';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const { status, body } = await post(`${BASE}/${id}/end`, { reason: withdraw ? 'withdrawn' : 'terminated' });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not end the sponsorship.');
    onDone({ text: withdraw ? 'Invitation withdrawn.' : 'Sponsorship ended.' });
  };
  return (
    <Panel title={withdraw ? 'Withdraw invitation' : 'End outright (breach)'}>
      <p class="m-0 text-body font-bold">{withdraw ? `Withdraw the invitation to ${s.companyName}?` : `End ${s.companyName} now?`}</p>
      {withdraw ? (
        <p class="m-0 text-compact">Nobody has paid. The invitation and any payment link stop working, and it is logged.</p>
      ) : (
        <ul class="m-0 flex list-disc flex-col gap-1 pl-5 text-compact">
          <li>Stripe stops at once and it ends today.</li>
          <li>Nothing is refunded automatically.</li>
          <li>Only for a breach of the agreement. If they agreed to end it, send it as a change instead, so it runs to the end of the paid period.</li>
        </ul>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <div class="flex flex-wrap gap-3">
        <Button variant="primary" grow disabled={busy} onClick={() => void end()}>
          {busy ? 'Ending…' : withdraw ? 'Yes, withdraw it' : 'Yes, end it now'}
        </Button>
        {canSuggest && (
          <Button variant="secondary" grow onClick={() => onSwitch('suggest-end')}>
            Send a change instead
          </Button>
        )}
        <Button variant="secondary" grow onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Panel>
  );
}
