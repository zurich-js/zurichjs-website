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
