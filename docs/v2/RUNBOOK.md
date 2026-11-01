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

   | Setting             | New value                                   |
   | ------------------- | ------------------------------------------- |
   | Base directory      | `apps/web`                                  |
   | Package directory   | empty                                       |
   | Build command       | empty (`apps/web/netlify.toml` sets it)     |
   | Publish directory   | empty (`netlify.toml`: `dist`)              |
   | Functions directory | empty (`netlify.toml`: `netlify/functions`) |

   Under Integrations › Build plugins, remove any Next.js plugin installed in the UI. Astro's own Netlify adapter takes over.

   Node 22.23.4 is pinned in `netlify.toml` and `.nvmrc`, because Astro 7.4 needs at least 22.23.4. pnpm installs the whole workspace from `apps/web`.

   Why base `apps/web`: `@netlify/config` showed that base `/` plus package `apps/web` resolves `publish` and `functions` against the repository root.

2. **Netlify › Environment variables.** The site reads the production variable names that already exist, so most of these are already set:

   | Variable                                              | Status                                                                                             | Used by                                                     |
   | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
   | `SANITY_TOKEN`                                        | **already set**; also read as the read and write token                                             | build (if the dataset is private), forms, speaker feedback  |
   | `JWT_SECRET`                                          | **already set**; keep the same value                                                               | speaker feedback links                                      |
   | `EMAIL_OCTOPUS_API_KEY`, `EMAIL_OCTOPUS_LIST_ID`      | **already set**                                                                                    | conference waitlist                                         |
   | `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`            | **already set**                                                                                    | form notifications. Alternatively, set `SLACK_WEBHOOK_URL`. |
   | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | **already set**. `PUBLIC_POSTHOG_*` also work.                                                     | analytics                                                   |
   | `SANITY_WEBHOOK_SECRET`                               | **add**: a long random string, also used in step 5                                                 | `/api/rebuild`                                              |
   | `NETLIFY_BUILD_HOOK_URL`                              | **add after step 4**                                                                               | scheduled rebuilds                                          |
   | `RESEND_API_KEY`, `FORMS_TO`, `FORMS_FROM`            | optional. Without them, contact and partner forms still reach Sanity and Slack, but send no email. | form emails                                                 |
   | `SANITY_WRITE_TOKEN`, `SANITY_READ_TOKEN`             | optional                                                                                           | separate tokens instead of `SANITY_TOKEN`                   |
   - **Leave the old app's variables for a week**, so a rollback to an old deploy keeps working: `CLERK_*`, `STRIPE_*`, `IMAGEKIT_*`, `PUSHOVER_*`, `GOOGLE_MAPS_API_KEY`, `INTERNAL_NOTIFICATION_SECRET`, `ZURICHJS_ADMIN_ORG_ID`, `NEXT_PUBLIC_BASE_URL`. Delete them afterwards.
   - **Production must read Sanity:** `netlify.toml` sets `CONTENT_REQUIRE_SANITY=1`, so a production build that cannot read Sanity fails instead of shipping sample content.

3. **Sanity Studio** (zurich-js/zurich-js-website-sanity-studio#1):
   1. Merge the PR and run `sanity deploy`.
   2. Run the additive migration on `production`: a dry run first, then `--no-dry-run`.

   Every change is additive, so the old site keeps working with the new schema.

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
