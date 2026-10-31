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

- **Astro 5.18 as specified, not 7.** Astro 7 is current, but the brief names Astro 5; `@astrojs/tailwind` (Tailwind 3 and the V2 config as preset) supports only up to Astro 5. Upgrading is a follow-up once the design package moves to Tailwind 4. (Assumption)
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
