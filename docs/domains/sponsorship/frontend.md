---
type: Frontend Area
title: Sponsorship frontend
description: The sponsor's account page, the sponsorship agreement page, and the board's sponsor admin with its day-to-day tasks.
tags: [sponsorship, frontend, admin]
timestamp: '2026-11-25T00:00:00Z'
---

# Sponsorship frontend

Pages: `apps/web/src/pages/partners/account.astro`, `apps/web/src/pages/partners/agreement.astro`, `apps/web/src/pages/admin/sponsors.astro`, `apps/web/src/pages/admin/partners.astro`. Islands: `apps/web/src/components/islands/SponsorAccount.tsx` with `apps/web/src/components/islands/sponsor-account`, `apps/web/src/components/islands/SponsorsAdmin.tsx` and `apps/web/src/components/islands/sponsors-admin`. Rules: [Sponsorship](/domains/sponsorship/overview.md); endpoints: [Sponsorship payments and API](/domains/sponsorship/api.md).

## `/partners/account` (noindex)

A static shell with a Preact island; it holds no sponsor data in the HTML. Sign-in is the members' email link.

- **Start or finish:** billing details, plan, and the agreement (name, role), then card payment in Stripe Checkout. A sponsor with a contract on file skips signing.
- **A change from the board** opens for review from the email link or a pending plan quote. The account shows the current plan and the proposed terms. A quoted change lists the plan fee, processing fee, recurring total and amount due today. An immediate upgrade shows the time Stripe used for proration. A renewal change shows its effective date. A replacement quote requires fresh consent. After an unconfirmed write, the sponsor can check the latest offer before trying again. A link that no longer applies explains why.
- **After Checkout:** the page waits for Stripe's confirmation; if it is slow, "Back to your sponsorship" shows the page as it is and "Check again" waits again. Dates of signatures and logos are Zurich days, as in the emails.
- **Loading:** the loading line says after 10 s that it is slow, and after 20 s without an answer the page shows an error with Try again, never the sign-in form or an empty sponsorship (`READ_DEADLINE_MS`, `apps/web/src/components/islands/read-deadline.ts`). Only the site's own JSON 503 says sponsor accounts are not available yet; a platform 503 page is an error with Try again. When Stripe cannot be asked for a change scheduled for the renewal, or answers with a schedule the site cannot read (an id only, or no plan and first phase), the summary says so instead of showing none (`pendingChangeUnknown` from `/api/sponsorship/me`). Until a reload gets an answer, the change form, also when opened from a change link, offers Check again for every card plan change, including an immediate upgrade. Once the renewal is known, confirmation names the plan and date it will replace. The server compares that renewal with Stripe and checks the active target price before recording the agreement or releasing the schedule. The time limits use a timer, so they work without `AbortSignal.timeout`.
- **Meetups you sponsor:** the covered meetups ([Sponsorship](/domains/sponsorship/overview.md), "Covered meetups"), loaded on their own with a loading line, an error with Try again, and an empty state. Each title links to the meetup's page. When the rest of the account fails to load, this section still shows under the error.
- **Your offer:** while it waits for payment, the board's open offer: what it is for, the amount, the processing fee when the sponsor covers it, the total, and a button to the payment link.
- **Raffle add-ons:** contacts the board released to this person show behind a button, narrowed to permissions that still count, with what they may be used for and until when.
- **Raffle add-ons (proposing):** propose a raffle for an upcoming meetup, read the board's offer (amount, fee, total), accept its raffle terms and pay through its link, or withdraw ([Raffle add-ons](/domains/sponsorship/raffles.md)). Shown once the sponsorship has started; a sponsorship that is not eligible sees why.
- **Your offer:** while it waits for payment, the board's open offer: what it is for, the amount, the processing fee when the sponsor covers it, the total (per period for a recurring offer), and a button to the payment link. A recurring offer where they cover the fee adds an unticked agreement box to the start form.
- **Processing fee:** on a running recurring sponsorship, the fee in force, or a fee the board offered with a box to confirm it from the next renewal.
- **Self-serve:** change tier or billing (a higher tier on the same billing applies now, anything else from the next renewal); end, and take it back until the end; Stripe's portal for the card and receipts; company and billing details (synced to Stripe); logo upload; colleagues (primary, billing, other). A colleague added by someone else must sign in and accept before they see or receive anything.

## `/partners/agreement` (noindex)

The sponsorship agreement, approved by the owner on 18th November 2026. Its version is recorded with each signature.

## `/raffle` and `/raffle/manage` (noindex)

The entry page of a raffle (`?r=<raffle id>`) and the entrant's own link (`#t=<token>`), static shells with Preact islands (`apps/web/src/components/islands/RaffleEntry.tsx`, `apps/web/src/components/islands/RaffleManage.tsx`). No account ([Raffle add-ons](/domains/sponsorship/raffles.md)). When the raffle shares with its sponsor, the entry form has an unticked, optional box, and the entrant's link lets them share or withdraw.

## `/admin/sponsors` (noindex)

For the board, behind the same `ADMIN_PASSWORD` and protection as the membership admin area ([Membership frontend](/domains/membership/frontend.md)), with the same handling when the site does not answer. "Needs you" lists what needs the board. The list shows the newest 500 and says so when more match, worded for the search or filter of the list it shows; the counts on the status filter cover every sponsorship.

**Day to day:**

- **Invite a company** after agreeing the sponsorship: Add a sponsor › Invite. They get an email, sign in with that address, sign and pay.
- **An existing sponsorship** (paid by bank transfer, say): Add a sponsor › Import existing, with the date it is paid until. Record later transfers with **Record a bank transfer**. If the site cannot confirm the result, reload and check the history. When the transfer is missing, submit the same date, amount and reference to finish it. The server checks whether an interrupted payment can resume. Slack reminds the board 30 and 7 days before it runs out, and on the day.
- **Move a sponsor up, down or out** after talking to them: open the sponsor › **Send a change to confirm**. They get a link that fills it in; until they confirm nothing changes. Use **End outright** only when they did not agree (terminated) or an invitation never started (withdrawn).
- **Show a sponsor on the site at their tier:** open the sponsor › Edit details › **Partner record**, and choose their record (add it under `/admin/partners` first if it is missing). A running sponsorship then sets their tier on the home page, `/partners` and Tonight within a few minutes; not linked, they are listed by name only, without a logo, and the sponsor shows "No logo on the site" under Needs action ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").
- **Covered meetups** (recurring sponsorships): open the sponsor › Covered meetups, choose an upcoming meetup and Add. Take off removes it from their dashboard and keeps it under "Taken off". A meetup that has happened (on its current date in Sanity) stays. When Sanity cannot be reached, dates are as last saved and Take off waits.
- **Raffle add-ons:** open the sponsor › Raffle add-ons: make an offer (amount and who covers the fees), decline, record the prize's cost or its arrival, mark it ready, put it on hold, cancel, and record refund decisions and refunds. Flags say what needs a decision. Once ready: open entries (with the closing time), copy the entry page link, close, draw the winner (one confirm step), draw again with a reason, and record the delivery. The winner's name and email show here only. With sharing: Sharing previews the entrants whose permission counts, releases a narrowed selection to one sponsor contact for 1 to 30 days after a confirming tick, withdraws releases, and erases entries after the retention period.
- **Processing fees on a recurring sponsorship:** open the sponsor › Processing fees: what is in force, what waits for the sponsor, and the choice. Not started yet, it saves an offer; running, "Send to confirm" gives a link for the sponsor, and "ZurichJS covers the fees" applies at once.
- **Processing fees:** at the bottom of the sponsor list. It says whether "Sponsor covers the fees" is available, lists the card tariffs, and adds a new tariff version. Create payment link offers the choice once a tariff and the owner's policy version exist ([Processing fees](/domains/sponsorship/fees.md)).
- **Bundles:** Add a sponsor with billing one-time, the meetups and a price per meetup; attach the signed contract; **Create payment link** and send it to them.
- **Logos:** Slack says when one is uploaded to a running sponsorship. On the sponsor's page, "Use as the colour logo" or "Use as the one-colour logo" copies it to their partner record, where the site reads it; the hover colour and direct uploads are under `/admin/partners` ([Partners](/domains/partners/overview.md)). An ended sponsorship cannot upload one, and a pending one is not published until it runs.
- **Started online, not paid:** a company that started on its own and left Checkout is flagged as such, not as an unanswered invitation; there is nothing to send them.

## `/admin/partners` (noindex)

`apps/web/src/pages/admin/partners.astro`, `apps/web/src/components/islands/PartnersAdmin.tsx`: the third section of the admin area, behind the same password. The list groups the partner records the way the site shows them (current sponsors, current hosts, current partners, past, not shown). One partner: its two logo files and hover colour with a preview, the sponsorships linked to it, and its details. "Add a partner" creates a record. The rules are in [Partners and sponsorship](/domains/partners/overview.md), "The partner record, logos and hover colour".

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship payments and API](/domains/sponsorship/api.md)
- [Membership frontend](/domains/membership/frontend.md) (the shared admin area), [Web app](/systems/web.md)

# Related specs

- [Online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md)
- [Sponsor dashboard, raffle add-on and fee coverage](/domains/sponsorship/specs/sponsor-dashboard-raffle-fees.md)
- [Review every partner, then seed the production database](/domains/partners/specs/partner-data-review.md)
