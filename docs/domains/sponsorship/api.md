---
type: API
title: Sponsorship payments and API
description: The sponsor and admin endpoints, the Stripe objects and webhook handling for sponsorships, and the owner's one-time setup.
tags: [sponsorship, stripe, api]
timestamp: '2026-11-19T00:00:00Z'
---

# Sponsorship payments and API

All routes are Astro endpoints with `prerender = false`, running in the site's server function. Business rules are in [Sponsorship](/domains/sponsorship/overview.md); what all Stripe parts share is in [Stripe](/systems/stripe.md).

## Endpoints

| Route                                                         | For                                                                                                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/sponsorship/me`                                         | the signed-in contact's sponsorship                                                                                                                  |
| `/api/sponsorship/start`                                      | start a sponsorship (sign the agreement, open Stripe Checkout)                                                                                       |
| `/api/sponsorship/invitation`                                 | accept an invitation, or a colleague's invitation to a sponsorship                                                                                   |
| `/api/sponsorship/plan`                                       | change tier or billing, or confirm a change the board sent                                                                                           |
| `/api/sponsorship/end`, `/api/sponsorship/end/undo`           | end at the end of the paid period, or take it back                                                                                                   |
| `/api/sponsorship/portal`                                     | a Stripe billing portal session                                                                                                                      |
| `/api/sponsorship/details`                                    | company and billing details (synced to Stripe)                                                                                                       |
| `/api/sponsorship/meetups`                                    | the meetups of a one-time sponsorship                                                                                                                |
| `/api/sponsorship/coverage`                                   | the meetups the sponsorship covers, with their state from Sanity (or the stored ones when Sanity fails)                                              |
| `/api/sponsorship/logo`, `/api/sponsorship/logo/[id]`         | upload and read logos                                                                                                                                |
| `/api/sponsorship/contacts`, `/api/sponsorship/contacts/[id]` | colleagues                                                                                                                                           |
| `/api/sponsorship/contracts/[id]`                             | download an attached contract                                                                                                                        |
| `/api/membership/admin/sponsors/*`                            | the board's API: list, one sponsor, invite, plan, suggest a change, end, record a payment, bundle, payment link, contacts, contracts, logos, meetups |
| `/api/membership/admin/fees`                                  | the fee gate and the card tariffs; add a tariff version ([Processing fees](/domains/sponsorship/fees.md))                                            |
| `/api/membership/admin/sponsors/[id]/coverage`                | the covered meetups of a recurring sponsorship and their history; add an upcoming meetup or take one off                                             |

- **Sign-in** is the members' email link (Better Auth, `/api/auth/[...all]`).
- **The admin API** sits under `/api/membership/admin` so it shares the admin cookie's path and `ADMIN_PASSWORD` ([Membership frontend](/domains/membership/frontend.md)).
- **A sponsor's partner id** (`partnerId` on the admin's details route) links it to its partner record on the public site ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").
- **Writes** must come from the site (an `Origin` check, as in the admin area); uploads and contact changes are rate limited.
- **Logos:** SVG, PNG or WebP up to 2 MB; SVGs with scripts, external references or other tricks are refused. **Contracts:** PDF up to 10 MB. Both are stored in the Netlify Blobs store `sponsors` (`apps/web/src/server/sponsor-logo.ts`).

## Stripe

- **Calls:** `apps/web/src/server/sponsor-stripe.ts`. Checkout sessions and subscriptions carry `source: zurichjs.com/partners`.
- **Objects:** `pnpm sponsorship:stripe-setup` (`tools/sponsorship-stripe-setup.ts`) is a dry run; `--apply` creates one product per tier and 16 prices (lookup keys `sponsor_<tier>_<monthly|quarterly|yearly|once>`). `--portal` adds a sponsor-only billing portal configuration (`STRIPE_SPONSOR_PORTAL_CONFIG`); without it the sponsors reuse the members' (`STRIPE_MEMBER_PORTAL_CONFIG`). The portal changes the card and shows receipts; it never changes plans or cancels.
- **Bundles** use `price_data` or a custom price on the tier's product, paid through a single-use payment link. A surcharge the sponsor covers is a second line, "Payment processing fee", and the link carries `quoteId` ([Processing fees](/domains/sponsorship/fees.md)).
- **Webhook:** sponsorship events arrive on the site's one webhook, `/api/stripe/webhook` ([Stripe](/systems/stripe.md)); there is no separate endpoint. `apps/web/src/server/sponsor-webhook.ts` handles them with its own idempotency table. Only `subscription_create` and `subscription_cycle` invoices move the paid-through date; a proration invoice does not. A second live subscription for the same sponsor (an old Checkout tab) is cancelled and flagged in Slack.

## Setup (owner, once)

The sponsorships use the membership database, sign-in, Resend and the Slack bot ([Membership payments and API](/domains/membership/api.md)).

1. **Stripe, test mode first:** run the setup script above, then repeat with the live key when going live (a production change).
2. **Stripe settings:** receipts on; failed-payment emails and revenue recovery as for memberships ([Stripe](/systems/stripe.md)).
3. **Slack:** optionally a sponsors channel with @ZurichJS Bot in it (`SLACK_SPONSORSHIP_CHANNEL_ID`).
4. **The agreement** at `/partners/agreement` was approved by the owner on 18th November 2026. There is no switch: payments are open as soon as the Stripe variables are set.

### Not verified

Whether the live Stripe objects exist.

## Tests

`packages/sponsorship/test` (with a real Postgres; skipped without one), `apps/web/test/sponsorship-flow.test.ts`, `apps/web/test/sponsor-coverage.test.ts`, `apps/web/test/sponsorship-fees.test.ts`, `packages/emails/test`. The override of the public partner list: `packages/content/test/sponsorships.test.ts` (the rules and the fallback) and `apps/web/test/sponsor-rebuild.test.ts` (which changes queue a rebuild).

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Stripe](/systems/stripe.md), [Environment variables](/systems/operations/environment.md), [Membership payments and API](/domains/membership/api.md)

# Related specs

None.
