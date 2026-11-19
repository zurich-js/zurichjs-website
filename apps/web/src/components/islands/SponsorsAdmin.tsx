/**
 * The admin area's Sponsors section (/admin/sponsors), inside MembershipAdmin's sign-in and
 * sub-navigation. Three views that replace each other, each with its own address so a reload,
 * the back button or a link from Slack opens the same thing:
 *   /admin/sponsors                   the list: what needs action, status filters, search
 *   /admin/sponsors?id=<uuid>         one sponsor (sponsors-admin/SponsorDetail.tsx)
 *   /admin/sponsors?add=invite|import adding a sponsor (sponsors-admin/AddSponsor.tsx)
 * Built for a board member on a phone right after a call. API: /api/membership/admin/sponsors.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { ChipGroup, TextField } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { cardClass } from '@zurichjs/design/recipes';
import type { Status } from '@zurichjs/sponsorship';
import { shortDate } from '../../server/dates.ts';
import { api } from './admin-api.ts';
import { TextButton } from './forms/shared.tsx';
import { AddSponsor } from './sponsors-admin/AddSponsor.tsx';
import { SponsorDetail } from './sponsors-admin/SponsorDetail.tsx';
import { AttentionBadge, BASE, Notice, PAGE, STATUSES, STATUS_LABEL, StatusBadge, focusHeading, follow, inputValue, type Row } from './sponsors-admin/shared.tsx';

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'add'; mode: 'invite' | 'import' };

const hrefFor = (v: View) => (v.kind === 'detail' ? `${PAGE}?id=${encodeURIComponent(v.id)}` : v.kind === 'add' ? `${PAGE}?add=${v.mode}` : PAGE);

function readView(): View {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('id');
  if (id) return { kind: 'detail', id };
  const add = p.get('add');
  if (add === 'invite' || add === 'import') return { kind: 'add', mode: add };
  return { kind: 'list' };
}

/** Attention first, then newest (the API answers newest first). */
/** The status badge already says "Payment overdue": the matching attention badge would repeat it. */
const flags = (s: Row) => s.attention.filter((f) => !(f === 'payment_overdue' && s.status === 'past_due'));

const sortRows = (rows: Row[]) => [...rows].sort((a, b) => Number(b.attention.length > 0) - Number(a.attention.length > 0) || b.createdAt.localeCompare(a.createdAt));

export function SponsorsAdmin({ onSignedOut }: { onSignedOut: () => void }) {
  const [view, setView] = useState<View>(() => readView());
  // Focus moves to the new heading only after the reader changed the view, not on the first load.
  const [moved, setMoved] = useState(false);
  const [flash, setFlash] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | Status>('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = async () => {
    const n = ++seq.current;
    const params = new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(status ? { status } : {}) });
    const { status: code, body } = await api<{ sponsors: Row[]; counts: Record<Status, number> | null; attentionLabels: Record<string, string> }>(`${BASE}?${params}`);
    if (n !== seq.current) return;
    if (code === 401) return onSignedOut();
    if (code !== 200) return setError(body.error ?? 'Could not load the sponsors.');
    setError('');
    setRows(sortRows(body.sponsors));
    setLabels(body.attentionLabels ?? {});
    if (body.counts) setCounts(body.counts);
  };

  // Search as you type, a moment after the last key.
  useEffect(() => {
    const t = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(t);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- reload when the search or the filter changes
  }, [q, status]);

  useEffect(() => {
    const onPop = () => {
      setFlash('');
      setMoved(true);
      setView(readView());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const go = (v: View, notice = '') => {
    window.history.pushState(null, '', hrefFor(v));
    setFlash(notice);
    setMoved(true);
    setView(v);
  };
  const back = () => go({ kind: 'list' });

  if (view.kind === 'detail')
    return <SponsorDetail key={view.id} id={view.id} focus={moved} flash={flash} labels={labels} onBack={back} onChanged={() => void load()} onSignedOut={onSignedOut} />;
  if (view.kind === 'add')
    return (
      <AddSponsor
        mode={view.mode}
        focus={moved}
        onMode={(mode) => {
          window.history.replaceState(null, '', hrefFor({ kind: 'add', mode }));
          setView({ kind: 'add', mode });
        }}
        onBack={back}
        onAdded={(id, notice) => {
          void load();
          go({ kind: 'detail', id }, notice);
        }}
        onOpen={(id) => go({ kind: 'detail', id })}
        onSignedOut={onSignedOut}
      />
    );
  return (
    <SponsorList
      focus={moved}
      q={q}
      onQ={setQ}
      status={status}
      onStatus={setStatus}
      rows={rows}
      counts={counts}
      labels={labels}
      error={error}
      onOpen={(id) => go({ kind: 'detail', id })}
      onAdd={(mode) => go({ kind: 'add', mode })}
    />
  );
}

/* ------------------------------------------------------------------ the list */

function SponsorList({
  focus,
  q,
  onQ,
  status,
  onStatus,
  rows,
  counts,
  labels,
  error,
  onOpen,
  onAdd,
}: {
  focus: boolean;
  q: string;
  onQ: (q: string) => void;
  status: '' | Status;
  onStatus: (s: '' | Status) => void;
  rows: Row[] | null;
  counts: Record<Status, number> | null;
  labels: Record<string, string>;
  error: string;
  onOpen: (id: string) => void;
  onAdd: (mode: 'invite' | 'import') => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focus) focusHeading(heading.current);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- on arrival only
  }, []);

  const total = counts ? STATUSES.reduce((n, s) => n + counts[s], 0) : null;
  const filtered = !!(q.trim() || status);
  const needs = !filtered && rows ? rows.flatMap((s) => s.attention.map((flag) => ({ s, flag }))) : [];
  const href = (id: string) => `${PAGE}?id=${encodeURIComponent(id)}`;

  return (
    <section aria-labelledby="h-sponsors" class="flex flex-col gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <Heading id="h-sponsors" size="subsection" focus={heading} class="scroll-mt-6">
          Sponsors
        </Heading>
        <div class="flex w-full flex-wrap gap-3 md:w-auto">
          <Button variant="primary" grow href={`${PAGE}?add=invite`} external={false} onClick={(e) => follow(e, () => onAdd('invite'))}>
            Invite a sponsor
          </Button>
          <Button variant="secondary" grow href={`${PAGE}?add=import`} external={false} onClick={(e) => follow(e, () => onAdd('import'))}>
            Import a running sponsorship
          </Button>
        </div>
      </div>

      {needs.length > 0 && (
        <section aria-labelledby="h-needs" class={cardClass('outline', 'lg')}>
          <Heading as="h3" size="card" id="h-needs">
            Needs action
          </Heading>
          <ul class="m-0 flex list-none flex-col gap-3 p-0">
            {needs.map(({ s, flag }) => (
              <li key={`${s.id}-${flag}`} class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <TextButton size="body" href={href(s.id)} external={false} onClick={(e) => follow(e, () => onOpen(s.id))}>
                  {s.companyName}
                </TextButton>
                <AttentionBadge flag={flag} labels={labels} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <form class="flex flex-col gap-4" role="search" onSubmit={(e) => e.preventDefault()}>
        <TextField label="Search" name="q" type="search" placeholder="Company or legal name" value={q} onInput={(e) => onQ(inputValue(e))} class="max-w-form" />
        <ChipGroup
          label="Status"
          value={status}
          onChange={onStatus}
          options={[
            { value: '' as const, label: total === null ? 'All' : `All (${total})` },
            ...STATUSES.map((s) => ({ value: s, label: counts ? `${STATUS_LABEL[s]} (${counts[s]})` : STATUS_LABEL[s] })),
          ]}
        />
      </form>

      {error && <Notice kind="error">{error}</Notice>}
      {!rows && !error && <p class="m-0 text-body text-ink-2">Loading the sponsors…</p>}

      {rows && (
        // Phones: one card per sponsor (a five-column table does not fit).
        <ul class="m-0 flex list-none flex-col gap-3 p-0 md:hidden" aria-label="Sponsors">
          {rows.length === 0 && <li class="text-ink-2">No sponsors match.</li>}
          {rows.map((s) => (
            <li key={s.id} class={cardClass('outline', 'sm')}>
              <TextButton size="body" href={href(s.id)} external={false} class="self-start break-words" onClick={(e) => follow(e, () => onOpen(s.id))}>
                {s.companyName}
              </TextButton>
              <span class="flex flex-wrap gap-2">
                <StatusBadge status={s.status} />
                {flags(s).map((flag) => (
                  <AttentionBadge key={flag} flag={flag} labels={labels} />
                ))}
              </span>
              <span class="text-meta">
                {s.tierName}, {s.feeLabel}
              </span>
              <span class="text-meta text-grey-text">
                {s.paymentLabel}. {s.status === 'ended' ? 'Ended' : s.paidThrough ? `Paid through ${shortDate(s.paidThrough)}` : 'Not paid yet'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rows && (
        <div class="hidden overflow-x-auto rounded-card border border-grey-frame md:block">
          <table class="w-full border-collapse text-compact">
            <caption class="sr-only">Sponsors</caption>
            <thead>
              <tr class="text-left text-meta text-grey-text">
                {['Company', 'Plan', 'Payment', 'Status', 'Paid through'].map((h) => (
                  <th key={h} scope="col" class="px-4 py-3 font-bold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} class="px-4 py-6 text-ink-2">
                    No sponsors match.
                  </td>
                </tr>
              )}
              {rows.map((s) => (
                <tr key={s.id} class="border-t border-grey-frame align-top">
                  <td class="px-4 py-3">
                    <div class="flex flex-col items-start gap-1.5">
                      <TextButton href={href(s.id)} external={false} onClick={(e) => follow(e, () => onOpen(s.id))}>
                        {s.companyName}
                      </TextButton>
                      {flags(s).length > 0 && (
                        <span class="flex flex-wrap gap-1.5">
                          {flags(s).map((flag) => (
                            <AttentionBadge key={flag} flag={flag} labels={labels} />
                          ))}
                        </span>
                      )}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    {s.tierName}
                    <span class="block text-meta text-grey-text">{s.feeLabel}</span>
                  </td>
                  <td class="px-4 py-3">{s.paymentLabel}</td>
                  <td class="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{s.status === 'ended' ? 'Ended' : s.paidThrough ? shortDate(s.paidThrough) : 'Not paid yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
