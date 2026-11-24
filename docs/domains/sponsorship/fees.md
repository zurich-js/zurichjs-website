---
type: Domain
title: Processing fees
description: Who covers card processing fees on a board offer, the fee gate that keeps "Sponsor covers the fees" off until a tariff and an owner-approved surcharge policy exist, and the frozen quote every payment link records.
tags: [sponsorship, stripe, fees]
timestamp: '2026-11-24T00:00:00Z'
---

# Processing fees

Source: `packages/sponsorship/src/fees.ts` (the arithmetic, pure), `packages/sponsorship/src/fee-store.ts` (tariffs and quotes in memory and Postgres), `apps/web/src/server/sponsor-fees.ts`, the migration `apps/web/database/migrations/20261124100000_fee_quotes.sql`, the admin route `apps/web/src/pages/api/membership/admin/fees.ts` and the payment link route `apps/web/src/pages/api/membership/admin/sponsors/[id]/payment-link.ts`.

## Who covers the fees

For each offer the board sends, it chooses **ZurichJS covers the fees** (the default) or **Sponsor covers the fees**. Today an offer is a payment link for a one-time sponsorship. Sponsorships a sponsor starts on their own, and recurring sponsorships, are always "ZurichJS covers the fees" (see "Not built yet").

## The fee gate

"Sponsor covers the fees" is refused, with the reason on the board's screen, until both exist:

| Needs                        | Where                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A card tariff                | `/admin/sponsors` › Processing fees › Add a tariff: a version, the rate per card payment and the fixed fee. Tariffs are never edited                                |
| An approved surcharge policy | `SPONSOR_FEE_POLICY_VERSION`, set in the environment by the owner once they approved a policy version ([Environment variables](/systems/operations/environment.md)) |

The code ships no tariff and no policy. Turning the gate on is an owner configuration action, not part of a deploy.

## Quotes

A quote is the one record of what a sponsor agreed to pay (`payment_quotes`).

- **Every payment link freezes a quote:** purpose, base, surcharge and total in rappen, the fee choice, the tariff and policy versions, and the formula. The database refuses any change to those figures; the status only moves forward (open, then paid, superseded or void).
- **Arithmetic on the server, in integers:** rates are parts per million. For rate `r` and fixed fee `f`, the total that leaves the base `B` after fees is `G = ceil((B + f) / (1 - r))`, and the surcharge is `G - B` (`gross-up-v1`). Adding `r × B` would under-recover, because the fee applies to the surcharge too. The browser shows quotes and never computes one.
- **A new link is a new quote:** it switches the old link off first and supersedes its quote. There is one open quote per sponsorship.
- **Stripe:** the surcharge is its own line, "Payment processing fee", so the payment page and the receipt show base, fee and total apart. The link and its payment carry `quoteId` in their metadata.
- **The sponsor sees the offer first:** while the sponsorship waits for payment, `/partners/account` shows what it is for, the amount, the fee and the total, with a button to the link. An offer where the sponsor covers the fees is paid through its link only: starting Checkout on the account page is refused, so the total they agreed to is the total they pay.
- **Payment:** the webhook marks the quote paid. A payment of a superseded quote (an old page), or of a total that differs from the quote, is recorded and flagged in Slack for the board. Nothing is lost and nothing else changes.
- **The fee is an estimate:** the actual Stripe fee depends on the card. The sponsor is told so.

## Not built yet

- **Recurring sponsorships with "Sponsor covers the fees":** needs the surcharge as a recurring line on the subscription, carried through tier changes and renewals, and a change link the sponsor confirms. Until then recurring sponsorships are always "ZurichJS covers the fees".
- **The actual fee per payment** is not read back from Stripe for reconciliation.

## Draft surcharge policy (for the owner to review, not approved)

> When a sponsor agrees to cover card processing fees, ZurichJS adds a separate line, "Payment processing fee", to the payment. It is calculated from the card tariff named on the offer so that ZurichJS receives the agreed amount after fees. The sponsor sees the amount, the fee and the total before paying, and the receipt shows the fee as its own line. The fee is an estimate; ZurichJS does not charge or refund the difference to the actual fee. Policy version: (set by the owner).

Open for the owner: whether a surcharge is allowed for each card type under Swiss rules and the card and Stripe terms; whether a surcharge is refunded with a refund; VAT.

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Stripe](/systems/stripe.md), [Environment variables](/systems/operations/environment.md)

# Related specs

None.
