---
type: Spec
title: Ticketing and check-in on Sane
description: Moving more of an event's ticketing, talk proposals and check-in to Sane without rewriting pages; free tickets beside Meetup are built, the rest is not.
tags: [events, sane, ticketing, talk-proposals]
timestamp: '2026-11-19T00:00:00Z'
status: in-progress
domain: events
systems: [web, content, events, integrations]
---

# Outcome

ZurichJS can switch ticketing, talk proposals and check-in to [Sane](https://sane.events) later without rewriting pages. Sane is ticketing for tech events that plugs into meetup.com, Luma, organisers' own sites and Sane-hosted event pages. An organisation is its legal and money entity; brands (for example ZurichJS Conf) are series inside it.

**Built:** free tickets on Sane side by side with Meetup, for events linked to Sane (owner decision). How it works is in [Events](/domains/events/overview.md), "Where people get a place". **Not built:** paid tickets, the embed, talk proposals and check-in on Sane.

## Seams already in place

1. **`TicketingProvider`** in `packages/events/src/ticketing.ts`: pure, so islands can use it. `presentEvent()` takes the action as data and never branches on the provider. The action kinds include `buy`, and `chainTicketing` lets Sane go in front of Meetup; the first provider with an answer wins (tested in `packages/events/test/state.test.ts`).
2. **`TalkProposalSink`** in `packages/integrations/src/index.ts`: today it writes the Sanity `talkSubmission`. The CFP form, its API endpoint and the CFP bot depend only on the interface.
3. **Server side only.** Sane's public API allows only Sane's own web origin (CORS), so every call happens at build time or in a function, never in the browser.
4. **Sane identifiers in content:** the optional `events.sane{ organization, event }` object. Optional, so no migration.

## What Sane offered (read from `farisaziz12/sane@50e27b4`, 2026-10-31)

| Capability                                    | Status in Sane then                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Read an event (state, capacity, ticket types) | Built, public, no auth: `GET /v1/public/events/{org}/{event}`                                                |
| List an organisation's or series' events      | Built                                                                                                        |
| Free registration                             | Built: `POST /v1/public/events/{org}/{event}/registrations` with an `Idempotency-Key`; returns a ticket link |
| Paid tickets                                  | Not open (`409 paid_tickets_not_open`); a future `POST /v1/public/orders` specified                          |
| Buy link (`…/{event}?type={id}&qty=n`)        | Specified                                                                                                    |
| Embed (`<sane-tickets event="…">`)            | Specified, hidden until built                                                                                |
| API keys, outbound webhooks                   | Planned                                                                                                      |
| Talk proposals (CFP)                          | Not built (only CFP dates in the conference setup)                                                           |
| Donations                                     | Not found; donations stay on Stripe                                                                          |
| Check-in                                      | Built for organisers (session cookie); no public surface                                                     |
| Imports from meetup.com or Luma               | Planned                                                                                                      |

**Concept mapping:** the ZurichJS association is a Sane organisation; ZurichJS meetups and ZurichJS Conf are series; an `events` document is a Sane event (identified by organisation and event slug, or a stable `evt_…` ID); `status` `scheduled/rsvp-soon/full/cancelled` corresponds roughly to Sane's `registration.state` `open/not_open_yet/sold_out/cancelled`; a `talkSubmission` is a Sane submission. Sane's wording matches the site's: "talk proposals", "check-in", "who's coming".

## Requirements and acceptance

- **Paid tickets:** once Sane opens them, a `buy` action from `saneTicketing` for linked events with a paid ticket type. Paid meetups need an owner decision first: pro meetups and paid tickets were removed (owner, 2026-11-01), and the refund policy and terms are owner-only legal pages.
- **Embed:** only if Sane ships it; it must not load third-party script before the person asks, and must keep the Lighthouse thresholds.
- **Talk proposals on Sane:** a second `TalkProposalSink` implementation; the form and the CFP bot stay unchanged.
- **Check-in:** no site surface is needed until Sane offers one.
- **Fresher state:** today Sane's state reaches the site only at the next build. A Sane webhook to `/api/rebuild`, or a function, would need Sane's planned outbound webhooks.
- Every step keeps Meetup as the fallback, never fails the build when Sane is down, and never ships sample data.

## Affected concepts

- [Events](/domains/events/overview.md)
- [Events content model](/domains/events/content-model.md)
- [Events frontend](/domains/events/frontend.md)
- [Talk proposals](/domains/talk-proposals/overview.md)

## Open decisions

- Whether ZurichJS wants paid tickets at all (owner).
- Whether Meetup RSVPs stay open when Sane is linked (today: yes, side by side).
- Which of the remaining Sane features to adopt, and when. Sane's status above is from 2026-10-31 and may have changed.
