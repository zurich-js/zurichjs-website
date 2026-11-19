---
type: Spec
title: Member perks
description: The perks the bylaws name for members (a basic discount, and one included paid event per year for active members), waiting for the board to define them.
tags: [membership, perks, bylaws]
timestamp: '2026-11-19T00:00:00Z'
status: planned
domain: membership
systems: [web, membership]
---

# Outcome

The bylaws (Art. 4) name two perks: a basic discount set by the board for all members, and one paid event per year included for active members. Neither is defined or built. The board has to decide what the discount is and which paid events are included each year; perks wait for that, and nothing else does.

## Requirements and acceptance

- Members see their perks on `/membership/account`, gated by level and, for the included event, by being active.
- The included event is a yearly entitlement per member (issued, redeemed), not just a list item.
- "Active" (at least 40% of events per year) is set by the board each year at first; attendance data from Meetup or Sane can come later.
- Benefit copy on `/membership` changes only with the owner.

## Affected concepts

- [Membership](/domains/membership/overview.md)
- [Membership frontend](/domains/membership/frontend.md)
- [Content sources](/reference/content-sources.md) (the confirm items for membership benefits)

## Open decisions

- **Board:** what the basic discount is, and which paid events are included each year.
- Whether passive and active membership is recorded at all.
- How the yearly workshop vouchers (Enthusiast CHF 50, Advocate CHF 100) are issued and redeemed once workshops are back, and whether an unused voucher expires with the membership year. "Free or discounted workshops" was removed from Supporter (owner, 19th November 2026).
