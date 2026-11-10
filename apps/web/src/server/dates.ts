/**
 * Date wording for membership: certificates, emails, Slack, the account and admin
 * pages. Days are ordinals ("10th November 2026"; owner: dates always use ordinals,
 * ordinal() in @zurichjs/events). Pure functions, so the islands use them too.
 *
 * Kept apart from certificate.ts so code that only needs dates (the Slack function,
 * which Netlify bundles with plain esbuild) does not pull in the certificate's
 * `?inline` font and image imports.
 */
import { ordinal } from '@zurichjs/events';

const parts = (d: Date, month: 'long' | 'short', timeZone: string) => {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone, ...o }).format(d);
  return `${ordinal(f({ day: 'numeric' }))} ${f({ month })} ${f({ year: 'numeric' })}`;
};

/** A calendar day, read as written (YYYY-MM-DD or the date part of an ISO time). */
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/** 2026-11-10 → 10th November 2026. */
export const longDate = (iso: string) => parts(day(iso), 'long', 'UTC');

/** 2026-11-10 → 10th Nov 2026. */
export const shortDate = (iso: string) => parts(day(iso), 'short', 'UTC');

/** A moment, in Zurich: 10th Nov 2026, 14:05. */
export const shortDateTime = (iso: string) => {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  return `${parts(d, 'short', 'Europe/Zurich')}, ${time}`;
};

/** The last day the term covers: the day before periodEnd. */
export const lastDay = (periodEnd: string) => new Date(Date.parse(`${periodEnd}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
