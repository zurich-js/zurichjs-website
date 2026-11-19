---
type: System
title: Testing
description: How the repository is tested: Vitest unit and handler tests, Playwright end-to-end and accessibility runs, visual regression, motion checks, and the rules for changing tests.
tags: [testing, vitest, playwright, visual-regression]
timestamp: "2026-11-19T00:00:00Z"
---

# Testing

## Rules

- **Don't weaken a test, a security check or the SEO gate to get green.** Fix the cause, or record an intended change with a reason (`tools/seo/allowlist.json`).
- **Every PR includes screenshots and a short recording** (`agents/skills/visual-review/SKILL.md`), and is checked before a merge with `agents/skills/release/SKILL.md`.
- **No test calls a network service or an AI model.** The Slack agent's tests use an in-memory Sanity and a scripted model; donations and memberships run against `tools/mock-stripe.mjs`.

## Unit and handler tests (Vitest)

`pnpm test` runs `vitest.config.ts`: every `packages/*/test`, `apps/*/test` and `tools/**/*.test.ts`.

- **Packages:** event state, schedules and readiness (`packages/events/test`); content mappers, the ImageKit and Sane reads, partners, and `types-in-sync.test.ts` (`packages/content/test`); form schemas; form forwarding and email; the design tokens and recipes; the emails; membership state and the Postgres store; the agent's tools, publish flow, prompt and the CFP bot (`packages/agent/test`).
- **The app:** API handlers tested with injected `fetch` (donations, forms, membership, admin, speaker feedback, rebuild, Slack interactivity, the CFP bot's functions end to end with fake Slack, Sanity and model), the certificate, and `apps/web/test/stack.test.ts` (Astro 7, Tailwind 4, Node version, design-system ownership).
- **Database tests** (`packages/membership/test/db.test.ts`, `apps/web/test/admin-db.test.ts`, `apps/web/test/cfp-db.test.ts`) run the SQL on a real Postgres and skip when no Postgres binaries are installed.
- **`tools/agents.test.ts`** keeps the agent docs true: every repository path named in backticks in `AGENTS.md`, the [Slack content agent](/systems/slack-agent.md) concept, the playbooks and the roles exists; playbooks and roles have valid frontmatter; `CLAUDE.md` only imports `AGENTS.md`; `.mcp.json` pins its packages and takes credentials from the environment; the Slack manifests point at functions that exist.

## End to end (Playwright)

`pnpm e2e` runs `playwright.config.ts` against a built `apps/web/dist`, served by `tools/serve-dist.mjs` the way Netlify serves it (pretty URLs and both kinds of redirects). Build first, with sample content and a fixed clock.

| Spec                      | Covers                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/site.spec.ts`        | no horizontal scroll at 320px, legacy redirects, retired-page notes, the header and mobile menu, focus and skip link, indexability                                                                          |
| `e2e/journeys.spec.ts`    | event schedules and venues, feedback, Tonight, donations and membership (the real handlers against the Stripe mock), speakers, the media archive, partners, the community page, volunteering, the home page |
| `e2e/cfp-contact.spec.ts` | the talk proposal and contact forms                                                                                                                                                                         |
| `e2e/keyboard.spec.ts`    | the rating dialog and the segmented switches from the keyboard                                                                                                                                              |
| `e2e/a11y.spec.ts`        | axe on the gallery viewer and rating dialog, touch target sizes                                                                                                                                             |
| `e2e/motion.spec.ts`      | the motion layer, with motion on                                                                                                                                                                            |
| `e2e/visual.spec.ts`      | visual regression                                                                                                                                                                                           |

- **Reduced motion by default:** every spec runs with `reducedMotion: 'reduce'` (`playwright.config.ts`), so runs are deterministic. `e2e/motion.spec.ts` turns motion back on to check the segmented thumb, disclosures, dropdowns, page transitions, the header, the reveals, the logo rows and a sponsor card's hover colour. A motion change gets its check there.
- **Chromium text rendering is fixed** (`--disable-lcd-text`, `--font-render-hinting=none`, `--force-color-profile=srgb` in `playwright.config.ts`), so baselines made locally on Linux match CI. Keep these flags.

## Visual regression

`e2e/visual.spec.ts` screenshots these pages at 390px and 1440px against the baselines in `e2e/__screenshots__`:

- home
- an upcoming event, a recap event and a past event without times
- the speakers list and a speaker page
- an event's media page
- about, today, cfp, partners, donate, membership, the sponsorship agreement
- the `/design` gallery

- **Deterministic input:** build with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00`; the browser clock is fixed to the same instant.
- **Environment:** the baselines come from Playwright's Chromium on Linux (Ubuntu, as on `ubuntu-latest`). Run the suite in the same environment, or it reports false differences. It runs with reduced motion and animations disabled, so a motion change alone never moves a baseline.
- **Baselines change only for intended changes.** Update them with `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`, review the new images, and say why in the PR.

## Related concepts

- [CI and GitHub workflows](/systems/operations/ci.md), [Local development](/systems/local-development.md), [SEO](/systems/seo.md)
- [Motion](/systems/design-system/motion.md), [Design system package](/systems/design-system/overview.md)

# Related specs

None.
