---
type: Frontend Area
title: Membership frontend
description: The membership pages (/membership, /membership/terms, /membership/account) and the board's admin area (/admin), with how the admin area is protected.
tags: [membership, frontend, admin]
timestamp: '2026-11-24T00:00:00Z'
---

# Membership frontend

Pages: `apps/web/src/pages/membership.astro`, `apps/web/src/pages/membership/terms.astro`, `apps/web/src/pages/membership/account.astro`, `apps/web/src/pages/admin`. Islands: `apps/web/src/components/islands/MemberJoin.tsx`, `apps/web/src/components/islands/MemberAccount.tsx`, `apps/web/src/components/islands/MembershipAdmin.tsx`. Rules: [Membership](/domains/membership/overview.md); endpoints: [Membership payments](/domains/membership/api.md).

## `/membership`

The public page: the two levels as choice cards, each with its quarterly and yearly fee, a billing-cycle switch, and one line with the per-year totals. Choosing a level leads to `/membership/account` with that level and cycle. The Join step is one centred column without a card. Membership is in the header's "Get involved" menu and in the footer ("Take part › Membership").

## `/membership/terms`

The membership terms, based on the bylaws; indexed (the version of 11th November 2026 is approved). The accepted version is recorded with each member.

## `/membership/account` (noindex)

A static shell with a Preact island; it holds no member data in the HTML. Not in the sitemap or `llms.txt`.

- **Signed out:** sign in with an emailed link.
- **Not a member yet:** join (person or organisation, level, cycle, the terms), then Stripe Checkout. An invited person sees "Finish joining" with the level and cycle the board entered.
- **A member:** level, status, billing, paid until, member since; certificates to download; "Manage payment" (a Stripe billing portal session); a level or cycle change from the next renewal, which shows as pending and can be taken back; resign, with optional reasons; resubscribe while resigning.
- **Paid manually (cash/bank):** a plain note under "Signed in as" asks them to switch to automatic payment (it was a soft yellow banner until 18th November 2026).

## The admin area (`/admin`, `/admin/memberships`)

For the board, behind one shared password, `ADMIN_PASSWORD` (owner, 11th November 2026). `/admin` asks for the password first, then shows Memberships; there is no content section, since Sanity is reached through the Studio directly. noindex.

- **What it shows:** members with search (name, email, organisation) and a status filter, the totals, and one member's details: terms accepted, certificates, Stripe ids, notes and the full history. The list shows the newest 500 (`LIST_LIMIT`, `apps/web/src/server/admin-views.ts`) and says so when more match; the totals count every member in the database, in a separate query, so a change in between can make them differ from the list by that change. Opening another member while one is loading shows only the one opened last.
- **When the site does not answer:** a session check that fails (no connection, a platform error page) says the admin area cannot be reached, with Try again; only an answer from the site shows the sign-in form. Sign-in shows the site's own sentence for a wrong password or the lockout, and "We couldn’t complete sign-in. Try again in a moment." for a server error or an answer without `ok`, since no verdict on the password came back. Sign-out counts only the site's `{ ok: true }`: otherwise the admin area is hidden and "We couldn’t sign you out." offers Try again, since the session may still be valid. A list or member that fails to load offers Try again. Reads give up after 20 s and writes after 65 s, past Netlify's 60 s; a write that got no answer, or a platform error page instead of the site's JSON, says the change may or may not have been saved, so reload before trying again (`apps/web/src/components/islands/admin-api.ts`). The time limits use a timer, so they also work in browsers without `AbortSignal.timeout` or `AbortSignal.any`. Loading lines say after 10 s that loading is taking longer than usual (`Loading`, [Components](/systems/design-system/components.md)).
- **What it does:** confirm resignations (the same as the Slack button), import members (dry run first), export everyone as CSV (formulas neutralised for spreadsheets).
- **Invite someone to join:** enter who they are and the level and cycle they asked for. They get "Your invitation to join ZurichJS" with a link to the account page. Until they pay they are listed as "Waiting for first payment" (source: invited by the board). Inviting the same email again updates the choice and resends; someone who is already a member is refused.
- **Add a member who paid manually (cash/bank):** person or organisation, name, email, level, billing cycle and the month their paid term started; the form shows until when that covers them. Adding them records them as paid manually until the term ends (one cycle from the first of the start month), issues their certificate for that term, optionally emails it with an invitation to set up automatic payment (Stripe charges nothing before the term ends, then renews and issues the next certificate), and posts a note in the membership Slack channel. One member per email address.
- **Many at once** from the command line, with a CSV (columns in `packages/membership/src/import.ts`); each becomes "paid manually (cash/bank) until `paid_until`":

  ```bash
  ADMIN_PASSWORD=… pnpm membership:import members.csv --site https://<deploy-preview-url>   # dry run on a preview
  ADMIN_PASSWORD=… pnpm membership:import members.csv --apply                             # production
  ```

**Protection:** the site enforces the password on every deploy, production and previews alike, so it does not depend on Netlify's visitor access settings. The password is compared in constant time; 10 wrong attempts per IP block sign-ins for 15 minutes (counted in the database, `admin_login_attempts`); the session is an httpOnly, SameSite=Strict cookie for the admin API only, valid 8 hours and signed with a key derived from the password, so a new password signs everyone out; writes are refused unless they come from the site itself.

**Limits:** it is one shared password, so the history records "admin" rather than a person. Slack confirmations record the person's Slack ID.

## Day to day

- **New members, renewals, failed payments** arrive in Slack as notes. Nothing to do.
- **Resignations** arrive as a card with **Confirm resignation** (Nadja, Bogdan, Faris). If dues are open it says so and waits. Confirming ends the subscription at the end of the paid period and emails the member.
- **Certificates** are issued per paid invoice; a member can download them all on their account page.

## Related concepts

- [Membership](/domains/membership/overview.md), [Membership payments](/domains/membership/api.md)
- [Web app](/systems/web.md), [Design system components](/systems/design-system/components.md), [Slack content agent](/systems/slack-agent.md)

# Related specs

- [Member perks](/domains/membership/specs/member-perks.md)
