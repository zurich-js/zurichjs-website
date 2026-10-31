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
