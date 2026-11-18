/**
 * Adding a sponsor (/admin/sponsors?add=invite|import): invite a company that agreed to sponsor
 * (they sign and pay by card online), or import a sponsorship that already runs and was paid by
 * bank transfer. One-time sponsorships cover one or more meetups, at the list price or the
 * board's price per meetup. Closes on success and opens the new sponsor.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { surfaceClass } from '@zurichjs/design/recipes';
import { CYCLES, TIERS, bundleLabel, chf, fee, feeLabel, type Cycle, type Tier } from '@zurichjs/sponsorship';
import { lastDay, longDate } from '../../../server/dates.ts';
import type { AdminSponsorView } from '../../../server/sponsor.ts';
import { post } from '../admin-api.ts';
import { SubmitButton, optional, useFocusFirstError } from '../forms/shared.tsx';
import { BASE, DATE, MeetupPicker, Notice, focusHeading, francs, inputChecked, inputValue, listPrice, today, useMeetups, type FieldError } from './shared.tsx';

type Mode = 'invite' | 'import';

const cycleOption = (tier: Tier, c: Cycle) => (c === 'once' ? 'One-time (meetups)' : `${CYCLES.find((x) => x.key === c)!.label}, ${feeLabel(tier, c)}`);

export function AddSponsor({
  mode,
  focus,
  onMode,
  onBack,
  onAdded,
  onOpen,
  onSignedOut,
}: {
  mode: Mode;
  focus: boolean;
  onMode: (m: Mode) => void;
  onBack: () => void;
  onAdded: (id: string, notice: string) => void;
  onOpen: (id: string) => void;
  onSignedOut: () => void;
}) {
  const [f, setF] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    tier: 'supporter' as Tier,
    cycle: 'yearly' as Cycle,
    eventIds: [] as string[],
    price: '',
    startedAt: '',
    paidUntil: '',
    sendEmail: true,
    message: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<(FieldError & { sponsorId?: string }) | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(form);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const imported = mode === 'import';
  const once = f.cycle === 'once';
  const { meetups, error: meetupsError } = useMeetups(once, onSignedOut);

  useEffect(() => {
    if (focus) focusHeading(heading.current);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- on arrival only
  }, []);

  const price = francs(f.price);
  const priceOk = price === null || (Number.isInteger(price) && price >= 1);
  const paidUntilPast = imported && !once && DATE.test(f.paidUntil) && f.paidUntil <= today();
  const shown = ['companyName', 'contactName', 'contactEmail', 'eventIds', 'pricePerMeetup', 'startedAt', 'paidUntil', 'message', 'notes'];

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (once && !priceOk) {
      setError({ field: 'pricePerMeetup', message: 'Give the price per meetup in whole francs, or leave it empty for the list price.' });
      return focusError();
    }
    setBusy(true);
    setError(null);
    const { status, body } = await post<{ sponsor?: AdminSponsorView; emailed?: number; sponsorId?: string }>(BASE, {
      mode,
      companyName: f.companyName,
      contactName: f.contactName,
      contactEmail: f.contactEmail,
      tier: f.tier,
      cycle: f.cycle,
      eventIds: once ? f.eventIds : undefined,
      pricePerMeetup: once ? price : undefined,
      startedAt: imported ? f.startedAt : undefined,
      paidUntil: imported && !once ? f.paidUntil : undefined,
      message: f.sendEmail && f.message ? f.message : undefined,
      notes: f.notes || undefined,
      sendEmail: f.sendEmail,
    });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200 || !body.sponsor) {
      setError({ field: body.field, message: body.error ?? 'Could not add the sponsor.', sponsorId: body.sponsorId });
      return focusError();
    }
    const email = f.sendEmail ? (body.emailed ? ` Emailed to ${f.contactEmail}.` : ' The email was not sent: resend the invitation from Contacts.') : ' No email sent.';
    onAdded(body.sponsor.id, `${body.sponsor.companyName} ${imported ? 'added' : 'invited'}.${email}`);
  };

  return (
    <section aria-labelledby="h-add" class="flex flex-col gap-6">
      <div class="flex flex-col items-start gap-4">
        <Button variant="link" onClick={onBack}>
          Back to sponsors
        </Button>
        <h2 id="h-add" ref={heading} tabIndex={-1} class="m-0 scroll-mt-6 text-3xl font-bold outline-hidden">
          {imported ? 'Import a running sponsorship' : 'Invite a sponsor'}
        </h2>
        <p class="m-0 max-w-2xl text-base text-ink-2">
          {imported
            ? 'For a sponsorship that already runs and was paid by bank transfer. It is recorded as active and paid until the date you give. The contact can sign in and switch to card later; nothing is charged before that date.'
            : 'For a company that agreed to sponsor. The contact gets an email to sign in, sign the sponsorship agreement and pay by card. It starts with the first payment.'}
        </p>
      </div>
      <form ref={form} class={surfaceClass('grey', 'flex flex-col gap-6 p-5 md:p-8')} noValidate onSubmit={submit}>
        <ChipGroup
          label="Add as"
          value={mode}
          onChange={onMode}
          options={[
            { value: 'invite', label: 'Invite (they pay online)' },
            { value: 'import', label: 'Import (paid by bank transfer)' },
          ]}
        />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <TextField
            label="Company"
            name="companyName"
            autoComplete="organization"
            value={f.companyName}
            invalid={!!err('companyName')}
            error={err('companyName')}
            onInput={(e) => set('companyName', inputValue(e))}
          />
          <TextField
            label="Contact name"
            name="contactName"
            autoComplete="off"
            value={f.contactName}
            invalid={!!err('contactName')}
            error={err('contactName')}
            onInput={(e) => set('contactName', inputValue(e))}
          />
          <TextField
            label="Contact email"
            name="contactEmail"
            type="email"
            autoComplete="off"
            value={f.contactEmail}
            invalid={!!err('contactEmail')}
            error={err('contactEmail')}
            onInput={(e) => set('contactEmail', inputValue(e))}
          />
        </div>
        {error?.sponsorId && (
          <Button variant="link" class="self-start" onClick={() => onOpen(error.sponsorId!)}>
            Open the sponsor that has this contact
          </Button>
        )}
        <ChipGroup label="Tier" value={f.tier} onChange={(v) => set('tier', v)} options={TIERS.map((t) => ({ value: t.key, label: t.name }))} />
        <ChipGroup label="Billing" value={f.cycle} onChange={(v) => set('cycle', v)} options={CYCLES.map((c) => ({ value: c.key, label: cycleOption(f.tier, c.key) }))} />
        {once && (
          <>
            <MeetupPicker
              meetups={meetups}
              loadError={meetupsError}
              value={f.eventIds}
              onChange={(ids) => set('eventIds', ids)}
              error={err('eventIds')}
              hint="One payment covers every meetup chosen."
            />
            <TextField
              label={optional('Price per meetup (CHF)')}
              hint={
                f.eventIds.length && priceOk ? `${bundleLabel(f.tier, f.eventIds.length, price)}.` : `Leave it empty for the list price, ${chf(fee(f.tier, 'once'))} per meetup.`
              }
              name="pricePerMeetup"
              inputMode="numeric"
              placeholder={listPrice(f.tier)}
              value={f.price}
              invalid={!!err('pricePerMeetup')}
              error={err('pricePerMeetup')}
              onInput={(e) => set('price', inputValue(e))}
              class="max-w-xs"
            />
          </>
        )}
        {imported && (
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
            <TextField
              label="Started on"
              type="date"
              name="startedAt"
              value={f.startedAt}
              invalid={!!err('startedAt')}
              error={err('startedAt')}
              onInput={(e) => set('startedAt', inputValue(e))}
            />
            {!once && (
              <TextField
                label="Paid until (the first day not paid for)"
                hint={
                  paidUntilPast
                    ? 'That day has passed: it shows as overdue straight away.'
                    : DATE.test(f.paidUntil)
                      ? `Paid through ${longDate(lastDay(f.paidUntil))}.`
                      : 'The next payment is due on this day.'
                }
                type="date"
                name="paidUntil"
                value={f.paidUntil}
                invalid={!!err('paidUntil')}
                error={err('paidUntil')}
                onInput={(e) => set('paidUntil', inputValue(e))}
              />
            )}
          </div>
        )}
        {imported && once && <p class="m-0 text-base text-ink-2">A one-time sponsorship is paid through the day of its last meetup.</p>}
        <TextArea label={optional('Notes for the board')} rows={2} value={f.notes} invalid={!!err('notes')} error={err('notes')} onInput={(e) => set('notes', inputValue(e))} />
        <Checkbox
          label={imported ? 'Email the contact that the sponsorship is now online' : 'Email the invitation to the contact'}
          checked={f.sendEmail}
          onChange={(e) => set('sendEmail', inputChecked(e))}
        />
        {f.sendEmail && (
          <TextArea
            label={optional('Message in the email')}
            rows={3}
            value={f.message}
            invalid={!!err('message')}
            error={err('message')}
            onInput={(e) => set('message', inputValue(e))}
          />
        )}
        {error && !shown.includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <div class="flex flex-wrap gap-3">
          <SubmitButton busy={busy} size="md" grow>
            {busy ? 'Saving…' : imported ? 'Add sponsor' : 'Send invitation'}
          </SubmitButton>
          <Button variant="outline-black" grow onClick={onBack}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
