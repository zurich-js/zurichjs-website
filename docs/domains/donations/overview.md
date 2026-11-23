---
type: Domain
title: Donations
description: One-time and monthly donations through Stripe Checkout on /donate, the return and webhook endpoints, the Twint and email alternatives, and what the page shows when payments are unavailable.
tags: [donations, stripe, api, frontend]
timestamp: '2026-11-24T00:00:00Z'
---

# Donations

Source: `apps/web/src/pages/donate.astro`, `apps/web/src/pages/donate/thanks.astro`, `apps/web/src/pages/api/donate/checkout.ts`, `apps/web/src/pages/api/donate/session.ts`, `apps/web/src/pages/api/donate/webhook.ts`, `apps/web/src/server/stripe.ts`, and the `DonateForm` and `DonateThanks` islands.

## Rules

- **Payments on the site** are donations through Stripe Checkout on `/donate`, one-time or monthly (owner decision, 2026-11-01), Verein memberships ([Membership](/domains/membership/overview.md)) and sponsorships ([Sponsorship](/domains/sponsorship/overview.md)). Pro meetups, tickets and merchandise stay removed. Twint (a QR from Site settings) and email remain.
- **A donation is not a membership;** the page says so.
- **Stripe over `fetch`, no SDK** ([Stripe](/systems/stripe.md)); `STRIPE_API_BASE` can point the calls at `tools/mock-stripe.mjs` for development and e2e.
- **No invoice creation:** Checkout's `invoice_creation` costs extra per invoice, and spending needs the owner. Receipts rely on Stripe's "Successful payments" email setting.

## Endpoints

```
POST /api/donate/checkout  JSON { amount: CHF 5–1000, recurrence: 'once' | 'monthly', email?, website_url? }
  200 { ok: true, url }       redirect the browser to the Stripe-hosted page
  400 { ok: false, error, field }
  429 { ok: false, error }    too many attempts
  503 { ok: false, error, reason: 'unavailable' }  no Stripe key or product
  502 { ok: false, error, reason: 'stripe' }       Stripe failed
```

- **Checkout:** CHF on the support product (`STRIPE_SUPPORT_PRODUCT_ID`), always with `price_data`; `mode` `payment`, or `subscription` with a monthly recurring price; `submit_type=donate` only with one-time payments, as Stripe requires; `customer_email` when given. Sessions carry the metadata `source: zurichjs.com/donate`.
- **`/api/donate/session`** lets `/donate/thanks` (noindex) say back only what Stripe confirmed, and reads only sessions this site created.
- **Webhook:** donation events arrive on the site's one webhook, `/api/stripe/webhook`, and `processDonationEvent` (`apps/web/src/pages/api/donate/webhook.ts`) posts Slack notes for new and cancelled monthly donations. Each event posts once, also when Stripe delivers it again; when Slack fails the answer is 500 and Stripe retries, and the part needs no membership database ([Stripe](/systems/stripe.md), "The one webhook"). `/api/donate/webhook` is the old donations-only endpoint, kept until production moves to the shared one ([Stripe](/systems/stripe.md)).

## The page

- **Amounts:** presets CHF 10 to 50, as on the old site, plus a custom amount (CHF 5 to 1000); a live amount and frequency summary; an optional receipt email (otherwise Stripe asks on its page).
- **Monthly donors** manage or cancel through `PUBLIC_STRIPE_PORTAL_URL` (the Stripe customer portal login link, read at build time) or by email ("No questions asked").
- **Other ways to give:** email always; the Twint QR and note only when uploaded to Site settings › Support page. Sample content never contains a QR.
- **Unavailable state:** without the Stripe key or product the endpoint answers 503, and the form says nothing was charged and names only what the page shows: email, plus Twint when a QR is set. The API error never names an alternative itself.
- **Back from Stripe** with the browser's Back button does not leave the button stuck (back-forward cache); a new attempt key is made. An invalid amount or email moves focus to that field.
- **Also on the page:** "What support pays for", a "Questions" section (receipts, cancelling a monthly donation, companies go to Host or sponsor), and "Thank you" naming the supporters the old site thanked, with their links, listed by hand; Stripe never publishes a name.
- **Not shown:** tax deductibility (no current source; owner decision), the old "Feed the Box" cash box (until an organiser confirms it still exists), and the old counters ([Content sources](/reference/content-sources.md)).
- **Old URLs:** `/buy-us-a-coffee`, `/support`, `/success`, `/checkout/*` and `/tshirt` lead here ([SEO](/systems/seo.md)).

Testing locally without Stripe: [Local development](/systems/local-development.md), "Donations without Stripe". On a deploy preview, use Stripe test keys only.

## Related concepts

- [Stripe](/systems/stripe.md), [Sponsorship](/domains/sponsorship/overview.md), [Membership](/domains/membership/overview.md), [Membership payments](/domains/membership/api.md), [Content model](/domains/content/content-model.md) (Site settings)
- [Web app](/systems/web.md), [Environment variables](/systems/operations/environment.md), [Netlify deploys](/systems/operations/netlify.md)

# Related specs

None.
