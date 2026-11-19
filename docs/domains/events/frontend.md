---
type: Frontend Area
title: Events frontend
description: How meetups appear on the site: the home page, the events list, event pages, Tonight, feedback, speaker pages, calendar files and venue maps.
tags: [events, frontend, pages, islands]
timestamp: "2026-11-19T00:00:00Z"
---

# Events frontend

Pages: `apps/web/src/pages/index.astro`, `apps/web/src/pages/events`, `apps/web/src/pages/today.astro`, `apps/web/src/pages/feedback.astro`, `apps/web/src/pages/speakers`. Islands: `apps/web/src/components/islands/event` (actions, banner, summary, programme, venue, feedback gate), `apps/web/src/components/islands/today`, and `apps/web/src/components/islands/useEventState.ts`, which re-evaluates the event state on mount and every minute. Components come from [the design system](/systems/design-system/components.md).

## Home page

- **Hero:** "JavaScript meets Zurich." is the H1, "Shaping the Zurich tech scene." a smaller H2, then one line of copy. No rating in the hero (Bogdan's review, 4th November 2026); the rating and award sit in the award section (`/#award`).
- **Next meetup:** a white media link card inside the black hero, the only light surface there: date and venue, title, "Details and RSVP". The whole card links to the event page; no price, "RSVP open" or Meetup note. On phones it keeps its artwork beside the text (`Card mediaLayout="side"`), so it stays under 200px tall.
- **Below:** the award section, a packed photo grid (packed at build time), the speaker arc (roles, not talk titles; holds on hover), "Where our speakers come from", hosts and current sponsors ([Partners](/domains/partners/overview.md)), the yellow "Speak at a meetup" block, and the footer.
- **Navigation:** sticky, a floating black pill after scrolling, a full-screen dialog menu on phones. The header's "Get involved" menu lists Membership and Donate; the current page's link is yellow.

## Events list (`/events`)

Every meetup on one page: upcoming in date order, then past newest first. Each meetup is the home hero's card (`EventRow`, `Card mediaLayout="row"`), with the date, "RSVP open" while it is, the talks when there are any, and the venue as facts. Past meetups are dimmed to 70% until hovered or focused (owner, 12th November 2026). A sticky bar holds the search; the `#upcoming` and `#past` anchors and `?tab=past` still land on their section. Filtering cross-fades in place.

## Event page (`/events/[slug]`)

- **Opening:** title, the start ("Starts 18:00 CET"), and the event's artwork beside the title only when it has one.
- **Summary card:** leads with the date, the main action from the ticketing provider ([Events](/domains/events/overview.md)), a copy-link icon button, and **Add to calendar**, a `Menu`: Google Calendar and Outlook open a prefilled entry; Apple and other apps open `/events/<slug>.ics`. Share is an icon button.
- **Banner and actions** follow the state: open, RSVP soon, TBC, full, postponed, cancelled, live (feedback mode), past (recap).
- **Programme:** each talk, then who gives it, with larger avatars; times from the agenda, estimated lines marked "Times are approximate", or talks in running order with no times. Long talk descriptions are truncated to five lines with "Read more" / "Show less" (owner, 2nd November 2026); the full text stays in the page for search engines and screen readers.
- **Venue:** the full address and a Google map under it on every event page, loaded lazily as it scrolls into view (owner, 2nd November 2026), with "Get directions" next to it. With `PUBLIC_GOOGLE_MAPS_EMBED_KEY` it is the Maps Embed API; otherwise Google's keyless embed of the address. A privacy note stays with the map. The venue and summary cards have a frame instead of a grey background.
- **Thanks:** the evening's hosts and supporters with logos; on upcoming events also this season's sponsors ([Partners](/domains/partners/overview.md)).
- **After the event:** the recap (one or two sentences per talk), photos and clips, or an honest note when there are none ([Media archive](/systems/media.md)). Slides are linked only when the speaker shared them; talks are never presented as recorded.
- **Feedback:** while `live`, and on legacy `?feedback=true` links, per-talk ratings in a `RatingSheet` dialog and the evening feedback form.

## Tonight (`/today`)

Decided from the browser clock in Zurich (`packages/events/src/today.ts`); it never calls a future meetup "tonight":

| Mode       | When                                  | Shows                        |
| ---------- | ------------------------------------- | ---------------------------- |
| `upcoming` | before the event's day                | "Next meetup: …"             |
| `today`    | the event's day, before the start     | arrival, venue, programme    |
| `live`     | from the start until the evening ends | now and next, rate the talks |
| `after`    | after the evening, until start + 48 h | thanks, feedback             |
| `none`     | nothing dated is coming up            | what to do meanwhile         |

The layout follows the old site: what to do on the left (feedback, sharing, staying in touch), the evening on the right (the programme, getting there, thanks); on phones the programme comes first. "Keep ZurichJS going" spans the width below and links to membership. The hero has no labels, and the venue is plain text.

## Feedback (`/feedback`) and speaker feedback

`/feedback` collects the evening feedback for a recent event. Social evenings without talks only ask about the evening, with no "Rate the talks" wording anywhere. Speakers see the ratings for their talks on `/feedback/speaker/[token]`, a private, noindex, server-rendered page behind a signed link.

## Speakers (`/speakers`, `/speakers/[id]`)

- **The list:** speaker cards (the photo turned on a grey card, straightening on hover or focus; owner, 17th November 2026), with search over names, talk titles, descriptions and topics. Hidden speakers (`isVisible`) are left out.
- **A speaker page:** the profile, Person JSON-LD, and each talk once, with all its events as link cards. Profiles keep the full talk text. Old speaker IDs 301 to the current one.

## Related concepts

- [Events](/domains/events/overview.md), [Events content model](/domains/events/content-model.md)
- [Web app](/systems/web.md), [Design system components](/systems/design-system/components.md), [Motion](/systems/design-system/motion.md), [Media archive](/systems/media.md), [SEO](/systems/seo.md)

# Related specs

- [Ticketing and check-in on Sane](/domains/events/specs/sane-ticketing.md)
