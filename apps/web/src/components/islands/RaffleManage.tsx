/**
 * An entrant's own link (/raffle/manage#t=…), without an account (POST /api/raffle/manage). The
 * token is in the fragment, so it never reaches a server log. Opening the page only shows the
 * entry; the email is confirmed when its owner clicks Confirm.
 */
import { useCallback, useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass } from '@zurichjs/design/recipes';

interface EntryView {
  name: string;
  email: string;
  claimCode: string;
  verified: boolean;
  prize: string;
  eventTitle: string;
  eventDateLabel: string;
  raffleId: string;
}
type Load = { kind: 'loading' } | { kind: 'invalid'; message: string } | { kind: 'ready'; entry: EntryView };

const body = 'm-0 text-body text-ink-2 text-pretty';

export default function RaffleManage({ contactEmail }: { contactEmail: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [token] = useState(() => (typeof location === 'undefined' ? '' : (new URLSearchParams(location.hash.slice(1)).get('t') ?? '')));

  const call = useCallback(
    async (action: 'view' | 'confirm') => {
      const res = await fetch('/api/raffle/manage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action }) }).catch(() => null);
      const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; entry?: EntryView }) : null;
      return res?.ok && data?.entry
        ? { ok: true as const, entry: data.entry }
        : { ok: false as const, status: res?.status ?? 0, error: data?.error ?? 'We couldn’t reach the site. Check your connection and try again.' };
    },
    [token],
  );

  useEffect(() => {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
    let current = true;
    void call('view').then((r) => {
      if (current) setLoad(r.ok ? { kind: 'ready', entry: r.entry } : { kind: 'invalid', message: r.error });
    });
    return () => {
      current = false;
    };
  }, [call]);

  if (load.kind === 'loading')
    return (
      <p role="status" class={body}>
        Loading your entry…
      </p>
    );
  if (load.kind === 'invalid')
    return (
      <div class="flex max-w-form flex-col gap-4">
        <Notice tone="danger" live title={load.message} />
        <p class={body}>Questions: {contactEmail}.</p>
      </div>
    );

  const e = load.entry;
  const confirm = async () => {
    setBusy(true);
    setError('');
    const r = await call('confirm');
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setLoad({ kind: 'ready', entry: r.entry });
    setDone('Thank you. Your email is confirmed.');
  };
  return (
    <section aria-labelledby="h-entry" class={`${cardClass('outline', 'lg')} max-w-form`}>
      <Heading id="h-entry" size="subsection">
        {e.prize}
      </Heading>
      <p class={body}>
        {e.eventTitle}, {e.eventDateLabel}. You entered as {e.name}.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-body">Your claim code</span>
        <Tag tone="black" size="md">
          {e.claimCode}
        </Tag>
      </div>
      <p class={body}>
        <a class="font-bold text-black" href={`/raffle?r=${encodeURIComponent(e.raffleId)}`}>
          See the raffle
        </a>
      </p>
      {done && <Notice tone="success" live title={done} />}
      {!e.verified ? (
        <>
          <p class={body}>Confirm that {e.email} is your email. Your entry counts either way.</p>
          {error && <Notice tone="danger" live title={error} />}
          <div>
            <Button variant="primary" disabled={busy} onClick={() => void confirm()}>
              {busy ? 'Confirming…' : 'Confirm my email'}
            </Button>
          </div>
        </>
      ) : (
        !done && <p class={body}>{e.email} is confirmed.</p>
      )}
    </section>
  );
}
