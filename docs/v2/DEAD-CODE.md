# Dead code in the current app (knip)

Run on 2026-10-31 with `knip@6.43.0` (latest release older than the repo's 3-day `minimumReleaseAge`) against the root Next app, with `v2/` and `platform/` ignored. Every flagged file was double-checked with grep: the only references to it come from other flagged files.

## Removed in the `v2/root-dead-code` PR (not reachable by any URL)

**Unused files (28)**

- `src/components/`:
  - `ProductCard.tsx`
  - `banners/ConfBanner.tsx`
  - `cfp/CFPHero.tsx`, `cfp/CFPNotice.tsx`
  - `dev/MockDemoTools.tsx`
  - `event/EventTickets.ts`
  - `gallery/{GalleryFilters,MediaGrid,MediaItem,MediaModal}.tsx`
  - `layout/SimpleLayout.tsx`
  - `sections/SpeakerGrid.tsx`
  - `today/{DealCard,QuickActions,SentryRaffle,SponsorCard,WorkshopDeals}.tsx`
  - `ui/{AnimatedLogo,ResponsiveMediaGrid,Stats}.tsx`
  - `workshop/{laravelWorkshopTickets,workshopTickets}.ts`
- `src/data/galleryMockData.ts`, `src/data/mockProductDemos.ts`
- `src/hooks/useResponsiveThumbnail.ts`
- `src/lib/animations.ts`
- `src/utils/galleryFormatters.ts`, `src/utils/productFeedbackUtils.ts`

**Stray file**

- `src/pages/feedback/speaker/[token].tsx.tmp`

**Unused dependencies**

- `@imagekit/next`
- `@sanity/image-url`
- `meetup-api-client`
- `react-intersection-observer` (only used by the dead `src/lib/animations.ts`)
- dev: `@eslint/compat`

**Unused exports.** These are removed where the export is dead code, and kept where the function is still used inside its own module.

- `src/sanity/queries.ts`: `getEventFeedbackStats`, `getSpeakerFeedbackStats`, `getTalkFeedbackStats`, `getEventFeedbackById`, `getFeedbackByEventId`, `getRecentTalkExamples`
- `src/utils/structuredData.ts`: `generateEventSchema`, `generatePersonSchema`, `generateBreadcrumbSchema`, `generateWebSiteSchema`, `generateLocalBusinessSchema`. **Not removed.** They are the JSON-LD builders the V2 `@zurichjs/seo` package ports, so they stay as reference until the switchover. Logged.
- `src/utils/thumbnailGenerator.ts`: `generateImageThumbnail`, `generateVideoThumbnail`, `generateThumbnail`, `generateSrcSet`
- `src/data/index.ts`: `getSponsorshipPartners`
- `src/lib/cfp/speakerProfile.ts`: `extractGithubUsername`, `extractTwitterHandle`
- `src/lib/testMode.ts`: `getRelativeDate`
- `src/lib/validation/input.ts`: `firstFormValue`
- `src/components/workshop/aiSecuritySnykTickets.ts`: `teamDiscounts`
- Unused exported types: `TalkTopic`, `TshirtContextType`, `PartnerBrandColors`, `TestScenario`, `src/types/gallery.ts` (all), `Event`, `TalkData`, `SpeakerSummary` in `src/types/index.ts`, `ThumbnailSize`

## Not removed: reachable by URL (owner decision)

- `/media-demo` (`src/pages/media-demo.tsx`): a demo page with no title or meta. It is in no sitemap but is crawlable.
- `/api/hello`: the Next.js template route.
- `public/sitemap.xml`: a hand-written 3-URL file that shadows the complete dynamic sitemap. `/sitemap.xml` serves this file, `/api/sitemap.xml` has every page, and `robots.txt` points crawlers at the 3-URL file. The Astro app fixes this with a generated `/sitemap.xml` (see SEO-BASELINE.md). Production keeps it until the switchover.

## In the platform

`platform/` runs knip in CI with zero findings allowed (Phase 4). Nothing listed above is ported.
