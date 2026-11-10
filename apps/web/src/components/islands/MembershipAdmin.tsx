/**
 * The membership admin area (/membership/admin) for the board: one shared
 * password (MEMBERSHIP_ADMIN_PASSWORD), enforced by the site on every deploy.
 * Members with search and filters, one member's details, terms, certificates
 * and audit log, confirming resignations, CSV import (dry run first) and export.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { TextArea, TextField } from '@zurichjs/design/islands/Field';
import { cx } from '@zurichjs/design/recipes';
import type { AdminMember } from '../../server/admin-views.ts';
import type { CertificateView } from '../../server/membership.ts';
import { SubmitButton } from './forms/shared.tsx';

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
  imported_manual: 'Paid by hand',
  resigning: 'Resigning',
  ended: 'Ended',
};
const FILTERS: { value: '' | Status; label: string }[] = [
  { value: '', label: 'All' },
  ...(Object.keys(STATUS_LABEL) as Status[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

const date = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '–';
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
/** paid_until is the first unpaid day: show the last paid one. */
const paidThrough = (iso: string | null) => (iso ? date(new Date(Date.parse(`${iso}T12:00:00Z`) - 86_400_000).toISOString()) : '–');

async function api<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T & { ok?: boolean; error?: string } }> {
  const res = await fetch(path, { credentials: 'same-origin', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  return { status: res.status, body: (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string } };
}

export default function MembershipAdmin() {
  const [state, setState] = useState<'loading' | 'unconfigured' | 'signed-out' | 'ready'>('loading');

  useEffect(() => {
    void api<{ configured: boolean; signedIn: boolean }>('/api/membership/admin/session').then(({ body }) =>
      setState(!body.configured ? 'unconfigured' : body.signedIn ? 'ready' : 'signed-out'),
    );
  }, []);

  if (state === 'loading') return <p class="m-0 text-[18px] text-ink-2">Loading…</p>;
  if (state === 'unconfigured')
    return (
      <p class="m-0 text-[18px] text-ink-2 max-w-[640px]">The admin area is not set up yet: MEMBERSHIP_ADMIN_PASSWORD (16+ characters) is missing in the site’s environment.</p>
    );
  if (state === 'signed-out') return <SignIn onSignedIn={() => setState('ready')} />;
  return <Admin onSignedOut={() => setState('signed-out')} />;
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
      <p class="m-0 text-[17px] text-ink-2">For the board. The password is the site’s admin password.</p>
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
  const [importing, setImporting] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await api('/api/membership/admin/logout', { method: 'POST', body: '{}' });
    onSignedOut();
  };

  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-3">
          <Button href="/api/membership/admin/export.csv" variant="black" size="sm" external={false}>
            Export CSV
          </Button>
          <Button variant="outline-black" size="sm" onClick={() => setImporting(!importing)} aria-expanded={importing}>
            Import members
          </Button>
        </div>
        <Button variant="outline-black" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>

      {importing && <Import onImported={() => void load()} />}

      {counts && (
        <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3">
          {[
            ['Members', counts.members],
            ['Active', counts.active],
            ['Paid by hand', counts.imported_manual],
            ['Payment failed', counts.past_due],
            ['Resigning', counts.resigning],
            ['Waiting for payment', counts.pending],
          ].map(([k, v]) => (
            <div key={k} class="bg-grey rounded-card px-5 py-4 flex flex-col gap-0.5">
              <dt class="text-[15px] text-grey-text">{k}</dt>
              <dd class="m-0 text-[28px] font-bold leading-none">{v ?? 0}</dd>
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
        <label class="flex flex-col gap-1.5 font-bold text-[16px]">
          Status
          <select
            class="rounded-[14px] border border-grey-line px-3.5 min-h-[52px] text-[17px] font-normal bg-white"
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
          </select>
        </label>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!d) return <p class="m-0 text-ink-2">{error || 'Loading the member…'}</p>;
  const m = d.member;
  const rows: [string, string][] = [
    ['Email', m.email],
    ['Membership', `${m.levelName}, ${m.cycle}`],
    ['Status', STATUS_LABEL[m.status] + (m.endedReason ? ` (${m.endedReason})` : '')],
    ['Category', m.category],
    ['Payment', m.paymentMode === 'manual' ? 'by hand' : 'automatic (Stripe)'],
    ['Paid through', paidThrough(m.paidUntil)],
    ['Joined', date(m.joinedAt)],
    ['Signed in before', m.hasAccount ? 'yes' : 'not yet'],
    ['Terms accepted', d.termsVersion ?? 'not yet'],
    ['Source', m.source === 'imported' ? 'imported' : 'joined online'],
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

      {m.status === 'resigning' && (
        <div class="flex flex-col gap-3">
          <p class="m-0 text-[17px]">This member resigned. Confirming ends the membership with the paid period (bylaws Art. 5); open dues hold it.</p>
          <Button
            variant="black"
            class="self-start"
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
            {busy ? 'Confirming…' : 'Confirm resignation'}
          </Button>
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
            {d.certificates.map((c) => (
              <li key={c.id} class="text-[16px]">
                <b>{c.number}</b>, {c.levelName}, {c.term}
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

function Import({ onImported }: { onImported: () => void }) {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    applied?: boolean;
    imported?: number;
    rows?: { line: number; name: string; email: string; level: string; cycle: string; paidUntil: string }[];
    problems?: { line: number; message: string }[];
    error?: string;
  } | null>(null);

  const run = async (apply: boolean) => {
    setBusy(true);
    const { body } = await api<NonNullable<typeof result>>('/api/membership/admin/import', { method: 'POST', body: JSON.stringify({ csv, apply }) });
    setBusy(false);
    setResult(body);
    if (apply && body.ok) onImported();
  };

  return (
    <section aria-labelledby="h-import" class="border border-grey-frame rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-4">
      <h2 id="h-import" class="m-0 text-[24px] font-bold">
        Import members
      </h2>
      <p class="m-0 text-[16px] text-ink-2">
        Members who joined on paper and pay by hand. Columns: kind, name, organisation, email, level, cycle, category, joined_at, paid_until, notes. Check first; nothing is written
        until you press Import.
      </p>
      <label class="flex flex-col gap-1.5 font-bold text-[16px]">
        CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          class="font-normal"
          onChange={async (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) setCsv(await f.text());
            setResult(null);
          }}
        />
      </label>
      <TextArea label="Or paste the CSV" name="csv" rows={5} value={csv} onInput={(e) => setCsv((e.target as HTMLTextAreaElement).value)} />
      <div class="flex flex-wrap gap-3">
        <Button variant="outline-black" disabled={busy || !csv.trim()} onClick={() => void run(false)}>
          Check
        </Button>
        <Button variant="black" disabled={busy || !result?.rows?.length || !!result.problems?.length || result.applied} onClick={() => void run(true)}>
          {result?.rows?.length ? `Import ${result.rows.length}` : 'Import'}
        </Button>
      </div>
      {result?.problems?.length ? (
        <div role="alert" class="bg-danger-soft text-danger rounded-card px-5 py-4 flex flex-col gap-1">
          <b>Nothing imported. Fix these rows:</b>
          {result.problems.map((p) => (
            <span key={`${p.line}${p.message}`}>
              Line {p.line}: {p.message}
            </span>
          ))}
        </div>
      ) : result?.error ? (
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 font-bold">
          {result.error}
        </p>
      ) : result?.rows ? (
        <div role="status" class={cx('rounded-card px-5 py-4 flex flex-col gap-1', result.applied ? 'bg-success-soft text-success' : 'bg-grey')}>
          <b>{result.applied ? `${result.imported} imported.` : `${result.rows.length} ready to import:`}</b>
          {result.rows.map((r) => (
            <span key={r.line}>
              {r.name} &lt;{r.email}&gt;, {r.level} {r.cycle}, paid until {r.paidUntil}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
