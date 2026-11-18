/**
 * The sponsorship agreement a contact accepts before paying, and again for every change
 * (the page is /partners/agreement). Change the version whenever the text changes; an
 * acceptance stores the version it accepted.
 *
 * DRAFT until the owner approves the text (legal wording is owner-only, AGENTS.md).
 */
export const AGREEMENT = {
  version: '2026-11-18',
  path: '/partners/agreement',
} as const;

/** How long a board proposal waits for the sponsor's answer. */
export const PROPOSAL_DAYS = 14;

/** Invoices are due this many days after Stripe sends them (owner, 18th November 2026). */
export const INVOICE_DAYS = 30;
