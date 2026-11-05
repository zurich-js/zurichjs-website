# Verein membership: self-serve subscriptions (investigation)

## Context

Today `/membership` is a request form only: `apps/web/src/pages/api/verein-inquiry.ts` emails and Slacks the organisers, who then sign people up and reconcile payments by hand. That is the admin overhead to remove. Target: people log in, apply, we approve in Slack, they sign the membership agreement on the site, a Stripe subscription starts, they see their status, perks and (later) AGM/voting notes, and cancellation goes through us, never self-serve. Existing manually signed and paid members get imported with their paid-until dates and moved onto automatic payment.

Status: investigation only, no code yet (5th November 2026). Based on `v2/switchover` (PR #68). Build starts once the open questions are answered and the owner signs off the phases. Source for the bylaws analysis: the Swiss JavaScript Group bylaws (Statuten), approved at the founding meeting on 23rd May 2025, held by the board.

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
4. **"In writing"** (schriftlich). Whether a request from the logged-in account plus our confirmation email counts is a **board** call; the clean fix is amending Art. 5 at the next GV to "in writing or electronically". Until then the account flow also emails the member a copy of their resignation for the record.
5. **Four levels, not two.** Art. 4 lists Basic Member, Supporter, Enthusiast, Advocate. The site has two. The model and Stripe lookup keys cover all four; Enthusiast and Advocate stay hidden until the owner sets fees and benefits (**owner**).
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
`applied → approved → signed → active → resigning → ended`, plus `rejected`, `past_due` (from Stripe), `imported_manual` (paid by hand, valid until `paidUntil`), and `ended` reasons: resigned, expelled, deceased/dissolved. Every transition goes through one function that checks the allowed edges; the store writes the new status and the `member_events` row in one transaction (a Postgres function).

Signed PDFs go to a private Storage bucket `declarations`; downloads are signed URLs valid for a few minutes. The SHA-256 on the row proves a stored PDF is unchanged. `packages/membership` defines a `MemberStore` interface with a Supabase implementation and an in-memory one for tests.

### Flows

1. **Log in:** Supabase Auth magic link (`signInWithOtp`, redirect to `/membership/account`). Supabase's Send Email Hook calls `/api/membership/auth-email` (signed by Supabase), which sends our `login-link` template through Resend, so the login email looks like every other ZurichJS email and is not throttled by Supabase's sender. Signing in creates an auth user, not a member. The first login links an imported member by email.
2. **Apply:** logged-in `POST /api/membership/apply` {name, tier, cycle, message} → `member` with `applied` → Slack message in the organisers' channel with **Approve** / **Reject** (`action_id: member_approve|member_reject`, value = member id). Replaces `/api/verein-inquiry` (route kept, answering for old clients, until removed with a decision).
3. **Approve (Slack):** only `SLACK_PUBLISHER_IDS` (or a new `SLACK_MEMBERSHIP_APPROVER_IDS`) → `approved` → email "sign your declaration" with a login link to `/membership/account`.
4. **Sign:** the account page shows the declaration and the bylaws in full (DE and EN), a typed full name, an explicit consent checkbox, and the level and cycle chosen. `POST /api/membership/sign` renders the PDF (agreement text, name, timestamp UTC + Zurich, IP, UA, version, hash), stores it in the private bucket, sets `signed`, emails the member a copy and Slacks the organisers.
5. **Pay:** only from `signed`. `POST /api/membership/checkout` → Stripe Checkout `mode=subscription`, price by lookup key, `customer` reused or created with `metadata.memberId`, `subscription_data.metadata.source = 'zurichjs.com/membership'`. Webhook `/api/membership/webhook` (own endpoint and secret, so donation handling stays untouched): `checkout.session.completed` → `active`; `invoice.paid` → move `paidUntil`; `invoice.payment_failed` → `past_due` + Slack; `customer.subscription.deleted` → `ended`. Idempotent on Stripe event id (`stripe_events`).
6. **No self-cancel:** a dedicated Stripe Billing Portal configuration (created once by script, id in `STRIPE_MEMBER_PORTAL_CONFIG`) with `subscription_cancel` and `subscription_update` disabled, payment-method and invoice history enabled. Portal sessions are created server-side per member (`billing_portal/sessions` with `configuration`), so the donation portal link is never used for members. A member can still dispute a charge with their card issuer; that is a policy matter for the terms, not something the system can block.
7. **Resign:** `POST /api/membership/resign` {reason?} → `resigning`, copy emailed to the member → Slack card **Confirm resignation** showing whether dues are outstanding. Confirm sets Stripe `cancel_at_period_end` (effective at the end of the paid period), then `ended` (resigned) on the webhook. If dues are open the card says so and Confirm is disabled until paid. Board actions **Expel** and **End (deceased/dissolved)** cancel immediately.
8. **Member area:** status, level, passive/active, next payment, paid until, download signed declaration, "Manage payment method" (portal session), perks (with the yearly included event), documents (GV invitations, minutes, annual accounts).

### Email (Resend, design-system templates)

**Approach:** templates live in the repo, in a new `packages/emails`, built with React Email components and styled only from `@zurichjs/design/tokens` (colours, radii, Figtree with its fallbacks). Each template exports a typed props interface, a subject, and renders to HTML and plain text. A script (`pnpm --filter @zurichjs/emails sync`) publishes them to Resend Templates so they show and can be test-sent from the Resend dashboard; the repo stays the source of truth and a test fails if a published template is older than the code (dashboard edits are overwritten, by design). Sending goes through one `sendTemplate(env, name, to, props)` in `packages/integrations`, which keeps today's behaviour: no `RESEND_API_KEY` means a stub log line, never a crash. (Resend's template API details, such as variables and publish/alias, to verify against their current docs in phase 1.)

React Email needs React for rendering only; it runs in functions and scripts, never in the site's Preact bundle (knip and a bundle check keep it out).

**Layout, from the brand rules:** black header with the logo, white content, black footer with the association name, registered office and a link to `/membership/account`; one pill button per email in yellow `#F1E271` with black text; 24px card radius for the one summary box (level, fee, dates); no kickers, dividers or gradients; green only on a success line, red only for a payment problem. Figtree is loaded with `@font-face` and falls back to the same system stack as the site, since Gmail and Outlook ignore web fonts (**owner**: accept the fallback in email). Copy follows AGENTS.md: plain, specific, no em dashes, DE copy later if bilingual emails are wanted.

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
- **Moving them to automatic payment:** the account page shows "Switch to automatic payment". Checkout in subscription mode with `subscription_data.trial_end = paidUntil` (no charge until what they already paid runs out; Stripe requires `trial_end` at least 48 h ahead, so near-expiry members are charged at signup). On success, `paymentMode: automatic`, status `active`. Imported members who never signed digitally can be asked to sign the current version first (open question 5).
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

## Open questions (after reading the bylaws)

1. **Board:** does an account request plus our email confirmation count as "in writing" for resignation, or do we amend Art. 5 at the next GV?
2. **Owner:** fees and benefits for Enthusiast and Advocate, or keep them hidden for now.
3. **Board:** who may approve admissions in Slack (the bylaws let the board delegate; Art. 8). Approval itself is our policy, not a bylaw requirement.
4. **Board:** the "basic discount" and which paid event counts as the included one per year.
5. **Owner:** do imported members re-sign the declaration digitally, or does the paper copy stand.
6. Data to keep per member (address?) and retention after leaving, for the privacy policy.

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
