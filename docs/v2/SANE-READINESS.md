# Sane readiness

Goal: the V2 platform can switch ticketing, talk proposals and check-in to [Sane](https://github.com/farisaziz12/sane) later without rewriting pages.

**Built now (free tickets, side by side with Meetup):** an event can link to its Sane event, and while Sane's registration is open the main button offers a free ticket on Sane. Meetup RSVPs stay open and Meetup is the fallback in every other case. See "Free tickets on Sane" below. Paid tickets, the embed, talk proposals and check-in on Sane are still out of scope.

Source: `farisaziz12/sane@50e27b4` (read 2026-10-31). Sane is ticketing for tech events that plugs into meetup.com, Luma, organisers' own sites and Sane-hosted event pages. An organisation is the legal and money entity; brands (for example ZurichJS Conf) are series inside it.

## What Sane offers an organiser's site today

| Capability                                              | Status in Sane                                                               | Where                                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Read an event (state, capacity, ticket types)           | Built, public, no auth                                                       | `GET /v1/public/events/{org}/{event}` in `apps/api/src/routes/public.ts`                                      |
| List an organisation's or series' events                | Built                                                                        | `GET /v1/public/organizations/{org}`, `…/series/{series}`                                                     |
| Free registration                                       | Built                                                                        | `POST /v1/public/events/{org}/{event}/registrations`, with an `Idempotency-Key` header. Returns a ticket link |
| Paid tickets                                            | Not open (`409 paid_tickets_not_open`)                                       | `docs/specs/spec-ticketing.md` R0 names a future `POST /v1/public/orders`                                     |
| Buy link (`…/{event}?type={id}&qty=n`)                  | Specified                                                                    | spec-ticketing R0a                                                                                            |
| Embed (`<sane-tickets event="zurichjs/november-2026">`) | Specified, hidden until built                                                | `docs/design/specs/83/README.md`                                                                              |
| API keys (`sane_live_…`), outbound webhooks             | Planned                                                                      | `docs/specs/spec-organiser-onboarding.md` §5                                                                  |
| Talk proposals (CFP)                                    | Not built (only `cfp{opensOn,closesOn,decisionsBy}` in the conference setup) | `apps/api/src/http/setup-schemas.ts`                                                                          |
| Donations                                               | Not found                                                                    | (none)                                                                                                        |
| Check-in                                                | Built for organisers (session cookie)                                        | `routes/attendees.ts`                                                                                         |
| Imports from meetup.com or Luma                         | Planned ("own spec")                                                         | spec-organiser-onboarding cut line, step 6                                                                    |

Constraints that shape the seams:

- **CORS:** the public API allows only Sane's own web origin. A browser on zurichjs.com cannot call it directly; a Netlify Function can.
- **Event identity:** organisation slug + event slug (`/events/{org}/{event}`), or the stable `evt_…` public ID.
- **Wording:** "talk proposals" (explain "call for papers (CFP)" once), "check-in", "who's coming", "brand" for series, "your payment provider".

## Concept mapping

| ZurichJS (Sanity / V2)           | Sane                                            | Notes                                                                                                             |
| -------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The ZurichJS association         | Organization (`org_…`)                          | Money and legal entity                                                                                            |
| ZurichJS meetups, ZurichJS Conf  | Series / brand (`ser_…`)                        |                                                                                                                   |
| `events` document                | Event (`evt_…`, slug)                           | V2 status `scheduled/rsvp-soon/full/cancelled` ≈ Sane `registration.state` `open/not_open_yet/sold_out/cancelled` |
| `meetupUrl` RSVP (outbound link) | Event page link or embed                        | "An outbound RSVP click is not a registration" holds for both                                                     |
| (none; pro meetups removed)      | Ticket type with a price (paid tickets, future) |                                                                                                                   |
| `talkSubmission`                 | Submission (Sane's term; CFP not built yet)     |                                                                                                                   |
| (none; online donations removed) | none                                            | Support page lists membership, hosting, speaking                                                                  |
| /today check-in                  | Check-in (organiser side)                       | No public surface                                                                                                 |

## Seams built in the V2 platform (Phases 1 and 1b)

1. **`TicketingProvider`** in `@zurichjs/events` (pure, so islands can use it; `packages/events/src/ticketing.ts`):

   ```ts
   interface TicketingAction {
     kind: 'rsvp' | 'waitlist' | 'buy' | 'follow' | 'none';
     label: string;
     href?: string;
     note: string;
   }
   interface TicketingProvider {
     id: 'meetup' | 'sane';
     /** Called at build time for each event; must not need the browser. */
     actionFor(event: DomainEvent, state: EventState): TicketingAction;
   }
   ```

   - Today: `chainTicketing(saneTicketing, meetupTicketing(MEETUP_GROUP_URL))` in `apps/web/src/lib/ticketing.ts` (see "Free tickets on Sane" below). Every meetup is free; pro meetups and Stripe were removed (owner, 2026-11-01).
   - `presentEvent()` in `@zurichjs/events` takes the action as data and never branches on the provider itself.
   - Sane goes in front with `chainTicketing(saneTicketing, meetupTicketing(...))`; the first provider with an answer wins (tested in `packages/events/test/state.test.ts`).
   - `saneTicketing` is pure: it reads only `event.sane`, which the content layer fills at build time from `GET /v1/public/events/{org}/{event}`. Switching one event is the per-event `sane` field.

2. **`TalkProposalSink`** in `@zurichjs/integrations` (`packages/integrations/src/index.ts`):

   ```ts
   interface TalkProposalSink {
     submit(p: TalkProposal): Promise<{ id: string }>;
   }
   ```

   Today it writes the Sanity `talkSubmission`. The CFP form and its API function depend only on the interface.

3. **Server-side only.** All provider calls happen at build time or in Netlify Functions, matching Sane's CORS rule.
4. **Sane identifiers in content:** the optional `sane{ organization, event }` object on `events` (Studio tab "Meetup", "Free tickets on Sane"). Optional, so no migration.

## Free tickets on Sane (built)

Owner decision: side by side. Meetup RSVPs stay open; Sane is preferred for events linked to it.

| Piece           | Where                                                                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sanity field    | `events.sane{ organization, event }` (`apps/studio/schemaTypes/events.ts`), read by `EVENTS_QUERY`                                                                                                                                              |
| Build-time read | `attachSane` in `packages/content/src/sane.ts`: only events with the field, in parallel, 8 s timeout each. Sets `event.sane = { url: SANE_WEB_URL + event.path, state: registration.state }`                                                    |
| Failure         | network error, timeout, 404 (draft on Sane), a body that is not JSON or lacks `event.path` or a known `registration.state`: one `[sane] …` log line, `event.sane` stays unset, the event uses Meetup. Never fails the build, no sample data     |
| Provider        | `saneTicketing` in `packages/events/src/ticketing.ts`: when the site state is `open` and Sane says `open`, "Get a free ticket" (external) to the Sane event page. Any other Sane state, or no `sane`, has no answer, so Meetup's action applies |
| Configuration   | `SANE_API_URL` (default `https://api.sane.events`), `SANE_WEB_URL` (default `https://sane.events`); see `docs/v2/RUNBOOK.md`                                                                                                                    |

Known limit: Sane is read at build time only, so the button follows Sane's state at the next build (a Sanity publish, or the scheduled rebuilds at doors). Sold out on Sane while the site still says RSVP open gives the Meetup RSVP button; the site's own `full` status gives the Meetup waitlist.
