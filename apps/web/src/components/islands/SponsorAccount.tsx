/**
 * The sponsor portal (/partners/account). Sign in with an emailed link (Better Auth, the
 * same sign-in as members; the session is an httpOnly cookie), then start a sponsorship,
 * finish one the board set up, or manage a running one: the plan, the board's proposals,
 * payment (Stripe), ending it, company details, the logo, colleagues and the signed
 * agreements. Every change that binds the company is signed under the sponsorship
 * agreement (AgreementBlock). The API is /api/sponsorship/*.
 *
 * Without accounts configured, the API answers 503 and the page says so.
 */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Button } from '@zurichjs/design/islands/Button';
import { Checkbox, ChipGroup, SelectField, TextArea, TextField, isEmail } from '@zurichjs/design/islands/Field';
import { badgeClass, cx, headingSizes, surfaceClass, type BadgeTone, type SurfaceTone } from '@zurichjs/design/recipes';
import { setSignedIn } from '@zurichjs/design/session';
import { AGREEMENT, CYCLES, INVOICE_DAYS, RECURRING, TIERS, changeTiming, cycleInfo, feeLabel, tierInfo, type Cycle, type Tier } from '@zurichjs/sponsorship';
import { longDate, shortDate } from '../../server/dates.ts';
import type { SponsorView, agreementView, contactView, logoView, proposalView } from '../../server/sponsor.ts';
import { SubmitButton, optional, useFocusFirstError, useFocusWhen } from './forms/shared.tsx';

type ContactView = ReturnType<typeof contactView>;
type AgreementView = ReturnType<typeof agreementView>;
type ProposalView = ReturnType<typeof proposalView>;
type LogoView = ReturnType<typeof logoView>;
type Role = ContactView['role'];
type PaymentChoice = 'card' | 'invoice';

interface PendingChange {
  tier: Tier;
  cycle: Cycle;
  /** The renewal it applies from (YYYY-MM-DD). */
  from: string;
}

interface Me {
  email: string;
  contact: ContactView | null;
  sponsor: SponsorView | null;
  contacts?: ContactView[];
  agreements?: AgreementView[];
  proposals?: ProposalView[];
  logos?: LogoView[];
  pendingChange?: PendingChange | null;
}

interface Meetup {
  id: string;
  title: string;
  date: string;
}

type View =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'signed-out'; notice?: string }
  | { kind: 'sent'; email: string }
  | { kind: 'ready'; me: Me }
  | { kind: 'error'; message: string };

type Fail = { error: string; field?: string };
type Result<T> = ({ ok: true } & T) | ({ ok: false } & Fail);

/** What every part of the portal needs: who to write to, and what to do when the session is gone or the data changed. */
interface Ctx {
  contactEmail: string;
  company: string;
  defaultSigner: string;
  onSignedOut: () => void;
  reload: () => void;
}

const h2 = cx('m-0 font-bold text-balance', headingSizes.md);
const h3 = 'm-0 text-xl font-bold text-balance';
const body = 'm-0 text-lg leading-relaxed text-ink-2 text-pretty';
const hint = 'm-0 text-base leading-normal text-grey-text text-pretty';
const card = 'flex flex-col gap-5 p-6 md:p-8';

const ROLE_LABEL: Record<Role, string> = { primary: 'Primary contact', billing: 'Billing contact', other: 'Colleague' };
const CONTEXT_LABEL: Record<AgreementView['context'], string> = { start: 'Sponsorship', change: 'Change', proposal: 'Board proposal' };
const REVIEW: Record<LogoView['review'], { label: string; tone: BadgeTone }> = {
  pending: { label: 'Waiting for review', tone: 'neutral' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'danger' },
};
const LOGO_TYPES = ['image/svg+xml', 'image/png', 'image/webp'];
const LOGO_MAX = 2 * 1024 * 1024;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const planName = (tier: Tier, cycle: Cycle) => `${tierInfo(tier).name}, ${feeLabel(tier, cycle)}`;
const canChange = (s: SponsorView) => (s.status === 'active' || s.status === 'past_due') && s.cycle !== 'once';

/** One JSON (or multipart) call to the portal API. 401 signs the page out; a network failure becomes an error sentence. */
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

/** Notices carried in the URL: an expired sign-in link, and the return from Stripe Checkout. */
function urlNotice() {
  const q = new URLSearchParams(location.search);
  const link = q.get('link') || q.get('error');
  const checkout = q.get('checkout');
  if (link || checkout) history.replaceState(history.state, '', location.pathname);
  return {
    link: link ? 'That sign-in link has expired or was already used. Ask for a new one below.' : undefined,
    checkout: checkout === 'done' || checkout === 'cancelled' ? checkout : undefined,
  };
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

/* ------------------------------------------------------------------ the agreement */

interface SignerState {
  accepted: boolean;
  name: string;
  title: string;
}

const SIGNER_FIELDS = ['agreement', 'signerName', 'signerTitle'];

function useSigner(defaultName: string) {
  const [value, set] = useState<SignerState>({ accepted: false, name: defaultName, title: '' });
  const local = {
    agreement: value.accepted ? '' : 'Accept the sponsorship agreement to continue.',
    signerName: value.name.trim() ? '' : 'Add your full name to sign.',
    signerTitle: value.title.trim() ? '' : 'Add your role at the company, for example Head of Marketing.',
  };
  return {
    value,
    set,
    local,
    valid: !local.agreement && !local.signerName && !local.signerTitle,
    payload: { signerName: value.name.trim(), signerTitle: value.title.trim(), agreementVersion: AGREEMENT.version },
  };
}

/**
 * The signature every binding change needs: the agreement (opens in a new tab), the tick on
 * behalf of the company, and who signs. A `field: 'agreement'` error after ticking means the
 * agreement changed since the page loaded, so the reader is asked to reload.
 */
function AgreementBlock({ company, signer, errorOf, stale }: { company: string; signer: ReturnType<typeof useSigner>; errorOf: (k: string) => string; stale: boolean }) {
  const id = useId();
  const tickError = stale ? 'The sponsorship agreement changed since this page loaded. Reload the page, read it again and accept the current version.' : errorOf('agreement');
  const set = (patch: Partial<SignerState>) => signer.set({ ...signer.value, ...patch });
  return (
    <fieldset class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend class="mb-2 p-0 text-xl font-bold">Sign the agreement</legend>
      <p class={hint}>
        Read the{' '}
        <a href={AGREEMENT.path} target="_blank" rel="noopener" class="font-bold text-black">
          sponsorship agreement
        </a>{' '}
        (opens in a new tab), version of {longDate(AGREEMENT.version)}. You sign it for the company, and everyone listed as a contact gets a copy by email.
      </p>
      <div class="flex flex-col gap-1.5">
        <Checkbox
          label={`I have read and accept the sponsorship agreement on behalf of ${company || 'the company'}.`}
          name="agreement"
          checked={signer.value.accepted}
          onChange={(e) => set({ accepted: (e.target as HTMLInputElement).checked })}
          aria-invalid={!!tickError || undefined}
          aria-describedby={tickError ? `${id}-agreement` : undefined}
        />
        {tickError && (
          <span id={`${id}-agreement`} class="flex flex-wrap items-center gap-3 pl-8.5 text-sm text-danger" aria-live="polite">
            {tickError}
            {stale && (
              <Button variant="link" class="text-sm text-black" onClick={() => location.reload()}>
                Reload the page
              </Button>
            )}
          </span>
        )}
      </div>
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TextField
          label="Your full name"
          name="signerName"
          autoComplete="name"
          value={signer.value.name}
          onInput={(e) => set({ name: (e.target as HTMLInputElement).value })}
          invalid={!!errorOf('signerName')}
          error={errorOf('signerName') || undefined}
        />
        <TextField
          label="Your role at the company"
          name="signerTitle"
          autoComplete="organization-title"
          value={signer.value.title}
          onInput={(e) => set({ title: (e.target as HTMLInputElement).value })}
          invalid={!!errorOf('signerTitle')}
          error={errorOf('signerTitle') || undefined}
        />
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ small pieces */

function Notice({ tone, alert, children }: { tone: SurfaceTone; alert?: boolean; children: ComponentChildren }) {
  return (
    <div role={alert ? 'alert' : 'status'} class={surfaceClass(tone, 'flex flex-col gap-3 px-5 py-4 text-base font-bold leading-normal')}>
      {children}
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl class="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-x-6 gap-y-4">
      {rows.map(([k, v]) => (
        <div key={k} class="flex flex-col gap-0.5">
          <dt class="text-base text-grey-text">{k}</dt>
          <dd class="m-0 text-lg font-bold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ the page */

export default function SponsorAccount({ contactEmail }: { contactEmail: string }) {
  const [view, setView] = useState<View>({ kind: 'loading' });
  // Read from the URL in the browser only (the page is prerendered).
  const [notice, setNotice] = useState<ReturnType<typeof urlNotice>>({ link: undefined, checkout: undefined });
  const [invoice, setInvoice] = useState<{ url: string | null } | null>(null);
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const sentRef = useFocusWhen<HTMLDivElement>(view.kind === 'sent');

  const signedOut = () => {
    setSignedIn(false);
    setView({ kind: 'signed-out' });
  };

  const load = async (n: ReturnType<typeof urlNotice>, attempt = 0): Promise<void> => {
    const res = await fetch('/api/sponsorship/me', { credentials: 'same-origin' }).catch(() => null);
    if (!res) return setView({ kind: 'error', message: 'We couldn’t reach the site. Check your connection and reload.' });
    if (res.status === 401) {
      setSignedIn(false);
      return setView({ kind: 'signed-out', notice: n.link });
    }
    if (res.status === 503) return setView({ kind: 'unavailable' });
    const data = (await res.json().catch(() => ({}))) as Partial<Me> & { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) return setView({ kind: 'error', message: data.error ?? `We couldn’t load your sponsorship. Try again, or write to ${contactEmail}.` });
    const me = data as Me;
    setView({ kind: 'ready', me });
    // Back from Stripe: Stripe's webhook confirms the payment a few seconds later.
    const s = me.sponsor;
    if (n.checkout === 'done' && s && (s.status === 'pending' || s.paymentMode === 'manual') && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000));
      return load(n, attempt + 1);
    }
  };

  useEffect(() => {
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
      body: JSON.stringify({ email: address, callbackURL: '/partners/account', errorCallbackURL: '/partners/account?link=invalid' }),
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

  const mail = (
    <a href={`mailto:${contactEmail}`} class="font-bold text-black">
      {contactEmail}
    </a>
  );

  if (view.kind === 'loading')
    return (
      <p class={body} aria-busy="true">
        Loading your sponsorship…
      </p>
    );

  if (view.kind === 'unavailable')
    return <p class={cx(body, 'max-w-2xl')}>Sponsor accounts are not available yet. To sponsor ZurichJS or ask about your sponsorship, write to {mail}.</p>;

  if (view.kind === 'error')
    return (
      <div class="flex max-w-2xl flex-col gap-4">
        <Notice tone="danger" alert>
          {view.message}
        </Notice>
        <Button variant="outline-black" class="self-start" onClick={() => location.reload()}>
          Try again
        </Button>
      </div>
    );

  if (view.kind === 'sent')
    return (
      <div ref={sentRef} tabIndex={-1} role="status" class={surfaceClass('success', 'flex max-w-2xl flex-col gap-3 p-6 outline-hidden md:p-8')}>
        <h2 class={h3}>Check your email</h2>
        <p class="m-0 text-lg leading-relaxed">We sent a sign-in link to {view.email}. It works once, for 15 minutes.</p>
        <Button variant="link" class="self-start" onClick={() => setView({ kind: 'signed-out' })}>
          Use another email
        </Button>
      </div>
    );

  if (view.kind === 'signed-out')
    return (
      <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-8 md:gap-20">
        <div class="flex flex-col gap-3.5">
          <h2 class={cx('m-0 font-bold text-balance', headingSizes.lg)}>Sign in</h2>
          <p class={body}>
            Sign in with your work email to start a sponsorship or to manage your company’s. We email you a link, so there is no password to remember. Colleagues your company added
            can sign in with their own email.
          </p>
        </div>
        <form onSubmit={requestLink} noValidate class={surfaceClass('grey', card)}>
          {view.notice && (
            <Notice tone="danger" alert>
              {view.notice}
            </Notice>
          )}
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
          {formError && (
            <p role="alert" class="m-0 text-base text-danger">
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
  const s = me.sponsor;
  const ctx: Ctx = {
    contactEmail,
    company: s?.companyName ?? '',
    defaultSigner: me.contact?.name ?? '',
    onSignedOut: signedOut,
    reload: () => void load({ link: undefined, checkout: undefined }),
  };
  const confirming = notice.checkout === 'done' && s && (s.status === 'pending' || s.paymentMode === 'manual');

  return (
    <div class="flex max-w-5xl flex-col gap-10">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="m-0 text-base text-ink-2">
          Signed in as <strong class="text-black">{me.email}</strong>
        </p>
        <Button variant="outline-black" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>

      {notice.checkout === 'done' && confirming && (
        <p role="status" class={surfaceClass('grey', 'm-0 px-5 py-4 text-base')}>
          Stripe is confirming your payment. This page updates in a moment.
        </p>
      )}
      {notice.checkout === 'done' && s && !confirming && <Notice tone="success">Thank you. Your payment is set up and your sponsorship is running.</Notice>}
      {notice.checkout === 'cancelled' && (
        <p role="status" class={surfaceClass('grey', 'm-0 px-5 py-4 text-base')}>
          The payment was not completed, so nothing was charged. You can try again below.
        </p>
      )}
      {invoice && (
        <Notice tone="success">
          {invoice.url
            ? `Thank you. Stripe emailed the invoice to your billing contact. It is due in ${INVOICE_DAYS} days, and you can pay it by bank transfer or card.`
            : 'Thank you. Payment by invoice is set up. Stripe emails each invoice to your billing contact.'}
          {invoice.url && (
            <Button href={invoice.url} variant="outline-black" size="sm" class="self-start" external>
              Open the invoice
            </Button>
          )}
        </Notice>
      )}

      {s?.status === 'ended' && <Summary s={s} ctx={ctx} />}
      {!s || s.status === 'pending' || s.status === 'ended' ? (
        <StartForm me={me} ctx={ctx} onInvoice={(url) => setInvoice({ url })} />
      ) : (
        <Running me={me} s={s} ctx={ctx} onInvoice={(url) => setInvoice({ url })} />
      )}

      {s && (
        <>
          {s.status !== 'pending' && s.status !== 'ended' && <DetailsForm s={s} ctx={ctx} />}
          <LogoSection s={s} logos={me.logos ?? []} ctx={ctx} />
          <Colleagues me={me} ctx={ctx} />
          <Agreements agreements={me.agreements ?? []} />
        </>
      )}
    </div>
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
function DetailFields({ value, onChange, errorOf, invoice }: { value: Details; onChange: (d: Details) => void; errorOf: (k: string) => string; invoice: boolean }) {
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
        <TextField label={optional('Legal name')} name="legalName" hint="If it differs, for the invoices." {...field('legalName')} />
        <TextField label={optional('Website')} name="website" type="url" autoComplete="url" inputMode="url" placeholder="https://" {...field('website')} />
      </div>
      <TextArea
        label={invoice ? 'Billing address' : optional('Billing address')}
        name="billingAddress"
        autoComplete="street-address"
        rows={4}
        hint={invoice ? 'Shown on every invoice.' : 'Needed to pay by invoice.'}
        {...field('billingAddress')}
      />
      <TextField label={optional('VAT number')} name="vatId" hint="For example CHE-123.456.789 MWST." {...field('vatId')} />
    </div>
  );
}

function StartForm({ me, ctx, onInvoice }: { me: Me; ctx: Ctx; onInvoice: (url: string | null) => void }) {
  const prev = me.sponsor;
  const [details, setDetails] = useState<Details>(detailsOf(prev));
  const [tier, setTier] = useState<Tier>(prev?.tier ?? 'friend');
  const [cycle, setCycle] = useState<Cycle>(prev?.cycle ?? 'yearly');
  const [eventId, setEventId] = useState(prev?.meetup?.id ?? '');
  const [payment, setPayment] = useState<PaymentChoice>(prev?.paymentMode === 'invoice' ? 'invoice' : 'card');
  const [meetups, setMeetups] = useState<Meetup[] | 'error' | null>(null);
  const [busy, setBusy] = useState(false);
  const signer = useSigner(ctx.defaultSigner);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);

  useEffect(() => {
    void call<{ meetups: Meetup[] }>('/api/sponsorship/meetups', { method: 'GET' }, ctx).then((r) => {
      if (!r) return;
      setMeetups(r.ok ? r.meetups : 'error');
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const company = details.companyName.trim() || ctx.company;
  const local: Record<string, string> = {
    companyName: details.companyName.trim() ? '' : 'Add the company name.',
    billingAddress: payment === 'invoice' && !details.billingAddress.trim() ? 'Add the billing address for the invoices.' : '',
    eventId: cycle === 'once' && !eventId ? 'Choose the meetup you want to sponsor.' : '',
    ...signer.local,
  };
  const errorOf = (k: string) => errs.errorOf(local, k);
  const valid = Object.values(local).every((v) => !v);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    const r = await call<{ checkoutUrl: string | null; invoiceUrl: string | null }>(
      '/api/sponsorship/start',
      { json: { ...details, tier, cycle, eventId: cycle === 'once' ? eventId : undefined, paymentMode: payment, ...signer.payload } },
      ctx,
    );
    if (!r) return;
    if (!r.ok) {
      setBusy(false);
      errs.setServer(r);
      focusError();
      return;
    }
    if (r.checkoutUrl) return location.assign(r.checkoutUrl);
    setBusy(false);
    onInvoice(r.invoiceUrl);
    ctx.reload();
  };

  const title = prev?.status === 'pending' ? 'Finish setting up' : prev?.status === 'ended' ? 'Sponsor again' : 'Start a sponsorship';
  const intro =
    prev?.status === 'pending'
      ? prev.source === 'invited' && !prev.hasStripeCustomer
        ? 'The board set up this sponsorship with you. Check the details and the plan, sign the agreement and choose how to pay.'
        : 'Payment for this sponsorship was not completed, so nothing was charged. Check the details and continue.'
      : prev?.status === 'ended'
        ? 'Your last sponsorship has ended. Thank you for it. You are welcome to sponsor ZurichJS again.'
        : 'Sponsor ZurichJS as a company. Fill in the company’s details, choose a tier and how often to pay, and sign the sponsorship agreement.';
  const fields = [...DETAIL_FIELDS, 'eventId', ...SIGNER_FIELDS];
  const upcoming = Array.isArray(meetups) ? meetups : [];

  return (
    <section aria-labelledby="h-start" class="flex flex-col gap-6">
      <div class="flex max-w-3xl flex-col gap-3">
        <h2 id="h-start" class={cx('m-0 font-bold text-balance', headingSizes.lg)}>
          {title}
        </h2>
        <p class={body}>{intro}</p>
        <p class={hint}>
          Questions first? Write to{' '}
          <a href={`mailto:${ctx.contactEmail}`} class="font-bold text-black">
            {ctx.contactEmail}
          </a>
          , or see the tiers on{' '}
          <a href="/partners" class="font-bold text-black">
            the partners page
          </a>
          .
        </p>
      </div>
      <form ref={formRef} onSubmit={submit} noValidate class={surfaceClass('grey', 'flex flex-col gap-10 p-6 md:p-8')}>
        <fieldset class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <legend class="mb-2 p-0 text-xl font-bold">Company</legend>
          <DetailFields value={details} onChange={setDetails} errorOf={errorOf} invoice={payment === 'invoice'} />
        </fieldset>

        <fieldset class="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
          <legend class="mb-2 p-0 text-xl font-bold">Plan</legend>
          <ChipGroup<Cycle> label="Billing" value={cycle} onChange={setCycle} options={CYCLES.map((c) => ({ value: c.key, label: c.label }))} />
          <ChipGroup<Tier> label="Tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: `${t.name}, ${feeLabel(t.key, cycle)}` }))} />
          {cycle === 'once' &&
            (meetups === null ? (
              <p class={hint} aria-busy="true">
                Loading the upcoming meetups…
              </p>
            ) : upcoming.length ? (
              <SelectField
                label="Meetup"
                name="eventId"
                value={eventId}
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
            ) : (
              <p role={errorOf('eventId') ? 'alert' : undefined} class={cx(hint, errorOf('eventId') && 'text-danger')}>
                {meetups === 'error'
                  ? `We couldn’t load the upcoming meetups. Reload the page, or write to ${ctx.contactEmail}.`
                  : `There is no upcoming meetup to sponsor yet. Choose another billing, or write to ${ctx.contactEmail}.`}
              </p>
            ))}
          <p class={hint} aria-live="polite">
            {tierInfo(tier).name}, {feeLabel(tier, cycle)}.{' '}
            {cycle === 'once' ? 'One payment, for the meetup you choose.' : `It renews each ${cycleInfo(cycle).unit} until you end it here.`}
          </p>
        </fieldset>

        <fieldset class="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
          <legend class="mb-2 p-0 text-xl font-bold">Payment</legend>
          <PaymentChoiceField label="How you pay" value={payment} onChange={setPayment} cycle={cycle} />
        </fieldset>

        <AgreementBlock company={company} signer={signer} errorOf={errorOf} stale={errs.server?.field === 'agreement' && signer.value.accepted} />

        {errs.general(fields) && (
          <Notice tone="danger" alert>
            {errs.general(fields)}
          </Notice>
        )}
        <SubmitButton busy={busy} class="self-start">
          {busy ? (payment === 'card' ? 'Opening Stripe…' : 'Sending the invoice…') : payment === 'card' ? 'Sign and continue to payment' : 'Sign and send the invoice'}
        </SubmitButton>
      </form>
    </section>
  );
}

function PaymentChoiceField({ label, value, onChange, cycle }: { label: string; value: PaymentChoice; onChange: (v: PaymentChoice) => void; cycle: Cycle }) {
  return (
    <div class="flex flex-col gap-2">
      <ChipGroup<PaymentChoice>
        label={label}
        value={value}
        onChange={onChange}
        options={[
          { value: 'card', label: 'By card' },
          { value: 'invoice', label: 'By invoice' },
        ]}
      />
      <p class={hint} aria-live="polite">
        {value === 'card'
          ? `You pay with Stripe Checkout. ${cycle === 'once' ? 'The card is charged once.' : `Stripe charges the card each ${cycleInfo(cycle).unit}.`}`
          : `Stripe emails an invoice to your billing contact, due in ${INVOICE_DAYS} days. You can pay it by bank transfer or card.`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ a running sponsorship */

function Summary({ s, ctx, children }: { s: SponsorView; ctx: Ctx; children?: ComponentChildren }) {
  const rows: [string, string][] = [
    ['Tier', s.tierName],
    ['Fee', s.feeLabel],
    ['Payment', s.paymentLabel],
    ['Status', capital(s.statusLabel)],
    ...(s.meetup?.title ? ([['Meetup', `${s.meetup.title}${s.meetup.date ? `, ${longDate(s.meetup.date)}` : ''}`]] as [string, string][]) : []),
    ...(s.paidThrough && s.status !== 'ended' ? ([['Paid through', longDate(s.paidThrough)]] as [string, string][]) : []),
    ...(s.lastDay ? ([['Last day', longDate(s.lastDay)]] as [string, string][]) : []),
    ...(s.startedAt ? ([['Sponsor since', longDate(s.startedAt)]] as [string, string][]) : []),
  ];
  return (
    <section aria-labelledby="h-summary" class={surfaceClass('grey', card)}>
      <h2 id="h-summary" class={h2}>
        {ctx.company}
      </h2>
      <Rows rows={rows} />
      {children}
    </section>
  );
}

function Running({ me, s, ctx, onInvoice }: { me: Me; s: SponsorView; ctx: Ctx; onInvoice: (url: string | null) => void }) {
  const [busy, setBusy] = useState<'' | 'portal' | 'undo' | 'keep'>('');
  const [error, setError] = useState('');
  const [changing, setChanging] = useState(false);
  const [done, setDone] = useState('');
  const pending = me.pendingChange ?? null;

  const post = async <T extends object>(path: string, what: typeof busy, json: object = {}) => {
    setBusy(what);
    setError('');
    setDone('');
    const r = await call<T>(path, { json }, ctx);
    setBusy('');
    if (!r) return null;
    if (!r.ok) {
      setError(r.error);
      return null;
    }
    return r;
  };

  return (
    <div class="flex flex-col gap-8">
      {pending && canChange(s) && (
        <section aria-label="Scheduled change" class={surfaceClass('yellow-soft', 'flex flex-wrap items-center justify-between gap-4 p-5 md:p-6')}>
          <p role="status" class="m-0 text-base">
            From <strong>{longDate(pending.from)}</strong>, your sponsorship is {planName(pending.tier, pending.cycle)}.
          </p>
          <Button
            variant="outline-black"
            size="sm"
            disabled={!!busy}
            onClick={async () => {
              if (await post('/api/sponsorship/plan', 'keep', { tier: s.tier, cycle: s.cycle })) {
                setDone('Your current plan stays. The scheduled change is cancelled.');
                ctx.reload();
              }
            }}
          >
            {busy === 'keep' ? 'Keeping…' : 'Keep current plan'}
          </Button>
        </section>
      )}

      {(me.proposals ?? []).map((p) => (
        <Proposal key={p.id} p={p} s={s} ctx={ctx} />
      ))}

      {s.paymentMode === 'manual' && s.status === 'active' && s.cycle !== 'once' && <ManualSetup s={s} ctx={ctx} onInvoice={onInvoice} />}

      <Summary s={s} ctx={ctx}>
        {s.status === 'past_due' && (
          <Notice tone="danger">
            {s.paymentMode === 'invoice'
              ? 'The latest invoice is overdue. Pay it, or change how you pay, under Payment details and invoices.'
              : 'Your last payment did not go through. Stripe will try again. Update the card under Payment details and invoices.'}
          </Notice>
        )}
        {s.status === 'ending' && (
          <p class={body}>
            Your sponsorship ends {s.lastDay ? `after ${longDate(s.lastDay)}` : 'at the end of the period you paid for'}. Nothing more is charged. You can keep the sponsorship
            until then.
          </p>
        )}
        {s.cycle === 'once' && s.status !== 'ending' && <p class={body}>A one-meetup sponsorship ends by itself after the meetup.</p>}
        {done && <Notice tone="success">{done}</Notice>}
        {(s.status === 'ending' || s.hasStripeCustomer || canChange(s)) && (
          <div class="flex flex-wrap gap-3">
            {s.status === 'ending' && (
              <Button
                variant="yellow"
                disabled={!!busy}
                onClick={async () => {
                  if (await post('/api/sponsorship/end/undo', 'undo')) {
                    setDone('Thank you. Your sponsorship continues as before.');
                    ctx.reload();
                  }
                }}
              >
                {busy === 'undo' ? 'Keeping…' : 'Keep the sponsorship'}
              </Button>
            )}
            {s.hasStripeCustomer && (
              <Button
                variant="black"
                disabled={!!busy}
                onClick={async () => {
                  const r = await post<{ url: string }>('/api/sponsorship/portal', 'portal');
                  if (r?.ok) location.assign(r.url);
                }}
              >
                {busy === 'portal' ? 'Opening Stripe…' : 'Payment details and invoices'}
              </Button>
            )}
            {canChange(s) && (
              <Button variant="outline-black" disabled={!!busy} onClick={() => setChanging(!changing)} aria-expanded={changing} aria-controls="change-plan">
                Change tier or billing
              </Button>
            )}
          </div>
        )}
        {error && (
          <Notice tone="danger" alert>
            {error}
          </Notice>
        )}
        {canChange(s) && changing && (
          <ChangePlan
            s={s}
            pending={pending}
            ctx={ctx}
            onDone={(message) => {
              setChanging(false);
              setDone(message);
              ctx.reload();
            }}
            onCancel={() => setChanging(false)}
          />
        )}
      </Summary>

      {canChange(s) && <EndSection s={s} ctx={ctx} />}
    </div>
  );
}

/** A change the board proposed after talking with the sponsor. Accepting signs the agreement for it. */
function Proposal({ p, s, ctx }: { p: ProposalView; s: SponsorView; ctx: Ctx }) {
  const [accepting, setAccepting] = useState(false);
  const [busy, setBusy] = useState<'' | 'accept' | 'decline'>('');
  const signer = useSigner(ctx.defaultSigner);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const errorOf = (k: string) => errs.errorOf(signer.local, k);
  const what =
    p.kind === 'end'
      ? `End the sponsorship at the end of the period you paid for${s.paidThrough ? `, ${longDate(s.paidThrough)}` : ''}.`
      : p.plan
        ? `Change the sponsorship to ${p.plan}.`
        : 'Change the sponsorship.';

  const answer = async (decision: 'accept' | 'decline') => {
    if (busy) return;
    if (decision === 'accept' && !signer.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(decision);
    errs.setServer(null);
    const r = await call(`/api/sponsorship/proposals/${encodeURIComponent(p.id)}`, { json: decision === 'accept' ? { decision, ...signer.payload } : { decision } }, ctx);
    setBusy('');
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      focusError();
      return;
    }
    ctx.reload();
  };

  return (
    <section aria-labelledby={`h-proposal-${p.id}`} class={surfaceClass('yellow-soft', 'flex flex-col gap-4 p-5 md:p-6')}>
      <h2 id={`h-proposal-${p.id}`} class={h3}>
        A proposal from the board
      </h2>
      <p class="m-0 text-lg font-bold leading-relaxed">{what}</p>
      {p.message && <p class="m-0 text-lg leading-relaxed whitespace-pre-line text-ink-2">{p.message}</p>}
      <p class={hint}>
        Sent on {longDate(p.createdAt)}. Answer by {longDate(p.expiresAt)}. Nothing changes unless you accept it.
      </p>
      {accepting ? (
        <form
          ref={formRef}
          noValidate
          class={surfaceClass('white', 'flex flex-col gap-6 p-5 md:p-6')}
          onSubmit={(e) => {
            e.preventDefault();
            void answer('accept');
          }}
        >
          <AgreementBlock company={ctx.company} signer={signer} errorOf={errorOf} stale={errs.server?.field === 'agreement' && signer.value.accepted} />
          {errs.general(SIGNER_FIELDS) && (
            <Notice tone="danger" alert>
              {errs.general(SIGNER_FIELDS)}
            </Notice>
          )}
          <div class="flex flex-wrap gap-3">
            <SubmitButton busy={busy === 'accept'} size="md">
              {busy === 'accept' ? 'Accepting…' : 'Sign and accept'}
            </SubmitButton>
            <Button variant="outline-black" disabled={!!busy} onClick={() => setAccepting(false)}>
              Not now
            </Button>
          </div>
        </form>
      ) : (
        <>
          {errs.server && (
            <Notice tone="danger" alert>
              {errs.server.error}
            </Notice>
          )}
          <div class="flex flex-wrap gap-3">
            <Button variant="black" disabled={!!busy} onClick={() => setAccepting(true)}>
              Accept
            </Button>
            <Button variant="outline-black" disabled={!!busy} onClick={() => void answer('decline')}>
              {busy === 'decline' ? 'Declining…' : 'Decline'}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

const TIMING: Record<'now' | 'renewal', (renewal: string | null) => string> = {
  now: () => 'This applies now. Stripe charges only the difference for this term.',
  renewal: (renewal) => `This applies from your next renewal${renewal ? `, on ${longDate(renewal)}` : ''}. Nothing is charged now.`,
};

function ChangePlan({ s, pending, ctx, onDone, onCancel }: { s: SponsorView; pending: PendingChange | null; ctx: Ctx; onDone: (message: string) => void; onCancel: () => void }) {
  const [tier, setTier] = useState<Tier>(pending?.tier ?? s.tier);
  const [cycle, setCycle] = useState<Cycle>(pending?.cycle ?? s.cycle);
  const [busy, setBusy] = useState(false);
  const signer = useSigner(ctx.defaultSigner);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const timing = changeTiming({ tier: s.tier, cycle: s.cycle }, { tier, cycle });
  const unchanged = timing === 'none' || (pending?.tier === tier && pending.cycle === cycle);
  const errorOf = (k: string) => errs.errorOf(signer.local, k);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy || unchanged) return;
    if (!signer.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    const r = await call<{ timing: 'none' | 'now' | 'renewal'; from: string | null }>('/api/sponsorship/plan', { json: { tier, cycle, ...signer.payload } }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      focusError();
      return;
    }
    const plan = planName(tier, cycle);
    onDone(
      r.timing === 'now'
        ? `Done. Your sponsorship is now ${plan}. Stripe charges the difference for this term.`
        : r.timing === 'renewal'
          ? `Done. From ${r.from ? longDate(r.from) : 'your next renewal'}, your sponsorship is ${plan}.`
          : 'Your current plan stays.',
    );
  };

  return (
    <form
      id="change-plan"
      ref={formRef}
      onSubmit={submit}
      noValidate
      aria-labelledby="h-plan"
      class={surfaceClass('white', 'flex flex-col gap-6 border border-grey-frame p-5 md:p-6')}
    >
      <h3 id="h-plan" class={h3}>
        Change tier or billing
      </h3>
      <ChipGroup<Cycle> label="New billing" value={cycle} onChange={setCycle} options={RECURRING.map((c) => ({ value: c as Cycle, label: cycleInfo(c).label }))} />
      <ChipGroup<Tier> label="New tier" value={tier} onChange={setTier} options={TIERS.map((t) => ({ value: t.key, label: `${t.name}, ${feeLabel(t.key, cycle)}` }))} />
      <p class={cx(hint, 'font-bold text-black')} aria-live="polite">
        {timing === 'none'
          ? 'This is your current plan.'
          : pending?.tier === tier && pending.cycle === cycle
            ? `This change is already scheduled for ${longDate(pending.from)}.`
            : `${planName(tier, cycle)}. ${TIMING[timing](s.paidUntil)}`}
      </p>
      {!unchanged && <AgreementBlock company={ctx.company} signer={signer} errorOf={errorOf} stale={errs.server?.field === 'agreement' && signer.value.accepted} />}
      {errs.general(SIGNER_FIELDS) && (
        <Notice tone="danger" alert>
          {errs.general(SIGNER_FIELDS)}
        </Notice>
      )}
      <div class="flex flex-wrap gap-3">
        {!unchanged && (
          <SubmitButton busy={busy} size="md">
            {busy ? 'Changing…' : 'Sign and change'}
          </SubmitButton>
        )}
        <Button variant="outline-black" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** Ending with the paid period, signed under the agreement; it can be taken back until then. */
function EndSection({ s, ctx }: { s: SponsorView; ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const signer = useSigner(ctx.defaultSigner);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const errorOf = (k: string) => errs.errorOf(signer.local, k);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!signer.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    const r = await call('/api/sponsorship/end', { json: signer.payload }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      focusError();
      return;
    }
    ctx.reload();
  };

  return (
    <section aria-labelledby="h-end" class="flex max-w-3xl flex-col gap-3">
      <h2 id="h-end" class={h3}>
        Ending the sponsorship
      </h2>
      <p class={hint}>
        You can end the sponsorship at the end of the period you paid for{s.paidThrough ? ` (${longDate(s.paidThrough)})` : ''}. Nothing more is charged after that, and you can
        keep the sponsorship until then.
      </p>
      {open ? (
        <form ref={formRef} onSubmit={submit} noValidate class={surfaceClass('grey', 'flex flex-col gap-6 p-5 md:p-6')}>
          <AgreementBlock company={ctx.company} signer={signer} errorOf={errorOf} stale={errs.server?.field === 'agreement' && signer.value.accepted} />
          {errs.general(SIGNER_FIELDS) && (
            <Notice tone="danger" alert>
              {errs.general(SIGNER_FIELDS)}
            </Notice>
          )}
          <div class="flex flex-wrap gap-3">
            <SubmitButton busy={busy} variant="danger" size="md">
              {busy ? 'Ending…' : 'Sign and end the sponsorship'}
            </SubmitButton>
            <Button variant="outline-black" onClick={() => setOpen(false)}>
              Keep the sponsorship
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline-black" class="self-start" onClick={() => setOpen(true)}>
          End sponsorship
        </Button>
      )}
    </section>
  );
}

/** A sponsorship paid directly to the association moves to Stripe; nothing is charged before the paid period ends. */
function ManualSetup({ s, ctx, onInvoice }: { s: SponsorView; ctx: Ctx; onInvoice: (url: string | null) => void }) {
  const [payment, setPayment] = useState<PaymentChoice>('card');
  const [busy, setBusy] = useState(false);
  const signer = useSigner(ctx.defaultSigner);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const errorOf = (k: string) => errs.errorOf(signer.local, k);
  const fields = [...SIGNER_FIELDS];

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!signer.valid) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    const r = await call<{ checkoutUrl: string | null; invoiceUrl: string | null }>('/api/sponsorship/start', { json: { paymentMode: payment, ...signer.payload } }, ctx);
    if (!r) return;
    if (!r.ok) {
      setBusy(false);
      errs.setServer(r);
      focusError();
      return;
    }
    if (r.checkoutUrl) return location.assign(r.checkoutUrl);
    setBusy(false);
    onInvoice(r.invoiceUrl);
    ctx.reload();
  };

  return (
    <section aria-labelledby="h-manual" class={surfaceClass('yellow-soft', 'flex flex-col gap-4 p-5 md:p-6')}>
      <h2 id="h-manual" class={h3}>
        Set up card or invoice payment
      </h2>
      <p class={body}>
        Your sponsorship is paid directly to the association today. Set up payment with Stripe: nothing is charged before your paid period ends
        {s.paidThrough ? ` (${longDate(s.paidThrough)})` : ''}, then {s.feeLabel}.
      </p>
      <form ref={formRef} onSubmit={submit} noValidate class={surfaceClass('white', 'flex flex-col gap-6 p-5 md:p-6')}>
        <PaymentChoiceField label="Payment method" value={payment} onChange={setPayment} cycle={s.cycle} />
        <AgreementBlock company={ctx.company} signer={signer} errorOf={errorOf} stale={errs.server?.field === 'agreement' && signer.value.accepted} />
        {errs.general(fields) && (
          <Notice tone="danger" alert>
            {errs.general(fields)}
            {errs.server?.field === 'billingAddress' && ' You can add it under Company and billing details below.'}
          </Notice>
        )}
        <SubmitButton busy={busy} size="md" class="self-start">
          {busy ? (payment === 'card' ? 'Opening Stripe…' : 'Setting up…') : payment === 'card' ? 'Sign and add a card' : 'Sign and pay by invoice'}
        </SubmitButton>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ details, logo, colleagues, agreements */

function DetailsForm({ s, ctx }: { s: SponsorView; ctx: Ctx }) {
  const [details, setDetails] = useState<Details>(detailsOf(s));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const local: Record<string, string> = {
    companyName: details.companyName.trim() ? '' : 'Add the company name.',
    billingAddress: s.paymentMode === 'invoice' && !details.billingAddress.trim() ? 'You pay by invoice, so keep a billing address.' : '',
  };
  const errorOf = (k: string) => errs.errorOf(local, k);

  const submit = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    setSaved(false);
    if (Object.values(local).some(Boolean)) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy(true);
    errs.setServer(null);
    const r = await call('/api/sponsorship/details', { json: details }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      focusError();
      return;
    }
    errs.setTried(false);
    setSaved(true);
    ctx.reload();
  };

  return (
    <section aria-labelledby="h-details" class="flex flex-col gap-4">
      <h2 id="h-details" class={h2}>
        Company and billing details
      </h2>
      <form ref={formRef} onSubmit={submit} noValidate class={surfaceClass('grey', card)}>
        <DetailFields
          value={details}
          onChange={(d) => {
            setDetails(d);
            setSaved(false);
          }}
          errorOf={errorOf}
          invoice={s.paymentMode === 'invoice'}
        />
        {errs.general(DETAIL_FIELDS) && (
          <Notice tone="danger" alert>
            {errs.general(DETAIL_FIELDS)}
          </Notice>
        )}
        {saved && <Notice tone="success">{s.hasStripeCustomer ? 'Saved. The next invoice and receipt show these details.' : 'Saved.'}</Notice>}
        <SubmitButton busy={busy} size="md" class="self-start">
          {busy ? 'Saving…' : 'Save details'}
        </SubmitButton>
      </form>
    </section>
  );
}

function LogoSection({ s, logos, ctx }: { s: SponsorView; logos: LogoView[]; ctx: Ctx }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const latest = logos[0];
  const review = latest ? REVIEW[latest.review] : null;

  const pick = (f: File | null) => {
    setSent(false);
    setFile(f);
    if (!f) return setError('');
    if (!LOGO_TYPES.includes(f.type)) return setError('Choose an SVG, PNG or WebP file.');
    if (f.size > LOGO_MAX) return setError('The file is larger than 2 MB. Choose a smaller one.');
    setError('');
  };

  const upload = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    if (!file) {
      setError('Choose a logo file.');
      inputRef.current?.focus();
      return;
    }
    if (error) return inputRef.current?.focus();
    const form = new FormData();
    form.append('file', file);
    setBusy(true);
    const r = await call('/api/sponsorship/logo', { form }, ctx);
    setBusy(false);
    if (!r) return;
    if (!r.ok) {
      setError(r.error);
      inputRef.current?.focus();
      return;
    }
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    setSent(true);
    ctx.reload();
  };

  return (
    <section aria-labelledby="h-logo" class="flex flex-col gap-4">
      <h2 id="h-logo" class={h2}>
        Logo
      </h2>
      <p class={cx(body, 'max-w-3xl')}>The logo shown with your company on zurichjs.com. The board reviews each upload before it goes on the site.</p>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        {latest && review && (
          <figure class={surfaceClass('grey', 'm-0 flex flex-col gap-4 p-6')}>
            <div class="flex min-h-32 items-center justify-center rounded-card bg-grey-soft p-6">
              <img
                src={`/api/sponsorship/logo/${encodeURIComponent(latest.id)}`}
                alt={`${s.companyName} logo, latest upload`}
                class="block h-auto max-h-24 w-auto max-w-full object-contain"
              />
            </div>
            <figcaption class="flex flex-col gap-2">
              <span class={cx(badgeClass(review.tone), 'self-start')}>{review.label}</span>
              <span class="text-base text-grey-text">
                {latest.filename}, uploaded on {shortDate(latest.uploadedAt)} by {latest.uploadedBy}
              </span>
              {latest.review === 'pending' && <span class="text-base">This upload is waiting for review by the board.</span>}
              {latest.review === 'rejected' && latest.reviewNote && <span class="text-base">The board’s note: {latest.reviewNote}</span>}
            </figcaption>
          </figure>
        )}
        <form onSubmit={upload} noValidate class={surfaceClass('grey', 'flex flex-col gap-4 p-6')}>
          <div class="flex flex-col gap-1.5">
            <label for={`${id}-file`} class="text-base font-bold">
              {latest ? 'Upload a new logo' : 'Upload your logo'}
            </label>
            <span id={`${id}-hint`} class="text-base text-grey-text">
              SVG, PNG or WebP, up to 2 MB. A version that works on a white background is best.
            </span>
            <input
              ref={inputRef}
              id={`${id}-file`}
              name="file"
              type="file"
              accept={LOGO_TYPES.join(',')}
              aria-invalid={!!error || undefined}
              aria-describedby={cx(`${id}-hint`, error && `${id}-error`)}
              onChange={(e) => pick((e.target as HTMLInputElement).files?.[0] ?? null)}
              class="w-full min-w-0 text-base"
            />
            <span id={`${id}-error`} class="min-h-5 text-sm text-danger" aria-live="polite">
              {error}
            </span>
          </div>
          {sent && <Notice tone="success">Thank you. The board reviews the logo and lets you know.</Notice>}
          <SubmitButton busy={busy} size="md" class="self-start">
            {busy ? 'Uploading…' : 'Upload logo'}
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}

function Colleagues({ me, ctx }: { me: Me; ctx: Ctx }) {
  const contacts = me.contacts ?? [];
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({ name: '', email: '', role: 'billing' });
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState('');
  const [listError, setListError] = useState('');
  const [added, setAdded] = useState('');
  const errs = useErrors();
  const formRef = useRef<HTMLFormElement>(null);
  const focusError = useFocusFirstError(formRef);
  const local: Record<string, string> = {
    name: form.name.trim() ? '' : 'Add their name.',
    email: isEmail(form.email) ? '' : 'Enter an email like name@example.com.',
  };
  const errorOf = (k: string) => errs.errorOf(local, k);

  const add = async (e: Event) => {
    e.preventDefault();
    if (busy) return;
    setAdded('');
    if (local.name || local.email) {
      errs.setTried(true);
      focusError();
      return;
    }
    setBusy('add');
    errs.setServer(null);
    const r = await call('/api/sponsorship/contacts', { json: { name: form.name.trim(), email: form.email.trim(), role: form.role } }, ctx);
    setBusy('');
    if (!r) return;
    if (!r.ok) {
      errs.setServer(r);
      focusError();
      return;
    }
    errs.setTried(false);
    setAdded(`${form.name.trim()} can now sign in here with ${form.email.trim().toLowerCase()}.`);
    setForm({ name: '', email: '', role: 'billing' });
    ctx.reload();
  };

  const remove = async (c: ContactView) => {
    setBusy(c.id);
    setListError('');
    const r = await call(`/api/sponsorship/contacts/${encodeURIComponent(c.id)}`, { method: 'DELETE' }, ctx);
    setBusy('');
    setConfirm('');
    if (!r) return;
    if (!r.ok) return setListError(r.error);
    ctx.reload();
  };

  return (
    <section aria-labelledby="h-colleagues" class="flex flex-col gap-4">
      <h2 id="h-colleagues" class={h2}>
        Colleagues
      </h2>
      <p class={cx(body, 'max-w-3xl')}>
        Everyone listed can sign in here with their own email. Billing contacts get the invoices and payment emails; without one, they go to the primary contact.
      </p>
      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        {contacts.map((c) => {
          const self = c.id === me.contact?.id;
          return (
            <li key={c.id} class={surfaceClass('grey', 'flex flex-wrap items-center justify-between gap-3 px-5 py-4')}>
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="text-lg font-bold">{c.name}</span>
                  <span class={badgeClass('neutral')}>{ROLE_LABEL[c.role]}</span>
                  {self && <span class={badgeClass('dark')}>You</span>}
                </span>
                <span class="text-base break-all text-grey-text">{c.email}</span>
              </div>
              {!self &&
                (confirm === c.id ? (
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="text-base">Remove {c.name}?</span>
                    <Button variant="danger" size="sm" disabled={!!busy} onClick={() => void remove(c)}>
                      {busy === c.id ? 'Removing…' : 'Remove'}
                    </Button>
                    <Button variant="outline-black" size="sm" onClick={() => setConfirm('')}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline-black" size="sm" disabled={!!busy} onClick={() => setConfirm(c.id)}>
                    Remove
                  </Button>
                ))}
            </li>
          );
        })}
      </ul>
      {listError && (
        <Notice tone="danger" alert>
          {listError}
        </Notice>
      )}
      <form ref={formRef} onSubmit={add} noValidate aria-labelledby="h-add" class={surfaceClass('grey', card)}>
        <h3 id="h-add" class={h3}>
          Add a colleague
        </h3>
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
        {errs.general(['name', 'email']) && (
          <Notice tone="danger" alert>
            {errs.general(['name', 'email'])}
          </Notice>
        )}
        {added && <Notice tone="success">{added}</Notice>}
        <SubmitButton busy={busy === 'add'} size="md" class="self-start">
          {busy === 'add' ? 'Adding…' : 'Add colleague'}
        </SubmitButton>
      </form>
    </section>
  );
}

function Agreements({ agreements }: { agreements: AgreementView[] }) {
  return (
    <section aria-labelledby="h-agreements" class="flex flex-col gap-4">
      <h2 id="h-agreements" class={h2}>
        Agreements
      </h2>
      {agreements.length ? (
        <ul class="m-0 flex list-none flex-col gap-3 p-0">
          {agreements.map((a) => (
            <li key={a.id} class={surfaceClass('grey', 'flex flex-col gap-1 px-5 py-4')}>
              <span class="flex flex-wrap items-center gap-2">
                <span class="text-lg font-bold">{a.summary}</span>
                <span class={badgeClass('neutral')}>{CONTEXT_LABEL[a.context]}</span>
              </span>
              <span class="text-base text-grey-text">
                Signed by {a.signerName}, {a.signerTitle}, on {longDate(a.acceptedAt)}. Agreement of {longDate(a.version)}.
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p class={hint}>Each time someone signs the sponsorship agreement for your company, it is listed here.</p>
      )}
      <p class={hint}>
        <a href={AGREEMENT.path} target="_blank" rel="noopener" class="font-bold text-black">
          Read the current sponsorship agreement
        </a>
      </p>
    </section>
  );
}
