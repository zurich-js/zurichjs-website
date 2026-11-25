---
type: System
title: SEO and LLM surface
description: What search engines and LLM crawlers get, the SEO parity gate and its rules, the production baseline it compares against, and what happens to every old URL.
tags: [seo, llms, ci]
timestamp: '2026-11-25T00:00:00Z'
---

# SEO and LLM surface

SEO and LLM parity with the old production site is non-negotiable (owner, 2026-10-31): every production URL either renders with equivalent meta and structured data, 301s to its new equivalent, or is an owner decision. Changing or removing a public URL, the rating copy, or the AI-crawler rules in `robots.txt` needs the owner.

## What the site emits

Builders live in `packages/seo/src/index.ts`; pages call them.

- **Meta:** title, description, canonical (absolute, on `https://zurichjs.com`), Open Graph and Twitter tags with a generated 1200×630 share image ([Web app](/systems/web.md)), `index,follow` or `noindex,nofollow`.
- **JSON-LD:** Organization, WebSite and LocalBusiness on the home page; Event on dated event pages; Person on speaker pages; BreadcrumbList on detail pages; FAQPage on `/contact` and the landing pages.
- **`/sitemap.xml`:** every indexable route, every event and speaker, with `lastmod` from Sanity `_updatedAt`. Noindex and redirected routes are left out.
- **`/robots.txt`:** allows all, disallows the private areas, explicitly allows the AI crawlers, and points to the sitemap. A draft preview build disallows everything.
- **LLM files:** `/llms.txt` and `/llms-full.txt`, linked from `/ai-context` and the footer; `/ai-context` is in the sitemap.

Event performers come from public speaker profiles referenced by programme or recap talks. The end comes from `endsAt` or a timed closing item in the Zurich programme. The free CHF offer links to Meetup when available. Its registration opening time is unknown, so the offer omits `validFrom`.

## The parity gate

`tools/seo/compare.mjs` (`pnpm seo:check`, run in CI after the build) compares a served build against the production baseline:

```bash
node tools/serve-dist.mjs 4321 &
node tools/seo/compare.mjs --base http://localhost:4321
```

**It fails the build when:**

1. A baseline route that is not de-scoped or removed does not return 200, and does not 301 to a route that returns 200.
2. `<title>` or meta description is missing or empty on an indexable page. A description under 50 or over 170 characters also fails, unless the allowlist covers it.
3. Canonical is missing, not absolute, not on `https://zurichjs.com`, or differs from the route's own URL (or its redirect target).
4. A JSON-LD `@type` present in the baseline is missing, or any JSON-LD block fails to parse.
5. An indexable route is missing from `/sitemap.xml`, or a noindex or redirected route appears in it.
6. `og:title`, `og:description`, `og:url` (absolute, matching the canonical) or an absolute `og:image` is missing, or `twitter:card` is missing.
7. `robots.txt` loses a rule for a URL that still exists, drops the AI crawler allowances, or no longer points to the sitemap.
8. `/ai-context`, `/llms.txt` or `/llms-full.txt` is missing.
9. An indexable page has an empty `<h1>`, or under 200 characters of server-rendered text (content rendered only on the client).
10. A page's share image is not one of the generated 1200×630 cards (`apps/web/src/lib/og.ts`), or lacks its alt text, width or height.

**Reported but not failed:** title and description wording changes, because the site rewrote the copy. Each must be listed in `tools/seo/allowlist.json` with a reason, or the report flags it. Titles keep production keywords and use " · " as the separator.

**Files:**

| File                              | What                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/seo/snapshot.mjs`          | Crawls a site with JavaScript disabled, as a crawler sees it (`pnpm seo:snapshot`).                                                            |
| `tools/seo/routes.production.txt` | The production routes the baseline covers, with the IDs it could resolve for dynamic routes.                                                   |
| `tools/seo/baseline.crawl.json`   | The crawl of the old production app (27 routes, 2026-10-31).                                                                                   |
| `tools/seo/baseline.source.json`  | Routes whose SEO surface was read from the old app's source, because they fetched Sanity while rendering (20 routes, marked "source-derived"). |
| `tools/seo/scope.json`            | What happens to every production URL: `ported`, `redirect` (with `to`), or an owner decision.                                                  |
| `tools/seo/allowlist.json`        | Intended wording changes, each with a reason.                                                                                                  |

The baseline was captured from a local run of the old Next.js app (`main@0c5d093`), because zurichjs.com and Sanity were not reachable from that environment. Once the live site can be crawled, re-run `node tools/seo/snapshot.mjs https://zurichjs.com tools/seo/routes.production.txt baseline.live.json`.

## What the old production site had (baseline, 2026-10-31)

Kept as the reason for the gate's rules. The new site fixes these defects rather than copying them:

- `/sitemap.xml` was a static 3-URL file; the complete sitemap was at `/api/sitemap.xml`, which `robots.txt` disallowed.
- Event and Person JSON-LD were never emitted; LocalBusiness carried a placeholder phone number.
- Several pages used relative OG image URLs; event pages without an image had none; speaker pages had `og:url` on zurichjs.org.
- No page was noindex, including the private speaker feedback pages.
- `/ai-context` was linked from nowhere and in no sitemap; there was no `llms.txt`.
- `robots.txt` allowed all, disallowed `/api/` (except `/api/og/`), `/admin/`, `/profile/` and `/checkout/`, and explicitly allowed GPTBot, ChatGPT-User, Google-Extended, CCBot, anthropic-ai and Claude-Web.
- `geo.*` and `ICBM` meta on `/` and the landing pages; `content-language: en`, `og:locale en_US`.

## Old URLs

| Route                                                                                                                                                                                                                                                                                   | Now                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/`, `/about`, `/events`, `/events/[id]`, `/speakers`, `/speakers/[id]`, `/media`, `/cfp`, `/cfv`, `/contact`, `/donate`, `/feedback`, `/today`, `/membership`, `/ai-context`, `/meetups/*`, `/conferences/tech-conferences-zurich`, `/waitlist/conf`, `/policies/*` (production slugs) | Same URL. Events and speakers keep the Sanity `id.current` slug.                                                                      |
| `/partnerships` → `/partners`; `/buy-us-a-coffee`, `/support` → `/donate`; `/event-feedback` → `/feedback`; `/community` → `/about`; `/cfp/form` → `/cfp#proposal`                                                                                                                      | 301                                                                                                                                   |
| `/checkout/success`, `/success`                                                                                                                                                                                                                                                         | 301 → `/events`, `/donate` (the old site's Stripe return pages; donations now return to `/donate/thanks`)                             |
| `/feedback/speaker/[token]`                                                                                                                                                                                                                                                             | Same URL, noindex                                                                                                                     |
| `/workshops`, `/workshops/*`, `/tshirt`                                                                                                                                                                                                                                                 | 301 → `/events?from=workshops`; `/tshirt` → `/donate?from=tshirt` (a one-line note says they have ended)                              |
| `/admin/*`, `/profile/*`, `/invite/*`                                                                                                                                                                                                                                                   | `/profile/*` 301 → `/`; `/invite/*` 301 → `/about`; `/admin` is the board's admin area (noindex, password; owner, 11th November 2026) |
| `/media-demo`                                                                                                                                                                                                                                                                           | 301 → `/media`                                                                                                                        |
| `/api/og/*`, `/api/sitemap.xml`                                                                                                                                                                                                                                                         | 301 → the generated `/og/*.png` cards, `/sitemap.xml`                                                                                 |

## Related concepts

- [Web app](/systems/web.md) (routes, redirects, share images), [CI](/systems/operations/ci.md), [Testing](/systems/testing.md)
- [Events frontend](/domains/events/frontend.md), [Donations](/domains/donations/overview.md) (old donation URLs)

# Related specs

None.
