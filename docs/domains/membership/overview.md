---
type: Domain
title: Membership
description: Verein membership of the Swiss JavaScript Group: who can join, levels and fees, the status machine, certificates, resignation, the member store, emails, data retention and how the bylaws shape the rules.
tags: [membership, verein, stripe, postgres]
timestamp: "2026-11-19T00:00:00Z"
---

# Membership

Source: `packages/membership` (`@zurichjs/membership`: levels, status machine, `postgresStore`, CSV import), `apps/web/src/server/membership*.ts`, `apps/web/src/server/certificate.ts`, `apps/web/src/server/auth.ts`, `apps/web/src/lib/membership.ts` (fees), `packages/emails`, and the schema in `apps/web/database/migrations`.

## How it works (owner, 10th November 2026)

**Anyone can join** (bylaws Art. 4: any person who supports the goals may become a member). Nobody approves them, and there is no declaration to sign.

1. **Sign in** on `/membership/account` with an emailed link (Better Auth with the magic-link plugin; sessions are httpOnly cookies). Sign-in links are rate limited to 3 per 10 minutes per address, in the database.
2. **Join:** person or organisation, Basic Member or Supporter, quarterly or yearly (no other cycles), and a tick for the **membership terms** (`/membership/terms`, based on the bylaws, approved in the version of 11th November 2026; the accepted version is recorded).
3. **Pay** in Stripe Checkout (a subscription). The first payment makes them active.
4. **Certificate of membership** for every paid term: a numbered PDF, signed by Faris Aziz, President of the Board, emailed (welcome or renewal) and downloadable in the portal.
5. **Portal** (the account page): status, paid until, certificates, and the Stripe billing portal for payment method and invoices (no cancelling and no plan switching there). **Changing level or cycle** is on the account page and applies only from the next renewal (owner): a Stripe subscription schedule keeps the current term as paid and starts the new price at the renewal, so nothing is charged or prorated now. A pending switch shows on the account page and can be taken back; resigning drops it. Members paying manually (cash/bank) set up automatic payment first.
6. **Resign** on the account page. It counts as "in writing" (bylaws Art. 5), and the member gets an email copy. The page asks why (one or more reasons and a note, for the board), with a link to resign without a reason, since a reason is never a condition (Art. 5; Swiss Civil Code Art. 70). Renewal stops when the member resigns, so nothing is charged after it. The board (Nadja, Bogdan, Faris) confirms in Slack or the admin area; open dues hold it; it ends with the paid period. Until then the member can **Resubscribe** (the board can undo it for them). Members are told the board typically gets back to them within 72 hours.
7. **Invited by the board** (owner, 12th November 2026): someone who asked to join gets an invitation from the admin area with the level and cycle they asked for. Their record is `pending` (source `invited`) and linked on first sign-in; the account page opens on "Finish joining" with their choice, and the first payment makes them a member like any online join.
8. **Members who paid manually** (cash or bank; owner, 11th November 2026): added one at a time in the admin area, or many from a CSV. They are linked on first sign-in, accept the terms and switch to automatic payment with no charge before their paid period ends ([Membership frontend](/domains/membership/frontend.md)).

**Online joining is always on** (owner, 11th November 2026): `/membership` leads to sign-in and Stripe, with no switch. `/api/verein-inquiry` stays for anything that still posts to it; it charges nothing, and emails and Slacks the organisers with tier, cycle and the fee shown.

## Levels and fees

Two levels, one to one with the site: Basic Member and Supporter. Art. 4 also names Enthusiast and Advocate; they do not exist yet and are not modelled (owner, 6th November 2026). Adding one later is a migration (`alter type member_level add value`) and a row in `packages/membership/src/levels.ts`.

Fees are one table, `apps/web/src/lib/membership.ts`, used by the page, the Stripe setup script and `/api/verein-inquiry`; change fees or benefits only there.

| Level        | Quarterly | Yearly  | Per year, paying quarterly |
| ------------ | --------- | ------- | -------------------------- |
| Basic Member | CHF 50    | CHF 175 | CHF 200                    |
| Supporter    | CHF 75    | CHF 250 | CHF 300                    |

The monthly option is gone (owner, 3rd November 2026). The page says quarterly costs the most over a year; a unit test keeps that true. The benefit wording comes from the old production page; what each level may vote on is an open question ([Content sources](/reference/content-sources.md)).

## Status machine

`packages/membership/src/state.ts` lists the allowed changes and who may make each (the member, the board, Stripe, the import script); the database function `member_transition` refuses anything else. Every change is compare-and-set and logged in an append-only audit table.

| From                                    | To                                      | By                                                        |
| --------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| `pending`                               | `active`                                | Stripe (first payment)                                    |
| `active`                                | `past_due`                              | Stripe                                                    |
| `past_due`                              | `active`                                | Stripe                                                    |
| `imported_manual`                       | `active`                                | Stripe (switched to automatic payment)                    |
| `active`, `past_due`, `imported_manual` | `resigning`                             | the member or the board                                   |
| `resigning`                             | `active`, `past_due`, `imported_manual` | the member or the board (undo, back to the status before) |
| `resigning`                             | `ended`                                 | the board (confirms) or Stripe (end of the period)        |
| `active`, `past_due`                    | `ended`                                 | the board or Stripe                                       |
| `imported_manual`                       | `ended`                                 | the board                                                 |
| `ended`                                 | `pending`                               | the member (joins again)                                  |

- **Ending reasons:** the board may end a membership as resigned, expelled, deceased, dissolved or lapsed; Stripe as resigned or lapsed.
- **A resignation** is first with the board (`resigned_at`), then confirmed (`resignation_confirmed_at`). The member and hello@zurichjs.com get an email at each step, and the board a Slack note.
- **Counted as members:** `active`, `past_due`, `imported_manual` and `resigning`.
- **Labels people read:** "waiting for the first payment", "active", "behind on payment", "paid manually (cash/bank)", "resigning", "ended".

## Infrastructure

| Area         | Choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting      | Netlify only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Database     | Postgres on Neon (owner, 11th November 2026; Netlify Database needs a plan the team does not have). Migrations in `apps/web/database/migrations`, applied before every Netlify build by `apps/web/scripts/db-migrate.mjs` (each once, recorded in `schema_migrations`). Production uses the Neon production branch; each deploy preview gets its own empty database (`pr_<number>`) on the Neon `preview` branch, migrated from scratch and dropped when the PR closes, so no production data reaches a preview; local uses Docker. |
| Sign-in      | Better Auth with the magic-link plugin; its tables are the first migration; rate limits stored in the database                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Payments     | Stripe over plain `fetch` (`apps/web/src/server/membership-stripe.ts`) ([Membership payments](/domains/membership/api.md))                                                                                                                                                                                                                                                                                                                                                                                                          |
| Email        | Resend, templates in `packages/emails`: sign-in link, welcome, renewal, invitation, the certificate for members added by hand, automatic payment set up, payment failed, resignation received, confirmed and withdrawn, and the board notice that every email to hello@zurichjs.com uses                                                                                                                                                                                                                                            |
| Certificates | `pdf-lib` with Figtree, A4 landscape (`apps/web/src/server/certificate.ts`); one certificate per invoice; the signature PNG in the private Netlify Blobs store `membership` (`pnpm membership:signature`), never committed                                                                                                                                                                                                                                                                                                          |
| Slack        | notes for new members, renewals and failed payments; resignation cards (with the member's reasons) with Confirm and Undo for `SLACK_MEMBERSHIP_APPROVER_IDS`; the organisers' bot answers membership questions ([Slack content agent](/systems/slack-agent.md))                                                                                                                                                                                                                                                                     |
| Admin        | `/admin/memberships` for the board, behind `ADMIN_PASSWORD` ([Membership frontend](/domains/membership/frontend.md))                                                                                                                                                                                                                                                                                                                                                                                                                |
| Local        | `pnpm local` (Docker): site, Postgres, Mailpit, Stripe test mode with `stripe listen` ([Local development](/systems/local-development.md))                                                                                                                                                                                                                                                                                                                                                                                          |

## Emails

Templates are plain TypeScript in `packages/emails`, styled only from the design tokens (through `@zurichjs/design/theme`), rendered at send time to HTML and plain text, and sent with Resend (no `RESEND_API_KEY` means a stub log line; with `MAILPIT_URL`, everything goes to Mailpit). Not React Email: its components package is deprecated, and its CLI would bring heavy dependencies into a repository that pins and age-gates them, next to Preact. Templates return blocks (paragraph, button, summary, link, success, error), so escaping and the layout live in one file. Resend's dashboard shows every sent email.

**Layout, from the brand rules:** black header with the logo, white content, black footer with the association name, registered office and a link to `/membership/account`; one yellow pill button per email; a 24px summary box; no kickers, dividers or gradients; green only on a success line, red only for a payment problem. Figtree is loaded from `/fonts/figtree-var.woff2` (a test keeps it equal to the design package's file) and falls back to Helvetica and Arial where clients ignore web fonts. The logo is a PNG rendered from the white wordmark, since email clients do not show SVG.

## Data retention

Member data is kept for one year after the membership ends, then anonymised by the database function `member_anonymise`: personal fields, notes and Stripe ids are removed, and the row stays as a count with its level and dates. The function refuses before a year has passed. Stripe keeps the payment records for the accounts. The scheduled job that calls the function is not built (Spec below).

## How the bylaws shape the rules

The Swiss JavaScript Group bylaws (Statuten, approved at the founding meeting on 23rd May 2025, held by the board) are the source. This is a reading of them, not legal advice:

- **Joining** has no set form (Art. 4), so accepting the terms online is enough.
- **No commitment beyond the paid period.** Resignation is possible "at any time in writing to the Board, provided there are no outstanding dues" (Art. 5). Resignation takes effect at the end of the period already paid, with no refund; open dues hold it. Members cannot cancel in Stripe, which matches "to the Board". Longer commitments would need a bylaw amendment at the general assembly (GV).
- **Legal persons can join:** a member is a person or an organisation.
- **Passive and active** membership is about attendance (at least 40% of events per year), not the fee. Voting on minor decisions is for active members; Supporter level and up also have a say in dates and speakers. This is not modelled.
- **Perks the bylaws name:** a basic discount set by the board for all members, and one paid event per year included for active members (Spec below).
- **The board** can also end a membership for expulsion (a bylaws or Code of Conduct breach), death or dissolution.
- **The general assembly:** invitations go out electronically at least 14 days ahead; an extraordinary GV needs a fifth of active members; the annual accounts go to the GV for approval. Nothing in the site supports the GV yet.
- **The registered office** (Alderstrasse 30, 8008 Zurich) and the association name appear on member documents.

## Open questions

- **Board:** what the "basic discount" is, and which paid events are included each year (Art. 4).
- **Accounting records:** Swiss law most likely requires keeping bookkeeping records for 10 years (OR Art. 958f), longer than the one-year member data rule. Stripe's invoices and payouts are those records, so the anonymisation never touches Stripe. To confirm with whoever keeps the books.
- **Voting wording** on `/membership`: Basic says "vote on small decisions" without the attendance condition; change only with the owner.

## Related concepts

- [Membership payments](/domains/membership/api.md), [Membership frontend](/domains/membership/frontend.md)
- Systems: [Web app](/systems/web.md), [Environment variables](/systems/operations/environment.md), [Netlify deploys](/systems/operations/netlify.md), [Slack content agent](/systems/slack-agent.md), [Local development](/systems/local-development.md)
- [Donations](/domains/donations/overview.md): a donation is not a membership

# Related specs

- [Scheduled anonymisation of ended memberships](/domains/membership/specs/data-retention-job.md)
- [Member perks](/domains/membership/specs/member-perks.md)
