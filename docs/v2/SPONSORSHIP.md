# Sponsorship: self-serve sponsors

The same idea as Verein membership (`docs/v2/MEMBERSHIP.md`) for companies that sponsor ZurichJS: the board invites a company (or brings an existing sponsorship onto the site), a contact signs the sponsorship agreement and pays, and from then on the sponsor manages tier, billing, payment details, logo and colleagues themselves. Changes the board agrees with a sponsor in conversation are proposed from the admin area and only apply once the sponsor confirms them.

## Decisions (owner, 18th November 2026)

| Area                 | Choice                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tiers                | The four on `/partners`: Community Supporter, Friend, Builder, Champion. Host stays a way to help, not a paid tier                                                                           |
| Billing              | Monthly, quarterly, yearly (renew automatically) or one meetup                                                                                                                               |
| Prices (CHF)         | Production's monthly, yearly (ten months) and one-time; **quarterly** new, round numbers about 7% under three months: Supporter 420, Friend 840, Builder 1’400, Champion 2’100               |
| One-time             | Covers **one meetup**, chosen from the upcoming published meetups; it ends the day after                                                                                                     |
| Tier changes         | A higher tier on the same billing applies **now** and Stripe invoices the prorated difference; anything else (lower tier, other billing) applies **from the next renewal**; nothing refunded |
| Payment              | **Card** (Stripe Checkout) **or invoice** (Stripe emails it, due in 30 days; bank transfer or card on Stripe's page). A sponsorship can also be paid directly to the association (manual)    |
| Agreement            | Accepted on the site by a named person with their role, for the start and for every change or end; each acceptance stores the version and a summary                                          |
| Changes by the board | Proposals (new plan, or an end), emailed to every contact; nothing changes until a contact accepts; they expire after 14 days. The board can still end one outright (logged)                 |

Assumed (not asked, change if wrong): no minimum term, so a sponsor can end at any time with effect at the end of the paid period; logos are reviewed by the board before they appear; one email belongs to one sponsor.

## How it works

1. **Invite** (`/admin/sponsors` › Add a sponsor › Invite): company, contact, tier, billing, optional message. A `pending` sponsorship is created and the contact gets an email. **Import** instead records an existing sponsorship paid directly, `active` until a paid-until date; the contact gets a "your sponsorship is now online" email. Companies can also start on their own at `/partners/account`.
2. **Sign and pay** (`/partners/account`, same email sign-in as members): billing details, tier and billing, card or invoice, and the agreement (name, role, tick). Card opens Stripe Checkout; invoice creates a Stripe subscription (or one invoice for one meetup) with `collection_method=send_invoice` and sends the first invoice. An imported sponsor moving to Stripe is not charged before their paid period ends (`trial_end`).
3. **Active** with the first payment (webhook), or when the board records a payment. Every contact gets the welcome email (asking for the logo if there is none); the board gets Slack and an email to hello@.
4. **Self-serve:** change tier or billing, end (and take it back until the end), Stripe's portal for payment methods and invoices (no plan changes or cancelling there), company and billing details (synced to Stripe), logo upload (SVG, PNG or WebP, 2 MB; SVGs with scripts or external references are refused), colleagues (primary, billing, other: billing contacts get payment emails).
5. **Proposals:** the board proposes a new plan or an end; the sponsor accepts (signing the agreement for it) or declines in the portal.
6. **Ends:** at the end of the paid period (Stripe `cancel_at_period_end`, or the daily check for directly paid ones), after the meetup (one-time), when Stripe gives up on payment (lapsed), or outright by the board (terminated, or withdrawn before it started).

**Status rules** (`packages/sponsorship/src/state.ts`): `pending → active` (Stripe, board) · `active ⇄ past_due` (Stripe; the board can mark one paid) · `active / past_due → ending` (sponsor, board) · `ending → active` (undo) · `ending → ended` (Stripe at period end, the daily check, board) · `active → ended` (completed one meetup, lapsed, terminated) · `pending → ended` (withdrawn) · `ended → pending` (sponsor again). Every change is compare-and-set and written with its row in the append-only `sponsor_events`.

## Where things are

| Part      | Where                                                                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain    | `packages/sponsorship`: tiers and fees, status machine, the store (memory and Postgres), agreement version                                                                    |
| Database  | `apps/web/database/migrations/20261118090000_sponsorship.sql` (same Neon database as memberships): sponsors, contacts, agreements, proposals, logos, events, Stripe event ids |
| Stripe    | `apps/web/src/server/sponsor-stripe.ts`; prices by lookup key `sponsor_<tier>_<cycle>`; `pnpm sponsorship:stripe-setup`                                                       |
| Lifecycle | `apps/web/src/server/sponsor-lifecycle.ts` (start, change, end, undo, proposals, board end); emails and Slack in `server/sponsor.ts`                                          |
| Portal    | `/partners/account` (`SponsorAccount.tsx`), API `/api/sponsorship/*`, agreement `/partners/agreement`                                                                         |
| Admin     | `/admin/sponsors` (`SponsorsAdmin.tsx`), API `/api/membership/admin/sponsors/*` (under the admin cookie's path; same `ADMIN_PASSWORD`)                                        |
| Webhook   | `/api/sponsorship/webhook` (`STRIPE_SPONSORSHIP_WEBHOOK_SECRET`), its own endpoint and idempotency table                                                                      |
| Emails    | `packages/emails/src/sponsors.ts`: invite, agreement copy, welcome, payment problem (declined, 3D Secure, overdue), proposal, change, ending, resumed, ended, logo review     |
| Slack     | notes in `SLACK_SPONSORSHIP_CHANNEL_ID` (else the membership channel); the bot reads sponsors (`server/sponsor-agent.ts`, read only, company-level facts)                     |
| Daily     | `netlify/functions/sponsorship-daily.mts` (07:15 UTC): completes one-meetup sponsorships, ends agreed directly paid ones, expires proposals, reminds 30/7/0 days before       |
| Tests     | `packages/sponsorship/test` (with a real Postgres), `apps/web/test/sponsorship-flow.test.ts`, `sponsorship-fees.test.ts`, `packages/emails/test`                              |

**Stripe webhook events:** `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `invoice.overdue`, `customer.subscription.updated`, `customer.subscription.deleted`. Stripe sends the invoices and receipts itself (keep "Email finalized invoices" and receipts on); turn its failed-payment and 3D Secure emails off for this account as for memberships, since the site sends them. Revenue recovery: when all retries fail, cancel the subscription (that ends the sponsorship as lapsed).

**Site listing:** a running sponsor does not appear on `/partners` by itself. When a logo is approved, Slack says so: an organiser updates (or creates) the partner document in Sanity with the tier and logo, ticks current, and publishes (drafts first, AGENTS.md). The sponsor's `partnerId` in the admin area links the two. Automating that draft is a follow-up.

## Open (owner)

- **Approve the agreement text** (`/partners/agreement`, noindex until approved). In particular: the refund rules (none for the current period on ending; unused part refunded when the board ends it, except for code of conduct breaches), moving or refunding a one-meetup sponsorship when we cancel the meetup, the logo licence, Swiss law and Zurich courts.
- **VAT:** the site and invoices say nothing about VAT. If the association is or becomes VAT registered, the prices and the Stripe tax settings change.
- **`/partners` copy:** the page still shows monthly, yearly and one-time only. Adding the quarterly price and a "Sponsor online" or "Already a sponsor? Sign in" link is a public copy change for the owner.
- **Host tier:** "covering speaker travel qualifies you as Community Friend" is not modelled; the board can import such a sponsorship as Friend, paid directly.
- **Live Stripe objects:** `pnpm sponsorship:stripe-setup` with the live key (production change).
