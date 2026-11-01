# Status

Plain-language status after each phase. Newest at the bottom.

## Phase A: V2 public site landed as `v2/` (2026-10-31)

**Done**

- The design-handoff site is in `v2/`, beside the production app, with no change to how production builds.
- It installs with pnpm, type-checks, builds (16 screens; 26 static pages plus the forms API), and `pnpm audit` is clean.
- Production checks are unchanged and pass: lint (oxlint and ESLint), format, and typecheck all ignore `v2/`.

**Verified how**

- A Playwright smoke run against the production build covered 19 routes at 320, 390 and 1440 px. Every page returns 200 (the 404 page returns 404). There are no console errors, no horizontal scroll, and Figtree is the computed and loaded font everywhere.
- The run found and fixed a fallback-font bug on `<body>`.
- Recordings: home → event, the eight event states, and /today on a phone.

**Open**

- All content in `v2/` is sample content (see the PR description).
- The forms post and validate, but nothing is forwarded.
- The root `next build` cannot finish here because Sanity is blocked (BLOCKERS #1). It compiles; it fails at data collection.

**Next:** Phase 0. Write PLAN.md, the SEO baseline, the dead-code report and the Sane readiness note.

## Phase 0: plan (2026-10-31)

**Done**

- `PLAN.md`: platform layout, sitemap with rendering mode and rebuild trigger per route (including every production-only route and its fate), design-system inventory, CI matrix, risks and decisions.
- `SEO-BASELINE.md`, plus the crawl tool and baseline data in `platform/tools/seo/`. Records what Google and LLM crawlers get today, the parity rules the Astro app must pass, and the production SEO defects V2 fixes.
- `DEAD-CODE.md`: knip report for the production app (28 dead files, 5 unused dependencies, dead exports).
- `SANE-READINESS.md`: what Sane offers today and the two seams (`TicketingProvider`, `TalkProposalSink`) the platform builds so Sane can plug in later.

**Verified how**

- Crawled 27 production routes locally with JavaScript off. The 20 routes that need Sanity were read from source, by an agent and spot-checked.
- knip findings were grep-checked: every flagged file is referenced only by other flagged files.

**Open**

- No live crawl of zurichjs.com (blocked; BLOCKERS #3).
- Owner decisions:
  - what `/workshops/*`, `/tshirt` and `/invite` do at switchover
  - whether the Studio repo is the deployed Studio

**Next:** the `v2/root-dead-code` PR (production cleanup), then Phase 1 (Astro app).

## Phase 1: Astro app (2026-10-31)

**Done**

- `platform/`, a separate pnpm workspace:
  - **Astro 5 site:** static, Netlify adapter, Preact islands.
  - **Packages:**
    - `events`: state, presentation, ticketing seam, `.ics`
    - `content`: Sanity over fetch, mappers, sample fallback
    - `seo`: meta, JSON-LD, sitemap, llms.txt
    - `forms`: zod on the server, a light validator in the browser
    - `integrations`: Sanity writes, Resend, Slack, Stripe, the talk-proposal seam
    - `config`
- **All V2 screens are ported except workshops (de-scoped):** home, events list and detail (upcoming, live and recap), speakers, CFP, about, why ZurichJS, /today, partners, feedback, contact, donate, volunteer, photos, policies (production text), 404.
- **Forms API:** `/api/forms/[kind]` runs as a Netlify Function with the V2 payload contract.
- **Generated files:** `/sitemap.xml` (complete), `/robots.txt`, `/llms.txt`, `/llms-full.txt`. Legacy URLs redirect with 301.

**Verified how**

- `astro build` and `astro check` (0 errors); oxlint, oxfmt and knip all clean.
- Vitest: 50 tests, covering every event-state transition including the exact 48-hour boundary and cancelled/postponed precedence, the content mappers, forms, SEO builders, form forwarding and the API.
- Playwright: 47 tests. Every route returns 200 with Figtree loaded and one h1, with no horizontal scroll at 320, 390 or 1440. Redirects, skip link, focus ring and the keyboard mobile menu all pass.
- SEO parity gate passes against the production baseline.
- Lighthouse mobile scores on home, event and speaker pages:

  | Page    | Performance | Accessibility | Best practices | SEO |
  | ------- | ----------- | ------------- | -------------- | --- |
  | Home    | 99          | 100           | 100            | 100 |
  | Event   | 100         | 100           | 100            | 100 |
  | Speaker | 100         | 100           | 100            | 100 |

**Open**

- Content is still sample content here, because Sanity is blocked from this environment.
- Stripe, Resend and Slack are stubbed until their secrets exist.
- Production routes outside the V2 design (membership, landing pages, ai-context, success pages, speaker feedback, OG images) are Phase 1b.

**Next:** Phase 1b.

## Phase 1b: remaining public routes (2026-10-31)

**Done**

- Every remaining production URL that is not de-scoped or removed is now ported:
  - `/meetups/javascript-zurich`, `/meetups/ai-ml-zurich`, `/conferences/tech-conferences-zurich` (FAQ content verbatim with FAQPage JSON-LD, keywords, geo tags)
  - `/ai-context` (every URL a real link, plus links to `/llms.txt`)
  - `/membership`, `/waitlist/conf`
  - `/success`, `/checkout/success` (noindex)
  - `/feedback/speaker/[token]` (on demand, noindex, JWT)
- Pro-meetup ticket sales on the event page (Stripe Checkout through a function that checks the price against Sanity).
- Static OG images (`/og/*.png`, satori), and the production `/api/og/*` URLs 301 to them (Phase 4 netlify.toml).
- Functions: `verein-inquiry`, `subscribe` (EmailOctopus), `stripe/checkout-sessions`, `get-price`, `validate-coupon`, `speaker-feedback/[token]`.
- **Copy corrected to match what the code does:**
  - the 2026 FrontConf and Voxxed Days partnerships are in the past tense
  - Pro Meetups are no longer described as free
  - no promises about receipts or ticket delivery times that the code cannot keep

**Verified how**

- Unit tests: 103.
- `astro check`: 0 errors.
- Playwright: 63 tests, including every new route at 390 and 1440 and 320px overflow.
- SEO parity gate: 0 failures and no pending routes. Only the owner-decision routes remain (workshops, T-shirt, admin, profile, invite).
- Platform `pnpm audit`: no known vulnerabilities.

**Open (owner)**

- Production copy kept as is: "900+ developers" and the workshops mentioned in two landing-page FAQs.
- **Purchase notifications** now post to Slack the first time a paid session is viewed. A Stripe webhook would be more reliable.
- Stripe customer receipts must be switched on in the Stripe dashboard if receipts are wanted.

**Next:** Phase 2.

## Phase 2: design system (2026-11-01)

**Done**

- **`@zurichjs/design`** (`platform/packages/design`) holds:
  - the tokens (`src/tokens.ts`), which generate the Tailwind 4 `theme.css` and `fonts.css`
  - Figtree
  - 22 Astro components and 5 Preact island primitives, moved with `git mv`, so history is kept
- **Components take props and never load content.** `RatingSheet` takes `onSubmit`. The app keeps only its own islands (event, forms, today, tickets, checkout).
- **Stack:**
  - Astro 7.4.4 is locked in by a test.
  - Tailwind 3 → 4 through `@tailwindcss/vite`. The PostCSS and Tailwind configs are removed.
  - Figtree comes through the Astro 7 Fonts API: generated `@font-face`, a preload and a metric-matched fallback.
- **The `/design` gallery** shows every component in every variant, plus colour, type, radius and gutter, EventRow in all 8 states, and the islands. It is noindex and in neither the sitemap nor `llms.txt`.
- **Written rules:** [docs/design-system.md](../design-system.md).
- **Visual regression:** `platform/e2e/visual.spec.ts`, 8 pages at 390px and 1440px.
  - Builds and the browser clock are pinned with `BUILD_NOW`, so output is deterministic.
  - Baselines are committed.
- **Tests** guard the ownership rules:
  - the generated CSS matches the tokens
  - no component exists in both the package and the app
  - no conflicting button classes
  - heading recipes follow the tokens

**Verified how**

- **Migration check:** every sitemap route plus the success and 404 pages, at 390px and 1440px, compared against a Tailwind 3 build of Phase 1b. 80 of 82 screenshots are pixel-identical. The 2 that differ are the "Copy link" underline: the design specifies it, and Tailwind 3 had been dropping it ([DECISIONS](./DECISIONS.md#phase-2-design-system-2026-11-01)).
- **Tests:**
  - Unit tests: 122.
  - `astro check`: 0 errors in the app and in the package, including all 22 `.astro` components.
  - Playwright: 79 tests (site, accessibility, visual).
- **Static checks:** knip, oxlint, oxfmt and `pnpm audit` are clean.
- **SEO parity gate:** OK, with no change from Phase 1b.
- **Lighthouse** (mobile):

  | Page    | Performance | Accessibility | Best practices | SEO |
  | ------- | ----------- | ------------- | -------------- | --- |
  | Home    | 99          | 100           | 100            | 100 |
  | Event   | 99          | 100           | 100            | 100 |
  | Speaker | 100         | 100           | 100            | 100 |

  The event page was 100 before. Its HTML grew by about 1 KB gzipped from the Tailwind 4 CSS, and the local server does not compress.

**Next:** Phase 3 (Sanity: typed queries, draft preview, Studio PR).

## Owner change: no payments (2026-11-01)

**Done**

- **Removed:** pro meetups and every Stripe path (ticketing, donation checkout, three functions, the success pages, the `stripe` dependency).
- **`/donate` is now "Support ZurichJS"**, with no payments, at the same URL.
- **Redirects:** `/success` → `/donate` and `/checkout/success` → `/events`, both 301.
- **Studio:** the Phase 3 branch deprecates `isProMeetup` and `stripePriceId` instead of deleting them. Details: [DECISIONS](./DECISIONS.md#no-payments-pro-meetups-and-stripe-removed-owner-2026-11-01).

**Verified how**

- Unit tests: 92 (the ticket and donation tests are gone; a test for `chainTicketing`, the Sane seam, is new).
- Playwright: 75 tests, including the new redirects. Visual baselines were refreshed because the footer label and the `/today` support card changed.
- SEO parity gate: OK. The only new note is the `/donate` title change.
- Static checks: knip, oxlint, oxfmt, `astro check` and `pnpm audit` are clean.
- Studio: build and typegen pass.

## Phase 3: Sanity (2026-11-01)

**Done**

- **Typed queries:**
  - `@zurichjs/content` reads through types that `sanity typegen` generates from the Studio schema and the site's queries (`sanity.types.ts`).
  - The raw shapes are derived from them, nullable throughout, because production documents predate the V2 schema.
  - A test catches a query changed without re-running typegen.
- **Draft preview:** `SANITY_PERSPECTIVE=drafts` (token required) builds the static site from drafts, with noindex everywhere, `robots.txt` disallowing everything and a "Draft preview" bar.
- **`/donate`:** a "One-off contribution" section with email and a Twint QR code that appears once it is uploaded to Site settings.
- **Studio branch `v2/phase-3-sanity`:**
  - Twint fields on Site settings
  - `npm run schema` and `npm run typegen` scripts
  - the pro-meetup and Stripe fields deprecated
  - PR opened, cross-linked with the website PR

**Verified how**

- **Tests:**
  - Unit tests: 100, including perspective, rating, support mapping and types-in-sync.
  - `astro check`: 0 errors.
  - Playwright: 79 tests, including "no sample payment code" and "regular builds are indexable".
- **Static checks:** knip, oxlint and oxfmt are clean.
- **SEO parity gate:** OK.
- **Preview builds:**
  - Without a token, the build fails with a clear message.
  - With a token, every page is `noindex,nofollow`, `robots.txt` is `Disallow: /`, and the bar shows. Sanity is blocked here, so that build ran on sample content.
- **Studio:** `sanity build` and typegen pass.

**Open (owner)**

- Upload the Twint QR in Site settings, once the Studio is deployed.
- Create the preview Netlify site, with `SANITY_PERSPECTIVE=drafts` and a Viewer token (Phase 4 RUNBOOK).
- `sanity deploy`, and run the additive migration on `production`.

**Next:** Phase 4 (CI and Netlify).

## Phase 4: CI and Netlify (2026-11-01)

**Done**

- **`V2 platform` workflow (`.github/workflows/v2.yml`), three jobs:**
  - **checks:** lint, format, knip, types, unit tests, audit
  - **site:** build, e2e and accessibility, visual regression, SEO parity, Lighthouse, with reports uploaded
  - **reference:** the `v2/` reference site
- **No Claude review workflow** (owner: no API-key reviews).
- **`platform/apps/web/netlify.toml`:**
  - the build, with production required to read Sanity
  - the scheduled function
  - redirects from `/api/og/*` to the static images
  - cache headers and security headers
- **Rebuilds:**
  - `/api/rebuild`, a signed Sanity webhook that records a pending build in Netlify Blobs
  - `scheduled-rebuild`, every 2 minutes, with a debounced build hook and builds at doors and doors + 48 h
  - `/state-changes.json`
- **Removed:** no nightly rebuild (owner).
- **Runbook:** [RUNBOOK.md](./RUNBOOK.md) covers setup, how rebuilds happen, rolling back, failures, CI and switchover. The Studio's `WEBHOOKS.md` was updated to match.
- **Visual baselines made independent of installed fonts:** an SVG check icon, a plain hyphen, and Figtree for the gallery's code labels.

**Verified how**

- **Unit tests:** 109, including 9 new rebuild tests: debounce, doors, the signature with the `@sanity/webhook` scheme, webhook responses, and the scheduled tick with a failing hook.
- **Playwright:** 79 tests. 4 visual baselines were refreshed: About and the gallery, at 390 and 1440 px.
- **SEO parity gate:** OK.
- **Lighthouse CI**, run locally with `lighthouserc.json`: every assertion passes.
- **Netlify tooling, run locally:**
  - `@netlify/config` resolves `netlify.toml` with base `platform/apps/web`
  - `zip-it-and-ship-it` bundles `scheduled-rebuild` with schedule `*/2 * * * *`
- **`v2/`:** typecheck and build pass.
- **The workflows themselves run on this PR.**

**Open (owner)**

- Steps 1–7 of the RUNBOOK setup: the Netlify site or sites, environment variables, build hook, Sanity webhook or webhooks, and the Twint QR.

**Next:** Phase 5 (agentic workflow).
