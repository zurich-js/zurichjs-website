---
type: Reference
title: Foundations
description: The token scales of the design system (type roles, layout, widths, radii and the rounding formula) and the focus and accessibility rules.
tags: [design-system, tokens, typography, layout, accessibility]
timestamp: '2026-11-19T00:00:00Z'
---

# Foundations

Every value below is a token in `packages/design/src/theme.css`. Pages pick components and props and never write pixels: no `text-[17px]`, `min-h-[44px]` or `p-[clamp(...)]`. When a token is missing, propose one in `theme.css` and wait for approval ([UI and design system rules](/systems/design-system/ui-rules.md)).

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
- Text links share one underline offset (3px, set on `a` and `button` in `theme.css`); don't add `underline-offset-*` to a link.
- Use `text-pretty` on paragraphs and `text-balance` on short headings.
- Page titles scale with their length (`PageOpening`) and never shrink below the section headings: full size up to 64 characters.

## Layout

- **One breakpoint: 800px (`md:`).** `lg:` (1100px) is only for grids that need a third or fourth column. `max-phone:` (below 480px) is only for `grow` buttons, which go full width on phones and keep their own width from there (owner, 12th November 2026).
- **Gutter:** the side padding is `max(var(--px), (100% − 1280px) / 2)`, where `--px` is 20px on phones and 48px from 800px. Use `px-gut` on full-width sections and `mx-gut` on blocks that sit inside the column.
- **Section rhythm:** `gap-section` (96 to 160px) between sections, and `py-section` around a page's content, so the space under the opening and above the footer matches the space between sections (owner, 12th November 2026). `page-top` and `page-end` are only for the home hero and the footer.
- **Widths:** `max-w-reading` (720px) for text, `max-w-wide` (880px), `max-w-form` (640px), `max-w-site` (1280px).
- **Heights:** `min-h-control` (48px: buttons, switches, fields), `min-h-chip` (44px: filter chips), `h-tag-sm` and `h-tag-md`.
- **Card padding:** `p-card-sm` (16px), `p-card-md` (16 to 20px), `p-card-lg` (20 to 28px), kept tight because a card's radius is 24px plus its padding when a button touches its edge.
- **Openings:** every page opening is at least `min-h-opening` tall (with the header, the black opening fills the screen, up to 800px: `min(100svh, 800px)`), its text centred, so a short opening never looks empty (owner, 12th November 2026). An event's artwork sits beside the title only when the event has one.
- **Header:** 80px (`h-header`). It overlaps the top of the page, and the opening is padded by it (`pt-header`), so the black opening starts at the top of the page. The current page's link is yellow, the others white (owner, 17th November 2026).
- **Grids:** `grid-cols-[...]` track lists and `aspect-[...]` photo ratios are the only allowed arbitrary values (justified in `eslint.config.mjs`).

## Radii

| Token           | Value                    | Used for                                         |
| --------------- | ------------------------ | ------------------------------------------------ |
| `rounded-pill`  | 999px                    | Buttons, filter chips, switches                  |
| `rounded-tag`   | 6px                      | Tags                                             |
| `rounded-field` | 14px                     | Form fields and form options                     |
| `rounded-card`  | 24px                     | Cards where text touches the edge, photos        |
| `rounded-block` | `clamp(24px, 3vw, 40px)` | Conference module, the "speak" block, CTA blocks |

**Rounding formula:** outer radius = inner radius + padding + border. A card is 24px when text touches its edge, and also when its footer holds buttons (owner, 12th November 2026; a better rule for cards with buttons comes later, see the Spec below). `edge="control"` (24px + padding) is opt-in. A card holding a small card that has a button is 40px + padding. A shape nested in a card gets the card's radius minus its padding, at least 12px (`rounded-(--radius-nested)`). `Card` works this out from its `edge` prop; pages never pick a card radius.

## Focus and accessibility

- **Focus ring:** 3px blue, offset 2px. Inside `.on-black` it turns yellow, so it stays visible on black. Choice cards and form options also have a yellow ring (owner, 18th November 2026).
- **Touch targets:** every button, switch and form field is 48px (`min-h-control`); filter chips are 44px (`min-h-chip`); a tag that links has a 44px hit area.
- **Forms:** labels wrap their controls. Fields are named by their label (`aria-labelledby` in `Field.tsx`); hints and errors are linked with `aria-describedby`, and errors are announced politely. "All fields are required unless marked optional", with `(optional)` labels and `required`.
- **Placeholders** use `grey-placeholder`. Never use a placeholder in place of a label.
- **New UI** works at mobile, tablet and desktop, with keyboard focus visible, with disabled and invalid states, and under `prefers-reduced-motion` (nothing hidden, nothing moving).

## Related concepts

- [Design system package](/systems/design-system/overview.md), [Brand](/systems/design-system/brand.md), [Components](/systems/design-system/components.md), [Motion](/systems/design-system/motion.md)
- [Forms](/domains/forms/overview.md): the form behaviour built on these rules

# Related specs

- [A radius rule for cards with buttons](/systems/design-system/specs/card-radius-with-buttons.md)
