---
name: release
description: Check a branch before asking for a merge (every check, the build, e2e and visual regression, the SEO parity gate) and summarise. Never deploys. Use when someone asks to release, ship or check the site.
---

# Release check

Run from the repository root. Stop at the first failure, then fix it or report it.

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm format:check && pnpm knip && pnpm typecheck && pnpm test`
3. `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00 pnpm build`, which is the deterministic build CI uses.
4. Run the e2e tests, including visual regression:
   1. `pnpm e2e`
   2. If screenshots changed on purpose, run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots` and say why in the PR.
5. Run the SEO gate:
   1. `node tools/serve-dist.mjs 4321 &`
   2. `node tools/seo/compare.mjs --base http://localhost:4321`

   No URL may be lost. Record intended copy changes in `tools/seo/allowlist.json` with a reason.

6. **If setup changed** (environment variables, Netlify, webhooks), update `docs/v2/RUNBOOK.md`.
7. **Summarise:** the checks, the SEO notes, and the visual changes with the reason for each.
8. **Do not deploy.** Production deploys only when the owner merges to `main`.
