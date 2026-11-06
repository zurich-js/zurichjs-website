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

## Member database (Supabase)

Self-serve membership is being built in phases (`docs/v2/MEMBERSHIP.md`). Phase 1 added the database and the import, phase 2 the sign-in and `/membership/account` (shows the membership; applying, signing and paying come later). `/membership` still sends requests by email as before.

**Set up (owner, once):**

1. Create two Supabase projects in an EU region: `zurichjs-members-staging` and `zurichjs-members` (production, Pro plan so it is never paused).
2. Apply `supabase/migrations/*.sql` in order, staging first (Supabase SQL editor, or `supabase db push` with the CLI linked to the project).
3. Check the staging project by hand once: as a signed-in test user, `select * from members` fails, `select name from members` returns only that user's row; the `declarations` and `member-documents` buckets are private.

| Variable                        | Where                                    | Used by                                                                                                                                                     |
| ------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`                  | functions and organisers' shells         | the member store, the import                                                                                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | functions and organisers' shells, secret | the same; bypasses row-level security, so never `PUBLIC_` and never in browser code                                                                         |
| `SLACK_MEMBERSHIP_APPROVER_IDS` | functions                                | who may approve or reject applications in Slack: `U08NAFH955M,U08NDGCRYPK,U08MMPMNLKZ` (Nadja, Bogdan, Faris; owner, 6th November 2026). Used from phase 3. |

**Import existing members** (signed on paper, paid by hand). The CSV columns are described in `packages/membership/src/import.ts`; put each scanned declaration PDF next to the CSV.

```bash
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm membership:import members.csv           # dry run: lists every member, writes nothing
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… pnpm membership:import members.csv --apply   # writes
```

The dry run stops on any problem (with line numbers) and on emails already in the database. With `--apply`, each member becomes "paid by hand until `paid_until`", the PDF goes to the private `declarations` bucket with its SHA-256, and the creation is in the audit log. Run it on staging first: `--apply` has been tested only against the local stand-in, not a real project yet.

**Tests:** `pnpm test` runs the migration on a throwaway local Postgres (needs the `postgresql` package; skipped without it) and checks the access rules.

### Member sign-in (phase 2)

Members sign in with an emailed link (Supabase Auth, no passwords). Supabase does not send the email itself: its Send Email Hook calls `/api/membership/auth-email`, which sends the ZurichJS email through Resend.

**Supabase project settings (owner, once per project):**

1. Authentication › Sign In / Providers: Email on; "Confirm email" on.
2. Authentication › URL Configuration: Site URL `https://zurichjs.com`; Redirect URLs `https://zurichjs.com/membership/account`, plus `http://localhost:4321/membership/account` on staging and the deploy-preview pattern for previews.
3. Authentication › Hooks › Send Email: HTTPS, `https://zurichjs.com/api/membership/auth-email` (staging: the preview URL). Generate the secret and copy it into `SUPABASE_AUTH_HOOK_SECRET`.
4. Email OTP expiry (Authentication › Sign In / Providers › Email): keep `SUPABASE_OTP_EXPIRY_MINUTES` the same, so the email states the right lifetime.
5. Use asymmetric JWT signing keys if offered (Supabase recommends them); the site checks tokens with `/auth/v1/user`, which works with either.

| Variable                      | Where                      | What                                                                                    |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`         | build (read at build time) | the project URL, for the sign-in form; without it the page says accounts are not ready  |
| `PUBLIC_SUPABASE_ANON_KEY`    | build                      | the publishable (anon) key: public by design, row-level security protects the data      |
| `SUPABASE_AUTH_HOOK_SECRET`   | functions, secret          | `v1,whsec_…` from the Send Email hook; without it every sign-in email is refused        |
| `SUPABASE_OTP_EXPIRY_MINUTES` | functions                  | optional, default 60: the link lifetime stated in the email                             |
| `MEMBERSHIP_FROM`             | functions                  | optional, default `ZurichJS <hello@zurichjs.com>`: the sender of member emails (Resend) |

**Locally:** without the `PUBLIC_SUPABASE_*` variables `/membership/account` says accounts are not available yet. Without `RESEND_API_KEY` the hook logs a stub line instead of sending. To see an email: `pnpm --filter @zurichjs/emails preview <folder>` writes every template as HTML and text.
