---
name: new-event
description: Add a ZurichJS meetup in Sanity as a draft, filling only what the organiser said, then report what the page still needs before it can be published. Use when someone says "add the next meetup", "set up the December meetup", or gives a date, venue or talks for an upcoming event.
---

# New event

Works through the Slack agent (`createEventDraft`), the Sanity MCP or the Studio. The rules are the same everywhere.

1. **Gather what is known:**
   - title
   - date and doors time in Zurich (usually 18:00 or 18:30)
   - venue name and address
   - the Meetup.com event link
   - a 2–4 sentence description
   - the programme, if known

   Ask only for what is missing. **Never invent** dates, venues, speakers, prices or numbers.

2. **Check it isn't a duplicate:** list the upcoming events first. If one already covers that date, edit it instead (see `edit-event`).
3. **Reuse a venue:** look up venues used before, and copy the exact name and address.
4. **Pick the URL slug** (permanent once published): lowercase with hyphens, for example `zurichjs-meetup-december-2026`. Never reuse a slug.
5. **Pick the status:**
   - `rsvp-soon` while there is no Meetup link
   - `scheduled` once the link exists
   - `tbc` when only the month is known, and then set the month text ("January 2027")
6. **Create it as a draft.** Nothing goes live yet.
7. **Report what is still missing** before publishing: title, URL, a description of 50+ characters, date, venue, programme, and the Meetup link for scheduled events. Offer to fill those gaps.
8. **A person publishes.** In Slack, an organiser on the publish list presses **Publish**; elsewhere, use the Studio. Publishing rebuilds the site in about 4 minutes.
