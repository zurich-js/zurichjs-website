---
type: Reference
title: Environment variables
description: Every environment variable the site, the functions, the bots and the tools read, what it does, and what happens without it.
tags: [operations, configuration, secrets]
timestamp: '2026-11-19T00:00:00Z'
---

# Environment variables

Secrets come only from the environment, never from files, and a missing secret logs a stub line instead of crashing a page. The production site's existing names keep working: `SANITY_TOKEN`, `SLACK_BOT_TOKEN` with `SLACK_DEFAULT_CHANNEL`, and `NEXT_PUBLIC_POSTHOG_*`. Netlify variables are set per site and, where noted, per deploy context. No value below is a real secret.

On a laptop, `.env.schema` declares the variables the local stack takes and varlock checks them, resolving 1Password references, before `just up` starts ([Local development](/systems/local-development.md)). This page stays the home for what each variable does; a variable the local stack should take is added to both.

## Build and content

| Variable                                              | What it does                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SANITY_PROJECT_ID`, `SANITY_DATASET`                 | Default `viqjrovw` and `production`.                                                                                                                                                                                                                                                                        |
| `SANITY_TOKEN`                                        | Read and write token (the production site's name). Used by the build if the dataset is private, the forms and speaker feedback.                                                                                                                                                                             |
| `SANITY_READ_TOKEN`, `SANITY_WRITE_TOKEN`             | Optional: separate tokens instead of `SANITY_TOKEN`. The draft preview site needs a Viewer read token.                                                                                                                                                                                                      |
| `SANITY_ALLOW_PRODUCTION_WRITES`                      | `1` lets the forms, speaker profiles and the Slack agent write to the `production` dataset. Set by hand in Netlify for the production context only. Without it every write to `production` is refused (forms are sent but not stored, the agent answers with an error); other datasets are always writable. |
| `SANITY_PERSPECTIVE`                                  | `drafts` builds the draft preview ([Netlify deploys](/systems/operations/netlify.md)).                                                                                                                                                                                                                      |
| `CONTENT_SOURCE`                                      | `sample` uses the sample content and no network.                                                                                                                                                                                                                                                            |
| `CONTENT_REQUIRE_SANITY`                              | `1` (set in `netlify.toml` for production): fail instead of falling back to sample content. `CONTEXT=production` does the same.                                                                                                                                                                             |
| `BUILD_NOW`                                           | Fixes the build's clock (CI and visual regression).                                                                                                                                                                                                                                                         |
| `IMAGEKIT_PRIVATE_KEY`                                | Build time only: lists the media archive. Required on production ([Media archive](/systems/media.md)).                                                                                                                                                                                                      |
| `MEDIA_REQUIRE_IMAGEKIT`                              | Set in `netlify.toml`: `1` for production, `0` for previews and branch deploys. The draft preview site never requires it.                                                                                                                                                                                   |
| `IMAGEKIT_API_URL`                                    | Never in production; points the build at `tools/imagekit-mock.mjs`.                                                                                                                                                                                                                                         |
| `SANE_API_URL`, `SANE_WEB_URL`                        | Optional; default `https://api.sane.events` and `https://sane.events`. Point a build at another Sane (local, staging). No secret.                                                                                                                                                                           |
| `PUBLIC_GOOGLE_MAPS_EMBED_KEY`                        | Optional: a Maps Embed API key restricted to `zurichjs.com/*`. Without it, Google's keyless embed.                                                                                                                                                                                                          |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Analytics. `PUBLIC_POSTHOG_*` also work.                                                                                                                                                                                                                                                                    |
| `SHOW_PREVIEW_MODULES`                                | `true` shows development placeholders (the conference module); only on password-protected previews.                                                                                                                                                                                                         |
| `CONTEXT`, `URL`, `DEPLOY_URL`, `DEPLOY_PRIME_URL`    | Set by Netlify. Production behaviour keys off `CONTEXT=production`; previews point share images at `DEPLOY_PRIME_URL`.                                                                                                                                                                                      |

## Rebuilds

| Variable                 | What it does                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `SANITY_WEBHOOK_SECRET`  | Signs the Sanity publish webhook to `/api/rebuild`. A long random string, also set in the webhook.         |
| `NETLIFY_BUILD_HOOK_URL` | The "Scheduled rebuild" build hook on `main`, called by `scheduled-rebuild`. Added after the first deploy. |

## Forms and email

| Variable                                         | What it does                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `RESEND_API_KEY`, `FORMS_TO`, `FORMS_FROM`       | Form emails. Optional: without them, forms still reach Slack (and Sanity where they store), but send no email. `FORMS_TO` defaults to hello@zurichjs.com.                                                                                                                                                                            |
| `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`       | Form notifications. Alternatively `SLACK_WEBHOOK_URL`.                                                                                                                                                                                                                                                                               |
| `EMAIL_OCTOPUS_API_KEY`, `EMAIL_OCTOPUS_LIST_ID` | The conference waitlist (`/api/subscribe`). Without them nothing is saved (logged).                                                                                                                                                                                                                                                  |
| `JWT_SECRET`                                     | Speaker feedback links and speakers' private profile links. Keep the production value.                                                                                                                                                                                                                                               |
| `MAILPIT_URL`                                    | Local only: send every email to Mailpit. Ignored in production.                                                                                                                                                                                                                                                                      |
| `SLACK_ENV_LABEL`                                | Marks the site's Slack notifications (forms, membership and sponsorship notes) with their origin, e.g. `[local]`. `docker-compose.yml` sets it to `local`. For deploy previews and branch deploys, set it to `preview` in Netlify for those contexts (a `netlify.toml` value does not reach functions). Never set it for production. |

## Donations

| Variable                                         | What it does                                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`, `STRIPE_SUPPORT_PRODUCT_ID` | Online donations (the old site's names). `sk_test_…` on deploy previews. Without them the form offers email, and Twint only when a Twint QR is in Site settings.     |
| `PUBLIC_STRIPE_PORTAL_URL`                       | The Stripe customer-portal login link for monthly donors. Read at build time: redeploy after setting it. Without it, donors are told to write to hello@zurichjs.com. |
| `STRIPE_API_BASE`                                | Local and e2e only: points Stripe calls at `tools/mock-stripe.mjs`. Ignored when `CONTEXT=production`.                                                               |

## Stripe (shared)

| Variable                           | What it does                                                                                                                                                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`                | Every Stripe call (donations, memberships, sponsorships). `sk_test_…` on deploy previews; live scoped to production.                                                                     |
| `STRIPE_WEBHOOK_SECRET`            | The signing secret of the site's one webhook, `/api/stripe/webhook` ([Stripe](/systems/stripe.md)). Until production switches, it holds the old `/api/donate/webhook` endpoint's secret. |
| `STRIPE_MEMBERSHIP_WEBHOOK_SECRET` | Only for the old `/api/membership/webhook`, until production moves to the one webhook; then delete it.                                                                                   |

## Membership

Functions variables unless noted. Live and test Stripe values are scoped by deploy context: live to production, test to deploy previews.

| Variable                                | What it does                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon, per deploy context (the production branch for production, the `preview` branch for deploy previews): pooled for the functions, direct for migrations. Also holds the CFP bot's tables. The build reads it too, for current sponsors and their tiers ([Sponsorship](/domains/sponsorship/overview.md)); a build without it shows the partner list alone. |
| `MEMBERSHIP_DB_URL`                     | Local: the Docker Postgres. Wins over `DATABASE_URL`.                                                                                                                                                                                                                                                                                                         |
| `BETTER_AUTH_SECRET`                    | Secret; 32+ random characters (`openssl rand -base64 32`).                                                                                                                                                                                                                                                                                                    |
| `BETTER_AUTH_URL`                       | Optional; defaults to Netlify's URL (production) or the deploy URL (previews).                                                                                                                                                                                                                                                                                |
| `STRIPE_MEMBER_PORTAL_CONFIG`           | From `pnpm membership:stripe-setup`: the billing portal configuration without cancelling.                                                                                                                                                                                                                                                                     |
| `MEMBERSHIP_FROM`                       | The sender, default `ZurichJS <hello@zurichjs.com>`; the domain must be verified in Resend.                                                                                                                                                                                                                                                                   |
| `MEMBERSHIP_SIGNATURE_FILE`             | Local only: the signature PNG for certificates. Production reads it from the Netlify Blobs store `membership`.                                                                                                                                                                                                                                                |
| `SLACK_MEMBERSHIP_CHANNEL_ID`           | The channel for membership notes and resignation cards (falls back to `SLACK_AGENT_CHANNEL_ID`).                                                                                                                                                                                                                                                              |
| `SLACK_MEMBERSHIP_APPROVER_IDS`         | Slack member IDs who may confirm or undo resignations: Nadja `U08NAFH955M`, Bogdan `U08NDGCRYPK`, Faris `U08MMPMNLKZ`.                                                                                                                                                                                                                                        |
| `ADMIN_PASSWORD`                        | Secret; the board's shared password for `/admin` and `pnpm membership:import`, any length (owner's choice). Changing it signs everyone out.                                                                                                                                                                                                                   |
| `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` | Tool only: `pnpm membership:signature` uploads the signature to Netlify Blobs. The site ID has a default in `tools/membership-signature.ts`.                                                                                                                                                                                                                  |

## Sponsorship

It also uses the membership database, sign-in, Resend and Slack variables, and `STRIPE_MEMBER_PORTAL_CONFIG`.

| Variable                                                                                                                                         | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `STRIPE_SPONSOR_PORTAL_CONFIG`                                                                                                                   | Optional; a sponsor-only billing portal configuration (default: `STRIPE_MEMBER_PORTAL_CONFIG`).                                                                                                                                                                                                                                                                                                                                             |
| `SLACK_SPONSORSHIP_CHANNEL_ID`                                                                                                                   | Optional; the channel for sponsor notes (falls back to the membership channel).                                                                                                                                                                                                                                                                                                                                                             |
| `RAFFLE_TERMS_VERSION`, `RAFFLE_TERMS_URL`                                                                                                       | Optional; owner only. The raffle terms version the owner approved and where sponsors read it (https). Without both, raffles stay proposals ([Raffle add-ons](/domains/sponsorship/raffles.md)).                                                                                                                                                                                                                                             |
| `RAFFLE_RULES_VERSION`, `RAFFLE_RULES_URL`                                                                                                       | Optional; owner only. The entrant rules version the owner approved and where entrants read it (https). Without both, raffle entries cannot open ([Raffle add-ons](/domains/sponsorship/raffles.md)).                                                                                                                                                                                                                                        |
| `RAFFLE_SHARING_POLICY_VERSION`, `RAFFLE_SHARING_NOTICE_URL`, `RAFFLE_RETENTION_DAYS`, `RAFFLE_RETENTION_ANCHOR`, `RAFFLE_SHARING_TERMS_VERSION` | Optional; owner only. Set the retention anchor to `fulfilled_or_cancelled` only after approval. Without a frozen period there is no automatic erasure. The approved raffle notice and recipient policy version, where entrants read it (https), the retention period in days, and the raffle terms version that allows sharing. Without all four, no entrant contact reaches a sponsor ([Raffle add-ons](/domains/sponsorship/raffles.md)). |
| `SPONSOR_FEE_POLICY_VERSION`                                                                                                                     | Optional; owner only. The surcharge policy version the owner approved. Without it, ZurichJS covers every card fee ([Processing fees](/domains/sponsorship/fees.md)).                                                                                                                                                                                                                                                                        |
| `SPONSOR_FEE_PRORATION_MODE`, `SPONSOR_FEE_PRORATION_POLICY_VERSION`                                                                             | Optional, owner only. Enable immediate fee-bearing upgrades only for the approved [proration treatment](/domains/sponsorship/fees.md).                                                                                                                                                                                                                                                                                                      |

## The organisers' Slack content agent

| Variable                   | What it does                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `SLACK_AGENT_BOT_TOKEN`    | Bot User OAuth Token (`xoxb-…`) from the Slack app.                                               |
| `SLACK_SIGNING_SECRET`     | Signing Secret from the Slack app's Basic Information. Also signs the hand-off between functions. |
| `SLACK_AGENT_CHANNEL_ID`   | The private organisers' channel.                                                                  |
| `SLACK_PUBLISHER_IDS`      | Slack member IDs allowed to publish, comma-separated.                                             |
| `SANITY_AGENT_TOKEN`       | A Sanity Editor token named "ZurichJS Bot".                                                       |
| `LLM_PROVIDER`             | `openai`, `anthropic` or `openai-compatible`.                                                     |
| `LLM_MODEL`, `LLM_API_KEY` | A model ID and the provider's key.                                                                |
| `LLM_BASE_URL`             | For `openai-compatible` (Mistral, Groq, OpenRouter, a local server).                              |
| `SANITY_STUDIO_URL`        | Optional, default `https://zurichjs.sanity.studio`.                                               |
| `DRAFT_PREVIEW_URL`        | Optional, the draft preview site.                                                                 |
| `SLACK_APP_TOKEN`          | Local only: the dev app's app-level token (`xapp-…`) for Socket Mode.                             |

## The CFP bot

| Variable                      | What it does                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SLACK_CFP_BOT_TOKEN`         | The CFP app's Bot User OAuth Token (`xoxb-…`).                                                                                 |
| `SLACK_CFP_SIGNING_SECRET`    | The CFP app's Signing Secret; also signs its internal hand-off.                                                                |
| `SLACK_CFP_CHANNEL_ID`        | The public `#cfp` channel.                                                                                                     |
| `CFP_LLM_MODEL`               | The cheapest model of `LLM_PROVIDER`. Optional with `anthropic` (default `claude-haiku-5-5`). Never falls back to `LLM_MODEL`. |
| `CFP_MAX_MODEL_CALLS_PER_DAY` | Optional, default 400: model calls per day for everyone, which caps the cost.                                                  |
| `SLACK_CFP_APP_TOKEN`         | Local only: the CFP dev app's app-level token.                                                                                 |

It also uses `LLM_PROVIDER`, `LLM_API_KEY` (and `LLM_BASE_URL`), `DATABASE_URL`, and the forms' Sanity and Slack variables. Without `SLACK_CFP_*` its functions answer Slack with 401 and do nothing.

## Repository and agent tooling

| Name                        | Where                 | What it does                                                                                                          |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `SANITY_DEPLOY_TOKEN`       | GitHub Actions secret | Deploys the Studio (`.github/workflows/deploy-studio.yml`).                                                           |
| `NEON_PREVIEW_DATABASE_URL` | GitHub Actions secret | The Neon preview branch's direct connection; `.github/workflows/preview-db-cleanup.yml` drops a closed PR's database. |
| `SANITY_API_TOKEN`          | your shell            | The Sanity MCP server in `.mcp.json` (Editor role).                                                                   |
| `GITHUB_TOKEN`              | your shell            | The GitHub MCP server in `.mcp.json`.                                                                                 |

## Related concepts

- [Netlify deploys](/systems/operations/netlify.md), [Local development](/systems/local-development.md)
- [Slack content agent](/systems/slack-agent.md), [CFP bot](/systems/cfp-bot.md), [Membership payments](/domains/membership/api.md), [Sponsorship payments](/domains/sponsorship/api.md), [Stripe](/systems/stripe.md), [Donations](/domains/donations/overview.md), [Forms](/domains/forms/overview.md), [Content](/domains/content/overview.md)

# Related specs

None.
