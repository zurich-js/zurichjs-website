# SEO and LLM baseline (production app, main@0c5d093)

What search engines and LLM crawlers get from the current site, captured on 2026-10-31. The V2 platform must not lose any of it.

## How it was captured

- **Crawl:** `platform/tools/seo/snapshot.mjs` crawled the root Next app with JavaScript disabled, as a crawler sees it. Routes are in `platform/tools/seo/routes.production.txt`, output in `platform/tools/seo/baseline.crawl.json` (27 routes).
  - The app ran with `next dev` and a placeholder Clerk key, locally.
  - Sanity is blocked from this environment ([BLOCKERS #1](./BLOCKERS.md)).
- **Source:** pages that fetch Sanity while rendering returned 500 locally. Their SEO surface was read from source instead, in `platform/tools/seo/baseline.source.json` (20 routes, marked "source-derived").
- **Live crawl not possible:** `zurichjs.com` is blocked here (BLOCKERS #3). Once it is allowed, re-run with `node platform/tools/seo/snapshot.mjs https://zurichjs.com platform/tools/seo/routes.production.txt baseline.live.json`.

## What production has today

| Signal                  | Today                                                                                                                                                                                                                         | Notes                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titles and descriptions | On every public page through `src/components/SEO.tsx`                                                                                                                                                                         | Missing on `/checkout/success`, `/success`, `/media-demo`, `/donate`, `/membership` (`/donate` and `/membership` have a title but no canonical or OG)                                                                     |
| Canonical               | `https://zurichjs.com${asPath}` (query string included)                                                                                                                                                                       | `/speakers/[id]` has an explicit canonical, but its `og:url` points to **zurichjs.org**                                                                                                                                   |
| Open Graph and Twitter  | `og:*` and `twitter:*` on SEO pages; default image `logo-square.png`                                                                                                                                                          | Several pages use **relative** OG image URLs (`/api/og/...`, `/images/...`), which many scrapers ignore. Event pages without an image have no `og:image`                                                                  |
| JSON-LD                 | Five pages only: `/` (Organization, WebSite+SearchAction, LocalBusiness), `/ai-context` (Organization), `/meetups/javascript-zurich`, `/meetups/ai-ml-zurich`, `/conferences/tech-conferences-zurich` (Organization, FAQPage) | **Event and Person JSON-LD are never emitted.** The builders exist in `src/utils/structuredData.ts` but nothing calls them. LocalBusiness carries a placeholder phone number                                              |
| Robots meta             | Every page `index,follow,…`; no page sets `noindex`                                                                                                                                                                           | `/feedback/speaker/[token]` (private) and the admin pages that use `<SEO>` are indexable                                                                                                                                  |
| robots.txt              | Allows all; disallows `/api/` (except `/api/og/`), `/admin/`, `/profile/`, `/checkout/`; explicitly allows GPTBot, ChatGPT-User, Google-Extended, CCBot, anthropic-ai, Claude-Web                                             | Points to `/sitemap.xml`                                                                                                                                                                                                  |
| Sitemap                 | `/sitemap.xml` is a **static 3-URL file** (`/`, `/events`, `/speakers`)                                                                                                                                                       | The complete one is `/api/sitemap.xml` (16 static URLs plus every event), but robots.txt disallows `/api/`. Speakers, `/meetups/*`, `/conferences/*`, `/ai-context`, `/today`, `/cfv` and `/membership` are in no sitemap |
| LLM surface             | `/ai-context` (indexable page, Organization JSON-LD)                                                                                                                                                                          | Linked from nowhere and in no sitemap; URLs in it are plain text. No `llms.txt`                                                                                                                                           |
| Language                | `content-language: en`, `og:locale en_US`                                                                                                                                                                                     |                                                                                                                                                                                                                           |
| Geo                     | `geo.*` and `ICBM` on `/` and the three landing pages                                                                                                                                                                         |                                                                                                                                                                                                                           |

## Parity rules for the Astro app (enforced by `platform/tools/seo/compare.mjs`)

**Fail the build when any of these happens:**

1. A baseline route that is not de-scoped or removed does not return 200, and does not 301 to a route that returns 200.
2. `<title>` or meta description is missing or empty on an indexable page. A description under 50 or over 170 characters also fails, unless the allowlist covers it.
3. Canonical is missing, not absolute, not on `https://zurichjs.com`, or differs from the route's own URL (or its redirect target).
4. A JSON-LD `@type` present in the baseline is missing, or any JSON-LD block fails to parse.
5. An indexable route is missing from `/sitemap.xml`, or a noindex or redirected route appears in it.
6. `og:title`, `og:description`, `og:url` (absolute, matching the canonical) or an absolute `og:image` is missing, or `twitter:card` is missing.
7. `robots.txt` loses a rule for a URL that still exists, drops the AI crawler allowances, or no longer points to the sitemap.
8. `/ai-context`, `/llms.txt` or `/llms-full.txt` is missing.
9. An indexable page has an empty `<h1>`, or under 200 characters of server-rendered text (content rendered only on the client).

**Reported but not failed:** title and description wording changes, because V2 rewrites the copy. Each must be listed in `platform/tools/seo/allowlist.json` with a reason, or the report flags it.

**Improvements V2 makes on top of parity** (all checked by the gate):

- Event JSON-LD on every event page; Person on speaker pages; BreadcrumbList on detail pages.
- A complete `/sitemap.xml` with `lastmod` from Sanity `_updatedAt`.
- Absolute OG image URLs everywhere; `og:url` on the right domain.
- `noindex` on `/feedback/speaker/[token]`. (`/checkout/success` and `/success` now 301, because online payments were removed.)
- `/llms.txt` and `/llms-full.txt`, linked from `/ai-context` and the footer.
- `/ai-context` linked and added to the sitemap.

## Routes and their V2 status

| Route                                                                                                                                                                                                                                                                                   | Baseline source | V2                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------ |
| `/`, `/about`, `/events`, `/events/[id]`, `/speakers`, `/speakers/[id]`, `/media`, `/cfp`, `/cfv`, `/contact`, `/donate`, `/feedback`, `/today`, `/membership`, `/ai-context`, `/meetups/*`, `/conferences/tech-conferences-zurich`, `/waitlist/conf`, `/policies/*` (production slugs) | crawl or source | Ported, same URL                                       |
| `/partnerships` → `/partners`; `/buy-us-a-coffee`, `/support` → `/donate`; `/event-feedback` → `/feedback`; `/cfp/form` → `/cfp`                                                                                                                                                        | crawl or source | 301                                                    |
| `/checkout/success`, `/success`                                                                                                                                                                                                                                                         | crawl           | 301 → `/events`, `/donate` (Stripe removed)            |
| `/feedback/speaker/[token]`                                                                                                                                                                                                                                                             | source          | Ported, noindex                                        |
| `/workshops`, `/workshops/*` (8), `/tshirt`                                                                                                                                                                                                                                             | crawl or source | **De-scoped (owner decision pending)**                 |
| `/admin/*`, `/profile/*`, `/invite/*`                                                                                                                                                                                                                                                   | crawl           | **Removed (owner).** `/invite` proposed 301 → `/about` |
| `/media-demo`                                                                                                                                                                                                                                                                           | crawl           | Proposed 301 → `/media`                                |
