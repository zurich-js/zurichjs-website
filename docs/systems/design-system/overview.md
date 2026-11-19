---
type: System
title: Design system package
description: What @zurichjs/design is, which file owns what, how TypeScript reads the tokens, how ownership is tested, and how another site uses it.
tags: [design-system, tokens, tailwind]
timestamp: '2026-11-19T00:00:00Z'
---

# Design system package

`@zurichjs/design` (`packages/design`) is the one place the ZurichJS look is defined. The meetup site (`apps/web`) uses it; the conference site can use the same tokens and theme later.

- **Gallery:** `/design` on any build shows every component in every variant. It renders from fixtures, so it is deterministic and shows every event state whatever is in Sanity. The page is noindex, is not in the sitemap or `llms.txt`, and is not linked from anywhere.
- **Stack:** Astro 7 components, Preact islands, Tailwind 4 (`@theme`), and Figtree through the Astro Fonts API.
- **Rules for building UI** are binding and live in [UI and design system rules](/systems/design-system/ui-rules.md): zero arbitrary values, one source of truth for tokens, components own variants and pages own layout, consistency over novelty, and the definition of done. The brand rules are in [Brand](/systems/design-system/brand.md).

## What lives where

| File                     | What it is                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/theme.css`          | **The single source**, edited by hand: the Tailwind 4 `@theme` block (colours, type roles, spacing, radii, widths, grids, breakpoints, durations, easing, shadow), the `px-gut`, `mx-gut` and `filter-logo-threshold` utilities, and base rules (focus rings, reduced motion, placeholders). |
| `src/motion.css`         | The motion rules utilities cannot express: view transitions, `::details-content`, `@starting-style` entries with `allow-discrete`, and the segmented thumb. No tokens.                                                                                                                       |
| `src/motion.ts`          | `swap()`: runs a list update inside a same-document view transition where the browser has one.                                                                                                                                                                                               |
| `src/reveal.ts`          | `startReveal()`: scroll reveals (BaseLayout runs it), and `fadeOnLoad()` for an image that fades in once loaded.                                                                                                                                                                             |
| `src/theme.ts`           | Reads `theme.css` for TypeScript: `color()`, `radius()`, `space()` (they throw on an unknown name, so a typo fails the build) and the `colors`, `text`, `spacing`, `durations`, `easings` … records. Used by the emails, the OG images and the gallery.                                      |
| `src/font.ts`            | Figtree's file, weights and fallbacks, for the Astro Fonts API and the emails. The font is configuration, not a token: `astro.config.mjs` runs in plain Node and cannot import CSS.                                                                                                          |
| `src/fonts.css`          | `@font-face` for sites that do not use the Astro Fonts API. Kept in step with `font.ts` (a test checks the family).                                                                                                                                                                          |
| `src/recipes.ts`         | Class recipes shared by components and their Preact twins: motion, buttons, tags, chips, cards, notices, type roles, options, monograms.                                                                                                                                                     |
| `src/gridPacker.ts`      | Packs the square cells behind the logo walls and photo grids at build time.                                                                                                                                                                                                                  |
| `src/components/*.astro` | Static components. They take **props only** and never fetch content.                                                                                                                                                                                                                         |
| `src/islands/*.tsx`      | Interactive Preact primitives and twins: Button, Heading, Notice, ChoiceCard, Tag, SegmentedControl, Field, Check, Menu, Modal, StarRating, RatingSheet, Gallery, SpeakerArc, SocialLabel.                                                                                                   |

**Changing a value:** edit `theme.css`; the site and every TypeScript reader pick it up, with nothing to regenerate. `theme.ts` reads the file as text in every bundler: Vite's `?raw` query for the Astro build and Vitest (`vitest.config.ts` lets it through), and the `with { type: 'text' }` import attribute for esbuild, which bundles the Netlify functions (the Slack functions reach `theme.ts` through the emails).

**The package never loads content.** Components receive content, the clock and the ticketing provider from the page. The package depends only on `@zurichjs/events`, with `astro` and `preact` as peers.

**Ownership** is enforced by `apps/web/test/stack.test.ts`:

- No component file name may exist in both the app and the package.
- The app's `global.css` must import `theme.css` and must not define its own `@theme`. It imports `motion.css` next to it.
- The app runs Astro 7 and Tailwind 4, on a Node version Astro supports (`.nvmrc`).

**App-specific islands stay in the app** (`apps/web/src/components/islands`: event, forms, today, membership) and build on the package primitives.

**The UI lint** (`pnpm lint:ui`, ESLint over `apps/web/src` and `packages/design/src`) enforces the arbitrary-value, inline-style and hex rules. Legacy violations are baselined in `eslint-suppressions.json`; the baseline only shrinks (`pnpm lint:ui:prune`), and is never regenerated with `--suppress-all`.

## Using it on another site (the conference site)

```css
/* globals.css */
@import 'tailwindcss';
@import '@zurichjs/design/theme.css';
@import '@zurichjs/design/fonts.css'; /* only without the Astro Fonts API */
@source '../node_modules/@zurichjs/design/src';
```

- **Non-Astro stacks (such as Next.js)** can use `theme.css`, `fonts.css`, `theme.ts` and `recipes` directly.
- **Astro components and Preact islands** need Astro 7 and Preact.

## Related concepts

- [Brand](/systems/design-system/brand.md), [Foundations](/systems/design-system/foundations.md), [Components](/systems/design-system/components.md), [Motion](/systems/design-system/motion.md)
- [Web app](/systems/web.md), [Testing](/systems/testing.md) (visual regression)

# Related specs

- [A radius rule for cards with buttons](/systems/design-system/specs/card-radius-with-buttons.md)
- [A tertiary button](/systems/design-system/specs/tertiary-button.md)
