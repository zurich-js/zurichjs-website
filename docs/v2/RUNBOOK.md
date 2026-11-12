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
   | `SANE_API_URL`, `SANE_WEB_URL`                        | optional; default to `https://api.sane.events` and `https://sane.events`. Set them only to point a build at another Sane (local, staging)      | free tickets on Sane for events with "Free tickets on Sane" filled in (build time only; no secret)                    |
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

## CFP bot in Slack (optional)

Anyone in the ZurichJS Slack can propose a talk by chatting with **@ZurichJS CFP** in `#cfp` ([CFP-BOT.md](./CFP-BOT.md)). It is a second Slack app (`slack/manifest.cfp.yml`), separate from the organisers' bot. Setup is in [AUTOMATION.md](./AUTOMATION.md), "The CFP bot". Its environment variables:

| Variable                                    | Value                                                                                                    | Used by                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `SLACK_CFP_BOT_TOKEN`                       | the CFP app's Bot User OAuth Token (`xoxb-…`)                                                            | `slack-cfp-*` functions                                   |
| `SLACK_CFP_SIGNING_SECRET`                  | the CFP app's Signing Secret (Basic Information)                                                         | `slack-cfp-*` functions; also signs the internal hand-off |
| `SLACK_CFP_CHANNEL_ID`                      | the public `#cfp` channel's ID, e.g. `C0123ABCD`                                                         | `slack-cfp-events`, `slack-cfp-interactivity`             |
| `CFP_LLM_MODEL`                             | the cheapest model of `LLM_PROVIDER`. Optional with `LLM_PROVIDER=anthropic`: default `claude-haiku-5-5` | `slack-cfp-background`                                    |
| `LLM_PROVIDER`, `LLM_API_KEY`               | the same as the organiser bot's (`LLM_BASE_URL` for `openai-compatible`). `LLM_MODEL` is never used here | `slack-cfp-background`                                    |
| `DATABASE_URL`                              | **already set** for membership: drafts and limits live in the same Neon database (`cfp_*` tables)        | drafts, rate limits, the daily clean-up                   |
| `CFP_MAX_MODEL_CALLS_PER_DAY`               | optional, default 400: model calls per day for everyone, which caps the cost                             | `slack-cfp-background`                                    |
| `SANITY_TOKEN`, `SLACK_BOT_TOKEN` + channel | **already set**: Submit uses the website form's own path, so the same token and organiser note           | `slack-cfp-interactivity` (Submit)                        |
| `SLACK_CFP_APP_TOKEN`                       | local only: the dev app's app-level token (`xapp-…`, `slack/manifest.cfp.dev.yml`)                       | `tools/slack-dev.mjs`                                     |

Without `SLACK_CFP_*` the functions answer Slack with 401 and do nothing; the rest of the site is unaffected. `slack-cfp-cleanup` runs daily and deletes drafts untouched for 14 days.

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

## Free tickets on Sane

An event can offer a free ticket on [Sane](https://sane.events) side by side with Meetup (owner decision). In Sanity, open the event, tab "Meetup", and fill in "Free tickets on Sane" with the organisation and event slugs from the Sane event link. Keep the Meetup event link too.

- Each build reads the event from Sane's public API (no key). While Sane's registration is open and the site shows RSVP open, the main button is "Get a free ticket" and goes to the Sane event page. In every other case the button is the Meetup one: RSVP, waitlist or follow.
- Sane is read only at build time. When Sane's state changes (opens, sells out), publish the event in Sanity or trigger a build so the button follows. Until then Sane's own page shows the current state.
- A draft event on Sane answers 404, and the site keeps Meetup until it is published there.

## When something fails

- **"Sanity is not reachable" on a production build:** this is deliberate. Production never ships sample content. Check Sanity's status and the token, then retry.
- **"SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN":** the preview site is missing its Viewer token.
- **"[media] IMAGEKIT_PRIVATE_KEY missing" or "ImageKit could not be read" failing a production build:** deliberate, so `/media` never ships empty. The previous deploy stays live. Check the key in Netlify (build scope) and ImageKit's status, then retry. To check the archive locally without the key: `node tools/imagekit-mock.mjs 4529 <listing.json> &` and build with `IMAGEKIT_API_URL=http://127.0.0.1:4529/v1/files IMAGEKIT_PRIVATE_KEY=dummy`.
- **"[sane] … could not be read":** the event links to Meetup in this build instead of Sane. Never fails the build. Check that the event is published on Sane and that the slugs in "Free tickets on Sane" match its link, then publish in Sanity (or trigger a build) to try again.
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

**Online joining is always on** (owner, 11th November 2026): `/membership` leads to sign-in and Stripe, with no switch. So finish the steps below and test on a deploy preview before the branch reaches production.

### Set up (owner, once)

1. **Database (Neon, project `tiny-firefly-25104662`):**
   - **Branches:** the default branch is production; create a second branch named `preview`. Previews never share production's database: each PR gets its own empty database, `pr_<number>`, on the preview branch.
   - **Netlify environment variables**, scoped by deploy context:
     - **Production:** `DATABASE_URL` is the pooled connection string of the production branch, and `DATABASE_URL_UNPOOLED` is its direct one.
     - **Deploy previews:** the same two, for the `preview` branch.
   - **Migrations:** every Netlify build runs `node scripts/db-migrate.mjs` first (`apps/web/netlify.toml`). It applies `apps/web/database/migrations`, each once, recorded in `schema_migrations`. A deploy preview creates `pr_<number>` on the preview branch and migrates it from scratch, so no production data reaches a preview. A production build without `DATABASE_URL` fails on purpose.
   - **Cleanup:** add the GitHub secret `NEON_PREVIEW_DATABASE_URL` (the preview branch's direct connection string). `.github/workflows/preview-db-cleanup.yml` drops a PR's database when the PR closes.
   - **Local:** the Docker Postgres (`pnpm local`, `MEMBERSHIP_DB_URL`). It wins over `DATABASE_URL`, so a Neon string in `.env` never reaches local data.
2. **Stripe (test mode first):** `STRIPE_SECRET_KEY=sk_test_… pnpm membership:stripe-setup --webhook-url https://zurichjs.com/api/membership/webhook` is a dry run; add `--apply` to create, in that Stripe account:
   - one product per level and four prices (lookup keys `member_<level>_<cycle>`, amounts from `apps/web/src/lib/membership.ts`),
   - the billing portal configuration without cancelling, which prints `STRIPE_MEMBER_PORTAL_CONFIG`,
   - the webhook endpoint with the six events (`checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.updated`, `customer.subscription.deleted`) on the API version the site pins. It prints the signing secret once: that is `STRIPE_MEMBERSHIP_WEBHOOK_SECRET`.

   Then set the Billing › Revenue recovery settings in `docs/v2/MEMBERSHIP.md`, "Stripe". Repeat everything with the live key when going live (owner: production change). Test and live are separate endpoints with separate secrets: in Netlify, scope the live `STRIPE_SECRET_KEY`, `STRIPE_MEMBER_PORTAL_CONFIG` and `STRIPE_MEMBERSHIP_WEBHOOK_SECRET` to the production context and the test ones to deploy previews.

   **How the webhook runs on Netlify:** `/api/membership/webhook` is an Astro route (`prerender = false`), so it runs in the site's server function; nothing else is deployed. It verifies Stripe's signature, updates Netlify Database, and sends the emails, Slack notes and (on `invoice.paid`) the certificate before answering. A failure answers 500 and Stripe retries for up to three days; every step is safe to receive twice (handled events are skipped, status changes are compare-and-set, one certificate per invoice, emails have idempotency keys). Netlify stops synchronous functions after about 10 seconds; `invoice.paid` does the most work, so watch its duration in the function logs after launch. If it gets close, move the certificate and emails to a background function. Stripe only calls the URL it was given: to test on a deploy preview, add a test-mode endpoint for that preview's URL, or use `pnpm local` (`stripe listen`).

3. **Signature:** `NETLIFY_AUTH_TOKEN=… pnpm membership:signature signature.png` (the PNG Faris supplied, black ink on transparent). Never commit it.
4. **Resend:** the sender is `MEMBERSHIP_FROM` (default `ZurichJS <hello@zurichjs.com>`); the domain must be verified in Resend.
5. **Slack:** invite @ZurichJS Bot to the membership channel.
6. **Environment variables** (functions unless noted):

| Variable                                | What                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Neon, per deploy context (production branch for production, the `preview` branch for deploy previews): pooled for the functions, direct for migrations |
| `BETTER_AUTH_SECRET`                    | secret; 32+ random characters (`openssl rand -base64 32`)                                                                                              |
| `BETTER_AUTH_URL`                       | optional; defaults to Netlify's URL (production) or the deploy URL (previews)                                                                          |
| `STRIPE_SECRET_KEY`                     | already set (donations)                                                                                                                                |
| `STRIPE_MEMBER_PORTAL_CONFIG`           | from `pnpm membership:stripe-setup`                                                                                                                    |
| `STRIPE_MEMBERSHIP_WEBHOOK_SECRET`      | secret; the membership webhook's signing secret (not the donations one)                                                                                |
| `RESEND_API_KEY`, `MEMBERSHIP_FROM`     | email                                                                                                                                                  |
| `SLACK_MEMBERSHIP_CHANNEL_ID`           | the channel for membership notes and resignation cards (falls back to `SLACK_AGENT_CHANNEL_ID`)                                                        |
| `SLACK_MEMBERSHIP_APPROVER_IDS`         | who may confirm resignations: `U08NAFH955M,U08NDGCRYPK,U08MMPMNLKZ` (Nadja, Bogdan, Faris)                                                             |
| `ADMIN_PASSWORD`                        | secret; the board's password, any length (owner's choice) for `/admin/memberships` and `pnpm membership:import`. Changing it signs everyone out.       |

### Add members who paid manually (cash/bank)

For someone who paid in cash or by transfer (owner, 11th November 2026): `/admin` › Memberships › **Add a member who paid manually (cash/bank)**. Give person or organisation, name, email, level, billing cycle and the month their paid term started; the form shows until when that covers them. Adding them:

1. records them as paid manually (cash/bank) until the term ends (one cycle from the first of the start month),
2. issues their certificate of membership for that term,
3. if the box is ticked, emails them the certificate and asks them to set up automatic payment: they sign in with that email, accept the terms and add a card. Stripe charges nothing before the term ends, then renews as usual (and issues the next certificate),
4. posts a note in the membership Slack channel.

One member per email address: adding the same address twice is refused. Many at once (an old list) still works from the command line with a CSV (columns in `packages/membership/src/import.ts`):

```bash
ADMIN_PASSWORD=… pnpm membership:import members.csv --site https://deploy-preview-78--zurichjs.netlify.app   # dry run on a preview
ADMIN_PASSWORD=… pnpm membership:import members.csv --apply                                                 # production
```

Each becomes "paid manually (cash/bank) until `paid_until`". When they first sign in with the same email, the account links to their record; they accept the terms and switch to automatic payment, with no charge before their paid period ends.

### Admin area (`/admin`: Memberships)

For the board, behind one shared password, `ADMIN_PASSWORD`. The site checks it on every deploy, production and previews alike, so it does not depend on Netlify's visitor access settings.

- **What it shows:** all members with search (name, email, organisation) and a status filter, the totals, and one member's details: terms accepted, certificates, Stripe ids, notes and the full history.
- **What it does:** confirm resignations (the same as the Slack button), import members (dry run first), export everyone as CSV (formulas neutralised for spreadsheets).
- **Invite someone to join:** for someone who asked to become a member. Enter who they are and the level and cycle they asked for. They get an email ("Your invitation to join ZurichJS") with a link to the account page, where they sign in with that email, accept the membership terms and pay with Stripe, renewing automatically. Until they pay they are listed as "Waiting for first payment" (source: invited by the board); the first payment makes them a member and sends the certificate. Inviting the same email again updates the choice and sends the email again; someone who is a member already is refused.
- **Protection:** the password is compared in constant time; 10 wrong attempts per IP block sign-ins for 15 minutes (counted in the database); the session is an httpOnly, SameSite=Strict cookie for the admin API only, 8 hours, signed with a key derived from the password, so a new password signs everyone out; writes are refused unless they come from the site itself. The page itself holds no data; every request is checked by the API.
- **Limits:** it is one shared password, so the history records "admin" rather than a person. Slack confirmations record the person's Slack id.

### Day to day

- **New members, renewals, failed payments** arrive in Slack as notes. Nothing to do.
- **Resignations** arrive as a card with **Confirm resignation** (Nadja, Bogdan, Faris). If dues are open it says so and waits. Confirming ends the subscription at the end of the paid period and emails the member.
- **Certificates** are issued per paid invoice; a member can download them all on their account page.
- **Data retention:** one year after a membership ends, `member_anonymise` removes the person (database function; the scheduled job that calls it is a follow-up). Stripe records are kept for the accounts.
