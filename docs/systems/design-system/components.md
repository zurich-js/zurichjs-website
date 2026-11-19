---
type: Reference
title: Components
description: The design system's component catalogue, with the rules for buttons, cards, choices and logos.
tags: [design-system, components]
timestamp: '2026-11-19T00:00:00Z'
---

# Components

Visual variants are props of these components, defined once ([UI rules](/systems/design-system/ui-rules.md), rule 3). Before building something, check this table and the `/design` gallery: a second version of a component is a bug. Static components are in `packages/design/src/components`, Preact primitives and twins in `packages/design/src/islands`, shared class recipes in `packages/design/src/recipes.ts`.

## Catalogue

| Component                                      | Use                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Heading`, `Text`                              | Type roles by prop (`size`, `tone`). Level (`as`) and look (`size`) are separate. Islands use the `Heading` twin.                                                   |
| `Section`, `AutoGrid`                          | A page section with its gutter, heading block and width; an auto-fit grid with three minimum widths (240, 300, 380px).                                              |
| `Button`                                       | Four variants, one height. See Buttons.                                                                                                                             |
| `Tag`, `TagLink`, `FilterChip`                 | A label you read (6px corners); a tag that links; a filter control (44px pill).                                                                                     |
| `Card`, `Facts`                                | The one card (see Cards); the "Label: value · Label: value" row under a card title.                                                                                 |
| `ChoiceCard`                                   | A whole card that is one choice (membership tier, sponsorship package), on a native radio.                                                                          |
| `Notice`                                       | Notes, success and error panels. Green only for success, red only for errors.                                                                                       |
| `SegmentedControl`                             | One pill with segments (billing, how often), on native radios: 48px, a 4px track and 40px options of equal width, and a black thumb that slides to the checked one. |
| `Menu` (island)                                | A button that opens a short list of links under it (Add to calendar: Google, Outlook, Apple), menu-button keyboard.                                                 |
| `LogoWall`, `CompanyWall`, `LogoTile`          | Logo walls in a `PackedGrid`: grey cells, logos black at rest, colour on a white (or the partner's) cell on hover.                                                  |
| `LogoRow`                                      | Inline logos (an event's thanks): no cells, own colours, optional caption.                                                                                          |
| `PackedGrid`                                   | The packed grid of square cells behind the logo walls, packed at build time (`gridPacker.ts`).                                                                      |
| `Header`, `Footer`                             | The sticky black bar (a floating pill once the page scrolls; a full-screen dialog menu on phones) and the black footer.                                             |
| `PageOpening`, `HomeHero`                      | The black opening of every inner page (breadcrumb, tags, title, one sentence, actions, optional media), and the home page's hero.                                   |
| `SectionHeading`                               | A heading block with a sub line and an optional action, where a whole `Section` is too much.                                                                        |
| `EventRow`, `TalkRow`                          | One event in a list (see Cards), and one past talk as a filled link card.                                                                                           |
| `SpeakerCard`                                  | A speaker as two stacked cards: the photo sits turned on a grey card and straightens on hover or focus (owner, 17th November 2026).                                 |
| `Photo`, `Monogram`                            | A cover-cropped photo with rounded corners that fades in once loaded; initials in a tile where a portrait is missing.                                               |
| `ProofSentence`, `AwardSection`                | The rating and award sentence, and the home page's award section ([Brand](/systems/design-system/brand.md)).                                                        |
| `HostsSection`, `SpeakCta`, `ConferenceModule` | Home page sections: the companies behind ZurichJS, the yellow "Speak at a meetup" block, and the conference module.                                                 |
| `landing/*`                                    | Parts of the landing pages: `LandingEvents`, `LandingFaq`, `LandingCta`, `PointList`, `TopicGroups`.                                                                |
| `Field`, `Check` (islands)                     | Form controls for islands (labels wrap controls, errors are announced), and the check mark as SVG.                                                                  |
| `Modal`, `RatingSheet` (islands)               | A native modal `<dialog>` that rises in, and the rating form shown in it.                                                                                           |
| `StarRating` (island)                          | Five choices, 1 to 5, on native radios, filled yellow up to the selection.                                                                                          |
| `Gallery` (island)                             | Photo and clip thumbnails with a full-screen viewer; the open item is in the URL, so it can be shared.                                                              |
| `SpeakerArc` (island)                          | The home page's turning arc of speakers ([Motion](/systems/design-system/motion.md)).                                                                               |
| `SocialLabel` (island)                         | Small one-colour network marks for the social fields.                                                                                                               |

## Buttons

One height for every button: 48px, with no size prop. An icon goes before or after the text, or alone (round, with a `label`).

| Variant     | Look                                                        | Use                                                    |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `primary`   | Black; on hover it flips to white, keeping the black border | Main content actions                                   |
| `secondary` | Grey with a subtle border; on hover it turns black          | Other content actions                                  |
| `cta`       | Yellow; hover `#E3CB16`                                     | The one thing a page asks for                          |
| `plain`     | No fill or border, grey on hover                            | Interface controls only: sort, filter, close, previous |

On black surfaces pass `inverse`: the same roles, mirrored (primary white, secondary dark grey). A tertiary button is not decided yet (Spec below).

External links get `target="_blank"` and `rel="noopener"` automatically (`external`, or detected from the `href`).

## Cards (owner, 12th November 2026)

- **One `Card`, chosen by surface:** `outline` (white with a frame: lists of items on white; the frame is functional, not decoration), `filled` (soft grey: the card itself is the block), `plain` (no box, same padding, so text lines up with cards around it) and `white` (on black or grey).
- **Behaviour by props, with one signifier aligned with the title's first line:** static (none), link (`href`: an arrow, the whole card clickable), disclosure (`disclosure`: native details and a chevron) and action (buttons in the footer, no signifier).
- **No eyebrows:** nothing sits above a title. Times and labels go in a `Facts` row under it.
- **Choices:** a whole card that is a choice is a `ChoiceCard` (3px frame, yellow when chosen, a yellow focus ring, the dot on the title's first line, yellow when checked). Small form options use `optionClass`: the same 3px frame, yellow when chosen, the same yellow focus ring, with the native control visible and regular weight. Choices never look like buttons.
- **Saved form answers** are announced in a small bar at the bottom of the screen, only while the form holds answers.
- **Padding is kept tight** (`card-sm` 16px, `card-md` 16–20px, `card-lg` 20–28px), because a card's radius is 24px plus its padding when a button touches its edge.
- **Media cards:** an image in the `media` slot sits flush with the card's edges, with its own corners and background dropped so it meets the text flat. The card is a size container: the image goes beside the text once the card is 512px wide (`@lg`) and on top below that, whatever the screen. `mediaLayout="stack"` keeps it on top (team cards, with `mediaRatio="square"`), and `mediaLayout="side"` keeps it beside the text at any width, a third of a narrow card (the home page's next-meetup card on phones); a stacked link card shows its arrow as a round button in the image's top-right corner.
- **Event lists** (`EventRow`): the home hero's next-meetup card, a link card with the image flush to its edges (`Card mediaLayout="row"`: on top in a narrow card, a near-square 5:4 column on the left from 512px; the event's artwork, else a photo from the evening, else a date tile), the date leading the facts row. Past meetups are the same card at 70% opacity (`dim`; 60% failed contrast), full again on hover or focus; artwork and text keep their colours (owner, 12th November 2026).

## Logos (owner, 12th November 2026)

- **Logo walls** (`LogoWall`, `CompanyWall`) use `PackedGrid` with grey cells. Logos are black at rest; on hover the cell turns white, or the partner's `logoBackground`, and the black logo cross-fades to the colour one, evenly over 250ms (`duration-reveal`, ease-in-out; only opacity animates, never the filter). With `byTier`, sponsors get the bigger cells their tier promises.
- **Black logos:** a partner's `logoBlack` file is used when there is one. Without it, the colour logo is drawn black by a filter; `logoKnockout` (white shapes inside a coloured one) and `logoOpaque` (a solid background) are thresholded instead, and an opaque file is multiplied into its cell. iJS Munich and Web Zurich need real black files.
- **Inline logos** (an event's "Thanks to", `LogoRow`) have no cells and keep their colours.
- **A partner can have three things:** `logo` (the final colour logo), an optional `logoBlack`, and an optional `logoBackground`. Logo only: black by the filter, colour on a white cell on hover. With `logoBlack`: that file at rest. With both: the colour logo on the partner's colour on hover (so the colour logo must suit that background).
- **Sizes** come from the logo's ratio (Sanity `metadata.dimensions.aspectRatio`, or the measured value in `packages/content/src/partners.ts`), so every logo has about the same visual weight.

## Related concepts

- [Design system package](/systems/design-system/overview.md), [Foundations](/systems/design-system/foundations.md), [Motion](/systems/design-system/motion.md), [Brand](/systems/design-system/brand.md)
- [Partners](/domains/partners/overview.md): where the logo fields come from
- Used by: [Events frontend](/domains/events/frontend.md), [Membership frontend](/domains/membership/frontend.md), [Forms](/domains/forms/overview.md)

# Related specs

- [A radius rule for cards with buttons](/systems/design-system/specs/card-radius-with-buttons.md)
- [A tertiary button](/systems/design-system/specs/tertiary-button.md)
