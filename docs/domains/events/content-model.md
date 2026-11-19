---
type: Content Model
title: Events content model
description: The Sanity types behind meetups (events, talk, speaker, feedback) with their fields, and how the content layer maps them to the site's domain types.
tags: [events, sanity, schema]
timestamp: '2026-11-19T00:00:00Z'
---

# Events content model

Schema owner: `apps/studio/schemaTypes` ([Studio](/systems/studio.md)). Queries: `packages/content/src/queries.ts`; mappers: `packages/content/src/map.ts`; domain types: `packages/events/src/types.ts`. The schema is additive over the old site's: type names and stored values are kept, and no field is deleted.

## `events`

The type name is `events` (plural): renaming a type would mean migrating every document and reference. Studio field groups: basics, venue, programme, practical, tickets, after.

| Field                                           | Type and meaning                                                                                                                                             |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`                                         | string                                                                                                                                                       |
| `id`                                            | slug; the URL is `/events/<id>`. Never changed after publishing (SEO; the Slack agent cannot change it).                                                     |
| `status`                                        | `scheduled` (RSVP open on Meetup), `rsvp-soon`, `tbc`, `full` (Meetup waitlist), `postponed`, `cancelled` ([state machine](/domains/events/overview.md))     |
| `datetime`                                      | the start time listed on Meetup; mapped to `startsAt`                                                                                                        |
| `endsAt`                                        | optional end                                                                                                                                                 |
| `dateText`                                      | month text for TBC events, shown only when the status is `tbc`                                                                                               |
| `description`                                   | text, at least 50 characters for readiness                                                                                                                   |
| `venue`                                         | object: `name`, `street`, `zip`, `city`, `directions`, `entrance`, `transport`, `accessibility`                                                              |
| `venueNote`                                     | a note about the venue                                                                                                                                       |
| `location`, `address`                           | the old site's free-text venue fields, kept in sync with `venue` (the Slack agent does this too)                                                             |
| `hosts`                                         | references to `partner`                                                                                                                                      |
| `supporters`                                    | array of `eventSupporter`: a `partner` reference and a `role` (`venue`, `food`, `sponsor`, `community`)                                                      |
| `talks`                                         | references to `talk`, in running order                                                                                                                       |
| `agenda`                                        | array of `agendaItem`: `time` (HH:MM, Zurich), `kind` (`doors`, `intro`, `talk`, `break`, `networking`, `close`, `other`), `title`, `talk` reference, `note` |
| `practical`                                     | array of `practicalInfo` (`label`, `value`): "Good to know" lines                                                                                            |
| `meetupUrl`                                     | the Meetup event link                                                                                                                                        |
| `sane`                                          | optional object (`organization`, `event` slugs): "Free tickets on Sane" in the Studio's Meetup tab                                                           |
| `image`, `photoCredit`                          | the event's artwork (promotional; never part of a gallery)                                                                                                   |
| `photos`                                        | images with `alt`, from the evening                                                                                                                          |
| `recap`                                         | object: `talks` (array of `recapTalk`: a `talk` reference, `summary`, `format`) for the recap after the event                                                |
| `attendees`, `excludeFromStats`                 | kept for stats, not shown                                                                                                                                    |
| `isProMeetup`, `stripePriceId`, `ticketSaleUrl` | deprecated (pro meetups and paid tickets are gone): read-only, hidden when empty, values kept. The site reads none of them.                                  |

## `talk`

| Field                        | Type and meaning                                                        |
| ---------------------------- | ----------------------------------------------------------------------- |
| `id`, `title`, `description` | the talk                                                                |
| `type`                       | `talk`, `lightning` or `deep-dive`; mapped to the talk's format         |
| `level`, `language`          | optional; copied by "Convert to Talk"                                   |
| `durationMinutes`            | length                                                                  |
| `speakers`                   | references to `speaker`                                                 |
| `events`                     | a single reference, for reverse lookup only                             |
| `tags`                       | used for speaker topics and search                                      |
| `slides`                     | shown on the talk only when the speaker shared them (owner, 2026-11-01) |
| `videoUrl`                   | never rendered: ZurichJS does not record talks                          |

## `speaker`

| Field                                                 | Type and meaning                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`                                                  | slug; the URL is `/speakers/<id>`                                                                           |
| `name`, `email`                                       | `email` is never rendered and never sent to a model                                                         |
| `title`, `company`, `location`                        | job title (shown as the role), company, location                                                            |
| `tagline`, `bio`, `interests`                         | topics come from `interests` first, else from the speaker's talks' tags                                     |
| `image`                                               | the portrait; alt text is derived from the name                                                             |
| `twitter`, `bluesky`, `linkedin`, `github`, `website` | the mapper builds the profile's links from these                                                            |
| `talks`, `talkReferences`                             | kept from the old site                                                                                      |
| `isVisible`                                           | filters the speaker directory; new speakers from a talk proposal are hidden until an organiser publishes    |
| `legacySlugs`                                         | old IDs that 301 to the current one at build time; feedback and profile links signed with one still resolve |

## Feedback

- **`feedback`** (one per person, talk and speaker): `event`, `talk` and `speaker` references, `rating`, `comment`, `submittedAt`, and `ipHash` and `browserFingerprint` for duplicate checks.
- **`comprehensiveFeedback`** (the evening): `event`, `eventId`, `eventType`, `overallRating`, the named answers `moreOf`, `improvements`, `futureTopics`, `arrivalIssues`, `describeToFriend`, `quoteConsent` and `quoteName` (kept only when quoting is allowed), an optional `email`, and older fields from the old site's form.

## Mapping notes

- `startsAt = datetime`; the venue comes from `venue`, falling back to `location` and `address`.
- The programme comes from `agenda`, falling back to `talks` in order ([schedules](/domains/events/overview.md)).
- The generated query types are wrapped in `Loose<>`, because production documents predate the schema's required fields; mappers stay defensive.
- Workshops have no schema (de-scoped); every event is a meetup.

## Related concepts

- [Events](/domains/events/overview.md), [Events frontend](/domains/events/frontend.md)
- [Content](/domains/content/overview.md), [Content model](/domains/content/content-model.md), [Talk proposals](/domains/talk-proposals/overview.md), [Partners](/domains/partners/overview.md)
- [Studio](/systems/studio.md)

# Related specs

- [Ticketing and check-in on Sane](/domains/events/specs/sane-ticketing.md)
