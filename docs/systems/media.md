---
type: System
title: Media archive
description: How photos and clips from the evenings are collected from ImageKit and Sanity at build time, tagged, shown, and what happens when the archive cannot be read.
tags: [media, imagekit, images]
timestamp: '2026-11-19T00:00:00Z'
---

# Media archive

Source: `packages/content/src/media.ts`, `apps/web/src/lib/media.ts`, `apps/web/src/lib/photos.ts`; pages `/media` and `/media/[event]`; the `Gallery` island in the design system.

## Sources

One collection, merged at build time and shared by the archive, event galleries, speaker profiles, the home page, the community timeline and the partners page:

- **ImageKit**, read at build time with `IMAGEKIT_PRIVATE_KEY`: one top-level folder per event, named after the event's URL slug, as the old site had it.
- **Sanity** `events.photos`.

Promotional artwork (Sanity `events.image`, or ImageKit files tagged `promo`) is never part of a gallery.

## Editorial metadata in ImageKit

Editors refresh featured picks in ImageKit, without a code change:

- **Tags:** `featured-home`, `featured-partners`, `speaker:<speaker id>`, `talk:<talk id>`, `milestone:<id>`, `promo` (excluded), `hidden` (excluded).
- **Custom metadata:** `caption`, `credit`, `alt`, `captions` (a WebVTT URL, for videos).

## Rules

- **No recordings:** videos are short clips from the evening, never described as talk recordings ([Brand](/systems/design-system/brand.md)). `/media` gathers all clips in one section that says the talks are not recorded.
- **Phone clips:** ImageKit lists `.MOV` files with their MP4 rendition (`…/IMG_1.MOV/ik-video.mp4`), which plays in browsers; posters come from `…/IMG_1.MOV/ik-thumbnail.jpg`, sized with `tr=w-…` like photos. HEIC photos are shown through `f-auto`.
- **A missing archive is never "coming soon".** Without `IMAGEKIT_PRIVATE_KEY`, or when the listing fails, the build log says so loudly and pages say the archive could not be loaded for this version of the site. Production builds (`MEDIA_REQUIRE_IMAGEKIT=1` in `netlify.toml`, or `CONTEXT=production`) fail instead, so the previous deploy with its photos stays live; deploy previews, branch deploys and the draft preview site continue without it.
- **Event pages say what is true:** photos and clips when there are any; "not online yet" only in the two weeks after an event; afterwards "There are no photos from this evening in our archive", with a link to `/media`.
- **`/media`** lists the event dates to jump to (with the day, since some months had two meetups).
- **The gallery viewer** keeps the open item in the URL, so it can be shared.
- **Images** ship as WebP at 480, 960 and 1600 px with `srcset`.

## Checking it

The archive was checked against production's ImageKit listing (14 folders, 816 photos and 16 clips at the time) with a local mock of the Admin API: every folder matched an event slug. A trimmed copy, `packages/content/test/fixtures/imagekit-files.json`, keeps that mapping under test. To run a build against a listing without the real key, use `tools/imagekit-mock.mjs` ([Local development](/systems/local-development.md)).

## Related concepts

- [Web app](/systems/web.md), [Content](/domains/content/overview.md), [Events frontend](/domains/events/frontend.md)
- [Environment variables](/systems/operations/environment.md), [Troubleshooting](/systems/operations/troubleshooting.md)

# Related specs

None.
