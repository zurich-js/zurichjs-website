---
type: Spec
title: Online sponsorship on /partners
description: Show the quarterly sponsorship prices and a way to sponsor or sign in online on the public /partners page.
tags: [sponsorship, partners, copy]
timestamp: '2026-11-19T00:00:00Z'
status: planned
domain: sponsorship
systems: [web, content]
---

# Outcome

Self-serve sponsorships are built, but `/partners` still shows only the monthly, yearly and one-time prices and has no link to `/partners/account`. The quarterly price and a "Sponsor online" or "Already a sponsor? Sign in" link are a public copy change that needs the owner.

## Requirements and acceptance

- Each package on `/partners` shows the quarterly price from `packages/sponsorship/src/tiers.ts`, in the same order and format as the other prices; `apps/web/test/sponsorship-fees.test.ts` also covers the quarterly price.
- A link to start a sponsorship online and one for existing sponsors to sign in, without replacing the enquiry form.
- No new accent colour or decoration; the visual baseline for `/partners` is updated with the reason in the PR.
- The SEO gate stays green.

## Affected concepts

- [Partners and sponsorship](/domains/partners/overview.md)
- [Sponsorship](/domains/sponsorship/overview.md)
- [Sponsorship frontend](/domains/sponsorship/frontend.md)

## Open decisions

- The owner's wording and where on the page the links go.
