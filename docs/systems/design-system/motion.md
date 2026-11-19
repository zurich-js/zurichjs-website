---
type: Reference
title: Motion
description: The CSS-only motion layer: duration and easing tokens, the motion recipes, page transitions, scroll reveals, reduced motion and how motion is tested.
tags: [design-system, motion, accessibility]
timestamp: "2026-11-19T00:00:00Z"
---

# Motion

CSS only, with no library (owner, 12th November 2026). The values are tokens in `packages/design/src/theme.css`, the rules live in `packages/design/src/motion.css`, and components use them through the `motion` recipes in `packages/design/src/recipes.ts`. Pages never write a duration, a keyframe or an animation; a page adds at most `data-reveal`.

## Tokens

| Token               | Value                              | Used for                                                                                     |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- |
| `duration-feedback` | 150ms                              | Hover, focus, press, colour, and every exit. `transition-colors` without a duration gets it. |
| `duration-reveal`   | 250ms                              | Anything that opens, slides or swaps in, and page transitions.                               |
| `duration-drift`    | 500ms                              | The speaker arc, and a speaker card's photo straightening on hover.                          |
| `duration-entrance` | 1000ms                             | Scroll reveals and page openings.                                                            |
| `delay-stagger`     | 120ms                              | The gap between items that reveal together.                                                  |
| `ease-glide`        | `cubic-bezier(0.22, 1, 0.36, 1)`   | Things that move. Colours keep the default ease.                                             |
| `ease-entrance`     | `cubic-bezier(0.2, 0.75, 0.25, 1)` | Scroll reveals and page openings.                                                            |
| `spacing-reveal`    | 120px                              | How far below its place content waits before it reveals.                                     |
| `blur-reveal`       | 10px                               | The blur content waits in before it reveals.                                                 |

## Recipes and utilities

| Recipe or utility          | What it does                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `motion.enter`             | Fades in when it appears: notices, field errors, state swaps in islands.                             |
| `motion.drop`              | A dropdown toggled with `hidden` (the header's "Get involved", `Menu`): drops 4px in, leaves faster. |
| `motion.fade`              | A native `<dialog>` and its backdrop fade in and out (the phone menu, the gallery viewer).           |
| `motion.sheet`             | A native `<dialog>` that fades and rises in, and sinks out (`Modal`).                                |
| `motion.load`              | An image that fades in once loaded (`Photo`, gallery thumbnails).                                    |
| `motion-disclosure`        | A disclosure card grows open and shrinks closed (`::details-content`).                               |
| `segmented`                | The segmented control's track, whose thumb slides to the checked option (up to four options).        |
| `swap()` (`src/motion.ts`) | A list filtered in place cross-fades: events, speakers, the partners billing switch.                 |

## Behaviour

- **Page transitions:** native cross-document view transitions, not Astro's client router (owner, 12th November 2026). The new page fades and rises in over the old one, which stays fully drawn so a black opening never flashes white; the header stays still. The opt-in (`@view-transition`) is inline in BaseLayout's head.
- **Scroll reveals** (the Zoo site's pattern): content waits blurred and lower, and rises in as it scrolls into view, items that arrive together one after another in reading order. Scrolling back up, what drops below the viewport hides again, so it rises in again on the way down; nothing animates on the way up.
  - They apply per layout, with no page markup: every child of a section that holds no other section, of a top-level content block that holds no section (the speaker and event filters), and of the footer. What sits between sections in a block that holds sections (a card, a callout, an island) reveals as a whole (owner, 19th November 2026).
  - `data-reveal` reveals one element, and `data-reveal="children"` each child of a grid or list (AutoGrid, PackedGrid, the gallery, the speaker and event lists).
  - `reveal.ts` runs them. BaseLayout's head script turns them on (`html[data-motion]`) only without reduced motion, and drops them if the script has not started within 2.5 seconds, so content never stays hidden. The selector for what reveals is in both `motion.css` and `reveal.ts`: keep the two in step.
- **Page openings** (`PageOpening`, the home hero) enter on load, line by line, the media last (`data-entrance`).
- **Hover:** header links get a dark pill that grows and fades in over 250ms. Logo tiles cross-fade to colour over 250ms, opacity only. A speaker card's photo straightens.
- **The speaker arc** is the one thing that moves on its own: it turns every 3.2 seconds only while it is on screen, and holds while a card is hovered or focused. No parallax.
- **Dialogs:** `Modal` is a native `<dialog>` (owner, 12th November 2026). Dropdowns, disclosures, notices and field errors animate, and the segmented control's thumb slides.
- **Progressive enhancement:** a browser without view transitions, `@starting-style`, `allow-discrete` or `::details-content` keeps the instant behaviour. There is no script fallback.
- **Reduced motion:** under `prefers-reduced-motion`, all transitions, animations, reveals and view transitions are switched off, the arc does not turn, and smooth scrolling is disabled.

## Tests

Every e2e spec runs with reduced motion (`playwright.config.ts`), so runs are deterministic. `e2e/motion.spec.ts` turns motion back on to check the thumb, disclosures, dropdowns, page transitions, the header and the reveals; a motion change gets its check there ([Testing](/systems/testing.md)).

## Related concepts

- [Design system package](/systems/design-system/overview.md), [Components](/systems/design-system/components.md), [Foundations](/systems/design-system/foundations.md)
- [Events frontend](/domains/events/frontend.md): the speaker arc, event lists and the gallery

# Related specs

None.
