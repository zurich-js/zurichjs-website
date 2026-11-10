# Runbook: zurichjs.com

This runbook covers going live, the one-time Netlify and Sanity setup, how rebuilds happen, rollback, and what to do when a build fails. Decisions are in [DECISIONS.md](./DECISIONS.md).

The repository is one pnpm workspace:

- `apps/web` is the Astro 7 site.
- `packages/*` are the shared packages.
- `tools/*` holds the SEO gate, the local Netlify-like server and CI helpers.
- `e2e/` holds the Playwright tests.

## Go live (switchover, owner)

The switchover PR replaces the old Next.js app with this site. The steps below change the existing Netlify site that serves zurichjs.com. **DNS does not change.**

### Before merging

1. **Netlify › the zurichjs.com site › Site configuration › Build & deploy › Build settings**

   Not needed for the merge itself: the root `netlify.toml` sets the base directory to `apps/web`, and `apps/web/netlify.toml` sets `NETLIFY_NEXT_PLUGIN_SKIP` so the old app's Next.js plugin skips itself. That is what lets deploy previews of the switchover branch build while production (`main`) still uses the old settings. Don't change these settings before merging (they apply to every deploy, so production builds of the old app would break); make them right after, as cleanup:

   | Setting             | New value                                   |
   | ------------------- | ------------------------------------------- |
   | Base directory      | `apps/web`                                  |
   | Package directory   | empty                                       |
   | Build command       | empty (`apps/web/netlify.toml` sets it)     |
   | Publish directory   | empty (`netlify.toml`: `dist`)              |
   | Functions directory | empty (`netlify.toml`: `netlify/functions`) |

   Under Integrations › Build plugins, remove the Next.js plugin installed in the UI (until then it skips itself). Astro's own Netlify adapter takes over. Then `NETLIFY_NEXT_PLUGIN_SKIP` can go.

   Node 22.23.4 is pinned in `netlify.toml` and `.nvmrc`, because Astro 7.4 needs at least 22.23.4. pnpm installs the whole workspace from `apps/web`.

   Why base `apps/web`: `@netlify/config` showed that base `/` plus package `apps/web` resolves `publish` and `functions` against the repository root.

2. **Netlify › Environment variables.** The site reads the production variable names that already exist, so most of these are already set:

   | Variable                                              | Status                                                                                                                                         | Used by                                                                                                               |
   | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
   | `SANITY_TOKEN`                                        | **already set**; also read as the read and write token                                                                                         | build (if the dataset is private), forms, speaker feedback                                                            |
   | `JWT_SECRET`                                          | **already set**; keep the same value                                                                                                           | speaker feedback links                                                                                                |
   | `EMAIL_OCTOPUS_API_KEY`, `EMAIL_OCTOPUS_LIST_ID`      | **already set**                                                                                                                                | conference waitlist                                                                                                   |
   | `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`            | **already set**                                                                                                                                | form notifications. Alternatively, set `SLACK_WEBHOOK_URL`.                                                           |
   | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | **already set**. `PUBLIC_POSTHOG_*` also work.                                                                                                 | analytics                                                                                                             |
   | `SANITY_WEBHOOK_SECRET`                               | **add**: a long random string, also used in step 5                                                                                             | `/api/rebuild`                                                                                                        |
   | `NETLIFY_BUILD_HOOK_URL`                              | **add after step 4**                                                                                                                           | scheduled rebuilds                                                                                                    |
   | `RESEND_API_KEY`, `FORMS_TO`, `FORMS_FROM`            | optional. Without them, contact and partner forms still reach Sanity and Slack, but send no email.                                             | form emails                                                                                                           |
   | `STRIPE_SECRET_KEY`, `STRIPE_SUPPORT_PRODUCT_ID`      | **already set** (the old site's names). Use `sk_test_…` on deploy previews.                                                                    | online donations (`/donate`). Without them the form offers email, and Twint only when a Twint QR is in Site settings. |
   | `PUBLIC_STRIPE_PORTAL_URL`                            | **add**: the Stripe customer-portal login link (Stripe › Settings › Billing › Customer portal). Read at build time: redeploy after setting it. | "Manage or cancel your monthly donation". Without it, monthly donors are told to write to hello@zurichjs.com.         |
   | `STRIPE_WEBHOOK_SECRET`                               | optional: Stripe › Webhooks › `https://zurichjs.com/api/donate/webhook`, events `checkout.session.completed`, `customer.subscription.deleted`  | Slack message for new and cancelled donations                                                                         |
   | `IMAGEKIT_PRIVATE_KEY`                                | **already set**; keep it (build time only). **Required on production**: without it the build fails (`MEDIA_REQUIRE_IMAGEKIT`, below)           | the media archive and galleries                                                                                       |
   | `MEDIA_REQUIRE_IMAGEKIT`                              | set in `netlify.toml`: `1` for production, `0` for previews and branch deploys. The draft preview site never requires it                       | fail the build rather than ship an empty archive                                                                      |
   | `IMAGEKIT_API_URL`                                    | never in production; local checks only (`tools/imagekit-mock.mjs`)                                                                             | points the build at a mock of ImageKit's list API                                                                     |
   | `PUBLIC_GOOGLE_MAPS_EMBED_KEY`                        | optional: a Maps Embed API key restricted to `zurichjs.com/*`                                                                                  | "Show map" uses the Embed API; without it, Google's keyless embed.                                                    |
   | `SANITY_WRITE_TOKEN`, `SANITY_READ_TOKEN`             | optional                                                                                                                                       | separate tokens instead of `SANITY_TOKEN`                                                                             |
   - **Leave the old app's variables for a week**, so a rollback to an old deploy keeps working: `CLERK_*`, `PUSHOVER_*`, `GOOGLE_MAPS_API_KEY`, `INTERNAL_NOTIFICATION_SECRET`, `ZURICHJS_ADMIN_ORG_ID`, `NEXT_PUBLIC_BASE_URL`. Delete them afterwards. Keep `STRIPE_SECRET_KEY`, `STRIPE_SUPPORT_PRODUCT_ID` and `IMAGEKIT_PRIVATE_KEY`: V2 uses them.
   - **Production must read Sanity:** `netlify.toml` sets `CONTENT_REQUIRE_SANITY=1`, so a production build that cannot read Sanity fails instead of shipping sample content.

3. **Sanity Studio** (now `apps/studio` in this repo; its PRs #1 and #2 are merged):
   1. Add the repository secret `SANITY_DEPLOY_TOKEN` (GitHub › Settings › Secrets and variables › Actions): a Sanity API token with the "Deploy Studio" permission, from sanity.io/manage › API › Tokens. Merging this PR then deploys the Studio (Sanity 6, the new schema) through `.github/workflows/deploy-studio.yml`; later merges that touch `apps/studio` redeploy it. Without the secret the workflow skips with a notice, and **Actions › Deploy Studio › Run workflow** deploys it once the secret is set.
   2. Run the additive migration on `production`: a dry run first, then `--no-dry-run`.

   Every change is additive, so the old site keeps working with the new schema. 3. Content restore (drafts only, dry run first; see the Studio's `scripts/lib/drafts.ts`):
   - `npx sanity exec scripts/seed-partners.ts --with-user-token`: the production partner list with logos, kinds and "current". Confirm every "current" and add dates, then publish.
   - `npx sanity exec scripts/backfill-agenda.ts --with-user-token`: proposed agendas for events with talks but no agenda, with the problems it found. Correct the times, then publish.
   - `npx sanity exec scripts/clean-speaker-slugs.ts --with-user-token`: clean speaker IDs; old ones become 301s once published and rebuilt.
   - Site settings: paste a checked Slack invite link.

### Merge and verify

4. **Merge the switchover PR.** Netlify builds `main` with the new settings.
   - **If the build fails, the old site stays live**, because a failed build never replaces a deploy. Read the deploy log and fix forward, or follow "Roll back" below.
   - **Then add the build hook:** Build hooks › "Scheduled rebuild" on `main`. Copy its URL into `NETLIFY_BUILD_HOOK_URL` and trigger one more deploy.

5. **Sanity webhook.** In sanity.io/manage › project `viqjrovw` › API › Webhooks, create:

   | Setting     | Value                                                                                                             |
   | ----------- | ----------------------------------------------------------------------------------------------------------------- |
   | URL         | `https://zurichjs.com/api/rebuild`                                                                                |
   | Dataset     | `production`                                                                                                      |
   | Trigger on  | Create, Update, Delete                                                                                            |
   | Filter      | `_type in ["events", "talk", "speaker", "partner", "meetupRating", "conference", "siteSettings", "announcement"]` |
   | Drafts      | off                                                                                                               |
   | Projection  | `{_id, _type}`                                                                                                    |
   | HTTP method | POST                                                                                                              |
   | Secret      | the `SANITY_WEBHOOK_SECRET` value                                                                                 |

6. **Smoke test** on zurichjs.com:
   - **Pages:** home, `/events`, an upcoming event page, a past event page, a speaker, `/cfp`, `/donate`, `/today`.
   - **Old URLs:** `/partnerships`, `/buy-us-a-coffee`, `/workshops/react-performance`, `/api/og/home` and `/api/sitemap.xml` must each return a 301.
   - **Search and LLM files:** `/sitemap.xml`, `/robots.txt` and `/llms.txt` must load.
   - **A form:** send a contact message with your own address. It should arrive in Sanity and Slack, and in email if Resend is set.
   - **Stripe dashboard:** Settings › Customer emails › "Successful payments" must be on, because the donate and thanks pages say Stripe emails a receipt. The thanks page reads only sessions this site created (metadata `source: zurichjs.com/donate`).
   - **Donations, on a deploy preview with Stripe test keys:** a one-time and a monthly test donation with card 4242 4242 4242 4242; the thanks page shows the amount; cancel the test subscription in the Stripe dashboard. Never test with live keys.
   - **Feedback:** open an event with `?feedback=true`, rate one talk, rate it again (refused), and check the `feedback` document in the Studio has event, talk and speaker. Delete test documents afterwards (owner).
   - **Media:** `/media` lists the events from ImageKit; a gallery opens and plays a video.
   - **The webhook:** `curl -i -X POST https://zurichjs.com/api/rebuild` must answer `401`. Publishing any document in the Studio must lead to a deploy within about 4 minutes.
   - **The SEO gate against live content:**
     1. Run `CONTENT_REQUIRE_SANITY=1 pnpm build` with `SANITY_TOKEN` set.
     2. Run `node tools/seo/compare.mjs --base https://zurichjs.com`.

7. **Search engines.** In Google Search Console and Bing Webmaster Tools, submit `https://zurichjs.com/sitemap.xml` (it replaces `/api/sitemap.xml`). Watch coverage and 404s for two weeks.

8. **Optional:**
   - the Twint QR, in the Studio under Site settings › Support page
   - the draft preview site (below)

### Roll back

1. In Netlify › Deploys, open the last deploy of the old app and click "Publish deploy". This is instant.
2. To build the old app again, set the build settings back to their previous values (base `/`, the old build command) and revert the merge on `main`.

## Slack content agent (optional)

Organisers can update meetups from a private Slack channel. The agent writes drafts, and an organiser on the publish list presses **Publish**. Setup (the Slack app from `slack/manifest.yml`, a Sanity Editor token, a model API key) and the environment variables are in [AUTOMATION.md](./AUTOMATION.md).

## Draft preview site (optional, for editors)

Create a second Netlify site with the same repository and build settings, plus:

- `SANITY_PERSPECTIVE=drafts`
- `SANITY_READ_TOKEN`: a Sanity **Viewer** token. The build fails without it, because drafts are private.
- its own build hook in `NETLIFY_BUILD_HOOK_URL`, and its own `SANITY_WEBHOOK_SECRET`
- a second Sanity webhook to `https://<preview-site>/api/rebuild` with **Drafts on**
- `SANITY_STUDIO_PREVIEW_URL=https://<preview-site>` in the Studio's environment

Preview builds are noindex on every page, `robots.txt` disallows everything, and a "Draft preview" bar is shown. If your Netlify plan includes it, also password-protect the site (Access control); this is a paid feature on some plans.

## How rebuilds happen

The site is static, so content changes appear only after a rebuild.

| Trigger                            | Path                                                                                                                                                                                                                                         | Delay                   |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Publish in Sanity                  | The webhook calls `/api/rebuild`, which records a pending build in Netlify Blobs. `scheduled-rebuild` runs every 2 minutes and calls the build hook once nothing has been published for 2 minutes, so ten quick publishes produce one build. | 2–4 min, plus the build |
| An event's doors, and doors + 48 h | `scheduled-rebuild` reads `/state-changes.json`, which each build writes, and builds once per time. That build moves the event page to its live and feedback state, then to the recap.                                                       | ≤ 2 min, plus the build |
| Code merged to `main`              | Netlify builds automatically.                                                                                                                                                                                                                | the build               |

- **No nightly rebuild (owner).**
- **Between rebuilds,** the event islands re-check the clock in the browser, so the buttons people can press are always right.
- **Where the code lives:**
  - the logic and its tests: `apps/web/src/server/rebuild.ts`
  - the webhook: `apps/web/src/pages/api/rebuild.ts`
  - the timer: `apps/web/netlify/functions/scheduled-rebuild.mts`

**To force a rebuild:** in Netlify, go to Deploys › Trigger deploy, or run `curl -X POST "$NETLIFY_BUILD_HOOK_URL?trigger_title=Manual"`.

## When something fails

- **"Sanity is not reachable" on a production build:** this is deliberate. Production never ships sample content. Check Sanity's status and the token, then retry.
- **"SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN":** the preview site is missing its Viewer token.
- **"[media] IMAGEKIT_PRIVATE_KEY missing" or "ImageKit could not be read" failing a production build:** deliberate, so `/media` never ships empty. The previous deploy stays live. Check the key in Netlify (build scope) and ImageKit's status, then retry. To check the archive locally without the key: `node tools/imagekit-mock.mjs 4529 <listing.json> &` and build with `IMAGEKIT_API_URL=http://127.0.0.1:4529/v1/files IMAGEKIT_PRIVATE_KEY=dummy`.
- **A content change broke the build:** the previous deploy stays live. Fix or revert the document in Sanity's history.
- **CI, the SEO parity gate:** a URL, title, canonical URL, JSON-LD type or sitemap entry was lost. Fix it, or record an intentional change, with a reason, in `tools/seo/scope.json` or `allowlist.json`.
- **CI, visual regression:** the log's "Visual diff summary" step shows where each screenshot differs, and the `reports` artifact has the images. If the change is intended, run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots` and commit the new baselines. Chromium runs with fixed text rendering (`playwright.config.ts`), so baselines made locally on Linux match CI.

## CI (GitHub Actions)

| Workflow            | Runs on                        | What it checks                        |
| ------------------- | ------------------------------ | ------------------------------------- |
| `CI` (`ci.yml`)     | every PR, and pushes to `main` | See the two jobs below.               |
| `Dependency Review` | every PR                       | Blocks known-vulnerable dependencies. |

- **checks job:** oxlint, oxfmt, knip, `astro check` and `tsc`, Vitest, `pnpm audit`.
- **site job:**
  - the build, with sample content and a fixed clock
  - Playwright end-to-end, accessibility and visual regression at 390 and 1440 px
  - the SEO and LLM parity gate
  - Lighthouse on mobile: performance ≥ 0.9 as the median of 3 runs, accessibility and SEO = 1, best practices ≥ 0.95

Reports are uploaded as the `reports` artifact for 14 days.

A pre-commit hook (husky) runs oxfmt and oxlint on staged files, then a typecheck.

## Donations locally, without Stripe

`STRIPE_SECRET_KEY` is not on organisers' machines, so `/donate` on `localhost` answers "Online payments are not available right now". That is the expected fallback, not a bug. To try the whole flow, run the mock Stripe API (`tools/mock-stripe.mjs`; it never contacts Stripe):

```bash
node tools/mock-stripe.mjs 4533 &
cd apps/web && STRIPE_API_BASE=http://localhost:4533 STRIPE_SECRET_KEY=sk_test_mock STRIPE_SUPPORT_PRODUCT_ID=prod_mock pnpm exec astro dev --port 4532
```

The mock accepts only `sk_test_` keys, shows a "Mock Stripe Checkout" page with Pay and Back, and answers HTTP 500 for CHF 999 (to see the error state). `STRIPE_API_BASE` is ignored when `CONTEXT=production`. Pass the variables in the shell: `astro dev` here does not load Netlify or `.env` variables into the functions. The e2e journeys run the real handlers against the same mock.

Without the key (no `STRIPE_*` variables), "Continue to secure payment" answers "Online payments are not available right now. Nothing was charged." and names email, plus Twint only when a Twint QR is set in Site settings. Use that to check the unavailable state.

## Membership requests locally

`/api/verein-inquiry` charges nothing. Without `RESEND_API_KEY` and a Slack channel it logs a stub line and still answers `{ ok: true }`, so a local request sends nothing. The organisers' email lists name, email, tier, billing cycle, "Fee shown" (from `apps/web/src/lib/membership.ts`, the same table as the page) and the message. Change fees or benefits only in that file; the page, the API and the tests follow.

## Local development (Docker)

One command runs the site with everything it talks to:

```bash
pnpm local            # tools/local.sh: site, Postgres, Mailpit, Stripe test mode with stripe listen
pnpm local:studio     # the same plus the Sanity Studio
pnpm local:down       # stop (the local database keeps its data)
pnpm local:reset      # stop and delete the local database and the container installs
```

| Where                 | What                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| http://localhost:4321 | the site, with online membership on (`/membership`, `/membership/account`)                           |
| http://localhost:8025 | Mailpit: every email the site sends (sign-in links, certificate PDFs); SMTP on `localhost:1025`      |
| http://localhost:3333 | Sanity Studio (`pnpm local:studio`), against the real project: sign in with your Sanity account      |
| `localhost:54322`     | Postgres (`postgres` / `postgres`, database `zurichjs`), migrations applied by the `migrate` service |

**How to try the membership:** open `/membership`, choose a level, sign in with any email, open the link from Mailpit, join, pay in Stripe Checkout with a test card. The certificate arrives in Mailpit. Sign-in links are rate limited to 3 per 10 minutes per address; `pnpm local:reset` or `delete from "rateLimit"` clears that.

**Content:** sample content by default (offline). For real content, put a Sanity read token in `.env.local`: `SANITY_TOKEN=…` and `CONTENT_SOURCE=` (empty). Sanity has no local backend; the Studio container edits the real project, so the same care applies as in the hosted Studio (drafts; a person publishes).

**Email:** with `MAILPIT_URL` set, the site sends every email to Mailpit and needs no Resend key. `MAILPIT_URL` is ignored in production. The inbox survives restarts (`pnpm local:reset` clears it).

**Your signature on certificates:** put `MEMBERSHIP_SIGNATURE_FILE=/app/.local/signature.png` in `.env` or `.env.local` (a path inside the container, where the repository is `/app`) with the PNG inside the repository folder but not committed (e.g. `.local/signature.png`; `.local` is git-ignored). Production reads it from Netlify Blobs instead (below).

**Stripe:** always test mode (a sandbox; nothing is charged), never the mock. `pnpm local` needs the Stripe CLI (`brew install stripe/stripe-cli/stripe`) and, in `.env` or `.env.local` (which wins), the sandbox's `STRIPE_SECRET_KEY=sk_test_…` (a live key is refused) and `STRIPE_MEMBER_PORTAL_CONFIG` from `STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --apply`. It runs `stripe listen` for the membership events and gives the site the listener's signing secret, so start the stack with `pnpm local`, not `docker compose up`. Pay with test cards: `4242 4242 4242 4242` pays, `4000 0000 0000 0341` attaches but declines later charges (a failed renewal), `4000 0027 6000 3184` needs 3D Secure. To play renewals and retries without waiting, give the customer a test clock in the dashboard and advance it.

Settings from `.env.local` reach the `web` service, except the ones `docker-compose.yml` sets itself, which win. Nothing here reaches Resend, Slack or Netlify. Without Docker, the same pieces run natively: Mailpit (`brew install mailpit`, or its binary, then `MAILPIT_URL=http://localhost:8025`), a Postgres with `tools/docker/migrate.sh` applied and `MEMBERSHIP_DB_URL` pointing at it, the Stripe keys above and `stripe listen --forward-to localhost:4321/api/membership/webhook`. `tools/mock-stripe.mjs` remains for the tests and e2e, which run without a Stripe key.

## Membership (online)

How it works: `docs/v2/MEMBERSHIP.md`. Anyone can join: sign in by email link, choose Basic Member or Supporter and quarterly or yearly, accept the membership terms, pay in Stripe Checkout. The first payment makes them a member; every paid term issues a certificate of membership (PDF, signed by the president), emailed and in the portal. Members manage payment and cycle in the Stripe portal (no cancelling) and resign on their account page; the board confirms resignations in Slack.

**Production stays on the email form** (`/api/verein-inquiry`) until `PUBLIC_MEMBERSHIP_ONLINE=on` is set (build time) and a deploy runs. Set it only after the steps below, the terms page approval and a test on a deploy preview.

### Set up (owner, once)

1. **Database:** Netlify Database is provisioned on deploy because `@netlify/database` is a dependency and `apps/web/netlify/database/migrations` exists; Netlify applies the migrations before each deploy goes live. Check in the Netlify UI that the database exists after the first deploy of this branch. Deploy previews get their own database branch, forked from production data. That copy is protected by the site itself, the same as production: members only ever see their own record (signed in by email link), and everything else is behind the admin password (below). No Netlify visitor password is needed.
2. **Stripe (test mode first):** `STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup` (dry run), then `--apply`. It creates the membership product, four prices (lookup keys `member_<level>_<cycle>`, amounts from `apps/web/src/lib/membership.ts`) and the billing portal configuration (no cancelling), and prints `STRIPE_MEMBER_PORTAL_CONFIG`. Then Stripe › Webhooks › Add endpoint: `https://zurichjs.com/api/membership/webhook`, events `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`; copy its secret. Repeat in live mode when going live.
3. **Signature:** `NETLIFY_AUTH_TOKEN=… pnpm membership:signature signature.png` (the PNG Faris supplied, black ink on transparent). Never commit it.
4. **Resend:** the sender is `MEMBERSHIP_FROM` (default `ZurichJS <hello@zurichjs.com>`); the domain must be verified in Resend.
5. **Slack:** invite @ZurichJS Bot to the membership channel.
6. **Environment variables** (functions unless noted):

| Variable                            | What                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETLIFY_DB_URL`                    | set by Netlify                                                                                                                                    |
| `BETTER_AUTH_SECRET`                | secret; 32+ random characters (`openssl rand -base64 32`)                                                                                         |
| `BETTER_AUTH_URL`                   | optional; defaults to Netlify's URL (production) or the deploy URL (previews)                                                                     |
| `STRIPE_SECRET_KEY`                 | already set (donations)                                                                                                                           |
| `STRIPE_MEMBER_PORTAL_CONFIG`       | from `pnpm membership:stripe-setup`                                                                                                               |
| `STRIPE_MEMBERSHIP_WEBHOOK_SECRET`  | secret; the membership webhook's signing secret (not the donations one)                                                                           |
| `RESEND_API_KEY`, `MEMBERSHIP_FROM` | email                                                                                                                                             |
| `SLACK_MEMBERSHIP_CHANNEL_ID`       | the channel for membership notes and resignation cards (falls back to `SLACK_AGENT_CHANNEL_ID`)                                                   |
| `SLACK_MEMBERSHIP_APPROVER_IDS`     | who may confirm resignations: `U08NAFH955M,U08NDGCRYPK,U08MMPMNLKZ` (Nadja, Bogdan, Faris)                                                        |
| `MEMBERSHIP_ADMIN_PASSWORD`         | secret; 16+ characters (a passphrase): the board's password for `/membership/admin` and `pnpm membership:import`. Changing it signs everyone out. |
| `PUBLIC_MEMBERSHIP_ONLINE`          | build time; `on` switches `/membership` to online joining                                                                                         |

### Import existing members

Members who joined on paper and pay by hand. CSV columns in `packages/membership/src/import.ts`. Easiest in the admin area (`/membership/admin` › Import members: Check, then Import). From the command line, the same endpoint with the admin password (member data never goes into git, and Netlify Database changes go through the application):

```bash
MEMBERSHIP_ADMIN_PASSWORD=… pnpm membership:import members.csv --site https://deploy-preview-78--zurichjs.netlify.app   # dry run on a preview
MEMBERSHIP_ADMIN_PASSWORD=… pnpm membership:import members.csv --apply                                                 # production
```

Each becomes "paid by hand until `paid_until`". When they first sign in with the same email, the account links to their record; they accept the terms and switch to automatic payment, with no charge before their paid period ends.

### Admin area (`/membership/admin`)

For the board, behind one shared password, `MEMBERSHIP_ADMIN_PASSWORD`. The site checks it on every deploy, production and previews alike, so it does not depend on Netlify's visitor access settings.

- **What it shows:** all members with search (name, email, organisation) and a status filter, the totals, and one member's details: terms accepted, certificates, Stripe ids, notes and the full history.
- **What it does:** confirm resignations (the same as the Slack button), import members (dry run first), export everyone as CSV (formulas neutralised for spreadsheets).
- **Protection:** the password is compared in constant time; 10 wrong attempts per IP block sign-ins for 15 minutes (counted in the database); the session is an httpOnly, SameSite=Strict cookie for the admin API only, 8 hours, signed with a key derived from the password, so a new password signs everyone out; writes are refused unless they come from the site itself. The page itself holds no data; every request is checked by the API.
- **Limits:** it is one shared password, so the history records "admin" rather than a person. Slack confirmations record the person's Slack id.

### Day to day

- **New members, renewals, failed payments** arrive in Slack as notes. Nothing to do.
- **Resignations** arrive as a card with **Confirm resignation** (Nadja, Bogdan, Faris). If dues are open it says so and waits. Confirming ends the subscription at the end of the paid period and emails the member.
- **Certificates** are issued per paid invoice; a member can download them all on their account page.
- **Data retention:** one year after a membership ends, `member_anonymise` removes the person (database function; the scheduled job that calls it is a follow-up). Stripe records are kept for the accounts.
