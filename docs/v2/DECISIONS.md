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
- **deepmerge has no patched release** (GHSA-gcqx-w48m-w2h4, low; 4.3.1 is the latest). Instead of ignoring it, `vendor/deepmerge` is 4.3.1 with the fix (skip own `__proto__` keys), wired through a `link:` override. It is only used by `@netlify/config`. Remove it once a fixed version is published.
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
- **Visual baselines** are committed under `e2e/__screenshots__` (8 pages × 2 widths, about 9 MB).
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
  - `sanity-typegen.json` reads the website's `queries.ts` from a side-by-side checkout and writes `packages/content/src/sanity.types.ts`.
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
- **Netlify base directory: `apps/web`, with no package directory.**
  - Resolving the config with `@netlify/config` showed that base `platform` plus package `apps/web` resolves `publish` and `functions` against `platform/`.
  - With base `apps/web`, every path in `netlify.toml` resolves correctly, including the 11 redirects Astro writes to `dist/_redirects`.
- **No HSTS `preload` header.** Production does not send one, Netlify already sends HSTS on HTTPS, and preload is hard to undo. The other security headers match production's `next.config.mjs`.
- **New redirect:** `/api/og/cfv` (referenced in production but missing) → a new `/og/cfv.png` card, which `/cfv` now uses.
- **Node 22.23.4 for the platform** (`.nvmrc`, `engines`, `NODE_VERSION` in `netlify.toml`). Astro 7.4.4 requires at least 22.23.4. The repository root's `.nvmrc` (22.23.1) stays as it is for the production app. A test keeps `.nvmrc` at or above Astro's minimum and equal to `netlify.toml`. The first CI run on the Phase 4 PR found this.
- **Chromium renders text the same everywhere** (`--disable-lcd-text`, `--font-render-hinting=none`, `--force-color-profile=srgb` in `playwright.config.ts`). The first CI run showed GitHub's runner using coloured LCD antialiasing and hinting that shifts text by about 1px, so 11 of 16 screenshots differed by about 2%. The baselines here already match these flags exactly.
- **CI runs on `ubuntu-latest` with Playwright's own Chromium**, the same Chromium build and Ubuntu 24.04 the baselines were made on. Text that system fonts would render was removed, so the screenshots do not depend on installed fonts:
  - Figtree has no ✓ and no non-breaking hyphen; there is now an SVG `Check` icon and a plain hyphen.
  - The gallery's `<code>` labels use Figtree instead of a system monospace.
- **Lighthouse thresholds:** accessibility and SEO = 1, best practices ≥ 0.95, performance ≥ 0.9 as the median of 3 runs. Shared CI runners vary in speed, and local runs score 99–100.
- **No Claude review workflow (owner).** The owner does not want reviews that run on an Anthropic API key. The drafted `claude-review.yml` was removed; CodeRabbit and the CI checks remain.

## Switchover: V2 becomes the repository (owner, 2026-11-01)

- **Removed (owner: "remove all the junk"):**
  - the production Next.js app (`src/`, `public/`, its configs, lockfile, `patches/` and `.env.example`)
  - the `v2/` handoff reference site
  - the old app's docs (`TAP_TO_PAY_IMPLEMENTATION.md`, `coupons.md`, `DEAD-CODE.md`)
  - the committed `.claude/settings.local.json`
- **`platform/` is now the repository root** (moved with `git mv`, so history is kept). The root `.nvmrc` is 22.23.4.
- **One CI workflow** (`ci.yml`) replaces the old app's CI and `v2.yml`. The husky pre-commit hook now runs oxfmt and oxlint through lint-staged, then a typecheck.
- **One switchover PR into `main` (owner).** The stacked phase PRs remain as the review record.
- **The Netlify base directory becomes `apps/web`.** The owner changes it on the existing zurichjs.com site; see the RUNBOOK's "Go live". DNS does not change.
- **The production site's existing environment variables keep working.** New code also accepts:
  - `SANITY_TOKEN` as the read and write token
  - `SLACK_BOT_TOKEN` with `SLACK_DEFAULT_CHANNEL`, besides `SLACK_WEBHOOK_URL`
  - `NEXT_PUBLIC_POSTHOG_*`

  Only `SANITY_WEBHOOK_SECRET` and `NETLIFY_BUILD_HOOK_URL` are new.

- **Production URLs V2 does not have now redirect with a 301 to the closest page,** so links and search ranking carry over. These were decided at switchover:

  | Old URL                                            | New URL        |
  | -------------------------------------------------- | -------------- |
  | `/workshops`, `/workshops/*`                       | `/events`      |
  | `/tshirt`                                          | `/donate`      |
  | `/media-demo`                                      | `/media`       |
  | `/admin/*`, `/profile/*`                           | `/`            |
  | `/invite/*`                                        | `/about`       |
  | `/api/sitemap.xml` (production's complete sitemap) | `/sitemap.xml` |
  - The section roots are in `src/lib/redirects.mjs`, and the `/*` sub-paths are in `netlify.toml`.
  - `tools/serve-dist.mjs` now applies `netlify.toml` redirects too, so e2e and the SEO gate test them as Netlify serves them.
  - The SEO gate has no routes left in a removed, descoped or pending state.

- **The Studio's typegen** writes to `packages/content/src/sanity.types.ts`, the new path.

## Phase 5: agents and the Slack content agent (owner, 2026-11-01)

- **Agent-agnostic (owner).**
  - `AGENTS.md` is the single set of instructions, and `CLAUDE.md` is only `@AGENTS.md`.
  - Playbooks are plain Agent Skills markdown in `agents/skills/`, and Claude Code loads them through the `.claude/skills` symlink.
  - Roles are in `agents/roles/`, with thin `.claude/agents/*` wrappers.
- **`.mcp.json`:** Sanity, GitHub and Playwright, pinned, with tokens taken only from the environment. context7 and the Netlify MCP from the draft were dropped: one is a third-party docs service, and an agent should not hold a Netlify token.
- **The Slack content agent is our own bot, model-agnostic (owner).** It runs as Netlify Functions in this repository, uses the Vercel AI SDK, and the provider is chosen by environment variables (`openai`, `anthropic`, `openai-compatible`). The owner chose this over Claude in Slack, which needs a Claude Team plan, is in beta, and works with Claude only.
- **Drafts plus a Publish button (owner).**
  - The model's tools write drafts only, and the store refuses any write that isn't a draft.
  - Publishing is deterministic code behind a Slack button:
    - only `SLACK_PUBLISHER_IDS` can publish
    - the draft must pass the readiness check
    - Discard removes only the draft
  - There is no delete tool, and slugs cannot change.
- **One private channel (owner).** Everyone in the channel can draft; only the allowlist can publish.
- **Typed tools instead of handing the model the Sanity MCP.** This allows a field allowlist, draft-only writes, a before → after change log, and Zurich-time conversion. The legacy `location` and `address` fields stay in sync with the venue, as the Studio asks.
- **Readiness rules live in `@zurichjs/events` too,** with shared test cases. They must match the Studio's `lib/readiness.ts`.
- **First version handles events plus the Twint note.** Creating talks or speakers from Slack would need references to unpublished documents, and publishing those in the wrong order fails. Talks and speakers stay in the Studio for now; a programme can be written as agenda lines.
- **Runtime:**
  - `slack-events` answers Slack within 3 seconds and hands the work to `slack-agent-background`, a Netlify Background Function. Netlify's bundler detected it as `background`.
  - `slack-interactivity` uses `waitUntil`.
  - The handoff between functions is HMAC-signed with the Slack signing secret.
- **No model in CI.** Tests use an in-memory Sanity and the AI SDK's scripted mock model.

## Launch restoration after the V2 audit (owner, 2026-11-01)

An audit of V2 against production found missing functionality and inaccurate content. The owner's brief kept workshops, T-shirt sales and accounts removed, and restored the rest.

- **Donations are online again (reverses "No payments" above).** Stripe Checkout through a fetch-based function (`/api/donate/checkout`), one-time or monthly in CHF, presets CHF 10–50 as on production plus a custom amount (CHF 5–1000). Return pages say back only what Stripe confirmed. Monthly donors manage or cancel through `PUBLIC_STRIPE_PORTAL_URL` (Stripe customer portal) or by email. Twint and email stay. Membership requests still charge nothing. The legal pages are unchanged (owner); the refund policy does not mention donations yet.
- **Slides are shown when a speaker shared them; talks are still never recorded** (owner). Videos in the media archive are shown as event clips, never as talk recordings.
- **Schedules:** the event `agenda` is authoritative; without one, talks are listed in order without times. Production's times came from a fixed template (doors, 18:30 welcome, 18:50 first talk, talk lengths, a break after the second talk); the Studio's "Fill programme from talks" action and `scripts/backfill-agenda.ts` (drafts, dry run by default) write that template for organisers to check, so the site itself never guesses.
- **Feedback:** legacy `/events/<slug>?feedback=true` opens per-talk ratings on any date after the start (narrowed on 2026-11-02, below). One rating per person, talk and speaker (production's check ignored the speaker, so a talk's second speaker could not be rated); ratings store event, talk and speaker references.
- **Tonight** decides upcoming, on the day, live, after or nothing planned from the browser clock in Zurich; it never calls a future meetup "tonight".
- **Maps load only on request** (owner): directions links always, the Google Maps Embed API after "Show map" when `PUBLIC_GOOGLE_MAPS_EMBED_KEY` is set.
- **Media:** one collection from ImageKit (build time, `IMAGEKIT_PRIVATE_KEY`, one folder per event slug as production) and Sanity event photos. Editorial picks and relationships are ImageKit tags (`featured-home`, `featured-partners`, `speaker:<id>`, `talk:<id>`, `milestone:<date>`, `promo`, `hidden`). Without the key the build continues with Sanity photos.
- **Partners:** Sanity partner documents gain kinds, tier, current, dates and `allowReferrer`; events gain `supporters`. Only partners an organiser marks current are called current sponsors; current sponsors appear on every upcoming meetup page and on Tonight, as `/partners` promises. Studio `scripts/seed-partners.ts` writes the production partner list as drafts to confirm.
- **Speakers:** search covers talk titles, descriptions and topics; profiles list each talk once with all its events. Old speaker IDs (`speaker.legacySlugs`) become 301s at build time.
- **Supporter tier keeps "Free or discounted workshops"** as on production (owner), although V2 lists no workshops.
- **Slack:** only a complete invite link from Site settings is used; otherwise "Ask us for a Slack invite" (owner).
- **Community history and team** live in `packages/content/src/community.ts` with their sources (`docs/v2/CONTENT-SOURCES.md`).
- **Retired URLs:** `/workshops(/*)` → `/events?from=workshops` and `/tshirt` → `/donate?from=tshirt`, each with a one-line note; `/checkout/*` → `/donate`; `/cfp/form` → `/cfp#proposal`.
- **Speaker profiles are collected progressively:** the CFP stays short; accepted speakers get a private link (`pnpm speaker-link <id>`, JWT, 30 days) to add a photo, bio, role, links and topics, saved as a Sanity draft for organisers to publish.

## Donate and membership audit (2026-11-02)

- **"Online payments are not available" on localhost is the missing configuration, not a code bug.** `STRIPE_SECRET_KEY` and `STRIPE_SUPPORT_PRODUCT_ID` are absent locally; the function answers 503. Compared with production's `checkout-support.ts`, the names, the product, CHF, `mode` (`payment` or `subscription` with a monthly `recurring` price), the API version and `customer_email` match. V2 always sends `price_data` on the support product (production also reused preset Price IDs); both end up on the same product. `submit_type=donate` goes only with one-time payments, as Stripe requires.
- **The fallback names only what the page shows.** The API error no longer mentions Twint. The form adds "Twint or email, under Other ways to give" when a Twint QR is set in Site settings, otherwise "write to hello@zurichjs.com". Production showed a Twint QR (`public/images/twint-code.png`); upload it in Site settings to show Twint again.
- **`STRIPE_API_BASE`** points the Stripe calls at a local mock (`tools/mock-stripe.mjs`) for development and e2e. It is ignored in production, so the secret key only goes to `api.stripe.com`.
- **No invoice creation.** Checkout's `invoice_creation` costs extra per invoice (spending needs the owner); receipts rely on Stripe's "Successful payments" email setting (RUNBOOK).
- **Membership is in the footer** ("Take part › Membership"), as in the header. This changes the footer on every page, so visual baselines need an intended update.
- **"Free or discounted workshops" stays without a note.** No source says what it covers since workshops were retired; it is a confirm item in `CONTENT-SOURCES.md`.

## Donate and membership, second pass (2nd November 2026)

Re-checked against the current build, production (`origin/main`: `buy-us-a-coffee.tsx`, `donate.tsx`, `membership.tsx`) and the mock Stripe API. Nothing real was charged or sent.

- **Donate keeps** one-time and monthly, presets CHF 10 to 50 plus a custom CHF 5 to 1000, the optional receipt email (or Stripe asks on its page), the live amount and frequency summary, cancellation instructions, "What support pays for" and the line that a donation is not a membership.
- **Unavailable state re-verified.** With no key the function answers 503 and the form says nothing was charged and names only what the page shows: email, plus Twint only when a Twint QR is set in Site settings. With the mock, the browser goes to the mock session URL.
- **Back from Stripe with the browser's Back button** no longer leaves the button stuck on "Opening the payment page…" (back-forward cache); a new attempt key is made. An invalid amount or email now moves focus to that field.
- **Restored from production:** a "Questions" section (receipts; cancelling a monthly donation, "No questions asked"; companies go to Host or sponsor) and "Thank you" naming the three supporters production thanked, with their links (no photos, no dates). Supporters are listed by hand; Stripe never publishes a name.
- **Not restored:** production's tax answer ("not yet tax-deductible … actively pursuing"). No current source confirms the association's tax status, so the page says nothing about deductibility (owner decision). Production's `/donate` "Feed the Box" cash box at meetups is also left out until an organiser confirms it still exists. "Events hosted" and "100% volunteer-driven" counters were not brought back.
- **Membership fees are one table** (`apps/web/src/lib/membership.ts`) used by the page and `/api/verein-inquiry`. Each card shows the monthly, quarterly and yearly price side by side, and one line with the per-year totals, which follow from production's prices (Basic CHF 174, 200, 175; Supporter CHF 252, 300, 250). The page says quarterly costs the most over a year; a unit test keeps that true. Production's "That's CHF 14.5/month" comparisons were not restored.
- **The organisers' email states the fee shown** ("Fee shown: CHF 250 a year") next to tier and billing cycle.
- **Voting:** production's words only, "Stay informed and vote on small decisions" (Basic) and "Voting rights" (Supporter), with a line pointing questions to hello@zurichjs.com. No statutes are in any repository; the owner should confirm what each covers.
- **Workshops:** "Free or discounted workshops" stays unchanged (owner). The standalone workshops are retired, and the conference workshop day on 10th September 2026 had no member discount; nothing was added. Owner decision recorded in `CONTENT-SOURCES.md`.
- **Form details:** the billing chips are labelled "Billing cycle" (was "Pay"), name and email carry `required`, and the email fallback after a failed request includes the email and fee.
- **Discoverability verified, not changed:** the header's "Get involved" menu lists Membership and Donate; the footer lists Membership and "Support us".

## Schedule fields and feedback availability (2026-11-02)

Audit items 4 and 5. Production Sanity events have only `datetime`, `location`, `address` and `talks`; no event has an `agenda` yet.

- **`datetime` is the start time listed on Meetup, not "doors".** Evidence from `origin/main`:
  - the event page header showed `datetime` as an unlabelled clock time (always suffixed "CEST", wrong in winter);
  - the event page programme ignored `datetime` and hardcoded doors at 17:30 with `setHours` in the browser's timezone, then 18:30 welcome and 18:50 first talk;
  - `/today` (`ScheduleCard.tsx`) instead called `datetime` "Doors open & early conference badge pickup";
  - the calendar file started at `datetime` and assumed 180 minutes.

  So September showed 17:00 in the header and 17:30 as doors. Neither is stored truth, and "Doors" for `datetime` is not supported. V2 says **"Starts 18:00 CET"** everywhere `datetime` is shown with a label: event opening and summary panel, Tonight ("Starts at …", "Started at …"), the calendar file description, and the Slack agent's change log ("Starts"). "Doors" appears only when the agenda has a timed doors line. Older docs that say "doors" for the state machine (live from doors for 48 h, rebuilds at doors) mean `datetime`.

- **Doors, welcome, talks, breaks, networking and close** have times only from the `agenda`. Without one the programme lists the talks in order with no time column, no per-talk placeholder and no synthesised lines (V2 used to add a "Doors open" line at `datetime`; removed). One note replaces the placeholder: past "Talk times weren’t recorded", future "Talk times follow closer to the day", during the evening "Talks in running order."
- **End** is `endsAt`, else the agenda's timed close line, else unknown. The calendar file still needs a DTEND, so it blocks three hours and its description says "End time not fixed; this entry blocks three hours." JSON-LD gives `endDate` only from `endsAt`.
- **Zone:** all times are Europe/Zurich with CET/CEST from the event's own date (tests on both sides of the March and October 2026 switches).
- **The Slack agent no longer defaults a missing time to 18:30;** it asks for the start time.
- **Feedback availability follows the event state:** per-talk ratings open at `datetime` (state `live`) and stay available for legacy links once `past`. Before the start, `?feedback=true` shows "Feedback isn’t open yet … opens when the meetup starts: Thu 12 Nov 2026, 17:30 CET. Keep this link; it works from then on." Cancelled, postponed and undated events say why. A draft preview build (`SANITY_PERSPECTIVE=drafts`) opens the ratings early for organisers to check; no accounts.
- **Social evenings without talks** only offer evening feedback: no "Rate the talks" wording on the event page, live banner, Tonight or `/feedback`.

## Sponsorship and partners restored (audit item 1, 2026-11-02)

The audit found no sponsor recognition on the home page, `/partners` or event pages, and production's commercial offering replaced by three generic "ways to support". That simplification was not approved.

- **Why recognition disappeared:** production Sanity has no `partner` documents and its deployed schema has no partner type (the Studio PR is unmerged). `PARTNERS_QUERY` returned `[]`, event `hosts` and `supporters` (references to partner documents) were empty, and every placement hides itself when its list is empty: the home logo section, the `/partners` groups (so `#partners-venues` and `#partners-community`, linked from the About timeline, did not exist), "Thanks to" on event pages and on Tonight. Only sample builds had partners.
- **Code-side fallback (Assumption, follows the `community.ts` pattern):** `packages/content/src/partners.ts` holds production's partner list, each entry with its source. `withPartnerFallback` uses it only when Sanity returns no partners; once Sanity has any partner document, Sanity wins and the record is ignored. With the fallback, each event's host is the venue partner named in its own `location` (Smallpdf, GetYourGuide, novu, Ginetta, Orbiz), and only the supporters production stated for an evening are added (the September 2026 warm-up: GetYourGuide, GYFF, FIN; October 2025: Dynatrace). Hosts or supporters an event already has always win. Sample content uses the same record.
- **`/partners` offering restored from production:** the five tiers (Champion, Builder, Friend, Supporter, Host) with production's yearly, monthly and one-time prices and benefits; current sponsors by tier with the logo size each tier promises; venue, conference, community and supporting partners with production's descriptions and outbound links; previous partners and sponsors (logos only, as production); "Request the prospectus" as the same email with the same subject; production's reach figures, labelled as published in October 2025, next to the conference site's attendee profile. Production's "Where your investment goes", speaker list and quick-interest form were not brought back.
- **Enquiry form:** the `?way=` preselection is unchanged. Tier buttons link to `?way=partner&tier=<tier>#partner-form` and preselect an optional "Sponsorship tier" select; the tier is sent with the inquiry. The Host tier maps to "Host a meetup", and production's food and drinks note to "Food and drinks".
- **Placements:** the home page shows current sponsors (Champion XL, Builder large) then venue hosts and current partners; upcoming event pages and Tonight thank the evening's supporters and this season's sponsors; past event pages thank their host and stated supporters.
- **Anchors:** `#sponsorship-tiers` (production's), `#partners-current`, `#partners-community` (all partner categories), `#partners-venues`, `#partners-conferences`, `#partners-communities`, `#partners-supporting`, `#partners-past`, and `#inquiry-form` as an alias for the form. The category sections render even when empty.

## Partners page, sponsor cleanup and inquiry form (2nd November 2026)

- **Vercel, Ginetta and Code Blossom are no longer promoted (owner).** `packages/content/src/partners.ts` marks them `delisted` and not current, and `isDelisted` applies the same to any Sanity partner with that id or name, so a seeded document cannot bring them back. `groupPartners` leaves delisted partners out of every list (current, venue, community and previous), so they disappear from `/partners`, the home page, upcoming event pages, Tonight and the design page. They remain only as history: a past event they hosted still names them (e.g. Ginetta on `zurichjs-4`), the About timeline keeps its 2025 entries, and `llms-full.txt` keeps past events' venues.
- **Event pages thank only their own supporters once past.** `eventThanks(ev, partners, { past })` returns the event's own hosts and supporters, plus current sponsors only while the meetup is not past. A meetup whose date has gone by (including a cancelled one) never shows "Supporting ZurichJS this season", so no past event implies today's sponsors supported it. JSON-LD hosts follow the same rule.
- **`/partners` order:** who you reach, what we take care of, four ways to partner (sponsorship, hosting, food and drinks, community collaboration; hosting and food are said to be free or separate and are not packages), sponsorship packages with what each payment option means, conference sponsorship as a separate block linking to conf.zurichjs.com/sponsorship, proof (current sponsors, "Hosts and partners" with the venue, conference, community and supporting groups, the testimonial, previous partners), then the form. The umbrella was renamed "Hosts and partners" so "Community partners" names only the group. Packages use 4 columns from `lg`, 2 from `md`, 1 below; cards end with their own list (`items-start`) and every card has the same three price rows in the same order.
- **Pricing kept as production:** yearly is ten times monthly ("2 months free"). Production never says how long one-time benefits last or whether monthly has a minimum term, so the page says "A single contribution. Ask us what it covers when we plan it together." **Owner decision:** the duration of one-time benefits and any monthly minimum.
- **Host and Community Friend:** production says covering speaker travel (about CHF 1’500 to 2’500) "automatically qualifies you as Community Friend sponsor" without saying why that differs from the Friend price (CHF 3’000 yearly, 300 monthly, 400 one-time) or how long the recognition lasts. The page repeats production's statement only. **Owner decision:** explain the equivalence (e.g. for that evening or for a period).
- **Workshop perk removed:** "Co-host one exclusive workshop per year" (Champion) is no longer offered; workshops are discontinued. The Cloudflare testimonial mentioning a past workshop stays.
- **Figures:** the October 2025 reach figures are headed "Our reach in October 2025" and footnoted as not updated; "114 peak RSVP rate" now reads "RSVPs for a single meetup, the highest at the time". The attendee profile (75%+, 40%, 60%+) is labelled as conf.zurichjs.com/sponsorship's "meetup attendee profile", undated and without a stated method (the conference page itself says it uses the meetup profile). The organisers' Meetup export is added as RSVPs, not check-ins: 520 people RSVP'd yes to at least one of 18 meetups (November 2024 to September 2026), 36% of them to 2 or more.
- **Form:** intents are Sponsorship (`way=partner`, kept for existing links), Host a meetup, Food and drinks, Community collaboration (new, `way=community`) and Not sure yet (the default). The chosen intent is shown ("You’re asking about: Sponsorship: Community Builder"), stays editable, and is written back to the URL so a reload keeps it; `?tier=` alone implies sponsorship, and `#inquiry-form` works as before. New optional fields: phone (`type=tel`) and, for hosting, room size. The message hint changes per intent. The page and success message say an organiser replies from hello@zurichjs.com and nothing is agreed until you confirm; no response time is promised (production's "24 to 48 hours" was not carried over). Delivery labels every field for organisers (`partnerSummary`) and the subject names the intent.

## Media archive and venue maps after the audit (2026-11-02)

- **The archive was checked against real data.** Production's ImageKit listing (14 folders, 816 photos and 16 clips) was served from a local mock of the Admin API (`tools/imagekit-mock.mjs`, `IMAGEKIT_API_URL`) to a build reading production Sanity. Every folder matches an event slug; per-event counts on `/media/<slug>` match the listing. A trimmed copy (`packages/content/test/fixtures/imagekit-files.json`) keeps that mapping under test.
- **Phone clips:** ImageKit lists `.MOV` files with their MP4 rendition (`…/IMG_1.MOV/ik-video.mp4`), which plays in browsers; posters come from `…/IMG_1.MOV/ik-thumbnail.jpg`, sized with `tr=w-…` like photos. HEIC photos are shown through `f-auto`.
- **A missing archive is never "coming soon".** Without `IMAGEKIT_PRIVATE_KEY`, or when the listing fails, the build log says so loudly and pages say the archive could not be loaded for this version of the site. Production builds (`MEDIA_REQUIRE_IMAGEKIT=1` in `netlify.toml`, or `CONTEXT=production`) fail instead, so the previous deploy with its photos stays live; deploy previews, branch deploys and the draft preview site continue without it.
- **Event pages say what is true:** photos and clips when there are any; "not online yet" only in the two weeks after an event; afterwards "There are no photos from this evening in our archive", with a link to `/media`.
- **`/media`:** a list of event dates to jump to (with the day, since some months had two meetups) and all clips gathered in one section that says the talks are not recorded.
- **Maps:** "Show map" always loads a map on request. With `PUBLIC_GOOGLE_MAPS_EMBED_KEY` it is the Maps Embed API; without it, Google Maps' keyless embed of the address (`https://www.google.com/maps?q=<address>&output=embed`), which has no usage guarantee. No Google request before the click, the privacy note stays, and "Get directions" stays next to the map.

## Owner changes, 2nd November 2026 (evening)

- **Venue maps are always shown** (owner), replacing "load on request": the Google map sits under the address on every event page and loads lazily as it scrolls into view; "Get directions" stays next to it. With `PUBLIC_GOOGLE_MAPS_EMBED_KEY` it is the Maps Embed API, otherwise the keyless embed.
- **Long talk descriptions are truncated on event pages** (owner): five lines, ending in "…", with a "Read more" / "Show less" button. The full text stays in the page for search engines and screen readers. Speaker profiles keep the full text.

## Volunteer form restored to production's fields (2nd November 2026)

- **Fields:** V2's /cfv asked only for name, email, one help category and an optional message. It now collects what production's /cfv did: name (one field), email, LinkedIn profile (required, must be a linkedin.com link, production's check), GitHub username or link (optional), availability (a few hours weekly, a few hours monthly, only during events, or Other with a short text), areas of interest (one or more, nothing preselected) and why they want to volunteer (required). The payload keeps production's field names: `linkedinProfile`, `githubProfile`, `availability` (`weekly`, `monthly`, `events`, `other`), `interests` (array) and `message`; `availabilityOther` is new. (Assumption)
- **Areas:** production's list without workshop organisation (workshops are de-scoped), plus V2's photography and video. Labels are in plain British English ("Event organisation", "Social media").
- **Delivery:** production stored no volunteer record; `/api/submit-volunteer` only sent a Slack and Pushover notification. The deployed Sanity schema has no volunteer type. V2 does the same without Sanity: a `volunteer` form kind on `/api/forms/volunteer` emails the organisers (Resend, reply-to the applicant) and posts to Slack, both with every field (`volunteerMessage` in `packages/integrations`). No Studio view depends on these names.
- **Page copy** comes from production: professional growth, networking and community impact; unpaid and run by volunteers; the three availability choices; and production's "someone from the organising team will contact you within 7 days". V2's earlier "before the next meetup" was not from production and is gone. Open for the owner: whether the 7-day promise still holds.
- **Form behaviour:** native radios and checkboxes styled as pills, inline errors linked with `aria-describedby`, focus on the first error, values kept after a failed send with an email fallback, the button disabled while sending, and success shown only after the API accepts. The honeypot is the shared one.

## Talk proposals and contact after the audit (2nd November 2026)

Audit task: production's `/cfp/form` and `/contact` (origin/main `src/pages/cfp/*`, `src/components/cfp/*`, `src/pages/api/submit-talk.ts`, `src/pages/contact.tsx`) against V2.

- **The CFP collects production's fields again.** About you: name, email, job title, short bio, LinkedIn, optional GitHub and X. The talk: title, description ("What will people learn?", now required as on production and in the Studio), length, level and one to eight topics from production's list (`TALK_TOPICS`, stored as `talkSubmission.tags`). First-time-speaker help stays. Production split first and last name; V2 keeps one name field because `speaker.name` is one field.
- **Returning speakers** tick "I’ve spoken at ZurichJS before" and may leave the profile empty; the speaker is matched by email as before. Unlike production, which patched the published speaker from a public form, V2 never changes an existing speaker: what they sent goes into the submission's `reviewNotes`, and the page changes through the private profile link (`pnpm speaker-link`, `/speakers/profile`) or an organiser. New speakers get a hidden speaker document with job title, bio and links (GitHub and X handles become `https://github.com/…` and `https://x.com/…`).
- **Photo: no upload in the CFP.** Production required one. V2 says "not needed now", gives production's guidance (square, at least 400 by 400 pixels) and asks for it after acceptance through the existing profile link, which uploads to Sanity assets as a draft. No accounts.
- **Lengths: a 10-minute lightning talk or a 20-minute full talk** (owner, 4th November 2026; earlier 5 and 25 minutes, as production offered). The Studio's `talkSubmission` offers 10 and 20; older submissions keep their 5, 25 or 35. The stored form values stay `Lightning` and `Standard`, so saved drafts still open. No deep dives.
- **Travel and accommodation: nothing is promised.** Production's CFP said meetup travel is not covered and its contact FAQ said it is not currently covered; V2 promised it. `partners.ts`, `/donate` and `/about` say sponsors and donations pay for speaker travel. Both `/cfp` and `/contact` now say "can’t promise to cover travel or accommodation for meetup speakers … say so in your proposal and we’ll tell you what we can offer for that meetup". (Owner decision.)
- **Topics beyond JavaScript:** production said talks "should focus on JavaScript or related web technologies"; V2 said "Not really". `/about/why-zurichjs` (Laravel talk) and Sanity talks (career development, communication, observability, infrastructure as code) support a middle line: "Mostly JavaScript and the web, but not only."
- **Response times:** production's success message promised a reply "within the next 2 weeks". V2 promises no time: organisers reply by email.
- **Drafts** are saved on every change (not in an effect, so the last keystroke survives a reload), disclosed above the form, cleared by "Clear saved answers" and after a successful send, and kept after a failed one, with the whole proposal in the email fallback.
- **Contact** keeps the form and restores production's channels (email, LinkedIn, Meetup), the two organisers with their emails and what to ask them about, and the FAQ (speaking, travel, beginners, hosting, getting involved, replies) with FAQPage JSON-LD. Code of conduct concerns have their own block (`#conduct`): the code of conduct's route (email hello@zurichjs.com or speak to a team member at an event) and a note not to use the form, because the form also posts to the organisers' Slack. `?topic=conduct` shows that note; other presets: `slack`, `speaking`, `hosting`, `press`, `website`.
- **Form quality (all forms):** fields are named by their label alone (`aria-labelledby` in `Field.tsx`) and described by hint and error; "All fields are required unless marked optional" plus `(optional)` labels and `required`; the honeypot is also `inert`; `useSubmitOnce` ignores a second submit while one is running; radios and topic checkboxes are native inputs (arrow keys and Space work).

## The Studio joins the repo (3rd November 2026, owner)

- **`apps/studio`** is `zurich-js/zurich-js-website-sanity-studio` imported with `git subtree` (history kept), after Studio PRs #1 and #2 merged. It is a pnpm workspace package, `@zurichjs/studio`; its npm lockfile is gone, and its direct dependencies are pinned to the versions that lockfile had (Sanity 3.79.0), so the move changes no versions. `@sanity/icons`, `@sanity/ui` and `@sanity/schema` are now declared (the code imported them; npm's flat layout hid that).
- **Typegen runs in the repo:** `pnpm --filter @zurichjs/studio typegen` writes `packages/content/src/sanity.types.ts`. CI's `studio` job builds the Studio, lints it and regenerates the types, failing on any difference.
- **The Studio keeps its own ESLint and Prettier**; the root oxlint, oxfmt and knip skip `apps/studio`. Its TypeScript check is part of `pnpm typecheck`.
- **Deploys stay manual:** `pnpm exec sanity deploy` from `apps/studio`. Nothing deploys the Studio on merge.
- **Sanity 6** (owner, same day): the Studio moved from 3.79 to 6.21 with React 19.2. Code changes: `Stack` takes `gap` (`@sanity/ui` 4), icons import from their own paths (`@sanity/icons/Calendar`, `@sanity/icons` 5), and TypeGen names results `EVENTS_QUERY_RESULT` (Sanity 5). `sanity.cli.ts` names the deployed Studio (`deployment.appId`) and keeps auto-updates. This also cleared the Studio's audit findings; three that remained deep in the Sanity CLI (`js-yaml` 3, `smol-toml` 1, `undici` 7) are patched by same-major overrides in `pnpm-workspace.yaml`. `pnpm audit` is clean.
- **The Studio deploys on merge** (owner): `.github/workflows/deploy-studio.yml` runs `sanity deploy --yes` when `apps/studio` changes reach `main`, with the `SANITY_DEPLOY_TOKEN` secret; it skips with a notice without it. Migrations stay manual.

## Talk proposals for meetups only, with a photo; a success colour (3rd November 2026, owner)

- **/cfp shows the meetup form straight away.** ZurichJS Conf's call for papers is over, so the meetup-or-conference choice is gone. The form is grouped as About you, Speaker profile, Socials, Your talk and Before you send, with short notes beside it on wide screens.
- **Fields match the Sanity speaker:** job title (`title`), company, bio, photo (`image`), LinkedIn, GitHub, X (`twitter`), Bluesky (new `bluesky` field) and website. A new speaker gets them on their (hidden) speaker document; an existing speaker's page never changes from the public form, and what they sent, including a new photo, goes into the submission's review notes.
- **Photo upload:** optional, JPEG, PNG or WebP. The browser shrinks it to at most 1600 px, and a proposal with a photo is sent as multipart (`data` plus `photo`); the API checks the type and the 5 MB limit.
- **Speakers confirm the terms** with a required checkbox: travel and accommodation can't be covered for meetup talks because events are free, and acceptance depends on the theme and on speaking slots. Checked in the browser and on the server.
- **Green for success.** `success` and `success-soft` are added to the palette for confirmations only (sent forms, "Saved answers cleared.", "Link copied."). Yellow stays the only accent.

## The rating out of 5, and the award linked (4th November 2026, owner)

The proof sentence now reads "Rated 4.9/5 on Meetup from 199 ratings, and winner of the 2026 Open Source Award for Most Impactful Contribution to the Community globally." The award links to the award section on the home page (`/#award`). This replaces the earlier rule of never printing "/5".

## Share cards (owner, 4th November 2026)

- **Every page shares a generated 1200×630 card** (`apps/web/src/lib/og.ts`, rendered by `pages/og/[name].png.ts`): page cards by path, one shared card for the policies, and `/og/default.png` for anything else. No page shares a photo or the square logo any more.
- **Events** always use their own card: the date, title and venue, with the Sanity artwork on the right when there is one, and a "Recap" pill once the event is past. **Speakers** use their photo (face crop) or their initials.
- **Design:** black, white and yellow, Figtree, 24px tiles, the wordmark and zurichjs.com on top, no kicker line. Emoji are removed from card text (the font has none).
- **Tags:** `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image:alt` on every page. Deploy previews point share images at their own URL (`DEPLOY_PRIME_URL`); canonical URLs stay on zurichjs.com.
- **The SEO gate** fails a page whose share image is not a generated 1200×630 card.
