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
