---
type: System
title: Netlify deploys
description: How zurichjs.com builds and deploys on Netlify, the owner's go-live steps, rollback, and the optional draft preview site.
tags: [operations, netlify, deploy]
timestamp: '2026-11-24T00:00:00Z'
---

# Netlify deploys

Production deploys are owner actions. Agents never deploy.

## How a deploy builds

- **Base directory `apps/web`, no package directory.** The root `netlify.toml` sets `base = "apps/web"`; Netlify then reads `apps/web/netlify.toml` for everything else, and pnpm installs the whole workspace from there. Resolving the config with `@netlify/config` showed that base `/` plus package `apps/web` would resolve `publish` and `functions` against the repository root, which is why the base is `apps/web`.
- **Build command:** `node scripts/db-migrate.mjs && node scripts/bundle-functions.mjs && pnpm --filter @zurichjs/web build`. The membership database is migrated first ([Membership](/domains/membership/overview.md)); a production build without `DATABASE_URL` fails on purpose. Then the Netlify Functions are bundled with esbuild ([Web app](/systems/web.md)).
- **Publish** `dist`, **functions** `netlify/functions` locally and `.netlify/functions-bundled` on production, deploy previews and branch deploys, **Node** 22.23.4 (`NODE_VERSION`, the same as `.nvmrc`; Astro 7.4 needs at least 22.23.4).
- **Production must read Sanity and ImageKit:** `CONTENT_REQUIRE_SANITY=1` and `MEDIA_REQUIRE_IMAGEKIT=1`, so a production build that would ship sample content or an empty media archive fails, and the previous deploy stays live. Deploy previews and branch deploys set both to `0`.
- **`NETLIFY_NEXT_PLUGIN_SKIP=true`** makes the old app's Next.js plugin, still installed from the Netlify UI, skip itself on an Astro build (checked in `@netlify/plugin-nextjs` 5.16.3).
- **A failed build never replaces a deploy,** so the site stays up when a build fails.
- **Code merged to `main`** builds automatically; content builds come from the rebuild triggers ([Rebuilds](/systems/operations/rebuilds.md)).

## Function time limits

Netlify stops a synchronous function (every `/api/*` route) after 60 seconds, a scheduled function after 30 seconds and a background function after 15 minutes, with no answer or log line from the code (Netlify's function configuration docs, checked 24th November 2026). The site keeps inside them:

- **Database:** a connection gives up after 5 s and a query after 10 s (`DB_TIMEOUTS` in `apps/web/src/server/db-url.ts`), so a database that hangs gets the route's own 502. The limits are per connection and per query, not for a route's sequence of queries.
- **Outbound calls:** the sponsorship routes give all their Stripe, Resend, Slack and Sanity calls one 50 s budget, and the daily sponsorship check 25 s (`apps/web/src/server/deadline.ts`). No call starts once the budget is spent, and a call still waiting when it runs out is aborted with `DeadlineExceeded`. A Checkout or payment link close stopped that way keeps its saved id. Membership and donation routes keep only each call's own timeout.

## Go live (owner steps)

These steps switch the existing Netlify site that serves zurichjs.com from the old Next.js app to this site. DNS does not change.

### Not verified

Whether these steps have been carried out could not be checked from the repository. The two cleanup items in `apps/web/netlify.toml` (the Next.js plugin and `NETLIFY_NEXT_PLUGIN_SKIP`) are still present.

### Before merging the switchover

1. **Build settings** (Netlify › the zurichjs.com site › Site configuration › Build & deploy › Build settings). Not needed for the merge itself: the root `netlify.toml` and `NETLIFY_NEXT_PLUGIN_SKIP` let deploy previews build while production still uses the old settings. Don't change these before merging (they apply to every deploy, so production builds of the old app would break); set them right after, as cleanup:

   | Setting             | New value                                   |
   | ------------------- | ------------------------------------------- |
   | Base directory      | `apps/web`                                  |
   | Package directory   | empty                                       |
   | Build command       | empty (`apps/web/netlify.toml` sets it)     |
   | Publish directory   | empty (`netlify.toml`: `dist`)              |
   | Functions directory | empty (`netlify.toml`: `netlify/functions`) |

   Under Integrations › Build plugins, remove the Next.js plugin installed in the UI. Astro's Netlify adapter takes over. Then `NETLIFY_NEXT_PLUGIN_SKIP` can go.

2. **Environment variables:** set or check the ones in [Environment variables](/systems/operations/environment.md). Most already exist with the production site's names. Leave the old app's variables for a week, so a rollback to an old deploy keeps working: `CLERK_*`, `PUSHOVER_*`, `GOOGLE_MAPS_API_KEY`, `INTERNAL_NOTIFICATION_SECRET`, `ZURICHJS_ADMIN_ORG_ID`, `NEXT_PUBLIC_BASE_URL`. Delete them afterwards. Keep `STRIPE_SECRET_KEY`, `STRIPE_SUPPORT_PRODUCT_ID` and `IMAGEKIT_PRIVATE_KEY`: this site uses them.

3. **Sanity Studio** ([Studio](/systems/studio.md)):
   1. Add the repository secret `SANITY_DEPLOY_TOKEN`; merging then deploys the Studio.
   2. Run the additive migration on `production` from `apps/studio`: a dry run first (`npx sanity migration run v2-additive`), then with `--no-dry-run`. Every change is additive, so the old site keeps working with the new schema.
   3. Restore content as drafts (dry run first): `seed-partners.ts` (confirm every "current" and add dates, then publish), `backfill-agenda.ts` (correct the times, then publish), `clean-speaker-slugs.ts`. Paste a checked Slack invite link in Site settings.

### Merge and verify

4. **Merge the switchover PR.** If the build fails, the old site stays live: read the deploy log and fix forward, or roll back. Then add the build hook: Build hooks › "Scheduled rebuild" on `main`; copy its URL into `NETLIFY_BUILD_HOOK_URL` and trigger one more deploy.
5. **Create the Sanity webhook** ([Studio](/systems/studio.md), "The publish webhook").
6. **Smoke test** on zurichjs.com:
   - **Pages:** home, `/events`, an upcoming event page, a past event page, a speaker, `/cfp`, `/donate`, `/today`.
   - **Old URLs:** `/partnerships`, `/buy-us-a-coffee`, `/workshops/react-performance`, `/api/og/home` and `/api/sitemap.xml` each return a 301.
   - **Search and LLM files:** `/sitemap.xml`, `/robots.txt` and `/llms.txt` load.
   - **A form:** send a contact message with your own address. It arrives in Slack, and by email when Resend is set (contact messages are not stored in Sanity).
   - **Stripe dashboard:** Settings › Customer emails › "Successful payments" must be on, because the donate and thanks pages say Stripe emails a receipt.
   - **Donations, on a deploy preview with Stripe test keys:** a one-time and a monthly test donation with card 4242 4242 4242 4242; the thanks page shows the amount; cancel the test subscription in the Stripe dashboard. Never test with live keys.
   - **Feedback:** open an event with `?feedback=true`, rate one talk, rate it again (refused), and check the `feedback` document in the Studio has event, talk and speaker. Delete test documents afterwards (owner).
   - **Media:** `/media` lists the events from ImageKit; a gallery opens and plays a video.
   - **Add to calendar:** on an upcoming event, the menu offers Google Calendar, Outlook and an `.ics` file; `/events/<slug>.ics` downloads and opens as one entry.
   - **The webhook:** `curl -i -X POST https://zurichjs.com/api/rebuild` answers `401`. Publishing any document in the Studio leads to a deploy within about 4 minutes.
   - **The SEO gate against live content:** run `CONTENT_REQUIRE_SANITY=1 pnpm build` with `SANITY_TOKEN` set, then `node tools/seo/compare.mjs --base https://zurichjs.com`.
7. **Search engines:** in Google Search Console and Bing Webmaster Tools, submit `https://zurichjs.com/sitemap.xml` (it replaces `/api/sitemap.xml`). Watch coverage and 404s for two weeks.
8. **Optional:** the Twint QR (Studio › Site settings › Support page), the draft preview site (below), the Slack bots ([Slack content agent](/systems/slack-agent.md), [CFP bot](/systems/cfp-bot.md)), the membership setup ([Membership payments](/domains/membership/api.md)), the sponsorship setup ([Sponsorship payments](/domains/sponsorship/api.md)) and the move to the one Stripe webhook ([Stripe](/systems/stripe.md)).

## Roll back

1. In Netlify › Deploys, open the last good deploy and click "Publish deploy". This is instant.
2. To build the old app again, set the build settings back to their previous values (base `/`, the old build command) and revert the merge on `main`.

## Draft preview site (optional, for editors)

A second Netlify site with the same repository and build settings, plus:

- `SANITY_PERSPECTIVE=drafts`
- `SANITY_READ_TOKEN`: a Sanity **Viewer** token. The build fails without it, because drafts are private.
- its own build hook in `NETLIFY_BUILD_HOOK_URL`, and its own `SANITY_WEBHOOK_SECRET`
- a second Sanity webhook to `https://<preview-site>/api/rebuild` with **Drafts on**
- `SANITY_STUDIO_PREVIEW_URL=https://<preview-site>` in the Studio's environment, and `DRAFT_PREVIEW_URL` for the Slack agent's preview links

Preview builds are noindex on every page, `robots.txt` disallows everything, and a "Draft preview" bar is shown. A draft preview build also opens event feedback early for organisers to check, and never requires the ImageKit archive. If the Netlify plan includes it, also password-protect the site (Access control); this is a paid feature on some plans.

## Related concepts

- [Operations](/systems/operations/index.md), [Environment variables](/systems/operations/environment.md), [Rebuilds](/systems/operations/rebuilds.md), [Troubleshooting](/systems/operations/troubleshooting.md)
- [Web app](/systems/web.md), [Studio](/systems/studio.md)
- [Content](/domains/content/overview.md) (draft preview), [Donations](/domains/donations/overview.md) and [Membership payments](/domains/membership/api.md) (smoke tests and setup)

# Related specs

None.
