/**
 * The member area (/membership/account, docs/v2/MEMBERSHIP.md). Sign in with
 * an emailed link (Better Auth; the session is an httpOnly cookie, so no token
 * ever reaches this script), then join, or manage the membership: status,
 * certificates, the subscription (Stripe portal), switching from
 * paying by hand to automatic payment, and resigning through the board.
 *
 * Without member accounts configured, the API answers 503 and the page says
 * accounts are not available yet.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { badgeClass } from '@zurichjs/design/recipes';
import { TextField, isEmail } from '@zurichjs/design/islands/Field';
import { setSignedIn } from '@zurichjs/design/session';
import { lastDay, longDate } from '../../server/dates.ts';
import type { CertificateView, MemberView } from '../../server/membership.ts';
import { SubmitButton, useFocusWhen } from './forms/shared.tsx';
import MemberJoin, { TermsCheckbox, readChoice, startCheckout } from './MemberJoin.tsx';

interface Props {
  contactEmail: string;
}

interface Me {
  email: string;
  member: MemberView | null;
  certificates: CertificateView[];
  canJoin: boolean;
  acceptedCurrentTerms: boolean;
}

type View =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'sent'; email: string }
  | { kind: 'ready'; me: Me }
  | { kind: 'error'; message: string };

const CYCLE_LABEL = { quarterly: 'Quarterly', yearly: 'Yearly' } as const;

/** paid_until is the first unpaid day: show the day before. */
const lastPaidDay = (iso: string) => longDate(lastDay(iso));

/** Notices carried in the URL: an expired link (Better Auth's error callback) and the return from Stripe. */
function urlNotice() {
  const q = new URLSearchParams(location.search);
  const link = q.get('link') || q.get('error');
  const checkout = q.get('checkout');
  if (link || checkout) history.replaceState(history.state, '', location.pathname);
  return {
    link: link ? 'That sign-in link has expired or was already used. Ask for a new one below.' : undefined,
    checkout: checkout === 'done' ? ('done' as const) : checkout === 'cancelled' ? ('cancelled' as const) : undefined,
  };
}

export default function MemberAccount({ contactEmail }: Props) {
  const [view, setView] = useState<View>({ kind: 'loading' });
  // Read from the URL in the browser only (the page is prerendered).
  const [notice, setNotice] = useState<ReturnType<typeof urlNotice>>({ link: undefined, checkout: undefined });
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const sentRef = useFocusWhen<HTMLDivElement>(view.kind === 'sent');

  const load = async (n: ReturnType<typeof urlNotice>, attempt = 0): Promise<void> => {
    const res = await fetch('/api/membership/me', { credentials: 'same-origin' }).catch(() => null);
    if (!res) return setView({ kind: 'error', message: 'We couldn’t reach the site. Check your connection and reload.' });
    if (res.status === 401) {
      setSignedIn(false);
      return setView({ kind: 'signed-out', notice: n.link });
    }
    if (res.status === 503) return setView({ kind: 'unavailable' });
    const body = (await res.json().catch(() => ({}))) as Partial<Me> & { ok?: boolean; error?: string };
    if (!res.ok || !body.ok) return setView({ kind: 'error', message: body.error ?? `We couldn’t load your membership. Try again, or write to ${contactEmail}.` });
    const me = body as Me;
    setSignedIn(true);
    // Back from Stripe: the payment is confirmed by Stripe's webhook a few seconds later.
    if (n.checkout === 'done' && me.member?.status === 'pending' && attempt < 5) {
      setView({ kind: 'ready', me });
      await new Promise((r) => setTimeout(r, 2000));
      return load(n, attempt + 1);
    }
    setView({ kind: 'ready', me });
  };

  useEffect(() => {
    // Keep the level and cycle from /membership for after signing in on this device.
    readChoice();
    const n = urlNotice();
    setNotice(n);
    void load(n);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const emailError = isEmail(email) ? '' : 'Enter an email like name@example.com.';

  const requestLink = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (emailError) return setTried(true);
    setBusy(true);
    setFormError('');
    const address = email.trim().toLowerCase();
    const res = await fetch('/api/auth/sign-in/magic-link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: address, callbackURL: '/membership/account', errorCallbackURL: '/membership/account?link=invalid' }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) return setView({ kind: 'sent', email: address });
    if (res?.status === 503) return setView({ kind: 'unavailable' });
    setFormError(
      res?.status === 429 ? 'Too many sign-in emails. Wait a few minutes, then try again.' : `We couldn’t send the sign-in email. Try again, or write to ${contactEmail}.`,
    );
  };

  const signOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    setSignedIn(false);
    setView({ kind: 'signed-out' });
  };

  if (view.kind === 'loading')
    return (
      <p class="m-0 text-[18px] text-ink-2" aria-busy="true">
        Loading your account…
      </p>
    );

  if (view.kind === 'unavailable')
    return (
      <p class="m-0 text-[18px] leading-[1.6] text-ink-2 max-w-[640px]">
        Member accounts are not available yet. To join or ask about your membership, write to{' '}
        <a href={`mailto:${contactEmail}`} class="font-bold text-black">
          {contactEmail}
        </a>
        .
      </p>
    );

  if (view.kind === 'error')
    return (
      <div class="flex flex-col gap-4 max-w-[640px]">
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
          {view.message}
        </p>
        <Button variant="outline-black" class="self-start" onClick={() => location.reload()}>
          Try again
        </Button>
      </div>
    );

  if (view.kind === 'sent')
    return (
      <div ref={sentRef} tabIndex={-1} role="status" class="bg-success-soft rounded-card p-[clamp(24px,3vw,36px)] flex flex-col gap-3 max-w-[640px] outline-hidden">
        <h2 class="m-0 text-[28px] font-bold leading-[1.15]">Check your email</h2>
        <p class="m-0 text-[18px] leading-[1.55]">We sent a sign-in link to {view.email}. It works once, for 15 minutes.</p>
        <Button variant="link" class="self-start text-[17px]" onClick={() => setView({ kind: 'signed-out' })}>
          Use another email
        </Button>
      </div>
    );

  if (view.kind === 'signed-out')
    return (
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-[clamp(32px,5vw,80px)] items-start">
        <div class="flex flex-col gap-3.5">
          <h2 class="m-0 text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-bold">Sign in</h2>
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
            Sign in with your email to join or to manage your membership. We email you a link, so there is no password to remember.
          </p>
        </div>
        <form onSubmit={requestLink} noValidate class="bg-white border border-grey-frame rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5">
          {view.notice && (
            <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
              {view.notice}
            </p>
          )}
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            invalid={tried && !!emailError}
            error={tried ? emailError : undefined}
          />
          {formError && (
            <p role="alert" class="m-0 text-danger text-[16px]">
              {formError}
            </p>
          )}
          <SubmitButton busy={busy} class="self-start">
            {busy ? 'Sending…' : 'Email me a sign-in link'}
          </SubmitButton>
        </form>
      </div>
    );

  const { me } = view;
  const m = me.member;
  return (
    <div class="flex flex-col gap-8 max-w-[960px]">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="m-0 text-[17px] text-ink-2">
          Signed in as <strong class="text-black">{me.email}</strong>
        </p>
        <Button variant="outline-black" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      {notice.checkout === 'done' && m && m.status !== 'pending' && (
        <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 text-[17px] font-bold">
          Payment received, thank you. Your certificate is on its way by email.
        </p>
      )}
      {notice.checkout === 'done' && m?.status === 'pending' && (
        <p role="status" class="m-0 bg-grey rounded-card px-5 py-4 text-[17px]">
          Stripe is confirming your payment. This page updates in a moment, and your certificate follows by email.
        </p>
      )}
      {notice.checkout === 'cancelled' && <p class="m-0 bg-grey rounded-card px-5 py-4 text-[17px]">The payment was not finished, so nothing was charged.</p>}
      {me.canJoin || m?.status === 'pending' ? (
        <MemberJoin previous={m} contactEmail={contactEmail} onSignedOut={() => setView({ kind: 'signed-out' })} />
      ) : (
        m && (
          <MemberPortal
            m={m}
            certificates={me.certificates}
            acceptedCurrentTerms={me.acceptedCurrentTerms}
            contactEmail={contactEmail}
            onChanged={() => void load(notice)}
            onSignedOut={() => setView({ kind: 'signed-out' })}
          />
        )
      )}
    </div>
  );
}

const NOTES: Partial<Record<MemberView['status'], string>> = {
  past_due: 'Your last payment did not go through. Stripe will try again. To keep your membership, update your card under Manage subscription.',
};

/** Where a resignation stands: with the board (waiting) or confirmed by it. */
function resignationNote(m: MemberView): string | null {
  if (!m.resignation) return null;
  const until = m.paidUntil ? `You stay a member until ${lastPaidDay(m.paidUntil)}` : 'You stay a member until the end of the period you already paid for';
  if (m.resignation.state === 'waiting') return `Your resignation request is with the board. They typically get back to you within 72 hours. ${until}.`;
  const on = m.resignation.confirmedAt ? ` on ${longDate(m.resignation.confirmedAt)}` : '';
  return `The board confirmed your resignation${on}. ${until}. After that, you will not be charged again.`;
}

function MemberPortal({
  m,
  certificates,
  acceptedCurrentTerms,
  contactEmail,
  onChanged,
  onSignedOut,
}: {
  m: MemberView;
  certificates: CertificateView[];
  acceptedCurrentTerms: boolean;
  contactEmail: string;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const [busy, setBusy] = useState<'' | 'portal' | 'resign' | 'undo' | 'switch'>('');
  const [error, setError] = useState('');
  const [confirmResign, setConfirmResign] = useState(false);
  const [accepted, setAccepted] = useState(acceptedCurrentTerms);
  const [triedSwitch, setTriedSwitch] = useState(false);

  const post = async (path: string, what: typeof busy) => {
    setBusy(what);
    setError('');
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string } | undefined;
    setBusy('');
    if (res?.status === 401) return onSignedOut();
    if (!res?.ok || !body?.ok) return setError(body?.error ?? `That did not work. Try again, or write to ${contactEmail}.`);
    return body;
  };

  const rows: [string, string][] = [
    ['Membership', m.levelName],
    ['Status', m.statusLabel[0]!.toUpperCase() + m.statusLabel.slice(1)],
    ['Billing', m.paymentMode === 'manual' ? 'Paid by hand' : `${CYCLE_LABEL[m.cycle]}, ${m.feeLabel}`],
    ...(m.paidUntil ? ([['Paid until', lastPaidDay(m.paidUntil)]] as [string, string][]) : []),
    ...(m.joinedAt ? ([['Member since', longDate(m.joinedAt)]] as [string, string][]) : []),
  ];

  return (
    <div class="flex flex-col gap-8">
      <section aria-labelledby="h-membership" class="bg-grey rounded-card p-[clamp(22px,3vw,36px)] flex flex-col gap-5">
        <h2 id="h-membership" class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
          {m.organisationName ? `${m.organisationName}, ${m.name}` : m.name}
        </h2>
        <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 gap-y-4">
          {rows.map(([k, v]) => (
            <div key={k} class="flex flex-col gap-0.5">
              <dt class="text-[15px] text-grey-text">{k}</dt>
              <dd class="m-0 text-[19px] font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        {m.resignation && (
          <div class="flex flex-col gap-3">
            <p class="m-0 text-lg leading-relaxed text-ink-2">{resignationNote(m)}</p>
            <Button
              variant="outline-black"
              class="self-start"
              disabled={!!busy}
              onClick={async () => {
                const r = await post('/api/membership/resign/undo', 'undo');
                if (r) onChanged();
              }}
            >
              {busy === 'undo' ? 'Undoing…' : 'Undo resignation'}
            </Button>
          </div>
        )}
        {NOTES[m.status] && (
          <p class={m.status === 'past_due' ? 'm-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold' : 'm-0 text-[17px] leading-[1.55] text-ink-2'}>
            {NOTES[m.status]}
          </p>
        )}
        {m.canManagePayment && (
          <div class="flex flex-wrap gap-3">
            <Button
              variant="black"
              disabled={!!busy}
              onClick={async () => {
                const r = await post('/api/membership/portal', 'portal');
                if (r?.url) location.assign(r.url);
              }}
            >
              {busy === 'portal' ? 'Opening Stripe…' : 'Manage subscription'}
            </Button>
          </div>
        )}
      </section>

      {m.status === 'imported_manual' && (
        <section aria-labelledby="h-switch" class="flex flex-col gap-4 max-w-[720px]">
          <h2 id="h-switch" class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
            Switch to automatic payment
          </h2>
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">
            You pay by hand today. Set up automatic payment with Stripe: nothing is charged before your paid period ends{m.paidUntil ? ` (${lastPaidDay(m.paidUntil)})` : ''}, then{' '}
            {m.feeLabel}.
          </p>
          <TermsCheckbox checked={accepted} onChange={setAccepted} error={triedSwitch && !accepted ? 'Accept the membership terms to continue.' : undefined} />
          <Button
            variant="black"
            class="self-start"
            disabled={!!busy}
            onClick={async () => {
              if (!accepted) return setTriedSwitch(true);
              setBusy('switch');
              const r = await startCheckout({}, onSignedOut, contactEmail).catch(() => ({ error: 'We couldn’t start the payment. Check your connection and try again.' }));
              if (r?.error) {
                setError(r.error);
                setBusy('');
              }
            }}
          >
            {busy === 'switch' ? 'Opening Stripe…' : 'Set up automatic payment'}
          </Button>
        </section>
      )}

      <section aria-labelledby="h-certificates" class="flex flex-col gap-4">
        <h2 id="h-certificates" class="m-0 text-[clamp(26px,2.8vw,36px)] leading-[1.15] font-bold">
          Certificates of membership
        </h2>
        {certificates.length ? (
          <ul class="m-0 p-0 list-none flex flex-col gap-3">
            {certificates.map((c, i) => (
              <li key={c.id} class="flex flex-wrap items-center justify-between gap-3 border border-grey-frame rounded-card px-5 py-4">
                <div class="flex flex-col gap-0.5">
                  <span class="flex flex-wrap items-center gap-2">
                    <span class="text-[17px] font-bold">{c.term}</span>
                    {i === 0 && <span class={badgeClass('dark')}>Latest</span>}
                  </span>
                  <span class="text-[15px] text-grey-text">
                    {c.levelName}, certificate {c.number}
                  </span>
                </div>
                <Button href={`/api/membership/certificates/${c.id}`} variant="outline-black" size="sm" external={false}>
                  Download PDF
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p class="m-0 text-[17px] text-grey-text">You get a certificate with every paid term, by email and here.</p>
        )}
      </section>

      {error && (
        <p role="alert" class="m-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold">
          {error}
        </p>
      )}

      {['active', 'past_due', 'imported_manual'].includes(m.status) && (
        <section aria-labelledby="h-resign" class="flex flex-col gap-3 max-w-[720px]">
          <h2 id="h-resign" class="m-0 text-[22px] leading-[1.2] font-bold">
            Leaving
          </h2>
          <p class="m-0 text-[17px] leading-[1.6] text-grey-text text-pretty">
            You can resign at any time (bylaws Art. 5). Your request goes to the board, which typically gets back to you within 72 hours. You stay a member until the end of the
            period you already paid for, and you can undo your resignation until then. After that, you will not be charged again. Nothing is refunded.
          </p>
          {confirmResign ? (
            <div class="flex flex-wrap gap-3">
              <Button
                variant="danger"
                disabled={!!busy}
                onClick={async () => {
                  const r = await post('/api/membership/resign', 'resign');
                  if (r) onChanged();
                }}
              >
                {busy === 'resign' ? 'Sending…' : 'Yes, I resign'}
              </Button>
              <Button variant="outline-black" onClick={() => setConfirmResign(false)}>
                Keep my membership
              </Button>
            </div>
          ) : (
            <Button variant="outline-black" class="self-start" onClick={() => setConfirmResign(true)}>
              Resign from the association
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
