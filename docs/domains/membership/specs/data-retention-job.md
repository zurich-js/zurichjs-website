---
type: Spec
title: Scheduled anonymisation of ended memberships
description: A scheduled job that anonymises member data one year after a membership ends, using the existing member_anonymise database function.
tags: [membership, privacy, retention]
timestamp: '2026-11-19T00:00:00Z'
status: planned
domain: membership
systems: [web, membership]
---

# Outcome

The retention rule is decided (owner, 6th November 2026): member data is kept for one year after the membership ends, then anonymised. The database function `member_anonymise` exists (`apps/web/database/migrations/20261110120100_membership.sql`) and refuses before the retention period has passed. Nothing calls it on a schedule yet, so ended memberships are not anonymised automatically.

## Requirements and acceptance

- A scheduled job (the pattern of `apps/web/netlify/functions/scheduled-rebuild.mts`) finds memberships that ended more than a year ago and are not anonymised, and calls `member_anonymise` for each, recording the actor.
- Personal fields, notes and Stripe ids are removed; the row stays as a count with its level and dates; the audit log records the change.
- Stripe records are never touched: they are the payment records for the accounts.
- It is safe to run twice and on an empty set; it never runs against a deploy preview's database with production data (previews have their own empty databases).
- Tested on a local Postgres like the other database tests.

## Affected concepts

- [Membership](/domains/membership/overview.md) (Data retention)

## Open decisions

- Swiss bookkeeping retention (likely 10 years, OR Art. 958f) to confirm with whoever keeps the books. It affects Stripe, not the member database.
- How often the job runs.
