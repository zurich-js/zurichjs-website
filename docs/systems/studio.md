---
type: System
title: Sanity Studio
description: The Sanity 6 Studio in apps/studio: schema ownership, the editor workspace, typegen, migrations and content scripts, the publish webhook and how it deploys.
tags: [sanity, cms, studio]
timestamp: "2026-11-19T00:00:00Z"
---

# Sanity Studio

Source: `apps/studio` (`@zurichjs/studio`), Sanity 6 with React 19, project `viqjrovw`, dataset `production` (`apps/studio/sanity.cli.ts`). It was imported from `zurich-js/zurich-js-website-sanity-studio` with `git subtree`, history kept (3rd November 2026). It keeps its own ESLint and Prettier; the root oxlint, oxfmt and knip skip it, and its TypeScript check is part of `pnpm typecheck`.

## Responsibilities

- **The schema** (`apps/studio/schemaTypes`) is the contract for all content. It is additive over the old site's: existing documents keep working, and no field or document type is deleted. Field shapes are in the domain content models: [Events](/domains/events/content-model.md), [Content](/domains/content/content-model.md), [Talk proposals](/domains/talk-proposals/overview.md), [Partners](/domains/partners/overview.md).
- **The editor workspace** (`apps/studio/deskStructure.ts`): Events › Upcoming / Needs attention / Past. Every event has a **Readiness** tab and badge listing what the public page still needs (`apps/studio/lib/readiness.ts`, the same rules as `packages/events/src/readiness.ts`). "New document › Meetup (from template)" pre-fills the usual practical info.
- **Document actions** (`apps/studio/actions`): "Convert to Talk" on a talk proposal, and "Fill programme from talks" on an event, which writes the old site's timing template as a draft for organisers to check.
- **The Presentation tool** previews the site at `SANITY_STUDIO_PREVIEW_URL` (default `http://localhost:4321`). Point it at the draft preview site to see unpublished changes.

## Commands

```bash
pnpm --filter @zurichjs/studio dev                      # http://localhost:3333 (or pnpm local:studio, in Docker)
pnpm --filter @zurichjs/studio exec sanity build --yes  # the build CI runs
pnpm --filter @zurichjs/studio schema                   # schema.json, offline (scripts/extract-schema.ts)
pnpm --filter @zurichjs/studio typegen                  # schema.json and packages/content/src/sanity.types.ts
```

## Typegen

GROQ queries live in `packages/content/src/queries.ts`. After changing a query or the schema, run `pnpm --filter @zurichjs/studio typegen` and commit `packages/content/src/sanity.types.ts` and `apps/studio/schema.json`. CI's `studio` job regenerates both and fails when they differ. The schema is extracted offline, so typegen needs no Sanity login. The generated types are wrapped in `Loose<>` (every field optional and nullable), because production documents predate the schema's required fields; the mappers stay defensive, and `tsc` still catches a mapper reading a field the query does not return.

## Migrations and content scripts

Run from `apps/studio`. Every script writes drafts only and runs dry by default (`apps/studio/scripts/lib/drafts.ts`).

```bash
npx sanity migration run v2-additive            # dry run; add --dataset v2-preview --no-dry-run to apply
SANITY_WRITE_TOKEN=… npx sanity exec scripts/seed-v2-preview.ts --with-user-token   # sample content into v2-preview
npx sanity exec scripts/seed-partners.ts --with-user-token        # the partner list as drafts to confirm
npx sanity exec scripts/backfill-agenda.ts --with-user-token      # proposed agendas for events with talks but none
npx sanity exec scripts/clean-speaker-slugs.ts --with-user-token  # name-based speaker IDs (generated "speaker-<uuid>" ones too); old ones become 301s
```

Running migrations on `production` and creating the `v2-preview` dataset are owner actions.

## Deploys

The Studio deploys itself when changes under `apps/studio` reach `main` (`.github/workflows/deploy-studio.yml`, `sanity deploy --yes` with the `SANITY_DEPLOY_TOKEN` repository secret, a token with the "Deploy Studio" permission). Without the secret the workflow skips with a notice, and **Actions › Deploy Studio › Run workflow** deploys once it is set. Never run `sanity deploy` by hand. `sanity.cli.ts` names the deployed Studio (`deployment.appId`) and keeps auto-updates on, so patch and minor Sanity releases reach editors without a redeploy.

## The publish webhook

The site is static, so publishing must trigger a Netlify build. One webhook, set up once by the owner in sanity.io/manage › project `viqjrovw` › API › Webhooks:

| Setting     | Value                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Name        | `Rebuild zurichjs.com`                                                                                            |
| URL         | `https://zurichjs.com/api/rebuild`                                                                                |
| Dataset     | `production`                                                                                                      |
| Trigger on  | Create, Update, Delete                                                                                            |
| Filter      | `_type in ["events", "talk", "speaker", "partner", "meetupRating", "conference", "siteSettings", "announcement"]` |
| Drafts      | off (on only for the draft preview site's own webhook)                                                            |
| Projection  | `{_id, _type}`                                                                                                    |
| HTTP method | POST                                                                                                              |
| Secret      | a random string, also set as `SANITY_WEBHOOK_SECRET` in Netlify                                                   |

With Drafts off, saving a draft never triggers a build; only publishing does. Requests without a valid signature, or signed more than 5 minutes ago, get a 401. How the webhook debounces into builds is in [Rebuilds](/systems/operations/rebuilds.md).

## Related concepts

- [System map](/systems/overview.md), [Web app](/systems/web.md), [Rebuilds](/systems/operations/rebuilds.md)
- [Content](/domains/content/overview.md), [Events content model](/domains/events/content-model.md), [Content model](/domains/content/content-model.md)
- [Slack content agent](/systems/slack-agent.md): edits the same documents as drafts

# Related specs

- [Review every partner, then move the list into Sanity](/domains/partners/specs/partner-data-review.md)
