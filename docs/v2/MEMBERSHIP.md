# Verein membership: self-serve joining

## How it works now (owner, 10th November 2026)

This section is the current design. The sections after it are the original investigation (5th and 6th November 2026), kept for the bylaws analysis and as history: where they mention Supabase, approval in Slack or signing a declaration, this section replaces them.

**Anyone can join** (bylaws Art. 4: any person who supports the goals may become a member). No approval and no declaration to sign.

1. **Sign in** on `/membership/account` with an emailed link (Better Auth; sessions are httpOnly cookies).
2. **Join:** person or organisation, Basic Member or Supporter, quarterly or yearly (no other cycles), and a tick for the **membership terms** (`/membership/terms`, based on the bylaws; the accepted version is recorded).
3. **Pay** in Stripe Checkout (subscription). The first payment makes them active.
4. **Certificate of membership** for every paid term: numbered PDF, signed by Faris Aziz, President of the Board, emailed (welcome or renewal) and downloadable in the portal.
5. **Portal:** status, paid until, certificates, and the Stripe billing portal for payment method and invoices (no cancelling, no plan switching there). **Changing level or cycle** is on the account page and only applies from the next renewal: a Stripe subscription schedule keeps the current term as paid and starts the new price at the renewal date, so nothing is charged or prorated now. A pending switch shows on the account page and can be taken back; resigning drops it. Members paying manually (cash/bank) set up automatic payment first (nothing is charged before their paid term ends, so they can still switch before the first charge).
6. **Resign** on the account page (counts as in writing, bylaws Art. 5; email copy). The page asks why (one or more reasons and a note, for the board), with a link to resign without a reason, since a reason is never a condition (Art. 5, Swiss Civil Code Art. 70). The board (Nadja, Bogdan, Faris) confirms in Slack or the admin area; open dues hold it; it ends with the paid period. Until then the member can **Resubscribe** on the account page (the board can undo it for them).
7. **Imported members** (paid manually (cash/bank)): imported through an admin endpoint, linked on first sign-in, accept the terms and switch to automatic payment with no charge before their paid period ends.

| Area         | Choice                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting      | Netlify only                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Database     | Postgres on Neon (owner, 11th November 2026; Netlify Database needs a plan the team does not have). `DATABASE_URL`; migrations in `apps/web/database/migrations`, applied before every Netlify build by `apps/web/scripts/db-migrate.mjs`. Production uses the Neon production branch; each deploy preview gets its own empty database (`pr_<number>`) on the Neon preview branch, dropped when the PR closes; local uses Docker |
| Sign-in      | Better Auth 1.7 with the magic-link plugin; its tables are the first migration; rate limits stored in the database                                                                                                                                                                                                                                                                                                               |
| Payments     | Stripe over plain fetch (`apps/web/src/server/membership-stripe.ts`); prices by lookup key; portal configuration without cancelling; webhook `/api/membership/webhook`                                                                                                                                                                                                                                                           |
| Email        | Resend, templates in `packages/emails` (sign-in link, welcome, renewal, payment failed, resignation received, confirmed and withdrawn, and the board notice that every email to hello@zurichjs.com uses)                                                                                                                                                                                                                         |
| Certificates | `pdf-lib` with Figtree, A4 landscape (`apps/web/src/server/certificate.ts`); the signature PNG in the private Netlify Blobs store `membership`                                                                                                                                                                                                                                                                                   |
| Slack        | notes for new members, renewals and failed payments; resignation cards (with the member's reasons) with Confirm and Undo for the approvers; the ZurichJS Bot answers membership questions (`docs/v2/AUTOMATION.md`)                                                                                                                                                                                                              |
| Data         | `packages/membership` (status machine, `postgresStore`); anonymised one year after a membership ends; Stripe keeps the payment records                                                                                                                                                                                                                                                                                           |
| Admin        | `/admin/memberships` for the board, behind the site-level password `ADMIN_PASSWORD`: members, details and history, confirm resignations, import, export                                                                                                                                                                                                                                                                          |
| Local        | `pnpm local` (Docker): site, Postgres, Mailpit, Stripe test mode with `stripe listen`, optional Studio                                                                                                                                                                                                                                                                                                                           |

**Status rules** (`packages/membership/src/state.ts`): `pending → active` (Stripe, first payment) · `active ⇄ past_due` (Stripe) · `active / past_due / imported_manual → resigning` (member) · `resigning → ended` (board confirms, or Stripe at period end) · `resigning → active / past_due / imported_manual` (undo, by the member or the board, back to the status before) · `ended → pending` (joins again). A resignation is first **with the board** (`resigned_at`), then **confirmed** (`resignation_confirmed_at`); the member and hello@zurichjs.com get an email at each step, and the board a Slack note. Members are told the board typically gets back to them within 72 hours. Every change is compare-and-set and logged in an append-only audit table.

**Still open:** the basic discount and which paid events are included each year (board; perks wait for it); the scheduled job that runs the one-year anonymisation; Swiss bookkeeping retention for payment records (10 years, OR Art. 958f, likely) to confirm with whoever keeps the books.

### Stripe

**Objects** (`pnpm membership:stripe-setup`, dry run first, then `--apply`): one product per level ("ZurichJS membership: Basic Member" and "…: Supporter"; the billing portal allows one price per interval on a product, so one shared product could not offer the level switch), four recurring CHF prices with lookup keys `member_<basic|supporter>_<quarterly|yearly>` (amounts from `apps/web/src/lib/membership.ts`), the billing portal configuration without cancelling (`STRIPE_MEMBER_PORTAL_CONFIG`) and, with `--webhook-url`, the webhook endpoint on the API version the site pins (`STRIPE_MEMBERSHIP_WEBHOOK_SECRET`). Test mode first; the owner runs it with the live key (production change).

**Lifecycle** (`apps/web/src/pages/api/membership/webhook.ts`):

| Stripe event                      | What happens                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `checkout.session.completed`      | subscription linked; an imported member switching to automatic payment becomes active (no charge until their paid period ends)                                                                               |
| `invoice.paid`                    | first payment and every renewal: active, paid until the period end, certificate emailed (welcome or renewal), Slack note                                                                                     |
| `invoice.payment_failed`          | declined renewal: active → past due; email with Stripe's payment page and the next retry date (one per attempt); Slack note                                                                                  |
| `invoice.payment_action_required` | the bank wants the member to confirm (3D Secure): the same, worded "confirm the payment"                                                                                                                     |
| `customer.subscription.updated`   | a scheduled level or cycle switch took effect at the renewal (`invoice.paid` also reads it, so the certificate shows the new level); Stripe reporting `past_due` or `unpaid` marks an active member past due |
| `customer.subscription.deleted`   | ended: resigned (the board confirmed) or lapsed (the retries ran out)                                                                                                                                        |

People still in Checkout get no failed-payment email (Checkout shows the error). Disputes and refunds are not handled by the site; Stripe emails the account owner.

**Dashboard settings** (Billing › Revenue recovery, once per account): Smart Retries on; when all retries fail, **cancel the subscription** (that sends `customer.subscription.deleted`, so the membership lapses); Stripe's own failed-payment and 3D Secure customer emails off, since the site sends them. Keep receipts and invoices on (they are the payment record).

Setup and day-to-day: `docs/v2/RUNBOOK.md`, "Membership (online)" and "Local development (Docker)".

---

# Original investigation (5th and 6th November 2026)

## Context

Today `/membership` is a request form only: `apps/web/src/pages/api/verein-inquiry.ts` emails and Slacks the organisers, who then sign people up and reconcile payments by hand. That is the admin overhead to remove. Target: people log in, apply, we approve in Slack, they sign the membership agreement on the site, a Stripe subscription starts, they see their status, perks and (later) AGM/voting notes, and cancellation goes through us, never self-serve. Existing manually signed and paid members get imported with their paid-until dates and moved onto automatic payment.

Status: phases, Supabase Pro, the payments rule and the legal page updates signed off by the owner (5th November 2026). Phases 1 (data layer), 2 (sign-in) and 3 (requests and Slack review) are built. Based on `v2/switchover` (PR #68). Source for the bylaws analysis: the Swiss JavaScript Group bylaws (Statuten), approved at the founding meeting on 23rd May 2025, held by the board.

## Decisions taken (owner, 5th November 2026)

| Area                        | Choice                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Member data                 | Supabase Postgres (EU region), row-level security. Sanity keeps public content only (level copy, perk descriptions) |
| Signed documents            | Supabase Storage, private bucket, short-lived signed URLs                                                           |
| Login                       | Email magic link through Supabase Auth; the email itself is sent by us through Resend (Supabase Send Email Hook)    |
| Email                       | Resend for every membership email, templates built on the design system (see Email)                                 |
| Signing                     | In-house click-to-sign (typed name, consent checkbox, PDF with audit trail)                                         |
| Approvals and cancellations | Slack buttons                                                                                                       |

## What the bylaws change (Statuten, approved 23.05.2025)

My reading of the text, not legal advice. Items marked **board** need a board decision or a GV amendment.

1. **Signing is fine as click-to-sign.** The bylaws set no form for joining (Art. 4: any person who supports the goals may join). The signed document is a membership declaration (Beitrittserklärung): accepting the bylaws (version stored), level, dues, cycle, resignation terms. The PDF embeds the bylaws version it accepted.
2. **No fixed commitment beyond the paid period.** Art. 5: resignation "at any time in writing to the Board, provided there are no outstanding dues". A 12-month lock-in on a quarterly plan has no basis in the bylaws. So "commitment period" = the billing period already paid (quarterly or yearly up front); resignation takes effect at the end of it, no refund. Longer commitments need a bylaw amendment at the GV (**board**). `commitmentEndsAt` is dropped from the model.
3. **Cancellation is a resignation, not a request we can refuse.** The board cannot say "Keep". The Slack card becomes **Confirm resignation** with an automatic check: if an invoice is open or `past_due`, it says so and the resignation waits until it is paid (that is the only bylaw condition). Members still cannot cancel in Stripe themselves, which matches "to the Board".
4. **"In writing"** (schriftlich): a resignation sent from the logged-in account counts as written notice to the board (owner, 6th November 2026). The member also gets an email copy of their resignation for the record.
5. **Two levels, one to one with the site.** Art. 4 also names Enthusiast and Advocate, but they do not exist yet (owner, 6th November 2026). The model has only Basic Member and Supporter; adding a level later is one migration (`alter type member_level add value`) and a row in `levels.ts`.
6. **Passive vs active is about attendance, not the fee.** Active = at least 40% of events per year. Voting on minor decisions is for active members; Supporter-level and up also have a say in dates and speakers. The record gets `category: passive | active`, set by the board each year at first (attendance data from Meetup/Sane can come later). Current `/membership` copy says Basic gets "vote on small decisions" without the attendance condition; flag in `CONTENT-SOURCES.md`, change only with the owner.
7. **Perks the bylaws name:** a basic discount set by the board (all members), and one paid event per year included for active members. The perk model needs a yearly entitlement (issued, redeemed) for that event, not just a list.
8. **Legal persons can join.** Record gets `kind: person | organisation`, organisation name and the signatory's name.
9. **Board actions beyond resignation:** expulsion (Statuten or Code of Conduct breach) and death or dissolution end membership and cancel Stripe immediately. Triggered from Slack (board members only) through the same API, both logged.
10. **GV support in the member area:** invitations go out electronically at least 14 days ahead (the system can enforce the 14 days when sending), an extraordinary GV needs 1/5 of active members (the member list gives that count), the annual accounts go to the GV for approval. AGM minutes, accounts and invitations become `member_documents` rows; online voting on board-proposed items is a later phase.
11. **Registered office** (Alderstrasse 30, 8008 Zurich) and the association name go on the declaration PDF and Stripe invoices.

## What exists and gets reused (verified in the repo)

- **Stripe over fetch, no SDK:** `apps/web/src/server/stripe.ts` (`stripeForm`, `stripe()` helper, `stripeApiBase` + `tools/mock-stripe.mjs` for local runs, `verifyStripeSignature`). Webhook pattern: `apps/web/src/pages/api/donate/webhook.ts`.
- **Slack buttons:** `apps/web/netlify/functions/slack-interactivity.mts` with `verifySlackRequest`, `allowlist(SLACK_PUBLISHER_IDS)` and the `waitUntil` 3-second pattern from `@zurichjs/agent`. Add membership `action_id`s here rather than a second interactivity URL (Slack apps allow one).
- **Email and Slack:** `sendEmail`, `postSlack` in `packages/integrations/src/index.ts`.
- **Form plumbing:** `server/http.ts` (`readJsonObject`, `text`, `isEmail`, `isBot`, `fail`, `json`), `server/rateLimit.ts`.
- **Fee table:** `apps/web/src/lib/membership.ts` (Basic 50/175, Supporter 75/250, quarterly/yearly). Stays the single source; Stripe prices are matched by `lookup_key` (`member_basic_quarterly`, …), with a test that Stripe amounts equal the table.
- **PDF:** `satori` + `@resvg/resvg-js` exist for OG images; the declaration PDF needs `pdf-lib` (new, pure JS).
- **New dependencies:** `@react-email/components` + `react` (in `packages/emails` only), `@supabase/supabase-js` (browser client for auth in the island; server client with the service-role key only in functions).

## Architecture

Static-first stays. Public pages stay prerendered. The member area is a static shell (`/membership/account`, `noindex`) with a Preact island. The island signs in with Supabase Auth and calls `prerender = false` API routes with the user's access token; functions verify it with Supabase and act with the service-role key. The browser never writes membership rows directly: every state change goes through a function, so Stripe, Slack and the audit log stay consistent. Gated content (AGM notes, documents) is only ever served by the API, never baked into HTML.

**Source of truth split:** Stripe owns billing state (customer, subscription, invoices). Supabase owns membership state, the signed declaration record and the audit log. Webhooks keep them in step.

### Data model (Supabase, migrations in `supabase/migrations`)

- `members`: `id`, `auth_user_id` (nullable for imported members until first login, linked by email), `email` (unique, citext), `kind` (person | organisation), name, organisation name, `level` (basic | supporter | enthusiast | advocate), `cycle`, `category` (passive | active, set by the board yearly), `status`, `ended_reason`, `source` (self_serve | imported), `joined_at`, `paid_until`, `payment_mode` (automatic | manual), `stripe_customer_id`, `stripe_subscription_id` (unique).
- `declarations`: member, version, signed_at, typed_name, ip, user_agent, sha256, storage path, `kind` (digital | paper_import).
- `declaration_versions`: version id, effective date, declaration text and the bylaws text it accepts (DE and EN).
- `member_events`: append-only audit (member, type, from/to status, actor: member | slack user id | stripe | script, payload, at). Insert-only by grants.
- `stripe_events`: processed event ids, for idempotent webhooks.
- `perks` (minimum level, `requires_active`, code or link) and `perk_entitlements` (member, perk, year, issued/redeemed; unique per member, perk, year) for the one included paid event per year.
- `member_documents`: GV invitations, minutes, annual accounts; minimum level / active-only; file in Storage.
- **RLS:** a member can `select` only their own `members`, `declarations`, `perk_entitlements` rows and the documents their level allows. No client-side insert or update. Functions use the service-role key.

**Status machine** (`packages/membership`, pure and unit-tested like `packages/events/src/state.ts`):
`applied → approved → signed → active → resigning → ended`, plus `rejected`, `past_due` (from Stripe), `imported_manual` (paid manually (cash/bank), valid until `paidUntil`), and `ended` reasons: resigned, expelled, deceased/dissolved. Every transition goes through one function that checks the allowed edges; the store writes the new status and the `member_events` row in one transaction (a Postgres function).

Signed PDFs go to a private Storage bucket `declarations`; downloads are signed URLs valid for a few minutes. The SHA-256 on the row proves a stored PDF is unchanged. `packages/membership` defines a `MemberStore` interface with a Supabase implementation and an in-memory one for tests.

### Flows

1. **Log in:** Supabase Auth magic link (`signInWithOtp`, redirect to `/membership/account`), implicit flow: PKCE links only work in the browser that asked for them, and members often open email on another device. The page reads the tokens from the link itself and removes them with `replaceState`, so they are not left in the browser history. Supabase's Send Email Hook calls `/api/membership/auth-email` (signed by Supabase), which sends our `login-link` template through Resend, so the login email looks like every other ZurichJS email and is not throttled by Supabase's sender. Signing in creates an auth user, not a member. The first login links an imported member by email.
2. **Apply:** logged-in `POST /api/membership/apply` {name, tier, cycle, message} → `member` with `applied` → Slack message in the organisers' channel with **Approve** / **Reject** (`action_id: member_approve|member_reject`, value = member id). Replaces `/api/verein-inquiry` (route kept, answering for old clients, until removed with a decision).
3. **Approve (Slack):** only the people in `SLACK_MEMBERSHIP_APPROVER_IDS`: Nadja, Bogdan and Faris (owner, 6th November 2026) → `approved` → email "sign your declaration" with a login link to `/membership/account`.
4. **Sign:** the account page shows the declaration and the bylaws in full (DE and EN), a typed full name, an explicit consent checkbox, and the level and cycle chosen. `POST /api/membership/sign` renders the PDF (agreement text, name, timestamp UTC + Zurich, IP, UA, version, hash), stores it in the private bucket, sets `signed`, emails the member a copy and Slacks the organisers.
5. **Pay:** only from `signed`. `POST /api/membership/checkout` → Stripe Checkout `mode=subscription`, price by lookup key, `customer` reused or created with `metadata.memberId`, `subscription_data.metadata.source = 'zurichjs.com/membership'`. Webhook `/api/membership/webhook` (own endpoint and secret, so donation handling stays untouched): `checkout.session.completed` → `active`; `invoice.paid` → move `paidUntil`; `invoice.payment_failed` → `past_due` + Slack; `customer.subscription.deleted` → `ended`. Idempotent on Stripe event id (`stripe_events`).
6. **No self-cancel:** a dedicated Stripe Billing Portal configuration (created once by script, id in `STRIPE_MEMBER_PORTAL_CONFIG`) with `subscription_cancel` and `subscription_update` disabled, payment-method and invoice history enabled. Portal sessions are created server-side per member (`billing_portal/sessions` with `configuration`), so the donation portal link is never used for members. A member can still dispute a charge with their card issuer; that is a policy matter for the terms, not something the system can block.
7. **Resign:** `POST /api/membership/resign` {reason?} → `resigning`, copy emailed to the member → Slack card **Confirm resignation** showing whether dues are outstanding. Confirm sets Stripe `cancel_at_period_end` (effective at the end of the paid period), then `ended` (resigned) on the webhook. If dues are open the card says so and Confirm is disabled until paid. Board actions **Expel** and **End (deceased/dissolved)** cancel immediately.
8. **Member area:** status, level, passive/active, next payment, paid until, download signed declaration, "Manage payment method" (portal session), perks (with the yearly included event), documents (GV invitations, minutes, annual accounts).

### Email (Resend, design-system templates)

**Approach (changed in phase 2, 6th November 2026):** templates are plain TypeScript in `packages/emails`, styled only from `@zurichjs/design/tokens`, rendered at send time to HTML and plain text, and sent with `sendMemberEmail` (`packages/integrations`; no `RESEND_API_KEY` means a stub log line). Not React Email, as first planned: its `@react-email/components` package is deprecated, and the `react-email` package that replaces it brings its CLI (socket.io, esbuild, babel) into a repo that pins and age-gates every dependency, while the site aliases React to Preact. Templates return blocks (paragraph, button, summary, link, success, error), so escaping and the layout live in one file. No Resend Templates sync: the code is the source, and Resend's dashboard shows every sent email. `pnpm --filter @zurichjs/emails preview <dir>` writes all templates for a look.

**Layout, from the brand rules:** black header with the logo, white content, black footer with the association name, registered office and a link to `/membership/account`; one pill button per email in yellow `#F1E271` with black text; 24px card radius for the one summary box (level, fee, dates); no kickers, dividers or gradients; green only on a success line, red only for a payment problem. Figtree is loaded with `@font-face` from a stable copy at `/fonts/figtree-var.woff2` (a test keeps it equal to the design package's file) and falls back to Helvetica, Arial and the site's stack where clients ignore web fonts (Gmail, Outlook). The logo is `/images/logo/wordmark-white-email.png`, rendered from the white wordmark SVG, since email clients do not show SVG. Copy follows AGENTS.md: plain, specific, no em dashes, DE copy later if bilingual emails are wanted.

**Templates (member-facing):**

| Template                | When                                              | Notes                                                                                  |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `login-link`            | every sign-in                                     | link valid for the Supabase OTP lifetime, "you didn't ask for this?" line              |
| `application-received`  | after applying                                    | level and cycle, what happens next                                                     |
| `application-approved`  | Slack Approve                                     | button: sign your declaration                                                          |
| `application-declined`  | Slack Reject                                      | neutral, optional reason, points to events (free for everyone)                         |
| `declaration-signed`    | after signing                                     | signed PDF attached, button: set up payment                                            |
| `membership-active`     | first payment                                     | level, fee, next payment date, perks link                                              |
| `payment-failed`        | `invoice.payment_failed`                          | button: update payment method (portal session)                                         |
| `renewal-reminder`      | 30 and 7 days before `paid_until`, manual members | button: switch to automatic payment                                                    |
| `switch-to-automatic`   | invite for imported members                       | explains no charge until `paid_until`                                                  |
| `resignation-received`  | member resigns                                    | written copy for the record (bylaws Art. 5), notes open dues if any                    |
| `resignation-confirmed` | board confirms                                    | end date, no further charges                                                           |
| `membership-ended`      | expulsion or other end                            | factual, no reason in the email body unless the board writes one                       |
| `gv-invitation`         | board sends a GV invite                           | refuses to send fewer than 14 days before the date (Art. 7), agenda and documents link |

Organiser notifications stay in Slack. Stripe keeps sending its own receipts and invoices (they are the payment record); its other customer emails are switched off in Stripe so members don't get two messages. Existing plain-text form emails (contact, partners, `verein-inquiry`) can move to the same layout later; out of scope here.

**Preview and tests:** `pnpm --filter @zurichjs/emails dev` (React Email preview) with sample props; snapshot tests of the rendered HTML and text per template; a test that each template's props are what the calling function passes; the visual-review screenshots include the emails at 390 and 600 px.

### Migrating existing members

- `tools/membership/import-members.mjs`: CSV (kind, name, organisation, email, level, cycle, category, joinedAt, paidUntil, signed paper declaration PDF path, notes) → `member` with `source: imported`, `status: imported_manual`, `paymentMode: manual`. Paper PDFs go to the private bucket as `declarations` with `kind: paper_import` and their hash. Dry run by default; writing needs `--apply`. Run against a staging Supabase project first.
- **Moving them to automatic payment:** the account page shows "Switch to automatic payment". Checkout in subscription mode with `subscription_data.trial_end = paidUntil` (no charge until what they already paid runs out; Stripe requires `trial_end` at least 48 h ahead, so near-expiry members are charged at signup). On success, `paymentMode: automatic`, status `active`. Imported members must re-sign the current declaration digitally before they can switch (owner, 6th November 2026; `canStartAutomaticPayment` in `state.ts`). The paper copy stays on file.
- **Reminders:** a scheduled function (pattern: `netlify/functions/scheduled-rebuild.mts`) emails imported manual members 30 and 7 days before `paidUntil`, and Slacks the organisers a weekly list of expiries. No automatic status change without a person.

### Admin surface

Slack for decisions (approve, reject, confirm resignation, expel, end), limited to an approver allowlist. The Supabase table editor for lookups and one-off fixes, with the rule that status changes go through the API (or a documented SQL function), never a raw edit, so the audit log and Stripe stay consistent. A small read-only organiser view in the site can come later if the table editor is too rough.

### Environments

Two Supabase projects: `zurichjs-members-staging` (deploy previews, tests) and `zurichjs-members` (production). Env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (build time, safe to ship), `SUPABASE_SERVICE_ROLE_KEY` (functions only, never `PUBLIC_`). Free tier pauses idle projects, so production needs Pro (about USD 25/month, to verify before deciding; spending money needs the owner).

## Rules this changes (owner sign-off, recorded in `docs/v2/DECISIONS.md` and `AGENTS.md`)

- AGENTS.md "Payments: only donations … Membership requests never charge anything" becomes "donations and Verein memberships through Stripe; membership is charged only after approval and a signed agreement."
- Legal pages are owner-only: the privacy policy needs member data, Supabase (processor, EU region), Stripe, Resend and signing evidence (IP, UA) added, and the terms/refund policy need the Art. 5 resignation terms (end of paid period, no refund). Drafted by an agent, approved by the owner.
- `/membership` copy: benefits per level vs the bylaws' active/passive rules (item 6 above).
- Production Stripe objects (prices, portal configuration, webhook) and the production Supabase project (and its plan) are production changes: scripts are written and tested in test mode; the owner runs them on live.
- `/membership` keeps its URL; new routes are `noindex` and excluded from the sitemap and `llms.txt`, so the SEO gate only needs allowlist entries for new routes.

## Answers (owner, 6th November 2026)

1. A resignation from the logged-in account counts as "in writing" (Art. 5).
2. Only Basic Member and Supporter exist; Enthusiast and Advocate are not modelled.
3. Nadja, Bogdan and Faris approve applications in Slack.
4. Imported members re-sign the declaration digitally before automatic payment.
5. **Retention:** member data is kept for one year after the membership ends, then anonymised (`member_anonymise` in the migration): name, email, organisation, notes, Stripe ids and the signing evidence (typed name, IP, browser) are removed, the signed PDFs and the auth user are deleted, and the row stays as a count with its level and dates. The function refuses before a year has passed.

**Still open:**

- **Board:** what the "basic discount" is, and which paid events are included each year (Art. 4). Perks and entitlements wait for this; nothing else does.
- **Accounting records (check with whoever keeps the books):** Swiss law most likely requires keeping bookkeeping records for 10 years (OR Art. 958f), which is longer than the one-year member data rule. Stripe invoices and payouts are those records, so the anonymisation never touches Stripe; only the member database is anonymised. My reading, not legal advice.

## Phases (one PR each; base branch to agree with the owner)

0. This investigation.
1. `packages/membership`: types, status machine, `MemberStore` (in-memory + Supabase), tests. Supabase migrations with RLS and tests against a local Supabase (`supabase start`). Import script with dry run.
2. `packages/emails` (layout, `login-link`, Resend sync, `sendTemplate`), Supabase Auth with the Send Email Hook, account shell page.
3. Apply + Slack approve/reject, with their templates. Each later phase adds its own templates.
4. Declaration versions, click-to-sign, PDF to private Storage.
5. Stripe prices, checkout, webhook, member portal configuration.
6. Member area: status, perks and entitlements, documents, resignation + Slack, board actions (expel, end).
7. Migration onboarding (`trial_end`), expiry reminders.
8. Legal page drafts, DECISIONS/AGENTS/RUNBOOK updates, retire `/api/verein-inquiry`.

Rough size: phases 1 to 6 are the core, about 2 to 3 focused weeks of agent work plus owner reviews (estimate).

## Risks

- PII in a new store: the service-role key bypasses RLS, so it lives only in function env and is never imported by island code (a lint rule or test greps the client bundle for it). RLS policies get their own tests.
- New vendor: Supabase outage means members cannot log in; public pages and donations are unaffected.
- Login depends on email: Resend domain verification (SPF, DKIM, DMARC on zurichjs.com; check what `FORMS_FROM` uses today) and the Send Email Hook. If the hook fails, Supabase cannot send the link, so the hook alerts Slack on failure.
- Stripe `trial_end` 48-hour minimum and proration for imported members; test each case against the mock and Stripe test mode.
- Webhook ordering: handle `invoice.paid` before `checkout.session.completed` safely (idempotent upserts keyed on member id).

## Verification (for the build phases)

- Unit: status machine edges, fee table equals Stripe lookup keys, signature checks for Stripe and Slack.
- RLS: as member A, cannot read member B; anon reads nothing; no client writes.
- Handler tests with injected fetch, like `apps/web/test/membership-subscribe-api.test.ts`.
- e2e journey against `tools/mock-stripe.mjs` (extended for subscriptions, portal sessions and webhooks): apply, approve via a signed fake Slack payload, sign, pay, resign (with and without open dues).
- Stripe test mode end to end on a deploy preview before any live object exists.
- Full repo gate: `pnpm lint && pnpm format:check && pnpm knip && pnpm typecheck && pnpm test`, deterministic build, `pnpm e2e`, SEO compare.
