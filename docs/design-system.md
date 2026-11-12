# ZurichJS design system

`@zurichjs/design` (`packages/design`) is the one place the ZurichJS look is defined. The meetup site (`apps/web`) uses it today; the conference site can use the same tokens and theme later.

- **Gallery:** `/design` on any build. It shows every component in every variant. The page is noindex, is not in the sitemap or `llms.txt`, and is not linked from anywhere.
- **Stack:** Astro 7 components, Preact islands, Tailwind 4 (`@theme`), and Figtree through the Astro Fonts API.

## What lives where

| File                     | What it is                                                                                                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/theme.css`          | **The single source**, edited by hand: the Tailwind 4 `@theme` block (colours, type roles, spacing, radii, widths, grids, breakpoints, easing, shadow), the `px-gut`, `mx-gut` and `filter-logo-threshold` utilities, and base rules (focus rings, reduced motion, placeholders). |
| `src/theme.ts`           | Reads `theme.css` for TypeScript: `color()`, `radius()`, `space()` (they throw on an unknown name) and the `colors`, `text`, `spacing` … records. Used by the emails, the OG images and the gallery.                                                                              |
| `src/font.ts`            | Figtree's file, weights and fallbacks, for the Astro Fonts API and the emails.                                                                                                                                                                                                    |
| `src/fonts.css`          | `@font-face` for sites that do not use the Astro Fonts API. Kept in step with `font.ts` (a test checks the family).                                                                                                                                                               |
| `src/recipes.ts`         | Class recipes shared by components and their Preact twins: buttons, tags, chips, cards, notices, type roles, options, monograms.                                                                                                                                                  |
| `src/components/*.astro` | Static components. They take **props only** and never fetch content.                                                                                                                                                                                                              |
| `src/islands/*.tsx`      | Interactive Preact primitives and twins: Button, Heading, Notice, ChoiceCard, Tag, SegmentedControl, Field, Menu, Modal, StarRating, RatingSheet, SpeakerArc.                                                                                                                     |

**Changing a value:** edit `theme.css`; the site and every TypeScript reader pick it up, with nothing to regenerate. `theme.ts` loads it with Vite's `?raw` import (Vitest is told to let it through in `vitest.config.ts`).

**Ownership** is enforced by `apps/web/test/stack.test.ts`:

- No component file name may exist in both the app and the package.
- The app's `global.css` must import `theme.css` and must not define its own `@theme`.
- The app runs Astro 7 and Tailwind 4.

**App-specific islands stay in the app** (event, forms, today, tickets, checkout) and build on the package primitives.

## Brand rules (binding)

Changing any of these needs the owner's approval.

- **Structure:** a black opening (header and page opening), white content, and a black footer.
- **Typeface:** Figtree only, as a variable font (300–900).
- **Accent:** `#F1E271` is the only accent colour. Blue (`#268BCC`) is used only for focus rings and the logo.
- **Shapes:** buttons, filter chips and switches are pills; tags have 6px corners (owner, 12th November 2026); cards follow the rounding formula below (24px where text touches the edge); large blocks use `clamp(24px, 3vw, 40px)`.
- **No kickers:** no small all-caps labels above headings.
- **No decorative borders or dividers:** separate content with space and surfaces instead. Borders are allowed only where they do a job: form controls, the secondary button, the frame of an `outline` card (it says where a card ends on white), and the white swatch in the gallery.
- **No recordings:** never promise or link talk recordings. Link slides only when the speaker shared them (owner, 2026-11-01).
- **Rating and award:** on the home page the rating sits in the award section ("Rated 4.9/5 on Meetup from 199 ratings."), never in the hero (Bogdan's review, 4th November 2026). Elsewhere it is one sentence, "Rated 4.9/5 on Meetup from 199 ratings, and winner of the 2026 Open Source Award for … globally", with the award linking to its section on the home page. If the rating has no score, drop the rating part and keep the award.

## Colour

- **Yellow has one clear role** (Bogdan's review, 4th November 2026): small button accents, and on the home page one large section, "Speak at a meetup".
- **Yellow is allowed for:**
  - the one call to action per view (`Button variant="cta"`, hover `#E3CB16`)
  - the chosen dot of a `ChoiceCard`
  - the "Speak at a meetup" section (the home page's only large yellow block)
- **Not yellow:**
  - more than one primary button per view
  - text highlights (dates, numbers, links) and footer links
  - decoration
  - body text on white (it fails contrast)
- **Surfaces on black** use `ink` and `ink-2`. **Supporting light surfaces** use `grey` and `grey-soft`.
- **Text colours:** `ink-2` for secondary text on white, `grey-text` for hints, and `grey-light` for secondary text on black.
- **Errors** use `danger`, with `danger-soft` as the background. Never signal an error by colour alone: always add a message.
- **Success** uses `success` (text) and `success-soft` (panel background): confirmations after a form is sent or an action is done, nothing else (owner, 3rd November 2026).

## Components

Pages pick components and props and never write pixels: no `text-[17px]`, `min-h-[44px]` or `p-[clamp(...)]`. Every value has a token class (`text-body`, `min-h-control`, `p-card-md`, `max-w-reading`, `rounded-tag`); when one is missing, propose a token in `theme.css` rather than writing a value. Before building something, check this table and the `/design` gallery: a second version of a component is a bug.

| Component                             | Use                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Heading`, `Text`                     | Type roles by prop (`size`, `tone`). Level (`as`) and look (`size`) are separate. Islands use the `Heading` twin.      |
| `Section`, `AutoGrid`                 | A page section with its gutter, heading block and width; an auto-fit grid with three minimum widths (240, 300, 380px). |
| `Button`                              | Four variants, one height. See Buttons.                                                                                |
| `Tag`, `TagLink`, `FilterChip`        | A label you read (6px corners); a tag that links; a filter control (44px pill).                                        |
| `Card`, `Facts`                       | The one card (see Cards); the "Label: value · Label: value" row under a card title.                                    |
| `ChoiceCard`                          | A whole card that is one choice (membership tier, sponsorship package), on a native radio.                             |
| `Notice`                              | Notes, success and error panels. Green only for success, red only for errors.                                          |
| `SegmentedControl`                    | One pill with segments (billing, how often), on native radios: 48px, a 4px track and 40px options.                     |
| `Menu` (island)                       | A button that opens a short list of links under it (Add to calendar: Google, Outlook, Apple), menu-button keyboard.    |
| `LogoWall`, `CompanyWall`, `LogoTile` | Logo walls in a `PackedGrid`: grey cells, logos black at rest, colour on a white (or the partner's) cell on hover.     |
| `LogoRow`                             | Inline logos (an event's thanks): no cells, own colours, optional caption.                                             |

## Type

Nine roles, each a size with its line height (`--text-*` in `theme.css`, so `text-*` utilities; Tailwind's default scale is off). Approved by the owner on 12th November 2026.

| Role         | Size                       | Line height | Where                                 |
| ------------ | -------------------------- | ----------- | ------------------------------------- |
| `display`    | `clamp(40px, 6.4vw, 84px)` | 1.02        | Home hero                             |
| `title`      | `clamp(36px, 5vw, 64px)`   | 1.08        | Page titles (h1)                      |
| `section`    | `clamp(30px, 3.4vw, 48px)` | 1.1         | Section headings                      |
| `subsection` | `clamp(26px, 2.8vw, 36px)` | 1.15        | Parts inside a section                |
| `card-title` | `clamp(20px, 1.8vw, 24px)` | 1.25        | Card and list titles                  |
| `lead`       | `clamp(19px, 1.6vw, 22px)` | 1.45        | Intros under a title                  |
| `body`       | 18px                       | 1.55        | Paragraphs (the old 17px is body too) |
| `compact`    | 16px                       | 1.5         | Card text, facts, controls            |
| `meta`       | 14px                       | 1.4         | Captions, small tags                  |

- One `h1` per page, always in the opening.
- Headings are bold (700); body text is regular.
- Long-form text written elsewhere (the policies' Markdown) gets the `prose` utility from `theme.css`, which applies the type roles to plain h2, h3, p, lists and links. Never style child elements with arbitrary variants.
- Text links share one underline offset (3px, set on `a` and `button` in `theme.css`); don't add `underline-offset-*` to a link. Only the header's current-page underline sits further down.
- Use `text-pretty` on paragraphs and `text-balance` on short headings.

## Layout

- **One breakpoint: 800px (`md:`).** `lg:` (1100px) is only for grids that need a third or fourth column. `max-phone:` (below 480px) is only for `grow` buttons, which go full width on phones and keep their own width from there (owner, 12th November 2026).
- **Gutter:** the side padding is `max(var(--px), (100% − 1280px) / 2)`, where `--px` is 20px on phones and 48px from 800px. Use `px-gut` on full-width sections and `mx-gut` on blocks that sit inside the column.
- **Section rhythm:** `gap-section` between sections, and `py-section` around a page's content, so the space under the opening and above the footer matches the space between sections (owner, 12th November 2026). `page-top` and `page-end` are only for the home hero and the footer.
- **Widths:** `max-w-reading` (720px) for text, `max-w-wide` (880px), `max-w-form` (640px), `max-w-site` (1280px).
- **Openings:** every page opening is at least `min-h-opening` tall (with the header, the black opening fills the screen, up to 800px: `min(100svh, 800px)`), its text centred, so a short opening never looks empty (owner, 12th November 2026). An event's artwork sits beside the title only when the event has one.
- **Header:** 80px (`h-header`). It overlaps the top of the page, and the opening is padded by it (`pt-header`), so the black opening starts at the top of the page.

## Radii

| Token           | Value                    | Used for                                         |
| --------------- | ------------------------ | ------------------------------------------------ |
| `rounded-pill`  | 999px                    | Buttons, filter chips, switches                  |
| `rounded-tag`   | 6px                      | Tags                                             |
| `rounded-field` | 14px                     | Form fields and form options                     |
| `rounded-card`  | 24px                     | Cards where text touches the edge, photos        |
| `rounded-block` | `clamp(24px, 3vw, 40px)` | Conference module, the "speak" block, CTA blocks |

**Rounding formula:** outer radius = inner radius + padding + border. A card is 24px when text touches its edge, and also when its footer holds buttons (owner, 12th November 2026; a better rule for cards with buttons comes later). `edge="control"` (24px + padding) is opt-in. A card holding a small card that has a button is 40px + padding. A shape nested in a card gets the card's radius minus its padding, at least 12px (`rounded-(--radius-nested)`). `Card` works this out from its `edge` prop; pages never pick a card radius.

## Focus, motion and accessibility

- **Focus ring:** 3px blue, offset 2px. Inside `.on-black` it turns yellow, so it stays visible on black.
- **Motion:** colour transitions of 150ms by default; logo tiles fade their colour and background over 300ms. The speaker arc on the home page is the one thing that moves on its own: cards slide over 500ms (`transition-all`), it turns every 3.2 seconds only while it is on screen, and it holds while a card is hovered or focused. No scroll reveals or parallax. Under `prefers-reduced-motion`, all transitions and animations are switched off, the arc does not turn, and smooth scrolling is disabled.
- **Touch targets:** every button, switch and form field is 48px (`min-h-control`); filter chips are 44px (`min-h-chip`); a tag that links has a 44px hit area.
- **Forms:** labels wrap their controls. Hints and errors are linked with `aria-describedby`, and errors are announced politely.
- **Placeholders** use `grey-placeholder`. Never use a placeholder in place of a label.

## Buttons

One height for every button: 48px, with no size prop. An icon goes before or after the text, or alone (round, with a `label`).

| Variant     | Look                                                        | Use                                                    |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `primary`   | Black; on hover it flips to white, keeping the black border | Main content actions                                   |
| `secondary` | Grey with a subtle border; on hover it turns black          | Other content actions                                  |
| `cta`       | Yellow; hover `#E3CB16`                                     | The one thing a page asks for                          |
| `plain`     | No fill or border, grey on hover                            | Interface controls only: sort, filter, close, previous |

On black surfaces pass `inverse`: the same roles, mirrored (primary white, secondary dark grey). A tertiary button is not decided yet.

External links get `target="_blank"` and `rel="noopener"` automatically (`external`, or detected from the `href`).

## Using the design system on another site (the conference site)

```css
/* globals.css */
@import 'tailwindcss';
@import '@zurichjs/design/theme.css';
@import '@zurichjs/design/fonts.css'; /* only without the Astro Fonts API */
@source '../node_modules/@zurichjs/design/src';
```

- **Non-Astro stacks (such as Next.js)** can use `theme.css`, `fonts.css`, `theme.ts` and `recipes` directly.
- **Astro components and Preact islands** need Astro 7 and Preact.

## Visual regression

`e2e/visual.spec.ts` screenshots these pages at 390px and 1440px against the baselines in `e2e/__screenshots__`:

- home
- an upcoming event and a recap event
- a speaker page
- about, today, cfp
- the `/design` gallery

- **Deterministic input:** build with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00`; the browser clock is fixed to the same instant.
- **Environment:** the baselines come from Playwright 1.63 Chromium on Linux. Run the suite in the same environment, or it reports false differences.
- **After an intended change:** run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`, and review the new images in the PR.

## Cards (owner, 12th November 2026)

- **One `Card`, chosen by surface:** `outline` (white with a frame: lists of items on white; the frame is functional, not decoration), `filled` (soft grey: the card itself is the block), `plain` (no box, same padding, so text lines up with cards around it) and `white` (on black or grey).
- **Behaviour by props, with one signifier aligned with the title's first line:** static (none), link (`href`: an arrow, the whole card clickable), disclosure (`disclosure`: native details and a chevron) and action (buttons in the footer, no signifier).
- **No eyebrows:** nothing sits above a title. Times and labels go in a `Facts` row under it.
- **Choices:** a whole card that is a choice is a `ChoiceCard` (3px frame, yellow when chosen, the dot on the title's first line, yellow when checked). Small form options use `optionClass`: bordered, the native control visible, regular weight. Choices never look like buttons.
- **Page titles** scale with their length (`PageOpening`).
- **Saved form answers** are announced in a small bar at the bottom of the screen, only while the form holds answers.
- **Padding is kept tight** (`card-sm` 16px, `card-md` 16–20px, `card-lg` 20–28px), because a card's radius is 24px plus its padding when a button touches its edge.
- **Media cards:** an image in the `media` slot sits flush with the card's edges, with its own corners and background dropped so it meets the text flat. The card is a size container: the image goes beside the text once the card is 512px wide (`@lg`) and on top below that, whatever the screen. `mediaLayout="stack"` keeps it on top (team cards, with `mediaRatio="square"`); a stacked link card shows its arrow as a round button in the image's top-right corner.
- **Event lists** (`EventRow`): the home hero's next-meetup card, a link card with the image flush to its edges (`Card mediaLayout="row"`: on top in a narrow card, a near-square 5:4 column on the left from 512px; the event's artwork, else a photo from the evening, else a date tile), the date leading the facts row. Past meetups are the same card at lower opacity (`dim`), full again on hover or focus; artwork and text keep their colours (owner, 12th November 2026).
- **Social links** use one scheme everywhere: white or outlined, with each network's mark in the text colour (black on white, white on black), never its brand colours.

## Logos (owner, 12th November 2026)

- **Logo walls** (`LogoWall`, `CompanyWall`) use `PackedGrid` with grey cells. Logos are black at rest; on hover the cell turns white, or the partner's `logoBackground`, and the logo shows in colour. With `byTier`, sponsors get the bigger cells their tier promises.
- **Black logos:** a partner's `logoBlack` file is used when there is one. Without it, the colour logo is drawn black by a filter; `logoKnockout` (white shapes inside a coloured one) and `logoOpaque` (a solid background) are thresholded instead, and an opaque file is multiplied into its cell. iJS Munich and Web Zurich need real black files.
- **Inline logos** (an event's "Thanks to", `LogoRow`) have no cells and keep their colours.
- **A partner can have three things:** `logo` (the final colour logo), an optional `logoBlack`, and an optional `logoBackground`. Logo only: black by the filter, colour on a white cell on hover. With `logoBlack`: that file at rest. With both: the colour logo on the partner's colour on hover (so the colour logo must suit that background).
- **Sizes** come from the logo's ratio (Sanity `metadata.dimensions.aspectRatio`, or the measured value in `packages/content/src/partners.ts`), so every logo has about the same visual weight.
