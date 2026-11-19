---
type: API
title: Membership payments and API
description: The membership endpoints, the Stripe objects and webhook lifecycle, the dashboard settings, and the owner's one-time setup for the database, Stripe, email and Slack.
tags: [membership, stripe, api, webhook]
timestamp: '2026-11-19T00:00:00Z'
---

# Membership payments and API

All routes are Astro endpoints with `prerender = false` under `apps/web/src/pages/api`, running in the site's server function on Netlify. Business rules are in [Membership](/domains/membership/overview.md).

## Endpoints

| Route                                                   | For                                                                                                                                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/auth/[...all]`                                    | Better Auth: the sign-in link and session                                                                                                                                                     |
| `/api/membership/me`                                    | the signed-in member's record                                                                                                                                                                 |
| `/api/membership/checkout`                              | starts Stripe Checkout (subscription) for joining or switching to automatic payment                                                                                                           |
| `/api/membership/plan`                                  | a level or cycle change from the next renewal, or taking it back                                                                                                                              |
| `/api/membership/portal`                                | a Stripe billing portal session, created server side with the members' portal configuration                                                                                                   |
| `/api/membership/resign`, `/api/membership/resign/undo` | resigning (with optional reasons) and resubscribing                                                                                                                                           |
| `/api/membership/certificates/[id]`                     | downloads one of the member's certificates                                                                                                                                                    |
| `/api/membership/webhook`                               | the old membership-only Stripe webhook, kept until production moves to the shared `/api/stripe/webhook` ([Stripe](/systems/stripe.md))                                                        |
| `/api/membership/admin/*`                               | the admin area's API: login, logout, session, members, one member, resign, confirm or undo a resignation, invite, import, CSV export ([Membership frontend](/domains/membership/frontend.md)) |
| `/api/verein-inquiry`                                   | the old request form endpoint, kept for anything that still posts to it; charges nothing                                                                                                      |

Admin writes must come from the site's own origin; every admin request is checked by the API, and the admin page itself holds no data.

## Stripe objects

`pnpm membership:stripe-setup` (`tools/membership-stripe-setup.ts`) creates them in the Stripe account of the key it is given. It is a dry run; `--apply` creates:

- **One product per level** ("ZurichJS membership: Basic Member" and "…: Supporter"). The billing portal allows one price per interval on a product, so one shared product could not offer the level switch.
- **Four recurring CHF prices** with lookup keys `member_<basic|supporter>_<quarterly|yearly>`, amounts from `apps/web/src/lib/membership.ts`. A test keeps the Stripe amounts equal to that table.
- **The billing portal configuration** without cancelling and without plan switching, which prints `STRIPE_MEMBER_PORTAL_CONFIG`. Run it again in each Stripe account after a change.
- **With `--webhook-url https://zurichjs.com/api/stripe/webhook`,** the site's one webhook endpoint, for memberships, sponsorships and donations, with the six events below, on the API version the site pins. It prints the signing secret once: that is `STRIPE_WEBHOOK_SECRET` ([Stripe](/systems/stripe.md)).

Test mode first. Running it with the live key is a production change for the owner. Test and live are separate endpoints with separate secrets: scope the live `STRIPE_SECRET_KEY`, `STRIPE_MEMBER_PORTAL_CONFIG` and `STRIPE_WEBHOOK_SECRET` to the production context in Netlify, and the test ones to deploy previews.

## Webhook lifecycle

Membership events arrive on the site's one webhook, `/api/stripe/webhook`, which verifies Stripe's signature and passes them to `processMembershipEvent` in `apps/web/src/pages/api/membership/webhook.ts` ([Stripe](/systems/stripe.md)). It skips events that are not from a membership (by the `source` metadata), updates the membership database, and sends the emails, Slack notes and (on `invoice.paid`) the certificate before answering.

| Stripe event                      | What happens                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `checkout.session.completed`      | subscription linked; a member paying manually who switches to automatic payment becomes active (no charge until their paid period ends)                                                                      |
| `invoice.paid`                    | first payment and every renewal: active, paid until the period end, certificate emailed (welcome or renewal), Slack note                                                                                     |
| `invoice.payment_failed`          | declined renewal: active → past due; email with Stripe's payment page and the next retry date (one per attempt); Slack note                                                                                  |
| `invoice.payment_action_required` | the bank wants the member to confirm (3D Secure): the same, worded "confirm the payment"                                                                                                                     |
| `customer.subscription.updated`   | a scheduled level or cycle switch took effect at the renewal (`invoice.paid` also reads it, so the certificate shows the new level); Stripe reporting `past_due` or `unpaid` marks an active member past due |
| `customer.subscription.deleted`   | ended: resigned (the board confirmed) or lapsed (the retries ran out)                                                                                                                                        |

- **Safe to receive twice:** handled events are skipped, status changes are compare-and-set, there is one certificate per invoice, and emails have idempotency keys. A failure answers 500 and Stripe retries for up to three days.
- People still in Checkout get no failed-payment email (Checkout shows the error). Disputes and refunds are not handled by the site; Stripe emails the account owner.
- **Duration, deploy-preview testing and the move off the old endpoint:** [Stripe](/systems/stripe.md).

## Stripe dashboard settings

Billing › Revenue recovery, once per account: Smart Retries on; when all retries fail, **cancel the subscription** (that sends `customer.subscription.deleted`, so the membership lapses); Stripe's own failed-payment and 3D Secure customer emails off, since the site sends them. Keep receipts and invoices on: they are the payment record.

## Setup (owner, once)

1. **Database (Neon, project `tiny-firefly-25104662`):** the default branch is production; create a second branch named `preview`. In Netlify set `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) per deploy context: the production branch for production, the `preview` branch for deploy previews. Add the GitHub secret `NEON_PREVIEW_DATABASE_URL` (the preview branch's direct connection) so closed PRs' databases are dropped.
2. **Stripe:** run the setup script above in test mode, set the dashboard settings, test on a deploy preview, then repeat with the live key.
3. **Signature:** `NETLIFY_AUTH_TOKEN=… pnpm membership:signature signature.png` (black ink on transparent). Never commit it.
4. **Resend:** the sender is `MEMBERSHIP_FROM` (default `ZurichJS <hello@zurichjs.com>`); the domain must be verified in Resend.
5. **Slack:** invite @ZurichJS Bot to the membership channel.
6. **Environment variables:** the membership block in [Environment variables](/systems/operations/environment.md), including `BETTER_AUTH_SECRET` and `ADMIN_PASSWORD`.

### Not verified

Which of these steps are done on production could not be checked from the repository.

## Related concepts

- [Membership](/domains/membership/overview.md), [Membership frontend](/domains/membership/frontend.md)
- [Stripe](/systems/stripe.md) (the shared webhook), [Donations](/domains/donations/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md) (the other Stripe parts)
- [Environment variables](/systems/operations/environment.md), [Local development](/systems/local-development.md), [Troubleshooting](/systems/operations/troubleshooting.md)

# Related specs

None.
