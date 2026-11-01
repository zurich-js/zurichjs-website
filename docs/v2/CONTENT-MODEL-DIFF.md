# Content model diff: current Sanity vs V2 (`v2/src/data/types.ts`)

Sources compared:

- **V2 model:** `v2/src/data/types.ts` (with sample data in `v2/src/data/content.ts`).
- **Studio schema:** `zurich-js/zurich-js-website-sanity-studio@16c07d8` (last commit 2025-04-28), `schemaTypes/*.ts`.
- **What the site reads and writes:** `src/sanity/queries.ts`, `src/types/index.ts`, `src/pages/api/submit-talk.ts`, `src/pages/api/feedback/index.ts`, `src/pages/api/event-feedback.ts`, `src/lib/cfp/speakerProfile.ts`.

Status values used below:

- **exists**: same meaning, maybe a different shape.
- **renamed**: same data under another name.
- **new**: needs a schema field.
- **derived**: computed from other fields, no schema change.
- **dropped**: not used by V2.
- **de-scoped**: the owner removed it from the current scope.

## Headline findings

1. **`ticketSaleUrl` vs `stripePriceId`.**
   - The Studio schema declares `events.ticketSaleUrl` (`url`, `schemaTypes/events.ts:16`) and does **not** declare `stripePriceId`.
   - The website never reads `ticketSaleUrl`. It reads `stripePriceId` (`src/sanity/queries.ts:104`, `:125`, `:252`) for pro-meetup Stripe tickets (`src/pages/events/[id].tsx:48`, `src/components/event/EventTickets.ts:7`).
   - So `stripePriceId` can only exist on documents written outside the Studio, or the deployed Studio differs from the repo.
   - V2 nests `stripePriceId` under `workshop{}`. Workshops are de-scoped.
   - **Resolution (updated 2026-11-01, owner: pro meetups and Stripe are removed):**
     - V2 reads none of `isProMeetup`, `stripePriceId` or `ticketSaleUrl`.
     - The Studio keeps all three declared but deprecated: read-only and hidden when empty, so values on existing documents are kept and visible. Nothing is deleted.
     - Implemented in Phase 3.
2. **Type name is `events` (plural).** V2's `Event` maps to `_type == "events"`. Keep the name; renaming a type means migrating every document and reference.
3. **The Studio repo is behind the data the site writes.** The site writes these, but the repo schema does not declare them:
   - the type `comprehensiveFeedback` (`src/pages/api/event-feedback.ts:196`)
   - the product-demo type referenced by `talk.productDemo`/`productDemos`
   - the speaker fields `company`, `location`, `interests`
   - the `talkSubmission.status` value `under_review` (`src/sanity/queries.ts:1043`). The schema lists `pending | approved | rejected | scheduled | completed`.

   Phase 3 adds the missing declarations first, so that existing data shows up in the Studio. These additions only.

4. **Date and venue shape.**
   - V2 uses `startsAt`/`endsAt` and a structured `venue{}`. The current schema has one `datetime` and free-text `location` and `address`.
   - Mapping: `startsAt = datetime`; `venue = { name: location, street/zip/city parsed from address }`.
   - Migration: an additive `venue{}` object, backfilled by a script that parses `address`, with `location` and `address` kept.
5. **Agenda.** V2 needs an `agenda[]` with times. The current model has only `talks[]` references, with no times. `agenda[]` is new; when empty, the mapper falls back to ordering `talks[]`.
6. **Never rendered:** `talk.slides` (file) and `talk.videoUrl`. The brand rule is no recordings or slides. Both are kept in the schema and data, but V2 ignores them.

## `events` → `Event`

| V2 field                                                                               | Current field                                                                       | Status           | Migration note                                                                                                        |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `id`                                                                                   | `_id`                                                                               | exists           |                                                                                                                       |
| `slug`                                                                                 | `id` (slug), `events.ts:8`                                                          | renamed          | `slug = id.current`. Keep the URLs: the current pages are `/events/[id]`.                                             |
| `type` (`meetup` \| `workshop`)                                                        | none (workshops are static TS)                                                      | new              | Fixed to `meetup` for now. Workshops are de-scoped.                                                                   |
| `title`                                                                                | `title`                                                                             | exists           |                                                                                                                       |
| `status` (`scheduled` \| `rsvp-soon` \| `tbc` \| `full` \| `postponed` \| `cancelled`) | none                                                                                | new              | Initial value `scheduled`. Backfill: all existing events get `scheduled`; past ones resolve to `past` from the clock. |
| `startsAt`                                                                             | `datetime` (`events.ts:10`)                                                         | renamed          | Keep `datetime` as the stored field; the mapper exposes it as `startsAt`.                                             |
| `endsAt`                                                                               | none                                                                                | new              | Optional. The mapper defaults it to `startsAt + 3h` for display only.                                                 |
| `dateText`                                                                             | none                                                                                | new              | For `tbc`, e.g. "October 2026".                                                                                       |
| `venue{name,street,zip,city,directions}`                                               | `location`, `address` (strings)                                                     | new (structured) | Additive object, backfilled by parsing `address`. `location` and `address` are kept for the current site.             |
| `venueNote`                                                                            | none                                                                                | new              |                                                                                                                       |
| `meetupUrl`                                                                            | `meetupUrl` (`events.ts:14`)                                                        | exists           |                                                                                                                       |
| `description`                                                                          | `description` (text)                                                                | exists           |                                                                                                                       |
| `agenda[]{time,title,note,talk}`                                                       | `talks[]` (references, no times)                                                    | new              | `agenda[]` items reference `talk`. The mapper falls back to `talks[]`.                                                |
| `practical[]{label,value}`                                                             | none                                                                                | new              |                                                                                                                       |
| `photos[]{src,alt,position}`                                                           | `image` (single)                                                                    | new              | `photos[]` is an image array with `alt`. The current `image` becomes `photos[0]` in the mapper.                       |
| `recap{talks[]{title,speakerIds,summary,format}}`                                      | none                                                                                | new              | `recap.talks[]` references `talk`, plus a per-event `summary`.                                                        |
| `workshop{…}`                                                                          | none (`src/data/workshops.ts`)                                                      | **de-scoped**    | Not added.                                                                                                            |
| `hosts[]` (sponsor ids)                                                                | none (partners are static, `src/data/index.ts:37`; the Studio has a `partner` type) | new              | References to `partner`.                                                                                              |
| (none)                                                                                 | `attendees`                                                                         | kept, not shown  | Used for stats.                                                                                                       |
| (none)                                                                                 | `isProMeetup`, `stripePriceId`                                                      | not read         | Pro meetups removed (owner). Deprecated in the Studio, values kept (finding 1).                                       |
| (none)                                                                                 | `ticketSaleUrl`                                                                     | deprecated       | Unused by the site; hidden, not deleted.                                                                              |
| (none)                                                                                 | `excludeFromStats`                                                                  | kept             |                                                                                                                       |

## `talk` → `TalkRef` / `RecapTalk` / `SpeakerTalk`

| V2 field                                        | Current field                             | Status                | Note                                                                                         |
| ----------------------------------------------- | ----------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `title`                                         | `title`                                   | exists                |                                                                                              |
| `description`                                   | `description`                             | exists                |                                                                                              |
| `speakerIds[]`                                  | `speakers[]` (references)                 | exists                | `speakerIds = speakers[]->id.current`                                                        |
| `format` (`talk` \| `lightning` \| `deep-dive`) | `type` (free string)                      | renamed               | Map the known values. Phase 3 turns `type` into an options list with the same stored values. |
| `durationMin`                                   | `durationMinutes`                         | renamed               |                                                                                              |
| `level`, `language`                             | none (`level` exists on `talkSubmission`) | new                   | Optional. Copied by "Convert to talk".                                                       |
| `summary` (recap)                               | none                                      | new                   | Lives on `events.recap`, not on the talk.                                                    |
| (none)                                          | `tags`                                    | kept                  | Used for speaker topics.                                                                     |
| (none)                                          | `slides`, `videoUrl`                      | never rendered        | Brand rule.                                                                                  |
| (none)                                          | `productDemo`, `productDemos`             | kept, not shown in V2 |                                                                                              |
| (none)                                          | `events` (single reference, `talk.ts:21`) | kept                  | Reverse lookup only.                                                                         |

## `speaker` → `Speaker`

| V2 field             | Current field                                               | Status              | Note                                                                                       |
| -------------------- | ----------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| `id`                 | `id` (slug)                                                 | exists              | URLs `/speakers/[id]` unchanged                                                            |
| `name`               | `name`                                                      | exists              |                                                                                            |
| `role`               | `title`                                                     | renamed             |                                                                                            |
| `company`            | `company` (written by the site, not declared in the schema) | exists (undeclared) | Declare it in Phase 3.                                                                     |
| `initials`           | none                                                        | derived             | Computed from `name`.                                                                      |
| `bio`                | `bio`                                                       | exists              |                                                                                            |
| `topics[]`           | `interests` (undeclared), plus tags of talks                | derived             | `interests` first, falling back to talk tags.                                              |
| `tagline`            | none                                                        | new                 |                                                                                            |
| `photo`              | `image`                                                     | exists              | Alt text derived from the name.                                                            |
| `links[]{label,url}` | `twitter`, `linkedin`, `github`, `website`                  | derived             | The mapper builds `links[]`; there is no new field unless the owner wants arbitrary links. |
| `talks[]`            | `*[_type=="talk" && references(^._id)]`                     | derived             |                                                                                            |
| (none)               | `email`, `isVisible`, `talks` (number), `talkReferences`    | kept                | `email` is never rendered. `isVisible` filters the directory.                              |

## `talkSubmission` (CFP)

| V2 form field (`v2/src/pages/api/forms/[kind].ts`, kind `cfp`) | Current                                                                                                     | Status                                                                                                                                                                                                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`, `email`                                                | Written to a `speaker` document (`submit-talk.ts:183`)                                                      | exists                                                                                                                                                                                                                                               |
| `title`                                                        | `title`                                                                                                     | exists                                                                                                                                                                                                                                               |
| `format`                                                       | `durationMinutes` (`talkSubmission.ts:27`)                                                                  | renamed: format maps to the duration                                                                                                                                                                                                                 |
| review status                                                  | `status`: `pending`, `approved`, `rejected`, `scheduled`, `completed`. The site also counts `under_review`. | Phase 3 adds labels for the V2 stages (received = `pending`; accepted = `approved`; scheduled; given = `completed`) and keeps the stored values, so no data migration is needed. `under_review` is added to the list so existing documents validate. |
| Convert to talk                                                | `actions/convertSubmissionToTalk.tsx` exists                                                                | exists                                                                                                                                                                                                                                               |

## Singletons and other records

| V2 type                                                | Current                                                                            | Status                                | Note                                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| `RatingRecord{score,scale,count,url,source,checkedAt}` | none (hardcoded in `v2/src/data/content.ts`)                                       | new singleton `meetupRating`          | `score: null` hides it. Manual updates only; no scraping.                       |
| `AwardRecord{title,category,url}`                      | none                                                                               | new: a field group on `siteSettings`  |                                                                                 |
| `ConferenceState` + `ConferenceCopy`                   | none                                                                               | new singleton `conference`            |                                                                                 |
| site emails, social URLs, association details          | hardcoded                                                                          | new singleton `siteSettings`          |                                                                                 |
| `Sponsor{id,name,logo,url}`                            | the `partner` type exists (`partner.ts`); the site uses static `src/data/index.ts` | exists                                | Use the `partner` type for `hosts[]`.                                           |
| `Milestone`, `TeamMember`, `Quote`                     | none (static)                                                                      | static files in the Astro app for now | Low churn, no editing need logged.                                              |
| feedback (per talk)                                    | `feedback`                                                                         | exists                                | V2 `rating` form writes `feedback`.                                             |
| feedback (evening)                                     | `comprehensiveFeedback` (undeclared)                                               | exists (undeclared)                   | V2 `feedback` form writes `comprehensiveFeedback`. Declare the type in Phase 3. |
| `stats`                                                | `stats`                                                                            | exists                                |                                                                                 |
| `announcement`                                         | `announcement`                                                                     | exists                                |                                                                                 |

## Form payloads (V2 → destination)

| kind                   | Required fields             | Destination                           |
| ---------------------- | --------------------------- | ------------------------------------- |
| `cfp`                  | name, email, title, format  | `speaker` (upsert) + `talkSubmission` |
| `partners`             | org, name, email, way       | Resend + Slack                        |
| `contact`              | name, email, topic, message | Resend + Slack                        |
| `feedback`             | eventId, overall            | `comprehensiveFeedback`               |
| `rating`               | eventId, target, stars      | `feedback`                            |
| `waitlist`, `checkout` | (workshop only)             | **de-scoped**                         |
| `donate`               | (none)                      | **removed** with Stripe (owner)       |
