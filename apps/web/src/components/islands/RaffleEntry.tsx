/**
 * The raffle entry page (/raffle?r=…). Reads the raffle (GET /api/raffle/info) and enters it
 * (POST /api/raffle/entries): a name or nickname, an email and the rules box. Entering is free and
 * never depends on any other choice. The answer is the same whether the email entered before.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass } from '@zurichjs/design/recipes';
import type { PublicRaffleView } from '../../server/raffle.ts';
import { Honeypot, honeypotValue, useFocusWhen } from './forms/shared.tsx';

type Load = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error'; message: string } | { kind: 'ready'; raffle: PublicRaffleView };

const body = 'm-0 text-body text-ink-2 text-pretty';
const closing = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export default function RaffleEntry({ contactEmail }: { contactEmail: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });
  const [f, setF] = useState({ name: '', email: '', rules: false });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [sent, setSent] = useState(false);
  const sentRef = useFocusWhen<HTMLDivElement>(sent);
  const formRef = useRef<HTMLFormElement>(null);
  const id = typeof location === 'undefined' ? '' : (new URLSearchParams(location.search).get('r') ?? '');

  const fetchRaffle = async () => {
    setLoad({ kind: 'loading' });
    const res = await fetch(`/api/raffle/info?r=${encodeURIComponent(id)}`).catch(() => null);
    if (res?.status === 404) return setLoad({ kind: 'missing' });
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; raffle?: PublicRaffleView }) : null;
    if (!res?.ok || !data?.raffle) return setLoad({ kind: 'error', message: data?.error ?? 'We couldn’t load the raffle. Check your connection and try again.' });
    setLoad({ kind: 'ready', raffle: data.raffle });
  };
  useEffect(() => {
    void fetchRaffle();
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  const local: Record<string, string> = {
    ...(f.name.trim() ? {} : { name: 'Enter a name or nickname.' }),
    ...(isEmail(f.email) ? {} : { email: 'Enter an email like name@example.com.' }),
    ...(f.rules ? {} : { rules: 'Accept the raffle rules to enter.' }),
  };
  const errorOf = (k: string) => (tried ? local[k] : undefined) ?? (error?.field === k ? error.message : undefined);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    setTried(true);
    if (Object.keys(local).length) return;
    setBusy(true);
    setError(null);
    // The honeypot travels as `company`: a person never fills it in.
    const company = honeypotValue(formRef.current);
    const res = await fetch('/api/raffle/entries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raffleId: id, name: f.name, email: f.email, rules: f.rules, company }),
    }).catch(() => null);
    setBusy(false);
    const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string }) : null;
    if (!res?.ok || !data?.ok) return setError({ field: data?.field, message: data?.error ?? 'We couldn’t reach the site. Check your connection and try again.' });
    setSent(true);
  };

  if (load.kind === 'loading')
    return (
      <p role="status" class={body}>
        Loading the raffle…
      </p>
    );
  if (load.kind === 'missing') return <p class={`${body} max-w-form`}>There is no raffle at this address. Check the link, or ask us at {contactEmail}.</p>;
  if (load.kind === 'error')
    return (
      <div class="flex max-w-form flex-col gap-4">
        <Notice tone="danger" live title={load.message} />
        <div>
          <Button variant="secondary" onClick={() => void fetchRaffle()}>
            Try again
          </Button>
        </div>
      </div>
    );

  const r = load.raffle;
  return (
    <div class="grid grid-cols-auto-lg items-start gap-12">
      <section aria-labelledby="h-prize" class="flex flex-col gap-3.5">
        <Heading id="h-prize">
          {r.quantity > 1 ? `${r.quantity} × ` : ''}
          {r.prize}
        </Heading>
        <p class={body}>
          At {r.eventTitle}, {r.eventDateLabel}. Raffle supported by {r.sponsorName}.
        </p>
        {r.state === 'open' && r.closesAt && <p class={body}>Entries close on {closing(r.closesAt)}.</p>}
        {r.state === 'drawn' && r.winningCodes.length > 0 && (
          <div class="flex flex-wrap items-center gap-3">
            <span class="text-body">Winning claim code</span>
            {r.winningCodes.map((c) => (
              <Tag key={c} tone="black" size="md">
                {c}
              </Tag>
            ))}
          </div>
        )}
        {r.state === 'drawn' && <p class={body}>We emailed the winner. Your claim code is in your entry email.</p>}
        {r.state === 'closed' && <p class={body}>Entries are closed. The winning claim code shows here after the draw.</p>}
        {r.state === 'cancelled' && <p class={body}>This raffle was cancelled.</p>}
        {r.rulesUrl && (
          <a class="font-bold text-black" href={r.rulesUrl} target="_blank" rel="noopener">
            Raffle rules
          </a>
        )}
      </section>
      {r.state === 'open' &&
        (sent ? (
          <Notice tone="success" live as="h2" focusRef={sentRef} title="Check your email">
            <p class="m-0 text-body">If this is your first entry, we sent your claim code and a link to {f.email.trim().toLowerCase()}. Your entry counts from now.</p>
          </Notice>
        ) : (
          <form ref={formRef} onSubmit={submit} noValidate class={cardClass('outline', 'lg')}>
            <Heading as="h2" size="card">
              Enter the raffle
            </Heading>
            <TextField
              label="Name or nickname"
              autoComplete="nickname"
              value={f.name}
              invalid={!!errorOf('name')}
              error={errorOf('name')}
              onInput={(e) => setF({ ...f, name: (e.target as HTMLInputElement).value })}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={f.email}
              invalid={!!errorOf('email')}
              error={errorOf('email')}
              hint="Only to send your claim code and to contact you if you win."
              onInput={(e) => setF({ ...f, email: (e.target as HTMLInputElement).value })}
            />
            <Checkbox
              label={
                <>
                  I accept the{' '}
                  <a class="font-bold text-black" href={r.rulesUrl ?? '#'} target="_blank" rel="noopener">
                    raffle rules
                  </a>
                </>
              }
              checked={f.rules}
              onChange={(e) => setF({ ...f, rules: (e.target as HTMLInputElement).checked })}
            />
            {errorOf('rules') && <p class="m-0 text-compact text-danger">{errorOf('rules')}</p>}
            <Honeypot />
            {error && !['name', 'email', 'rules'].includes(error.field ?? '') && <Notice tone="danger" live title={error.message} />}
            <div>
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? 'Entering…' : 'Enter'}
              </Button>
            </div>
          </form>
        ))}
    </div>
  );
}
