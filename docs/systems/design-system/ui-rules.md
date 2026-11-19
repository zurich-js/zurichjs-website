---
type: Reference
title: UI and design system rules
description: The binding rules for every UI change (zero arbitrary values, one source of tokens, components own variants, consistency, definition of done, scope); changing them needs the owner.
tags: [design-system, binding, ui-rules]
timestamp: '2026-11-19T00:00:00Z'
---

# UI and design system rules

These rules are mandatory for every UI change. They override convenience. If a rule blocks you, stop and ask. Do not work around it. (Owner, 10th November 2026. The [brand rules](/systems/design-system/brand.md) still apply; these say how to build within them.)

## 1. Zero arbitrary values

- Never write Tailwind arbitrary values: no `min-h-[44px]`, `text-[16px]`, `px-[26px]`, `bg-[#abc]`, `w-[calc(...)]`, `z-[999]`, `rounded-[10px]`. Arbitrary variants and properties (`[&>li]:mt-2`, `[grid-area:a]`) count too.
- The only exceptions are `grid-cols-[...]` track lists and `aspect-[...]` photo ratios, which have no scale equivalent (justified in `eslint.config.mjs`).
- Never use inline `style={{}}` for spacing, colour, type, radius or shadow. A value that exists only at runtime (a CSS custom property, an image focal point from Sanity) needs an `eslint-disable-next-line no-restricted-syntax -- <reason>` comment.
- Never hardcode hex, rgb, px or rem values in components.
- If the value you need does not exist, you have two options: (a) snap to the nearest existing token (preferred), or (b) propose a new token in `packages/design/src/theme.css`, with a one-line justification, and wait for approval before using it.
- Text sizes come only from the nine type roles (`text-display` … `text-meta`); Tailwind's default text scale is switched off, and body text is 18px (`text-body`). Heights: `min-h-control` (48px: buttons, switches, fields), `min-h-chip` (44px: filter chips), `h-tag-sm` and `h-tag-md`. Spacing: `p-card-sm|md|lg`, `gap-section`, `pt-page-top`, `pb-page-end`, then Tailwind's 4px scale for small layout gaps. Widths: `max-w-reading|wide|form|site`. The full list is in [Foundations](/systems/design-system/foundations.md).

## 2. Single source of truth for tokens

- Tokens live in ONE place: `packages/design/src/theme.css` (the Tailwind 4 `@theme` block), edited by hand. TypeScript that needs a value (emails, OG images, the `/design` gallery) reads it through `@zurichjs/design/theme` (`color('yellow')`, `radius('card')`, `space('section')`), never a copied literal. Nothing is generated. Read `theme.css` before writing any UI. Do not invent tokens that already exist under a different name.
- Semantic names only, named for their job (`text-card-title`, `min-h-control`, `rounded-tag`, `danger-soft`). Never name tokens after their value (`grey-line-2`).
- Colours, type scale, spacing, radius, shadow, z-index, breakpoints and motion (durations, easings) are all tokenised. The touch target minimum is a token, not a repeated literal.

## 3. Components own variants, pages own layout

- Visual variants (surface, variant, tone, state, invalid, disabled) are defined ONCE, as props of a design-system component: Astro components in `packages/design/src/components`, their Preact twins in `packages/design/src/islands`, and the class recipes they share in `packages/design/src/recipes.ts`. The catalogue is [Components](/systems/design-system/components.md) and the `/design` gallery.
- Motion is CSS only, with no library. Durations are tokens (`duration-feedback` 150ms, `duration-reveal` 250ms, `duration-drift` 500ms, `duration-entrance` 1000ms), the rules live in `packages/design/src/motion.css`, and components use them through the `motion` recipes in `packages/design/src/recipes.ts`. Never write a literal duration, a keyframe or an animation in a page or feature component. Scroll reveals and page transitions apply by layout; a page adds at most `data-reveal`. [Motion](/systems/design-system/motion.md) has the list.
- No class-string-returning helper functions (like `optionClass()`) outside a primitive. No long `cx(...)` chains in feature components or pages.
- Feature components compose primitives. They do not restyle them. Passing `class` to override a primitive's tokens is a smell: add a variant instead.
- A page or feature component may only use layout utilities (flex, grid, gap, padding from the scale, responsive prefixes).
- Before creating a component, search `packages/design/src` for an existing one. Duplicating a primitive is a failed task.

## 4. Consistency over novelty

- Match existing patterns in the repo. If two patterns exist, use the one in the most files and flag the other for cleanup. Do not add a third.
- New UI must work at mobile, tablet and desktop, with keyboard focus visible, with disabled and invalid states, and under `prefers-reduced-motion` (nothing hidden, nothing moving), using existing tokens.

## 5. Definition of done (verify, do not assume)

Run and report the results of:

1. `pnpm lint` and `pnpm lint:ui` (the arbitrary-value, inline-style and hex rules; legacy violations are baselined in `eslint-suppressions.json`, new ones fail)
2. `pnpm typecheck`
3. `rg '\[[0-9#]|\-\[|style=\{\{' apps/web/src packages/design/src` returns nothing new in files you touched
4. A screenshot or description of the result at 375px and 1280px

In your summary, list: tokens used, any new token proposed, any primitive added or changed, and anything you could not make fit the system.

The baseline only shrinks. When you fix a legacy violation, run `pnpm lint:ui:prune` and commit the smaller `eslint-suppressions.json`. Never regenerate it with `--suppress-all` to get green.

## 6. Scope discipline

- Change only what the task requires. No drive-by refactors.
- If you find existing violations in files you touch, list them in the summary. Fix them only if asked.

## Related concepts

- [Brand rules](/systems/design-system/brand.md), [Foundations](/systems/design-system/foundations.md), [Components](/systems/design-system/components.md), [Motion](/systems/design-system/motion.md), [Design system package](/systems/design-system/overview.md)
- [Working rules](/conventions/working-rules.md), [Testing](/systems/testing.md)

# Related specs

None.
