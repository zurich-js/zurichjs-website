# Decisions

Each entry: date · decision · why · who. "Owner" means confirmed in the planning session on 2026-10-31. "Assumption" means decided by Claude and open to change.

## Scope (owner, 2026-10-31)

- **Run all phases unattended** (A, 0, 1, 1b, 2, 3, 4, 5). Hard stops: brand rules, deleting content or Sanity documents, spending money, production deploys.
- **Stacked branches.** Each phase branches from the previous phase's branch and its PR targets that branch, so every PR shows one phase's diff.
- **Port everything to Astro, except:**
  - **Workshops (de-scoped for now).** No Astro workshop page, no workshop checkout or waitlist, no Sanity `workshop` type, no Workshops filter on /events. `v2/` keeps its workshop screen as handed off.
  - **T-shirt flow (de-scoped).** `/tshirt`, `api/checkout-tshirt`, `api/get-stock`, `api/notify/tshirt-purchase-success` are not ported.
  - **Clerk and all admin (removed).** No auth in the new platform. Not ported: `/admin/*`, `api/admin/*`, `/profile/*`, `/invite/*`, referrals, `api/users/[id]`, `api/cash-payment`, `api/cfp/prefill`, `api/profile/speaker`, `api/events/register-interest`, `api/feedback/speaker/generate-feedback-link`, `src/proxy.ts`. Former sign-in-optional flows (CFP, feedback) work without sign-in.
  - **Open for the owner:** what the production URLs `/workshops/*` and `/tshirt` do at switchover (keep the old app, redirect to `/events` and `/`, or 410). The Astro app ships no redirect for them until then.
- **Hosting is Netlify.** Everything must run there: `@astrojs/netlify`, Netlify Functions, scheduled functions, Blobs, build hooks.
- **pnpm everywhere**, with the root's `minimumReleaseAge: 4320` supply-chain policy.
- **SEO and LLM parity is non-negotiable.** Every current URL either renders with equivalent meta and structured data, 301s to its V2 equivalent, or is listed as an owner decision.
- **Every PR carries screenshots and screen recordings.**
- **knip for dead code; centralise into packages.**
- **Sane:** leave seams so it can plug in later. No integration now.

## Phase A

- **`v2/` is its own pnpm root** (`v2/pnpm-workspace.yaml`), so the production root install, lockfile and Netlify build are untouched. The root `tsconfig.json`, `eslint.config.mjs`, `.oxlintrc.json` (new, ignore patterns only) and `.oxfmtrc.json` exclude `v2/` and `platform/`. (Assumption)
- **Next 15.5.6 → 15.5.28, React 19.1.1 → 19.1.10** (same minors, security patches), and **postcss pinned to ^8.5.23** through an override, like the root. `pnpm audit` in `v2/` is clean. (Assumption)
- **`next lint` script removed** from `v2/` (deprecated in Next 15, removed in 16; there was no ESLint config). Type safety comes from `pnpm typecheck`. (Assumption)
- **Shared images stored once.** Seven images byte-identical to the root `public/images` (community ×4, team ×3) are not duplicated. `v2/scripts/sync-assets.mjs` copies them before `dev` and `build`, and the copies are gitignored. `v2/public/images/meetups/cloudflare.png` duplicated `community/cloudflare.png` and now points to it. (Assumption)
- **Font fix.** The `--font-figtree` variable was defined only on the app wrapper, so `<body>` (and anything portalled into it) computed to Times New Roman. It is now also defined on `:root` in `_app.tsx`. Verified: Figtree computed on every route at 320, 390 and 1440. (Assumption)
- **`outputFileTracingRoot` set to `v2/`** to silence Next's multiple-lockfile warning inside the monorepo. (Assumption)
- **Oversized images not converted yet** (`v2/public/images/meetups/*.png` 1.5–3.6 MB, the award PNG 3 MB). `v2/` is a reference implementation; the Astro app optimises images at build time with `astro:assets`. (Assumption)

## Content model (see CONTENT-MODEL-DIFF.md)

- Keep the `events` type name, `datetime`, `location` and `address`; add V2 fields additively. (Assumption)
- Declare `stripePriceId` on `events` (the site already reads it). Deprecate `ticketSaleUrl` without deleting it. Add no `workshop.stripePriceId`. (Assumption)
- Never render `talk.slides` or `talk.videoUrl` (brand rule).

## Phase 0

- **Production URLs win over V2 URLs:**
  - Policies keep `/policies/privacy-policy`, `/policies/refund-policy` and `/policies/terms-and-conditions`; the V2 slugs (`privacy`, `refunds`, `terms`) become 301s.
  - Event and speaker URLs keep the Sanity `id.current` slug.
  - `/cfp/form` 301s to `/cfp`, where V2 has the two-step form. (Assumption)
- **The SEO parity gate fails on lost signals, not on copy changes.** V2 rewrites titles and descriptions, so wording changes must be listed in an allowlist with a reason. Missing titles, canonicals, JSON-LD types, sitemap entries or crawler allowances fail the build (SEO-BASELINE.md). (Assumption)
- **Known SEO defects in production are fixed in V2, not copied:**
  - `/sitemap.xml` is a 3-URL file
  - Event and Person JSON-LD are never emitted
  - relative OG images
  - `og:url` on zurichjs.org for speakers
  - indexable private pages
  - `/ai-context` is orphaned

  (Assumption)

- **Sane is read-only reference material.** `farisaziz12/sane` was attached for reading; nothing was written there. Seams: `TicketingProvider` and `TalkProposalSink` (SANE-READINESS.md). (Assumption)
- **Dead code in production goes in a separate PR** (`v2/root-dead-code`, from `main`): 28 files, 5 dependencies, a stray `.tmp` file and dead exports. The structured-data builders are kept as porting reference. Nothing reachable by URL is removed. (Owner asked for knip; scope is an assumption.)
- **The Studio repo lags the data the site writes** (CONTENT-MODEL-DIFF.md, finding 3). Phase 3 declares the missing fields and types before adding anything new. (Assumption)
- **The production SEO baseline was captured with a placeholder Clerk publishable key**, locally only. Clerk's development keys redirect browser navigations to a handshake host, so a `pk_live_` key in the right format was used. Nothing was sent to Clerk. (Assumption)

## Phase 1 (Astro app)

- **Astro 7.4, not 5 (changed for security, 2026-10-31).** The brief named Astro 5, but Astro < 7.2.8 has a critical advisory (GHSA-26w7-cxv4-gfx2) and the Netlify adapter for Astro 5 has more; the dependency review blocked the PR. The platform now uses Astro 7.4.4, `@astrojs/netlify` 8.2.10, `@astrojs/preact` 6.1.1 and Vitest 4.1.12. Tailwind first stayed on v3 through PostCSS, because `@astrojs/tailwind` has no Astro 7 release; Phase 2 moved it to Tailwind 4 (see below). Build, `astro check`, tests, e2e, the SEO gate and Lighthouse are unchanged. (Owner asked for all CI to pass.)
- **Islands are Preact with `compat`.** compat lets the V2 React code port almost verbatim; new code uses Preact idioms. Islands: event actions, banner, summary and programme (clock-aware state and rating), /today, the forms, and the events/speakers filters. The mobile menu and the events tabs are small inline scripts, not framework islands. (Assumption)
- **Prerendered state plus clock re-check.** Pages render the event state as of build time. Islands re-evaluate it in the browser every minute and swap the actions, banner and rating. A page built before doors switches to feedback mode without a rebuild; the switch to the recap waits for the doors + 48 h rebuild (Phase 4) and tells visitors to reload. (Assumption)
- **Sanity reads use plain `fetch`, not `@sanity/client`.** It is smaller, and the client crashed the build with an uncatchable socket error when Sanity was unreachable. **Sample content never ships:** builds fall back to the V2 sample content only outside production, and fail on `CONTEXT=production` or `CONTENT_REQUIRE_SANITY=1`. (Assumption)
- **Every production URL is kept:** events and speakers use the Sanity `id.current` slug, policies keep production slugs, and every V2 rename is a 301 in `astro.config.mjs` (written to Netlify `_redirects`). (Assumption)
- **Policies use the production legal text** (Markdown content collection), not the V2 placeholder wording. "Last updated" shows the last real edit (20 May 2026); production printed today's date on every visit. (Assumption)
- **SEO improvements over production** (the parity gate enforces them):
  - Event, Person and Breadcrumb JSON-LD
  - a complete `/sitemap.xml`
  - absolute OG images
  - `/llms.txt` and `/llms-full.txt`
  - `/ai-context` linked from the footer
  - `/today` and `/feedback` stay indexable, as in production
  - Titles keep production keywords and use the V2 " · " separator (`tools/seo/allowlist.json`). (Assumption)
- **Form confirmation copy now matches what the site does.** "We sent a copy to …" became "An organiser will reply to …": the forms never emailed the person who submitted. Donations without Stripe configured say nothing was charged. (Assumption)
- **Images:** photos ship as WebP at 480, 960 and 1600 px with `srcset`. CSS is inlined to remove the render-blocking request. Lighthouse mobile: home 99, event 100, speaker 100 for performance, with 100 for accessibility, best practices and SEO on all three. (Assumption)
- **The browser validates forms without zod** (`@zurichjs/forms/client`; a test keeps the required fields in sync with the zod schemas). Server functions validate with zod. This saves about 87 KB of JavaScript per form page. (Assumption)
- **V2 evening-feedback answers are stored in named fields** (`moreOf`, `improvements`, `futureTopics`, `arrivalIssues`, `describeToFriend`) on `comprehensiveFeedback`, declared in the Studio. A deep dive is 35 minutes, as the form says. (Assumption)
- **`.ics` escaping fixed:** semicolons were not escaped (the same bug was in `v2/`). (Assumption)
- **pnpm `packageExtensions`** declares `@emnapi/runtime` for `@napi-rs/wasm-runtime`, which `@astrojs/check` needs and which does not declare it. (Assumption)

## CI: production dependency audit (2026-10-31, owner asked to fix all failing CI)

- **The `ci` job's `pnpm audit --audit-level moderate` was failing on `main`** with 72 advisories. Fixed in the production app's dependencies:
  - Next.js 16.2.11 → 16.4.3 (with `eslint-config-next` and `@next/third-parties`)
  - axios ^1.21.0, zod ^4.6.7, `@vercel/og` ^1.0.3 (satori 0.33.5, SVG escaping fix), `next-sanity` ^13.4.0
  - Scoped overrides for transitive packages, each at a patched release in the same major: sharp, js-yaml 3, adm-zip, smol-toml, tinypool, markdown-it, follow-redirects, vite 7, undici, dompurify, qs, source-map-js, baseline-browser-mapping, postcss-selector-parser 6, zod 4, brace-expansion 5.0.12. The existing CommonJS-compatibility patch is regenerated for 5.0.12.
- **One advisory is ignored with a reason** (`auditConfig.ignoreGhsas`): GHSA-g3hv-75wg-m249 (minimatch < 11.0.1, denial of service through crafted glob patterns). Only 11.x is patched, and its export is not callable like the 3.x/5.x/10.x APIs our tooling uses. The patterns come from config files, never from users.
- **Verified:**
  - `pnpm audit --audit-level moderate` exits 0
  - oxlint, ESLint, oxfmt, `tsc` pass
  - `next build` compiles; it stops at Sanity data collection only because Sanity is blocked in this environment, the same as on `main`

## CI: platform dependency review (2026-10-31)

- `platform/pnpm audit` is clean. Two overrides keep the same API: `glob@13` → 14 and `minimatch@10` → 11, both only in Netlify's dev tooling.
- **deepmerge has no patched release** (GHSA-gcqx-w48m-w2h4, low; 4.3.1 is the latest). Instead of ignoring it, `platform/vendor/deepmerge` is 4.3.1 with the fix (skip own `__proto__` keys), wired through a `link:` override. It is only used by `@netlify/config`. Remove it once a fixed version is published.
- **Production-app (root) audit decisions are recorded separately, in the "CI: production dependency audit" section.**

## Phase 2: design system (2026-11-01)

- **Astro 7 is locked in (owner).** `astro` 7.4.4, `@astrojs/netlify` 8.2.10 and `@astrojs/preact` 6.1.1 are pinned exactly. `apps/web/test/stack.test.ts` fails if the installed Astro major is not 7, or the Tailwind major is not 4.
- **Tailwind 4 (owner choice).** It is the same version as the conference repository, so both sites can share one `@theme`.
  - It runs through `@tailwindcss/vite` 4.3.3.
  - `tailwind.config.ts`, `postcss.config.mjs` and `@tailwindcss/postcss` are removed.
  - Utilities were migrated with the official codemod.
- **Tokens live in TypeScript; the CSS is generated.**
  - `packages/design/src/tokens.ts` is the single source.
  - `scripts/build-theme.mjs` writes `theme.css` (the Tailwind `@theme` block, the gutter utilities and the base layer) and `fonts.css`.
  - A test fails when the generated files are stale.
  - This means TypeScript (the Astro font config, the OG image renderer later, the conference site) and CSS read the same values.
- **Figtree comes through the Astro 7 Fonts API** (`fontProviders.local()`, `<Font preload>`), with its settings read from the tokens.
  - Astro now generates the `@font-face`, the preload link and a metric-matched fallback font, so text shifts less while the font loads.
  - `fonts.css` covers sites without the Fonts API.
  - The OG image renderer keeps its static TTFs in the app, because satori cannot read woff2.
- **Components take props; the package never loads content.**
  - Header, Footer, HomeHero, ProofSentence, ConferenceModule, HostsSection, EventRow and LandingEvents receive content, the clock and the ticketing provider from the page.
  - `RatingSheet` takes `onSubmit`; the app passes `submitForm('rating', …)`.
  - The package depends only on `@zurichjs/events`, with `astro` and `preact` as peers.
- **Four hard-coded hex values became tokens:** `grey-hover`, `grey-light`, `blue-soft` and `danger-hover`, plus `grey-placeholder`.
  - Third-party brand colours on the About page (Meetup, Slack, LinkedIn, Bluesky) stay inline, because they are not ZurichJS colours.
- **Two Tailwind 3 → 4 differences were found by comparing every route at 390px and 1440px against a Tailwind 3 build:**
  - **Placeholder colour:** Tailwind 4 preflight uses 50% `currentColor`. The `grey-placeholder` token keeps the shipped grey.
  - **The `link` button variant:** in Tailwind 3, `no-underline` (button base) silently beat `underline` (link variant), so "Copy link" rendered without the underline the design specifies (`text-decoration: underline; text-underline-offset: 3px`). The recipe no longer emits conflicting classes, so the link variant is now underlined as designed. This is the one intended visual change.
  - **Result:** 80 of 82 screenshots are pixel-identical; the other 2 are that underline.
- **The `/design` gallery** is a normal static page with `noindex`. It is left out of `STATIC_ROUTES`, so it appears in neither the sitemap nor `llms.txt`.
  - It renders from fixtures, so it is deterministic and shows every event state whatever is in Sanity.
- **Visual baselines** are committed under `platform/e2e/__screenshots__` (8 pages × 2 widths, about 9 MB).
  - They come from Playwright 1.63 Chromium on Linux. CI must run them in the same environment; Phase 4 uses the Playwright container image.

## No payments: pro meetups and Stripe removed (owner, 2026-11-01)

- **Owner decision:** "No longer need the concept of pro meetups … get rid of all stripe stuff." Every meetup is free and RSVPs on Meetup.
- **Removed from the V2 platform:**
  - **Ticketing:** `stripeTicketing` and the `stripePriceId` field on `Event`, the ticket section on event pages, and the "Ticketed" labels. The event JSON-LD offer is now always free (`price: 0`, `CHF`, Meetup URL).
  - **Functions:** `stripe/checkout-sessions`, `stripe/get-price` and `stripe/validate-coupon`.
  - **Donation checkout:** the `donate` form kind and `donationCheckout`.
  - **Dependency:** the `stripe` package.
  - **Pages:** `/success` and `/checkout/success`.
  - **Copy:** every mention of pro meetups on the landing pages, `/ai-context` and `llms.txt`.
- **`/donate` becomes "Support ZurichJS" (owner choice).** The URL stays, as do the 301s from `/buy-us-a-coffee` and `/support`, so search ranking is kept.
  - The page has no payment form. It lists becoming a member, hosting or sponsoring, speaking and volunteering.
  - One-off contributions go by email to hello@zurichjs.com.
  - The footer link reads "Support us". The `/today` card links to membership instead of "Donate with Twint" and the removed T-shirt shop.
- **Old Stripe return URLs redirect with a 301:** `/success` → `/donate` and `/checkout/success` → `/events`. Both were noindex. The SEO parity gate treats them as redirects.
- **Sanity:** no fields or documents are deleted.
  - The Studio keeps `isProMeetup`, `stripePriceId` and `ticketSaleUrl` declared, read-only and hidden when empty, so existing values stay visible.
  - Readiness no longer asks for a Stripe price.
- **The Sane seam is unchanged.** `TicketingProvider` keeps its `buy` action kind, and `chainTicketing` stays for when Sane sells tickets.
- **The production Next app at the repository root is untouched.** It is replaced at switchover.

## Phase 3: Sanity (2026-11-01)

- **Types are generated in the Studio repo and committed in the website.**
  - `sanity-typegen.json` reads the website's `queries.ts` from a side-by-side checkout and writes `platform/packages/content/src/sanity.types.ts`.
  - `npm run typegen` also extracts the schema offline (`scripts/extract-schema.ts`), so it needs no Sanity login or network.
  - `overloadClientMethods` is off, because the content package uses plain `fetch`, not `@sanity/client`.
  - CI cannot run typegen without the Studio repo. Instead, `types-in-sync.test.ts` fails when a query's text differs from the one its type was generated from.
- **The generated types are wrapped in `Loose<>`** (every field optional and nullable), because production documents predate the V2 schema's required fields. The mappers stay defensive, and `tsc` still catches a mapper reading a field the query does not return.
- **Draft preview is a separate static build, not server rendering.**
  - `SANITY_PERSPECTIVE=drafts` with `SANITY_READ_TOKEN` builds the same static site from drafts.
  - It runs as a second Netlify site or a branch-deploy context, rebuilt by the Phase 4 webhook.
  - Preview builds are noindex on every page and disallow everything in `robots.txt`, and show a "Draft preview" bar.
  - Drafts without a token fail the build instead of silently falling back to sample content.
  - This keeps one rendering path (static) and needs no preview server or secrets in the browser.
- **One-off contributions (owner, 2026-11-01): email, or a Twint QR code.**
  - The QR is an image on Sanity Site settings (`twintQr`, with alt text, plus an optional `twintNote`). `/donate` shows it only when it exists.
  - Sample content never contains a QR, so a placeholder payment code cannot ship.
  - Stripe, including Apple Pay, stays out for now.
- **Legal text stays as it is (owner):** the refund policy and the terms and conditions still describe paid tickets, in case payments come back.

## Phase 4: CI and Netlify (2026-11-01)

- **No nightly rebuild (owner).** Builds happen on a Sanity publish (debounced), at each event's doors and doors + 48 h, and when code is merged. The nightly workflow from the plan is dropped.
- **The webhook is an Astro endpoint (`/api/rebuild`); the timer is a Netlify Scheduled Function.**
  - A standalone Netlify Function that claims a path under `/api/*` would compete with the Astro SSR function for the same URL.
  - An Astro endpoint follows the same routing as `/api/forms/*`.
  - Only the schedule needs a Netlify Function (`netlify/functions/scheduled-rebuild.mts`, every 2 minutes). Netlify's bundler (`zip-it-and-ship-it`) was run locally: it reads the schedule and includes the shared logic.
- **Debounce in Netlify Blobs.** The webhook only records "pending". The scheduled tick builds once nothing has been published for 2 minutes, so a burst of publishes causes one build. The state is written only after the build hook accepts the request, so a failed hook retries on the next tick.
- **Webhook signature:** the same scheme as `@sanity/webhook`, checked against its source: `t=<ms>,v1=<base64url HMAC-SHA256 of "<t>.<body>">`, with a 5-minute replay window.
- **`/state-changes.json`** is generated at build and lists the doors and doors + 48 h times still ahead. The scheduled function reads it from the deployed site, so the build alone decides when the next rebuild is due.
- **Netlify base directory: `platform/apps/web`, with no package directory.**
  - Resolving the config with `@netlify/config` showed that base `platform` plus package `apps/web` resolves `publish` and `functions` against `platform/`.
  - With base `platform/apps/web`, every path in `netlify.toml` resolves correctly, including the 11 redirects Astro writes to `dist/_redirects`.
- **No HSTS `preload` header.** Production does not send one, Netlify already sends HSTS on HTTPS, and preload is hard to undo. The other security headers match production's `next.config.mjs`.
- **New redirect:** `/api/og/cfv` (referenced in production but missing) → a new `/og/cfv.png` card, which `/cfv` now uses.
- **Node 22.23.4 for the platform** (`platform/.nvmrc`, `engines`, `NODE_VERSION` in `netlify.toml`). Astro 7.4.4 requires at least 22.23.4. The repository root's `.nvmrc` (22.23.1) stays as it is for the production app. A test keeps `platform/.nvmrc` at or above Astro's minimum and equal to `netlify.toml`. The first CI run on the Phase 4 PR found this.
- **CI runs on `ubuntu-latest` with Playwright's own Chromium**, the same Chromium build and Ubuntu 24.04 the baselines were made on. Text that system fonts would render was removed, so the screenshots do not depend on installed fonts:
  - Figtree has no ✓ and no non-breaking hyphen; there is now an SVG `Check` icon and a plain hyphen.
  - The gallery's `<code>` labels use Figtree instead of a system monospace.
- **Lighthouse thresholds:** accessibility and SEO = 1, best practices ≥ 0.95, performance ≥ 0.9 as the median of 3 runs. Shared CI runners vary in speed, and local runs score 99–100.
- **Claude review is pinned to a commit SHA** (`anthropics/claude-code-action` v1.0.266). Without `ANTHROPIC_API_KEY` it passes with a notice.
