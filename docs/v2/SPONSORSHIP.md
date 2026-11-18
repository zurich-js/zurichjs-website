# Sponsorship: self-serve sponsors

The same idea as Verein membership (`docs/v2/MEMBERSHIP.md`) for companies that sponsor ZurichJS: the board invites a company (or brings an existing sponsorship onto the site), a contact signs the sponsorship agreement and pays by card, and from then on the sponsor manages tier, billing, payment details, logo and colleagues themselves. Changes the board agrees with a sponsor in conversation are sent as a link that fills the change in, and only apply once the sponsor confirms them.

## Decisions (owner, 18th November 2026)

| Area                 | Choice                                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tiers                | The four on `/partners`: Community Supporter, Friend, Builder, Champion. Host stays a way to help, not a paid tier                                                                                                 |
| Billing              | Monthly, quarterly, yearly (renew automatically) or one-time for one or more meetups                                                                                                                               |
| Prices (CHF)         | Production's monthly, yearly (ten months) and one-time; **quarterly** new, round numbers about 7% under three months: Supporter 420, Friend 840, Builder 1’400, Champion 2’100                                     |
| One-time             | A sponsor starting on their own picks **one meetup**. The board can **bundle** several meetups at a **custom price per meetup**, pegged to a tier for the benefits (e.g. 3 meetups at CHF 500 each as Builder)     |
| Tier changes         | A higher tier on the same billing applies **now** and Stripe charges the prorated difference to the card; anything else (lower tier, other billing) applies **from the next renewal**; nothing refunded            |
| Payment              | **Card only** (Stripe Checkout, or a single-use Stripe payment link for a bundle with a contract on file). Invoices were removed (owner). A sponsorship paid by **bank transfer** is recorded by the board         |
| Agreement            | Signed once on the site by a named person with their role (the start); later changes and ends are confirmed with one tick under the same agreement. A **contract signed outside the site** can be attached instead |
| Changes by the board | A pre-filled link (`/partners/account?change=builder-yearly` or `?change=end`) emailed to the confirmed contacts; nothing changes until a contact confirms. The board can still end one outright (logged)          |
| Logos                | Uploaded and announced in Slack, no review step; an organiser puts it on the partner document in Sanity                                                                                                            |
| Board notices        | Slack only (no board emails)                                                                                                                                                                                       |

Assumed (not asked, change if wrong): no minimum term, so a sponsor can end at any time with effect at the end of the paid period; one email belongs to one sponsor.

## How it works

1. **Invite** (`/admin/sponsors` › Add a sponsor › Invite): company, contact, tier, billing (or meetups and a price per meetup for a bundle), optional message. A `pending` sponsorship is created and the contact gets an email listing the tier's benefits. **Import** instead records an existing sponsorship paid by bank transfer, `active` until a paid-until date; the contact gets a "your sponsorship is now online" email. Companies can also start on their own at `/partners/account` (pending ones they start are hidden from the Slack bot until they pay).
2. **Sign and pay** (`/partners/account`, same email sign-in as members): billing details, plan, and the agreement (name, role). Card opens Stripe Checkout; opening it again closes the earlier page, so it can never be paid twice. A sponsor with a contract on file skips signing. A bank-transfer sponsor moving to card is not charged before their paid period ends (`trial_end`).
3. **Active** with the first payment (webhook, at the tier Stripe actually charged), or when the board records a transfer. The welcome email goes out once, with the benefits; the board gets a Slack note with what to deliver.
4. **Self-serve:** change tier or billing, end (and take it back until the end), Stripe's portal for the card and receipts (no plan changes or cancelling there), company and billing details (synced to Stripe), logo upload (SVG, PNG or WebP, 2 MB; SVGs with scripts, external references or other tricks are refused), colleagues (primary, billing, other). A colleague added by someone else must sign in and accept before they see or receive anything.
5. **Bundles:** the board picks the meetups and the price per meetup, attaches the signed contract, and creates a payment link (one use, quantity = meetups, custom price on the tier's product). Paid, the meetups can still move; their number and price cannot.
6. **Ends:** at the end of the paid period (Stripe `cancel_at_period_end`, or the daily check for bank-transfer ones), after the last meetup (one-time), when Stripe gives up on payment (lapsed), or outright by the board (terminated, or withdrawn before it started). The daily check also closes unpaid one-time sponsorships whose meetup passed.

**Status rules** (`packages/sponsorship/src/state.ts`): `pending → active` (Stripe, board) · `active ⇄ past_due` (Stripe) · `active / past_due → ending` (sponsor, board) · `ending → active` (undo) · `ending → ended` (Stripe at period end, the daily check, board) · `active → ended` (completed, lapsed, terminated) · `pending → ended` (withdrawn, lapsed) · `ended → pending` (sponsor again). Every change is compare-and-set and written with its row in the append-only `sponsor_events`.

## Where things are

| Part      | Where                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain    | `packages/sponsorship`: tiers, fees and bundle labels, status machine, the store (memory and Postgres), agreement version                                                                                                          |
| Database  | `apps/web/database/migrations/20261118090000_sponsorship.sql` and `20261119090000_sponsorship_round2.sql` (same Neon database as memberships): sponsors, meetups, contacts, agreements, logos, documents, events, Stripe event ids |
| Files     | Netlify Blobs store `sponsors`: logos and contracts (PDF, 10 MB)                                                                                                                                                                   |
| Stripe    | `apps/web/src/server/sponsor-stripe.ts`; prices by lookup key `sponsor_<tier>_<cycle>`; bundles use `price_data` or a custom price; `pnpm sponsorship:stripe-setup`                                                                |
| Lifecycle | `apps/web/src/server/sponsor-lifecycle.ts` (start, change, end, undo, suggest, record payment, bundles, board end); emails and Slack in `server/sponsor.ts`                                                                        |
| Portal    | `/partners/account` (`SponsorAccount.tsx`), API `/api/sponsorship/*`, agreement `/partners/agreement`                                                                                                                              |
| Admin     | `/admin/sponsors` (`SponsorsAdmin.tsx`), API `/api/membership/admin/sponsors/*` (under the admin cookie's path; same `ADMIN_PASSWORD`); "Needs you" lists what needs the board                                                     |
| Webhook   | the site's one Stripe webhook, `/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET`), shared with memberships and donations; its own idempotency table (`apps/web/src/server/sponsor-webhook.ts`)                                        |
| Emails    | `packages/emails/src/sponsors.ts`: invite, agreement copy, welcome, payment problem, change to confirm, change, ending, resumed, ended, payment recorded. Every email names the tier's benefits                                    |
| Slack     | notes in `SLACK_SPONSORSHIP_CHANNEL_ID` (else the membership channel); the bot reads sponsors (`server/sponsor-agent.ts`, read only, company-level facts, names marked as data)                                                    |
| Daily     | `netlify/functions/sponsorship-daily.mts` (07:15 UTC): completes one-time sponsorships, closes unpaid ones whose meetup passed, ends agreed bank-transfer ones, reminds 30/7/0 days before they run out                            |
| Tests     | `packages/sponsorship/test` (with a real Postgres), `apps/web/test/sponsorship-flow.test.ts`, `sponsorship-fees.test.ts`, `packages/emails/test`                                                                                   |

**Writes** to `/api/sponsorship/*` must come from the site (`Origin` check); uploads and contact changes are rate limited.

**Stripe webhook events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated`, `customer.subscription.deleted`. Only `subscription_create` and `subscription_cycle` invoices move the paid-through date; a proration invoice does not. A second live subscription for the same sponsor (an old Checkout tab) is cancelled and flagged in Slack. Turn Stripe's failed-payment and 3D Secure emails off as for memberships, since the site sends them. Revenue recovery: when all retries fail, cancel the subscription (that ends the sponsorship as lapsed).

**Billing portal and webhook secret:** the portal reuses the membership configuration (`STRIPE_MEMBER_PORTAL_CONFIG`) unless `STRIPE_SPONSOR_PORTAL_CONFIG` is set. The webhook is its own Stripe endpoint, so it has its own signing secret.

**Site listing:** a running sponsor does not appear on `/partners` by itself. When a logo is uploaded, Slack says so: an organiser updates (or creates) the partner document in Sanity with the tier and logo, ticks current, and publishes (drafts first, AGENTS.md).

## Open (owner)

- **VAT:** the site and receipts say nothing about VAT. If the association is or becomes VAT registered, the prices and the Stripe tax settings change.
- **Privacy policy:** it should name sponsor contacts (names, emails, roles) and contracts as data we keep (legal page, owner).
- **`/partners` copy:** the page still shows monthly, yearly and one-time only. Adding the quarterly price and a "Sponsor online" or "Already a sponsor? Sign in" link is a public copy change for the owner.
- **Host tier:** "covering speaker travel qualifies you as Community Friend" is not modelled; the board can import such a sponsorship as Friend, paid by bank transfer.
- **Live Stripe objects:** `pnpm sponsorship:stripe-setup` with the live key (production change).
- **Invoices:** removed for now. Bringing them back needs reconciliation for bank transfers against Stripe invoices.
