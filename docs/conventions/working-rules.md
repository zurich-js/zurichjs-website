---
type: Reference
title: Working rules
description: The binding rules for anyone changing this repository: what needs the owner, branches and pull requests, checks before a commit, content edits and secrets.
tags: [conventions, binding, workflow]
timestamp: "2026-11-19T00:00:00Z"
---

# Working rules

These rules are binding for people and agents alike. Domain and system rules live in their concepts; start from the [root index](/index.md). The rules for anything people see are the [brand rules](/systems/design-system/brand.md) and the [UI and design system rules](/systems/design-system/ui-rules.md).

## Needs the owner (never do these on your own)

- changing the brand, fonts or colours
- changing or removing a public URL (every production URL keeps working or gets a 301; the [SEO gate](/systems/seo.md) enforces it)
- changing the rating copy or the AI-crawler rules in `robots.txt`
- deleting content or Sanity documents
- spending money
- production deploys, and migrations on the `production` dataset. The Studio deploys itself when `apps/studio` changes reach `main` (`.github/workflows/deploy-studio.yml`); never run `sanity deploy` by hand
- the legal pages (`apps/web/src/content/policies`)

## Branches and pull requests

- **One branch and one PR per change,** and never push to `main`.
- **Every PR includes screenshots and a short recording** (`agents/skills/visual-review/SKILL.md`); check a branch before asking for a merge with `agents/skills/release/SKILL.md`.
- **Before every commit,** run the checks for what you touched ([Local development](/systems/local-development.md)). The pre-commit hook formats and lints staged files, then typechecks. CI (`.github/workflows/ci.yml`) runs everything, including e2e, visual regression, the SEO gate and Lighthouse ([CI](/systems/operations/ci.md)).
- **Don't weaken a test, a security check or the SEO gate to get green.** Fix the cause, or record an intended change with a reason ([Testing](/systems/testing.md)).
- **Documentation changes with the code:** update the concept for any durable behaviour you change, in the same PR ([Authoring guide](/conventions/authoring-guide.md)).

## Content

- **No invented facts:** dates, prices, attendee numbers, speakers and venues come from content or from a person, never from an agent.
- **Drafts first, a person publishes,** whether through the Studio, the Slack agent or the Sanity MCP ([Content](/domains/content/overview.md)).

## Secrets

Secrets come only from the environment, never from files, and a missing secret logs a stub line instead of crashing a page ([Environment variables](/systems/operations/environment.md)).

## Related concepts

- [Authoring guide](/conventions/authoring-guide.md), [Brand rules](/systems/design-system/brand.md), [UI and design system rules](/systems/design-system/ui-rules.md)
- [Testing](/systems/testing.md), [Netlify deploys](/systems/operations/netlify.md), [Slack content agent](/systems/slack-agent.md)

# Related specs

None.
