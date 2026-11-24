/**
 * An entrant's own link (/raffle/manage#t=…), without an account (POST /api/raffle/manage). The
 * token is in the fragment, so it never reaches a server log. Opening the page only shows the
 * entry; the email is confirmed when its owner clicks Confirm.
 */
import { useEffect, useState } from 'preact/hooks';
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
  sharing: {
    sponsorName: string;
    purpose: string;
    sponsorPrivacyUrl: string;
    noticeUrl: string | null;
    given: boolean;
    counts: boolean;
    canGive: boolean;
  } | null;
}
type Load = { kind: 'loading' } | { kind: 'invalid'; message: string } | { kind: 'ready'; entry: EntryView };

const body = 'm-0 text-body text-ink-2 text-pretty';

export default function RaffleManage({ contactEmail }: { contactEmail: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const token = typeof location === 'undefined' ? '' : (new URLSearchParams(location.hash.slice(1)).get('t') ?? '');

  const call = async (action: 'view' | 'confirm' | 'share' | 'withdraw') => {
    const res = await fetch('/api/raffle/manage', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action }) }).catch(() => null);
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; entry?: EntryView }) : null;
    return res?.ok && data?.entry
      ? { ok: true as const, entry: data.entry }
      : { ok: false as const, status: res?.status ?? 0, error: data?.error ?? 'We couldn’t reach the site. Check your connection and try again.' };
  };

  useEffect(() => {
    void call('view').then((r) => setLoad(r.ok ? { kind: 'ready', entry: r.entry } : { kind: 'invalid', message: r.error }));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

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
  const run = async (action: 'confirm' | 'share' | 'withdraw', message: string) => {
    setBusy(true);
    setError('');
    setDone('');
    const r = await call(action);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setLoad({ kind: 'ready', entry: r.entry });
    setDone(message);
  };
  const confirm = () => run('confirm', 'Thank you. Your email is confirmed.');
  const s = e.sharing;
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
      {s && (
        <div class="flex flex-col gap-3">
          <Heading as="h3" size="card">
            Sharing with {s.sponsorName}
          </Heading>
          {error && e.verified && <Notice tone="danger" live title={error} />}
          {s.given ? (
            <>
              <p class={body}>
                You let {s.sponsorName} have your name and email to {s.purpose}. {s.counts ? 'It counts now.' : 'It counts once you confirm your email above.'} Withdrawing stops
                any later share; ask {s.sponsorName} to delete what they already have.
              </p>
              <div>
                <Button variant="secondary" disabled={busy} onClick={() => void run('withdraw', 'Done. We no longer share your contact.')}>
                  Withdraw my permission
                </Button>
              </div>
            </>
          ) : s.canGive ? (
            <>
              <p class={body}>
                Optional: let {s.sponsorName} have your name and email to {s.purpose}. It does not change your entry or the draw.{' '}
                <a class="font-bold text-black" href={s.sponsorPrivacyUrl} target="_blank" rel="noopener">
                  {s.sponsorName}’s privacy notice
                </a>
                {s.noticeUrl && (
                  <>
                    ,{' '}
                    <a class="font-bold text-black" href={s.noticeUrl} target="_blank" rel="noopener">
                      our raffle notice
                    </a>
                  </>
                )}
                .
              </p>
              <div>
                <Button variant="secondary" disabled={busy} onClick={() => void run('share', `Thank you. ${s.sponsorName} may get your contact.`)}>
                  Share my name and email
                </Button>
              </div>
            </>
          ) : (
            <p class={body}>We do not share your contact with {s.sponsorName}.</p>
          )}
        </div>
      )}
    </section>
  );
}
