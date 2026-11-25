/** Types, labels and small pieces the sponsor admin views share (SponsorsAdmin.tsx). */
import type { ComponentChildren, Ref } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@zurichjs/design/islands/Button';
import { Heading } from '@zurichjs/design/islands/Heading';
import { TextField } from '@zurichjs/design/islands/Field';
import { Notice as Result } from '@zurichjs/design/islands/Notice';
import { Tag } from '@zurichjs/design/islands/Tag';
import { optionClass, optionInput, type TagTone } from '@zurichjs/design/recipes';
import { fee, type Cycle, type SponsorEvent, type Status, type Tier } from '@zurichjs/sponsorship';
import { longDate } from '../../../server/dates.ts';
import type { AdminSponsorView, agreementView, contactView, documentView, logoView } from '../../../server/sponsor.ts';
import type { Attention } from '../../../server/sponsor-admin.ts';
import { api } from '../admin-api.ts';
import { ChoiceGroup } from '../forms/shared.tsx';

export type { Attention };
export type Contact = ReturnType<typeof contactView>;
export type Agreement = ReturnType<typeof agreementView>;
export type Logo = ReturnType<typeof logoView>;
export type Contract = ReturnType<typeof documentView>;
/** A row of the list: the sponsor and what needs someone today. */
export type Row = AdminSponsorView & { attention: Attention[] };

export interface Detail {
  sponsor: AdminSponsorView;
  attention: Attention[];
  contacts: Contact[];
  agreements: Agreement[];
  logos: Logo[];
  contracts: Contract[];
  /** Newest first. */
  events: SponsorEvent[];
  pendingChange: { tier: Tier; cycle: Cycle; from: string } | null;
}

/** An upcoming meetup a one-time sponsorship can cover (GET meetups). */
export interface Meetup {
  id: string;
  title: string;
  date: string;
}

export type FieldError = { field?: string; message: string } | null;

export const BASE = '/api/membership/admin/sponsors';
export const PAGE = '/admin/sponsors';

export const STATUS_LABEL: Record<Status, string> = {
  pending: 'Waiting for payment',
  active: 'Active',
  past_due: 'Payment overdue',
  ending: 'Ending',
  ended: 'Ended',
};
export const STATUSES = Object.keys(STATUS_LABEL) as Status[];
const STATUS_TONE: Record<Status, TagTone> = { pending: 'grey', active: 'black', past_due: 'danger', ending: 'grey', ended: 'grey' };

export const ROLE_LABEL: Record<Contact['role'], string> = { primary: 'Primary contact', billing: 'Billing contact', other: 'Colleague' };

/** Overdue money is the one attention flag shown in red; everything else is a black tag. */
const ATTENTION_TONE: Record<Attention, TagTone> = {
  payment_overdue: 'danger',
  manual_overdue: 'danger',
  meetup_passed_unpaid: 'danger',
  manual_due_soon: 'black',
  invite_waiting: 'black',
  checkout_abandoned: 'black',
  no_partner: 'black',
  new_logo: 'black',
};

export function StatusBadge({ status }: { status: Status }) {
  return <Tag tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Tag>;
}

export function AttentionBadge({ flag, labels }: { flag: Attention; labels: Record<string, string> }) {
  return <Tag tone={ATTENTION_TONE[flag]}>{labels[flag] ?? flag}</Tag>;
}

/** Today in Zurich, YYYY-MM-DD. */
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(new Date());
export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
export const inputChecked = (e: Event) => (e.target as HTMLInputElement).checked;

/** YYYY-MM-DD plus whole months, keeping the day where the month has it (31st January + 1 month = 28th February). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))).toISOString().slice(0, 10);
}

/** The tier's list price for one meetup, as a placeholder for the price field. */
export const listPrice = (tier: Tier) => String(fee(tier, 'once'));

/** A whole number of francs from a text field, or null when empty; NaN when it is not one. */
export const francs = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(/[’'\s]/g, '')));

/** Moves the reader to a view's heading after the view changed. */
export function focusHeading(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ block: 'start' });
  el.focus({ preventScroll: true });
}

/** Follows an in-page link without a reload; a modified click (new tab) is left to the browser. */
export function follow(e: MouseEvent, go: () => void) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  go();
}

/**
 * The result of an admin action: an error (an alert), what was done (a status), or a note when it
 * was done with a caveat (saved, but Stripe was not updated). Long emails and links wrap.
 * `detail` goes under the sentence (a link to copy); `focusRef` lets the caller move focus to it.
 */
export function Notice({
  kind,
  focusRef,
  detail,
  children,
}: {
  kind: 'error' | 'done' | 'note';
  focusRef?: Ref<HTMLDivElement>;
  detail?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <Result tone={kind === 'error' ? 'danger' : kind === 'done' ? 'success' : 'note'} live focusRef={focusRef} title={children} class="break-words">
      {detail}
    </Result>
  );
}

/** A link to send by hand (a change to confirm, a payment link): shown in full, with a copy button. */
export function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div class="flex flex-col gap-2">
      <TextField label={label} value={url} readOnly onFocus={(e) => (e.target as HTMLInputElement).select()} />
      <div class="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            void navigator.clipboard?.writeText(url).then(() => {
              setCopied(true);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setCopied(false), 3000);
            });
          }}
        >
          Copy link
        </Button>
        <span role="status" class="text-compact">
          {copied ? 'Copied.' : ''}
        </span>
      </div>
    </div>
  );
}

/** Upcoming meetups, loaded once per view. */
export function useMeetups(enabled: boolean, onSignedOut: () => void) {
  const [meetups, setMeetups] = useState<Meetup[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled || meetups) return;
    void api<{ meetups: Meetup[] }>(`${BASE}/meetups`).then(({ status, body }) => {
      if (status === 401) return onSignedOut();
      if (status !== 200) setError(body.error ?? 'Could not load the meetups.');
      setMeetups(status === 200 ? body.meetups : []);
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- load once, the first time they are needed
  }, [enabled]);
  return { meetups, error };
}

/** Meetups to choose from (checkboxes): upcoming ones, plus any already chosen that are not upcoming any more. */
export function MeetupPicker({
  meetups,
  loadError,
  extra = [],
  value,
  onChange,
  error,
  hint,
}: {
  meetups: Meetup[] | null;
  loadError?: string;
  extra?: Meetup[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  hint?: ComponentChildren;
}) {
  const all = [...extra.filter((m) => !meetups?.some((x) => x.id === m.id)), ...(meetups ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <ChoiceGroup legend="Meetups" hint={hint} error={error} class="flex flex-col gap-2">
      {!meetups && <span class="text-compact text-grey-text">Loading the meetups…</span>}
      {meetups && all.length === 0 && <span class="text-compact text-grey-text">{loadError || 'No upcoming meetup is published yet.'}</span>}
      {all.map((m) => (
        <label key={m.id} class={optionClass(!!error, 'self-stretch md:self-start')}>
          <input
            type="checkbox"
            value={m.id}
            checked={value.includes(m.id)}
            onChange={() => onChange(value.includes(m.id) ? value.filter((x) => x !== m.id) : [...value, m.id])}
            class={optionInput}
          />
          <span>
            {m.title}, {longDate(m.date)}
          </span>
        </label>
      ))}
    </ChoiceGroup>
  );
}

/** A titled part of the sponsor's page in the admin area. */
export function Block({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ComponentChildren }) {
  return (
    <section aria-labelledby={id} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <Heading as="h3" size="card" id={id} focus class="scroll-mt-6">
          {title}
        </Heading>
        {intro && <p class="m-0 text-compact text-ink-2">{intro}</p>}
      </div>
      {children}
    </section>
  );
}
