/**
 * Permanent redirects for URLs that change in V2 (docs/v2/PLAN.md, section 2).
 * Old production URLs keep working and pass their ranking to the new page.
 */
/** @type {Record<string, { status: 301; destination: string }>} */
export const LEGACY_REDIRECTS = {
  '/partnerships': { status: 301, destination: '/partners' },
  '/buy-us-a-coffee': { status: 301, destination: '/donate' },
  '/support': { status: 301, destination: '/donate' },
  '/event-feedback': { status: 301, destination: '/feedback' },
  '/community': { status: 301, destination: '/about' },
  '/cfp/form': { status: 301, destination: '/cfp' },
  // Stripe return pages; online payments were removed (owner decision).
  '/success': { status: 301, destination: '/donate' },
  '/checkout/success': { status: 301, destination: '/events' },
  // V2 design used short policy slugs; production URLs win.
  '/policies/privacy': { status: 301, destination: '/policies/privacy-policy' },
  '/policies/terms': { status: 301, destination: '/policies/terms-and-conditions' },
  '/policies/refunds': { status: 301, destination: '/policies/refund-policy' },
};
