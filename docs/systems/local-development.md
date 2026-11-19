---
type: System
title: Local development
description: Setting up the workspace, the commands CI runs, the Docker stack behind pnpm local, and running donations and the Slack bots on a laptop.
tags: [setup, commands, docker]
timestamp: '2026-11-19T00:00:00Z'
---

# Local development

Requires Node 22.23.4 or later (`.nvmrc`) and pnpm 11 (`packageManager` in `package.json`).

## Commands

All of these are scripts in the root `package.json` or files in `tools/`.

```bash
pnpm install
pnpm dev                                   # http://localhost:4321 (reads Sanity; CONTENT_SOURCE=sample works offline)
CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00 pnpm build   # the deterministic build CI uses
pnpm lint && pnpm lint:ui && pnpm format:check && pnpm knip && pnpm typecheck && pnpm test
pnpm e2e                                   # Playwright against apps/web/dist (build first); includes visual regression
node tools/serve-dist.mjs 4321 &           # serve the build like Netlify (pretty URLs, _redirects and netlify.toml redirects)
node tools/seo/compare.mjs --base http://localhost:4321   # SEO and LLM parity gate
pnpm agent "change the venue of the next meetup to …"     # the Slack content agent, from the terminal
pnpm speaker-link <speaker-id>             # a speaker's private profile link (30 days, needs JWT_SECRET)
```

| Script                                               | What it runs                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `lint`                                               | oxlint over the repository                                                                                   |
| `lint:ui`, `lint:ui:prune`                           | ESLint design-system rules over `apps/web/src` and `packages/design/src`, and pruning the baseline           |
| `format`, `format:check`                             | oxfmt                                                                                                        |
| `knip`                                               | dead code and unused dependencies                                                                            |
| `typecheck`                                          | `typecheck` in every workspace package: `astro check` for the site, `tsc` for the Studio and the packages    |
| `test`                                               | Vitest for every package, the API handlers, the rebuild logic and `tools/agents.test.ts`                     |
| `e2e`                                                | Playwright                                                                                                   |
| `seo:snapshot`, `seo:check`                          | `tools/seo/snapshot.mjs` and `tools/seo/compare.mjs`                                                         |
| `membership:*`                                       | the member import, the Stripe setup and the signature upload ([Membership](/domains/membership/overview.md)) |
| `local`, `local:studio`, `local:down`, `local:reset` | the Docker stack below                                                                                       |

The Studio has its own commands ([Studio](/systems/studio.md)).

A pre-commit hook (husky with lint-staged) formats and lints staged files, then runs the typecheck. Before every commit, run the checks for what you touched.

## Content locally

`loadContent()` reads Sanity with `SANITY_PROJECT_ID` (default `viqjrovw`), `SANITY_DATASET` (default `production`) and optionally `SANITY_READ_TOKEN` or `SANITY_TOKEN`. `CONTENT_SOURCE=sample` uses the sample content in `packages/content/src/sample.ts` and needs no network. When Sanity is unreachable outside production, the build falls back to sample content with a warning ([Content](/domains/content/overview.md)).

`BUILD_NOW` fixes the build's clock, so event states are deterministic.

## The Docker stack (`pnpm local`)

One command runs the site with everything it talks to (`tools/local.sh`, `docker-compose.yml`):

```bash
pnpm local            # site, Postgres, Mailpit, Stripe test mode with stripe listen
pnpm local:studio     # the same plus the Sanity Studio
pnpm local:down       # stop (the local database keeps its data)
pnpm local:reset      # stop and delete the local database and the container installs
```

| Where                       | What                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| http://localhost:4321       | the site, with online membership (`/membership`, `/membership/account`) and sponsorship (`/partners/account`)                             |
| http://localhost:4321/admin | the board's admin area (memberships and sponsors); the password is `ADMIN_PASSWORD` from `.env`, else the default in `docker-compose.yml` |
| http://localhost:8025       | Mailpit: every email the site sends (sign-in links, certificates); SMTP on `localhost:1025`                                               |
| http://localhost:3333       | the Sanity Studio (`pnpm local:studio`), against the real project: sign in with your Sanity account                                       |
| `localhost:54322`           | Postgres (`postgres` / `postgres`, database `zurichjs`), migrations applied by the `migrate` service                                      |

- **Settings:** `.env`, then `.env.local` (which wins); both are git-ignored. They reach the `web` service, except what `docker-compose.yml` sets itself.
- **Content:** sample content by default. For real content put a Sanity read token in `.env.local` (`SANITY_TOKEN=…` and an empty `CONTENT_SOURCE=`). Sanity has no local backend: the Studio container edits the real project, so the same care applies as in the hosted Studio (drafts; a person publishes).
- **Email:** with `MAILPIT_URL` set, every email goes to Mailpit and no Resend key is needed. `MAILPIT_URL` is ignored in production. `pnpm local:reset` clears the inbox.
- **Stripe:** always Stripe's test mode, never the mock. It needs the Stripe CLI (`brew install stripe/stripe-cli/stripe`) and, in `.env` or `.env.local`, the sandbox's `STRIPE_SECRET_KEY=sk_test_…` (a live key is refused) and `STRIPE_MEMBER_PORTAL_CONFIG` from `STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply`. `STRIPE_SUPPORT_PRODUCT_ID` is optional, for `/donate`. The script runs `stripe listen`, forwarding the events production gets to the site's one webhook (`http://localhost:4321/api/stripe/webhook`: memberships, sponsorships, donations), and hands the site the listener's signing secret, so start the stack with `pnpm local`, not `docker compose up`.
- **Test cards:** `4242 4242 4242 4242` pays, `4000 0000 0000 0341` attaches but declines later charges (a failed renewal), `4000 0027 6000 3184` needs 3D Secure. To play renewals and retries without waiting, give the customer a test clock in the Stripe dashboard and advance it.
- **Certificates:** put `MEMBERSHIP_SIGNATURE_FILE=/app/.local/signature.png` in `.env` or `.env.local` (a path inside the container, where the repository is `/app`), with the PNG in the git-ignored `.local` folder. Production reads it from Netlify Blobs instead.
- **Nothing reaches** Resend, Slack or Netlify from this stack.

**Trying the membership:** open `/membership`, choose a level, sign in with any email, open the link from Mailpit, join and pay in Stripe Checkout with a test card. The certificate arrives in Mailpit. Sign-in links are rate limited to 3 per 10 minutes per address; `pnpm local:reset` or `delete from "rateLimit"` clears that.

**Without Docker:** run Mailpit (`brew install mailpit`, then `MAILPIT_URL=http://localhost:8025`), a Postgres with `tools/docker/migrate.sh` applied and `MEMBERSHIP_DB_URL` pointing at it, the Stripe keys above, and `stripe listen --forward-to localhost:4321/api/stripe/webhook` (its secret as `STRIPE_WEBHOOK_SECRET`). `MEMBERSHIP_DB_URL` wins over `DATABASE_URL`, so a Neon string in `.env` never reaches local data.

## Donations without Stripe

`STRIPE_SECRET_KEY` is not on organisers' machines, so `/donate` on `localhost` answers "Online payments are not available right now". That is the expected fallback, not a bug. To try the whole flow, run the mock Stripe API, which never contacts Stripe:

```bash
node tools/mock-stripe.mjs 4533 &
cd apps/web && STRIPE_API_BASE=http://localhost:4533 STRIPE_SECRET_KEY=sk_test_mock STRIPE_SUPPORT_PRODUCT_ID=prod_mock pnpm exec astro dev --port 4532
```

The mock accepts only `sk_test_` keys, shows a "Mock Stripe Checkout" page with Pay and Back, and answers HTTP 500 for CHF 999 (to see the error state). `STRIPE_API_BASE` is ignored when `CONTEXT=production`. Pass the variables in the shell: `astro dev` here does not load Netlify or `.env` variables into the functions. The e2e journeys run the real handlers against the same mock.

## The media archive without ImageKit

To check `/media` without the ImageKit key: `node tools/imagekit-mock.mjs 4529 <listing.json> &`, then build with `IMAGEKIT_API_URL=http://127.0.0.1:4529/v1/files IMAGEKIT_PRIVATE_KEY=dummy` ([Media archive](/systems/media.md)).

## The Slack bots locally

Both bots run on a laptop through Socket Mode, with no public URL: `tools/slack-dev.mjs` opens the socket and passes events, signed, to the local functions. `pnpm local` starts it when `SLACK_APP_TOKEN` (the organisers' dev app) or `SLACK_CFP_APP_TOKEN` (the CFP bot's dev app) is set. Setup: [Slack content agent](/systems/slack-agent.md) and [CFP bot](/systems/cfp-bot.md). Use the `v2-preview` dataset, never production, from a laptop.

## Related concepts

- [System map](/systems/overview.md)
- [Testing](/systems/testing.md)
- [Environment variables](/systems/operations/environment.md)
- [Donations](/domains/donations/overview.md), [Membership](/domains/membership/overview.md), [Content](/domains/content/overview.md)

# Related specs

None.
