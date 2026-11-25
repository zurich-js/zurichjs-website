---
type: Domain
title: Sponsorship
description: Self-serve paid sponsorships: tiers and fees, billing and one-time bundles, the agreement, tier changes, the status machine, how sponsorships start and end, and how a running sponsorship sets a sponsor's tier on the public site.
tags: [sponsorship, stripe, postgres]
timestamp: "2026-11-24T00:00:00Z"
---

# Sponsorship

Source: `packages/sponsorship` (`@zurichjs/sponsorship`: tiers, fees and bundle labels, the status machine, the store in memory and Postgres, the agreement version), `apps/web/src/server/sponsor-*.ts`, `apps/web/src/server/sponsor.ts`, `apps/web/src/server/sponsor-public.ts` and `packages/content/src/sponsorships.ts` (the public site), `packages/emails/src/sponsors.ts`, and the migrations `apps/web/database/migrations/20261118090000_sponsorship.sql`, `apps/web/database/migrations/20261119090000_sponsorship_round2.sql` and `apps/web/database/migrations/20261124080000_sponsor_payment_link_attempts.sql`.

Sponsors get the same self-serve system as [members](/domains/membership/overview.md): the board invites a company or brings an existing sponsorship onto the site, a contact signs the sponsorship agreement and pays by card, and from then on the sponsor manages tier, billing, payment details, logo and colleagues themselves. Changes the board agrees with a sponsor in conversation are sent as a link that fills the change in, and apply only once the sponsor confirms (owner, 18th November 2026).

**This page owns paid sponsorships.** The public side (who is listed and thanked, the `/partners` page, the enquiry form) is in [Partners and sponsorship](/domains/partners/overview.md). A running sponsorship decides who is shown as a current sponsor and at which tier ("On the public site" below); the logo, hover colour and link still come from the partner record. Slack says when a sponsor uploads a logo; an uploaded logo is not shown on the site by itself.

## Decisions (owner, 18th November 2026)

| Area                 | Choice                                                                                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiers                | The four on `/partners`: Community Supporter, Friend, Builder, Champion. Host stays a way to help, not a paid tier                                                                                        |
| Billing              | Monthly, quarterly, yearly (renew automatically) or one-time for one or more meetups                                                                                                                      |
| One-time             | A sponsor starting on their own picks one meetup. The board can bundle several meetups at a custom price per meetup, pegged to a tier for the benefits (for example 3 meetups at CHF 500 each as Builder) |
| Tier changes         | A higher tier on the same billing applies now, and Stripe charges the prorated difference to the card; anything else (lower tier, other billing) applies from the next renewal; nothing is refunded       |
| Payment              | Card only (Stripe Checkout, or a single-use Stripe payment link for a bundle with a contract on file). Invoices were removed. A sponsorship paid by bank transfer is recorded by the board                |
| Agreement            | Signed once on the site by a named person with their role; later changes and ends are confirmed with one tick under the same agreement. A contract signed outside the site can be attached instead        |
| Changes by the board | A pre-filled link (`/partners/account?change=builder-yearly` or `?change=end`) emailed to the confirmed contacts; nothing changes until a contact confirms. The board can still end one outright (logged) |
| Logos                | Uploaded and announced in Slack, with no review step                                                                                                                                                      |
| Board notices        | Slack only, no board emails                                                                                                                                                                               |

Assumed, not asked (change if wrong): no minimum term, so a sponsor can end at any time with effect at the end of the paid period; one email belongs to one sponsor.

## Tiers and fees

`packages/sponsorship/src/tiers.ts` is the source for the portal, the admin area, Stripe and the emails. `/partners` shows the same monthly, yearly and one-time prices from its own copy in `packages/content/src/partners.ts` ([Partners](/domains/partners/overview.md)); `apps/web/test/sponsorship-fees.test.ts` keeps the two equal. Yearly is ten months ("2 months free"); quarterly is new (owner, 18th November 2026), round numbers about 7% under three months.

| Tier                | Monthly | Quarterly | Yearly    | One meetup |
| ------------------- | ------- | --------- | --------- | ---------- |
| Community Supporter | CHF 150 | CHF 420   | CHF 1’500 | CHF 250    |
| Community Friend    | CHF 300 | CHF 840   | CHF 3’000 | CHF 400    |
| Community Builder   | CHF 500 | CHF 1’400 | CHF 5’000 | CHF 700    |
| Community Champion  | CHF 750 | CHF 2’100 | CHF 7’500 | CHF 1’000  |

Stripe prices use lookup keys `sponsor_<tier>_<monthly|quarterly|yearly|once>`. A bundle uses the board's custom price per meetup on the tier's product.

## How a sponsorship runs

1. **Invite:** in the admin area, the board enters company, contact, tier and billing (or meetups and a price per meetup for a bundle). A `pending` sponsorship is created and the contact gets an email listing the tier's benefits. **Import** instead records an existing sponsorship paid by bank transfer, `active` until a paid-until date; the contact gets a "your sponsorship is now online" email. The sponsor, its contact, its meetups and its starting status are saved in one write, so a failure leaves nothing behind and the same form can be sent again; a failed email after that is reported as "no email sent", not as an error. Inviting an email that a colleague added to another sponsorship and nobody accepted moves that contact to the new sponsor. Companies can also start on their own at `/partners/account`; pending ones they start are hidden from the Slack bot until they pay.
2. **Sign and pay** on `/partners/account`, with the same email sign-in as members: billing details, plan, and the agreement (name, role). Card opens Stripe Checkout; opening it again closes the earlier page, so it can never be paid twice. A sponsor with a contract on file for the current offer skips signing. A bank-transfer sponsor moving to card is not charged before their paid period ends (`trial_end`).
3. **Active** with the first payment (from the webhook, at the tier Stripe actually charged), or when the board records a transfer. The welcome email goes out once, with the benefits; the board gets a Slack note with what to deliver.
4. **Self-serve** ([Sponsorship frontend](/domains/sponsorship/frontend.md)): tier and billing changes, ending and taking it back, the Stripe portal, details, logo, colleagues.
5. **Bundles:** the board picks the meetups and the price per meetup, attaches the signed contract, and creates a single-use payment link (quantity = meetups, the custom price on the tier's product). A link is refused while a meetup of the bundle is over. Once paid, the meetups can still move; their number and price cannot.
6. **Ends:** at the end of the paid period (Stripe `cancel_at_period_end`, or the daily check for bank-transfer ones), after the last meetup (one-time), when Stripe gives up on payment (lapsed), or outright by the board (terminated, or withdrawn before it started). The daily check also closes unpaid one-time sponsorships whose meetup has passed.

## Status machine

`packages/sponsorship/src/state.ts` lists the allowed changes and who may make each (the sponsor, the board, Stripe, the daily script). Every change is compare-and-set and written with its row in the append-only `sponsor_events`.

| From                 | To                   | By                                        |
| -------------------- | -------------------- | ----------------------------------------- |
| `pending`            | `active`             | Stripe, the board                         |
| `pending`            | `ended`              | the board, Stripe, the script             |
| `active`             | `past_due`           | Stripe                                    |
| `past_due`           | `active`             | Stripe, the board                         |
| `active`, `past_due` | `ending`             | the sponsor, the board                    |
| `ending`             | `active`, `past_due` | the sponsor, the board (undo)             |
| `ending`             | `ended`              | the board, Stripe, the script             |
| `active`             | `ended`              | the board, Stripe, the script             |
| `past_due`           | `ended`              | the board, Stripe                         |
| `ended`              | `pending`            | the sponsor, the board (sponsoring again) |

**Sponsoring again** (`ended` to `pending`) is a new offer. Everything is checked before the ended record changes, so a refused attempt (no signature, no Stripe price) leaves it as it was. The sponsor signs the agreement again in full: an agreement signed, or a contract attached, before the sponsorship started again covered other terms, so neither counts for the new one (`offerCover` in `sponsor-lifecycle.ts`). The agreement text is unchanged. A sponsorship the board **terminated** cannot be started again by the sponsor alone: the page asks them to write to hello@zurichjs.com, and only the board can start it again, after a review. Stripe's "subscription deleted" for a subscription the sponsorship no longer holds changes nothing.

**Ending reasons:** the board may give cancelled, completed, lapsed, terminated or withdrawn; Stripe cancelled or lapsed; the script cancelled, completed or withdrawn. A sponsorship is **running** (gets the tier's benefits) while `active`, `past_due` or `ending`.

## On the public site

The sponsorships database overrides the partner list for who is a current sponsor and at which tier (owner, 19th November 2026). Nothing else: the logo, hover colour, link and words stay the partner record's ([Partners and sponsorship](/domains/partners/overview.md)).

- **The link is the sponsor's partner id** (`sponsors.partner_id`, "Partner id" under Edit details in `/admin/sponsors`): the `id` of the partner record, for example `gyff`. Names are never used to link.
- **Running** (`active`, `past_due` or `ending`) and linked: that partner is a current sponsor at the sponsorship's tier, whatever the partner record says. With several running sponsorships on one partner the highest tier counts.
- **Ended** and linked, with none running: the partner becomes a past sponsor without a tier. A partner who is also a host or another kind keeps its own current flag and only loses the tier.
- **Running without a partner record** (no partner id, or one that matches nothing): listed as a current sponsor at its tier by company name and website, without a logo. If the company name equals a partner record's, nothing is added (so no company is listed twice) and the build log says to set the partner id.
- **Pending** sponsorships, and partners no sponsorship is linked to, change nothing. A partner withdrawn from promotion is never brought back.
- **One-time** (a sponsor of one or more meetups, running only through one-time sponsorships): current for its paid term like any other (until the day after its last meetup, when the daily check ends it), but thanked on the meetups it sponsors rather than as a season sponsor: those events list it as a sponsor, and other upcoming events leave it out of "this season". The partner carries the meetups as `coverage`: the meetups it covers now (a meetup taken off it, kept as history with `removed_at` once covered meetups (#98) are in, is not one). A recurring sponsorship next to it makes it a season sponsor. How long a one-time sponsor stays listed beyond its meetups is an open owner question.

**Where it is read:** at build time. `apps/web/src/lib/content.ts` hands `loadContent` the reader `publicSponsorships` (one short-lived connection, the same database URL as the functions), and `applySponsorships` applies the rows to the partners from Sanity or from the code-side record. The build never fails because of it:

| Build                                                    | What it shows                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Production                                               | the production database's sponsorships                                                         |
| Deploy preview                                           | its own database `pr_<number>`, which starts empty: the partner list alone                     |
| Local with `MEMBERSHIP_DB_URL` (`pnpm local`)            | the local database's sponsorships, when content comes from Sanity                              |
| No database URL                                          | the partner list alone                                                                         |
| The database is unreachable or silent for 15 seconds     | the partner list alone, with a warning in the build log                                        |
| Sample content (`CONTENT_SOURCE=sample`: tests, e2e, CI) | the partner list alone; the database is never read, so the visual baselines never depend on it |

**Rebuilds:** the store every writer uses is wrapped (`apps/web/src/server/sponsor-rebuild.ts`), so a sponsorship that starts, ends, changes tier, or has its partner id, company name or website changed queues a rebuild, as does moving the meetups a running one-time sponsorship covers (they decide which event pages thank it), debounced like a Sanity publish ([Rebuilds](/systems/operations/rebuilds.md)). The site follows a few minutes later.

**Moving a sponsor to another tier on the site** is therefore board work in `/admin/sponsors`, not a code change: the sponsorship has to be running at that tier, and its partner id has to be set ([Sponsorship frontend](/domains/sponsorship/frontend.md)).

**Notes to the board** follow this: a new sponsor's note asks for the Partner id when it is missing, ended and tier-change notes say the site follows at the next build, and a logo note asks to add the logo to the partner record only once the sponsorship runs. No note asks for a Sanity edit to list or unlist a sponsor (a first `partner` document in Sanity replaces the whole code-side list, [Partners](/domains/partners/overview.md)).

## Data and files

The same Neon database as memberships ([Membership](/domains/membership/overview.md)): sponsors, meetups, contacts, agreements, logos, documents, events handled Stripe event ids, and the notices (emails and Slack notes) still to send. Logos and contracts (PDF, up to 10 MB) are in the Netlify Blobs store `sponsors`.

## Emails and Slack

- **Emails** (`packages/emails/src/sponsors.ts`, sent with Resend): invite, agreement copy, welcome, payment problem, change to confirm, change, ending, resumed, ended, payment recorded. Every email names the tier's benefits.
- **Invitations again:** each click on "Email the invitation again" sends one email (the click's id is the idempotency key, so a double click sends once). A running sponsorship gets access to its page instead ("You can now manage …"). A colleague added by another contact and not accepted gets nothing (409). The last confirmed primary contact cannot be removed, by the board or by a colleague, since payment emails go to the primary without a billing contact: a primary contact who has not accepted an invitation does not count. The store checks and removes in one step, so two removals at once cannot both pass. A recorded bank transfer says who gets the confirmation.
- **Notices:** every email and Slack note a change owes is a notice in `sponsor_notices`, written in the same write as the change, keyed so it exists once: a status change with its notices, an agreement with its signed copy, the mark that a bank transfer is recorded (`payment_recorded`) with its receipt and note, and "payment overdue" with its email and note. The request that made the change sends it; anything it could not send (a timeout, Resend or Slack down, a function stopped by the platform) stays queued and the daily check sends it. A note or email that says Stripe stopped (the board's end) waits until nothing is left open in Stripe. A sender claims a notice before sending, so two senders at once never send it twice. Delivery is at least once: a notice Resend or Slack accepted is recorded as sent, and when that write fails twice the claim is kept, so nobody sends it again for five minutes; if the database still cannot record it, it is sent again after that. Resend drops a repeat email within 24 hours (the same idempotency key); Slack has no such key and shows the note twice. An email is rendered when it is sent, from the sponsorship as it is then. So a saved change always gets its email and note, a retried request or a second delivery of a Stripe event adds nothing, and the same renewal delivered twice at once posts one note.
- **Slack:** notes in `SLACK_SPONSORSHIP_CHANNEL_ID`, else the membership channel, else the agent's. The organisers' bot can answer questions about sponsors (`apps/web/src/server/sponsor-agent.ts`: read only, company-level facts, names marked as data) ([Slack content agent](/systems/slack-agent.md)).

## Payment pages are closed before they are forgotten

A sponsor has at most one payable Stripe page: one Checkout session or one payment link. Every change that replaces or ends one (a new Checkout, a new link, an invited plan or bundle that changes, a recorded bank transfer, any end) switches the old page off in Stripe first, and forgets its id only once Stripe confirms, or answers that the page is already gone (no such page, or no longer open). Any other Stripe failure fails the request before the change is saved, or, for an end that was already saved, keeps the id: the same request again finishes the job (the board's end cancels the subscription, then emails and posts as the first try would have), and the daily check closes what an ended sponsorship still has open. Two payment links created at the same moment keep the first; the second is switched off and answered with 409.

**Payment links.** A payment link is recorded before Stripe is asked for it (`sponsor_payment_link_attempts`): the exact request, sent with the attempt's key as Stripe's idempotency key. The link becomes the sponsor's in the same write that marks the attempt kept, and only while the sponsorship is unpaid and no other link is saved. Any other attempt is switched off: by the request itself, by the board's next payment link request for that sponsor, or by the daily check, whatever the sponsorship's status. Recovery uses the database clock and replays the original request only when more than 30 seconds remain in Stripe's 24-hour retention window. Each sweep starts with the least recently attempted rows. After that it reads Stripe's payment-link creation events and matches the attempt metadata or original request key. An unavailable event or a failed lookup leaves the attempt pending and blocks a replacement. If the event has expired, the board can identify the original link in Stripe by its attempt metadata and supply that verified ID to `claimLinkCleanup` before running recovery. A daily check running while the board creates a link can switch that new link off; the board then sees the 409 and creates another.

Submitting the same bank transfer again acknowledges the saved payment when the date, amount and reference match. A different transfer for that date needs the board to check the history. The receipt and Slack notice remain queued with the payment record.

Recurring Checkout includes the offer identifier in subscription metadata. An invoice can change the plan, bind the subscription and queue a welcome only after the store checks the offer and subscription under the sponsor row lock. For older subscriptions the audit history identifies IDs from previous offers. Termination confirmations wait for all recorded Stripe objects and outstanding link attempts to close.

## The daily check

`apps/web/netlify/functions/sponsorship-daily.mts`, at 07:15 UTC (`apps/web/src/server/sponsor-daily.ts`), in Zurich days:

- a one-time sponsorship ends (completed) the day after its last meetup, and the sponsor is thanked
- an unpaid one-time sponsorship is closed (withdrawn) once one of its meetups has passed, and its payment page is switched off
- a bank-transfer sponsorship that was agreed to end ends on its last day
- the board is reminded in Slack 30 and 7 days before, and on the day, a bank-transfer sponsorship runs out; nothing changes by itself, a person records the payment or agrees the end. A day the check did not reach is caught up: the most urgent reminder not sent yet goes out once (five days left after a missed 30-day reminder sends the 7-day one), never one per missed day
- every notice still queued is sent; given a time budget (`deadline`), it stops early and leaves the rest for the next run
- an ended sponsorship that still points at a Stripe subscription, Checkout session or payment link (a close that failed) is closed again; a Stripe failure is retried the next day and never stops the other sponsors
- a payment link attempt that was not kept (see Payment links) is switched off, for pending and running sponsorships too

Card sponsorships need nothing here: Stripe renews, retries and ends them through the webhook.

Netlify stops scheduled functions after 30 seconds, so every outbound call shares a 25 s budget (`apps/web/src/server/deadline.ts`). The check first does what it can decide from the sponsorship alone (endings, reminders, Stripe an ended sponsorship left open), then reads the meetups of unpaid one-time sponsorships, starting at a different one each day so slow reads cannot hold back the same ones every day, then sends queued notices while at least 16 s is left. It starts no sponsorship's work once less than 8 s is left, also after a meetup read, and logs the ones it did not reach as deferred. The next run decides them again from the saved rows, so a deferred reminder is caught up by the rule above. When the budget or Stripe stops the close of a sponsorship it has ended, the ids are kept, the log line names it (`stripeOpen`) and the next run closes it again. The email and note of an end are queued with the end, so a run stopped after it still sends them later.

### Not verified

The schedule is set only in the function's source (`export const config`). `apps/web/netlify.toml` repeats the other scheduled functions' schedules because Netlify may not read the config from a bundled file ([Web app](/systems/web.md)), but not this one. Whether the daily check runs on Netlify was not checked.

## Stripe events out of order, retries, refunds and disputes

- **First payment:** a retry after a failure half-way sends the welcome and the board's "New sponsor" note once (they are notices written with the activation, keyed by the payment that activates it), never a renewal note. Sponsoring again after an end is a new offer: its first payment gets its own welcome.
- **One-time:** the payment link is switched off by the retry if Stripe failed the first time. The invoice of the same payment changes nothing; a second card payment for a one-time sponsorship that is already paid is flagged in Slack once.
- **Order:** every paid subscription invoice is logged (`invoice_paid`, with the event's time). A payment failure for an invoice already paid (`invoice_paid`, or the activation it made; never the "payment overdue" mark itself), a failure for a subscription the sponsorship no longer holds (it was started again since), or a "past due" older than the last payment, changes nothing. A failure and the payment of the same invoice handled at the same moment are decided one after the other on the sponsor's row (`paidInvoice`, `overdueInvoice`): the payment wins. Paying an overdue upgrade invoice ends "payment overdue" once Stripe has the subscription active again; only a new term moves the paid-through date.
- **Refunds and disputes** (`charge.refunded`, `charge.dispute.created`): logged on the sponsorship (`charge_refunded`, `charge_disputed`) and flagged in Slack, with the amount: the card payment (`amount`) and, for a dispute, the disputed amount (`disputed`), which can be less. History written before `disputed` existed shows the card payment's amount. Nothing changes on the site and no benefit is taken away: what a refund or dispute means for the sponsorship is the board's call until the owner sets a rule.

## Open questions (owner)

- **Refunds and disputes:** whether a refund or a lost dispute ends the sponsorship, or takes benefits away, is not decided; the site records and flags them only.
- **Terminated sponsors:** how the board reviews a request to sponsor again after a termination is not written down; the site only stops the sponsor from restarting alone.

- **VAT:** the site and receipts say nothing about VAT. If the association is or becomes VAT registered, the prices and the Stripe tax settings change.
- **Privacy policy:** it should name sponsor contacts (names, emails, roles) and contracts as data kept (a legal page, owner).
- **Host tier:** "covering speaker travel qualifies you as Community Friend" is not modelled; the board can import such a sponsorship as Friend, paid by bank transfer.
- **Invoices:** removed for now. Bringing them back needs reconciling bank transfers against Stripe invoices.
- **No minimum term** and one email per sponsor are assumptions to confirm.

## Related concepts

- [Sponsorship payments and API](/domains/sponsorship/api.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Partners and sponsorship](/domains/partners/overview.md) (the public list and `/partners`), [Membership](/domains/membership/overview.md) (sign-in, database and admin password are shared)
- Systems: [Stripe](/systems/stripe.md), [Web app](/systems/web.md), [Environment variables](/systems/operations/environment.md), [Slack content agent](/systems/slack-agent.md)

# Related specs

- [Online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md)
