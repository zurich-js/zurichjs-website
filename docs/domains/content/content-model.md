---
type: Content Model
title: Content model
description: The Sanity singletons and shared document types (site settings, Meetup rating, conference module, announcement, stats, partner) and what the site does with them.
tags: [content, sanity, schema]
timestamp: '2026-11-19T00:00:00Z'
---

# Content model

Schema owner: `apps/studio/schemaTypes` ([Studio](/systems/studio.md)). Meetup types (`events`, `talk`, `speaker`, feedback) are in [Events content model](/domains/events/content-model.md); `talkSubmission` is in [Talk proposals](/domains/talk-proposals/overview.md).

## Singletons

| Type           | Fields                                                                                                                                                                                                                                                                           | Used for                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `siteSettings` | groups contact (`email`, `partnersEmail`), social (`meetupGroupUrl`, `linkedinUrl`, `blueskyUrl`, `instagramUrl`, `slackInviteUrl`), association (name, `uid`), award (`title`, `category`, `url`), support (`twintQr` with `alt`, `twintNote`), media (`conferenceMediaFolder`) | Site-wide links and facts. The Slack invite is used only when it is a complete invite link; otherwise the site says "Ask us for a Slack invite" (owner). The Twint QR and note appear on `/donate` only when set. |
| `meetupRating` | `score`, `count`, `scale`, `url`, `source`, `checkedAt`                                                                                                                                                                                                                          | The rating sentence ([Brand](/systems/design-system/brand.md)). Updated by hand, never scraped; an empty score hides the rating.                                                                                  |
| `conference`   | `state` (`unannounced`, `announced`, `onsale`, `soldout`, `completed`), `headline`, `body`, `cta`, `cfp`, `url`                                                                                                                                                                  | The home page's conference module, a development placeholder shown only with `pnpm dev` or `SHOW_PREVIEW_MODULES=true`.                                                                                           |

## Other shared types

| Type           | Fields                                                                                                                                                                                                                                                                           | Notes                                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `partner`      | `id`, `name`, `logo`, `logoBlack`, `logoBackground`, `url`, `kinds` (`sponsor`, `venue`, `food`, `community`, `conference`, `supporting`), `tier` (`champion`, `builder`, `friend`, `supporter`; only for sponsors), `current`, `since`, `until`, `description`, `allowReferrer` | The site never calls a partner "current" unless an organiser ticked it ([Partners](/domains/partners/overview.md)). |
| `announcement` | `id`, `type` (`event`, `promotion`, `workshop`, `general`), `title`, `message`, `cta` (`text`, `href`), `conditions`, `startDate`, `endDate`, `requiresLogin`                                                                                                                    | Kept from the old site; it is in the publish webhook's filter.                                                      |
| `stats`        | `members`, `totalAttendees`                                                                                                                                                                                                                                                      | Kept from the old site.                                                                                             |

## Rebuild coverage

The publish webhook rebuilds the site for `events`, `talk`, `speaker`, `partner`, `meetupRating`, `conference`, `siteSettings` and `announcement` ([Studio](/systems/studio.md)). Talk proposals and feedback never trigger a build.

## Related concepts

- [Content](/domains/content/overview.md), [Events content model](/domains/events/content-model.md), [Partners](/domains/partners/overview.md), [Donations](/domains/donations/overview.md)
- [Studio](/systems/studio.md)

# Related specs

None.
