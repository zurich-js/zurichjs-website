/**
 * Date wording for membership terms. Kept apart from certificate.ts so code that
 * only needs dates (the Slack function, which Netlify bundles with plain esbuild)
 * does not pull in the certificate's `?inline` font and image imports.
 */

/** 2026-11-10 → 10 November 2026. */
export const longDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** The last day the term covers: the day before periodEnd. */
export const lastDay = (periodEnd: string) => new Date(Date.parse(`${periodEnd}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
