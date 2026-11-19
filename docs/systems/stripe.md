---
type: System
title: Stripe
description: How the site talks to Stripe for donations, memberships and sponsorships, the one shared webhook and how it routes events, the move off the old endpoints, and the settings every part shares.
tags: [stripe, payments, webhook]
timestamp: '2026-11-19T00:00:00Z'
---

# Stripe

Three parts of the site take payments through one Stripe account: [donations](/domains/donations/overview.md), [memberships](/domains/membership/api.md) and [sponsorships](/domains/sponsorship/api.md). This concept owns what they share.

## Calls

- **Plain `fetch`, no SDK:** `apps/web/src/server/stripe.ts` (form encoding, the `stripe()` helper, `verifyStripeSignature`). Each part has its own module on top: `apps/web/src/server/membership-stripe.ts`, `apps/web/src/server/sponsor-stripe.ts`, and the donation endpoints.
- **Every Checkout session and subscription carries a `source` in its metadata** (for example `zurichjs.com/donate`, `zurichjs.com/membership`), which is how events find their part.
- **`STRIPE_API_BASE`** points the calls at `tools/mock-stripe.mjs` for tests and e2e; it is ignored in production, so the secret key only goes to `api.stripe.com`. `pnpm local` uses Stripe's real test mode instead ([Local development](/systems/local-development.md)).

## The one webhook

`/api/stripe/webhook` (`apps/web/src/pages/api/stripe/webhook.ts`, logic in `apps/web/src/server/stripe-webhook.ts`): one endpoint in Stripe, one signing secret (`STRIPE_WEBHOOK_SECRET`), every event the site handles (`STRIPE_WEBHOOK_EVENTS`: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated`, `customer.subscription.deleted`).

- **Routing:** each part (memberships, sponsorships, donations) receives every event and skips the ones that are not its own, by the `source` metadata.
- **Order and retries:** memberships and sponsorships record the events they handled, so a retry after one of them failed (answered 500) only redoes the part that failed. Donations keep no record, so they run last and only when the others succeeded, so a retry cannot post twice.
- **Answers:** 200; 400 for a bad signature or JSON; 503 when not configured; 500 to make Stripe retry (for up to three days).
- **API versions:** events arrive in the endpoint's API version; invoices are read in both the older and the 2025-03-31.basil shape, so an older endpoint or `stripe listen` still works.
- **On Netlify** it is an Astro route (`prerender = false`) in the site's server function; nothing else is deployed. Netlify stops synchronous functions after about 10 seconds; membership `invoice.paid` does the most work (certificate and emails), so watch its duration in the function logs, and move that work to a background function if it gets close.
- **Creating it:** `pnpm membership:stripe-setup --webhook-url https://zurichjs.com/api/stripe/webhook` (dry run; `--apply` creates it) prints the signing secret once. Sponsorship events use the same endpoint; there is no separate one. Locally, `pnpm local` forwards to it with `stripe listen`.

## Moving production to the one webhook (owner, production change)

Production still sends to the old endpoints, which keep working:

- `/api/membership/webhook` with `STRIPE_MEMBERSHIP_WEBHOOK_SECRET`
- `/api/donate/webhook` with `STRIPE_WEBHOOK_SECRET` (today that variable holds this endpoint's secret)

To switch: create the `/api/stripe/webhook` endpoint as above, put its secret in `STRIPE_WEBHOOK_SECRET`, then disable the two old endpoints in Stripe in the same minute. Events already handled are skipped, so an overlap is harmless. Afterwards delete both old routes and `STRIPE_MEMBERSHIP_WEBHOOK_SECRET`.

### Not verified

Whether the switch has happened in production.

## Shared settings

- **Test mode first;** live objects and live keys are production changes for the owner. Test and live are separate endpoints with separate secrets: in Netlify, scope the live `STRIPE_SECRET_KEY`, portal configurations and `STRIPE_WEBHOOK_SECRET` to the production context and the test ones to deploy previews. To test on a deploy preview, add a test-mode endpoint for that preview's URL.
- **Customer emails:** "Successful payments" receipts on (the donate and thanks pages say Stripe emails a receipt); Stripe's own failed-payment and 3D Secure emails off, since the site sends them.
- **Billing › Revenue recovery:** Smart Retries on; when all retries fail, cancel the subscription (that ends a membership or sponsorship as lapsed).
- **No invoice creation in Checkout** (it costs extra per invoice; spending needs the owner).
- **Billing portal:** memberships use `STRIPE_MEMBER_PORTAL_CONFIG` (no cancelling, no plan switching); sponsorships reuse it unless `STRIPE_SPONSOR_PORTAL_CONFIG` is set; monthly donors use the `PUBLIC_STRIPE_PORTAL_URL` login link.

## Related concepts

- [Donations](/domains/donations/overview.md), [Membership payments and API](/domains/membership/api.md), [Sponsorship payments and API](/domains/sponsorship/api.md)
- [Environment variables](/systems/operations/environment.md), [Local development](/systems/local-development.md), [Web app](/systems/web.md), [Troubleshooting](/systems/operations/troubleshooting.md)

# Related specs

None.
