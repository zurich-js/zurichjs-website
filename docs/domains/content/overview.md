---
type: Domain
title: Content
description: How the site loads content from Sanity at build time, the sample fallback and when it is forbidden, draft preview, the code-side records, and who edits what.
tags: [content, sanity, groq]
timestamp: '2026-11-19T00:00:00Z'
---

# Content

Source: `packages/content` (`@zurichjs/content`): `packages/content/src/queries.ts` (typed GROQ), `packages/content/src/sanity.types.ts` (generated), `packages/content/src/map.ts` (mappers), `packages/content/src/sample.ts`, `packages/content/src/community.ts`, `packages/content/src/partners.ts`, `packages/content/src/media.ts`, `packages/content/src/sane.ts`; the app's loader in `apps/web/src/lib/content.ts`.

## Loading

- **`loadContent()` reads Sanity over plain `fetch`** at build time, with `SANITY_PROJECT_ID` (default `viqjrovw`), `SANITY_DATASET` (default `production`) and optionally `SANITY_READ_TOKEN` or `SANITY_TOKEN`. Not `@sanity/client`: `fetch` is smaller, and the client crashed the build with an uncatchable socket error when Sanity was unreachable.
- **Typed queries:** every query in `queries.ts` has a generated result type; change a query or the schema, then run typegen ([Studio](/systems/studio.md)). CI fails when the generated files differ.
- **At build time it also reads** the ImageKit archive ([Media archive](/systems/media.md)), for events linked to Sane, Sane's public API ([Events](/domains/events/overview.md)), and the sponsorships database for who is a current sponsor and at which tier ([Sponsorship](/domains/sponsorship/overview.md)). The package itself has no database driver: the web app passes the reader in. Sample content never reads the database.

## Sample content

`packages/content/src/sample.ts` is used only offline (`CONTENT_SOURCE=sample`) or in CI. When Sanity is unreachable, a build falls back to it with a warning, except on production (`CONTEXT=production` or `CONTENT_REQUIRE_SANITY=1`), where the build fails instead, so sample content never ships. Sample content never contains a Twint QR, so a placeholder payment code cannot ship.

## Draft preview

`SANITY_PERSPECTIVE=drafts` with a Viewer `SANITY_READ_TOKEN` builds the same static site from drafts: every page noindex, `robots.txt` disallowing everything, a "Draft preview" bar. Drafts without a token fail the build rather than fall back to sample content. One rendering path (static), with no preview server or secrets in the browser. It runs as a second Netlify site ([Netlify deploys](/systems/operations/netlify.md)).

## Records kept in code

Some low-churn facts live in TypeScript, each item with its source ([Content sources](/reference/content-sources.md)):

- **`community.ts`:** the community timeline and the team on `/about`.
- **`partners.ts`:** the old production partner list, used only while Sanity has no `partner` documents ([Partners](/domains/partners/overview.md)).
- **`apps/web/src/lib/membership.ts`:** membership fees and benefits ([Membership](/domains/membership/overview.md)).

## Who edits what

- **Organisers** edit in the Studio, or through the Slack agent, which writes drafts that a person publishes ([Slack content agent](/systems/slack-agent.md)). Content edits through the Sanity MCP follow the same rule: drafts first, a person publishes.
- **The Meetup rating** is copied by hand into `meetupRating` and never scraped (`agents/skills/rating-refresh/SKILL.md`).
- **Deleting content or Sanity documents** needs the owner. Scripts and the agent write drafts only.
- **No invented facts:** dates, prices, attendee numbers, speakers and venues come from content or a person.

## Related concepts

- [Content model](/domains/content/content-model.md), [Events content model](/domains/events/content-model.md), [Content sources](/reference/content-sources.md)
- Systems: [Studio](/systems/studio.md), [Web app](/systems/web.md), [Media archive](/systems/media.md), [Rebuilds](/systems/operations/rebuilds.md)

# Related specs

None.
