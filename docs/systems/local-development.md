---
type: System
title: Local development
description: Setting up the workspace, the commands CI runs, the Docker stack behind just up, and running donations and the Slack bots on a laptop.
tags: [setup, commands, docker]
timestamp: '2026-11-19T00:00:00Z'
---

# Local development

Requires Node 22.23.4 or later (`.nvmrc`) and pnpm 11 (`packageManager` in `package.json`).

## Commands

All of these are scripts in the root `package.json` or files in `tools/`. The Docker stack has its own recipes in the `justfile` (below).

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

| Script                      | What it runs                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `lint`                      | oxlint over the repository                                                                                   |
| `lint:ui`, `lint:ui:prune`  | ESLint design-system rules over `apps/web/src` and `packages/design/src`, and pruning the baseline           |
| `format`, `format:check`    | oxfmt                                                                                                        |
| `knip`                      | dead code and unused dependencies                                                                            |
| `typecheck`                 | `typecheck` in every workspace package: `astro check` for the site, `tsc` for the Studio and the packages    |
| `test`                      | Vitest for every package, the API handlers, the rebuild logic and `tools/agents.test.ts`                     |
| `e2e`                       | Playwright                                                                                                   |
| `seo:snapshot`, `seo:check` | `tools/seo/snapshot.mjs` and `tools/seo/compare.mjs`                                                         |
| `membership:*`              | the member import, the Stripe setup and the signature upload ([Membership](/domains/membership/overview.md)) |

The Studio has its own commands ([Studio](/systems/studio.md)).

A pre-commit hook (husky with lint-staged) formats and lints staged files, then runs the typecheck. Before every commit, run the checks for what you touched.

## Content locally

`loadContent()` reads Sanity with `SANITY_PROJECT_ID` (default `viqjrovw`), `SANITY_DATASET` (default `production`) and optionally `SANITY_READ_TOKEN` or `SANITY_TOKEN`. `CONTENT_SOURCE=sample` uses the sample content in `packages/content/src/sample.ts` and needs no network. When Sanity is unreachable outside production, the build falls back to sample content with a warning ([Content](/domains/content/overview.md)).

`BUILD_NOW` fixes the build's clock, so event states are deterministic.

## The Docker stack (`just up`)

One command runs the site with everything it talks to. The recipes are in the `justfile` ([just](https://just.systems), `brew install just`); `just` alone lists them. `just up` is `varlock run -- docker compose up -d --wait`: [varlock](https://varlock.dev) reads `.env.schema`, resolves and checks the environment on your machine, and hands it to the services in `docker-compose.yml`. It returns when the site answers (the first start installs the dependencies in the container, a few minutes). The host needs Docker, just and, for 1Password references, the `op` CLI: the Stripe CLI and the Slack bridge run as services.

```bash
just up               # site, Postgres, Mailpit, Stripe test mode with stripe listen, the Slack bridge
just studio           # the same plus the Sanity Studio
just logs             # follow the logs (just logs web stripe: only those)
just ps               # what is running
just down             # stop (the local database keeps its data)
just reset            # stop and delete the local database, the inbox and the container installs
just env              # resolve and check the environment only (secrets are masked)
just run <command>    # any command with the checked environment, e.g. just run pnpm membership:stripe-setup --apply
just compose <args>   # docker compose with the checked environment, e.g. just compose restart web
```

| Where                       | What                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| http://localhost:4321       | the site, with online membership (`/membership`, `/membership/account`) and sponsorship (`/partners/account`)                             |
| http://localhost:4321/admin | the board's admin area (memberships and sponsors); the password is `ADMIN_PASSWORD` from `.env`, else the default in `docker-compose.yml` |
| http://localhost:8025       | Mailpit: every email the site sends (sign-in links, certificates); SMTP on `localhost:1025`                                               |
| http://localhost:3333       | the Sanity Studio (`just studio`), against the real project: sign in with your Sanity account                                             |
| `localhost:54322`           | Postgres (`postgres` / `postgres`, database `zurichjs`), migrations applied by the `migrate` service                                      |

- **Settings:** `.env.schema` (committed) names every variable the stack takes, its shape, and the two it requires. Values go in `.env`, then `.env.local` (which wins); both are git-ignored. A value is plain (`KEY=value`) or a 1Password reference, `KEY=op("op://vault/item/section/field")`, which varlock resolves through the signed-in `op` CLI with the desktop app integration on. Nothing resolved is written to disk. A missing or malformed value stops `just up` before a container starts, with the variable's name. `docker-compose.yml` passes each schema variable to the `web` service by name and sets the local services' own (`MEMBERSHIP_DB_URL`, `BETTER_AUTH_*`, `MAILPIT_URL`); `tools/env-schema.test.ts` fails when a schema variable is not passed.
- **Content:** sample content by default. For real content put `CONTENT_SOURCE=sanity` in `.env.local`: the `production` dataset is public, so reading it needs no token. Writing to `production` is refused without `SANITY_ALLOW_PRODUCTION_WRITES=1`, which belongs on the production deploy and not in `.env.local` ([Environment variables](/systems/operations/environment.md)): a form sent on localhost is not stored, and the dev Slack bot answers a change with an error. To store and edit locally, point `SANITY_DATASET` at another dataset; the project has none yet (`v2-preview` is still to be created, an owner action: [Studio](/systems/studio.md)).
- **Email:** with `MAILPIT_URL` set, every email goes to Mailpit and no Resend key is needed. `MAILPIT_URL` is ignored in production. `just reset` clears the inbox.
- **Stripe:** always Stripe's test mode, never the mock. `.env.local` needs the sandbox's `STRIPE_SECRET_KEY` (`sk_test_…`; the schema refuses a live key) and `STRIPE_MEMBER_PORTAL_CONFIG` from `STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply`. `STRIPE_SUPPORT_PRODUCT_ID` is optional, for `/donate`. The `stripe-secret` service asks Stripe for the listener's signing secret and the site reads it at start; the `stripe` service runs `stripe listen`, forwarding the events production gets to the site's one webhook (`/api/stripe/webhook`: memberships, sponsorships, donations). Plain `docker compose up` has no key, so `stripe-secret` stops with a message: start the stack with `just up`.
- **Test cards:** `4242 4242 4242 4242` pays, `4000 0000 0000 0341` attaches but declines later charges (a failed renewal), `4000 0027 6000 3184` needs 3D Secure. To play renewals and retries without waiting, give the customer a test clock in the Stripe dashboard and advance it.
- **Certificates:** put `MEMBERSHIP_SIGNATURE_FILE=/app/.local/signature.png` in `.env` or `.env.local` (a path inside the container, where the repository is `/app`), with the PNG in the git-ignored `.local` folder. Production reads it from Netlify Blobs instead.
- **Slack:** with the Slack variables in `.env.local`, form notifications and membership and sponsorship notes go to the real channels, each marked `[local]` (`SLACK_ENV_LABEL`, set in `docker-compose.yml`). Leave the variables out to send nothing.
- **Nothing reaches** Resend or Netlify from this stack.

**Trying the membership:** open `/membership`, choose a level, sign in with any email, open the link from Mailpit, join and pay in Stripe Checkout with a test card. The certificate arrives in Mailpit. Sign-in links are rate limited to 3 per 10 minutes per address; `just reset` or `delete from "rateLimit"` clears that.

**Without Docker:** run Mailpit (`brew install mailpit`, then `MAILPIT_URL=http://localhost:8025`), a Postgres with `tools/docker/migrate.sh` applied and `MEMBERSHIP_DB_URL` pointing at it, the Stripe keys above, and the Stripe CLI (`brew install stripe/stripe-cli/stripe`) with `stripe listen --forward-to localhost:4321/api/stripe/webhook` (its secret as `STRIPE_WEBHOOK_SECRET`). `just run <command>` gives any command the checked environment. `MEMBERSHIP_DB_URL` wins over `DATABASE_URL`, so a Neon string in `.env` never reaches local data.

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

Both bots run on a laptop through Socket Mode, with no public URL: `tools/slack-dev.mjs` opens the socket and passes events, signed, to the local functions. `just up` runs it as the `slack` service (a Compose profile the justfile turns on) when `SLACK_APP_TOKEN` (the organisers' dev app) or `SLACK_CFP_APP_TOKEN` (the CFP bot's dev app) is set. Setup: [Slack content agent](/systems/slack-agent.md) and [CFP bot](/systems/cfp-bot.md). Use the `v2-preview` dataset, never production, from a laptop.

## Related concepts

- [System map](/systems/overview.md)
- [Testing](/systems/testing.md)
- [Environment variables](/systems/operations/environment.md)
- [Donations](/domains/donations/overview.md), [Membership](/domains/membership/overview.md), [Content](/domains/content/overview.md)

# Related specs

None.
