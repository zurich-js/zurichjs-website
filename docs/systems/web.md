---
type: System
title: Web app
description: The Astro 7 site in apps/web, how it renders (static pages, islands, server endpoints, Netlify Functions), its routes, redirects, headers and share images.
tags: [astro, netlify, frontend, routes]
timestamp: '2026-11-19T00:00:00Z'
---

# Web app

Source: `apps/web` (`@zurichjs/web`). Configuration: `apps/web/astro.config.mjs`, `apps/web/netlify.toml`.

## Stack

- **Astro 7** with `output: 'static'` and the `@astrojs/netlify` adapter. Astro is pinned exactly; `apps/web/test/stack.test.ts` fails if the installed Astro major is not 7 or the Tailwind major is not 4, and keeps `.nvmrc` at or above Astro's minimum Node version and equal to `NODE_VERSION` in `netlify.toml`.
- **Preact islands** with `compat`, for interactive parts. App-specific islands live in `apps/web/src/components/islands` (event, forms, today, membership, the admin area); they build on the primitives in [the design system](/systems/design-system/index.md).
- **Tailwind 4** through `@tailwindcss/vite`. The app's `global.css` imports the design system's `theme.css` and `motion.css` and defines no `@theme` of its own.
- **One layout,** `apps/web/src/layouts/BaseLayout.astro`: meta tags, the view-transition opt-in, the reveal script, the draft-preview bar.

## How pages render

- **Static first.** Every public page is prerendered at build time from Sanity content ([Content](/domains/content/overview.md)). Content changes appear only after a rebuild ([Rebuilds](/systems/operations/rebuilds.md)).
- **Clock-aware islands.** Event pages are prerendered in the state true at build time; the event islands re-evaluate the state in the browser every minute and swap the actions, banner and rating ([Events](/domains/events/overview.md)).
- **Server endpoints.** Routes under `src/pages/api` and `feedback/speaker/[token].astro` set `prerender = false` and run in Astro's server function on Netlify: the forms, donations, membership, the admin API, the speaker profile and feedback endpoints, `/api/subscribe` and the rebuild webhook.
- **Netlify Functions** in `apps/web/netlify/functions` exist only where an Astro endpoint cannot do the job: `scheduled-rebuild` (a scheduled function), the organisers' Slack bot (`slack-events`, `slack-agent-background`, `slack-interactivity`) the CFP bot (`slack-cfp-events`, `slack-cfp-background`, `slack-cfp-interactivity`, `slack-cfp-cleanup`), and the daily sponsorship check (`sponsorship-daily`). A standalone function claiming a path under `/api/*` would compete with the Astro server function for the URL.
- **Functions are bundled with esbuild on Netlify.** `apps/web/scripts/bundle-functions.mjs` (run by the Netlify build) bundles each function into one self-contained file in `.netlify/functions-bundled`, which `apps/web/netlify.toml` makes the functions directory for production, deploy previews and branch deploys; local dev runs the sources. Netlify's own packaging (nft) does not read the workspace packages' TypeScript, so functions importing `@zurichjs/agent` failed with `ERR_MODULE_NOT_FOUND`. Schedules are repeated in `netlify.toml` (`scheduled-rebuild`, `slack-cfp-cleanup`), because Netlify may not read `export const config` from a bundled file; `sponsorship-daily` has its schedule only in its source ([Sponsorship](/domains/sponsorship/overview.md), Not verified).
- **Draft preview.** A build with `SANITY_PERSPECTIVE=drafts` renders the same static site from drafts: every page noindex, `robots.txt` disallowing everything, and a "Draft preview" bar ([Draft preview site](/systems/operations/netlify.md)).

## Routes

| Route                                                                                         | Kind                           | Concept                                                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                           | static, islands                | [Events frontend](/domains/events/frontend.md)                                                                   |
| `/events`, `/events/[slug]`, `/events/[slug].ics`                                             | static, islands; calendar file | [Events frontend](/domains/events/frontend.md)                                                                   |
| `/today`, `/feedback`                                                                         | static, islands                | [Events frontend](/domains/events/frontend.md)                                                                   |
| `/speakers`, `/speakers/[id]`                                                                 | static, islands                | [Events frontend](/domains/events/frontend.md)                                                                   |
| `/speakers/profile`                                                                           | static shell, noindex          | [Talk proposals](/domains/talk-proposals/overview.md)                                                            |
| `/feedback/speaker/[token]`                                                                   | server, noindex                | [Events frontend](/domains/events/frontend.md)                                                                   |
| `/media`, `/media/[event]`                                                                    | static                         | [Media archive](/systems/media.md)                                                                               |
| `/cfp`                                                                                        | static, form island            | [Talk proposals](/domains/talk-proposals/overview.md)                                                            |
| `/cfv`, `/contact`, `/waitlist/conf`                                                          | static, form islands           | [Forms](/domains/forms/overview.md)                                                                              |
| `/partners`                                                                                   | static, form island            | [Partners](/domains/partners/overview.md)                                                                        |
| `/partners/account`, `/partners/agreement`                                                    | static shell; noindex          | [Sponsorship frontend](/domains/sponsorship/frontend.md)                                                         |
| `/donate`, `/donate/thanks`                                                                   | static, island; thanks noindex | [Donations](/domains/donations/overview.md)                                                                      |
| `/membership`, `/membership/terms`, `/membership/account`                                     | static; account noindex        | [Membership frontend](/domains/membership/frontend.md)                                                           |
| `/admin`, `/admin/memberships`, `/admin/sponsors`                                             | static shell, noindex          | [Membership frontend](/domains/membership/frontend.md), [Sponsorship frontend](/domains/sponsorship/frontend.md) |
| `/about`, `/about/why-zurichjs`                                                               | static                         | [Content](/domains/content/overview.md)                                                                          |
| `/meetups/javascript-zurich`, `/meetups/ai-ml-zurich`, `/conferences/tech-conferences-zurich` | static landing pages           | [SEO](/systems/seo.md)                                                                                           |
| `/ai-context`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`                   | static                         | [SEO](/systems/seo.md)                                                                                           |
| `/og/[name].png`                                                                              | static images                  | Share images, below                                                                                              |
| `/policies/[slug]`                                                                            | static, Markdown               | Legal pages, owner only                                                                                          |
| `/design`                                                                                     | static, noindex                | [Design system](/systems/design-system/index.md)                                                                 |
| `/state-changes.json`                                                                         | static                         | [Rebuilds](/systems/operations/rebuilds.md)                                                                      |
| `/content-redirects.txt`                                                                      | build-time only                | Redirects, below                                                                                                 |
| `/404`                                                                                        | static, noindex                |                                                                                                                  |
| `/api/*`                                                                                      | server                         | the domain concepts and [Rebuilds](/systems/operations/rebuilds.md)                                              |

`/design` and the noindex pages are left out of the sitemap and `llms.txt`.

## Redirects

Every production URL keeps working or gets a 301; changing or removing a public URL needs the owner, and the [SEO gate](/systems/seo.md) enforces it.

- **Renamed and retired pages:** `apps/web/src/lib/redirects.mjs` (`LEGACY_REDIRECTS`), written by Astro to `dist/_redirects`. For example `/partnerships` → `/partners`, `/buy-us-a-coffee` and `/support` → `/donate`, `/workshops` → `/events?from=workshops`, `/tshirt` → `/donate?from=tshirt` (both pages then show a one-line note that workshops and T-shirt sales have ended).
- **Section wildcards and old share-image URLs:** `apps/web/netlify.toml` (`/workshops/*`, `/checkout/*`, `/profile/*`, `/invite/*`, `/api/og/*`).
- **Old speaker IDs:** `speaker.legacySlugs` become 301s at build time. A page renders `/content-redirects.txt`, and an integration in `astro.config.mjs` appends it to `_redirects` and removes the file. The old share image (`/og/speaker-<old>.png`) redirects too. A speaker ID is the public URL, so it is a name, never a generated ID (owner, 19th November 2026); the private feedback and profile links look a speaker up by current or old ID, so links already emailed survive a rename.
- `tools/serve-dist.mjs` applies both `_redirects` and the `netlify.toml` redirects, so e2e and the SEO gate test them as Netlify serves them.

## Headers and caching

From `apps/web/netlify.toml`: fingerprinted assets under `/_astro/*` are immutable; `/images/*` are cached for a week; `/events/*.ics` is served as `text/calendar` and `/state-changes.json` is never cached stale; every page gets `X-Content-Type-Options`, `X-Frame-Options: DENY`, a `Referrer-Policy` and a restrictive `Permissions-Policy`. There is no HSTS `preload` header: Netlify already sends HSTS on HTTPS, and preload is hard to undo.

## Share images

Every page shares a generated 1200×630 card (`apps/web/src/lib/og.ts`, rendered by `src/pages/og/[name].png.ts` with satori and resvg): page cards by path, one shared card for the policies, and `/og/default.png` for anything else (owner, 4th November 2026).

- **Events** use their own card: date, title and venue, with the Sanity artwork on the right when there is one, and a "Recap" pill once the event is past. **Speakers** use their photo (face crop) or initials.
- **Design:** black, white and yellow, Figtree, 24px tiles, the wordmark and zurichjs.com on top, no kicker line. Emoji are removed from card text (the font has none). The renderer keeps static TTF files, because satori cannot read woff2, and reads colours through `@zurichjs/design/theme`.
- **Tags:** `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image:alt` on every page. Deploy previews point share images at their own URL (`DEPLOY_PRIME_URL`); canonical URLs stay on zurichjs.com.

## Other behaviour

- **Analytics:** PostHog, from `NEXT_PUBLIC_POSTHOG_*` or `PUBLIC_POSTHOG_*` (`packages/design/src/analytics.ts`).
- **Preview-only modules:** the home page's conference module is a development placeholder, shown with `pnpm dev` or when a build sets `SHOW_PREVIEW_MODULES=true` (only on password-protected deploy previews), never on the public site.
- **Images:** photos ship as WebP at 480, 960 and 1600 px with `srcset`; CSS is inlined.
- **Forms** validate in the browser without zod (`@zurichjs/forms/client`) and on the server with zod ([Forms](/domains/forms/overview.md)).

## Related concepts

- [System map](/systems/overview.md), [Studio](/systems/studio.md), [Stripe](/systems/stripe.md), [Design system](/systems/design-system/index.md), [Media archive](/systems/media.md), [SEO](/systems/seo.md)
- [Operations](/systems/operations/index.md), [Testing](/systems/testing.md)
- Domains: [Events](/domains/events/overview.md), [Membership](/domains/membership/overview.md), [Sponsorship](/domains/sponsorship/overview.md), [Content](/domains/content/overview.md), [Partners](/domains/partners/overview.md), [Talk proposals](/domains/talk-proposals/overview.md), [Forms](/domains/forms/overview.md), [Donations](/domains/donations/overview.md)

# Related specs

None.
