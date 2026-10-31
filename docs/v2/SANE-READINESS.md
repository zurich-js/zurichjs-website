# Sane readiness

Goal: the V2 platform can switch ticketing, talk proposals and check-in to [Sane](https://github.com/farisaziz12/sane) later without rewriting pages. **Out of scope now:** no Sane calls, no Sane fields in Sanity, no Sane UI.

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
| `isProMeetup` + `stripePriceId`  | Ticket type with a price (paid tickets, future) |                                                                                                                   |
| `talkSubmission`                 | Submission (Sane's term; CFP not built yet)     |                                                                                                                   |
| Donation via Stripe              | none                                            | Stays on Stripe                                                                                                   |
| /today check-in                  | Check-in (organiser side)                       | No public surface                                                                                                 |

## Seams built in the V2 platform (Phases 1 and 1b)

1. **`TicketingProvider`** in `@zurichjs/integrations`:

   ```ts
   interface TicketingAction {
     kind: "rsvp" | "waitlist" | "buy" | "follow" | "none";
     label: string;
     href?: string;
     note: string;
   }
   interface TicketingProvider {
     id: "meetup" | "stripe" | "sane";
     /** Called at build time for each event; must not need the browser. */
     actionFor(event: DomainEvent, state: EventState): TicketingAction;
   }
   ```

   - Today: `meetupProvider` (RSVP, waitlist and follow links to meetup.com) and `stripeProvider` (pro meetups with `stripePriceId`).
   - `presentEvent()` in `@zurichjs/events` takes the action as data and never branches on Meetup or Stripe itself.
   - A later `saneProvider` reads `GET /v1/public/events/{org}/{event}` at build time and returns a buy or registration link. Switching one event is a per-event field, added when Sane is adopted.

2. **`TalkProposalSink`** in `@zurichjs/integrations`:

   ```ts
   interface TalkProposalSink {
     submit(p: TalkProposal): Promise<{ id: string }>;
   }
   ```

   Today it writes the Sanity `talkSubmission`. The CFP form and its API function depend only on the interface.

3. **Server-side only.** All provider calls happen at build time or in Netlify Functions, matching Sane's CORS rule.
4. **No Sane identifiers in content yet.** When adopted, add `sane{ org, event }` to `events` through a migration. Nothing is reserved now.
