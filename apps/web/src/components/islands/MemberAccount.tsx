/**
 * The member area (/membership/account, docs/v2/MEMBERSHIP.md). Sign in with
 * an emailed link (Better Auth; the session is an httpOnly cookie, so no token
 * ever reaches this script), then join, or manage the membership: status,
 * certificates, the subscription (Stripe portal), switching from
 * paying manually (cash/bank) to automatic payment, and resigning through the board.
 *
 * Without member accounts configured, the API answers 503 and the page says
 * accounts are not available yet.
 */
import { useEffect, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { badgeClass, optionClass, optionInput, surfaceClass } from '@zurichjs/design/recipes';
import { ChipGroup, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { setSignedIn } from '@zurichjs/design/session';
import { lastDay, longDate } from '../../server/dates.ts';
import type { CertificateView, MemberView } from '../../server/membership.ts';
import { CYCLES, RESIGN_NOTE_MAX, RESIGN_REASONS, TIERS, TIER_KEYS, feeLabel, type Cycle, type ResignReason, type TierKey } from '../../lib/membership.ts';
import { ChoiceGroup, SubmitButton, optional, useFocusWhen } from './forms/shared.tsx';
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
  /** A level or cycle switch waiting for the next renewal. */
  pendingPlan: PendingPlan | null;
}

interface PendingPlan {
  level: TierKey;
  cycle: Cycle;
  /** The renewal date it applies from (YYYY-MM-DD). */
  from: string;
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
    checkout: checkout === 'done' || checkout === 'automatic' || checkout === 'cancelled' ? checkout : undefined,
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
    // Back from Stripe: the payment (or the switch to automatic payment) is confirmed by Stripe's webhook a few seconds later.
    const waiting = (n.checkout === 'done' && me.member?.status === 'pending') || (n.checkout === 'automatic' && me.member?.status === 'imported_manual');
    if (waiting && attempt < 5) {
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
      {notice.checkout === 'automatic' && m && m.status !== 'imported_manual' && (
        <p role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 text-base font-bold">
          Automatic payment is set up. Nothing is charged now: your next payment{m.paidUntil ? ` is on ${longDate(m.paidUntil)},` : ' comes when your paid period ends,'}{' '}
          {m.feeLabel}.
        </p>
      )}
      {notice.checkout === 'automatic' && m?.status === 'imported_manual' && (
        <p role="status" class="m-0 bg-grey rounded-card px-5 py-4 text-base">
          Stripe is confirming your automatic payment. This page updates in a moment.
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
            pendingPlan={me.pendingPlan ?? null}
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
  past_due: 'Your last payment did not go through. Stripe will try again. To keep your membership, update your card under Manage payment details.',
};

/** Where a resignation stands: with the board (waiting) or confirmed by it. */
function resignationNote(m: MemberView): string | null {
  if (!m.resignation) return null;
  const until = m.paidUntil ? `You stay a member until ${lastPaidDay(m.paidUntil)}` : 'You stay a member until the end of the period you already paid for';
  if (m.resignation.state === 'waiting')
    return `Your resignation request is with the board. They typically get back to you within 72 hours. ${until}, and your membership will not renew.`;
  const on = m.resignation.confirmedAt ? ` on ${longDate(m.resignation.confirmedAt)}` : '';
  return `The board confirmed your resignation${on}. ${until}. After that, you will not be charged again.`;
}

function MemberPortal({
  m,
  certificates,
  acceptedCurrentTerms,
  pendingPlan,
  contactEmail,
  onChanged,
  onSignedOut,
}: {
  m: MemberView;
  certificates: CertificateView[];
  acceptedCurrentTerms: boolean;
  pendingPlan: PendingPlan | null;
  contactEmail: string;
  onChanged: () => void;
  onSignedOut: () => void;
}) {
  const [busy, setBusy] = useState<'' | 'portal' | 'resign' | 'undo' | 'switch' | 'plan'>('');
  const [error, setError] = useState('');
  const [confirmResign, setConfirmResign] = useState(false);
  const [accepted, setAccepted] = useState(acceptedCurrentTerms);
  const [triedSwitch, setTriedSwitch] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  // Level and cycle: only with automatic payment (a Stripe subscription), not while resigning
  // (resubscribe first) and not once ended. Members paying manually set up automatic payment first.
  const canChangePlan = m.canManagePayment && ['active', 'past_due'].includes(m.status);

  const post = async (path: string, what: typeof busy, payload: object = {}) => {
    setBusy(what);
    setError('');
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string } | undefined;
    setBusy('');
    if (res?.status === 401) return onSignedOut();
    if (!res?.ok || !body?.ok) return setError(body?.error ?? `That did not work. Try again, or write to ${contactEmail}.`);
    return body;
  };

  const rows: [string, string][] = [
    ['Membership', m.levelName],
    ['Status', m.statusLabel[0]!.toUpperCase() + m.statusLabel.slice(1)],
    ['Billing', m.paymentMode === 'manual' ? 'Paid manually (cash/bank)' : `${CYCLE_LABEL[m.cycle]}, ${m.feeLabel}`],
    // While it renews, the next renewal; once resigned (or paid manually), the last paid day.
    ...(m.paidUntil
      ? ([
          m.paymentMode === 'automatic' && (m.status === 'active' || m.status === 'past_due') ? ['Renewal date', longDate(m.paidUntil)] : ['Paid until', lastPaidDay(m.paidUntil)],
        ] as [string, string][])
      : []),
    ...(m.joinedAt ? ([['Member since', longDate(m.joinedAt)]] as [string, string][]) : []),
  ];

  return (
    <div class="flex flex-col gap-8">
      {canChangePlan && pendingPlan && (
        // A scheduled level or cycle switch, as a status banner under "Signed in as" (owner, 11th November 2026).
        <section aria-label="Scheduled change" class={surfaceClass('yellow-soft', 'flex flex-wrap items-center justify-between gap-3 p-5 md:p-6')}>
          <p role="status" class="m-0 text-base">
            From <strong>{longDate(pendingPlan.from)}</strong>, your membership is {TIERS[pendingPlan.level].name}, {feeLabel(TIERS[pendingPlan.level], pendingPlan.cycle)}.
          </p>
          <Button
            variant="outline-black"
            size="sm"
            disabled={!!busy}
            onClick={async () => {
              if (await post('/api/membership/plan', 'plan', { level: m.level, cycle: m.cycle })) onChanged();
            }}
          >
            Keep my current membership
          </Button>
        </section>
      )}
      {m.status === 'imported_manual' && (
        // A status banner right under "Signed in as" (owner, 11th November 2026): the one thing a member paying manually should do next.
        <section aria-labelledby="h-switch" class={surfaceClass('yellow-soft', 'flex flex-col gap-3 p-5 md:p-6')}>
          <h2 id="h-switch" class="m-0 text-xl font-bold">
            Switch to automatic payment
          </h2>
          <p class="m-0 text-base leading-relaxed text-ink-2 text-pretty">
            You pay manually today (cash or bank transfer). Set up automatic payment with Stripe: nothing is charged before your paid period ends
            {m.paidUntil ? ` (${lastPaidDay(m.paidUntil)})` : ''}, then {m.feeLabel}. You can set up automatic payment now and change your subscription type afterwards, before you
            are charged.
          </p>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <TermsCheckbox checked={accepted} onChange={setAccepted} error={triedSwitch && !accepted ? 'Accept the membership terms to continue.' : undefined} />
            <Button
              variant="black"
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
          </div>
        </section>
      )}
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
        {m.resignation && <p class="m-0 text-lg leading-relaxed text-ink-2">{resignationNote(m)}</p>}
        {NOTES[m.status] && (
          <p class={m.status === 'past_due' ? 'm-0 bg-danger-soft text-danger rounded-card px-5 py-4 text-[17px] font-bold' : 'm-0 text-[17px] leading-[1.55] text-ink-2'}>
            {NOTES[m.status]}
          </p>
        )}
        {(m.resignation || m.canManagePayment || canChangePlan) && (
          <div class="flex flex-wrap gap-3">
            {m.resignation && (
              <Button
                variant="yellow"
                disabled={!!busy}
                onClick={async () => {
                  const r = await post('/api/membership/resign/undo', 'undo');
                  if (r) onChanged();
                }}
              >
                {busy === 'undo' ? 'Resubscribing…' : 'Resubscribe'}
              </Button>
            )}
            {m.canManagePayment && (
              <Button
                variant="black"
                disabled={!!busy}
                onClick={async () => {
                  const r = await post('/api/membership/portal', 'portal');
                  if (r?.url) location.assign(r.url);
                }}
              >
                {busy === 'portal' ? 'Opening Stripe…' : 'Manage payment details'}
              </Button>
            )}
            {canChangePlan && (
              <Button variant="yellow" disabled={!!busy} onClick={() => setChangingPlan(!changingPlan)} aria-expanded={changingPlan} aria-controls="change-plan">
                Update subscription type
              </Button>
            )}
          </div>
        )}
        {canChangePlan && changingPlan && (
          <ChangePlan
            m={m}
            pending={pendingPlan}
            busy={busy === 'plan'}
            disabled={!!busy}
            onChange={async (plan) => {
              if (await post('/api/membership/plan', 'plan', plan)) {
                setChangingPlan(false);
                onChanged();
              }
            }}
          />
        )}
      </section>

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
            period you already paid for, and you can resubscribe until then. After that, you will not be charged again. Nothing is refunded.
          </p>
          {confirmResign ? (
            <ResignForm
              busy={busy === 'resign'}
              disabled={!!busy}
              onSend={async (why) => (await post('/api/membership/resign', 'resign', why)) && onChanged()}
              onCancel={() => setConfirmResign(false)}
            />
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

/**
 * The resignation step (owner, 10th November 2026): why they leave (one or more reasons, a few
 * words), then send. Giving a reason is never a condition: the small red link under the form
 * resigns at once without one, as the bylaws (Art. 5) and the Swiss Civil Code (Art. 70) allow.
 * Red here is the owner's call for this one link (AGENTS.md otherwise keeps red for errors).
 */
function ResignForm({
  busy,
  disabled,
  onSend,
  onCancel,
}: {
  busy: boolean;
  disabled: boolean;
  onSend: (why: { reasons: ResignReason[]; note: string }) => void;
  onCancel: () => void;
}) {
  const [reasons, setReasons] = useState<ResignReason[]>([]);
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const needsNote = reasons.includes('other') && !note.trim();
  const reasonError = tried && !reasons.length ? 'Choose at least one reason, or resign without giving one below.' : undefined;
  const noteError = tried && needsNote ? 'Tell us in a few words, or choose another reason.' : undefined;
  const toggle = (r: ResignReason) => setReasons((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  return (
    <form
      class="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!reasons.length || needsNote) return;
        onSend({ reasons, note });
      }}
    >
      <ChoiceGroup legend="Why are you leaving?" hint="Choose all that apply. It helps the board, and only the board sees it." error={reasonError} class="flex flex-col gap-2">
        {RESIGN_REASONS.map((r) => (
          <label key={r.value} class={optionClass(!!reasonError, 'self-start')}>
            <input type="checkbox" name="reasons" value={r.value} checked={reasons.includes(r.value)} onChange={() => toggle(r.value)} class={optionInput} />
            {r.label}
          </label>
        ))}
      </ChoiceGroup>
      <TextArea
        label={reasons.includes('other') ? 'Tell us more' : optional('Anything else you want to tell the board?')}
        rows={4}
        maxLength={RESIGN_NOTE_MAX}
        value={note}
        invalid={!!noteError}
        error={noteError}
        onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
      />
      <div class="flex flex-wrap gap-3">
        <Button type="submit" variant="danger" disabled={disabled}>
          {busy ? 'Sending…' : 'Send my resignation'}
        </Button>
        <Button variant="outline-black" onClick={onCancel}>
          Keep my membership
        </Button>
      </div>
      <button
        type="button"
        class="self-start p-0 bg-transparent border-0 text-sm text-danger underline cursor-pointer disabled:opacity-50"
        disabled={disabled}
        onClick={() => onSend({ reasons: [], note: '' })}
      >
        Resign now without giving a reason
      </button>
    </form>
  );
}

/**
 * Switching level or billing (owner, 11th November 2026). With Stripe, the switch applies from the
 * next renewal and nothing is charged now; paying manually, it applies when automatic payment starts.
 */
function ChangePlan({
  m,
  pending,
  busy,
  disabled,
  onChange,
}: {
  m: MemberView;
  pending: PendingPlan | null;
  busy: boolean;
  disabled: boolean;
  onChange: (plan: { level: TierKey; cycle: Cycle }) => void;
}) {
  const [level, setLevel] = useState<TierKey>(pending?.level ?? m.level);
  const [cycle, setCycle] = useState<Cycle>(pending?.cycle ?? m.cycle);
  const renewal = m.paidUntil ? longDate(m.paidUntil) : null;
  const target = pending ?? { level: m.level, cycle: m.cycle };
  const unchanged = level === target.level && cycle === target.cycle;
  return (
    <section id="change-plan" aria-labelledby="h-plan" class="border border-grey-frame rounded-card bg-white p-5 md:p-6 flex flex-col gap-4">
      <h3 id="h-plan" class="m-0 text-xl font-bold">
        Update subscription type
      </h3>
      {pending && (
        <div role="status" class="bg-grey rounded-card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <p class="m-0 text-base">
            From <strong>{longDate(pending.from)}</strong>: {TIERS[pending.level].name}, {feeLabel(TIERS[pending.level], pending.cycle)}.
          </p>
          <Button variant="outline-black" size="sm" disabled={disabled} onClick={() => onChange({ level: m.level, cycle: m.cycle })}>
            Keep my current membership
          </Button>
        </div>
      )}
      <ChipGroup label="Membership" value={level} onChange={setLevel} options={TIER_KEYS.map((k) => ({ value: k, label: TIERS[k].name }))} />
      <ChipGroup label="Billing" value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c.value, label: `${c.label}, ${feeLabel(TIERS[level], c.value)}` }))} />
      <div class="flex flex-col gap-2">
        <Button variant="black" class="self-start" disabled={disabled || unchanged} onClick={() => onChange({ level, cycle })}>
          {busy ? 'Confirming…' : 'Confirm'}
        </Button>
        <p class="m-0 text-sm text-grey-text">
          The change applies from your next billing cycle{renewal ? `, on ${renewal}` : ''}. Until then nothing changes, and nothing is charged now.
        </p>
      </div>
    </section>
  );
}
