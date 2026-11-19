---
type: Spec
title: A radius rule for cards with buttons
description: Replace the interim 24px corner on cards whose footer holds buttons with a rule that follows the rounding formula.
tags: [design-system, cards, radius]
timestamp: '2026-11-19T00:00:00Z'
status: planned
domain: design-system
systems: [design]
---

# Outcome

Cards with buttons in their footer keep 24px corners for now (owner, 12th November 2026). The rounding formula (outer radius = inner radius + padding + border) still applies where text touches the edge, and `edge="control"` (24px + padding) is opt-in. The owner said a better rule for cards with buttons comes later. This Spec holds that open item.

## Requirements and acceptance

- One rule, applied by `Card` from its props, so pages never pick a card radius.
- The rule covers a card whose footer holds pill buttons, and a card holding a small card that has a button (today 40px + padding).
- Visual baselines change only for the cards the rule affects, with the reason in the PR.
- The owner approves the rule before it ships (a brand rule: shapes).

## Affected concepts

- [Foundations](/systems/design-system/foundations.md) (Radii, rounding formula)
- [Components](/systems/design-system/components.md) (Cards)
- [Design system package](/systems/design-system/overview.md)

## Open decisions

- What the rule is. No proposal is recorded.
