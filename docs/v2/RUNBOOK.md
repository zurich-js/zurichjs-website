# V2 runbook

How the V2 site (`platform/`) is built, deployed and rebuilt, and what the owner sets up once. Decisions are in [DECISIONS.md](./DECISIONS.md), and blockers in [BLOCKERS.md](./BLOCKERS.md).

## One-time setup (owner)

1. **Netlify site for V2.** Add a new site from `zurich-js/zurichjs-website` with these settings:
   - **Base directory:** `platform/apps/web`
   - **Package directory:** empty
   - **Build command, publish directory and functions:** come from `platform/apps/web/netlify.toml`. Leave them empty in the UI.

   Node 22.23.4 is pinned in `netlify.toml` and in `platform/.nvmrc`, because Astro 7.4 requires at least 22.23.4.

   pnpm installs the whole `platform` workspace from the base directory. Do **not** use base `platform` with a package directory: Netlify then resolves `publish` and `functions` against `platform/` (checked with `@netlify/config`).

2. **Environment variables.** Set these in Site configuration › Environment variables.

   | Variable                                                                          | Used by                                                       | Required                       |
   | --------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------ |
   | `SANITY_PROJECT_ID` (default `viqjrovw`), `SANITY_DATASET` (default `production`) | build                                                         | no                             |
   | `SANITY_READ_TOKEN`                                                               | the draft preview site (Viewer token); speaker feedback pages | preview site; speaker feedback |
   | `SANITY_WRITE_TOKEN`                                                              | forms: talk proposals, feedback, ratings                      | yes                            |
   | `SANITY_WEBHOOK_SECRET`                                                           | `/api/rebuild`                                                | yes                            |
   | `NETLIFY_BUILD_HOOK_URL`                                                          | scheduled rebuilds                                            | yes                            |
   | `RESEND_API_KEY`, `FORMS_TO`, `FORMS_FROM`                                        | contact and partner emails                                    | yes                            |
   | `SLACK_WEBHOOK_URL`                                                               | form notifications                                            | optional                       |
   | `EMAIL_OCTOPUS_API_KEY`, `EMAIL_OCTOPUS_LIST_ID`                                  | conference waitlist                                           | yes                            |
   | `JWT_SECRET`                                                                      | speaker feedback links (same value as production)             | yes                            |
   | `PUBLIC_POSTHOG_KEY`, `PUBLIC_POSTHOG_HOST`                                       | analytics                                                     | optional                       |

   `netlify.toml` sets `CONTENT_REQUIRE_SANITY=1` for production. A production build that cannot read Sanity fails instead of shipping sample content.

3. **Build hook.** In Site configuration › Build & deploy › Build hooks, add one called "Scheduled rebuild" on branch `main`. Copy its URL into `NETLIFY_BUILD_HOOK_URL`.

4. **Sanity webhook.** Set this up in sanity.io/manage › project `viqjrovw` › API › Webhooks › Create webhook.

   | Setting     | Value                                                                                                             |
   | ----------- | ----------------------------------------------------------------------------------------------------------------- |
   | URL         | `https://<v2-site>/api/rebuild`                                                                                   |
   | Dataset     | `production`                                                                                                      |
   | Trigger on  | Create, Update, Delete                                                                                            |
   | Filter      | `_type in ["events", "talk", "speaker", "partner", "meetupRating", "conference", "siteSettings", "announcement"]` |
   | Drafts      | off                                                                                                               |
   | Projection  | `{_id, _type}`                                                                                                    |
   | HTTP method | POST                                                                                                              |
   | Secret      | a long random string. Use the same value for `SANITY_WEBHOOK_SECRET`.                                             |

   Requests without a valid signature, or signed more than 5 minutes ago, get a 401.

5. **Draft preview site** (optional, for editors). Create a second Netlify site with the same repository and settings, plus:
   - `SANITY_PERSPECTIVE=drafts`
   - `SANITY_READ_TOKEN`: a Sanity **Viewer** token. Drafts are private, so the build fails without it.
   - its own build hook in `NETLIFY_BUILD_HOOK_URL`, and its own `SANITY_WEBHOOK_SECRET`
   - a second Sanity webhook pointing at `https://<preview-site>/api/rebuild`, with **Drafts on**
   - `SANITY_STUDIO_PREVIEW_URL=https://<preview-site>` in the Studio's environment, so the Presentation tool and the "Open preview" links use it

   Preview builds are noindex on every page, `robots.txt` disallows everything, and a "Draft preview" bar is shown. If your Netlify plan includes it, also password-protect the site (Access control); this is a paid feature on some plans.

6. **Twint QR for `/donate`.** In the Studio, go to Site settings › Support page › Twint QR code. Upload the QR from the Twint business app and publish. The next rebuild shows it.

## How rebuilds happen

The site is static, so content changes appear only after a rebuild.

| Trigger                            | Path                                                                                                                                                                                                                                  | Delay                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Publish in Sanity                  | The webhook calls `/api/rebuild`, which records a pending build in Netlify Blobs. `scheduled-rebuild` runs every 2 minutes and calls the build hook once no publish has arrived for 2 minutes. Ten quick publishes produce one build. | 2–4 min, plus the build |
| An event's doors, and doors + 48 h | `scheduled-rebuild` reads `/state-changes.json`, which each build writes, and builds once per time. That rebuild moves the page from "RSVP open" to the live and feedback state, then to the recap.                                   | ≤ 2 min, plus the build |
| Code merged to `main`              | Netlify builds automatically.                                                                                                                                                                                                         | the build               |

- **No nightly rebuild (owner).** Nothing on the site changes on its own except at event state changes, and those are covered above.
- **Between rebuilds**, the event islands re-check the clock in the browser, so the actions people can click are always right.
- **Code:** `platform/apps/web/src/server/rebuild.ts` holds the pure logic and its tests. The webhook is `src/pages/api/rebuild.ts`, and the scheduled function is `netlify/functions/scheduled-rebuild.mts`.

## Force a rebuild

- **Netlify UI:** Deploys › Trigger deploy › Deploy site.
- **Terminal:** `curl -X POST "$NETLIFY_BUILD_HOOK_URL?trigger_title=Manual"`.

## Roll back

1. In Netlify › Deploys, pick the last good deploy and click "Publish deploy". This is instant and changes no code.
2. Fix forward with a PR.

If a content change broke the build, the previous deploy stays live, because a failed build never replaces it. Fix or revert the document in Sanity's history.

## When a build fails

- **"Sanity is not reachable" on production:** this is deliberate. Production never ships sample content. Check Sanity's status and the token, then retry.
- **"SANITY_PERSPECTIVE=drafts needs SANITY_READ_TOKEN":** the preview site is missing its Viewer token.
- **CI: the SEO parity gate fails:** a URL, title, canonical, JSON-LD type or sitemap entry was lost. Fix it, or record an intentional change, with a reason, in `platform/tools/seo/scope.json` or `allowlist.json`.
- **CI: visual regression fails:** look at the diff images in the `v2-reports` artifact. If the change is intended, run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots` and commit the new baselines.

## CI (GitHub Actions)

| Workflow                 | Runs on                                                                | What                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `V2 platform` (`v2.yml`) | PRs and pushes to `main` that touch `platform/`, `v2/` or the workflow | **checks:** oxlint, oxfmt, knip, `astro check` and `tsc`, Vitest, `pnpm audit`. **site:** the build (sample content, fixed clock); Playwright e2e, accessibility and visual regression at 390 and 1440 px; the SEO and LLM parity gate; Lighthouse mobile (performance ≥ 0.9 as the median of 3 runs; accessibility, SEO = 1; best practices ≥ 0.95). **reference:** the `v2/` site typechecks and builds. |
| `CI` (`ci.yml`)          | PRs to `main`                                                          | the production app, unchanged                                                                                                                                                                                                                                                                                                                                                                              |
| `dependency-review.yml`  | every PR                                                               | blocks known-vulnerable dependencies                                                                                                                                                                                                                                                                                                                                                                       |

Reports (Playwright HTML, diffs, the SEO report, Lighthouse) are uploaded as the `v2-reports` artifact for 14 days.

## Switchover checklist (owner decision)

1. Decide what happens to `/workshops/*`, `/tshirt`, `/invite` and `/media-demo`: keep them, 301, or 410 ([DECISIONS.md](./DECISIONS.md)).
2. Run the live SEO baseline (`node platform/tools/seo/snapshot.mjs https://zurichjs.com …`). Then run the parity gate against the V2 deploy preview, with real content.
3. Point zurichjs.com at the V2 Netlify site, and keep the old site on a subdomain for a week.
4. Submit the new sitemap in Google Search Console and Bing. Watch coverage and 404s for two weeks.
