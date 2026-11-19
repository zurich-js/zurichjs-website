---
type: System
title: System map
description: The zurichjs.com repository, its apps and packages, who owns which contract, and the external services it talks to.
tags: [architecture, monorepo, integrations]
timestamp: '2026-11-19T00:00:00Z'
---

# System map

Source repository: `zurich-js/zurichjs-website` on GitHub. Paths below are relative to its root.

zurichjs.com is the website of ZurichJS, the JavaScript community in Zurich. It is a static-first Astro 7 site on Netlify, with content in Sanity (project `viqjrovw`, dataset `production`). The repository is one pnpm workspace (pnpm 11, Node 22.23.4 or later from `.nvmrc`). Its supply-chain policy (`minimumReleaseAge` in `pnpm-workspace.yaml`) delays new dependency releases.

## Apps

| Path          | Package            | What it is                                                                                                                                                                             | Concept                      |
| ------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `apps/web`    | `@zurichjs/web`    | The site: prerendered pages, Preact islands, Astro endpoints under `/api/*` (server-rendered), Netlify Functions for the timer and the Slack bots, the membership database migrations. | [Web app](/systems/web.md)   |
| `apps/studio` | `@zurichjs/studio` | The Sanity Studio (Sanity 6): schema, desk, document actions, migrations and content scripts. Imported from `zurich-js/zurich-js-website-sanity-studio` with its history.              | [Studio](/systems/studio.md) |

## Packages

Packages are split where a second consumer exists: the app, the Studio, the Netlify Functions, the Slack bots, or later the conference site.

| Package                  | Owns                                                                                                                                                          | Concept                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `@zurichjs/design`       | Tokens (`theme.css`), motion, Figtree, Astro components and Preact islands, class recipes.                                                                    | [Design system](/systems/design-system/index.md)                               |
| `@zurichjs/events`       | Event types, the clock-based state machine, schedules, readiness rules, presentation copy, the ticketing seam, `.ics`. No dependencies.                       | [Events](/domains/events/overview.md)                                          |
| `@zurichjs/content`      | Typed GROQ queries over `fetch`, types generated from the Studio schema, mappers, sample content, the partner and community records, ImageKit and Sane reads. | [Content](/domains/content/overview.md)                                        |
| `@zurichjs/seo`          | Meta tags, JSON-LD, sitemap and `llms.txt` builders.                                                                                                          | [SEO](/systems/seo.md)                                                         |
| `@zurichjs/forms`        | zod schemas shared by islands and the forms endpoint, plus a zod-free client validator.                                                                       | [Forms](/domains/forms/overview.md)                                            |
| `@zurichjs/integrations` | Where forms go: Sanity writes, Resend, Slack, EmailOctopus; the `TalkProposalSink` seam.                                                                      | [Forms](/domains/forms/overview.md)                                            |
| `@zurichjs/agent`        | The organisers' Slack content agent (draft-only Sanity tools, model-agnostic loop) and, isolated under `src/cfp`, the CFP bot.                                | [Slack content agent](/systems/slack-agent.md), [CFP bot](/systems/cfp-bot.md) |
| `@zurichjs/emails`       | Email templates in plain TypeScript, styled from the design tokens.                                                                                           | [Membership](/domains/membership/overview.md)                                  |
| `@zurichjs/membership`   | Verein membership: levels, the status machine, the Postgres member store, CSV import.                                                                         | [Membership](/domains/membership/overview.md)                                  |
| `@zurichjs/sponsorship`  | Sponsorship: tiers and fees, the status machine, the Postgres sponsor store (contacts, agreements, meetups, logos, contracts).                                | [Sponsorship](/domains/sponsorship/overview.md)                                |
| `@zurichjs/config`       | Shared TypeScript configuration (`tsconfig.base.json`).                                                                                                       |                                                                                |

## Other folders

| Path      | What                                                                                                                        | Concept                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `tools/`  | The SEO baseline and parity gate, the local Netlify-like server, the Docker stack script, mocks, the agent CLI, CI helpers. | [Local development](/systems/local-development.md), [SEO](/systems/seo.md) |
| `e2e/`    | Playwright: routes, journeys, keyboard, accessibility, redirects, motion, visual regression.                                | [Testing](/systems/testing.md)                                             |
| `slack/`  | The Slack app manifests: the organisers' bot and the CFP bot, each with a dev variant.                                      | [Slack content agent](/systems/slack-agent.md)                             |
| `agents/` | Agent playbooks (`agents/skills/*/SKILL.md`) and roles (`agents/roles/*.md`).                                               | [Slack content agent](/systems/slack-agent.md)                             |
| `docs/`   | This bundle.                                                                                                                | [Authoring guide](/conventions/authoring-guide.md)                         |

## Contract owners

| Contract                            | Owner                                                | Consumers                                                                                                                                                                              |
| ----------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sanity schema                       | `apps/studio/schemaTypes`                            | `packages/content` (generated `sanity.types.ts`), the agent                                                                                                                            |
| GROQ queries and their types        | `packages/content/src/queries.ts`, `sanity.types.ts` | `apps/web`                                                                                                                                                                             |
| Event state, schedule and readiness | `packages/events`                                    | the site, the islands, the agent, the Studio (`apps/studio/lib/readiness.ts` keeps the same rules)                                                                                     |
| Design tokens                       | `packages/design/src/theme.css`                      | the site, the emails, the OG images, the `/design` gallery                                                                                                                             |
| Form payloads                       | `packages/forms`                                     | the islands, `/api/forms/[kind]`, the CFP bot                                                                                                                                          |
| Membership fees                     | `apps/web/src/lib/membership.ts`                     | `/membership`, the Stripe setup script, `/api/verein-inquiry`                                                                                                                          |
| Member data                         | `apps/web/database/migrations` (Postgres)            | `packages/membership`, the admin area, the Slack bots                                                                                                                                  |
| Sponsorship fees                    | `packages/sponsorship/src/tiers.ts`                  | `/partners/account`, the Stripe setup script, the emails; `/partners` keeps its own copy in `packages/content/src/partners.ts`, held equal by `apps/web/test/sponsorship-fees.test.ts` |
| Sponsor data                        | `apps/web/database/migrations` (Postgres)            | `packages/sponsorship`, the sponsor admin, the Slack bot                                                                                                                               |
| Stripe webhook                      | `apps/web/src/server/stripe-webhook.ts`              | memberships, sponsorships, donations ([Stripe](/systems/stripe.md))                                                                                                                    |

## External services

| Service       | Used for                                                                                                              | Where it is documented                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Netlify       | Hosting, builds, functions, scheduled and background functions, Blobs, build hooks                                    | [Operations](/systems/operations/index.md)                                         |
| Sanity        | Content (project `viqjrovw`), the Studio, the publish webhook                                                         | [Studio](/systems/studio.md), [Content](/domains/content/overview.md)              |
| Stripe        | Donations (Checkout), memberships and sponsorships (subscriptions, payment links, billing portal), one shared webhook | [Stripe](/systems/stripe.md)                                                       |
| Neon Postgres | The membership and sponsorship database, CFP bot drafts and limits                                                    | [Membership](/domains/membership/overview.md)                                      |
| Resend        | Form, membership and speaker emails                                                                                   | [Forms](/domains/forms/overview.md), [Membership](/domains/membership/overview.md) |
| Slack         | Form notes, the organisers' content agent, membership cards, the CFP bot                                              | [Slack content agent](/systems/slack-agent.md), [CFP bot](/systems/cfp-bot.md)     |
| ImageKit      | The photo and clip archive, read at build time                                                                        | [Media archive](/systems/media.md)                                                 |
| PostHog       | Analytics (`NEXT_PUBLIC_POSTHOG_*` or `PUBLIC_POSTHOG_*`)                                                             | [Environment variables](/systems/operations/environment.md)                        |
| EmailOctopus  | The conference waitlist (`/api/subscribe`)                                                                            | [Forms](/domains/forms/overview.md)                                                |
| Sane          | Free tickets beside Meetup, read at build time                                                                        | [Events](/domains/events/overview.md)                                              |
| Meetup        | RSVPs (outbound links); the rating is copied by hand                                                                  | [Events](/domains/events/overview.md)                                              |
| Google Maps   | The venue map embed on event pages                                                                                    | [Events frontend](/domains/events/frontend.md)                                     |
| LLM provider  | The Slack bots' model, chosen by environment variables                                                                | [Slack content agent](/systems/slack-agent.md)                                     |

Secrets come only from the environment, never from files, and a missing secret logs a stub line instead of crashing a page.

## Related concepts

- [Local development](/systems/local-development.md), [Testing](/systems/testing.md), [Operations](/systems/operations/index.md)
- [Domains](/domains/index.md), [Stripe](/systems/stripe.md)

# Related specs

None.
