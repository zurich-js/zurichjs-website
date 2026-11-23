---
type: Spec
title: Sponsor dashboard, raffle add-on and fee coverage
description: Proposed design for the meetups a sponsorship covers, an optional paid raffle add-on for existing sponsors, and a per-offer choice of who covers payment-processing fees, with the gates that keep sharing and surcharges off until the owner configures them.
tags: [sponsorship, raffle, stripe, privacy, fees]
timestamp: '2026-11-24T00:00:00Z'
status: planned
domain: sponsorship
systems: [web, stripe, membership]
---

# Outcome

A sponsor signs in to `/partners/account` and sees the meetups their sponsorship covers. An existing sponsor can add a raffle to a meetup as a separately paid add-on. ZurichJS runs the entry, the draw and the prize. Entrant contacts reach the sponsor only when an entrant ticked an unticked box naming that sponsor, and only once the owner has approved the sharing rules. For every offer, the board chooses whether ZurichJS absorbs payment-processing fees or the sponsor pays a disclosed surcharge.

This is a design. Nothing here is built. The concept screens are throwaway HTML, published as PR media: [`pr-sponsor-raffle-concept`](https://github.com/zurich-js/zurichjs-website/tree/v2/pr-media/pr-sponsor-raffle-concept).

## Decided (24th November 2026)

- **A raffle needs a sponsorship.** Only a company with a sponsorship tier can buy a raffle. There is no raffle-only account and no raffle-only sign-up.
- **The raffle is an add-on, not a benefit.** No tier includes it. It has its own amount, payment, receipt and status, and it belongs to the existing sponsor account.
- **Covered meetups are visible.** The sponsor sees the meetups their sponsorship covers in the dashboard.
- **Gift flow:** the sponsor proposes a gift, the board records it and builds the entry form, and the sponsor pays through a link for that gift. Entrant data is shared selectively, and only as each entrant allowed.
- **Fees per offer:** the board chooses "ZurichJS covers the fees" or "Sponsor covers the fees" for each sponsorship offer and each raffle add-on, including payment links and recurring payments. The sponsor sees the amount, the surcharge and the total before paying.
- **No claims the docs cannot back:** no legal-compliance claim and no Stripe tariff that nobody configured.

## What exists today

Facts from the code at the time of writing:

- **Meetups per sponsorship** are stored only for one-time sponsorships: `SponsorMeetup` (`packages/sponsorship/src/types.ts`), the `sponsor_meetups` table (`apps/web/database/migrations/20261119090000_sponsorship_round2.sql`), and `meetups()` and `setMeetups()` in `packages/sponsorship/src/store.ts`. `setMeetups` replaces the whole list. The account card lists them by name and date (`apps/web/src/components/islands/SponsorAccount.tsx`). Recurring sponsorships have no meetup record.
- **Upcoming meetups** come from Sanity at request time: published, dated, not cancelled or postponed (`apps/web/src/server/sponsor-meetups.ts`).
- **Payment links** belong to the sponsorship: `createPaymentLink` stores one link id on the sponsor row and closes the earlier one (`apps/web/src/server/sponsor-stripe.ts`).
- **Webhook routing:** the sponsorship part handles `checkout.session.completed` when the metadata `source` is `zurichjs.com/partners` or when the session came from a payment link, and looks the sponsor up by that link (`apps/web/src/server/sponsor-webhook.ts`). A raffle payment must therefore carry its own `source` and its own link record, or it could start a sponsorship.
- **The sponsorship agreement** (`apps/web/src/pages/partners/agreement.astro`, approved 18th November 2026) says ZurichJS does not give attendee data for a sponsorship, and that a sponsor organises and pays for its own opt-ins, such as a raffle, and is responsible for that data. A raffle that ZurichJS runs, and contact sharing by ZurichJS, need a new agreement version. That is the owner's decision.
- **The privacy policy** (`apps/web/src/content/policies/privacy-policy.md`) covers event and membership data. It does not describe raffle entries, sharing with a named sponsor, or raffle retention. The legal pages are owner-only.
- **No raffle code exists.** A search for "raffle" and "giveaway" finds only the agreement text above.

## Defaults until the owner decides otherwise

These are conservative starting rules. Each is a single setting or check, so changing one does not change the design.

- **Eligibility:** a sponsor can create or pay for a raffle add-on while its sponsorship is `active`, or `ending` and still inside its paid term. `pending`, `past_due` and `ended` cannot. The server checks this when the sponsor proposes, when the board sends the offer, when the payment link is made, and when the payment completes.
- **A payment that arrives late** (the sponsorship ended between link and payment) is recorded as paid and flagged for the board. Nothing is lost and nothing else changes.
- **Host meetup:** the sponsor proposes from published upcoming meetups, and the board confirms the host meetup. A raffle never makes its company that meetup's sponsor, and public credit reads "Raffle supported by …", apart from the meetup sponsors.
- **Coverage:** the dashboard shows only meetups the board confirmed for the sponsorship. A meetup inside a billing period is not covered until it is confirmed. Coverage rows are kept after the meetup.
- **Scope of a raffle:** one sponsor, one meetup, one kind of prize, with a quantity.
- **Fulfilment:** ZurichJS buys and delivers the prize with the sponsor's money. A prize the sponsor sends instead is recorded as in kind, with no payment link.
- **Fees:** "ZurichJS covers the fees" is the default. "Sponsor covers the fees" can be chosen only when a tariff and a surcharge policy are configured (see "Gates").
- **Entry:** free, no account, name and email only. The draw never depends on the sharing choice.
- **Sharing:** off until its gate is configured.

## Gates (configuration, not code)

Two features stay off until a person configures them. The code reads the configuration and refuses the feature without it, with a plain message on the board screen.

| Gate             | Turns on                     | Needs                                                                                                                                         |
| ---------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fee pass-through | "Sponsor covers the fees"    | a tariff version entered by the board (percentage and fixed fee per payment method), and the owner's approval of a surcharge policy, recorded |
| Entrant sharing  | the opt-in box and the share | an approved raffle notice version, a retention period, a recipient policy, and a new agreement version that sponsors accept                   |

The code never ships a default tariff, retention period, refund deduction or legal text. The PR that adds each gate includes draft wording for the owner to review, and it never edits `apps/web/src/content/policies`.

## Fee quotes

A quote is the one record of what a sponsor agreed to pay.

- **Arithmetic on the server, in minor units (rappen).** For a tariff of rate `r` and fixed fee `f`, the total that leaves the base `B` after fees is `G = ceil((B + f) / (1 - r))`, and the surcharge is `G - B`. Adding `r × B` to the base under-recovers, because the fee applies to the surcharge too. The browser shows the quote. It never computes one.
- **A quote is frozen** when the board sends the offer: base, surcharge, total, currency, fee choice, tariff version, policy version and the formula. A paid quote never changes.
- **A new choice is a new quote.** Changing the fee choice or the amount makes a new quote and closes the earlier payment link, as `createPaymentLink` does today.
- **Recurring sponsorships** carry the surcharge as its own subscription line item, so every renewal and every receipt shows it. The sponsor sees the per-period total before starting. Changing who covers the fees on a running sponsorship goes through the existing "Send a change to confirm" link and applies from the next renewal only after the sponsor confirms.
- **The estimate is labelled an estimate.** The actual fee depends on the card, the currency and Stripe's pricing for the account. The actual fee is stored from Stripe for reconciliation, apart from the quote.

## Raffle lifecycle

Two state machines, owned by one store. Funding never opens entries, and a refund never erases entries, consent or a draw.

- **Stage:** `proposed → offered → ready → open → closed → drawn → fulfilled`, with `declined` and `cancelled` as exits. The terms (prize, rules version, closing time) freeze at `open`.
- **Funding:** `unpaid → paid → refund_pending → refunded`, or `in_kind` for a prize the sponsor sends.
- **Ready** needs funding `paid` or `in_kind`, and the board marking the prize available, with a receipt or delivery note attached.
- **The draw** runs once per raffle: a compare-and-set from `closed` to `drawn`, with the eligible entries frozen, a uniform choice from `crypto.getRandomValues`, and an audit row (entry count, entries hash, chosen entry, actor, time). A second click returns the same winner. A redraw needs a reason and follows the rules published before entries opened.
- **The winner** is shown in public by a claim code, never by name or email. ZurichJS contacts the winner privately.
- **The host meetup is cancelled or the sponsorship ends** with a paid raffle outstanding: the raffle goes on hold for a board decision (new date or refund). Nothing is refunded or deleted automatically.

## Entry, consent and sharing

- **Fields:** a name or nickname, an email, the rules box. Shipping details come later, from the winner only, if the prize needs them.
- **One entry per email per raffle**, checked on the server, with rate limits. A QR link alone does not prove someone attended.
- **Email confirmation:** the entry counts at once. A sharing choice counts only after the entrant opens the confirmation link, so nobody can opt in someone else's address.
- **The opt-in box** is unticked, names the sponsor and the purpose, and links the sponsor's privacy notice. It is separate from the rules, newsletters and prize delivery. A new sponsor or a new purpose needs a new choice.
- **Withdrawal** works from a signed link in the confirmation email, without an account. It stops any later share.
- **A share** is the intersection of rows the board selects with rows whose consent is valid at that moment. The board can narrow it and never widen it. The board previews the exact rows and fields, then releases it to one approved sponsor contact, in the sponsor account, for a limited time. Consent is checked again when the sponsor opens it. Each release is logged with recipient, purpose, fields, entry ids and time.
- **Downloaded copies cannot be recalled.** The recipient policy and the agreement say what the sponsor must delete or suppress after a withdrawal.
- **Slack and the organisers' bot** get counts only. Entrant names, emails and consent records never reach Slack or `apps/web/src/server/sponsor-agent.ts`.

## Two shapes, and the choice

**Shape A: add-ons inside the sponsorship store.** Add a `sponsor_addons` table and methods to `SponsorStore`. Reuse the sponsor row's payment link fields with an `addonId` in the metadata, and handle raffle payments inside `sponsor-webhook.ts`. Entries and consent live in the same package.

- For: one store, one webhook part, fewer files.
- Against: the sponsor row holds one payment link, so a raffle link and a bundle link fight over it. The webhook's payment-link lookup would have to tell them apart in every branch. Entrant data would sit behind the same store the organisers' bot reads.

**Shape B (chosen): a raffle package beside sponsorship, and quotes inside sponsorship.** Proposed file names are in plain text because they do not exist yet.

- A new fees module in `packages/sponsorship/src` (fees.ts): pure quote arithmetic and types. A `payment_quotes` table that both sponsorship offers and raffle offers reference, owned by the sponsorship store.
- `packages/sponsorship`: coverage. `sponsor_meetups` becomes the coverage record for every billing cycle, with `confirmed_at` and `confirmed_by`. `setMeetups` is replaced by add and remove, and past rows are kept.
- A new package, packages/raffle (`@zurichjs/raffle`): types, the two state machines, the draw, the consent rules, and its store (memory and Postgres) for raffles, funding, entries, consents, draws and shares. It references `sponsors.id`, and has no import from the organisers' bot.
- New server modules beside the sponsor ones in `apps/web/src/server` (raffle-route.ts, raffle-stripe.ts, raffle-webhook.ts): routes, Stripe calls with `source: zurichjs.com/partners/raffle`, and a raffle part added to `dispatchStripeEvent` in `apps/web/src/server/stripe-webhook.ts`. The sponsorship part skips that source, and raffle links are looked up only in the raffle store.
- For: each piece of state has one owner. A raffle payment cannot reach sponsorship activation. Entrant data has its own access path and its own retention. The fee quote is written once and used by both kinds of offer.
- Against: one more package, one more webhook part and more tables. That cost is small next to the risk of mixing money and personal data in one store.

## Proposed endpoints

| Route                                                              | For                                                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `/api/sponsorship/me`                                              | adds confirmed coverage and raffle summaries (counts, no entrant data)             |
| `/api/sponsorship/raffles`                                         | the sponsor proposes a raffle (meetup, prize, budget); eligibility checked         |
| `/api/sponsorship/raffles/[id]`, `.../approve`                     | the frozen offer and quote; approving opens the payment for that quote             |
| `/api/sponsorship/raffles/[id]/share`                              | the released share, with consent checked again on each read                        |
| `/api/membership/admin/sponsors/[id]/coverage`                     | the board confirms or removes covered meetups                                      |
| `/api/membership/admin/raffles/*`                                  | offer and fee choice, prize ready, open, close, draw, redraw, fulfilment, share    |
| `/api/membership/admin/fees`                                       | tariff versions and the surcharge policy approval (the fee gate)                   |
| `/api/raffle/entries`, `/api/raffle/confirm`, `/api/raffle/manage` | public entry, email confirmation, and the signed link to change the sharing choice |

The public entry page is a new, noindex route. Every write keeps the site's `Origin` check.

## Delivery, by relative size

Relative sizes, not dates. Each step is its own PR, in this order, because later steps use earlier ones.

| Step | Scope                                                                                                           | Size            |
| ---- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| 1    | Coverage for every cycle, board confirmation, the dashboard section, loading and error states                   | small to medium |
| 2    | Fee quotes and the fee gate, on sponsorship offers, payment links and subscriptions                             | medium to large |
| 3    | Raffle add-on: eligibility, proposal, offer with a quote, payment, its webhook part, receipt, late-payment flag | medium to large |
| 4    | Entry form, email confirmation, abuse limits, the draw, claim codes, fulfilment                                 | medium to large |
| 5    | Consent, withdrawal, the sharing gate, preview and release, retention jobs                                      | large           |

## Requirements and acceptance

- The dashboard lists confirmed meetups with title, Zurich date, state from the event (upcoming, past, cancelled) and its raffle. Billing failing to load never hides the meetups. Every status has text, not only colour.
- No raffle can be created, offered, linked or paid for a sponsor outside the eligibility rule, enforced on the server. Tests cover each sponsorship status.
- A raffle payment never changes a sponsorship's status, tier, meetups or payment link. A test sends a raffle `checkout.session.completed` through `dispatchStripeEvent` and checks the sponsor row is unchanged.
- Quotes: tests cover both fee choices, rounding at minor units, a tampered client total, a stale link after a new quote, a duplicate webhook, a renewal and a prorated upgrade. Totals on the offer, the payment page and the Stripe line items match.
- "Sponsor covers the fees" is refused without a configured tariff and an approved policy. Sharing is refused without its gate.
- The draw: a second call returns the same result, entries are frozen, and the audit row is written. Entries without the opt-in are in the draw.
- A share contains only rows with valid consent at the time of reading. A withdrawal before access removes the row. One sponsor can never read another sponsor's share.
- Stripe calls run against `tools/mock-stripe.mjs` in tests. No live Stripe object is created.
- The concept screens' copy is the starting point. Every screen works at 390 and 1440 px within the [UI rules](/systems/design-system/ui-rules.md).

## Affected concepts

- [Sponsorship](/domains/sponsorship/overview.md): coverage, the add-on, eligibility and fees
- [Sponsorship frontend](/domains/sponsorship/frontend.md): the account dashboard, the admin raffle screens, the entry page
- [Sponsorship payments and API](/domains/sponsorship/api.md): endpoints, quotes, Stripe objects
- [Stripe](/systems/stripe.md): a new `source` and a new part of the shared webhook

## Open decisions (owner)

- **Money:** who absorbs underspend, overspend and shipping; whether and when a surcharge is refunded; accounting with the treasurer; VAT.
- **Tariff and surcharge policy:** the rates per payment method, and whether a surcharge is allowed for each method under Swiss rules and the card and Stripe terms.
- **Eligibility beyond the default:** whether every tier can buy a raffle, and whether a paid raffle goes ahead after its sponsorship ends.
- **Host meetups:** which meetups can host a raffle, and whether one meetup can have more than one.
- **Legal text:** the raffle rules, the raffle notice, the retention period, the recipient policy, a data-use agreement with sponsors, and transfers to sponsors outside Switzerland.
- **The agreement:** a new version that allows ZurichJS-run raffles and contact sharing.
- **Presence:** whether the winner must be at the meetup, and the redraw timing.
