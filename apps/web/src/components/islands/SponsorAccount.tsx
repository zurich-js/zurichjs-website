/**
 * The sponsorship page (/partners/account). Sign in with an emailed link (Better Auth, the same
 * sign-in as members; the session is an httpOnly cookie), then start a sponsorship, finish one we
 * set up with the sponsor, or manage a running one: the plan, payment by card (Stripe), ending
 * it, company details, the logo, colleagues, agreements and contracts. The API is
 * /api/sponsorship/* (each route's header comment is the contract).
 *
 * Signing (owner, 18th November 2026): the first binding step signs the sponsorship agreement in
 * full (name and role). Once the current version is signed, a change or an ending is one tick.
 * With a contract on file there is nothing to sign here. Links we email
 * (`?change=builder-yearly`, `?change=end`) open the matching form, filled in, at the top.
 *
 * Without accounts configured, the API answers 503 and the page says so.
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, FileField, SelectField, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { Heading } from '@zurichjs/design/islands/Heading';
import { Notice } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { cardClass, cx, noticeClass, type ButtonVariant } from '@zurichjs/design/recipes';
import { setSignedIn } from '@zurichjs/design/session';
import { SPONSORSHIP_TIERS } from '@zurichjs/content/partners';
import { AGREEMENT, CYCLES, RECURRING, TIERS, changeTiming, feeLabel, isCycle, isTier, tierInfo, type Cycle, type Tier } from '@zurichjs/sponsorship';
import { longDate, shortDate } from '../../server/dates.ts';
import type { SponsorView, agreementView, contactView, documentView, logoView } from '../../server/sponsor.ts';
import { TextButton, optional, useFocusFirstError, useFocusWhen } from './forms/shared.tsx';
import { CoveredMeetups } from './sponsor-account/CoveredMeetups.tsx';
import { Fees, type FeesView } from './sponsor-account/Fees.tsx';
import { Offer, type OfferView } from './sponsor-account/Offer.tsx';

type ContactView = ReturnType<typeof contactView>;
type AgreementView = ReturnType<typeof agreementView>;
type LogoView = ReturnType<typeof logoView>;
type DocumentView = ReturnType<typeof documentView>;
type Role = ContactView['role'];

interface PendingChange {
  tier: Tier;
  cycle: Cycle;
  /** The renewal it applies from (YYYY-MM-DD). */
  from: string;
}

/** GET /api/sponsorship/me. */
interface Me {
  email: string;
  agreementVersion: string;
  contact: ContactView | null;
  sponsor: SponsorView | null;
  contacts?: ContactView[];
  agreements?: AgreementView[];
  logos?: LogoView[];
  contracts?: DocumentView[];
  pendingChange?: PendingChange | null;
  signedCurrent?: boolean;
  signer?: { name: string; title: string } | null;
  invitation?: { company: string; tierName: string } | null;
  /** Waiting for payment: the board's open offer, with base, fee and total. */
  offer?: OfferView | null;
  /** Recurring: the processing fee in force, and one the board offered to confirm. */
  fees?: FeesView;
}

interface Meetup {
  id: string;
  title: string;
  date: string;
}

/** A change we agreed with the sponsor, opened from the link in our email. */
type Link = { kind: 'plan'; tier: Tier; cycle: Cycle } | { kind: 'end' };

type View =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'sent'; email: string }
  | { kind: 'confirming'; email: string; slow: boolean }
  | { kind: 'ready'; me: Me }
  | { kind: 'error'; message: string };

type Fail = { error: string; field?: string };
type Result<T> = ({ ok: true } & T) | ({ ok: false } & Fail);
type Message = { tone: 'success' | 'danger'; text: ComponentChildren };

/** What every part of the page needs. */
interface Ctx {
  me: Me;
  contactEmail: string;
  onSignedOut: () => void;
  reload: () => Promise<void>;
}

const body = 'm-0 text-body text-ink-2 text-pretty';
const hint = 'm-0 text-compact text-grey-text text-pretty';
/** A note that is neither a result nor an error (a payment not finished). */
const note = noticeClass('note', 'm-0 text-body');
const fieldset = 'm-0 flex min-w-0 flex-col gap-4 border-0 p-0';
const legend = 'mb-2 p-0 text-card-title font-bold';
const inlineLink = 'font-bold text-black';

const ROLE_LABEL: Record<Role, string> = { primary: 'Primary contact', billing: 'Billing contact', other: 'Colleague' };
const CONTEXT_LABEL: Record<AgreementView['context'], string> = { start: 'Sponsorship', change: 'Change' };
const CYCLE_CHOICE: Record<Cycle, string> = { monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', once: 'One-time, one meetup' };
const LOGO_TYPES = 'image/svg+xml,image/png,image/webp';
const LOGO_MAX = 2 * 1024 * 1024;
const MAX_CONTACTS = 10;
const POLLS = 10;

const planName = (tier: Tier, cycle: Cycle) => `${tierInfo(tier).name}, ${feeLabel(tier, cycle)}`;
const benefitsOf = (t: Tier) => SPONSORSHIP_TIERS.find((o) => o.id === t)?.perks ?? [];
const running = (s: SponsorView) => s.status === 'active' || s.status === 'past_due';
/** Tier and how often they pay change here only for a running recurring sponsorship. */
const canChange = (s: SponsorView) => running(s) && s.cycle !== 'once';

/** One JSON (or multipart) call to the API. 401 signs the page out; a network failure becomes an error sentence. */
async function call<T extends object>(
  path: string,
  init: { method?: string; json?: unknown; form?: FormData },
  ctx: Pick<Ctx, 'contactEmail' | 'onSignedOut'>,
): Promise<Result<T> | null> {
  const method = init.method ?? 'POST';
  const payload = init.form ? { body: init.form } : method === 'POST' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(init.json ?? {}) } : {};
  const res = await fetch(path, { method, credentials: 'same-origin', ...payload }).catch(() => null);
  if (!res) return { ok: false, error: 'We couldn’t reach the site. Check your connection and try again.' };
  if (res.status === 401) {
    ctx.onSignedOut();
    return null;
  }
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; field?: string } & T;
  if (!res.ok || !data.ok) return { ok: false, error: data.error ?? `That did not work. Try again, or write to ${ctx.contactEmail}.`, field: data.field };
  return { ...data, ok: true };
}

/** Removes query parameters from the address bar, keeping the rest. */
function dropParams(...names: string[]) {
  const url = new URL(location.href);
  for (const n of names) url.searchParams.delete(n);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

/** `?change=builder-yearly` or `?change=end`, when this sponsorship can take it. */
function linkFor(param: string | null, s: SponsorView | null): Link | null {
  if (!param || !s || !canChange(s)) return null;
  if (param === 'end') return { kind: 'end' };
  const [tier, cycle] = param.split('-');
  return isTier(tier) && isCycle(cycle) && cycle !== 'once' ? { kind: 'plan', tier, cycle } : null;
}

/** Field errors: the form's own checks after a failed submit, else what the server said about that field. */
function useErrors() {
  const [tried, setTried] = useState(false);
  const [server, setServer] = useState<Fail | null>(null);
  const errorOf = (local: Record<string, string>, k: string) => (tried ? (local[k] ?? '') : '') || (server?.field === k ? server.error : '');
  /** A server error that no field on this form shows. */
  const general = (fields: string[]) => (server && (!server.field || !fields.includes(server.field)) ? server.error : '');
  return { tried, setTried, server, setServer, errorOf, general };
}

/** The result of an action, shown next to where it happened and focused so it is read out. */
function useResult() {
  const [message, setMessage] = useState<Message | null>(null);
  const ref = useFocusWhen<HTMLDivElement>(!!message);
  return { message, set: setMessage, ref };
}

/* ------------------------------------------------------------------ small pieces */

function ResultNotice({ result }: { result: ReturnType<typeof useResult> }) {
  return result.message ? <Notice tone={result.message.tone} live focusRef={result.ref} title={result.message.text} /> : null;
}

/** Buttons side by side from the breakpoint, full width (stacked) below it. */
function Actions({ children }: { children: ComponentChildren }) {
  return <div class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">{children}</div>;
}

function Rows({ rows }: { rows: [string, ComponentChildren][] }) {
  return (
    <dl class="m-0 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} class="flex min-w-0 flex-col gap-0.5">
          <dt class="text-meta text-grey-text">{k}</dt>
          <dd class="m-0 text-lead font-bold break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** What a tier includes, as /partners lists it, folded away. */
function Benefits({ summary, items }: { summary: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <details>
      <summary class="cursor-pointer py-2.5 text-compact font-bold">{summary}</summary>
      <ul class="m-0 mt-2 flex list-disc flex-col gap-1 pl-5 text-compact text-ink-2">
        {items.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </details>
  );
}

function Mail({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} class={inlineLink}>
      {email}
    </a>
  );
}

/** Starting and paying wait until the owner switches online sponsorship on. */
/** Stripe's billing portal: the card, the billing email and receipts. */
function PortalButton({ ctx, variant = 'secondary' }: { ctx: Ctx; variant?: ButtonVariant }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const open = async () => {
    setBusy(true);
    setError('');
    const r = await call<{ url: string }>('/api/sponsorship/portal', {}, ctx);
    if (!r) return;
    if (!r.ok) {
      setBusy(false);
      return setError(r.error);
    }
    location.assign(r.url);
  };
  return (
    <>
      <Button variant={variant} disabled={busy} onClick={() => void open()}>
        {busy ? 'Opening Stripe…' : 'Card and receipts'}
      </Button>
      {error && (
        <div class="md:basis-full">
          <Notice tone="danger" live title={error} />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ signing */

type SignMode = 'contract' | 'confirm' | 'full';

/**
 * What a binding step needs: nothing with a contract on file, one tick once the current agreement
 * is signed (or a full signature with another name), else the full signature.
 */
function useSignature(ctx: Ctx, s: SponsorView | null) {
  const { me } = ctx;
  const base: SignMode = s?.hasContract ? 'contract' : s && me.signedCurrent ? 'confirm' : 'full';
  const [other, setOther] = useState(false);
  const mode: SignMode = base === 'confirm' && other ? 'full' : base;
  const [value, setValue] = useState({ ticked: false, name: me.signer?.name ?? me.contact?.name ?? '', title: me.signer?.title ?? '' });
  const version = me.agreementVersion || AGREEMENT.version;
  const local: Record<string, string> =
    mode === 'contract'
      ? {}
      : mode === 'confirm'
        ? { agreement: value.ticked ? '' : 'Tick the box to confirm.' }
        : {
            agreement: value.ticked ? '' : 'Accept the sponsorship agreement to continue.',
            signerName: value.name.trim() ? '' : 'Add your full name to sign.',
            signerTitle: value.title.trim() ? '' : 'Add your role at the company, for example Head of Marketing.',
          };
  const payload =
    mode === 'full'
      ? { signerName: value.name.trim(), signerTitle: value.title.trim(), agreementVersion: version }
      : mode === 'confirm'
        ? { confirm: true, agreementVersion: version }
        : { agreementVersion: version };
  return {
    mode,
    base,
    version,
    value,
    set: (patch: Partial<typeof value>) => setValue({ ...value, ...patch }),
    setOther: (v: boolean) => {
      setOther(v);
      setValue({ ...value, ticked: false });
    },
    local,
    valid: Object.values(local).every((v) => !v),
    payload,
  };
}

type Signer = ReturnType<typeof useSignature>;
const SIGN_FIELDS = ['agreement', 'signerName', 'signerTitle'];

function AgreementLink({ children = 'sponsorship agreement' }: { children?: ComponentChildren }) {
  return (
    <a href={AGREEMENT.path} target="_blank" rel="noopener" class={inlineLink}>
      {children}
    </a>
  );
}

/**
 * The signature block. A `field: 'agreement'` error from the server after ticking means the
 * agreement changed since the page loaded, so the reader is asked to reload.
 */
function Signature({ sig, ctx, company, errorOf }: { sig: Signer; ctx: Ctx; company: string; errorOf: (k: string) => string }) {
  const id = useId();
  if (sig.mode === 'contract') return <p class={body}>Your signed contract is on file.</p>;
  const tickError = errorOf('agreement');
  const stale = sig.value.ticked && /changed/i.test(tickError);
  const date = longDate(sig.version);
  const who = ctx.me.signer ? `${ctx.me.signer.name}, ${ctx.me.signer.title}` : (ctx.me.contact?.name ?? ctx.me.email);
  const tick = (label: ComponentChildren) => (
    <div class="flex flex-col gap-1.5">
      <Checkbox
        label={label}
        name="agreement"
        checked={sig.value.ticked}
        onChange={(e) => sig.set({ ticked: (e.target as HTMLInputElement).checked })}
        aria-invalid={!!tickError || undefined}
        aria-describedby={tickError ? `${id}-error` : undefined}
      />
      {tickError && (
        <span id={`${id}-error`} class="flex flex-wrap items-center gap-3 text-meta text-danger" aria-live="polite">
          {tickError}
          {stale && (
            <TextButton size="meta" onClick={() => location.reload()}>
              Reload the page
            </TextButton>
          )}
        </span>
      )}
    </div>
  );

  if (sig.mode === 'confirm')
    return (
      <fieldset class={fieldset}>
        <legend class={legend}>Confirm</legend>
        {tick(
          <>
            Confirm as {who}, under the <AgreementLink /> of {date}.
          </>,
        )}
        <div class="flex min-h-chip items-center">
          <TextButton onClick={() => sig.setOther(true)}>Sign with another name</TextButton>
        </div>
      </fieldset>
    );

  return (
    <fieldset class={fieldset}>
      <legend class={legend}>Sign the agreement</legend>
      <p class={hint}>
        Read the <AgreementLink /> of {date} (opens in a new tab). You sign it for {company || 'the company'}, and your colleagues on this page get a copy by email.
      </p>
      {tick(`I have read and accept the sponsorship agreement on behalf of ${company || 'the company'}.`)}
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Your full name"
          name="signerName"
          autoComplete="name"
          value={sig.value.name}
          onInput={(e) => sig.set({ name: (e.target as HTMLInputElement).value })}
          invalid={!!errorOf('signerName')}
          error={errorOf('signerName') || undefined}
        />
        <TextField
          label="Your role at the company"
          name="signerTitle"
          autoComplete="organization-title"
          value={sig.value.title}
          onInput={(e) => sig.set({ title: (e.target as HTMLInputElement).value })}
          invalid={!!errorOf('signerTitle')}
          error={errorOf('signerTitle') || undefined}
        />
      </div>
      {sig.base === 'confirm' && (
        <div class="flex min-h-chip items-center">
          <TextButton onClick={() => sig.setOther(false)}>Confirm as {who} instead</TextButton>
        </div>
      )}
    </fieldset>
  );
}

/** The submit label for a binding step, by how it is signed. */
const signedLabel = (sig: Signer, full: string, confirm: string) => (sig.mode === 'full' ? full : confirm);

/* ------------------------------------------------------------------ the page */

export default function SponsorAccount({ contactEmail }: { contactEmail: string }) {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [link, setLink] = useState<Link | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [flash, setFlash] = useState<Message | null>(null);
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const sentRef = useFocusWhen<HTMLDivElement>(view.kind === 'sent');
  const flashRef = useFocusWhen<HTMLDivElement>(!!flash);
  // Read once, in the browser (the page is prerendered).
  const query = useRef<{ link?: string; checkout?: string; change: string | null; decided: boolean }>({ change: null, decided: false });

  const signedOut = () => {
    setSignedIn(false);
    setView({ kind: 'signed-out' });
  };

  const load = async (attempt = 0): Promise<void> => {
    const q = query.current;
    const res = await fetch('/api/sponsorship/me', { credentials: 'same-origin' }).catch(() => null);
    if (!res) return setView({ kind: 'error', message: 'We couldn’t reach the site. Check your connection and reload.' });
    if (res.status === 401) {
      setSignedIn(false);
      return setView({ kind: 'signed-out', notice: q.link });
    }
    if (res.status === 503) return setView({ kind: 'unavailable' });
    const data = (await res.json().catch(() => ({}))) as Partial<Me> & { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) return setView({ kind: 'error', message: data.error ?? `We couldn’t load your sponsorship. Try again, or write to ${contactEmail}.` });
    const me = data as Me;
    const s = me.sponsor;

    // Back from Stripe: its webhook confirms the payment a few seconds later. Until then, only say so.
    if (q.checkout === 'done') {
      if (s && (s.status === 'pending' || s.paymentMode === 'manual')) {
        if (attempt >= POLLS) return setView({ kind: 'confirming', email: me.email, slow: true });
        setView({ kind: 'confirming', email: me.email, slow: false });
        await new Promise((r) => setTimeout(r, 2000));
        return load(attempt + 1);
      }
      q.checkout = undefined;
      dropParams('checkout');
      if (s) setFlash({ tone: 'success', text: 'Thank you. Your card payment is set up and your sponsorship is running.' });
    }
    if (!q.decided) {
      q.decided = true;
      if (!me.invitation) setLink(linkFor(q.change, s));
    }
    setView({ kind: 'ready', me });
  };

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const expired = p.get('link') || p.get('error');
    const checkout = p.get('checkout');
    query.current = {
      link: expired ? 'That sign-in link has expired or was already used. Ask for a new one below.' : undefined,
      checkout: checkout === 'done' ? 'done' : undefined,
      change: p.get('change'),
      decided: false,
    };
    setCancelled(checkout === 'cancelled');
    // `checkout=done` stays until Stripe confirms, so reloading keeps waiting instead of offering to pay again.
    dropParams('link', 'error', ...(checkout === 'done' ? [] : ['checkout']));
    void load();
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
      body: JSON.stringify({ email: address, callbackURL: `/partners/account${location.search}`, errorCallbackURL: '/partners/account?link=invalid' }),
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
    signedOut();
  };

  if (view.kind === 'loading')
    return (
      <p role="status" class={body}>
        Loading your sponsorship…
      </p>
    );

  if (view.kind === 'unavailable')
    return (
      <p class={cx(body, 'max-w-form')}>
        Sponsor accounts are not available yet. To sponsor ZurichJS or ask about your sponsorship, write to <Mail email={contactEmail} />.
      </p>
    );

  // The covered meetups load on their own, so they still show when the sponsorship could not be loaded.
  if (view.kind === 'error')
    return (
      <div class="flex flex-col gap-6">
        <div class="flex max-w-form flex-col gap-4">
          <Notice tone="danger" live title={view.message} />
          <Actions>
            <Button variant="secondary" onClick={() => location.reload()}>
              Try again
            </Button>
          </Actions>
        </div>
        <CoveredMeetups contactEmail={contactEmail} onSignedOut={signedOut} />
      </div>
    );

  if (view.kind === 'sent')
    return (
      <Notice tone="success" live as="h2" focusRef={sentRef} title="Check your email" class="max-w-form">
        <p class="m-0 text-body">We sent a sign-in link to {view.email}. It works once, for 15 minutes.</p>
        <div class="flex min-h-chip items-center">
          <TextButton size="body" onClick={() => setView({ kind: 'signed-out' })}>
            Use another email
          </TextButton>
        </div>
      </Notice>
    );

  if (view.kind === 'signed-out')
    return (
      <div class="grid grid-cols-auto-lg items-start gap-12">
        <div class="flex flex-col gap-3.5">
          <Heading>Sign in</Heading>
          <p class={body}>
            Sign in with your work email to start a sponsorship or to manage your company’s. We email you a link, so there is no password to remember. Colleagues your company added
            sign in with their own email.
          </p>
        </div>
        <form onSubmit={requestLink} noValidate class={cardClass('outline', 'lg')}>
          {view.notice && <Notice tone="danger" live title={view.notice} />}
          <TextField
            label="Work email"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            invalid={tried && !!emailError}
            error={tried ? emailError : undefined}
          />
          {formError && <Notice tone="danger" live title={formError} />}
          <Actions>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
          </Actions>
        </form>
      </div>
    );

  const bar = (address: string) => (
    <div class="flex flex-wrap items-center justify-between gap-4">
      <p class="m-0 min-w-0 text-body break-words text-ink-2">
        Signed in as <strong class="text-black">{address}</strong>
      </p>
      <Button variant="secondary" onClick={() => void signOut()}>
        Sign out
      </Button>
    </div>
  );

  if (view.kind === 'confirming')
    return (
      <div class="flex max-w-wide flex-col gap-10">
        {bar(view.email)}
        <section aria-labelledby="h-confirming" class={cardClass('outline', 'lg')}>
          <Heading id="h-confirming" size="subsection">
            {view.slow ? 'Still waiting for Stripe' : 'Stripe is confirming your payment'}
          </Heading>
          <p role="status" class={body}>
            {view.slow ? 'Reload in a minute; you will not be charged twice.' : 'This takes a few seconds. The page updates by itself.'}
          </p>
          {view.slow && (
            <Actions>
              <Button variant="primary" onClick={() => location.reload()}>
                Reload
              </Button>
            </Actions>
          )}
        </section>
      </div>
    );

  const { me } = view;
  const ctx: Ctx = { me, contactEmail, onSignedOut: signedOut, reload: () => load() };
  const s = me.sponsor;
  const invitation = me.invitation;

  return (
    <div class="flex max-w-wide flex-col gap-12">
      {bar(me.email)}
      {flash && <Notice tone={flash.tone} live focusRef={flashRef} title={flash.text} />}
      {invitation ? (
        <Invitation
          ctx={ctx}
          company={invitation.company}
          tierName={invitation.tierName}
          onAnswered={(text) => {
            setFlash(null);
            setFlash({ tone: 'success', text });
            void load();
          }}
        />
      ) : s ? (
        <Sponsorship key={s.id} ctx={ctx} s={s} link={link} cancelled={cancelled} />
      ) : (
        <StartForm ctx={ctx} s={null} cancelled={cancelled} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ invitation */

function Invitation({ ctx, company, tierName, onAnswered }: { ctx: Ctx; company: string; tierName: string; onAnswered: (message: string) => void }) {
  const [busy, setBusy] = useState<'' | 'accept' | 'decline'>('');
  const result = useResult();
  const answer = async (decision: 'accept' | 'decline') => {
    setBusy(decision);
    result.set(null);
    const r = await call('/api/sponsorship/invitation', { json: { decision } }, ctx);
    setBusy('');
    if (!r) return;
    if (!r.ok) return result.set({ tone: 'danger', text: r.error });
    onAnswered(decision === 'accept' ? `You joined ${company}’s sponsorship.` : `Done. We removed your email from ${company}’s sponsorship.`);
  };
  return (
    <section aria-labelledby="h-invitation" class={cardClass('outline', 'lg')}>
      <Heading id="h-invitation" size="subsection">
        Join {company}’s sponsorship
      </Heading>
      <p class={body}>
        {company} added you to their ZurichJS sponsorship ({tierName}). Join to manage it with them.
      </p>
      <ResultNotice result={result} />
      <Actions>
        <Button variant="primary" disabled={!!busy} onClick={() => void answer('accept')}>
          {busy === 'accept' ? 'Joining…' : 'Join'}
        </Button>
        <Button variant="secondary" disabled={!!busy} onClick={() => void answer('decline')}>
          {busy === 'decline' ? 'Removing…' : 'This isn’t me'}
        </Button>
      </Actions>
    </section>
  );
}

/* ------------------------------------------------------------------ a sponsorship */

function Sponsorship({ ctx, s, link, cancelled }: { ctx: Ctx; s: SponsorView; link: Link | null; cancelled: boolean }) {
  const [again, setAgain] = useState(false);
  const recurring = s.cycle !== 'once';
  return (
    <>
      {s.status === 'past_due' && (
        <Notice tone="danger" title="Payment overdue">
          <p class="m-0">
            {s.hasStripeCustomer ? (
              'Your last payment did not go through. Stripe tries again in a few days. Check your card under Card and receipts.'
            ) : (
              <>
                We have not received your payment for this period yet. Write to <Mail email={ctx.contactEmail} /> if you have questions.
              </>
            )}
          </p>
          {s.hasStripeCustomer && (
            <Actions>
              <PortalButton ctx={ctx} variant="primary" />
            </Actions>
          )}
        </Notice>
      )}
      {link && <LinkedChange ctx={ctx} s={s} link={link} />}
      <SponsorCard ctx={ctx} s={s} linkOpen={!!link} cancelled={cancelled} again={again} onAgain={() => setAgain(true)} />
      {recurring && s.status !== 'pending' && ctx.me.fees && <Fees fees={ctx.me.fees} onSignedOut={ctx.onSignedOut} onChanged={() => void ctx.reload()} />}
      <CoveredMeetups contactEmail={ctx.contactEmail} onSignedOut={ctx.onSignedOut} />
      {s.status === 'pending' && ctx.me.offer && <Offer offer={ctx.me.offer} contactEmail={ctx.contactEmail} />}
      {/* The board's offer is paid through its link only (the server refuses a second payment page). */}
      {s.status === 'pending' && (!ctx.me.offer || ctx.me.offer.quote.interval) && <StartForm ctx={ctx} s={s} cancelled={cancelled} />}
      {s.status === 'ended' && again && <StartForm ctx={ctx} s={s} cancelled={false} focus onCancel={() => setAgain(false)} />}
      {s.status !== 'pending' && s.status !== 'ended' && <DetailsSection ctx={ctx} s={s} />}
      {s.status !== 'ended' && <LogoSection ctx={ctx} s={s} />}
      <Colleagues ctx={ctx} />
      <Agreements ctx={ctx} />
      {recurring && (running(s) || s.status === 'ending') && link?.kind !== 'end' && <EndSection ctx={ctx} s={s} />}
    </>
  );
}

function statusLine(s: SponsorView): string {
  switch (s.status) {
    case 'pending':
      return 'Waiting for your first payment';
    case 'active':
      return s.paidThrough ? `Active, paid through ${longDate(s.paidThrough)}` : 'Active';
    case 'past_due':
      return 'Payment overdue';
    case 'ending':
      return s.lastDay ? `Ending on ${longDate(s.lastDay)}` : 'Ending with the period you paid for';
    case 'ended':
      return s.lastDay ? `Ended on ${longDate(s.lastDay)}` : 'Ended';
    default:
      return s.statusLabel.charAt(0).toUpperCase() + s.statusLabel.slice(1);
  }
}

/** The summary card: where things stand, the plan, and the actions on it. */
function SponsorCard({ ctx, s, linkOpen, cancelled, again, onAgain }: { ctx: Ctx; s: SponsorView; linkOpen: boolean; cancelled: boolean; again: boolean; onAgain: () => void }) {
  const manualCard = s.paymentMode === 'manual' && s.status === 'active' && s.cycle !== 'once';
  const [panel, setPanel] = useState<'' | 'change' | 'card'>(manualCard && cancelled ? 'card' : '');
  const [busy, setBusy] = useState<'' | 'undo' | 'keep'>('');
  const result = useResult();
  const pending = canChange(s) ? (ctx.me.pendingChange ?? null) : null;

  const post = async (path: string, what: 'undo' | 'keep', json: object, done: string) => {
    setBusy(what);
    result.set(null);
    const r = await call(path, { json }, ctx);
    setBusy('');
    if (!r) return;
    if (!r.ok) return result.set({ tone: 'danger', text: r.error });
    result.set({ tone: 'success', text: done });
    await ctx.reload();
  };

  const rows: [string, ComponentChildren][] = [
    ['Tier', s.tierName],
    ['Fee', s.feeLabel],
    ['How often you pay', s.cycle === 'once' ? 'One-time' : s.cycleLabel],
    ['Payment', s.paymentLabel],
  ];
  if (s.cycle === 'once' && s.meetups.length)
    rows.push([
      s.meetups.length === 1 ? 'Meetup' : 'Meetups',
      <ul key="meetups" class="m-0 flex list-none flex-col gap-1 p-0">
        {s.meetups.map((m) => (
          <li key={m.eventId}>
            {m.title}, {longDate(m.date)}
          </li>
        ))}
      </ul>,
    ]);
  if (s.status === 'past_due' && s.paidThrough) rows.push(['Paid through', longDate(s.paidThrough)]);
  if (s.startedAt) rows.push(['Sponsor since', longDate(s.startedAt)]);
  if (pending)
    rows.push([
      `From ${longDate(pending.from)}`,
      <span key="pending" class="flex flex-col items-start gap-1">
        {planName(pending.tier, pending.cycle)}
        <span class="flex min-h-chip items-center">
          <TextButton
            disabled={!!busy}
            onClick={() =>
              void post('/api/sponsorship/plan', 'keep', { tier: s.tier, cycle: s.cycle }, `Done. You stay on ${planName(s.tier, s.cycle)}. The scheduled change is cancelled.`)
            }
          >
            {busy === 'keep' ? 'Keeping…' : 'Keep current plan'}
          </TextButton>
        </span>
      </span>,
    ]);

  const toggle = (p: 'change' | 'card') => {
    result.set(null);
    setPanel(panel === p ? '' : p);
  };

  return (
    <section aria-labelledby="h-sponsorship" class="flex flex-col gap-4">
      <div class={cardClass('filled', 'lg')}>
        <div class="flex flex-col gap-1">
          <Heading id="h-sponsorship" size="subsection">
            {s.companyName}
          </Heading>
          <p class={cx('m-0 text-card-title font-bold', s.status === 'past_due' ? 'text-danger' : 'text-black')}>{statusLine(s)}</p>
        </div>
        <Rows rows={rows} />
        {s.status !== 'ended' && <Benefits summary="What your sponsorship includes" items={s.benefits} />}
        {(s.hasStripeCustomer || (canChange(s) && !linkOpen) || manualCard || s.status === 'ending' || (s.status === 'ended' && !again)) && (
          <Actions>
            {s.status === 'ending' && (
              <Button
                variant="primary"
                disabled={!!busy}
                onClick={() => void post('/api/sponsorship/end/undo', 'undo', {}, 'Done. Your sponsorship continues as before, and it renews as usual.')}
              >
                {busy === 'undo' ? 'Keeping…' : 'Keep the sponsorship'}
              </Button>
            )}
            {s.status === 'ended' && !again && (
              <Button variant="primary" onClick={onAgain}>
                Sponsor again
              </Button>
            )}
            {manualCard && (
              <Button variant="primary" onClick={() => toggle('card')} aria-expanded={panel === 'card'} aria-controls="panel-card">
                Add a card
              </Button>
            )}
            {canChange(s) && !linkOpen && (
              <Button variant="secondary" onClick={() => toggle('change')} aria-expanded={panel === 'change'} aria-controls="panel-change">
                Change tier or how often you pay
              </Button>
            )}
            {s.hasStripeCustomer && <PortalButton ctx={ctx} />}
          </Actions>
        )}
      </div>
      <ResultNotice result={result} />
      {panel === 'change' && canChange(s) && (
        <div id="panel-change" class={cardClass('outline', 'lg')}>
          <ChangePlan
            ctx={ctx}
            s={s}
            title="Change tier or how often you pay"
            onDone={(text) => {
              setPanel('');
              result.set({ tone: 'success', text });
              void ctx.reload();
            }}
            onCancel={() => setPanel('')}
          />
        </div>
      )}
      {panel === 'card' && manualCard && (
        <div id="panel-card" class={cardClass('outline', 'lg')}>
          <AddCard ctx={ctx} s={s} cancelled={cancelled} onCancel={() => setPanel('')} />
        </div>
      )}
    </section>
  );
}

/** A change we agreed, opened from our email's link: filled in, at the top, to check and confirm. */
function LinkedChange({ ctx, s, link }: { ctx: Ctx; s: SponsorView; link: Link }) {
  const [closed, setClosed] = useState(false);
  const result = useResult();
  if (closed) return null;
  const finish = (text: string) => {
    dropParams('change');
    result.set({ tone: 'success', text });
    void ctx.reload();
  };
  const close = () => {
    dropParams('change');
    setClosed(true);
  };
  return (
    <section aria-labelledby="h-linked" class={cardClass('outline', 'lg')}>
      <Heading id="h-linked" size="subsection">
        {link.kind === 'end' ? 'End sponsorship' : 'Change tier or how often you pay'}
      </Heading>
      {result.message ? (
        <ResultNotice result={result} />
      ) : (
        <>
          <p class={body}>We set this up as we discussed. Check it and confirm.</p>
          {link.kind === 'end' ? <EndForm ctx={ctx} s={s} onDone={finish} onCancel={close} /> : <ChangePlan ctx={ctx} s={s} initial={link} onDone={finish} onCancel={close} />}
        </>
      )}
    </section>
  );
}

/** Tier and how often they pay. A higher tier on the same billing applies now; anything else from the renewal. */
function ChangePlan({
  ctx,
  s,
  initial,
  title,
  onDone,
  onCancel,
}: {
  ctx: Ctx;
  s: SponsorView;
  initial?: { tier: Tier; cycle: Cycle };
  title?: string;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const pending = ctx.me.pendingChange ?? null;
  const [tier, setTier] = useState<Tier>(initial?.tier ?? pending?.tier ?? s.tier);
  const [cycle, setCycle] = useState<Cycle>(initial?.cycle ?? pending?.cycle ?? s.cycle);
  const [busy, setBusy] = useState(false);
  const sig = useSignature(ctx, s);
  const errs = useErrors();
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useFocusWhen<HTMLHeadingElement>(!!title);
  const focusError = useFocusFirstError(formRef);
  const manual = s.paymentMode === 'manual';
  const same = tier === s.tier && cycle === s.cycle;
  const timing = manual ? (same ? 'none' : 'now') : changeTiming({ tier: s.tier, cycle: s.cycle }, { tier, cycle });
  const scheduled = !!pending && pending.tier === tier && pending.cycle === cycle;
  const unchanged = timing === 'none' || scheduled;
  const errorOf = (k: string) => errs.errorOf(sig.local, k);
  const plan = planName(tier, cycle);

  const effect =
    timing === 'none'
      ? 'This is your current plan.'
      : scheduled && pending
        ? `This change is already scheduled for ${longDate(pending.from)}.`
        : timing === 'now'
          ? manual
            ? `${plan}. This applies as soon as you confirm, and we bill the difference.`
            : `${plan}. This applies now, and Stripe charges only the difference for this term.`
          : `${plan}. This applies from your next renewal${s.paidUntil ? `, on ${longDate(s.paidUntil)}` : ''}. Nothing is charged now.`;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy || unchanged) return;
    if (!sig.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    result.set(null);
    const r = await call<{ timing: 'none' | 'now' | 'renewal'; from: string | null; droppedChange?: string | null }>(
      '/api/sponsorship/plan',
      { json: { tier, cycle, ...sig.payload } },
      ctx,
    );
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      if (r.field && SIGN_FIELDS.includes(r.field)) focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    onDone(
      r.timing === 'now'
        ? `Done. Your sponsorship is now ${plan}.${manual ? ' We bill the difference.' : ' Stripe charges the difference for this term.'}${
            r.droppedChange ? ` The change to ${r.droppedChange} that was waiting for your renewal no longer applies.` : ''
          }`
        : r.timing === 'renewal'
          ? `Change scheduled for ${r.from ? longDate(r.from) : 'your next renewal'}. From then, your sponsorship is ${plan}.`
          : 'Your current plan stays.',
    );
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="flex flex-col gap-6">
      {title && (
        <Heading as="h3" size="card" focus={headingRef}>
          {title}
        </Heading>
      )}
      <ChipGroup<Tier> label="Tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: `${t.name}, ${feeLabel(t.key, cycle)}` }))} />
      <ChipGroup<Cycle> label="How often you pay" value={cycle} onChange={setCycle} options={RECURRING.map((c) => ({ value: c as Cycle, label: CYCLE_CHOICE[c] }))} />
      <Benefits summary={`What ${tierInfo(tier).name} includes`} items={benefitsOf(tier)} />
      <p class="m-0 text-compact font-bold" aria-live="polite">
        {effect}
      </p>
      {!unchanged && <Signature sig={sig} ctx={ctx} company={s.companyName} errorOf={errorOf} />}
      <ResultNotice result={result} />
      <Actions>
        {!unchanged && (
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Changing…' : signedLabel(sig, 'Sign and change', 'Confirm the change')}
          </Button>
        )}
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </Actions>
    </form>
  );
}

/** Ending with the paid period, confirmed under the agreement; it can be taken back until then. */
function EndForm({ ctx, s, onDone, onCancel, focus }: { ctx: Ctx; s: SponsorView; onDone: (message: string) => void; onCancel: () => void; focus?: boolean }) {
  const [busy, setBusy] = useState(false);
  const sig = useSignature(ctx, s);
  const errs = useErrors();
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const textRef = useFocusWhen<HTMLParagraphElement>(!!focus);
  const focusError = useFocusFirstError(formRef);
  const errorOf = (k: string) => errs.errorOf(sig.local, k);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!sig.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    result.set(null);
    const r = await call<{ sponsor: SponsorView }>('/api/sponsorship/end', { json: sig.payload }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      if (r.field && SIGN_FIELDS.includes(r.field)) focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    const last = r.sponsor.lastDay ?? s.paidThrough;
    onDone(`Done. Your sponsorship ends${last ? ` after ${longDate(last)}` : ' with the period you paid for'}. Nothing more is charged, and you can keep it until then.`);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="flex flex-col gap-6">
      <p ref={textRef} tabIndex={-1} class={cx(body, 'outline-hidden')}>
        Your sponsorship ends with the period you paid for{s.paidThrough ? `, so your last day is ${longDate(s.paidThrough)}` : ''}. Nothing more is charged, and you can keep the
        sponsorship until then.
      </p>
      <Signature sig={sig} ctx={ctx} company={s.companyName} errorOf={errorOf} />
      <ResultNotice result={result} />
      <Actions>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Ending…' : signedLabel(sig, 'Sign and end the sponsorship', 'End the sponsorship')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </Actions>
    </form>
  );
}

/** At the bottom of the page, like a member's resignation. */
function EndSection({ ctx, s }: { ctx: Ctx; s: SponsorView }) {
  const [open, setOpen] = useState(false);
  const result = useResult();
  if (s.status === 'ending' && !result.message) return null;
  return (
    <section aria-labelledby="h-end" class="flex flex-col gap-4">
      <Heading id="h-end" size="card">
        End sponsorship
      </Heading>
      {result.message ? (
        <ResultNotice result={result} />
      ) : open ? (
        <div class={cardClass('outline', 'lg')}>
          <EndForm
            ctx={ctx}
            s={s}
            focus
            onDone={(text) => {
              setOpen(false);
              result.set({ tone: 'success', text });
              void ctx.reload();
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      ) : (
        <>
          <p class={hint}>You can end the sponsorship with the period you paid for. Nothing more is charged after that.</p>
          <Actions>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              End sponsorship
            </Button>
          </Actions>
        </>
      )}
    </section>
  );
}

/** Paid by bank transfer: add a card, charged only when the paid period ends. */
function AddCard({ ctx, s, cancelled, onCancel }: { ctx: Ctx; s: SponsorView; cancelled: boolean; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const sig = useSignature(ctx, s);
  const errs = useErrors();
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useFocusWhen<HTMLHeadingElement>(!cancelled);
  const focusError = useFocusFirstError(formRef);
  const errorOf = (k: string) => errs.errorOf(sig.local, k);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!sig.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    result.set(null);
    const r = await call<{ checkoutUrl: string }>('/api/sponsorship/start', { json: sig.payload }, ctx);
    if (!r) return;
    if (!r.ok) {
      setBusy(false);
      errs.setServer(r);
      if (r.field && SIGN_FIELDS.includes(r.field)) focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    location.assign(r.checkoutUrl);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate class="flex flex-col gap-6">
      <Heading as="h3" size="card" focus={headingRef}>
        Add a card
      </Heading>
      {cancelled && (
        <p role="status" class={note}>
          Payment not completed. Nothing was charged.
        </p>
      )}
      <p class={body}>
        You pay by bank transfer to ZurichJS today. With a card, Stripe charges {s.feeLabel} from then on.
        {s.paidUntil ? ` Nothing is charged before ${longDate(s.paidUntil)}.` : ''}
      </p>
      <p class={hint}>You add the card on Stripe’s secure page.</p>
      <Signature sig={sig} ctx={ctx} company={s.companyName} errorOf={errorOf} />
      <ResultNotice result={result} />
      <Actions>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Opening Stripe…' : signedLabel(sig, 'Sign and add a card', 'Add a card')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </Actions>
    </form>
  );
}

/* ------------------------------------------------------------------ start, finish, sponsor again */

interface Details {
  companyName: string;
  legalName: string;
  website: string;
  billingAddress: string;
  vatId: string;
}

const DETAIL_FIELDS: (keyof Details)[] = ['companyName', 'legalName', 'website', 'billingAddress', 'vatId'];

const detailsOf = (s: SponsorView | null): Details => ({
  companyName: s?.companyName ?? '',
  legalName: s?.legalName ?? '',
  website: s?.website ?? '',
  billingAddress: s?.billingAddress ?? '',
  vatId: s?.vatId ?? '',
});

/** Company and billing fields, shared by the start form and the details form. */
function DetailFields({ value, onChange, errorOf }: { value: Details; onChange: (d: Details) => void; errorOf: (k: string) => string }) {
  const field = (k: keyof Details) => ({
    value: value[k],
    invalid: !!errorOf(k),
    error: errorOf(k) || undefined,
    onInput: (e: Event) => onChange({ ...value, [k]: (e.target as HTMLInputElement | HTMLTextAreaElement).value }),
  });
  return (
    <div class="flex flex-col gap-5">
      <TextField label="Company name" name="companyName" autoComplete="organization" hint="As it should appear on zurichjs.com." {...field('companyName')} />
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField label={optional('Legal name')} name="legalName" {...field('legalName')} />
        <TextField label={optional('Website')} name="website" type="url" autoComplete="url" inputMode="url" placeholder="https://" {...field('website')} />
      </div>
      <TextArea label={optional('Billing address')} name="billingAddress" autoComplete="street-address" rows={4} hint="Shown on your receipts." {...field('billingAddress')} />
      <TextField label={optional('VAT number')} name="vatId" hint="For example CHE-123.456.789 MWST." {...field('vatId')} />
    </div>
  );
}

/**
 * Start a sponsorship, finish one that is waiting for its first payment (one we set up keeps our
 * plan; a bundle of meetups we priced is shown in the card above, not chosen), or sponsor again after one ended.
 */
function StartForm({ ctx, s, cancelled, focus, onCancel }: { ctx: Ctx; s: SponsorView | null; cancelled: boolean; focus?: boolean; onCancel?: () => void }) {
  const pendingNow = s?.status === 'pending';
  const bundle = pendingNow && s.source !== 'self_serve' && s.cycle === 'once';
  const [details, setDetails] = useState<Details>(detailsOf(s));
  const [tier, setTier] = useState<Tier>(s?.tier ?? 'friend');
  const [cycle, setCycle] = useState<Cycle>(s?.cycle ?? 'yearly');
  const [eventId, setEventId] = useState(pendingNow ? (s.meetups.at(0)?.eventId ?? '') : '');
  const [meetups, setMeetups] = useState<Meetup[] | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  /** A recurring offer where they cover the processing fee: they agree to it here, before Stripe. */
  const feeOffer = pendingNow && ctx.me.offer?.quote.interval && ctx.me.offer.quote.feeChoice === 'pass_through' ? ctx.me.offer.quote : null;
  const [acceptedFeeId, setAcceptedFeeId] = useState<string | null>(null);
  const acceptFee = !!feeOffer && acceptedFeeId === feeOffer.id;
  const sig = useSignature(ctx, s);
  const errs = useErrors();
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useFocusWhen<HTMLHeadingElement>(!!focus);
  const focusError = useFocusFirstError(formRef);
  const needMeetups = cycle === 'once' && !bundle;

  useEffect(() => {
    if (!needMeetups || meetups !== null) return;
    void call<{ meetups: Meetup[] }>('/api/sponsorship/meetups', { method: 'GET' }, ctx).then((r) => {
      if (r) setMeetups(r.ok ? r.meetups : 'error');
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once, when a one-time sponsorship is chosen
  }, [needMeetups]);

  const company = details.companyName.trim() || s?.companyName || '';
  const local: Record<string, string> = {
    companyName: details.companyName.trim() ? '' : 'Add the company name.',
    eventId: needMeetups && !eventId ? 'Choose the meetup you want to sponsor.' : '',
    ...sig.local,
  };
  const errorOf = (k: string) => errs.errorOf(local, k);
  const fields = [...DETAIL_FIELDS, 'eventId', 'tier', 'cycle', ...SIGN_FIELDS];
  const upcoming = Array.isArray(meetups) ? meetups : [];

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!Object.values(local).every((v) => !v)) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    result.set(null);
    const plan = bundle ? {} : { tier, cycle, eventId: cycle === 'once' ? eventId : undefined };
    const r = await call<{ checkoutUrl: string }>(
      '/api/sponsorship/start',
      { json: { ...details, ...plan, ...sig.payload, ...(feeOffer ? { acceptFee, quoteId: feeOffer.id } : {}) } },
      ctx,
    );
    if (!r) return;
    if (!r.ok) {
      setBusy(false);
      errs.setServer(r);
      if (r.field && fields.includes(r.field)) focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    location.assign(r.checkoutUrl);
  };

  const noMeetups =
    meetups === 'error'
      ? 'We couldn’t load the upcoming meetups. Reload the page, or write to us.'
      : 'There is no upcoming meetup to sponsor yet. Choose another option, or write to us.';
  const title = pendingNow ? 'Finish setting up' : s?.status === 'ended' ? 'Sponsor again' : 'Start a sponsorship';
  const intro = pendingNow
    ? s.source !== 'self_serve'
      ? `We set up this sponsorship with you. Add your billing details${s.hasContract ? '' : ', sign'} and pay.`
      : cancelled
        ? 'Check the details and continue to payment.'
        : 'Your payment was not completed, so nothing was charged. Check the details and continue.'
    : s?.status === 'ended'
      ? 'Thank you for sponsoring ZurichJS. Choose a tier and how often you pay, check your details and sign.'
      : null;

  return (
    <section id="start" aria-labelledby="h-start" class="flex flex-col gap-6">
      <div class="flex flex-col gap-3">
        <Heading id="h-start" size="subsection" focus={headingRef}>
          {title}
        </Heading>
        {intro ? (
          <p class={body}>{intro}</p>
        ) : (
          <p class={body}>
            Sponsor ZurichJS as a company. See the tiers on{' '}
            <a href="/partners" class={inlineLink}>
              the partners page
            </a>
            , or write to <Mail email={ctx.contactEmail} /> with questions first.
          </p>
        )}
      </div>
      {cancelled && (
        <p role="status" class={note}>
          Payment not completed. Nothing was charged.
        </p>
      )}
      <form ref={formRef} onSubmit={submit} noValidate class={cardClass('outline', 'lg', 'md:gap-10')}>
        {!bundle && (
          <fieldset class={fieldset}>
            <legend class={legend}>Plan</legend>
            <ChipGroup<Tier> label="Tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: `${t.name}, ${feeLabel(t.key, cycle)}` }))} />
            <ChipGroup<Cycle> label="How often you pay" value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c.key, label: CYCLE_CHOICE[c.key] }))} />
            {needMeetups &&
              (meetups === null ? (
                <p role="status" class={hint}>
                  Loading the upcoming meetups…
                </p>
              ) : upcoming.length ? (
                <SelectField
                  label="Meetup"
                  name="eventId"
                  value={eventId}
                  invalid={!!errorOf('eventId')}
                  error={errorOf('eventId') || undefined}
                  onChange={(e) => setEventId((e.target as HTMLSelectElement).value)}
                >
                  <option value="">Choose a meetup</option>
                  {upcoming.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}, {longDate(m.date)}
                    </option>
                  ))}
                </SelectField>
              ) : errorOf('eventId') ? (
                <Notice tone="danger" live title={noMeetups} />
              ) : (
                <p class={note}>{noMeetups}</p>
              ))}
            <Benefits summary={`What ${tierInfo(tier).name} includes`} items={benefitsOf(tier)} />
          </fieldset>
        )}

        <fieldset class={fieldset}>
          <legend class={legend}>Company and billing</legend>
          <DetailFields value={details} onChange={setDetails} errorOf={errorOf} />
        </fieldset>

        <fieldset class={fieldset}>
          <legend class={legend}>Payment</legend>
          <p class={body}>You pay by card on Stripe’s secure page.</p>
          {feeOffer && (
            <Checkbox
              label={`I agree to pay the card processing fee of ${feeOffer.surcharge} ${feeOffer.per}, a separate line on every renewal (${feeOffer.total} ${feeOffer.per} in total).`}
              checked={acceptFee}
              onChange={(e) => setAcceptedFeeId((e.target as HTMLInputElement).checked ? feeOffer.id : null)}
            />
          )}
        </fieldset>

        <Signature sig={sig} ctx={ctx} company={company} errorOf={errorOf} />

        <ResultNotice result={result} />
        <Actions>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Opening Stripe…' : sig.mode === 'contract' ? 'Continue to payment' : signedLabel(sig, 'Sign and continue to payment', 'Confirm and continue to payment')}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Actions>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ details, logo, colleagues, agreements */

function DetailsSection({ ctx, s }: { ctx: Ctx; s: SponsorView }) {
  const [editing, setEditing] = useState(false);
  const [details, setDetails] = useState<Details>(detailsOf(s));
  const [busy, setBusy] = useState(false);
  const errs = useErrors();
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const firstRef = useFocusWhen<HTMLDivElement>(editing);
  const focusError = useFocusFirstError(formRef);
  const local: Record<string, string> = { companyName: details.companyName.trim() ? '' : 'Add the company name.' };
  const errorOf = (k: string) => errs.errorOf(local, k);
  const none = <span class="font-normal text-grey-text">Not given</span>;

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (local.companyName) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    result.set(null);
    const r = await call('/api/sponsorship/details', { json: details }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      if (r.field && (DETAIL_FIELDS as string[]).includes(r.field)) focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    errs.setTried(false);
    setEditing(false);
    result.set({ tone: 'success', text: s.hasStripeCustomer ? 'Saved. Your next receipt shows these details.' : 'Saved.' });
    void ctx.reload();
  };

  return (
    <section aria-labelledby="h-details" class="flex flex-col gap-4">
      <Heading id="h-details" size="subsection">
        Company and billing details
      </Heading>
      {editing ? (
        <form ref={formRef} onSubmit={submit} noValidate class={cardClass('outline', 'lg')}>
          <div ref={firstRef} tabIndex={-1} class="outline-hidden">
            <DetailFields value={details} onChange={setDetails} errorOf={errorOf} />
          </div>
          <ResultNotice result={result} />
          <Actions>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save details'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDetails(detailsOf(s));
                errs.setTried(false);
                errs.setServer(null);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </Actions>
        </form>
      ) : (
        <>
          <div class={cardClass('outline', 'lg')}>
            <Rows
              rows={[
                ['Company name', s.companyName],
                ['Legal name', s.legalName || none],
                [
                  'Billing address',
                  s.billingAddress ? (
                    <span key="address" class="whitespace-pre-line">
                      {s.billingAddress}
                    </span>
                  ) : (
                    none
                  ),
                ],
                ['VAT number', s.vatId || none],
                ['Website', s.website || none],
              ]}
            />
            <Actions>
              <Button
                variant="secondary"
                onClick={() => {
                  result.set(null);
                  setDetails(detailsOf(s));
                  setEditing(true);
                }}
              >
                Edit details
              </Button>
            </Actions>
          </div>
          <ResultNotice result={result} />
        </>
      )}
    </section>
  );
}

function LogoSection({ ctx, s }: { ctx: Ctx; s: SponsorView }) {
  const latest = ctx.me.logos?.at(0);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState(0);
  const result = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);

  const pick = (f: File | null) => {
    result.set(null);
    setFile(f);
    if (!f) return setError(undefined);
    if (!LOGO_TYPES.split(',').includes(f.type)) return setError('Choose an SVG, PNG or WebP file.');
    if (f.size > LOGO_MAX) return setError('The file is larger than 2 MB. Choose a smaller one.');
    setError(undefined);
  };

  const upload = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!file || error) {
      if (!file) setError('Choose a logo file.');
      focusError();
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    result.set(null);
    const r = await call('/api/sponsorship/logo', { form }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      setError(r.error);
      focusError();
      return;
    }
    setFile(null);
    setPicker((n) => n + 1);
    result.set({ tone: 'success', text: 'Thank you. We put your new logo on zurichjs.com and the sponsor slides.' });
    void ctx.reload();
  };

  return (
    <section aria-labelledby="h-logo" class="flex flex-col gap-4">
      <Heading id="h-logo" size="subsection">
        Logo
      </Heading>
      <p class={body}>
        {latest ? 'Your latest logo. We put it on zurichjs.com and the sponsor slides.' : 'Upload your logo, and we put it on zurichjs.com and the sponsor slides.'}
      </p>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {latest && (
          <figure class="m-0 flex flex-col gap-3">
            <div class={cardClass('filled', 'lg', 'min-h-32 grow items-center justify-center')}>
              <img
                src={`/api/sponsorship/logo/${encodeURIComponent(latest.id)}`}
                alt={`${s.companyName} logo, latest upload`}
                class="block h-auto max-h-24 w-auto max-w-full object-contain"
              />
            </div>
            <figcaption class="flex min-w-0 flex-col gap-1 text-compact">
              <span class="font-bold break-all">{latest.filename}</span>
              <span class="break-words text-grey-text">
                Uploaded on {shortDate(latest.uploadedAt)} by {latest.uploadedBy === 'board' ? 'ZurichJS' : latest.uploadedBy}
              </span>
            </figcaption>
          </figure>
        )}
        <form ref={formRef} onSubmit={upload} noValidate class={cardClass('outline', 'lg')}>
          <FileField
            key={picker}
            label={latest ? 'Upload a new logo' : 'Upload your logo'}
            hint="SVG, PNG or WebP, up to 2 MB. A version for a white background works best."
            accept={LOGO_TYPES}
            fileName={file?.name ?? null}
            onFile={pick}
            invalid={!!error}
            error={error}
          />
          <Actions>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? 'Uploading…' : 'Upload logo'}
            </Button>
          </Actions>
        </form>
      </div>
      <ResultNotice result={result} />
    </section>
  );
}

function Colleagues({ ctx }: { ctx: Ctx }) {
  const { me } = ctx;
  const contacts = me.contacts ?? [];
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({ name: '', email: '', role: 'billing' });
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const errs = useErrors();
  const result = useResult();
  const listResult = useResult();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const local: Record<string, string> = {
    name: form.name.trim() ? '' : 'Add their name.',
    email: isEmail(form.email) ? '' : 'Enter an email like name@example.com.',
  };
  const errorOf = (k: string) => errs.errorOf(local, k);
  const full = contacts.length >= MAX_CONTACTS;

  const add = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    result.set(null);
    if (local.name || local.email) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy('add');
    errs.setServer(null);
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const r = await call('/api/sponsorship/contacts', { json: { name, email, role: form.role } }, ctx);
    setBusy('');
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      if (r.field === 'name' || r.field === 'email') focusError();
      else result.set({ tone: 'danger', text: r.error });
      return;
    }
    errs.setTried(false);
    result.set({ tone: 'success', text: `Tell ${name} to sign in at zurichjs.com/partners/account with ${email} to join.` });
    setForm({ name: '', email: '', role: 'billing' });
    void ctx.reload();
  };

  const remove = async (c: ContactView) => {
    setBusy(c.id);
    listResult.set(null);
    const r = await call(`/api/sponsorship/contacts/${encodeURIComponent(c.id)}`, { method: 'DELETE' }, ctx);
    setBusy('');
    setConfirm('');
    if (!r) return;
    if (!r.ok) return listResult.set({ tone: 'danger', text: r.error });
    listResult.set({ tone: 'success', text: `Done. ${c.name} is no longer on your sponsorship page.` });
    void ctx.reload();
  };

  return (
    <section aria-labelledby="h-colleagues" class="flex flex-col gap-4">
      <Heading id="h-colleagues" size="subsection">
        Colleagues
      </Heading>
      <p class={body}>Everyone listed can sign in here with their own email. Billing contacts get the payment emails and receipts; without one, they go to the primary contact.</p>
      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        {contacts.map((c) => {
          const self = c.id === me.contact?.id;
          return (
            <li key={c.id} class={cardClass('outline', 'md', 'md:flex-row md:items-center md:justify-between')}>
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-body font-bold break-words">{c.name}</span>
                  {self && <Tag tone="black">You</Tag>}
                  {c.pending && <Tag>Not joined yet</Tag>}
                </span>
                <span class="text-compact">{ROLE_LABEL[c.role]}</span>
                <span class="text-compact break-all text-grey-text">{c.email}</span>
              </div>
              {!self &&
                (confirm === c.id ? (
                  <div class="flex flex-col gap-3 md:items-end">
                    <span class="text-compact">Remove {c.name}?</span>
                    <Actions>
                      <Button variant="primary" disabled={!!busy} onClick={() => void remove(c)}>
                        {busy === c.id ? 'Removing…' : 'Remove'}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirm('')}>
                        Cancel
                      </Button>
                    </Actions>
                  </div>
                ) : (
                  <Actions>
                    <Button variant="secondary" disabled={!!busy} onClick={() => setConfirm(c.id)}>
                      Remove
                    </Button>
                  </Actions>
                ))}
            </li>
          );
        })}
      </ul>
      <ResultNotice result={listResult} />
      {full ? (
        <p class={hint}>A sponsorship can have up to {MAX_CONTACTS} people. Remove someone to add another.</p>
      ) : (
        <form ref={formRef} onSubmit={add} noValidate aria-labelledby="h-add" class={cardClass('outline', 'lg')}>
          <Heading as="h3" size="card" id="h-add">
            Add a colleague
          </Heading>
          <p class={hint}>We do not email them. They join by signing in here with the email you add.</p>
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <TextField
              label="Name"
              name="name"
              autoComplete="off"
              value={form.name}
              onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
              invalid={!!errorOf('name')}
              error={errorOf('name') || undefined}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="off"
              value={form.email}
              onInput={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })}
              invalid={!!errorOf('email')}
              error={errorOf('email') || undefined}
            />
          </div>
          <ChipGroup<Role>
            label="Role"
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            options={(['primary', 'billing', 'other'] as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
          <ResultNotice result={result} />
          <Actions>
            <Button type="submit" variant="primary" disabled={busy === 'add'}>
              {busy === 'add' ? 'Adding…' : 'Add colleague'}
            </Button>
          </Actions>
        </form>
      )}
    </section>
  );
}

function Agreements({ ctx }: { ctx: Ctx }) {
  const agreements = ctx.me.agreements ?? [];
  const contracts = ctx.me.contracts ?? [];
  return (
    <section aria-labelledby="h-agreements" class="flex flex-col gap-4">
      <Heading id="h-agreements" size="subsection">
        Agreements and contracts
      </Heading>
      {contracts.length > 0 && (
        <ul aria-label="Contracts" class="m-0 flex list-none flex-col gap-3 p-0">
          {contracts.map((d) => (
            <li key={d.id} class={cardClass('outline', 'md', 'md:flex-row md:items-center md:justify-between')}>
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="text-body font-bold break-all">{d.filename}</span>
                <span class="text-compact text-grey-text">{d.signedOn ? `Contract signed on ${longDate(d.signedOn)}` : 'Signed contract'}</span>
              </span>
              <Actions>
                <Button href={`/api/sponsorship/contracts/${encodeURIComponent(d.id)}`} variant="secondary">
                  Download
                </Button>
              </Actions>
            </li>
          ))}
        </ul>
      )}
      {agreements.length > 0 && (
        <ul aria-label="Signed agreements" class="m-0 flex list-none flex-col gap-3 p-0">
          {agreements.map((a) => (
            <li key={a.id} class={cardClass('outline', 'sm')}>
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-body font-bold">{a.summary}</span>
                <Tag>{CONTEXT_LABEL[a.context]}</Tag>
              </span>
              <span class="text-compact text-grey-text">
                Signed by {a.signerName}, {a.signerTitle}, on {longDate(a.acceptedAt)}. Agreement of {longDate(a.version)}.
              </span>
            </li>
          ))}
        </ul>
      )}
      {!agreements.length && !contracts.length && <p class={hint}>Each time someone signs the sponsorship agreement for your company, it is listed here.</p>}
      <p class={hint}>
        <AgreementLink>Read the current sponsorship agreement</AgreementLink>
      </p>
    </section>
  );
}
