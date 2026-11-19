---
type: Reference
title: Authoring guide
description: How the zurichjs.com knowledge bundle is scoped, placed, linked, checked and kept current, without needing any external skill.
tags: [conventions, okf]
timestamp: '2026-11-19T00:00:00Z'
---

# Authoring guide

This bundle follows Open Knowledge Format (OKF) v0.1 with the novu authoring conventions. Everything needed to write and check it is on this page.

## What belongs here

- **In scope:** how the site, the Studio, the packages, the Slack bots and the operations work: routes, data flow, Sanity schema shapes, business rules, environment variables, commands, failure modes, and the decisions behind them.
- **Out of scope:** editorial content (event descriptions, talk abstracts, page copy), lists of Sanity documents, member or customer data, secrets, and media files. A short synthetic example may show a shape.
- **The legal pages** (`apps/web/src/content/policies`) are site content, not documentation. They are owner-only.
- **Agent playbooks and roles** stay in `agents/skills` and `agents/roles`. They are instructions for agents, not concepts; concepts link to them.
- **`AGENTS.md`** at the repository root is the entry point for every agent. It only points into this bundle; the binding rules live here, in [Working rules](/conventions/working-rules.md), [Brand rules](/systems/design-system/brand.md) and [UI and design system rules](/systems/design-system/ui-rules.md). `CLAUDE.md` only imports it.

## One home per fact

Every fact has one canonical concept. Other pages link to it instead of repeating it. Binding rules keep their attribution where they live, for example "(owner, 12th November 2026)". Changing a binding rule needs the owner; moving or linking one does not.

## Present tense, no branches

Concepts describe the system as it is once the working change is merged. Do not name Git branches or write "pending merge". State a real gap in the present tense ("the scheduled job that runs it is not built"). Work that is not built belongs in a Spec. History belongs in Git, in pull requests and in the [decision record](/reference/decisions/index.md).

## No invented facts

Dates, prices, people, venues and numbers come from the code, from content, or from a person. What cannot be verified goes under an "Open questions" or "Not verified" heading in the concept, never stated as fact. When code and a doc disagree, the code wins: fix the doc and note the correction in [the log](/log.md).

## Placement

| Knowledge                                    | Home                                           |
| -------------------------------------------- | ---------------------------------------------- |
| Repository layout, packages, integrations    | `/systems/overview.md`                         |
| Setup and checked commands                   | `/systems/local-development.md`                |
| An app or a cross-cutting technical system   | `/systems/<system>.md`, or a folder when large |
| Deploys, environment, rebuilds, CI, failures | `/systems/operations/`                         |
| Business rules of a domain                   | `/domains/<domain>/overview.md`                |
| Sanity schema of a domain                    | `/domains/<domain>/content-model.md`           |
| Pages and islands of a domain                | `/domains/<domain>/frontend.md`                |
| HTTP endpoints and webhooks of a domain      | `/domains/<domain>/api.md`                     |
| Work that is planned or in progress          | `<domain or system folder>/specs/<name>.md`    |
| Decisions, sources and other records         | `/reference/`                                  |

Create a folder and its `index.md` only when it gets a concept. No empty trees.

## Frontmatter

Every Markdown file except `index.md` and `log.md` starts with YAML frontmatter:

```yaml
---
type: Domain
title: Events
description: One sentence on what the concept covers.
tags: [events]
timestamp: '2026-11-19T00:00:00Z'
---
```

- `type` is required and nonempty. Types used here: `System`, `Domain`, `Content Model`, `Frontend Area`, `API`, `Spec`, `Reference`. An unknown type is allowed when none fits.
- `title`, `description`, `tags` and an ISO `timestamp` are expected on every concept. Update `timestamp` on a meaningful change.
- Specs also carry `status` (`planned`, `in-progress` or `shipped`), `domain` and `systems`.
- The root `index.md` carries only `okf_version: "0.1"`. Other `index.md` files and `log.md` have no frontmatter.

## Links

- Inside the bundle, links are absolute from the bundle root: `[Events](/domains/events/overview.md)`. A folder is linked through its `index.md`.
- Repository files are named in backticks (`packages/events/src/state.ts`), relative to the repository root. They are not links, so the bundle reads the same in any viewer.
- A domain concept links the systems it depends on, and those systems link back. A Spec links the concepts it affects under "Affected concepts", and each of them links the Spec under `# Related specs`.
- Every concept is listed in its folder's `index.md`, and every folder is reachable from the root `index.md`.

## Specs

A Spec describes a feature or rule that is not built yet, or is only partly built: the outcome, requirements and acceptance, affected concepts and open decisions. Its `status` is `planned` or `in-progress`. Mark it `shipped` only when its acceptance criteria are met, and move the resulting facts into the affected concepts in the same change. Never describe a Spec's proposal as current behaviour in a concept.

## The log

[`/log.md`](/log.md) records meaningful knowledge changes, newest date first (`## YYYY-MM-DD`), one bullet each with a link to the affected concept. Typos and small rewordings are not logged.

## Copy

Plain, specific British English, as in the site's brand rules: no em dashes, no decoration. Say "talk proposals" (explain "call for papers (CFP)" once).

## Checking the bundle

There is no bundle linter in this repository. Before finishing a docs change, check:

1. Every non-reserved `.md` file under `docs/` has parseable frontmatter with a nonempty `type`.
2. Every link starting with `/` resolves to a file under `docs/`, and every backticked repository path exists.
3. Every concept is listed in its folder's `index.md`, and every folder index is reachable from `/index.md`.
4. Domain and system pages link both ways where one depends on the other; every Spec and its affected concepts link both ways.
5. Facts you changed match the code they describe (`package.json` scripts, `apps/web/netlify.toml`, `.github/workflows`, the source files named in the concept).

`tools/agents.test.ts` (part of `pnpm test`) also checks that every repository path named in backticks in `AGENTS.md`, the Slack agent concept and the playbooks exists. `pnpm format:check` formats Markdown too.

# Related specs

None.
