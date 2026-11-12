/**
 * The admin area (/admin) for the board (owner, 11th November 2026): the password
 * first (ADMIN_PASSWORD, enforced by the site on every deploy), then a sub-navigation
 * of its sections. Memberships (/admin, /admin/memberships): members with search and
 * filters, one member's details, terms, certificates and audit log, confirming
 * resignations, inviting people who asked to join, adding members who paid manually
 * (cash/bank), and CSV export.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, SelectField, TextArea, TextField } from '@zurichjs/design/islands/Field';
import { badgeClass, cx, optionClass, optionInput } from '@zurichjs/design/recipes';
import type { AdminMember } from '../../server/admin-views.ts';
import { CYCLES, RESIGN_REASONS, TIERS, TIER_KEYS, feeLabel, manualTerm, type Cycle, type ResignReason, type TierKey } from '../../lib/membership.ts';
import { lastDay, longDate, shortDate, shortDateTime } from '../../server/dates.ts';
import type { CertificateView } from '../../server/membership.ts';
import { ChoiceGroup, SubmitButton } from './forms/shared.tsx';

type Status = AdminMember['status'];
interface Detail {
  member: AdminMember;
  termsVersion: string | null;
  certificates: CertificateView[];
  events: { id: string; type: string; fromStatus: Status | null; toStatus: Status | null; actor: { kind: string; id: string }; payload: Record<string, unknown>; at: string }[];
}

const STATUS_LABEL: Record<Status, string> = {
  pending: 'Waiting for first payment',
  active: 'Active',
  past_due: 'Payment failed',
  imported_manual: 'Paid manually (cash/bank)',
  resigning: 'Resigning',
  ended: 'Ended',
};
const FILTERS: { value: '' | Status; label: string }[] = [
  { value: '', label: 'All' },
  ...(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

const date = (iso: string | null) => (iso ? shortDate(iso) : '–');
const dateTime = shortDateTime;
/** paid_until is the first unpaid day: show the last paid one. */
const paidThrough = (iso: string | null) => (iso ? shortDate(lastDay(iso)) : '–');

async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T & { ok?: boolean; error?: string } }> {
  const res = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string } };
}

export type AdminSection = 'memberships';

const SECTIONS: { key: AdminSection; label: string; href: string }[] = [{ key: 'memberships', label: 'Memberships', href: '/admin/memberships' }];

export default function MembershipAdmin({ section = 'memberships' }: { section?: AdminSection }) {
  const [state, setState] = useState<'loading' | 'signed-out' | 'ready'>('loading');

  useEffect(() => {
    void api<{ signedIn: boolean }>('/api/membership/admin/session').then(({ body }) => setState(body.signedIn ? 'ready' : 'signed-out'));
  }, []);

  if (state === 'loading') return <p class="m-0 text-[18px] text-ink-2">Loading…</p>;
  if (state === 'signed-out') return <SignIn onSignedIn={() => setState('ready')} />;
  const signOut = async () => {
    await api('/api/membership/admin/logout', { method: 'POST', body: '{}' });
    setState('signed-out');
  };
  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Admin" class="flex gap-2 flex-wrap">
          {SECTIONS.map((s) => (
            <a
              key={s.key}
              href={s.href}
              aria-current={s.key === section ? 'page' : undefined}
              class={cx(
                'no-underline min-h-11 px-5 rounded-pill border border-black font-bold text-base inline-flex items-center',
                s.key === section ? 'bg-black text-white' : 'bg-white text-black hover:bg-grey',
              )}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <Button variant="outline-black" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      <Admin onSignedOut={() => setState('signed-out')} />
    </div>
  );
}

function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      class="bg-white border border-grey-frame rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5 max-w-[480px]"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        const { status, body } = await api('/api/membership/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
        setBusy(false);
        if (status === 200) return onSignedIn();
        setError(body.error ?? 'Sign-in failed.');
      }}
    >
      <h2 class="m-0 text-[28px] font-bold leading-[1.15]">Sign in</h2>
      <p class="m-0 text-[17px] text-ink-2">Enter the admin password.</p>
      <TextField
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
      />
      {error && (
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
          {error}
        </p>
      )}
      <SubmitButton busy={busy} class="self-start">
        {busy ? 'Signing in…' : 'Sign in'}
      </SubmitButton>
    </form>
  );
}

function Admin({ onSignedOut }: { onSignedOut: () => void }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [panel, setPanel] = useState<'invite' | 'add' | null>(null);

  const load = async (query = q, filter = status) => {
    const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(filter ? { status: filter } : {}) });
    const { status: code, body } = await api<{ members: AdminMember[]; counts: Record<string, number> | null }>(`/api/membership/admin/members?${params}`);
    if (code === 401) return onSignedOut();
    if (code !== 200) return setError(body.error ?? 'Could not load the members.');
    setError('');
    setMembers(body.members);
    if (body.counts) setCounts(body.counts);
  };

  useEffect(() => {
    void load();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap gap-3">
        <Button href="/api/membership/admin/export.csv" variant="black" size="sm" external={false}>
          Export CSV
        </Button>
        <Button variant="outline-black" size="sm" onClick={() => setPanel(panel === 'invite' ? null : 'invite')} aria-expanded={panel === 'invite'}>
          Invite someone to join
        </Button>
        <Button variant="outline-black" size="sm" onClick={() => setPanel(panel === 'add' ? null : 'add')} aria-expanded={panel === 'add'}>
          Add a member who paid manually (cash/bank)
        </Button>
      </div>

      {panel === 'invite' && (
        <InviteMember
          onInvited={(id) => {
            void load();
            setSelected(id);
          }}
          onSignedOut={onSignedOut}
        />
      )}
      {panel === 'add' && (
        <AddMember
          onAdded={(id) => {
            void load();
            setSelected(id);
          }}
          onSignedOut={onSignedOut}
        />
      )}

      {counts && (
        <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
          {[
            ['Members', counts.members],
            ['Active', counts.active],
            ['Paid manually (cash/bank)', counts.imported_manual],
            ['Payment failed', counts.past_due],
            ['Resigning', counts.resigning],
            ['Waiting for payment', counts.pending],
          ].map(([k, v]) => (
            // Numbers sit at the bottom of every tile, so they line up even when a label wraps.
            <div key={k} class="bg-grey rounded-card px-5 py-4 flex flex-col justify-between gap-2">
              <dt class="text-[15px] text-grey-text">{k}</dt>
              <dd class="m-0 text-[28px] font-bold leading-none tabular-nums">{v ?? 0}</dd>
            </div>
          ))}
        </dl>
      )}

      <form
        class="flex flex-wrap items-end gap-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <TextField
          label="Search"
          name="q"
          placeholder="Name, email or organisation"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          class="grow min-w-[min(100%,260px)]"
        />
        <SelectField
          label="Status"
          name="status"
          value={status}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value as '' | Status;
            setStatus(v);
            void load(q, v);
          }}
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </SelectField>
        <SubmitButton size="md">Search</SubmitButton>
      </form>

      {error && (
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
          {error}
        </p>
      )}

      {members && (
        // Phones: one card per member (a six-column table does not fit).
        <ul class="md:hidden m-0 p-0 list-none flex flex-col gap-3" aria-label="Members">
          {members.length === 0 && <li class="text-ink-2">No members match.</li>}
          {members.map((m) => (
            <li key={m.id} class={cx('border border-grey-frame rounded-card px-5 py-4 flex flex-col gap-1', selected === m.id && 'bg-grey-soft')}>
              <button
                type="button"
                class="bg-transparent border-0 p-0 font-bold text-left text-[17px] underline underline-offset-3 cursor-pointer self-start"
                onClick={() => setSelected(m.id)}
                aria-expanded={selected === m.id}
              >
                {m.name}
              </button>
              {m.organisationName && <span class="text-[14px] text-grey-text">{m.organisationName}</span>}
              <span class="text-[15px] break-all">{m.email}</span>
              <span class="text-[15px]">
                {m.levelName}, {m.cycle} · {STATUS_LABEL[m.status]}
              </span>
              <span class="text-[14px] text-grey-text">
                Paid through {paidThrough(m.paidUntil)} · joined {date(m.joinedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {members && (
        <div class="hidden md:block overflow-x-auto border border-grey-frame rounded-card">
          <table class="w-full border-collapse text-[16px]">
            <caption class="sr-only">Members</caption>
            <thead>
              <tr class="text-left text-grey-text text-[14px]">
                {['Name', 'Email', 'Membership', 'Status', 'Paid through', 'Joined'].map((h) => (
                  <th key={h} scope="col" class="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} class="px-4 py-6 text-ink-2">
                    No members match.
                  </td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.id} class={cx('border-t border-grey-frame', selected === m.id && 'bg-grey-soft')}>
                  <td class="px-4 py-3">
                    <button
                      type="button"
                      class="bg-transparent border-0 p-0 font-bold text-left underline underline-offset-3 cursor-pointer"
                      onClick={() => setSelected(m.id)}
                      aria-expanded={selected === m.id}
                    >
                      {m.name}
                    </button>
                    {m.organisationName && <div class="text-[14px] text-grey-text">{m.organisationName}</div>}
                  </td>
                  <td class="px-4 py-3">{m.email}</td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    {m.levelName}, {m.cycle}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{STATUS_LABEL[m.status]}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{paidThrough(m.paidUntil)}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{date(m.joinedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <MemberDetail id={selected} onClose={() => setSelected(null)} onChanged={() => void load()} onSignedOut={onSignedOut} />}
    </div>
  );
}

function MemberDetail({ id, onClose, onChanged, onSignedOut }: { id: string; onClose: () => void; onChanged: () => void; onSignedOut: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { status, body } = await api<Detail>(`/api/membership/admin/members/${id}`);
    if (status === 401) return onSignedOut();
    if (status !== 200) return setError(body.error ?? 'Could not load the member.');
    setD(body);
  };
  useEffect(() => {
    setD(null);
    setNotice('');
    setError('');
    void load();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reload when the member changes
  }, [id]);

  if (!d) return <p class="m-0 text-ink-2">{error || 'Loading the member…'}</p>;
  const m = d.member;
  const rows: [string, string][] = [
    ['Email', m.email],
    ['Membership', `${m.levelName}, ${m.cycle}`],
    ['Status', STATUS_LABEL[m.status] + (m.endedReason ? ` (${m.endedReason})` : '')],
    ['Category', m.category],
    ['Payment', m.paymentMode === 'manual' ? 'manually (cash/bank)' : 'automatic (Stripe)'],
    ['Paid through', paidThrough(m.paidUntil)],
    ['Joined', date(m.joinedAt)],
    ['Signed in before', m.hasAccount ? 'yes' : 'not yet'],
    ['Terms accepted', d.termsVersion ?? 'not yet'],
    ['Source', m.source === 'imported' ? 'imported' : m.source === 'invited' ? 'invited by the board' : 'joined online'],
  ];

  return (
    <section aria-labelledby="h-member" class="bg-grey rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <h2 id="h-member" class="m-0 text-[clamp(24px,2.4vw,32px)] leading-[1.15] font-bold">
          {m.organisationName ? `${m.organisationName}, ${m.name}` : m.name}
        </h2>
        <Button variant="white" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
      <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k} class="flex flex-col gap-0.5">
            <dt class="text-[14px] text-grey-text">{k}</dt>
            <dd class="m-0 text-[17px] font-bold break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {(m.stripeCustomerId || m.stripeSubscriptionId) && (
        <p class="m-0 text-[15px] text-ink-2">
          Stripe:{' '}
          {m.stripeCustomerId && (
            <a href={`https://dashboard.stripe.com/customers/${m.stripeCustomerId}`} target="_blank" rel="noopener" class="font-bold text-black">
              {m.stripeCustomerId}
            </a>
          )}
          {m.stripeSubscriptionId && <> · {m.stripeSubscriptionId}</>}
        </p>
      )}
      {m.notes && <p class="m-0 text-[16px] bg-white rounded-card px-5 py-4">{m.notes}</p>}

      {['active', 'past_due', 'imported_manual'].includes(m.status) && (
        <RecordResignation
          id={id}
          name={m.name}
          onDone={(text) => {
            setNotice(text);
            onChanged();
            void load();
          }}
          onError={setError}
          onSignedOut={onSignedOut}
        />
      )}
      {m.status === 'resigning' && (
        <div class="flex flex-col gap-3">
          <p class="m-0 text-lg">
            {m.resignationConfirmedAt
              ? `Resignation confirmed on ${dateTime(m.resignationConfirmedAt)}${m.resignedAt ? ` (requested ${dateTime(m.resignedAt)})` : ''}. The membership ends with the paid period.`
              : `Resignation requested${m.resignedAt ? ` on ${dateTime(m.resignedAt)}` : ''}, waiting for the board. Confirming ends the membership with the paid period (bylaws Art. 5); open dues hold it.`}
          </p>
          <div class="flex flex-wrap gap-3">
            {!m.resignationConfirmedAt && (
              <Button
                variant="black"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  const { status, body } = await api<{ lastPaidDay: string | null; emailFailed: boolean }>(`/api/membership/admin/members/${id}/confirm-resignation`, {
                    method: 'POST',
                    body: '{}',
                  });
                  setBusy(false);
                  if (status === 401) return onSignedOut();
                  if (status !== 200) return setError(body.error ?? 'Could not confirm.');
                  setNotice(
                    `Confirmed.${body.lastPaidDay ? ` The membership ends on ${body.lastPaidDay}.` : ''}${body.emailFailed ? ' The email to the member failed: write to them by hand.' : ' The member was emailed.'}`,
                  );
                  onChanged();
                  void load();
                }}
              >
                {busy ? 'Working…' : 'Confirm resignation'}
              </Button>
            )}
            <Button
              variant="outline-black"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                const { status, body } = await api<{ emailFailed: boolean }>(`/api/membership/admin/members/${id}/undo-resignation`, { method: 'POST', body: '{}' });
                setBusy(false);
                if (status === 401) return onSignedOut();
                if (status !== 200) return setError(body.error ?? 'Could not undo the resignation.');
                setNotice(
                  `Resignation undone. The membership continues.${body.emailFailed ? ' The email to the member failed: write to them by hand.' : ' The member was emailed.'}`,
                );
                onChanged();
                void load();
              }}
            >
              Undo resignation
            </Button>
          </div>
        </div>
      )}
      {notice && (
        <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 text-[17px] font-bold">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
          {error}
        </p>
      )}

      <div class="flex flex-col gap-2">
        <h3 class="m-0 text-[20px] font-bold">Certificates</h3>
        {d.certificates.length ? (
          <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
            {d.certificates.map((c, i) => (
              <li key={c.id} class="flex flex-wrap items-center gap-2 text-base">
                <span>
                  <b>{c.number}</b>, {c.levelName}, {c.term}
                </span>
                {i === 0 && <span class={badgeClass('dark')}>Latest</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p class="m-0 text-[16px] text-ink-2">None yet.</p>
        )}
      </div>

      <div class="flex flex-col gap-2">
        <h3 class="m-0 text-[20px] font-bold">History</h3>
        <ol class="m-0 p-0 list-none flex flex-col gap-1.5">
          {d.events.map((e) => (
            <li key={e.id} class="text-[15px]">
              <span class="text-grey-text">{dateTime(e.at)}</span> · {e.type.replace(/_/g, ' ')}
              {e.toStatus && (
                <>
                  : {e.fromStatus ? `${STATUS_LABEL[e.fromStatus]} → ` : ''}
                  {STATUS_LABEL[e.toStatus]}
                </>
              )}{' '}
              <span class="text-grey-text">
                ({e.actor.kind}
                {e.actor.kind === 'board' ? `, ${e.actor.id}` : ''})
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Invites someone who asked to join: the level and cycle they asked for, and an email to finish joining online with automatic payment. */
function InviteMember({ onInvited, onSignedOut }: { onInvited: (id: string) => void; onSignedOut: () => void }) {
  const [f, setF] = useState({
    kind: 'person' as 'person' | 'organisation',
    name: '',
    organisationName: '',
    email: '',
    level: 'supporter' as TierKey,
    cycle: 'yearly' as Cycle,
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <section aria-labelledby="h-invite" class="border border-grey-frame rounded-card p-6 md:p-8 flex flex-col gap-5">
      <div class="flex flex-col gap-1">
        <h2 id="h-invite" class="m-0 text-2xl font-bold">
          Invite someone to join
        </h2>
        <p class="m-0 text-base text-ink-2">
          For someone who asked to become a member. Choose what they asked for; they get an email to sign in, accept the membership terms and pay with Stripe, renewing
          automatically. They become a member with the first payment.
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
          const { status, body } = await api<{ member?: AdminMember; result?: 'invited' | 'reinvited'; emailed?: boolean; field?: string }>('/api/membership/admin/invite', {
            method: 'POST',
            body: JSON.stringify(f),
          });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.member) return setError({ field: body.field, message: body.error ?? 'Could not send the invitation.' });
          const what = body.result === 'reinvited' ? 'invited again' : 'invited';
          setDone(
            body.emailed
              ? `${body.member.name} ${what}: emailed to ${body.member.email} to join as ${body.member.levelName}.`
              : `${body.member.name} ${what}, but the email was not sent. Try again later.`,
          );
          onInvited(body.member.id);
          setF((x) => ({ ...x, name: '', organisationName: '', email: '', notes: '' }));
        }}
      >
        <ChipGroup
          label="Member"
          value={f.kind}
          onChange={(v) => set('kind', v)}
          options={[
            { value: 'person', label: 'A person' },
            { value: 'organisation', label: 'An organisation' },
          ]}
        />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <TextField
            label={f.kind === 'organisation' ? 'Name of the person signing for it' : 'Name'}
            name="name"
            value={f.name}
            invalid={!!err('name')}
            error={err('name')}
            onInput={(e) => set('name', (e.target as HTMLInputElement).value)}
          />
          {f.kind === 'organisation' && (
            <TextField
              label="Organisation"
              name="organisationName"
              value={f.organisationName}
              invalid={!!err('organisationName')}
              error={err('organisationName')}
              onInput={(e) => set('organisationName', (e.target as HTMLInputElement).value)}
            />
          )}
          <TextField
            label="Email"
            name="email"
            type="email"
            value={f.email}
            invalid={!!err('email')}
            error={err('email')}
            onInput={(e) => set('email', (e.target as HTMLInputElement).value)}
          />
        </div>
        <ChipGroup label="Membership" value={f.level} onChange={(v) => set('level', v)} options={TIER_KEYS.map((k) => ({ value: k, label: TIERS[k].name }))} />
        <ChipGroup
          label="Billing"
          value={f.cycle}
          onChange={(v) => set('cycle', v)}
          options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${feeLabel(TIERS[f.level], c.value)}` }))}
        />
        <TextArea label="Notes for the board (optional)" name="notes" rows={2} value={f.notes} onInput={(e) => set('notes', (e.target as HTMLTextAreaElement).value)} />
        {error && !error.field && (
          <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 font-bold">
            {error.message}
          </p>
        )}
        {done && (
          <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 font-bold break-words">
            {done}
          </p>
        )}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Sending…' : 'Send invitation'}
        </SubmitButton>
      </form>
    </section>
  );
}

/** Adds a member who paid manually (cash/bank): recorded, certificate issued, optionally emailed to set up automatic payment. */
function AddMember({ onAdded, onSignedOut }: { onAdded: (id: string) => void; onSignedOut: () => void }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [f, setF] = useState({
    kind: 'person' as 'person' | 'organisation',
    name: '',
    organisationName: '',
    email: '',
    level: 'supporter' as TierKey,
    cycle: 'yearly' as Cycle,
    startMonth: thisMonth,
    notes: '',
    sendEmail: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const term = /^\d{4}-\d{2}$/.test(f.startMonth) ? manualTerm(f.startMonth, f.cycle) : null;
  const err = (field: string) => (error?.field === field ? error.message : undefined);

  return (
    <section aria-labelledby="h-add" class="border border-grey-frame rounded-card p-6 md:p-8 flex flex-col gap-5">
      <div class="flex flex-col gap-1">
        <h2 id="h-add" class="m-0 text-2xl font-bold">
          Add a member who paid manually (cash/bank)
        </h2>
        <p class="m-0 text-base text-ink-2">
          For someone who paid in cash or by bank transfer. They are recorded as paid manually until their term ends, get a certificate for it, and can set up automatic payment
          with Stripe; nothing is charged before the term ends.
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
          const { status, body } = await api<{ member?: AdminMember; certificate?: { number: string }; emailed?: boolean; field?: string }>('/api/membership/admin/members', {
            method: 'POST',
            body: JSON.stringify(f),
          });
          setBusy(false);
          if (status === 401) return onSignedOut();
          if (status !== 200 || !body.member) return setError({ field: body.field, message: body.error ?? 'Could not add the member.' });
          setDone(`${body.member.name} added, certificate ${body.certificate?.number}.${body.emailed ? ` Emailed to ${body.member.email} to set up automatic payment.` : ''}`);
          onAdded(body.member.id);
          setF((x) => ({ ...x, name: '', organisationName: '', email: '', notes: '' }));
        }}
      >
        <ChipGroup
          label="Member"
          value={f.kind}
          onChange={(v) => set('kind', v)}
          options={[
            { value: 'person', label: 'A person' },
            { value: 'organisation', label: 'An organisation' },
          ]}
        />
        <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
          <TextField
            label={f.kind === 'organisation' ? 'Name of the person signing for it' : 'Name'}
            name="name"
            value={f.name}
            invalid={!!err('name')}
            error={err('name')}
            onInput={(e) => set('name', (e.target as HTMLInputElement).value)}
          />
          {f.kind === 'organisation' && (
            <TextField
              label="Organisation"
              name="organisationName"
              value={f.organisationName}
              invalid={!!err('organisationName')}
              error={err('organisationName')}
              onInput={(e) => set('organisationName', (e.target as HTMLInputElement).value)}
            />
          )}
          <TextField
            label="Email"
            name="email"
            type="email"
            value={f.email}
            invalid={!!err('email')}
            error={err('email')}
            onInput={(e) => set('email', (e.target as HTMLInputElement).value)}
          />
        </div>
        <ChipGroup label="Membership" value={f.level} onChange={(v) => set('level', v)} options={TIER_KEYS.map((k) => ({ value: k, label: TIERS[k].name }))} />
        <ChipGroup
          label="Billing"
          value={f.cycle}
          onChange={(v) => set('cycle', v)}
          options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${feeLabel(TIERS[f.level], c.value)}` }))}
        />
        <TextField
          label="Paid term started"
          hint={term ? `Paid until ${longDate(lastDay(term.end))}. Their first automatic payment would be on ${longDate(term.end)}.` : 'The month their paid term began.'}
          name="startMonth"
          type="month"
          value={f.startMonth}
          invalid={!!err('startMonth')}
          error={err('startMonth')}
          onInput={(e) => set('startMonth', (e.target as HTMLInputElement).value)}
          class="max-w-sm"
        />
        <TextArea label="Notes for the board (optional)" name="notes" rows={2} value={f.notes} onInput={(e) => set('notes', (e.target as HTMLTextAreaElement).value)} />
        <Checkbox
          label="Email them their certificate and the link to set up automatic payment"
          checked={f.sendEmail}
          onChange={(e) => set('sendEmail', (e.target as HTMLInputElement).checked)}
        />
        {error && !error.field && (
          <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 font-bold">
            {error.message}
          </p>
        )}
        {done && (
          <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 font-bold">
            {done}
          </p>
        )}
        <SubmitButton busy={busy} class="self-start">
          {busy ? 'Adding…' : 'Add member'}
        </SubmitButton>
      </form>
    </section>
  );
}

/**
 * For a member who resigned to the board directly (email, in person): recorded like a resignation
 * on the account page, so renewal stops and the member gets their written copy (owner, 11th November 2026).
 */
function RecordResignation({
  id,
  name,
  onDone,
  onError,
  onSignedOut,
}: {
  id: string;
  name: string;
  onDone: (notice: string) => void;
  onError: (error: string) => void;
  onSignedOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<ResignReason[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <Button variant="outline-black" class="self-start" onClick={() => setOpen(true)}>
        Record a resignation
      </Button>
    );
  return (
    <div class="border border-grey-frame rounded-card bg-white p-5 flex flex-col gap-4">
      <p class="m-0 text-base">
        For when {name} resigned to the board directly. Renewal stops at once, {name} gets the written copy by email, and the resignation then waits for confirmation as usual.
      </p>
      <ChoiceGroup legend="Reasons (optional)" class="flex flex-col gap-2">
        {RESIGN_REASONS.map((r) => (
          <label key={r.value} class={optionClass(false, 'self-start')}>
            <input
              type="checkbox"
              value={r.value}
              checked={reasons.includes(r.value)}
              onChange={() => setReasons((rs) => (rs.includes(r.value) ? rs.filter((x) => x !== r.value) : [...rs, r.value]))}
              class={optionInput}
            />
            {r.label}
          </label>
        ))}
      </ChoiceGroup>
      <TextArea label="What they said (optional)" rows={3} value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} />
      <div class="flex flex-wrap gap-3">
        <Button
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const { status, body } = await api(`/api/membership/admin/members/${id}/resign`, { method: 'POST', body: JSON.stringify({ reasons, note }) });
            setBusy(false);
            if (status === 401) return onSignedOut();
            if (status !== 200) return onError(body.error ?? 'Could not record the resignation.');
            setOpen(false);
            onDone(`Resignation recorded. Renewal is stopped and ${name} was emailed a copy; confirm it below when the board agrees.`);
          }}
        >
          {busy ? 'Recording…' : 'Record resignation'}
        </Button>
        <Button variant="outline-black" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
