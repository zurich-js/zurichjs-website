---
type: Domain
title: Events
description: ZurichJS meetups as a domain: the clock-based state machine, schedules and times, readiness before publishing, feedback windows, and where people get a place (Meetup and Sane).
tags: [events, meetups, state-machine]
timestamp: "2026-11-19T00:00:00Z"
---

# Events

Every event is a free meetup that people RSVP to on Meetup, or get a free ticket for on Sane where linked. Workshops, pro meetups and paid tickets were removed (owner, 2026-10-31 and 2026-11-01). The rules live in `packages/events` (`@zurichjs/events`), a package with no dependencies, so the site, the islands, the Slack agent and the tests share them.

## State machine

An event's displayed state comes from its editorial `status` plus the clock (`resolveState` in `packages/events/src/state.ts`):

| Editorial status (`events.status`)          | Displayed state                                   |
| ------------------------------------------- | ------------------------------------------------- |
| `cancelled`                                 | `cancelled`, whatever the clock                   |
| `postponed`                                 | `postponed`, whatever the clock                   |
| `tbc`, or no start time                     | `tbc` (the month text is shown instead of a date) |
| any other, from the start for 48 hours      | `live`: feedback mode                             |
| any other, 48 hours after the start         | `past`: the recap, on the same URL                |
| `full`, before the start                    | `full`                                            |
| `rsvp-soon`, before the start               | `notopen`                                         |
| `scheduled` (the default), before the start | `open`                                            |

- The 48 hours are `FEEDBACK_WINDOW_MS`. "From doors" in older text means the event's `datetime`, its start.
- **Pages are prerendered** in the state true at build time. The event islands re-evaluate it in the browser every minute and swap the actions, banner and rating, so the buttons people can press are always right. Rebuilds at the start and start + 48 h bring the HTML up to date for crawlers ([Rebuilds](/systems/operations/rebuilds.md)).
- `nextMeetup` is the next event that is neither cancelled nor past; the hero and the header use it.

## Times and schedules

All times are Europe/Zurich, with CET or CEST from the event's own date (`packages/events/src/schedule.ts`, `packages/events/src/format.ts`).

- **`datetime` is the start time listed on Meetup, not "doors".** The site says "Starts 18:00 CET" wherever it shows `datetime` with a label (the event opening and summary, Tonight, the calendar file, the Slack agent's change log). "Doors" appears only when the agenda has a timed doors line.
- **The event's `agenda` is the programme,** with times in Zurich. Talks on the event that the agenda leaves out are added after it, in order.
- **Without an agenda but with a start time,** the evening is estimated the way the old site did it (owner, 4th November 2026): doors at the start, the welcome an hour later, the first talk 20 minutes after that, 5 minutes between talks, a 15-minute food break after the second talk, then networking. These lines are marked "Times are approximate". Without a start time, the talks are listed in running order with no times. Never invent any other time.
- **The end** is `endsAt`, else the agenda's timed close line, else unknown. JSON-LD gives `endDate` only from `endsAt`; the calendar file still needs an end, so it blocks three hours and says so.

## Readiness

What the public page needs before an event can be published, per editorial status (`packages/events/src/readiness.ts`; the Studio's `apps/studio/lib/readiness.ts` holds the same rules, and `packages/events/test/readiness.test.ts` the shared cases):

- **Always:** a title, the URL ID (never changed after publishing), and a description of at least 50 characters.
- **Scheduled, RSVP-soon and full:** the date and start time, a venue, and a programme (talks or agenda).
- **TBC:** the month text (for example "January 2027").
- **Scheduled and full:** the Meetup event link.

The Studio shows these as the Readiness tab and badge; the Slack agent's Publish button refuses a draft that fails them.

## Feedback

- **Per-talk ratings open at the start** (state `live`) and stay available once `past`, so old QR codes and the legacy `/events/<slug>?feedback=true` links keep working (`packages/events/src/feedback.ts`). Before the start, the link says when feedback opens; cancelled, postponed and undated events say why nothing can be rated. A draft preview build opens the ratings early for organisers to check.
- **One rating per person, talk and speaker;** a rating stores event, talk and speaker references, and a talk with two speakers gets a rating per speaker. Duplicates are caught by an IP hash and a browser fingerprint.
- **Social evenings without talks** only ask about the evening.
- **Evening feedback** is stored as `comprehensiveFeedback` ([Forms](/domains/forms/overview.md)). Speakers read the ratings for their talks through a private link (`/feedback/speaker/[token]`, signed with `JWT_SECRET`).

## Where people get a place

`TicketingProvider` (`packages/events/src/ticketing.ts`) turns an event and its state into one action (`rsvp`, `waitlist`, `buy`, `follow` or `none`). Pages render the action and never branch on the provider.

- **Meetup** (`meetupTicketing`): RSVP while open, the waitlist when full, follow otherwise. An outbound RSVP click is not a registration.
- **Sane, free tickets side by side with Meetup** (owner decision): an event links to its Sane event in Sanity (the Studio's "Meetup" tab, "Free tickets on Sane": the organisation and event slugs from the Sane event link; keep the Meetup event link too). Each build reads the event from Sane's public API, with no key (`attachSane` in `packages/content/src/sane.ts`: only events with the field, in parallel, 8 seconds each). While Sane's registration is open and the site shows RSVP open, the main button is "Get a free ticket" to the Sane event page (`saneTicketing`). In every other case Meetup's action applies. `apps/web/src/lib/ticketing.ts` chains them: `chainTicketing(saneTicketing, meetupTicketing(...))`, the first provider with an answer wins.
- **Sane failures never fail the build:** a network error, a timeout, a 404 (a draft on Sane) or an unexpected body logs one `[sane] …` line and the event uses Meetup.
- **Known limit:** Sane is read at build time only, so the button follows Sane's state at the next build. Sold out on Sane while the site still says RSVP open gives the Meetup RSVP button; the site's own `full` status gives the Meetup waitlist.

What Sane does not cover yet (paid tickets, the embed, talk proposals, check-in) is in the Spec below.

## Calendar files

`/events/<slug>.ics` (`packages/events/src/ics.ts`) is one calendar entry, rebuilt with the site and never cached stale; a changed date reaches a calendar only when the person adds the event again. Text is escaped (semicolons included).

## Related concepts

- [Events content model](/domains/events/content-model.md), [Events frontend](/domains/events/frontend.md)
- [Talk proposals](/domains/talk-proposals/overview.md), [Partners](/domains/partners/overview.md) (hosts and supporters)
- Systems: [Web app](/systems/web.md), [Studio](/systems/studio.md), [Rebuilds](/systems/operations/rebuilds.md), [Slack content agent](/systems/slack-agent.md), [Media archive](/systems/media.md)
- Playbooks: `agents/skills/new-event/SKILL.md`, `agents/skills/edit-event/SKILL.md`, `agents/skills/event-recap/SKILL.md`

# Related specs

- [Ticketing and check-in on Sane](/domains/events/specs/sane-ticketing.md)
