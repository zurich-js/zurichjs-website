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
  // Opens the proposal form directly (CfpForm reads #proposal).
  '/cfp/form': { status: 301, destination: '/cfp#proposal' },
  // Stripe return pages; online payments were removed (owner decision).
  '/success': { status: 301, destination: '/donate' },
  '/checkout/success': { status: 301, destination: '/events' },
  // Production pages that V2 does not have (owner decisions, docs/v2/DECISIONS.md): send visitors and
  // search ranking to the closest page. Sub-paths (/workshops/*, /admin/*, ...) are in apps/web/netlify.toml.
  // ?from= shows a one-line note that workshops and T-shirt sales have ended (owner decisions).
  '/workshops': { status: 301, destination: '/events?from=workshops' },
  '/tshirt': { status: 301, destination: '/donate?from=tshirt' },
  '/media-demo': { status: 301, destination: '/media' },
  '/admin': { status: 301, destination: '/' },
  '/profile': { status: 301, destination: '/' },
  '/invite': { status: 301, destination: '/about' },
  // Production's complete sitemap lived here (robots.txt pointed at /sitemap.xml, which was partial).
  '/api/sitemap.xml': { status: 301, destination: '/sitemap.xml' },
  // V2 design used short policy slugs; production URLs win.
  '/policies/privacy': { status: 301, destination: '/policies/privacy-policy' },
  '/policies/terms': { status: 301, destination: '/policies/terms-and-conditions' },
  '/policies/refunds': { status: 301, destination: '/policies/refund-policy' },
  // Speakers without the visibility flag no longer get a profile (owner decision, November 2026).
  ...Object.fromEntries(
    [
      'speaker-1b73a96c-b241-4879-b32f-58a83c0ad7f5',
      'speaker-22242222-7291-4da7-a4c4-e61762cde94c',
      'speaker-223959e3-4d18-4359-9a3f-8212007a9b49',
      'speaker-2aabb71f-2603-48f2-a057-39ead556019e',
      'speaker-38860ce5-69c3-4df4-8b7d-6b7c11f99ece',
      'speaker-42f2e2db-10cc-447e-b268-9ec3418500f7',
      'speaker-4c145da3-e8e5-4f25-bc41-9b6bd61315b1',
      'speaker-595e9a8f-a7ba-45be-8cce-a3829856bb67',
      'speaker-59a34a74-aa31-49bb-a1a1-ac45ac72ef77',
      'speaker-93d79db8-d2f6-40cc-860e-1a60ab3801d0',
      'speaker-9ce559a5-d2f5-4795-992b-c2649cbeaebf',
      'speaker-acf9167a-47e9-4172-9677-15282a751bdd',
      'speaker-c87aa1c9-125d-412f-9e49-f3059fa7f244',
      'speaker-cddb34e6-4bb2-48b7-b2c7-04181bd44864',
      'speaker-d2156098-d172-4981-9182-aa58e055b1b0',
      'speaker-d9b3e1ab-8d7a-4034-b155-36b664493979',
      'speaker-e5f675a4-995b-4b1b-bdab-e689407a92d5',
      'speaker-e8e4b807-8627-4e35-81b7-6a11b2604fc3',
      'speaker-f4393480-f708-44e3-a4ca-007538d0ce32',
    ].map((id) => [`/speakers/${id}`, { status: /** @type {301} */ (301), destination: '/speakers' }]),
  ),
};
