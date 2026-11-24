---
type: Domain
title: Raffle add-ons
description: The optional, separately paid raffle an existing sponsor can add to a meetup, from proposal and board offer to payment, gift accounting and readiness, with the raffle terms gate and the eligibility rule.
tags: [sponsorship, raffle, stripe]
timestamp: '2026-11-24T00:00:00Z'
---

# Raffle add-ons

Source: `packages/raffle` (`@zurichjs/raffle`: types, the stage and funding rules, eligibility, gift accounting, the store in memory and Postgres), `apps/web/src/server/raffle.ts`, `apps/web/src/server/raffle-webhook.ts`, `apps/web/src/server/raffle-route.ts`, the routes under `apps/web/src/pages/api/sponsorship/raffles`, `apps/web/src/pages/api/membership/admin/raffles` and `apps/web/src/pages/api/raffle`, the pages `apps/web/src/pages/raffle`, the entrant emails `packages/emails/src/raffles.ts`, and the migrations `apps/web/database/migrations/20261124110000_raffles.sql` and `apps/web/database/migrations/20261124130000_raffle_entries.sql`.

## What it is

- **An add-on, not a benefit:** only a company with a sponsorship can have one, and no tier includes it. It has its own amount, quote, payment, receipt and status, and belongs to the sponsor account.
- **One sponsor, one meetup, one kind of prize,** with a quantity. ZurichJS buys and delivers the prize with the sponsor's money by default; a prize the sponsor sends is recorded as in kind, with no payment.
- **The host meetup** is proposed by the sponsor from the upcoming published meetups and confirmed by the board's offer. A raffle never makes its company that meetup's sponsor.

## Who may buy one

A sponsorship that is `active`, or `ending` and still inside its paid term. `pending`, `past_due` and `ended` cannot. The server checks it when the sponsor proposes, when the board offers, and when the sponsor accepts (which makes the payment link). A payment that arrives after the sponsorship stopped being eligible is recorded and flagged (`late_payment`), never refused or lost.

## The raffle terms gate

The approved sponsorship agreement (18th November 2026) says sponsors run their own raffles and ZurichJS gives no attendee data. A raffle ZurichJS runs therefore needs its own terms. Until the owner sets `RAFFLE_TERMS_VERSION` and `RAFFLE_TERMS_URL` ([Environment variables](/systems/operations/environment.md)), sponsors can propose and the board can review, but nothing can be offered, accepted or paid. The existing agreement is never read as permission. An offer records the terms version it was made under; the sponsor accepts exactly that version, with the contact recorded. A different version since the offer needs a new offer.

## Stages and funding

Two separate states, owned by one store. Paying never opens entries, and a refund never erases anything.

| Stage                   | Means                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `proposed`              | the sponsor proposed it (meetup, prize, quantity, budget, who gets the prize)           |
| `offered`               | the board set the amount and who covers the fees, under approved raffle terms           |
| `ready`                 | paid (or the prize arrived in kind), terms accepted, and the prize bought or received   |
| `open`                  | entries open, under approved entrant rules; the terms are frozen                        |
| `closed`                | no more entries                                                                         |
| `drawn`                 | a winner is drawn (redraws stay in this stage)                                          |
| `fulfilled`             | the prize reached the winner                                                            |
| `on_hold`               | the board paused it (the host meetup changed, the sponsorship ended): the board decides |
| `declined`, `cancelled` | ended, with the board's reason shown to the sponsor                                     |

Funding: `unpaid`, `paid`, `refund_pending`, `refunded`, or `in_kind`.

## Offer and payment

- **The offer freezes a quote** for the raffle ([Processing fees](/domains/sponsorship/fees.md)): the prize amount, and a processing fee when the board chose "Sponsor covers the fees" and the fee gate is open.
- **Accepting** opens a single-use Stripe payment link for that quote, with metadata `source: zurichjs.com/partners/raffle`, the raffle, the sponsor and the quote, a receipt (invoice), and the fee as its own line.
- **The webhook** has a raffle part next to the sponsorship part ([Stripe](/systems/stripe.md)). The sponsorship part skips the raffle source, and a raffle's payment link is looked up only among raffles, so a raffle payment never starts, renews or changes a sponsorship. The raffle part marks the funding and the quote paid, adds a ledger row, closes the link, and flags a total that differs from the quote (`amount_mismatch`) or a payment for a cancelled or paused raffle (`refund_review`). It has its own idempotency table.

## Gift accounting

`raffle_ledger` is append-only, in rappen: payments, prize purchases and delivery (with receipt numbers), refunds, and in-kind arrivals. The board sees money received, money spent and the difference as underspend, overspend or balanced. What happens with a difference is the board's decision; nothing settles it automatically. A raffle is marked ready only once the prize purchase (or its in-kind arrival) is recorded.

## Cancelling, holds and refunds

Cancelling or pausing a raffle with money in flags it `refund_review`. The board records its decision (refund being decided), makes the refund in Stripe or by bank, and records it with its reference. Nothing is refunded by the site. A host meetup that is cancelled or moved is put on hold by the board with the `meetup_changed` flag; the site does not detect it by itself yet.

## Entering

- **The entrant rules gate:** entries open only under an entrant rules version the owner approved and published (`RAFFLE_RULES_VERSION`, `RAFFLE_RULES_URL`). Opening freezes on the raffle the rules version and URL, the closing time (by the end of the meetup day), the prize and the meetup; the database refuses later changes to them.
- **The entry page** `/raffle?r=<raffle id>` (noindex) shows the prize, the meetup, "Raffle supported by" the sponsor, the closing time and the rules. Entry is free and needs no account: a name or nickname, an email and the rules box. One entry per email per raffle, checked on the server, with rate limits per address and per connection and a honeypot. The answer is the same for a new and a repeated email, so nobody learns whether an address entered. A link alone does not prove someone was at the meetup.
- **The entry email** has the claim code and the entrant's own link, `/raffle/manage#t=…` (the token is in the fragment and kept only as a SHA-256 hash). Opening the link shows the entry; the email counts as verified only when its owner clicks Confirm, so a mail scanner cannot confirm it. The entry counts either way. Entry, recovery and winner messages are queued durably and retried using the same provider key. Entrants can request another private link on the raffle page. The management page clears its token from the address bar and omits third-party analytics.

## The draw

- **Once:** closing the entries freezes them; drawing is a compare-and-set from `closed` to `drawn` in one statement with the draw row. A second click returns the same winner. The winner is chosen uniformly from all entries (32-bit `crypto.getRandomValues`, rejection sampling), in entry order.
- **Auditable:** each draw keeps its number, the eligible count, the index drawn, a SHA-256 fingerprint of the entries' ids in draw order, who drew and when. Draws are append-only.
- **Redraw:** needs a reason, which is kept with the draw, and excludes earlier winners. It follows the rules published before entries opened.
- **The winner** is emailed privately and the board sees the winner's name and email to arrange the prize. The entry page shows the winning claim code, never a name or email. The board records the claim before recording delivery. The delivery note stays private. A redraw requires a recorded expiry against the reviewed draw and a reason under the published rules. Retrying the same redraw returns the recorded result.

## Slack and data

Draw notifications to Slack contain counts only. Never an entrant's name or email. The sponsor sees entry counts and the winning claim code, never entrants.

## Draft entrant rules (for the owner to review, not approved)

> Entry is free and open to anyone; no purchase or sign-up is needed. Enter once, with a name or nickname and an email, before the closing time shown on the entry page. The winner is drawn at random from all entries after entries close, and is announced on the entry page by claim code only. ZurichJS emails the winner, who replies within (number) days to claim the prize; otherwise ZurichJS draws again. The prize cannot be exchanged for cash. ZurichJS uses the name and email only to run this raffle (the entry email, the draw and contacting the winner) and deletes them (retention period) after the raffle. The sponsor named on the page funds the prize and receives no entrant data. Rules version: (set by the owner).

The current privacy policy does not describe raffle entries. These rules, or a change to the privacy policy (a legal page, owner), must say how entry data is used and kept before entries open.

## Draft raffle terms (for the owner to review, not approved)

> A raffle add-on is an optional, separately paid addition to a ZurichJS sponsorship. The sponsor proposes a prize for a meetup it sponsors; ZurichJS confirms the meetup and the amount in an offer. ZurichJS runs the raffle: it buys and delivers the prize with the sponsor's payment (or receives the prize the sponsor sends), publishes the rules before entries open, draws the winner at random and contacts the winner. Entry is free and does not depend on agreeing to any marketing. ZurichJS gives the sponsor no entrant data unless a separate, approved sharing policy applies and each entrant agreed to it. If the meetup is cancelled or the raffle cannot go ahead, ZurichJS and the sponsor agree a new date or a refund. Terms version: (set by the owner).

Open for the owner: the reply window and redraw timing, whether the winner must be at the meetup, the retention period for entries; underspend, overspend and shipping costs; refunds and deductions; whether every tier can buy a raffle; whether a raffle goes ahead after its sponsorship ends; whether a meetup can host more than one raffle; VAT and accounting with the treasurer.

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Processing fees](/domains/sponsorship/fees.md), [Sponsorship payments and API](/domains/sponsorship/api.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Stripe](/systems/stripe.md), [Environment variables](/systems/operations/environment.md)

## Payment review and holds

The sponsor accepts the displayed quote and agreement version. The board rechecks the published host before offering the raffle. Checkout receipts and refund references are unique. A receipt, the funding change and the ledger entry commit together. An unmatched raffle receipt is available in the board raffle API. The board can read back the actual Stripe fee after settlement.

The daily sponsorship check compares outstanding funded raffles with their host and sponsorship. A cancelled or postponed host, an ended sponsorship or the end of the paid term puts the raffle on hold. The board resolves the flags, confirms prize readiness and decides any refund separately.

# Related specs

None.
