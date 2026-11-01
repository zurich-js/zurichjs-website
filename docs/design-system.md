# ZurichJS design system

`@zurichjs/design` (`platform/packages/design`) is the one place the ZurichJS look is defined. The meetup site (`platform/apps/web`) uses it today; the conference site can use the same tokens and theme later.

- **Gallery:** `/design` on any build. It shows every component in every variant. The page is noindex, is not in the sitemap or `llms.txt`, and is not linked from anywhere.
- **Stack:** Astro 7 components, Preact islands, Tailwind 4 (`@theme`), and Figtree through the Astro Fonts API.

## What lives where

| File                     | What it is                                                                                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/tokens.ts`          | **Single source** for colours, radii, breakpoints, gutter, font and heading sizes. Change values here only.                                                     |
| `src/theme.css`          | **Generated** from `tokens.ts`: the Tailwind 4 `@theme` block, the `px-gut` and `mx-gut` utilities, and base rules (focus rings, reduced motion, placeholders). |
| `src/fonts.css`          | **Generated** `@font-face` for sites that do not use the Astro Fonts API.                                                                                       |
| `src/recipes.ts`         | Class recipes: `buttonClass`, `surfaceClass`, `monogramClass`, `headingSizes`, `cx`.                                                                            |
| `src/components/*.astro` | Static components. They take **props only** and never fetch content.                                                                                            |
| `src/islands/*.tsx`      | Interactive Preact primitives: Button, Field, Modal, StarRating, RatingSheet.                                                                                   |

**Regenerating:** after changing `tokens.ts`, run `pnpm --filter @zurichjs/design theme`. A test fails when `theme.css` or `fonts.css` is out of date.

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
- **Shapes:** buttons, tags and status labels are rounded pills; cards are 24px; large blocks use `clamp(24px, 3vw, 40px)`.
- **No kickers:** no small all-caps labels above headings.
- **No decorative borders or dividers:** separate content with space and surfaces instead. Borders are allowed only where they do a job: form controls, outline buttons, and the white swatch in the gallery.
- **No recordings or slides:** never promise or link talk recordings or slide decks.
- **Rating and award:** always one sentence, for example "Rated 4.9 on Meetup from 199 ratings, and winner of …". Never print the scale ("/5"). If the rating has no score, drop the rating part and keep the award.

## Colour

- **Yellow is allowed for:**
  - the one primary action per view (`Button variant="yellow"`)
  - status pills (for example "RSVP open")
  - the upcoming-event date tile
  - the rating number
  - the "Speak at a meetup" block
- **Not yellow:**
  - more than one primary button per view
  - decoration
  - body text on white (it fails contrast)
- **Surfaces on black** use `ink` and `ink-2`. **Supporting light surfaces** use `grey` and `grey-soft`.
- **Text colours:** `ink-2` for secondary text on white, `grey-text` for hints, and `grey-light` for secondary text on black.
- **Errors** use `danger`, with `danger-soft` as the background. Never signal an error by colour alone: always add a message.

## Surfaces

`Surface` (tones: grey, soft, yellow, white, black, ink, danger) groups **related** content: an event's practical details, a donation option, a speaker's links. Do not wrap a single paragraph or a heading in a Surface. If there is nothing to group, use space.

## Type

| Use                       | Size                       | Where                      |
| ------------------------- | -------------------------- | -------------------------- |
| Opening display           | `clamp(40px, 6.4vw, 84px)` | Home hero                  |
| Page title (h1)           | `clamp(36px, 5.4vw, 72px)` | `PageOpening`              |
| Section (h2)              | `clamp(30px, 3.4vw, 48px)` | `SectionHeading size="lg"` |
| Sub-section (h2)          | `clamp(26px, 2.8vw, 36px)` | `SectionHeading size="md"` |
| Card or list heading (h3) | `clamp(24px, 2.4vw, 32px)` | `SectionHeading size="sm"` |
| Body                      | 18px, line-height 1.55     | Paragraphs                 |
| Small                     | 16px                       | Hints, meta lines          |

- One `h1` per page, always in the opening.
- Headings are bold (700); body text is regular.
- Use `text-pretty` on paragraphs and `text-balance` on short headings.

## Layout

- **One breakpoint: 800px (`md:`).** `lg:` (1100px) is only for grids that need a third or fourth column.
- **Gutter:** the side padding is `max(var(--px), (100% − 1280px) / 2)`, where `--px` is 20px on phones and 48px from 800px. Use `px-gut` on full-width sections and `mx-gut` on blocks that sit inside the column.
- **Section rhythm:** `gap-[clamp(56px,7vw,96px)]` between sections.

## Radii

| Token           | Value                    | Used for                                         |
| --------------- | ------------------------ | ------------------------------------------------ |
| `rounded-pill`  | 999px                    | Buttons, pills, tags                             |
| `rounded-card`  | 24px                     | Cards, surfaces, photos, monograms               |
| `rounded-block` | `clamp(24px, 3vw, 40px)` | Conference module, the "speak" block, CTA blocks |

## Focus, motion and accessibility

- **Focus ring:** 3px blue, offset 2px. Inside `.on-black` it turns yellow, so it stays visible on black.
- **Motion:** only colour transitions, of 150ms. No scroll reveals, parallax or autoplay. Under `prefers-reduced-motion`, all transitions and animations are switched off and smooth scrolling is disabled.
- **Touch targets:** buttons are at least 44px tall (sm), 48px (md) and 52px (lg).
- **Forms:** labels wrap their controls. Hints and errors are linked with `aria-describedby`, and errors are announced politely.
- **Placeholders** use `grey-placeholder`. Never use a placeholder in place of a label.

## Buttons

| Variant                           | Use                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `yellow`                          | The one primary action                                                         |
| `black`                           | The primary action inside a yellow or grey block, or a strong secondary action |
| `outline-black` / `outline-white` | Secondary actions on white or black                                            |
| `white`, `grey`                   | Tertiary actions, filters                                                      |
| `danger`                          | Destructive or irreversible actions only                                       |
| `link`                            | Underlined text button ("Copy link", "Back")                                   |

External links get `target="_blank"` and `rel="noopener"` automatically (`external`, or detected from the `href`).

## Using the design system on another site (the conference site)

```css
/* globals.css */
@import "tailwindcss";
@import "@zurichjs/design/theme.css";
@import "@zurichjs/design/fonts.css"; /* only without the Astro Fonts API */
@source '../node_modules/@zurichjs/design/src';
```

- **Non-Astro stacks (such as Next.js)** can use `tokens`, `theme.css`, `fonts.css` and `recipes` directly.
- **Astro components and Preact islands** need Astro 7 and Preact.

## Visual regression

`platform/e2e/visual.spec.ts` screenshots these pages at 390px and 1440px against the baselines in `platform/e2e/__screenshots__`:

- home
- an upcoming event and a recap event
- a speaker page
- about, today, cfp
- the `/design` gallery

- **Deterministic input:** build with `CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00`; the browser clock is fixed to the same instant.
- **Environment:** the baselines come from Playwright 1.63 Chromium on Linux. Run the suite in the same environment, or it reports false differences.
- **After an intended change:** run `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`, and review the new images in the PR.
