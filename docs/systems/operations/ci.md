---
type: System
title: CI and GitHub workflows
description: The GitHub Actions workflows, what each CI job checks, and the dependency audit policy.
tags: [operations, ci, github-actions]
timestamp: '2026-11-25T00:00:00Z'
---

# CI and GitHub workflows

| Workflow                                      | Runs on                                                 | What it does                                                                     |
| --------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `CI` (`.github/workflows/ci.yml`)             | every PR, and pushes to `main`                          | The jobs below, in parallel.                                                     |
| `Dependency Review` (`dependency-review.yml`) | every PR                                                | Blocks known-vulnerable dependencies.                                            |
| `Deploy Studio` (`deploy-studio.yml`)         | changes under `apps/studio` reaching `main`, or by hand | `sanity deploy --yes` with `SANITY_DEPLOY_TOKEN` ([Studio](/systems/studio.md)). |
| `preview-db-cleanup.yml`                      | a PR closing                                            | Drops that PR's Neon database `pr_<number>` (`NEON_PREVIEW_DATABASE_URL`).       |

## CI jobs

- **checks** (Lint, types, unit tests, audit): `pnpm lint` (oxlint), `pnpm lint:ui` (the design-system ESLint rules), `pnpm format:check` (oxfmt), `pnpm knip`, `pnpm typecheck` (`astro check` and `tsc`), `pnpm test` (Vitest), `pnpm audit --audit-level moderate`.
- **studio** (Studio build and generated types): the Studio's ESLint, `sanity build`, and a check that `packages/content/src/sanity.types.ts` and `apps/studio/schema.json` match what `pnpm --filter @zurichjs/studio typegen` generates.
- **e2e** (Build, e2e, visual), once per Playwright project (`mobile` at 390 px, `desktop` at 1440 px), side by side:
  - the build, with sample content and a fixed clock
  - Playwright end-to-end, accessibility and visual regression for that project, every spec with reduced motion, and `e2e/motion.spec.ts` with motion on ([Testing](/systems/testing.md))
  - a "Visual diff summary" step that shows where each screenshot differs
- **site** (Build, SEO parity, Lighthouse on main):
  - the same build
  - the SEO and LLM parity gate ([SEO](/systems/seo.md))
  - Lighthouse on mobile (`lighthouserc.json`), only on pushes to `main`, never on a pull request (owner, 25th November 2026): performance ≥ 0.9 as the median of 3 runs, accessibility and SEO = 1, best practices ≥ 0.95. Shared runners vary in speed; local runs score 99–100.

The jobs run in parallel and each builds the site itself, so a pull request's run takes as long as its slowest job, the e2e suite (about 4 minutes), instead of the 8 the single site job took. A Lighthouse failure therefore shows on `main` after the merge, not before it. Reports are uploaded for 14 days as `reports-e2e-mobile`, `reports-e2e-desktop` and `reports-site`. CI runs on `ubuntu-latest` with Playwright's own Chromium, the same build the visual baselines were made with.

**No CI job calls an AI model** (owner). There is no AI review workflow; CodeRabbit and the CI checks review PRs.

## Dependency audit

- The repository root's `minimumReleaseAge` delays new releases as a supply-chain policy.
- **No advisory is ignored.** The picomatch ignore (`GHSA-fc5q-39xc-vjpf`, owner, 18th November 2026) was removed on 19th November 2026, when the audit passed without it. If an advisory with no fixed release blocks a deploy again, an ignore goes in `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` with a reason and the owner's go-ahead.
- **`@emnapi/runtime` is overridden to 1.x** in `pnpm-workspace.yaml`. Since Astro 7.4.12 pnpm otherwise fills the `@napi-rs/wasm-runtime` peer with the 2.0.0 beta, which breaks `astro check`.
- Other overrides patch transitive packages within their major version; each has a comment in `pnpm-workspace.yaml`.

## Related concepts

- [Testing](/systems/testing.md), [SEO](/systems/seo.md), [Local development](/systems/local-development.md), [Troubleshooting](/systems/operations/troubleshooting.md)

# Related specs

None.
