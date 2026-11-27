---
type: Domain
title: Processing fees
description: Who covers card processing fees on a board offer, the fee gate that keeps "Sponsor covers the fees" off until a tariff and an owner-approved surcharge policy exist, and the frozen quote every payment link records.
tags: [sponsorship, stripe, fees]
timestamp: '2026-11-24T00:00:00Z'
---

# Processing fees

Source: `packages/sponsorship/src/fees.ts` (the arithmetic, pure), `packages/sponsorship/src/fee-store.ts` (tariffs and quotes in memory and Postgres), `apps/web/src/server/sponsor-fees.ts`, the migration `apps/web/database/migrations/20261124100000_fee_quotes.sql`, the admin route `apps/web/src/pages/api/membership/admin/fees.ts` the payment link route `apps/web/src/pages/api/membership/admin/sponsors/[id]/payment-link.ts`, the recurring routes `apps/web/src/pages/api/membership/admin/sponsors/[id]/fees.ts` and `apps/web/src/pages/api/sponsorship/fees.ts`, and the migration `apps/web/database/migrations/20261124120000_recurring_quotes.sql`.

## Who covers the fees

For each offer the board sends, it chooses **ZurichJS covers the fees** (the default) or **Sponsor covers the fees**: on a one-time sponsorship's payment link, and on a recurring sponsorship (open the sponsor › Processing fees). Sponsorships a sponsor starts on their own without an offer, and those paid by bank transfer, are always "ZurichJS covers the fees".

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

## Payments

The board previews the amount, surcharge, total and estimated net before creating the link. Each Stripe session has its own receipt. Only a payment matching the sponsor, subject, link, currency and frozen total pays the open quote. Other payments wait for a decision under **Card payments** on the sponsor's board page. The board can apply a reviewed payment to a pending one-time sponsorship or record how it was settled. Refunds are handled in Stripe. **Check actual fees with Stripe** reads the balance transaction and records the actual fee and net separately from the original estimate.

## Recurring sponsorships

A recurring quote names its interval (month, quarter or year) and is worked out for the sponsorship's current plan. It is **accepted** once the sponsor agreed, and stays in force for every renewal until a newer accepted quote supersedes it (one in force per sponsorship).

- **Not started yet:** the board saves an offer; any open Checkout page is closed. The account page shows the amount, the fee and the total per period, and the start form has an unticked box "I agree to pay the card processing fee of … a separate line on every renewal". Starting is refused without the tick, or with another plan than the offer's. Checkout then carries the fee as its own recurring line, and the webhook records the acceptance (contact, time) when the subscription starts.
- **Running by card:** the board offers either fee choice. The offer queues a change invitation. The sponsor confirms the displayed quote ID. Stripe updates the identified processing fee item without proration. A retry verifies the item against its quote before recording acceptance. An unrecognised subscription line requires board reconciliation.
- **Renewals and receipts** carry the fee as its own line. The sponsorship price identifies the base plan and its billing period.
- **Changing plans with a fee in force.** The board sends a quote for the new base price, surcharge and billing interval. The sponsor sees the renewal total and the amount due on confirmation. Confirming a renewal schedules both price lines together. The previous quote stays in force until Stripe applies the new plan. Keeping the current plan cancels the scheduled offer.
- **Prorated upgrades.** An immediate upgrade requires an explicitly approved treatment. Set both `SPONSOR_FEE_PRORATION_MODE=stripe_items` and `SPONSOR_FEE_PRORATION_POLICY_VERSION` only if the owner approves prorating the base and surcharge together using Stripe. The offer freezes Stripe’s CHF invoice preview and its timestamp. Confirmation checks the preview again before charging. A different treatment requires implementation before enabling it.
- **Retrying a quoted upgrade.** A definite card refusal releases that confirmation. The sponsor can review and confirm the offer again, or the board can replace it. An unknown response keeps the same signer and Stripe key. The board sees that confirmation is in progress until Stripe answers. If Stripe applied both price lines, the sponsor’s retry records the accepted quote even after the billing period ends. If the subscription renewed on the previous plan and fee instead, the offer expired: the sponsor’s retry or the board’s next offer voids it, and the board can send a new one.

## Draft surcharge policy (for the owner to review, not approved)

> When a sponsor agrees to cover card processing fees, ZurichJS adds a separate line, "Payment processing fee", to the payment. It is calculated from the card tariff named on the offer so that ZurichJS receives the agreed amount after fees. The sponsor sees the amount, the fee and the total before paying, and the receipt shows the fee as its own line. The fee is an estimate; ZurichJS does not charge or refund the difference to the actual fee. Policy version: (set by the owner).

Open for the owner: whether a surcharge is allowed for each card type under Swiss rules and the card and Stripe terms; whether a surcharge is refunded with a refund; VAT.

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Stripe](/systems/stripe.md), [Environment variables](/systems/operations/environment.md)

# Related specs

None.
