---
type: Frontend Area
title: Sponsorship frontend
description: The sponsor's account page, the sponsorship agreement page, and the board's sponsor admin with its day-to-day tasks.
tags: [sponsorship, frontend, admin]
timestamp: '2026-11-19T00:00:00Z'
---

# Sponsorship frontend

Pages: `apps/web/src/pages/partners/account.astro`, `apps/web/src/pages/partners/agreement.astro`, `apps/web/src/pages/admin/sponsors.astro`. Islands: `apps/web/src/components/islands/SponsorAccount.tsx`, `apps/web/src/components/islands/SponsorsAdmin.tsx` and `apps/web/src/components/islands/sponsors-admin`. Rules: [Sponsorship](/domains/sponsorship/overview.md); endpoints: [Sponsorship payments and API](/domains/sponsorship/api.md).

## `/partners/account` (noindex)

A static shell with a Preact island; it holds no sponsor data in the HTML. Sign-in is the members' email link.

- **Start or finish:** billing details, plan, and the agreement (name, role), then card payment in Stripe Checkout. A sponsor with a contract on file skips signing.
- **A change from the board** arrives as a link (`?change=builder-yearly`, `?change=end`) that fills the change in; nothing changes until a contact confirms it with one tick.
- **Self-serve:** change tier or billing (a higher tier on the same billing applies now, anything else from the next renewal); end, and take it back until the end; Stripe's portal for the card and receipts; company and billing details (synced to Stripe); logo upload; colleagues (primary, billing, other). A colleague added by someone else must sign in and accept before they see or receive anything.

## `/partners/agreement` (noindex)

The sponsorship agreement, approved by the owner on 18th November 2026. Its version is recorded with each signature.

## `/admin/sponsors` (noindex)

For the board, behind the same `ADMIN_PASSWORD` and protection as the membership admin area ([Membership frontend](/domains/membership/frontend.md)). "Needs you" lists what needs the board.

**Day to day:**

- **Invite a company** after agreeing the sponsorship: Add a sponsor › Invite. They get an email, sign in with that address, sign and pay.
- **An existing sponsorship** (paid by bank transfer, say): Add a sponsor › Import existing, with the date it is paid until. Record later transfers with **Record a bank transfer**. If the site cannot confirm the result, reload and check the history. When the transfer is missing, submit the same date, amount and reference to finish it. The server checks whether an interrupted payment can resume. Slack reminds the board 30 and 7 days before it runs out, and on the day.
- **Move a sponsor up, down or out** after talking to them: open the sponsor › **Send a change to confirm**. They get a link that fills it in; until they confirm nothing changes. Use **End outright** only when they did not agree (terminated) or an invitation never started (withdrawn).
- **Show a sponsor on the site at their tier:** open the sponsor › Edit details › **Partner id**, and enter the id of their partner record (for example `gyff`). A running sponsorship then sets their tier on the home page, `/partners` and Tonight within a few minutes; without a partner id they are listed by name only, without a logo ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").
- **Bundles:** Add a sponsor with billing one-time, the meetups and a price per meetup; attach the signed contract; **Create payment link** and send it to them.
- **Logos:** Slack says when one is uploaded; add it to the partner document in Sanity and publish ([Partners](/domains/partners/overview.md)).

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md)
- [Membership frontend](/domains/membership/frontend.md) (the shared admin area), [Web app](/systems/web.md)

# Related specs

- [Online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md)
