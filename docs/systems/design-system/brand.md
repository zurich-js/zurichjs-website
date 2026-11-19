---
type: Reference
title: Brand rules
description: The binding ZurichJS brand rules in detail, with the colour roles; changing any of them needs the owner.
tags: [design-system, brand, binding]
timestamp: '2026-11-19T00:00:00Z'
---

# Brand rules

These rules are binding. Changing any of them needs the owner's approval. The rules for how UI is built within them are in [UI and design system rules](/systems/design-system/ui-rules.md).

## Rules

- **Structure:** a black opening (header and page opening), white content, and a black footer.
- **Typeface:** Figtree only, as a variable font (300–900).
- **Accent:** `#F1E271` is the only accent colour. Blue (`#268BCC`) is used only for focus rings and the logo.
- **Shapes:** buttons, filter chips and switches are pills; tags have 6px corners (owner, 12th November 2026); cards follow the rounding formula in [Foundations](/systems/design-system/foundations.md) (24px where text touches the edge); large blocks use `clamp(24px, 3vw, 40px)`.
- **No kickers:** no small all-caps labels above headings.
- **No decorative borders or dividers:** separate content with space and surfaces instead. Borders are allowed only where they do a job: form controls, the secondary button, the frame of an `outline` card (it says where a card ends on white), and the white swatch in the gallery. No gradients.
- **One breakpoint:** 800px ([Foundations](/systems/design-system/foundations.md)).
- **No recordings:** never promise or link talk recordings. ZurichJS does not record talks. Link slides only when the speaker shared them (owner, 2026-11-01). Short clips from the evening may appear in the media archive, never presented as talk recordings.
- **Rating and award:** on the home page the rating sits in the award section ("Rated 4.9/5 on Meetup from 199 ratings."), never in the hero (Bogdan's review, 4th November 2026). Elsewhere it is one sentence, "Rated 4.9/5 on Meetup from 199 ratings, and winner of the 2026 Open Source Award for … globally", with the award linking to its section on the home page (`/#award`). If the rating has no score, drop the rating part and keep the award. The rating comes from the `meetupRating` record, updated by hand and never scraped (`agents/skills/rating-refresh/SKILL.md`). Changing the rating copy needs the owner.
- **No invented facts:** dates, prices, attendee numbers, speakers and venues come from content or from a person, never from an agent.
- **Copy:** plain, specific, no em dashes. Say "talk proposals" (explain "call for papers (CFP)" once).

## Colour roles

- **Yellow has one clear role** (Bogdan's review, 4th November 2026): small button accents, and on the home page one large section, "Speak at a meetup".
- **Yellow is allowed for:**
  - the one call to action per view (`Button variant="cta"`, hover `#E3CB16`)
  - a chosen choice: the frame and dot of a `ChoiceCard`, the frame of a form option, the stars of a rating
  - the focus ring on black surfaces, and on choice cards and form options (owner, 18th November 2026)
  - the current page's link in the header (owner, 17th November 2026)
  - the "Speak at a meetup" section (the home page's only large yellow block)
- **Not yellow:**
  - more than one primary button per view
  - text highlights (dates, numbers, links) and footer links; the header's current-page link is the one exception
  - decoration
  - body text on white (it fails contrast)
- **Surfaces on black** use `ink` and `ink-2`. **Supporting light surfaces** use `grey` and `grey-soft`.
- **Text colours:** `ink-2` for secondary text on white, `grey-text` for hints, and `grey-light` for secondary text on black.
- **Errors** use `danger`, with `danger-soft` as the background, and only for errors (owner, 3rd November 2026). Never signal an error by colour alone: always add a message.
- **Success** uses `success` (text) and `success-soft` (panel background): confirmations after a form is sent or an action is done, nothing else (owner, 3rd November 2026).
- **Social links** use one scheme everywhere: white or outlined, with each network's mark in the text colour (black on white, white on black), never its brand colours.

## Related concepts

- [Design system package](/systems/design-system/overview.md), [Foundations](/systems/design-system/foundations.md), [Components](/systems/design-system/components.md)
- [Decision record](/reference/decisions/index.md): where each rule was decided
- [Content model](/domains/content/content-model.md): the `meetupRating` and award fields behind the rating sentence

# Related specs

None.
