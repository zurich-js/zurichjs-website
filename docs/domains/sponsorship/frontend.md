---
type: Frontend Area
title: Sponsorship frontend
description: The sponsor's account page, the sponsorship agreement page, and the board's sponsor admin with its day-to-day tasks.
tags: [sponsorship, frontend, admin]
timestamp: '2026-11-19T00:00:00Z'
---

# Sponsorship frontend

Pages: `apps/web/src/pages/partners/account.astro`, `apps/web/src/pages/partners/agreement.astro`, `apps/web/src/pages/admin/sponsors.astro`. Islands: `apps/web/src/components/islands/SponsorAccount.tsx` with `apps/web/src/components/islands/sponsor-account`, `apps/web/src/components/islands/SponsorsAdmin.tsx` and `apps/web/src/components/islands/sponsors-admin`. Rules: [Sponsorship](/domains/sponsorship/overview.md); endpoints: [Sponsorship payments and API](/domains/sponsorship/api.md).

## `/partners/account` (noindex)

A static shell with a Preact island; it holds no sponsor data in the HTML. Sign-in is the members' email link.

- **Start or finish:** billing details, plan, and the agreement (name, role), then card payment in Stripe Checkout. A sponsor with a contract on file skips signing.
- **A change from the board** arrives as a link (`?change=builder-yearly`, `?change=end`) that fills the change in; nothing changes until a contact confirms it with one tick.
- **Meetups you sponsor:** the covered meetups ([Sponsorship](/domains/sponsorship/overview.md), "Covered meetups"), loaded on their own with a loading line, an error with Try again, and an empty state.
- **Your offer:** while it waits for payment, the board's open offer: what it is for, the amount, the processing fee when the sponsor covers it, the total, and a button to the payment link.
- **Raffle add-ons:** contacts the board released to this person show behind a button, narrowed to permissions that still count, with what they may be used for and until when.
- **Raffle add-ons (proposing):** propose a raffle for an upcoming meetup, read the board's offer (amount, fee, total), accept its raffle terms and pay through its link, or withdraw ([Raffle add-ons](/domains/sponsorship/raffles.md)). Shown once the sponsorship has started; a sponsorship that is not eligible sees why.
- **Self-serve:** change tier or billing (a higher tier on the same billing applies now, anything else from the next renewal); end, and take it back until the end; Stripe's portal for the card and receipts; company and billing details (synced to Stripe); logo upload; colleagues (primary, billing, other). A colleague added by someone else must sign in and accept before they see or receive anything.

## `/partners/agreement` (noindex)

The sponsorship agreement, approved by the owner on 18th November 2026. Its version is recorded with each signature.

## `/raffle` and `/raffle/manage` (noindex)

The entry page of a raffle (`?r=<raffle id>`) and the entrant's own link (`#t=<token>`), static shells with Preact islands (`apps/web/src/components/islands/RaffleEntry.tsx`, `apps/web/src/components/islands/RaffleManage.tsx`). No account ([Raffle add-ons](/domains/sponsorship/raffles.md)). When the raffle shares with its sponsor, the entry form has an unticked, optional box, and the entrant's link lets them share or withdraw.

## `/admin/sponsors` (noindex)

For the board, behind the same `ADMIN_PASSWORD` and protection as the membership admin area ([Membership frontend](/domains/membership/frontend.md)). "Needs you" lists what needs the board.

**Day to day:**

- **Invite a company** after agreeing the sponsorship: Add a sponsor › Invite. They get an email, sign in with that address, sign and pay.
- **An existing sponsorship** (paid by bank transfer, say): Add a sponsor › Import existing, with the date it is paid until. Record later transfers with **Record a payment**. Slack reminds the board 30 and 7 days before it runs out, and on the day.
- **Move a sponsor up, down or out** after talking to them: open the sponsor › **Send a change to confirm**. They get a link that fills it in; until they confirm nothing changes. Use **End outright** only when they did not agree (terminated) or an invitation never started (withdrawn).
- **Show a sponsor on the site at their tier:** open the sponsor › Edit details › **Partner id**, and enter the id of their partner record (for example `gyff`). A running sponsorship then sets their tier on the home page, `/partners` and Tonight within a few minutes; without a partner id they are listed by name only, without a logo ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").
- **Covered meetups** (recurring sponsorships): open the sponsor › Covered meetups, choose an upcoming meetup and Add. Take off removes it from their dashboard and keeps it under "Taken off". A meetup that has happened stays.
- **Raffle add-ons:** open the sponsor › Raffle add-ons: make an offer (amount and who covers the fees), decline, record the prize's cost or its arrival, mark it ready, put it on hold, cancel, and record refund decisions and refunds. Flags say what needs a decision. Once ready: open entries (with the closing time), copy the entry page link, close, draw the winner (one confirm step), draw again with a reason, and record the delivery. The winner's name and email show here only. With sharing: Sharing previews the entrants whose permission counts, releases a narrowed selection to one sponsor contact for 1 to 30 days after a confirming tick, withdraws releases, and erases entries after the retention period.
- **Processing fees:** at the bottom of the sponsor list. It says whether "Sponsor covers the fees" is available, lists the card tariffs, and adds a new tariff version. Create payment link offers the choice once a tariff and the owner's policy version exist ([Processing fees](/domains/sponsorship/fees.md)).
- **Bundles:** Add a sponsor with billing one-time, the meetups and a price per meetup; attach the signed contract; **Create payment link** and send it to them.
- **Logos:** Slack says when one is uploaded; add it to the partner document in Sanity and publish ([Partners](/domains/partners/overview.md)).

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md)
- [Membership frontend](/domains/membership/frontend.md) (the shared admin area), [Web app](/systems/web.md)

# Related specs

- [Online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md)
