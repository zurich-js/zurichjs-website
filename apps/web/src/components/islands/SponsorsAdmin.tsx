/**
 * The admin area's Sponsors section (/admin/sponsors), inside MembershipAdmin's sign-in and
 * sub-navigation. Sponsors with search and status filters; one sponsor's details, contacts,
 * proposals, logos, agreements and audit log; inviting a company or importing a sponsorship
 * paid directly to the association. Changes to a running sponsorship are proposals the
 * sponsor confirms in their partner account (owner, 18th November 2026); the board can still
 * end one outright. API: /api/membership/admin/sponsors (server/sponsor-admin.ts).
 * /admin/sponsors?id=<uuid> opens one sponsor (the Slack notes link there).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { badgeClass, cx } from '@zurichjs/design/recipes';
import {
  CYCLES,
  ENDED_REASON_LABEL,
  PROPOSAL_DAYS,
  TIERS,
  changeTiming,
  feeLabel,
  tierInfo,
  type Cycle,
  type EndedReason,
  type SponsorEvent,
  type Status,
  type Tier,
} from '@zurichjs/sponsorship';
import { lastDay, longDate, shortDate, shortDateTime } from '../../server/dates.ts';
import type { AdminSponsorView, agreementView, contactView, logoView, proposalView } from '../../server/sponsor.ts';
import { SubmitButton } from './forms/shared.tsx';

type Contact = ReturnType<typeof contactView>;
type Agreement = ReturnType<typeof agreementView>;
type Proposal = ReturnType<typeof proposalView>;
type Logo = ReturnType<typeof logoView>;

interface Detail {
  sponsor: AdminSponsorView;
  contacts: Contact[];
  agreements: Agreement[];
  proposals: Proposal[];
  logos: Logo[];
  /** Newest first. */
  events: SponsorEvent[];
  pendingChange: { tier: Tier; cycle: Cycle; from: string } | null;
}
interface Meetup {
  id: string;
  title: string;
  date: string;
}
type FieldError = { field?: string; message: string } | null;

const BASE = '/api/membership/admin/sponsors';

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Waiting for payment',
  active: 'Active',
  past_due: 'Payment problem',
  ending: 'Ending',
  ended: 'Ended',
};
const STATUSES = Object.keys(STATUS_LABEL) as Status[];

const PROPOSAL_LABEL: Record<Proposal['status'], string> = {
  open: 'Waiting for the sponsor',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};
const ROLE_LABEL: Record<Contact['role'], string> = { primary: 'Main contact', billing: 'Billing', other: 'Other' };
const SOURCE_LABEL: Record<AdminSponsorView['source'], string> = {
  self_serve: 'signed up online',
  invited: 'invited by the board',
  imported: 'imported (paid directly)',
};
const CONTEXT_LABEL: Record<Agreement['context'], string> = { start: 'to start', change: 'for a plan change', proposal: 'accepting a proposal' };
const END_REASONS: { value: Extract<EndedReason, 'terminated' | 'withdrawn' | 'completed'>; label: string }[] = [
  { value: 'terminated', label: 'Ended by the board (for example a breach of the agreement)' },
  { value: 'withdrawn', label: 'Invitation withdrawn (it never started)' },
  { value: 'completed', label: 'Completed' },
];

const statusText = (s: Pick<AdminSponsorView, 'status' | 'endedReason'>) =>
  s.status === 'ended' && s.endedReason ? `${STATUS_LABEL.ended} (${ENDED_REASON_LABEL[s.endedReason]})` : STATUS_LABEL[s.status];
const date = (iso: string | null) => (iso ? shortDate(iso) : 'not set');
const today = () => new Date().toISOString().slice(0, 10);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const planName = (tier: Tier, cycle: Cycle) => `${tierInfo(tier).name}, ${feeLabel(tier, cycle)}`;
const inputValue = (e: Event) => (e.target as HTMLInputElement).value;

async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T & { ok?: boolean; error?: string; field?: string } }> {
  const res = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string; field?: string } };
}
const post = <T,>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });

/** Keeps ?id= in the address, so a reload or a shared link opens the same sponsor. */
function setUrlId(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
  window.history.replaceState(null, '', url);
}

function Notice({ kind, children }: { kind: 'error' | 'done'; children: string }) {
  return kind === 'error' ? (
    <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-base font-bold break-words">
      {children}
    </p>
  ) : (
    <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 text-base font-bold break-words">
      {children}
    </p>
  );
}

export function SponsorsAdmin({ onSignedOut }: { onSignedOut: () => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [sponsors, setSponsors] = useState<AdminSponsorView[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async (query = q, filter = status) => {
    const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(filter ? { status: filter } : {}) });
    const { status: code, body } = await api<{ sponsors: AdminSponsorView[]; counts: Record<Status, number> | null }>(`${BASE}?${params}`);
    if (code === 401) return onSignedOut();
    if (code !== 200) return setError(body.error ?? 'Could not load the sponsors.');
    setError('');
    setSponsors(body.sponsors);
    if (body.counts) setCounts(body.counts);
  };
  const open = (id: string | null) => {
    setSelected(id);
    setUrlId(id);
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setSelected(id);
    void load();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const total = counts ? STATUSES.reduce((n, s) => n + counts[s], 0) : null;

  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap gap-3">
        <Button variant="outline-black" size="sm" onClick={() => setAdding(!adding)} aria-expanded={adding}>
          Add a sponsor
        </Button>
      </div>

      {adding && (
        <AddSponsor
          onAdded={(id) => {
            void load();
            open(id);
          }}
          onOpen={open}
          onSignedOut={onSignedOut}
        />
      )}

      {counts && (
        <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
          {[['Sponsors', total] as const, ...STATUSES.map((s) => [STATUS_LABEL[s], counts[s]] as const)].map(([k, v]) => (
            // Numbers sit at the bottom of every tile, so they line up even when a label wraps.
            <div key={k} class="bg-grey rounded-card px-5 py-4 flex flex-col justify-between gap-2">
              <dt class="text-sm text-grey-text">{k}</dt>
              <dd class="m-0 text-3xl font-bold leading-none tabular-nums">{v ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}

      <form
        class="flex flex-col gap-4"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <div class="flex flex-wrap items-end gap-3">
          <TextField label="Search" name="q" placeholder="Company or contact email" value={q} onInput={(e) => setQ(inputValue(e))} class="grow basis-64" />
          <SubmitButton size="md">Search</SubmitButton>
        </div>
        <ChipGroup
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            void load(q, v);
          }}
          options={[
            { value: '' as const, label: total === null ? 'All' : `All (${total})` },
            ...STATUSES.map((s) => ({ value: s, label: counts ? `${STATUS_LABEL[s]} (${counts[s]})` : STATUS_LABEL[s] })),
          ]}
        />
      </form>

      {error && <Notice kind="error">{error}</Notice>}

      {sponsors && (
        // Phones: one card per sponsor (a six-column table does not fit).
        <ul class="md:hidden m-0 p-0 list-none flex flex-col gap-3" aria-label="Sponsors">
          {sponsors.length === 0 && <li class="text-ink-2">No sponsors match.</li>}
          {sponsors.map((s) => (
            <li key={s.id} class={cx('border border-grey-frame rounded-card px-5 py-4 flex flex-col gap-1', selected === s.id && 'bg-grey-soft')}>
              <button
                type="button"
                class="bg-transparent border-0 p-0 font-bold text-left text-lg underline underline-offset-3 cursor-pointer self-start"
                onClick={() => open(s.id)}
                aria-expanded={selected === s.id}
              >
                {s.companyName}
              </button>
              <span class="text-base">
                {s.tierName}, {s.feeLabel}
              </span>
              <span class="text-base">
                {s.paymentLabel} · {statusText(s)}
              </span>
              <span class="text-sm text-grey-text">{s.paidThrough ? `Paid through ${shortDate(s.paidThrough)}` : 'Not paid yet'}</span>
            </li>
          ))}
        </ul>
      )}

      {sponsors && (
        <div class="hidden md:block overflow-x-auto border border-grey-frame rounded-card">
          <table class="w-full border-collapse text-base">
            <caption class="sr-only">Sponsors</caption>
            <thead>
              <tr class="text-left text-grey-text text-sm">
                {['Company', 'Tier', 'Billing', 'Payment', 'Status', 'Paid through'].map((h) => (
                  <th key={h} scope="col" class="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sponsors.length === 0 && (
                <tr>
                  <td colSpan={6} class="px-4 py-6 text-ink-2">
                    No sponsors match.
                  </td>
                </tr>
              )}
              {sponsors.map((s) => (
                <tr key={s.id} class={cx('border-t border-grey-frame', selected === s.id && 'bg-grey-soft')}>
                  <td class="px-4 py-3">
                    <button
                      type="button"
                      class="bg-transparent border-0 p-0 font-bold text-left underline underline-offset-3 cursor-pointer"
                      onClick={() => open(s.id)}
                      aria-expanded={selected === s.id}
                    >
                      {s.companyName}
                    </button>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{s.tierName}</td>
                  <td class="px-4 py-3">{s.feeLabel}</td>
                  <td class="px-4 py-3">{s.paymentLabel}</td>
                  <td class="px-4 py-3">
                    <span class={badgeClass(s.status === 'past_due' ? 'danger' : 'neutral')}>{STATUS_LABEL[s.status]}</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{s.paidThrough ? shortDate(s.paidThrough) : 'not paid yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <SponsorDetail id={selected} onClose={() => open(null)} onChanged={() => void load()} onSignedOut={onSignedOut} />}
    </div>
  );
}

/* ------------------------------------------------------------------ one sponsor */

function SponsorDetail({ id, onClose, onChanged, onSignedOut }: { id: string; onClose: () => void; onChanged: () => void; onSignedOut: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const { status, body } = await api<Detail>(`${BASE}/${encodeURIComponent(id)}`);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not load the sponsor.');
    setD(body);
  };
  useEffect(() => {
    setD(null);
    setNotice('');
    setError('');
    void load();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reload when the sponsor changes
  }, [id]);

  if (!d) return <p class="m-0 text-ink-2">{error || 'Loading the sponsor…'}</p>;
  const s = d.sponsor;
  const changed = (text: string) => {
    setError('');
    setNotice(text);
    onChanged();
    void load();
  };
  const ctx = { id, onDone: changed, onSignedOut };
  const open = d.proposals.find((p) => p.status === 'open') ?? null;

  const rows: [string, string][] = [
    ['Status', statusText(s)],
    ['Plan', `${s.tierName}, ${s.feeLabel}`],
    ['Payment', s.paymentLabel],
    ['Started', date(s.startedAt)],
    ['Paid through', date(s.paidThrough)],
    ...(s.status === 'ending' && s.lastDay ? ([['Last day', longDate(s.lastDay)]] as [string, string][]) : []),
    ...(s.meetup ? ([['Meetup', s.meetup.title ? `${s.meetup.title}${s.meetup.date ? `, ${longDate(s.meetup.date)}` : ''}` : 'not set']] as [string, string][]) : []),
    ['Source', SOURCE_LABEL[s.source]],
    ['Added', shortDateTime(s.createdAt)],
    ['Legal name', s.legalName ?? 'not set'],
    ['VAT number', s.vatId ?? 'not set'],
    ['Website', s.website ?? 'not set'],
    ['Billing address', s.billingAddress ?? 'not set'],
    ['Sanity partner id', s.partnerId ?? 'not linked'],
  ];

  return (
    <section aria-labelledby="h-sponsor" class="bg-grey rounded-card p-6 md:p-8 flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h2 id="h-sponsor" class="m-0 text-3xl leading-tight font-bold break-words">
          {s.companyName}
        </h2>
        <Button variant="white" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k} class="flex flex-col gap-0.5">
            <dt class="text-sm text-grey-text">{k}</dt>
            <dd class="m-0 text-base font-bold break-words whitespace-pre-line">{v}</dd>
          </div>
        ))}
      </dl>
      {(s.stripeCustomerId || s.stripeSubscriptionId) && (
        <p class="m-0 text-base text-ink-2 break-words">
          Stripe:{' '}
          {s.stripeCustomerId && (
            <a href={`https://dashboard.stripe.com/customers/${s.stripeCustomerId}`} target="_blank" rel="noopener" class="font-bold text-black">
              {s.stripeCustomerId}
            </a>
          )}
          {s.stripeCustomerId && s.stripeSubscriptionId && ' · '}
          {s.stripeSubscriptionId && (
            <a href={`https://dashboard.stripe.com/subscriptions/${s.stripeSubscriptionId}`} target="_blank" rel="noopener" class="font-bold text-black">
              {s.stripeSubscriptionId}
            </a>
          )}
        </p>
      )}
      {s.notes && <p class="m-0 text-base bg-white rounded-card px-5 py-4 whitespace-pre-line break-words">{s.notes}</p>}
      {d.pendingChange && (
        <p class="m-0 text-base bg-white rounded-card px-5 py-4">
          Waiting for the renewal: changes to <b>{planName(d.pendingChange.tier, d.pendingChange.cycle)}</b> on {longDate(d.pendingChange.from)}.
        </p>
      )}

      {notice && <Notice kind="done">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      <Contacts contacts={d.contacts} ended={s.status === 'ended'} {...ctx} />
      <Proposals proposals={d.proposals} {...ctx} />
      {s.status !== 'ended' && <ProposeChange sponsor={s} open={open} {...ctx} />}
      {s.status !== 'ended' && <RecordPayment sponsor={s} {...ctx} />}
      <Logos logos={d.logos} {...ctx} />
      <Agreements agreements={d.agreements} />
      <EditDetails sponsor={s} {...ctx} />
      {s.status !== 'ended' && <EndOutright sponsor={s} {...ctx} />}
      <History events={d.events} />
    </section>
  );
}

interface Ctx {
  id: string;
  onDone: (notice: string) => void;
  onSignedOut: () => void;
}

/** A white block inside the sponsor's details. */
function Block({ title, intro, children }: { title: string; intro?: string; children: ComponentChildren }) {
  const hid = `h-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={hid} class="bg-white rounded-card p-5 md:p-6 flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h3 id={hid} class="m-0 text-xl font-bold">
          {title}
        </h3>
        {intro && <p class="m-0 text-base text-ink-2">{intro}</p>}
      </div>
      {children}
    </section>
  );
}

function Contacts({ contacts, ended, id, onDone, onSignedOut }: Ctx & { contacts: Contact[]; ended: boolean }) {
  const [inviting, setInviting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'other' as Contact['role'] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  const resend = async (contact: Contact) => {
    setBusy(true);
    setError(null);
    const { status, body } = await post<{ emailed: number }>(`${BASE}/${id}/invite`, { contactId: contact.id, message: message || undefined });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ field: 'message', message: body.error ?? 'Could not send the invitation.' });
    setInviting(null);
    setMessage('');
    onDone(body.emailed ? `Invitation emailed to ${contact.email}.` : `The invitation to ${contact.email} was not sent. Try again later.`);
  };
  const remove = async (contact: Contact) => {
    if (!window.confirm(`Remove ${contact.name} (${contact.email}) as a contact? They can no longer sign in for this sponsor.`)) return;
    setBusy(true);
    setError(null);
    const { status, body } = await api(`${BASE}/${id}/contacts/${contact.id}`, { method: 'DELETE' });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ message: body.error ?? 'Could not remove the contact.' });
    onDone(`${contact.name} removed.`);
  };

  return (
    <Block title="Contacts" intro="The people who sign in to the partner account. Each email belongs to one sponsor.">
      <ul class="m-0 p-0 list-none flex flex-col gap-3">
        {contacts.map((c) => (
          <li key={c.id} class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-col min-w-0">
                <span class="font-bold">
                  {c.name} <span class="font-normal text-grey-text">· {ROLE_LABEL[c.role]}</span>
                </span>
                <span class="text-base break-all">{c.email}</span>
                <span class="text-sm text-grey-text">{c.hasAccount ? 'Has signed in' : 'Not signed in yet'}</span>
              </div>
              <div class="flex flex-wrap gap-2">
                {!ended && (
                  <Button variant="outline-black" size="sm" onClick={() => setInviting(inviting === c.id ? null : c.id)} aria-expanded={inviting === c.id}>
                    Resend invitation
                  </Button>
                )}
                {contacts.length > 1 && (
                  <Button variant="link" size="sm" disabled={busy} onClick={() => void remove(c)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
            {inviting === c.id && (
              <div class="bg-grey-soft rounded-card p-4 flex flex-col gap-3">
                <TextArea
                  label="Message in the email (optional)"
                  rows={2}
                  value={message}
                  invalid={!!err('message')}
                  error={err('message')}
                  onInput={(e) => setMessage(inputValue(e))}
                />
                <div class="flex flex-wrap gap-3">
                  <Button variant="black" size="sm" disabled={busy} onClick={() => void resend(c)}>
                    {busy ? 'Sending…' : `Email ${c.name}`}
                  </Button>
                  <Button variant="outline-black" size="sm" onClick={() => setInviting(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && !error.field && <Notice kind="error">{error.message}</Notice>}
      {!adding ? (
        <Button variant="outline-black" size="sm" class="self-start" onClick={() => setAdding(true)}>
          Add a contact
        </Button>
      ) : (
        <form
          class="flex flex-col gap-4"
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
            onDone(`${body.contact.name} added. Resend the invitation so they know how to sign in.`);
          }}
        >
          <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-4">
            <TextField label="Name" name="name" value={f.name} invalid={!!err('name')} error={err('name')} onInput={(e) => setF({ ...f, name: inputValue(e) })} />
            <TextField
              label="Email"
              name="email"
              type="email"
              value={f.email}
              invalid={!!err('email')}
              error={err('email')}
              onInput={(e) => setF({ ...f, email: inputValue(e) })}
            />
            <SelectField label="Role" name="role" value={f.role} error={err('role')} onChange={(e) => setF({ ...f, role: inputValue(e) as Contact['role'] })}>
              {(Object.keys(ROLE_LABEL) as Contact['role'][]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </SelectField>
          </div>
          <div class="flex flex-wrap gap-3">
            <SubmitButton busy={busy} size="sm">
              {busy ? 'Adding…' : 'Add contact'}
            </SubmitButton>
            <Button variant="outline-black" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Block>
  );
}

function Proposals({ proposals, id, onDone, onSignedOut }: Ctx & { proposals: Proposal[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!proposals.length) return null;
  const withdraw = async (p: Proposal) => {
    if (!window.confirm('Withdraw this proposal? The sponsor can no longer accept it.')) return;
    setBusy(true);
    setError('');
    const { status, body } = await post(`${BASE}/${id}/proposals/${p.id}`, {});
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not withdraw the proposal.');
    onDone('Proposal withdrawn.');
  };
  return (
    <Block title="Proposals">
      <ul class="m-0 p-0 list-none flex flex-col gap-4">
        {proposals.map((p) => (
          <li key={p.id} class="flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold">{p.kind === 'end' ? 'End the sponsorship' : `New plan: ${p.plan ?? 'not set'}`}</span>
              <span class={badgeClass(p.status === 'open' ? 'dark' : 'neutral')}>{PROPOSAL_LABEL[p.status]}</span>
            </div>
            <span class="text-sm text-grey-text">
              Sent {shortDateTime(p.createdAt)}
              {p.status === 'open' ? `, expires ${shortDateTime(p.expiresAt)}` : p.decidedAt ? `, ${PROPOSAL_LABEL[p.status].toLowerCase()} ${shortDateTime(p.decidedAt)}` : ''}
              {p.decidedBy ? ` by ${p.decidedBy}` : ''}
            </span>
            {p.message && <p class="m-0 text-base whitespace-pre-line break-words">“{p.message}”</p>}
            {p.status === 'open' && (
              <Button variant="outline-black" size="sm" class="self-start mt-1" disabled={busy} onClick={() => void withdraw(p)}>
                Withdraw proposal
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <Notice kind="error">{error}</Notice>}
    </Block>
  );
}

/** What happens when the sponsor accepts a plan change (server/sponsor-lifecycle.ts, appliesLabel). */
function timingText(s: AdminSponsorView, tier: Tier, cycle: Cycle) {
  if (s.tier === tier && s.cycle === cycle) return 'That is the plan they have now.';
  if (s.status === 'pending') return 'They have not paid yet: the new plan replaces the one they were invited to as soon as they accept.';
  if (s.paymentMode === 'manual') return 'Applies as soon as they accept. They pay directly, so adjust the billing by hand.';
  const t = changeTiming(s, { tier, cycle });
  if (t === 'now') return 'Applies as soon as they accept. Stripe charges only the difference for the rest of the current term (prorated).';
  return `Applies from their next renewal${s.paidUntil ? ` on ${longDate(s.paidUntil)}` : ''}. Nothing is refunded or charged twice.`;
}

function ProposeChange({ sponsor: s, open, id, onDone, onSignedOut }: Ctx & { sponsor: AdminSponsorView; open: Proposal | null }) {
  const canEnd = s.cycle !== 'once' && (s.status === 'active' || s.status === 'past_due');
  // A running one-meetup sponsorship cannot become another plan, nor a recurring one a one-meetup plan.
  const cycles = CYCLES.filter((c) => s.status === 'pending' || (s.cycle !== 'once' && c.key !== 'once'));
  const [kind, setKind] = useState<'plan' | 'end'>('plan');
  const [tier, setTier] = useState<Tier>(s.tier);
  const [cycle, setCycle] = useState<Cycle>(s.cycle);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  const intro = `For a change agreed with the sponsor. They get an email and confirm it in their partner account; nothing changes until a contact accepts. A proposal expires after ${PROPOSAL_DAYS} days.`;
  if (open)
    return (
      <Block title="Propose a change" intro={intro}>
        <p class="m-0 text-base">A proposal is waiting for the sponsor. Withdraw it above to send a different one.</p>
      </Block>
    );
  if (!cycles.length && !canEnd)
    return (
      <Block title="Propose a change" intro={intro}>
        <p class="m-0 text-base">A running one-meetup sponsorship cannot be changed. Invite them again for a new sponsorship instead.</p>
      </Block>
    );
  const k = cycles.length ? (canEnd ? kind : 'plan') : 'end';

  return (
    <Block title="Propose a change" intro={intro}>
      <form
        class="flex flex-col gap-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          const payload = k === 'plan' ? { kind: k, tier, cycle, message: message || undefined } : { kind: k, message: message || undefined };
          const { status, body } = await post<{ proposal?: Proposal }>(`${BASE}/${id}/proposals`, payload);
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not send the proposal.' });
          setMessage('');
          onDone('Proposal sent. The sponsor’s contacts were emailed to confirm it in their partner account.');
        }}
      >
        {canEnd && cycles.length > 0 && (
          <ChipGroup
            label="Propose"
            value={k}
            onChange={setKind}
            options={[
              { value: 'plan', label: 'A new plan' },
              { value: 'end', label: 'Ending the sponsorship' },
            ]}
          />
        )}
        {k === 'plan' ? (
          <>
            <ChipGroup label="New tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: t.name }))} />
            <ChipGroup label="New billing" value={cycle} onChange={setCycle} options={cycles.map((c) => ({ value: c.key, label: `${c.label}, ${feeLabel(tier, c.key)}` }))} />
            <p class="m-0 text-base bg-grey-soft rounded-card px-5 py-4">{timingText(s, tier, cycle)}</p>
            {err('tier') && <Notice kind="error">{err('tier')!}</Notice>}
            {err('cycle') && <Notice kind="error">{err('cycle')!}</Notice>}
          </>
        ) : (
          <p class="m-0 text-base bg-grey-soft rounded-card px-5 py-4">
            If they accept, the sponsorship runs to the end of the paid period{s.paidThrough ? ` (${longDate(s.paidThrough)})` : ''} and then ends. Nothing is refunded.
          </p>
        )}
        <TextArea
          label="Message to the sponsor (optional)"
          hint="Shown in the email and in their partner account."
          rows={3}
          value={message}
          invalid={!!err('message')}
          error={err('message')}
          onInput={(e) => setMessage(inputValue(e))}
        />
        {error && !['tier', 'cycle', 'message'].includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        <SubmitButton busy={busy} size="sm" class="self-start">
          {busy ? 'Sending…' : 'Send the proposal'}
        </SubmitButton>
      </form>
    </Block>
  );
}

function RecordPayment({ sponsor: s, id, onDone, onSignedOut }: Ctx & { sponsor: AdminSponsorView }) {
  const [paidUntil, setPaidUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = DATE.test(paidUntil);
  return (
    <Block
      title="Record a payment"
      intro={`For money paid outside Stripe, such as a bank transfer agreed directly. Paid until moves to the date you give${s.status === 'pending' || s.status === 'past_due' ? ', and the sponsorship becomes active' : ''}.`}
    >
      <form
        class="flex flex-col gap-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError('');
          const { status, body } = await post(`${BASE}/${id}/payment`, { paidUntil });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200) return setError(body.error ?? 'Could not record the payment.');
          setPaidUntil('');
          onDone(`Payment recorded: paid through ${longDate(lastDay(paidUntil))}.`);
        }}
      >
        <TextField
          label="Paid until (the first day not paid for)"
          hint={valid ? `Paid through ${longDate(lastDay(paidUntil))}.` : `Now paid through ${date(s.paidThrough)}.`}
          type="date"
          name="paidUntil"
          value={paidUntil}
          invalid={!!error}
          error={error || undefined}
          onInput={(e) => setPaidUntil(inputValue(e))}
          class="max-w-sm"
        />
        <SubmitButton busy={busy} size="sm" class="self-start">
          {busy ? 'Recording…' : 'Record payment'}
        </SubmitButton>
      </form>
    </Block>
  );
}

function Logos({ logos, id, onDone, onSignedOut }: Ctx & { logos: Logo[] }) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  const review = async (logo: Logo, verdict: 'approved' | 'rejected') => {
    setBusy(true);
    setError(null);
    const { status, body } = await post(`${BASE}/${id}/logos/${logo.id}`, { review: verdict, note: verdict === 'rejected' ? note : undefined });
    setBusy(false);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError({ field: body.field, message: body.error ?? 'Could not save the review.' });
    setRejecting(null);
    setNote('');
    onDone(
      verdict === 'approved'
        ? 'Logo approved and the sponsor was emailed. Add it to their partner document in Sanity and publish.'
        : 'Logo sent back. The sponsor was emailed your note.',
    );
  };
  return (
    <Block title="Logos" intro="Files the sponsor uploaded. Approving emails them; an approved logo still has to be added to their partner document in Sanity.">
      {logos.length === 0 && <p class="m-0 text-base text-ink-2">None uploaded yet.</p>}
      <ul class="m-0 p-0 list-none flex flex-col gap-5">
        {logos.map((l) => {
          const src = `${BASE}/${id}/logos/${l.id}`;
          return (
            <li key={l.id} class="flex flex-col md:flex-row gap-4">
              <a href={src} target="_blank" rel="noopener" class="flex-none self-start bg-grey-soft rounded-card p-4 flex items-center justify-center w-48 h-28">
                <img src={src} alt={`Logo ${l.filename}`} class="block max-w-full max-h-full object-contain" />
              </a>
              <div class="flex flex-col gap-2 min-w-0 grow">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold break-all">{l.filename}</span>
                  <span class={badgeClass(l.review === 'pending' ? 'dark' : l.review === 'rejected' ? 'danger' : 'neutral')}>
                    {l.review === 'pending' ? 'Waiting for review' : l.review === 'approved' ? 'Approved' : 'Sent back'}
                  </span>
                </div>
                <span class="text-sm text-grey-text">
                  {Math.max(1, Math.round(l.bytes / 1024))} KB, uploaded {shortDateTime(l.uploadedAt)} by {l.uploadedBy}
                  {l.reviewedAt ? `, reviewed ${shortDateTime(l.reviewedAt)}` : ''}
                </span>
                {l.reviewNote && <p class="m-0 text-base break-words">Note: {l.reviewNote}</p>}
                <div class="flex flex-wrap gap-3">
                  <Button href={src} variant="link" size="sm" external={false}>
                    Download
                  </Button>
                </div>
                {l.review === 'pending' && rejecting !== l.id && (
                  <div class="flex flex-wrap gap-3">
                    <Button variant="black" size="sm" disabled={busy} onClick={() => void review(l, 'approved')}>
                      Approve
                    </Button>
                    <Button variant="outline-black" size="sm" onClick={() => setRejecting(l.id)}>
                      Send back
                    </Button>
                  </div>
                )}
                {rejecting === l.id && (
                  <div class="bg-grey-soft rounded-card p-4 flex flex-col gap-3">
                    <TextArea
                      label="What should they change?"
                      hint="Emailed to the sponsor."
                      rows={2}
                      value={note}
                      invalid={error?.field === 'note'}
                      error={error?.field === 'note' ? error.message : undefined}
                      onInput={(e) => setNote(inputValue(e))}
                    />
                    <div class="flex flex-wrap gap-3">
                      <Button variant="black" size="sm" disabled={busy} onClick={() => void review(l, 'rejected')}>
                        {busy ? 'Sending…' : 'Send back'}
                      </Button>
                      <Button variant="outline-black" size="sm" onClick={() => setRejecting(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && error.field !== 'note' && <Notice kind="error">{error.message}</Notice>}
    </Block>
  );
}

function Agreements({ agreements }: { agreements: Agreement[] }) {
  return (
    <Block title="Agreements accepted">
      {agreements.length === 0 ? (
        <p class="m-0 text-base text-ink-2">None yet.</p>
      ) : (
        <ul class="m-0 p-0 list-none flex flex-col gap-3">
          {agreements.map((a) => (
            <li key={a.id} class="flex flex-col gap-0.5">
              <span class="font-bold">
                {a.summary} <span class="font-normal text-grey-text">({CONTEXT_LABEL[a.context]})</span>
              </span>
              <span class="text-base break-words">
                {a.signerName}, {a.signerTitle}, {a.signerEmail}
              </span>
              <span class="text-sm text-grey-text">
                Version {a.version}, accepted {shortDateTime(a.acceptedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function EditDetails({ sponsor: s, id, onDone, onSignedOut }: Ctx & { sponsor: AdminSponsorView }) {
  const initial = () => ({
    companyName: s.companyName,
    legalName: s.legalName ?? '',
    billingAddress: s.billingAddress ?? '',
    vatId: s.vatId ?? '',
    website: s.website ?? '',
    partnerId: s.partnerId ?? '',
    notes: s.notes ?? '',
  });
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FieldError>(null);
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- reset when the sponsor reloads
  useEffect(() => setF(initial()), [s]);
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const text = (k: 'companyName' | 'legalName' | 'vatId' | 'website' | 'partnerId', label: string, hint?: string) => (
    <TextField label={label} hint={hint} name={k} value={f[k]} invalid={!!err(k)} error={err(k)} onInput={(e) => set(k, inputValue(e))} />
  );

  return (
    <Block title="Details and notes" intro="Company and billing details are synced to Stripe when the sponsor has a Stripe customer.">
      <form
        class="flex flex-col gap-4"
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
          onDone('Details saved.');
        }}
      >
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          {text('companyName', 'Company name', 'As shown on the site and in emails.')}
          {text('legalName', 'Legal name (optional)', 'For invoices, when it differs.')}
          {text('vatId', 'VAT number (optional)')}
          {text('website', 'Website (optional)')}
        </div>
        <TextArea
          label="Billing address (optional)"
          rows={3}
          value={f.billingAddress}
          invalid={!!err('billingAddress')}
          error={err('billingAddress')}
          onInput={(e) => set('billingAddress', inputValue(e))}
        />
        {text('partnerId', 'Sanity partner id (optional)', 'The id of the partner document that shows them on the site.')}
        <TextArea label="Notes for the board (optional)" rows={3} value={f.notes} invalid={!!err('notes')} error={err('notes')} onInput={(e) => set('notes', inputValue(e))} />
        {error && !error.field && <Notice kind="error">{error.message}</Notice>}
        <SubmitButton busy={busy} size="sm" class="self-start">
          {busy ? 'Saving…' : 'Save details'}
        </SubmitButton>
      </form>
    </Block>
  );
}

function EndOutright({ sponsor: s, id, onDone, onSignedOut }: Ctx & { sponsor: AdminSponsorView }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof END_REASONS)[number]['value']>(s.status === 'pending' ? 'withdrawn' : 'terminated');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chosen = END_REASONS.find((r) => r.value === reason)!;
  if (!open)
    return (
      <Button variant="outline-black" class="self-start" onClick={() => setOpen(true)}>
        End the sponsorship outright
      </Button>
    );
  return (
    <Block
      title="End the sponsorship outright"
      intro="Without the sponsor’s confirmation: for a breach of the agreement, an invitation that never started, or a sponsorship that is complete. If the sponsor agreed to end it, propose an end instead, so it runs to the end of the paid period. Ending outright stops Stripe at once and is logged."
    >
      {!confirming ? (
        <div class="flex flex-col gap-4">
          <SelectField label="Why" name="reason" value={reason} onChange={(e) => setReason(inputValue(e) as typeof reason)}>
            {END_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </SelectField>
          <div class="flex flex-wrap gap-3">
            <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
              Continue
            </Button>
            <Button variant="outline-black" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div class="flex flex-col gap-4">
          <p class="m-0 text-lg font-bold">
            End {s.companyName} now? Reason: {chosen.label.toLowerCase()}. This cannot be undone here.
          </p>
          <div class="flex flex-wrap gap-3">
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                const { status, body } = await post(`${BASE}/${id}/end`, { reason });
                setBusy(false);
                if (status === 401) return onSignedOut();
                if (status !== 200) return setError(body.error ?? 'Could not end the sponsorship.');
                setOpen(false);
                setConfirming(false);
                onDone('Sponsorship ended.');
              }}
            >
              {busy ? 'Ending…' : 'Yes, end it now'}
            </Button>
            <Button variant="outline-black" size="sm" onClick={() => setConfirming(false)}>
              Go back
            </Button>
          </div>
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
    </Block>
  );
}

const payloadText = (p: Record<string, unknown>) =>
  Object.entries(p)
    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${String(v)}`)
    .join(', ');

function History({ events }: { events: SponsorEvent[] }) {
  return (
    <div class="flex flex-col gap-2">
      <h3 class="m-0 text-xl font-bold">History</h3>
      {events.length === 0 && <p class="m-0 text-base text-ink-2">Nothing yet.</p>}
      <ol class="m-0 p-0 list-none flex flex-col gap-1.5">
        {events.map((e) => {
          const extra = payloadText(e.payload);
          return (
            <li key={e.id} class="text-base break-words">
              <span class="text-grey-text">{shortDateTime(e.at)}</span> · {e.type.replace(/_/g, ' ')}
              {e.toStatus && (
                <>
                  : {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ''}
                  {STATUS_LABEL[e.toStatus]}
                </>
              )}
              {extra && <span class="text-grey-text"> ({extra})</span>}{' '}
              <span class="text-grey-text">
                ({e.actor.kind}
                {e.actor.kind === 'board' || e.actor.kind === 'sponsor' ? `, ${e.actor.id}` : ''})
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ adding */

/** Invites a company (they finish online) or imports a sponsorship paid directly to the association. */
function AddSponsor({ onAdded, onOpen, onSignedOut }: { onAdded: (id: string) => void; onOpen: (id: string) => void; onSignedOut: () => void }) {
  const blank = { companyName: '', contactName: '', contactEmail: '', message: '', notes: '' };
  const [f, setF] = useState({
    mode: 'invite' as 'invite' | 'import',
    ...blank,
    tier: 'supporter' as Tier,
    cycle: 'yearly' as Cycle,
    eventId: '',
    startedAt: today(),
    paidUntil: '',
    sendEmail: true,
  });
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<(FieldError & { sponsorId?: string }) | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);
  const imported = f.mode === 'import';
  const once = f.cycle === 'once';

  useEffect(() => {
    if (!once || meetups) return;
    void api<{ meetups: Meetup[] }>(`${BASE}/meetups`).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      setMeetups(status === 200 ? body.meetups : []);
      const first = status === 200 ? body.meetups.at(0) : undefined;
      if (first) setF((x) => (x.eventId ? x : { ...x, eventId: first.id }));
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load the meetups the first time one meetup is chosen
  }, [once]);

  const shown = ['companyName', 'contactName', 'contactEmail', 'eventId', 'startedAt', 'paidUntil', 'message', 'notes'];

  return (
    <section aria-labelledby="h-add-sponsor" class="border border-grey-frame rounded-card p-6 md:p-8 flex flex-col gap-5">
      <div class="flex flex-col gap-1">
        <h2 id="h-add-sponsor" class="m-0 text-2xl font-bold">
          Add a sponsor
        </h2>
        <p class="m-0 text-base text-ink-2">
          {imported
            ? 'For a sponsorship that already runs and was paid directly to the association. It is recorded as active and paid until the date you give. The contact can sign in and move to card or invoice later; nothing is charged before that date, so they never pay twice.'
            : 'For a company that agreed to sponsor. The contact gets an email to sign in, accept the sponsorship agreement and pay by card or invoice. The sponsorship starts with the first payment.'}
        </p>
      </div>
      <form
        class="flex flex-col gap-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          setDone(null);
          const payload = {
            mode: f.mode,
            companyName: f.companyName,
            contactName: f.contactName,
            contactEmail: f.contactEmail,
            tier: f.tier,
            cycle: f.cycle,
            eventId: once ? f.eventId : undefined,
            startedAt: imported ? f.startedAt : undefined,
            paidUntil: imported && !once ? f.paidUntil : undefined,
            message: f.message || undefined,
            notes: f.notes || undefined,
            sendEmail: f.sendEmail,
          };
          const { status, body } = await post<{ sponsor?: AdminSponsorView; emailed?: number; sponsorId?: string }>(BASE, payload);
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.sponsor) return setError({ field: body.field, message: body.error ?? 'Could not add the sponsor.', sponsorId: body.sponsorId });
          const what = imported ? 'added' : 'invited';
          setDone(
            `${body.sponsor.companyName} ${what}.${f.sendEmail ? (body.emailed ? ` Emailed to ${f.contactEmail}.` : ' The email was not sent: resend the invitation from the contact.') : ' No email sent.'}`,
          );
          onAdded(body.sponsor.id);
          setF((x) => ({ ...x, ...blank }));
        }}
      >
        <ChipGroup
          label="Add as"
          value={f.mode}
          onChange={(v) => set('mode', v)}
          options={[
            { value: 'invite', label: 'Invite (they pay online)' },
            { value: 'import', label: 'Import existing (paid directly)' },
          ]}
        />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <TextField
            label="Company"
            name="companyName"
            value={f.companyName}
            invalid={!!err('companyName')}
            error={err('companyName')}
            onInput={(e) => set('companyName', inputValue(e))}
          />
          <TextField
            label="Contact name"
            name="contactName"
            value={f.contactName}
            invalid={!!err('contactName')}
            error={err('contactName')}
            onInput={(e) => set('contactName', inputValue(e))}
          />
          <TextField
            label="Contact email"
            name="contactEmail"
            type="email"
            value={f.contactEmail}
            invalid={!!err('contactEmail')}
            error={err('contactEmail')}
            onInput={(e) => set('contactEmail', inputValue(e))}
          />
        </div>
        {error?.sponsorId && (
          <Button variant="link" size="sm" class="self-start" onClick={() => onOpen(error.sponsorId!)}>
            Open the sponsor that has this contact
          </Button>
        )}
        <ChipGroup label="Tier" value={f.tier} onChange={(v) => set('tier', v)} options={TIERS.map((t) => ({ value: t.key, label: t.name }))} />
        <ChipGroup
          label="Billing"
          value={f.cycle}
          onChange={(v) => set('cycle', v)}
          options={CYCLES.map((c) => ({ value: c.key, label: `${c.label}, ${feeLabel(f.tier, c.key)}` }))}
        />
        {once && (
          <SelectField
            label="Meetup"
            name="eventId"
            hint={meetups && !meetups.length ? 'No upcoming meetup is published yet.' : undefined}
            value={f.eventId}
            error={err('eventId')}
            onChange={(e) => set('eventId', inputValue(e))}
            class="max-w-xl"
          >
            {!meetups && <option value="">Loading the meetups…</option>}
            {meetups?.length === 0 && <option value="">No upcoming meetups</option>}
            {meetups?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}, {longDate(m.date)}
              </option>
            ))}
          </SelectField>
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
                hint={DATE.test(f.paidUntil) ? `Paid through ${longDate(lastDay(f.paidUntil))}.` : 'Their first payment online would be on this day.'}
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
        {imported && once && <p class="m-0 text-base text-ink-2">A one-meetup sponsorship is paid through the day of its meetup.</p>}
        <TextArea
          label="Message in the email (optional)"
          rows={2}
          value={f.message}
          invalid={!!err('message')}
          error={err('message')}
          onInput={(e) => set('message', inputValue(e))}
        />
        <TextArea label="Notes for the board (optional)" rows={2} value={f.notes} invalid={!!err('notes')} error={err('notes')} onInput={(e) => set('notes', inputValue(e))} />
        <Checkbox
          label={imported ? 'Email the contact that the sponsorship is now online' : 'Email the invitation to the contact'}
          checked={f.sendEmail}
          onChange={(e) => set('sendEmail', (e.target as HTMLInputElement).checked)}
        />
        {error && !shown.includes(error.field ?? '') && <Notice kind="error">{error.message}</Notice>}
        {done && <Notice kind="done">{done}</Notice>}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Saving…' : imported ? 'Add sponsor' : 'Send invitation'}
        </SubmitButton>
      </form>
    </section>
  );
}
