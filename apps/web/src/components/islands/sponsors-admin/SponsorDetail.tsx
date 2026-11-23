/**
 * One sponsor (/admin/sponsors?id=<uuid>), in the order a board member needs it after a call:
 * the name and status, what needs action today (with the action that fixes it), a short summary
 * with the rest behind "More details", the actions (one inline form at a time, actions.tsx),
 * contacts, logos, contracts, then agreements and history, and editing the details last.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { FileField, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass } from '@zurichjs/design/recipes';
import { RECURRING, TIERS, chf, cycleInfo, tierInfo, type EndedReason, type SponsorEvent, type Status, type Tier } from '@zurichjs/sponsorship';
import { lastDay, longDate, shortDateTime } from '../../../server/dates.ts';
import type { AdminSponsorView } from '../../../server/sponsor.ts';
import { api, post } from '../admin-api.ts';
import { SubmitButton, TextButton, optional } from '../forms/shared.tsx';
import { Coverage } from './Coverage.tsx';
import { ActionForm, actionsFor, canRecordPayment, planName, type Done, type OpenAction } from './actions.tsx';
import {
  AttentionBadge,
  BASE,
  Block,
  CopyLink,
  Notice,
  ROLE_LABEL,
  STATUS_LABEL,
  StatusBadge,
  focusHeading,
  inputValue,
  type Attention,
  type Contact,
  type Contract,
  type Detail,
  type FieldError,
  type Logo,
} from './shared.tsx';

/** Why it ended, as the board reads it (the sponsor-facing wording is ENDED_REASON_LABEL). */
const ENDED_LABEL: Record<EndedReason, string> = {
  cancelled: 'ended by the sponsor',
  completed: 'completed',
  lapsed: 'unpaid',
  terminated: 'ended by the board',
  withdrawn: 'withdrawn before it started',
};
const SOURCE_LABEL: Record<AdminSponsorView['source'], string> = {
  self_serve: 'Signed up online',
  invited: 'Invited by the board',
  imported: 'Imported (paid by bank transfer)',
};
const stripeCustomer = (id: string) => `https://dashboard.stripe.com/customers/${encodeURIComponent(id)}`;
const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

interface Ctx {
  id: string;
  onSignedOut: () => void;
  /** Reload this sponsor and the list. */
  onChanged: () => void;
}

export function SponsorDetail({
  id,
  focus,
  flash,
  labels,
  onBack,
  onChanged,
  onSignedOut,
}: {
  id: string;
  focus: boolean;
  flash: string;
  labels: Record<string, string>;
  onBack: () => void;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<OpenAction | null>(null);
  const [done, setDone] = useState<Done | null>(flash ? { text: flash } : null);
  const heading = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { status, body } = await api<Detail>(`${BASE}/${encodeURIComponent(id)}`);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not load the sponsor.');
    setError('');
    setD(body);
  };
  useEffect(() => {
    void load();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once per sponsor (the view is keyed by id)
  }, []);
  // Arriving from the list: the heading takes focus once the sponsor is loaded.
  const arrived = useRef(false);
  useEffect(() => {
    if (!d || arrived.current) return;
    arrived.current = true;
    if (focus) focusHeading(heading.current);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- on arrival only
  }, [d]);
  useEffect(() => {
    if (done && !flash) doneRef.current?.focus();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- when an action reports back
  }, [done]);

  const changed = () => {
    onChanged();
    void load();
  };
  const finish = (r: Done) => {
    setOpen(null);
    setDone(r);
    changed();
  };
  const show = (key: OpenAction) => {
    setDone(null);
    setOpen(key);
    window.requestAnimationFrame(() => actionsRef.current?.scrollIntoView({ block: 'start' }));
  };

  if (!d)
    return (
      <div class="flex flex-col items-start gap-4">
        <TextButton onClick={onBack}>Back to sponsors</TextButton>
        {error ? <Notice kind="error">{error}</Notice> : <p class="m-0 text-compact text-ink-2">Loading the sponsor…</p>}
      </div>
    );

  const s = d.sponsor;
  const actions = actionsFor(s);
  const ctx: Ctx = { id, onSignedOut, onChanged: changed };

  return (
    <article aria-labelledby="h-sponsor" class="flex flex-col gap-8">
      <header class="flex flex-col items-start gap-3">
        <TextButton onClick={onBack}>Back to sponsors</TextButton>
        <Heading id="h-sponsor" size="subsection" focus={heading} class="scroll-mt-6 break-words">
          {s.companyName}
        </Heading>
        <p class="m-0 flex flex-wrap items-center gap-x-3 gap-y-2 text-compact">
          <StatusBadge status={s.status} />
          <span>
            {s.status === 'ended' && s.endedReason ? `${ENDED_LABEL[s.endedReason].charAt(0).toUpperCase()}${ENDED_LABEL[s.endedReason].slice(1)}. ` : ''}
            {s.tierName}, {s.feeLabel}
          </span>
        </p>
      </header>

      {d.attention.length > 0 && (
        <ActionNeeded
          sponsor={s}
          attention={d.attention}
          labels={labels}
          onOpen={show}
          onResent={(n) => setDone({ text: n ? `Invitation emailed again to ${n === 1 ? 'their contact' : `${n} contacts`}.` : 'The invitation was not sent. Try again later.' })}
          {...ctx}
        />
      )}

      <Summary d={d} />

      <section ref={actionsRef} aria-labelledby="h-actions" class="flex scroll-mt-6 flex-col gap-4">
        <Heading as="h3" size="card" id="h-actions">
          Actions
        </Heading>
        {actions.length === 0 ? (
          <p class="m-0 text-compact text-ink-2">Nothing to do: it has ended.</p>
        ) : (
          <div class="flex flex-wrap gap-3">
            {actions.map((a) => {
              const expanded = open === a.key || (a.key === 'suggest' && open === 'suggest-end');
              return (
                <Button
                  key={a.key}
                  variant={expanded ? 'primary' : 'secondary'}
                  grow
                  aria-expanded={expanded}
                  aria-controls="sponsor-action"
                  onClick={() => {
                    setDone(null);
                    setOpen(expanded ? null : a.key);
                  }}
                >
                  {a.label}
                </Button>
              );
            })}
          </div>
        )}
        <div id="sponsor-action" class="flex flex-col gap-4">
          {open && <ActionForm key={open} action={open} id={id} sponsor={s} onDone={finish} onCancel={() => setOpen(null)} onSwitch={show} onSignedOut={onSignedOut} />}
          {done && (
            <Notice kind="done" focusRef={doneRef} detail={done.url && <CopyLink label={done.urlLabel ?? 'Link'} url={done.url} />}>
              {done.text}
            </Notice>
          )}
        </div>
      </section>

      {s.cycle !== 'once' && <Coverage sponsor={s} {...ctx} />}
      <Contacts contacts={d.contacts} sponsor={s} {...ctx} />
      <Logos logos={d.logos} ended={s.status === 'ended'} {...ctx} />
      <Contracts contracts={d.contracts} {...ctx} />
      <Records d={d} />
      <EditDetails sponsor={s} {...ctx} />
    </article>
  );
}

/* ------------------------------------------------------------------ what needs action */

function ActionNeeded({
  sponsor: s,
  attention,
  labels,
  onOpen,
  onResent,
  id,
  onSignedOut,
}: Ctx & { sponsor: AdminSponsorView; attention: Attention[]; labels: Record<string, string>; onOpen: (k: OpenAction) => void; onResent: (emailed: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const through = s.paidThrough ? longDate(s.paidThrough) : 'nothing yet';
  const resend = async () => {
    setBusy(true);
    setError('');
    const { status, body } = await post<{ emailed?: number }>(`${BASE}/${id}/invite`, {});
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not send the invitation.');
    onResent(body.emailed ?? 0);
  };
  const toLogos = () => focusHeading(document.getElementById('h-logos'));
  const record = canRecordPayment(s) ? (
    <Button variant="primary" grow onClick={() => onOpen('payment')}>
      Record a bank transfer
    </Button>
  ) : null;

  const item = (flag: Attention): { text: string; action: ComponentChildren } => {
    switch (flag) {
      case 'payment_overdue':
        return {
          text: s.hasSubscription
            ? 'Stripe could not charge their card and is trying again. Check the payment in Stripe, or ask their billing contact.'
            : `The payment is overdue. Paid through ${through}.`,
          action: s.stripeCustomerId ? (
            <Button variant="primary" grow href={stripeCustomer(s.stripeCustomerId)} external>
              Open in Stripe
            </Button>
          ) : (
            record
          ),
        };
      case 'manual_overdue':
        return { text: `Paid through ${through} and no bank transfer recorded since. Record it once it arrives, or ask their billing contact.`, action: record };
      case 'manual_due_soon':
        return { text: `Paid through ${through}. Send them the next invoice.`, action: record };
      case 'invite_waiting':
        return {
          text: `Invited on ${longDate(s.createdAt)} and not paid yet.`,
          action: (
            <Button variant="primary" grow disabled={busy} onClick={() => void resend()}>
              {busy ? 'Sending…' : 'Email the invitation again'}
            </Button>
          ),
        };
      case 'new_logo':
        return {
          text: 'They uploaded a new logo. Add it to their partner document in Sanity.',
          action: (
            <Button variant="primary" grow onClick={toLogos}>
              See the logo
            </Button>
          ),
        };
      case 'meetup_passed_unpaid':
        return {
          text: 'A meetup it covers has passed and nobody has paid. Move it to a later meetup, or withdraw the invitation.',
          action: (
            <Button variant="primary" grow onClick={() => onOpen('bundle')}>
              Meetups and price
            </Button>
          ),
        };
    }
  };

  return (
    <section aria-labelledby="h-needed" class={cardClass('outline', 'lg')}>
      <Heading as="h3" size="card" id="h-needed">
        Action needed
      </Heading>
      <ul class="m-0 flex list-none flex-col gap-5 p-0">
        {attention.map((flag) => {
          const { text, action } = item(flag);
          return (
            <li key={flag} class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div class="flex flex-col items-start gap-1.5">
                <AttentionBadge flag={flag} labels={labels} />
                <p class="m-0 text-compact">{text}</p>
              </div>
              {action && <div class="flex flex-none flex-wrap">{action}</div>}
            </li>
          );
        })}
      </ul>
      {error && <Notice kind="error">{error}</Notice>}
    </section>
  );
}

/* ------------------------------------------------------------------ summary */

function Summary({ d }: { d: Detail }) {
  const s = d.sponsor;
  const rows: [string, ComponentChildren][] = [
    ['Plan', `${s.tierName}, ${s.feeLabel}`],
    ['Payment', s.paymentLabel],
  ];
  if (s.status === 'ending' && s.lastDay) rows.push(['Last day', longDate(s.lastDay)]);
  if (s.status !== 'ended') rows.push(['Paid through', s.paidThrough ? longDate(s.paidThrough) : 'Not paid yet']);
  if (s.startedAt) rows.push(['Started', longDate(s.startedAt)]);
  if (s.cycle === 'once')
    rows.push([
      s.meetups.length === 1 ? 'Meetup' : 'Meetups',
      s.meetups.length ? (
        <ul key="meetups" class="m-0 flex list-none flex-col gap-0.5 p-0">
          {s.meetups.map((m) => (
            <li key={m.eventId}>
              {m.title}, {longDate(m.date)}
            </li>
          ))}
        </ul>
      ) : (
        'None chosen'
      ),
    ]);
  if (s.cycle === 'once' && s.status === 'pending') rows.push(['Signed contract', s.hasContract ? 'On file' : 'None: they sign online']);
  if (d.pendingChange) rows.push(['From the renewal', `${planName(d.pendingChange.tier, d.pendingChange.cycle)}, from ${longDate(d.pendingChange.from)}`]);

  const more: [string, ComponentChildren][] = [
    ['Legal name', s.legalName ?? 'Not set'],
    ['VAT number', s.vatId ?? 'Not set'],
    ['Website', s.website ?? 'Not set'],
    ['Billing address', s.billingAddress ?? 'Not set'],
    [
      'Stripe',
      s.stripeCustomerId ? (
        <TextButton key="stripe" size="body" href={stripeCustomer(s.stripeCustomerId)} external>
          Open in Stripe
        </TextButton>
      ) : (
        'No Stripe customer'
      ),
    ],
    ['Partner id', s.partnerId ?? 'Not linked'],
    ['Source', SOURCE_LABEL[s.source]],
    ['Added', shortDateTime(s.createdAt)],
  ];

  return (
    <section aria-labelledby="h-summary" class={cardClass('filled', 'lg')}>
      <Heading as="h3" size="card" id="h-summary">
        Summary
      </Heading>
      <Pairs rows={rows} />
      {s.paymentLinkUrl && s.status === 'pending' && <CopyLink label="Payment link" url={s.paymentLinkUrl} />}
      {s.notes && <p class="m-0 text-compact break-words whitespace-pre-line">{s.notes}</p>}
      <details class="group">
        <summary class="cursor-pointer text-compact font-bold">More details</summary>
        <div class="pt-4">
          <Pairs rows={more} />
        </div>
      </details>
    </section>
  );
}

function Pairs({ rows }: { rows: [string, ComponentChildren][] }) {
  return (
    <dl class="m-0 grid grid-cols-auto-sm gap-x-6 gap-y-4">
      {rows.map(([k, v]) => (
        <div key={k} class="flex flex-col gap-0.5">
          <dt class="text-meta text-grey-text">{k}</dt>
          <dd class="m-0 text-body font-bold break-words whitespace-pre-line">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ contacts */

function Contacts({ contacts, sponsor: s, id, onChanged, onSignedOut }: Ctx & { contacts: Contact[]; sponsor: AdminSponsorView }) {
  const [inviting, setInviting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'other' as Contact['role'] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [done, setDone] = useState('');
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const ended = s.status === 'ended';

  const resend = async (c: Contact) => {
    setBusy(true);
    setError(null);
    const { status, body } = await post<{ emailed?: number }>(`${BASE}/${id}/invite`, { contactId: c.id, message: message || undefined });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ field: 'message', message: body.error ?? 'Could not send the invitation.' });
    setInviting(null);
    setMessage('');
    setDone(body.emailed ? `Invitation emailed to ${c.email}.` : `The invitation to ${c.email} was not sent. Try again later.`);
  };
  const remove = async (c: Contact) => {
    setBusy(true);
    setError(null);
    const { status, body } = await api(`${BASE}/${id}/contacts/${c.id}`, { method: 'DELETE' });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ message: body.error ?? 'Could not remove the contact.' });
    setRemoving(null);
    setDone(`${c.name} removed.`);
    onChanged();
  };

  return (
    <Block id="h-contacts" title="Contacts" intro="The people who sign in to the sponsorship page. Each email belongs to one sponsor.">
      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        {contacts.map((c) => (
          <li key={c.id} class={cardClass('outline', 'md')}>
            <div class="flex flex-col gap-1 min-w-0">
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-body font-bold">{c.name}</span>
                <Tag>{ROLE_LABEL[c.role]}</Tag>
                {c.pending && <Tag tone="black">Not joined yet</Tag>}
              </span>
              <span class="text-compact break-all">{c.email}</span>
              <span class="text-meta text-grey-text">{c.hasAccount ? 'Has signed in' : 'Not signed in yet'}</span>
            </div>
            {inviting !== c.id && removing !== c.id && (
              <div class="flex flex-wrap gap-x-5 gap-y-2">
                {!ended && !c.hasAccount && <TextButton onClick={() => setInviting(c.id)}>Resend invitation</TextButton>}
                {contacts.length > 1 && <TextButton onClick={() => setRemoving(c.id)}>Remove</TextButton>}
              </div>
            )}
            {inviting === c.id && (
              <div class="flex flex-col gap-3">
                <TextArea
                  label={optional('Message in the email')}
                  rows={2}
                  value={message}
                  invalid={!!err('message')}
                  error={err('message')}
                  onInput={(e) => setMessage(inputValue(e))}
                />
                <div class="flex flex-wrap gap-3">
                  <Button variant="primary" grow disabled={busy} onClick={() => void resend(c)}>
                    {busy ? 'Sending…' : `Email ${c.name}`}
                  </Button>
                  <Button variant="secondary" grow onClick={() => setInviting(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {removing === c.id && (
              <div class="flex flex-col gap-3">
                <p class="m-0 text-compact font-bold">Remove {c.name}? They can no longer sign in for this sponsor.</p>
                <div class="flex flex-wrap gap-3">
                  <Button variant="primary" grow disabled={busy} onClick={() => void remove(c)}>
                    {busy ? 'Removing…' : 'Yes, remove'}
                  </Button>
                  <Button variant="secondary" grow onClick={() => setRemoving(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && error.field !== 'message' && !['name', 'email', 'role'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
      {done && <Notice kind="done">{done}</Notice>}
      {!ended &&
        (!adding ? (
          <Button variant="secondary" grow class="self-start" onClick={() => setAdding(true)}>
            Add a contact
          </Button>
        ) : (
          <form
            class={cardClass('outline', 'lg')}
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError(null);
              const { status, body } = await post<{ contact?: Contact }>(`${BASE}/${id}/contacts`, f);
              setBusy(false);
              if (status === 401) return onSignedOut();
              if (status !== 200 || !body.contact) return setError({ field: body.field, message: body.error ?? 'Could not add the contact.' });
              setAdding(false);
              setF({ name: '', email: '', role: 'other' });
              setDone(`${body.contact.name} added. Resend the invitation so they know how to sign in.`);
              onChanged();
            }}
          >
            <div class="grid grid-cols-auto-sm gap-4">
              <TextField
                label="Name"
                name="name"
                autoComplete="off"
                value={f.name}
                invalid={!!err('name')}
                error={err('name')}
                onInput={(e) => setF({ ...f, name: inputValue(e) })}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                autoComplete="off"
                value={f.email}
                invalid={!!err('email')}
                error={err('email')}
                onInput={(e) => setF({ ...f, email: inputValue(e) })}
              />
              <SelectField
                label="Role"
                name="role"
                value={f.role}
                invalid={!!err('role')}
                error={err('role')}
                onChange={(e) => setF({ ...f, role: inputValue(e) as Contact['role'] })}
              >
                {(Object.keys(ROLE_LABEL) as Contact['role'][]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </SelectField>
            </div>
            <div class="flex flex-wrap gap-3">
              <SubmitButton busy={busy} grow>
                {busy ? 'Adding…' : 'Add contact'}
              </SubmitButton>
              <Button variant="secondary" grow onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ))}
    </Block>
  );
}

/* ------------------------------------------------------------------ logos and contracts */

const LOGO_TYPES = 'image/svg+xml,image/png,image/webp';

function Logos({ logos, ended, id, onChanged, onSignedOut }: Ctx & { logos: Logo[]; ended: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [picker, setPicker] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const upload = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!file) return setError('Choose a logo file.');
    setBusy(true);
    setError('');
    setDone('');
    const data = new FormData();
    data.set('file', file);
    const { status, body } = await api(`${BASE}/${id}/logos`, { method: 'POST', body: data });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not upload the logo.');
    setFile(null);
    setPicker((n) => n + 1);
    setDone('Logo uploaded. The sponsor sees it on their page.');
    onChanged();
  };

  return (
    <Block id="h-logos" title="Logos" intro="Newest first. The newest one is shown on the sponsor's page. Add it to their partner document in Sanity.">
      {logos.length === 0 && <p class="m-0 text-compact text-ink-2">None uploaded yet.</p>}
      {!ended && (
        <form class={cardClass('outline', 'lg', 'max-w-form')} noValidate onSubmit={upload}>
          <FileField
            key={picker}
            label="Upload a logo for them"
            hint="SVG, PNG or WebP, up to 2 MB."
            accept={LOGO_TYPES}
            fileName={file?.name ?? null}
            invalid={!!error}
            error={error || undefined}
            onFile={(f) => {
              setFile(f);
              setError('');
              setDone('');
            }}
          />
          <SubmitButton busy={busy} grow class="self-start">
            {busy ? 'Uploading…' : 'Upload logo'}
          </SubmitButton>
        </form>
      )}
      {done && <Notice kind="done">{done}</Notice>}
      <ul class="m-0 flex list-none flex-col gap-6 p-0">
        {logos.map((l) => {
          const src = `${BASE}/${id}/logos/${l.id}`;
          return (
            <li key={l.id} class="flex flex-col gap-3">
              {/* The site's header and footer are black: check the logo on both. */}
              <div class="grid max-w-form grid-cols-2 gap-3">
                <div class="flex h-28 items-center justify-center rounded-card border border-grey-frame bg-white p-4">
                  <img src={src} alt={`${l.filename} on white`} class="block max-h-full max-w-full object-contain" />
                </div>
                <div class="flex h-28 items-center justify-center rounded-card bg-black p-4">
                  <img src={src} alt={`${l.filename} on black`} class="block max-h-full max-w-full object-contain" />
                </div>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-compact font-bold break-all">{l.filename}</span>
                <span class="text-meta text-grey-text">
                  {kb(l.bytes)}, uploaded {shortDateTime(l.uploadedAt)} by {l.uploadedBy === 'board' ? 'the board' : l.uploadedBy}
                </span>
                <TextButton href={src} download={l.filename} class="self-start">
                  Download
                </TextButton>
              </div>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}

function Contracts({ contracts, id }: Ctx & { contracts: Contract[] }) {
  return (
    <Block id="h-contracts" title="Signed contracts" intro="Contracts signed outside the site. One on file replaces signing online.">
      {contracts.length === 0 ? (
        <p class="m-0 text-compact text-ink-2">None attached.</p>
      ) : (
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {contracts.map((c) => (
            <li key={c.id} class="flex flex-col gap-1">
              <span class="text-compact font-bold break-all">{c.filename}</span>
              <span class="text-meta text-grey-text">
                {c.signedOn ? `Signed on ${longDate(c.signedOn)}` : 'Signing date not given'}, attached {shortDateTime(c.uploadedAt)}, {kb(c.bytes)}
              </span>
              <TextButton href={`${BASE}/${id}/contracts/${c.id}`} external={false} class="self-start">
                Download
              </TextButton>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

/* ------------------------------------------------------------------ agreements and history */

const FIELD_LABEL: Record<string, string> = {
  companyName: 'company name',
  legalName: 'legal name',
  billingAddress: 'billing address',
  vatId: 'VAT number',
  website: 'website',
  notes: 'notes',
  partnerId: 'Partner id',
  tier: 'tier',
  cycle: 'billing',
  paymentMode: 'payment method',
  paidUntil: 'paid until',
  startedAt: 'start date',
  pricePerMeetup: 'price per meetup',
};
/** Bookkeeping the history leaves out. */
const INTERNAL_FIELDS = new Set(['stripeCustomerId', 'stripeSubscriptionId', 'checkoutSessionId', 'paymentLinkId', 'paymentLinkUrl', 'endRequestedAt', 'endsAt', 'updatedAt']);
const fieldLabel = (k: string) => FIELD_LABEL[k] ?? k.replace(/([A-Z])/g, ' $1').toLowerCase();
const isTier = (v: unknown): v is Tier => TIERS.some((t) => t.key === v);
const isRecurring = (v: unknown): v is (typeof RECURRING)[number] => RECURRING.some((c) => c === v);

function actorText(a: SponsorEvent['actor']) {
  if (a.kind === 'board') return 'the board';
  if (a.kind === 'sponsor') return a.id;
  if (a.kind === 'stripe') return 'Stripe';
  return 'the daily check';
}

/** One history event as a plain sentence; internal fields (ids, flags) stay out. */
function eventText(e: SponsorEvent): string {
  const p = e.payload;
  const str = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : '');
  const status = (s: Status | null) => (s ? STATUS_LABEL[s].toLowerCase() : '');
  switch (e.type) {
    case 'created':
      return `Added${str('source') && str('source') in SOURCE_LABEL ? `: ${SOURCE_LABEL[str('source') as AdminSponsorView['source']].toLowerCase()}` : ''}.`;
    case 'status_changed': {
      const reason = str('reason') in ENDED_LABEL ? ` (${ENDED_LABEL[str('reason') as EndedReason]})` : '';
      const ends = str('endsAt') ? `, last day ${longDate(lastDay(str('endsAt')))}` : '';
      return `Status changed${e.fromStatus ? ` from ${status(e.fromStatus)}` : ''} to ${status(e.toStatus)}${reason}${ends}.`;
    }
    case 'updated': {
      const fields = Array.isArray(p.fields) ? (p.fields as unknown[]).filter((x): x is string => typeof x === 'string' && !INTERNAL_FIELDS.has(x)) : [];
      return fields.length ? `Changed: ${fields.map(fieldLabel).join(', ')}.` : 'Details updated.';
    }
    case 'stripe_linked':
      return 'Linked to Stripe.';
    case 'agreement_accepted':
      return `Agreement accepted${p.context === 'change' ? ' for a change' : ''}${str('version') ? ` (version ${str('version')})` : ''}.`;
    case 'contract_attached':
      return 'Signed contract attached.';
    case 'logo_uploaded':
      return 'Logo uploaded.';
    case 'meetups_set': {
      const n = Array.isArray(p.events) ? p.events.length : 0;
      return n ? `Meetups set (${n === 1 ? 'one meetup' : `${n} meetups`}).` : 'Meetups set.';
    }
    case 'meetup_covered':
      return 'Meetup confirmed as covered.';
    case 'meetup_uncovered':
      return 'Covered meetup taken off.';
    case 'change_suggested':
      return p.kind === 'end'
        ? 'Change sent to confirm: end the sponsorship.'
        : `Change sent to confirm: ${isTier(p.tier) ? tierInfo(p.tier).name : 'a new plan'}${isRecurring(p.cycle) ? `, ${cycleInfo(p.cycle).label.toLowerCase()}` : ''}.`;
    case 'payment_recorded': {
      const amount = typeof p.amount === 'number' ? `${chf(p.amount)}, ` : '';
      const ref = str('reference') ? `reference ${str('reference')}, ` : '';
      return `Bank transfer recorded: ${amount}${ref}paid through ${str('paidUntil') ? longDate(lastDay(str('paidUntil'))) : 'not given'}.`;
    }
    case 'contact_added': {
      const role = str('role') in ROLE_LABEL ? ROLE_LABEL[str('role') as Contact['role']].toLowerCase() : 'contact';
      return `Contact added as ${role}${p.addedBy === 'sponsor' ? ' by a colleague' : ''}.`;
    }
    case 'contact_removed':
      return 'Contact removed.';
    default: {
      const t = e.type.replace(/_/g, ' ');
      return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
    }
  }
}

function Records({ d }: { d: Detail }) {
  return (
    <div class={cardClass('outline', 'md')}>
      <details>
        <summary class="cursor-pointer text-card-title font-bold">Agreements and history</summary>
        <div class="flex flex-col gap-6 pt-5">
          <section aria-labelledby="h-agreements" class="flex flex-col gap-3">
            <Heading as="h4" size="card" id="h-agreements">
              Agreements signed
            </Heading>
            {d.agreements.length === 0 ? (
              <p class="m-0 text-compact text-ink-2">None yet.</p>
            ) : (
              <ul class="m-0 flex list-none flex-col gap-3 p-0">
                {d.agreements.map((a) => (
                  <li key={a.id} class="flex flex-col gap-0.5">
                    <span class="text-compact font-bold">
                      {a.summary} <span class="font-normal text-grey-text">({a.context === 'start' ? 'to start' : 'for a change'})</span>
                    </span>
                    <span class="text-compact break-words">
                      {a.signerName}, {a.signerTitle}, {a.signerEmail}
                    </span>
                    <span class="text-meta text-grey-text">
                      Version {a.version}, signed {shortDateTime(a.acceptedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="h-history" class="flex flex-col gap-3">
            <Heading as="h4" size="card" id="h-history">
              History
            </Heading>
            {d.events.length === 0 && <p class="m-0 text-compact text-ink-2">Nothing yet.</p>}
            <ol class="m-0 flex list-none flex-col gap-2 p-0">
              {d.events.map((e) => (
                <li key={e.id} class="flex flex-col text-compact break-words">
                  <span>{eventText(e)}</span>
                  <span class="text-meta text-grey-text">
                    {shortDateTime(e.at)}, by {actorText(e.actor)}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ editing the details */

function EditDetails({ sponsor: s, id, onChanged, onSignedOut }: Ctx & { sponsor: AdminSponsorView }) {
  const initial = () => ({
    companyName: s.companyName,
    legalName: s.legalName ?? '',
    billingAddress: s.billingAddress ?? '',
    vatId: s.vatId ?? '',
    website: s.website ?? '',
    partnerId: s.partnerId ?? '',
    notes: s.notes ?? '',
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const [done, setDone] = useState('');
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const text = (k: 'companyName' | 'legalName' | 'vatId' | 'website' | 'partnerId', label: ComponentChildren, hint?: string) => (
    <TextField label={label} hint={hint} name={k} value={f[k]} invalid={!!err(k)} error={err(k)} onInput={(e) => set(k, inputValue(e))} />
  );

  return (
    <Block id="h-edit" title="Details and notes">
      {done && <Notice kind="done">{done}</Notice>}
      {!open ? (
        <Button
          variant="secondary"
          grow
          class="self-start"
          aria-expanded={false}
          onClick={() => {
            setF(initial());
            setError(null);
            setDone('');
            setOpen(true);
          }}
        >
          Edit details
        </Button>
      ) : (
        <form
          class={cardClass('outline', 'lg')}
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            const { status, body } = await post(`${BASE}/${id}`, { ...f, partnerId: f.partnerId.trim() || null });
            setBusy(false);
            if (status === 401) return onSignedOut();
            if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not save the details.' });
            setOpen(false);
            setDone('Details saved.');
            onChanged();
          }}
        >
          <p class="m-0 text-compact text-ink-2">
            The company name is shown on the site and in emails, the legal name on invoices. Company and billing details are copied to Stripe when they have a Stripe customer.
          </p>
          <div class="grid grid-cols-auto-sm gap-4">
            {text('companyName', 'Company name')}
            {text('legalName', optional('Legal name'))}
            {text('vatId', optional('VAT number'))}
            {text('website', optional('Website'))}
          </div>
          <TextArea
            label={optional('Billing address')}
            rows={3}
            value={f.billingAddress}
            invalid={!!err('billingAddress')}
            error={err('billingAddress')}
            onInput={(e) => set('billingAddress', inputValue(e))}
          />
          {text(
            'partnerId',
            optional('Partner id'),
            'The id of their partner record, for example gyff. It gives them their logo on the site, at this tier. Without it a running sponsor is listed by name only.',
          )}
          <TextArea label={optional('Notes for the board')} rows={3} value={f.notes} invalid={!!err('notes')} error={err('notes')} onInput={(e) => set('notes', inputValue(e))} />
          {error && !['companyName', 'legalName', 'vatId', 'website', 'partnerId', 'billingAddress', 'notes'].includes(error.field ?? '') && (
            <Notice kind="error">{error.message}</Notice>
          )}
          <div class="flex flex-wrap gap-3">
            <SubmitButton busy={busy} grow>
              {busy ? 'Saving…' : 'Save details'}
            </SubmitButton>
            <Button variant="secondary" grow onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Block>
  );
}
