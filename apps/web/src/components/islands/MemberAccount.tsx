/**
 * The member area (/membership/account). Signs in with a Supabase email link
 * (implicit flow, so a link requested on a laptop also works on a phone), then
 * shows the membership from /api/membership/me, or the request form
 * (MemberApply). Signing and paying come in later phases (docs/v2/MEMBERSHIP.md).
 *
 * Without PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY the page says
 * accounts are not available yet, instead of breaking.
 */
import { AuthClient } from '@supabase/auth-js';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { TextField, isEmail } from '@zurichjs/design/islands/Field';
import { SubmitButton, useFocusWhen } from './forms/shared.tsx';
import MemberApply, { readChoice } from './MemberApply.tsx';
import type { MemberView } from '../../pages/api/membership/me.ts';

interface Props {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  contactEmail: string;
}

type View =
  | { kind: 'loading' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'sent'; email: string }
  | { kind: 'signed-in'; email: string; member: MemberView | null; canApply: boolean; justApplied?: boolean }
  | { kind: 'error'; message: string };

const CYCLE_LABEL = { quarterly: 'Quarterly', yearly: 'Yearly' } as const;

/** 2026-12-31 → 31 December 2026 (as on the rest of the site). */
const longDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Zurich' });

/**
 * What the sign-in link brought back in the URL hash: tokens (#access_token=…&refresh_token=…)
 * or an error (#error=…&error_code=otp_expired). The hash is removed at once with
 * replaceState, which overwrites the history entry, so the tokens are not left in the
 * browser history (auth-js's own detection sets location.hash, which keeps them one Back away).
 */
function takeLinkResult(): { tokens?: { access_token: string; refresh_token: string }; error?: string } {
  if (!location.hash) return {};
  const h = new URLSearchParams(location.hash.slice(1));
  history.replaceState(history.state, '', location.pathname + location.search);
  const access_token = h.get('access_token');
  const refresh_token = h.get('refresh_token');
  if (access_token && refresh_token) return { tokens: { access_token, refresh_token } };
  if (!h.get('error')) return {};
  return {
    error:
      h.get('error_code') === 'otp_expired'
        ? 'That sign-in link has expired or was already used. Ask for a new one below.'
        : 'That sign-in link did not work. Ask for a new one below.',
  };
}

export default function MemberAccount({ supabaseUrl, supabaseAnonKey, contactEmail }: Props) {
  const auth = useMemo(
    () =>
      supabaseUrl && supabaseAnonKey
        ? new AuthClient({
            url: `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`,
            headers: { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` },
            storageKey: 'zurichjs-member-auth',
            flowType: 'implicit',
            // The link's tokens are read below, so they leave the URL without a history entry.
            detectSessionInUrl: false,
            persistSession: true,
            autoRefreshToken: true,
          })
        : null,
    [supabaseUrl, supabaseAnonKey],
  );
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const sentRef = useFocusWhen<HTMLDivElement>(view.kind === 'sent');

  useEffect(() => {
    if (!auth) return;
    const load = async (token: string, userEmail: string) => {
      const res = await fetch('/api/membership/me', { headers: { authorization: `Bearer ${token}` } });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; member?: MemberView | null; canApply?: boolean; error?: string };
      if (res.status === 401) {
        await auth?.signOut({ scope: 'local' });
        return setView({ kind: 'signed-out', notice: body.error });
      }
      if (!res.ok || !body.ok) return setView({ kind: 'error', message: body.error ?? `We couldn’t load your membership. Try again, or write to ${contactEmail}.` });
      setView({ kind: 'signed-in', email: userEmail, member: body.member ?? null, canApply: body.canApply ?? false });
    };
    // Keep the level and cycle from /membership (query string) for after signing in on this device.
    readChoice();
    const link = takeLinkResult();
    // A fresh sign-in from the link (setSession checks the token with Supabase), or the session in storage.
    const session = link.tokens ? auth.setSession(link.tokens) : auth.getSession();
    void session.then(({ data, error }) => {
      if (error || !data.session) return setView({ kind: 'signed-out', notice: link.error ?? (error ? 'That sign-in link did not work. Ask for a new one below.' : undefined) });
      void load(data.session.access_token, data.session.user.email ?? '');
    });
    const { data } = auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setView({ kind: 'signed-out' });
    });
    return () => data.subscription.unsubscribe();
  }, [auth, contactEmail]);

  if (!auth)
    return (
      <p class="m-0 text-[18px] leading-[1.6] text-ink-2 max-w-[640px]">
        Member accounts are not available yet. To join or ask about your membership, write to{' '}
        <a href={`mailto:${contactEmail}`} class="font-bold text-black">
          {contactEmail}
        </a>
        .
      </p>
    );

  const emailError = isEmail(email) ? '' : 'Enter an email like name@example.com.';

  const requestLink = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (emailError) return setTried(true);
    setBusy(true);
    setFormError('');
    const { error } = await auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/membership/account`, shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setFormError(
        error.status === 429 ? 'Too many sign-in emails. Wait a few minutes, then try again.' : `We couldn’t send the sign-in email. Try again, or write to ${contactEmail}.`,
      );
      return;
    }
    setView({ kind: 'sent', email: email.trim().toLowerCase() });
  };

  const signOut = async () => {
    await auth.signOut({ scope: 'local' });
    setView({ kind: 'signed-out' });
  };

  if (view.kind === 'loading')
    return (
      <p class="m-0 text-[18px] text-ink-2" aria-busy="true">
        Loading your account…
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
        <p class="m-0 text-[18px] leading-[1.55]">We sent a sign-in link to {view.email}. Open it on any device to sign in there. It works once.</p>
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
          <p class="m-0 text-[18px] leading-[1.6] text-ink-2 text-pretty">Members and people who asked to join sign in with their email. We send a link, no password needed.</p>
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

  const m = view.member;
  return (
    <div class="flex flex-col gap-8 max-w-[880px]">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="m-0 text-[17px] text-ink-2">
          Signed in as <strong class="text-black">{view.email}</strong>
        </p>
        <Button variant="outline-black" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      {view.canApply ? (
        <MemberApply
          token={async () => (await auth.getSession()).data.session?.access_token ?? null}
          previous={m}
          contactEmail={contactEmail}
          onApplied={(member) => setView({ ...view, member, canApply: false, justApplied: true })}
          onSignedOut={() => void signOut()}
        />
      ) : (
        m && <MemberSummary m={m} justApplied={view.justApplied} />
      )}
    </div>
  );
}

/** What happens next, per status (only the statuses that exist so far). */
const NEXT: Partial<Record<MemberView['status'], string>> = {
  applied: 'An organiser looks at your request soon, and you hear from us by email. Nothing has been charged.',
  approved: 'Your request is approved. Signing the membership declaration opens here soon; we email you when it does. Nothing has been charged.',
};

function MemberSummary({ m, justApplied }: { m: MemberView; justApplied?: boolean }) {
  const doneRef = useFocusWhen<HTMLParagraphElement>(!!justApplied);
  const rows: [string, string][] = [
    ['Membership', m.levelName],
    ['Status', m.statusLabel[0]!.toUpperCase() + m.statusLabel.slice(1)],
    ['Billing', CYCLE_LABEL[m.cycle]],
    ...(m.paidUntil ? ([['Paid until', longDate(m.paidUntil)]] as [string, string][]) : []),
    ...(m.joinedAt ? ([['Member since', longDate(m.joinedAt)]] as [string, string][]) : []),
  ];
  return (
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
      {justApplied && (
        <p ref={doneRef} tabIndex={-1} role="status" class="m-0 bg-success-soft text-success rounded-card px-5 py-4 text-[17px] font-bold outline-hidden">
          Request sent. We emailed you a copy.
        </p>
      )}
      {NEXT[m.status] && <p class="m-0 text-[17px] leading-[1.55] text-ink-2">{NEXT[m.status]}</p>}
      {m.paymentMode === 'manual' && m.status === 'imported_manual' && (
        <p class="m-0 text-[17px] leading-[1.55] text-ink-2">
          You pay by hand today. Switching to automatic payment, with no charge before your paid period ends, comes to this page soon.
        </p>
      )}
    </section>
  );
}
