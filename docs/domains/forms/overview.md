---
type: API
title: Forms
description: The public forms and their single intake endpoint, what each form kind stores or sends, the shared validation, the browser behaviour every form follows, and the contact, volunteer and waitlist pages.
tags: [forms, api, validation, resend, slack]
timestamp: '2026-11-19T00:00:00Z'
---

# Forms

Source: `apps/web/src/pages/api/forms/[kind].ts`, `packages/forms` (zod schemas, plus `@zurichjs/forms/client` for the browser), `packages/integrations/src/index.ts` (`forwardForm`), and the form islands in `apps/web/src/components/islands/forms`.

## Contract

```
POST /api/forms/<kind>   JSON body
POST /api/forms/cfp      or multipart: `data` (the same JSON) and an optional `photo` (JPEG, PNG or WebP, up to 5 MB)
200 { ok: true, id }
400 { ok: false, error, fields? }   invalid JSON or missing or invalid fields
404 { ok: false, error }            unknown form kind
405 { ok: false, error }            anything but POST
409 { ok: false, error }            already rated (one rating per person, talk and speaker)
502 { ok: false, error }            a configured channel failed
```

Server functions validate with zod. The browser validates with a zod-free validator, which saves about 87 KB of JavaScript per form page; a test keeps its required fields in sync with the zod schemas. A missing secret logs a stub line and the form still answers.

## Form kinds

| Kind        | Page                              | Required                                                | Goes to                                                                                                                                                               |
| ----------- | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cfp`       | `/cfp`, the CFP bot               | name, email, title, format, and more                    | a `speaker` (new and hidden, or matched by email) and a pending `talkSubmission` in Sanity, plus a Slack note ([Talk proposals](/domains/talk-proposals/overview.md)) |
| `partners`  | `/partners`                       | organisation, name, email, way                          | email (Resend, reply-to the sender) and Slack, every field labelled ([Partners](/domains/partners/overview.md))                                                       |
| `contact`   | `/contact`                        | name, email, topic, message                             | email and Slack                                                                                                                                                       |
| `volunteer` | `/cfv`                            | name, email, LinkedIn, availability, interests, message | email and Slack; no Sanity record, as on the old site                                                                                                                 |
| `feedback`  | event pages, `/feedback`, Tonight | event, overall score                                    | a `comprehensiveFeedback` document in Sanity                                                                                                                          |
| `rating`    | event pages, Tonight              | event, talk, stars (1 to 5)                             | a `feedback` document in Sanity, one per person, talk and speaker ([Events](/domains/events/overview.md))                                                             |

Contact and partner enquiries are not stored in Sanity. Workshop-only kinds (`checkout`, `waitlist`) are de-scoped and not accepted.

## Other endpoints

- **`/api/subscribe`** (`/waitlist/conf`): adds an email to the EmailOctopus conference list, the same list and API as the old site. Without `EMAIL_OCTOPUS_*`, nothing is saved and it says so in the log.
- **`/api/verein-inquiry`:** the old membership request endpoint, kept for anything that still posts to it ([Membership](/domains/membership/overview.md)).
- **`/api/speaker-profile`, `/api/speaker-feedback/[token]`:** behind signed links ([Talk proposals](/domains/talk-proposals/overview.md), [Events](/domains/events/overview.md)).

## How every form behaves

- **Labels and errors:** fields are named by their label alone (`aria-labelledby` in `Field.tsx`) and described by hint and error; "All fields are required unless marked optional", with `(optional)` labels and `required`. Validation names each missing field, marks it invalid and moves focus to the first one.
- **Sending:** the button is disabled while sending, `useSubmitOnce` ignores a second submit while one is running, and success shows only after the API accepts. A failed send keeps every answer and offers the message by email.
- **Spam:** a shared honeypot field, hidden from people, keyboards and assistive technology (`inert`), plus the IP-hash and fingerprint duplicate checks for ratings.
- **Controls:** radios and checkboxes are native inputs (arrow keys and Space work), styled as choices ([Components](/systems/design-system/components.md)).
- **Copy:** confirmation says what the site does ("An organiser will reply to …"); the forms never email the person who submitted.

## The contact page

`/contact` keeps the form and the old site's channels (email, LinkedIn, Meetup), the organisers with their emails and what to ask each about, and an FAQ (speaking, travel, beginners, hosting, getting involved, replies) with FAQPage JSON-LD. Code of conduct concerns have their own block (`#conduct`): the code of conduct's reporting route (email hello@zurichjs.com or speak to a team member at an event) and a note not to use the form, because the form also posts to the organisers' Slack. Topic presets: `?topic=conduct`, `slack`, `speaking`, `hosting`, `press`, `website`.

## The volunteer page

`/cfv` collects what the old site did: name, email, LinkedIn profile (required, a linkedin.com link), GitHub (optional), availability (a few hours weekly, a few hours monthly, only during events, or Other with a short text) and areas of interest (one or more), and why they want to volunteer. The payload keeps the old field names: `linkedinProfile`, `githubProfile`, `availability` (`weekly`, `monthly`, `events`, `other`), `availabilityOther`, `interests`, `message`. The page repeats the old site's promise that someone from the organising team replies within 7 days; whether that still holds is an open question for the owner.

## Related concepts

- [Talk proposals](/domains/talk-proposals/overview.md), [Partners](/domains/partners/overview.md), [Events](/domains/events/overview.md), [Membership](/domains/membership/overview.md), [Donations](/domains/donations/overview.md)
- [Web app](/systems/web.md), [CFP bot](/systems/cfp-bot.md), [Environment variables](/systems/operations/environment.md), [Foundations](/systems/design-system/foundations.md)

# Related specs

None.
