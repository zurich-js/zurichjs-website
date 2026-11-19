---
type: Domain
title: Talk proposals
description: How people propose a meetup talk (the /cfp form and the CFP bot), what is stored, how organisers review and schedule proposals, and how accepted speakers complete their profile.
tags: [talk-proposals, cfp, speakers, sanity]
timestamp: '2026-11-19T00:00:00Z'
---

# Talk proposals

Say "talk proposals"; explain "call for papers (CFP)" once. Source: `apps/web/src/pages/cfp.astro` and the CFP form island in `apps/web/src/components/islands/forms`, `schemas.cfp` in `packages/forms/src/index.ts`, `forwardForm` and `sanityTalkProposals` in `packages/integrations/src/index.ts`, the `talkSubmission` type, `apps/web/src/server/speaker-profile.ts`, `apps/web/src/pages/speakers/profile.astro`.

## Two ways in

- **The `/cfp` form**, for meetups only (owner, 3rd November 2026: ZurichJS Conf's call for papers is over, so there is no meetup-or-conference choice). Grouped as About you, Speaker profile, Socials, Your talk and Before you send, with short notes beside it on wide screens. `/cfp/form` 301s to `/cfp#proposal`.
- **The CFP bot in Slack** ([CFP bot](/systems/cfp-bot.md)), which submits through the same `forwardForm('cfp', …)` path.

Both write through the `TalkProposalSink` seam; today it creates the Sanity `talkSubmission` (a later Sane implementation would slot in there; [Sane Spec](/domains/events/specs/sane-ticketing.md)).

## The form

- **About you and the profile:** name, email, job title, company, bio, photo, LinkedIn, GitHub, X, Bluesky, website (matching the Sanity speaker's fields).
- **The talk:** title, description ("What will people learn?", required), length, level, and one to eight topics from a fixed list (stored as `talkSubmission.tags`), and whether it is their first talk.
- **Lengths:** a 10-minute lightning talk or a 20-minute full talk (owner, 4th November 2026). The stored form values stay `Lightning` and `Standard`, so saved drafts still open. No deep dives.
- **Speaking history** is one choice; the form starts on "No, not yet.". **Returning speakers** may leave the profile empty; they are matched by email.
- **Photo:** optional, JPEG, PNG or WebP. The browser shrinks it to at most 1600 px and sends the proposal as multipart (`data` plus `photo`); the API checks the type and the 5 MB limit.
- **Terms:** a required checkbox, checked in the browser and on the server: travel and accommodation can't be covered for meetup talks because events are free, and acceptance depends on the theme and on speaking slots. Nothing about travel is promised either way.
- **Drafts** are saved in the browser on every change, disclosed above the form, cleared by "Clear saved answers" and after a successful send, and kept after a failed one, with the whole proposal in the email fallback.
- **Topics:** "Mostly JavaScript and the web, but not only." No response time is promised; organisers reply by email.

## What is stored

- **A new speaker** gets a hidden `speaker` document with the profile fields (GitHub and X handles become full URLs).
- **An existing speaker's page never changes from the public form.** What they sent, including a new photo, goes into the submission's `reviewNotes`; their page changes through the private profile link or an organiser.
- **`talkSubmission`** fields: `id`, `title`, `description`, `durationMinutes`, `level` (`beginner`, `intermediate`, `advanced`), `tags`, `speakers`, `firstTalk`, `status`, `reviewNotes`, `submittedAt`, `reviewedAt`, `convertedToTalk`, `talkReference`.
- **Statuses**, labelled for review with the stored values kept: Received (`pending`), Under review (`under_review`), Accepted (`approved`), Scheduled (`scheduled`), Given (`completed`), Not this time (`rejected`). The Studio offers 10 and 20 minutes; older submissions keep their 5, 25 or 35.
- **Organisers** get a Slack note for each new proposal ("via Slack" when it came from the bot).

## Review and scheduling

- **In the Studio:** the talk proposals list and "Convert to Talk", which creates the `talk` and links it (`talkReference`).
- **From Slack:** the organisers' bot lists proposals by status with likely duplicates, sets statuses, and schedules a proposal onto a meetup; publishing then offers to email the speaker that their talk is scheduled ([Slack content agent](/systems/slack-agent.md)).

## Speaker profiles after acceptance

The CFP stays short; accepted speakers complete their profile progressively. An organiser creates a private link with `pnpm speaker-link <speaker-id>` (a JWT valid 30 days, needs `JWT_SECRET`). On `/speakers/profile` (noindex) the speaker adds a photo, bio, role, links and topics; `/api/speaker-profile` saves them as a Sanity draft, photos to Sanity assets, for organisers to publish. The "talk scheduled" email includes the same link. There are no accounts.

## Related concepts

- [CFP bot](/systems/cfp-bot.md), [Slack content agent](/systems/slack-agent.md), [Forms](/domains/forms/overview.md)
- [Events](/domains/events/overview.md), [Events content model](/domains/events/content-model.md) (`talk`, `speaker`), [Content sources](/reference/content-sources.md)
- [Web app](/systems/web.md), [Studio](/systems/studio.md)

# Related specs

- [Ticketing and check-in on Sane](/domains/events/specs/sane-ticketing.md) (talk proposals on Sane)
