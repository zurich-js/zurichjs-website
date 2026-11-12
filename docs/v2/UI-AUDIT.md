# UI compliance audit (phase 1)

Status: **done, superseded by the design system migration (owner, 12th November 2026).** The tokens, primitives and snaps below were replaced by the system in `docs/design-system.md`: nine type roles, named spacing and heights, one Card, Button, Tag and logo wall, with variants as component props rather than cva recipes in `components/ui/`. The decisions are in `docs/v2/DECISIONS.md`, "Design system v2". What follows is the original audit, kept for the record.

Original status: audit only, waiting for approval. Nothing in the UI had changed. The rules are in `AGENTS.md` ("UI and design system rules"). Phase 2 starts only after the owner approves the tokens and primitives below, and the snaps marked **>2px**.

Scope: `apps/web/src` and `packages/design/src`, without tests, server code, API routes and the OG image generator. Numbers come from `rg` and from `pnpm lint:ui` (10th November 2026).

## Summary

| Finding                                                | Count | Files |
| ------------------------------------------------------ | ----: | ----: |
| Arbitrary values (`x-[…]`, arbitrary variants)         | 1,609 |    86 |
| of which in `grid-cols-[…]` and `aspect-[…]` (allowed) |   102 |    30 |
| Inline `style` props                                   |    17 |    11 |
| Hardcoded hex colours in components                    |    21 |     6 |
| Class-returning helpers (`recipes.ts`)                 |     8 |     1 |
| Call sites of those helpers                            |    61 |    27 |
| Local class-string constants (`const h2 = 'text-[…]'`) |   ~30 |    15 |
| Distinct arbitrary values                              |   277 |       |

All of them except the allowed `grid-cols` and `aspect` are in the lint baseline (`eslint-suppressions.json`: 1,609 class findings plus 38 style and hex findings in 89 files). New ones fail CI.

Where they are: about/index.astro (112), partners.astro (103), ai-context.astro (75), CfpForm.tsx (67), Tonight.tsx (57), events/[slug].astro (56), contact.astro (52), MemberAccount.tsx (52), MembershipForm.tsx (48), MembershipAdmin.tsx (46). Type and line height make up 1,087 of the 1,609 (68%), so a type scale fixes most of it.

## How to read the tables

- **Snap**: the value becomes an existing utility. Exact snaps change nothing on screen.
- **New token**: added to `packages/design/src/tokens.ts` and generated into `theme.css`. The name is semantic.
- **Risk**: _none_ = same pixels; _low_ = 2px or less; **>2px** = needs your approval (constraint from the task).
- Tailwind 4 spacing takes quarter steps of 4px, so `18px` is `4.5`, `22px` is `5.5`, `26px` is `6.5` and `3px` is `0.75`. All of those are exact, with no visual change.

## 1. Font size (786 findings)

Tailwind's defaults: `xs` 12, `sm` 14, `base` 16, `lg` 18, `xl` 20, `2xl` 24, `3xl` 30, `4xl` 36, `5xl` 48, `7xl` 72, `8xl` 96.

### Fixed sizes

| Value                          |  Count | Proposed                                     | Risk                                                                 |
| ------------------------------ | -----: | -------------------------------------------- | -------------------------------------------------------------------- |
| `17px`                         |    192 | **new `text-body`** (17px, line height 1.55) | none. The body size of the site; snapping moves all body copy by 1px |
| `16px`                         |    125 | `text-base`                                  | none                                                                 |
| `18px`                         |    104 | `text-lg`                                    | none                                                                 |
| `15px`                         |     72 | **new `text-meta`** (15px)                   | none. Alternative: `text-sm` (−1px on all meta text)                 |
| `20px`                         |     36 | `text-xl`                                    | none                                                                 |
| `14px`                         |     30 | `text-sm`                                    | none                                                                 |
| `22px`                         |     23 | `text-2xl`                                   | low (+2px). Alternative: new `text-lead-lg`                          |
| `19px`                         |     20 | `text-xl`                                    | low (+1px)                                                           |
| `24px`                         |     13 | `text-2xl`                                   | none                                                                 |
| `28px`                         |     11 | `text-3xl`                                   | low (+2px)                                                           |
| `21px`                         |     11 | `text-xl`                                    | low (−1px)                                                           |
| `13px`                         |      6 | `text-xs`                                    | low (−1px)                                                           |
| `26px`                         |      3 | `text-2xl`                                   | low (−2px)                                                           |
| `11px`                         |      3 | `text-xs`                                    | low (+1px)                                                           |
| `44px`                         |      2 | `text-5xl`                                   | **>2px** (+4px), Monogram portrait                                   |
| `12px`, `23px`, `30px`, `72px` | 1 each | `xs`, `2xl`, `3xl`, `7xl`                    | none or low                                                          |
| `88px`                         |      1 | `text-8xl`                                   | **>2px** (+8px), 404 page                                            |
| `text-[length:inherit]`        |      2 | `text-inherit` (exists in Tailwind 4)        | none                                                                 |

### Fluid sizes (`clamp`)

`tokens.ts` already has the heading sizes (`headings.display`, `h1`, `h2`, `h2Medium`, `h3`), but `theme.css` does not generate utilities for them. That is why every page repeats the `clamp()` by hand.

| Value                                                                                                                        | Count | Proposed                                                                    | Risk                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ----: | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `clamp(30px,3.4vw,48px)`                                                                                                     |    24 | **generate `text-h2`** from `headings.h2` (line height 1.1)                 | none                                                                                   |
| `clamp(26px,2.8vw,36px)`                                                                                                     |    22 | **generate `text-h2-medium`** (1.15)                                        | none                                                                                   |
| `clamp(24px,2.4vw,32px)`                                                                                                     |    18 | **generate `text-h3`** (1.2)                                                | none                                                                                   |
| `clamp(26px,2.6vw,34px)`                                                                                                     |    13 | `text-h2-medium`                                                            | low (max +2px)                                                                         |
| `clamp(28px,3vw,40px)`                                                                                                       |     6 | `text-h2-medium`                                                            | **>2px** (min −2, max −4)                                                              |
| `clamp(24px,2.4vw,30px)`                                                                                                     |     5 | `text-h3`                                                                   | low (max +2px)                                                                         |
| `clamp(18px,1.6vw,21px)` and 4 near ones (`19–23px` max)                                                                     |    12 | **new `text-lead`** `clamp(18px,1.6vw,21px)`                                | low (max ±2px)                                                                         |
| `clamp(40px,4vw,56px)`, `clamp(36px,4vw,52px)`, `clamp(40px,4.4vw,56px)`, `clamp(36px,4vw,56px)` and 6 more page-title sizes |    16 | **new `text-title`** `clamp(36px,4.4vw,56px)` (PageOpening and hero titles) | **>2px** for 9 of them (min up to −4, max up to +4); each listed in the phase 2 commit |
| `clamp(44px,7vw,96px)`, `clamp(36px,5vw,64px)`                                                                               |     2 | generate `text-display` / `text-h1`                                         | **>2px**, home hero and 404; keep as is if you prefer                                  |
| `clamp(36px,4vw,56px)` monogram tile                                                                                         |     1 | `text-h1`                                                                   | **>2px**                                                                               |

## 2. Line height (301 findings)

Tailwind's defaults: `none` 1, `tight` 1.25, `snug` 1.375, `normal` 1.5, `relaxed` 1.625. The proposal bundles line height into the type tokens (`text-body` brings 1.55, `text-h2` brings 1.1). Most `leading-[…]` then go away instead of being snapped.

| Value                                                | Count | Proposed                          | Risk                                                      |
| ---------------------------------------------------- | ----: | --------------------------------- | --------------------------------------------------------- |
| `1.55`                                               |   101 | part of `text-body`               | none                                                      |
| `1.15`, `1.1`, `1.2`, `1.12`, `1.05`, `1.02`, `1.22` |   101 | part of the heading tokens        | none where the size matches its heading; low elsewhere    |
| `1.6`                                                |    36 | `leading-relaxed` (1.625)         | low (+0.4px per line at 17px)                             |
| `1.45`                                               |    20 | `leading-normal` (1.5)            | low (+0.9px per line). Paragraphs grow about 1px per line |
| `1.3`, `1.35`, `1.4`                                 |    25 | `leading-snug` (1.375)            | low                                                       |
| `1.5`, `1.25`                                        |    14 | `leading-normal`, `leading-tight` | none                                                      |
| `1.65`                                               |     5 | `leading-relaxed`                 | low                                                       |

Line-height snaps are under 2px per line but add up in long paragraphs (a 10-line paragraph at 1.45 → 1.5 grows about 9px). The visual baselines will show it. I recommend accepting it.

## 3. Spacing (about 140 findings)

| Value                                                                                                           | Count | Proposed                                                                                        | Risk                                 |
| --------------------------------------------------------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------- | ------------------------------------ |
| `gap-[18px]`, `p-[18px]`, `px-[18px]`, `py-[18px]`, `gap-x-[18px]`                                              |    34 | `4.5`                                                                                           | none                                 |
| `gap-[22px]`, `p-[22px]`, `px-[22px]`, `py-[22px]`, `pl-[22px]`, `gap-y-[22px]`                                 |    12 | `5.5`                                                                                           | none                                 |
| `px-[26px]`, `p-[26px]`, `pl-[34px]`, `gap-[3px]`, `mt-[3px]`                                                   |     9 | `6.5`, `8.5`, `0.75`                                                                            | none                                 |
| `pb-[clamp(64px,8vw,112px)]` and the same in `gap`/`pt`                                                         |    29 | **new `--spacing-section`**                                                                     | none                                 |
| `pb-[clamp(64px,8vw,104px)]`                                                                                    |     7 | `section`                                                                                       | **>2px** (max +8px)                  |
| `pt-[clamp(40px,5vw,72px)]`, `gap-[clamp(40px,5vw,72px)]`                                                       |    18 | **new `--spacing-section-sm`**                                                                  | none                                 |
| `gap-[clamp(40px,5vw,64px)]`, `gap-[clamp(40px,5vw,80px)]`                                                      |    10 | `section-sm`                                                                                    | **>2px** (max ±8px)                  |
| `pt-[clamp(56px,7vw,104px)]`                                                                                    |    13 | **new `--spacing-opening`** (below the black opening)                                           | none                                 |
| `gap-[clamp(56px,7vw,96px)]`                                                                                    |     5 | `opening`                                                                                       | **>2px** (max +8px)                  |
| `p-[clamp(22px,3vw,36px)]`, `p-[clamp(24px,3vw,36px)]`                                                          |    20 | **new `--spacing-card`** `clamp(22px,3vw,36px)`                                                 | low (min −2px for 9)                 |
| `p-[clamp(22px,3vw,32px)]`, `p-[clamp(20px,2.5vw,28px)]`, `p-[clamp(18px,2.4vw,28px)]` and 5 more card paddings |    14 | `card` or a new `--spacing-card-sm` `clamp(20px,2.4vw,28px)`                                    | **>2px** for 6 (max up to +8px)      |
| `gap-[clamp(…)]` one-offs (26 distinct values, 1–5 each)                                                        |    50 | snap each to `section`, `section-sm`, `card` or new `--spacing-stack` `clamp(28px,4vw,56px)`    | **>2px** for most; listed per commit |
| `py-[clamp(72px,10vw,144px)]` home award, `p-[clamp(28px,4.4vw,64px)]` CTA blocks                               |     3 | `--spacing-block` `clamp(28px,4.4vw,64px)`; the award stays a one-off token `--spacing-feature` | none                                 |
| `left-[-10000px]` (honeypot)                                                                                    |     1 | `sr-only`-style utility `@utility offscreen`                                                    | none                                 |

## 4. Sizes: touch targets, widths, heights (about 175 findings)

| Value                                                                                             | Count | Proposed                                                                      | Risk                                                                                          |
| ------------------------------------------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `min-h-[44px]`                                                                                    |    12 | **new `--spacing-touch: 44px`** → `min-h-touch`                               | none                                                                                          |
| `min-h-[48px]`, `min-h-[52px]`, `min-h-[56px]`                                                    |    13 | `min-h-12`, `13`, `14` (button and control sizes, owned by the primitives)    | none                                                                                          |
| `min-h-[40px]`                                                                                    |     6 | `min-h-touch`                                                                 | **>2px** (+4px). Today these are below the 44px target (filters, chips): an accessibility fix |
| `min-h-[36px]`                                                                                    |     1 | `min-h-touch`                                                                 | **>2px** (+8px), same reason                                                                  |
| `min-h-[1.2em]`, `min-h-[1.5em]`, `min-h-[1lh]` (reserved error line)                             |     6 | `min-h-lh` (exists in Tailwind 4)                                             | low (1.2em and 1lh differ by the line height)                                                 |
| `max-w-[760px]`                                                                                   |    20 | **new `--container-copy-wide: 760px`**                                        | none                                                                                          |
| `max-w-[720px]`                                                                                   |    19 | **new `--container-copy: 720px`**                                             | none                                                                                          |
| `max-w-[700px]`, `max-w-[680px]`                                                                  |    10 | `copy`                                                                        | **>2px** (+20px, +40px): lines can rewrap                                                     |
| `max-w-[880px]`, `max-w-[860px]`, `max-w-[900px]`                                                 |    20 | **new `--container-wide: 880px`**                                             | **>2px** for 2 (±20px)                                                                        |
| `max-w-[640px]`, `max-w-[560px]`                                                                  |    14 | **new `--container-narrow: 640px`**                                           | **>2px** for 2 (+80px)                                                                        |
| `max-w-[440px]`, `max-w-[460px]`, `max-w-[480px]`                                                 |     6 | Tailwind `max-w-md` (448px)                                                   | low to **>2px** (±32px)                                                                       |
| `max-w-[1000px]`, `max-w-[960px]`, `max-w-[1100px]`, `max-w-[1200px]`                             |     9 | Tailwind `max-w-5xl` (1024px), `6xl` (1152px)                                 | **>2px** (±24 to 64px)                                                                        |
| `max-w-[340px]`, `max-w-[260px]`, `max-w-[78%]`, `max-w-[calc(100%-32px)]`                        |     5 | `max-w-xs`, `3xs`, keep `78%` as `max-w-4/5`, `max-w-[calc]` → `inset` layout | low to **>2px**                                                                               |
| `w-[…]`, `h-[…]` fixed sizes (`18px`, `22px`, `52px`, `92px`, `112px`, `200px`, `240px`, `280px`) |    20 | spacing scale (`4.5`, `5.5`, `13`, `23`, `28`, `50`, `60`, `70`)              | none                                                                                          |
| `h-[clamp(380px,46vw,500px)]` home hero, `w-[clamp(56px,6vw,80px)]`                               |     2 | one-off tokens in the hero primitive (`--size-hero`)                          | none                                                                                          |
| `max-h-[70vh]`, `max-h-[90vh]`, `min-h-[40vh]`                                                    |     4 | `max-h-[…vh]` has no scale: new `--size-dialog: 90vh`, `--size-sheet: 70vh`   | none                                                                                          |

## 5. Radius (21 arbitrary, plus 24 off-token Tailwind radii)

Tokens today: `pill` 999px, `card` 24px, `block` clamp(24px,3vw,40px).

| Value                        | Count | Proposed                                           | Risk                                                    |
| ---------------------------- | ----: | -------------------------------------------------- | ------------------------------------------------------- |
| `rounded-[14px]`             |     4 | **new `--radius-control: 14px`** (inputs, selects) | none                                                    |
| `rounded-xl` (12px, options) |     2 | `control`                                          | low (+2px): options match inputs                        |
| `rounded-2xl` (16px)         |    17 | `control`                                          | low (−2px)                                              |
| `rounded-[16px]`             |     3 | `control`                                          | low (−2px)                                              |
| `rounded-[20px]`             |    11 | `card`                                             | **>2px** (+4px). Alternative: new `--radius-tile: 20px` |
| `rounded-[28px]`             |     3 | `card` (Modal, feedback cards)                     | **>2px** (−4px)                                         |
| `rounded-lg` (8px)           |     4 | new `--radius-thumb: 8px` (logos, thumbnails)      | none                                                    |
| `rounded-full`               |    21 | fine (avatars, dots)                               | none                                                    |

## 6. Everything else

| Value                                                                                               | Count | Proposed                                                                                                                                                              | Risk |
| --------------------------------------------------------------------------------------------------- | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `underline-offset-[3px]`                                                                            |    31 | `underline-offset-3` (exists in Tailwind 4), owned by the `TextLink` primitive                                                                                        | none |
| `shadow-[0_8px_28px_rgba(0,0,0,0.25)]`, `shadow-[0_2px_12px_rgba(0,0,0,0.12)]`                      |     2 | **new `--shadow-overlay`, `--shadow-raised`**                                                                                                                         | none |
| `shadow-[inset_0_0_0_2px_#19191B]`                                                                  |     1 | `inset-ring-2 inset-ring-ink`                                                                                                                                         | none |
| `border-[3px]`                                                                                      |     2 | `border-3`                                                                                                                                                            | none |
| `outline-offset-[6px]`                                                                              |     1 | `outline-offset-6`                                                                                                                                                    | none |
| `scale-[1.02]`                                                                                      |     1 | `scale-102`                                                                                                                                                           | none |
| `transition-[transform,opacity]`, `transition-[filter,opacity]`                                     |     2 | `transition` (covers both)                                                                                                                                            | none |
| `ease-[cubic-bezier(0.22,1,0.36,1)]`                                                                |     1 | **new `--ease-out-soft`**                                                                                                                                             | none |
| `flex-[1_1_100%]`, `flex-[0_0_auto]`, `flex-[1_1_240px]`, …                                         |     8 | `basis-full grow`, `flex-none`, `basis-60 grow`                                                                                                                       | none |
| `col-[1/-2]`                                                                                        |     1 | `col-start-1 -col-end-2`                                                                                                                                              | none |
| `aria-[current=true]:`                                                                              |     2 | `aria-current:` (Tailwind 4 has it)                                                                                                                                   | none |
| `[[hidden]]:hidden`, `[&>li+li]:mt-1.5`, `[&>*+*]:mt-3`, `[grid-area:a]`, `[&:not([hidden])]:block` |    14 | `[[hidden]]:hidden`: a global base rule `[hidden] { display: none !important }`; sibling spacing: `space-y-*`; grid areas: named `@utility` in the HomeHero primitive | none |
| `bg-[linear-gradient(…)]` (photo caption scrim)                                                     |     1 | **new `--gradient-scrim`**. Note: the brand rules forbid decorative gradients; this one keeps captions readable on photos                                             | none |
| `align-[-0.1em]`, `w-[0.9em]`, `h-[0.9em]` (icons)                                                  |     3 | owned by an `Icon` primitive (`size-[0.9em]` becomes `--size-icon-inline`)                                                                                            | none |

### `grid-cols-[…]` and `aspect-[…]` (allowed, 102)

Allowed by the lint rule, but 60 of them are the same pattern `repeat(auto-fit,minmax(min(100%,Npx),1fr))` with 17 different `N`. Suggestion (optional): a `@utility grid-fit-*` taking the minimum column width, so `grid-fit-260` replaces `grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]`. `TopicGroups.astro` and `PointList.astro` build the same thing with an inline style today.

## 7. Inline styles (17)

| File                                                             | What                                                       | Proposed                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `Photo.astro`, `SpeakerCarousel.tsx` (×2), `HomeHero.astro` (×3) | `object-position` from Sanity (focal point), video opacity | keep: runtime values from content. `eslint-disable` with the reason |
| `PackedGrid.astro` (×2)                                          | CSS custom properties for column counts                    | keep, with the reason                                               |
| `feedback/speaker/[token].astro`                                 | bar width in %                                             | keep (data), or `<meter>`/`<progress>`                              |
| `design.astro` (×2)                                              | the token showcase page                                    | keep: it displays the tokens themselves                             |
| `SpeakerCompanies.astro`                                         | logo width from data                                       | keep, with the reason                                               |
| `TopicGroups.astro`, `PointList.astro`                           | `grid-template-columns` with a prop                        | `grid-fit-*` utility (above)                                        |
| `RichText.tsx`                                                   | line clamp                                                 | `line-clamp-*` utilities (Tailwind 4 has them)                      |
| `SocialLabel.tsx` (×2)                                           | third-party brand colours on icons                         | see hex below                                                       |

## 8. Hardcoded colours (21)

| File                                     | What                                                | Proposed                                                                          |
| ---------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| `SocialLabel.tsx` (15)                   | LinkedIn, GitHub, Bluesky, Instagram, Slack colours | new token group `brandColors` in `tokens.ts` (third-party marks, not our palette) |
| `Header.astro` (3), `partners.astro` (2) | `#000` in inline SVG                                | `currentColor` with `text-black`                                                  |
| `Tonight.tsx` (1)                        | `#19191B` in a shadow                               | `inset-ring-ink`                                                                  |
| `BaseLayout.astro` (1)                   | `theme-color` meta                                  | import `colors.black` from tokens                                                 |
| `og/[name].png.ts`, `design.astro`       | OG image and token showcase                         | out of scope (not lint-checked); OG could import tokens later                     |

## 9. Class-returning helpers

`packages/design/src/recipes.ts` has the helpers the rules forbid outside a primitive: `buttonClass` (10 call sites), `surfaceClass` (7), `monogramClass` (6), `optionClass` and `optionInput` (10 each), `linkCardClass` and `linkCardArrow` (6 each), `headingSizes` (6), and the generic `cx` (58 calls in 25 files). Pages and islands also define local class constants (`const h2 = …`, `const legend = …`, `const CARD_PAD = …`, `moreClass="…"`) in about 15 files. Each helper becomes a cva recipe inside its primitive (below); the local constants become primitive variants or tokens.

Smaller findings while auditing:

- `surfaceTones.grey` and `surfaceTones.soft` are identical: one is enough.
- Existing token names that describe the value rather than the role, which rule 2 forbids: `ink-2`, `ink-3`, `grey-line`, `grey-frame`, `grey-mid`, `grey-light`, `yellow-hover`. Proposal: rename to roles (`surface-dark`, `surface-dark-raised`, `border-strong`, `border`, `text-subtle`, `text-on-dark-muted`, `accent-hover`). This is a broad rename (about 600 uses) and not needed for compliance with rule 1; I'd do it last or not at all. Your call.
- `tokens.ts` declares `headings.body: '18px'`, but body copy is 17px in 192 places. `text-body` should say 17px, or the copy should move to 18px (a redesign, not proposed).

## 10. Primitives

Location: `packages/design/src/components/ui/`. Each primitive has one cva recipe (`button.ts`) that both the Astro component and the Preact island import, so variants are defined once for static pages and islands. New dependency: `class-variance-authority` 0.7.1 (stable since 2024). The helpers in `recipes.ts` are removed when their last call site moves.

| Primitive                           | Replaces                                                                                  | Variant axes                                                                                                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**                          | `Button.astro`, `islands/Button.tsx`, `buttonClass`, raw `<button class>` in 3 files      | `intent`: primary (yellow), strong (black), secondary (outline), quiet (grey), plain (white), danger, link; `surface`: light, dark (for outline on black); `size`: sm, md, lg; `width`: auto, grow; states: disabled, busy (`aria-busy`) |
| **Field**                           | `Field.tsx` wrapper, the label/hint/error markup repeated in forms                        | `labelSize`: md, lg; `invalid`; `required`. Wraps one control; owns ids and `aria-describedby`                                                                                                                                           |
| **Input**, **Textarea**, **Select** | the `control` string in `Field.tsx`, 15 raw `<input>` in islands                          | `size`: md, lg; `invalid`; `disabled`                                                                                                                                                                                                    |
| **Option** (radio or checkbox card) | `optionClass`, `optionInput`, `ChipGroup`, the donate amount and membership level pickers | `type`: radio, checkbox; `appearance`: card, chip; `size`: md, lg; `invalid`; `disabled`                                                                                                                                                 |
| **ChoiceGroup**                     | the fieldset + legend + error pattern (local `legend`, `sectionTitle` constants)          | `layout`: stack, wrap, grid; `invalid`                                                                                                                                                                                                   |
| **Checkbox**                        | `Checkbox` in `Field.tsx`, the terms checkbox                                             | `invalid`; `disabled`                                                                                                                                                                                                                    |
| **Card**                            | `Surface.astro`, `surfaceClass`, `linkCardClass`, `linkCardArrow`, local `CARD_PAD`       | `tone`: plain, accent (yellow), dark, ink; `padding`: none, sm, md (fluid `card`), lg; `radius`: card, block; `interactive`: false, link (soft grey, arrow, hover)                                                                       |
| **Notice**                          | `surfaceClass('success' \| 'danger')` result boxes in forms, the membership notices       | `tone`: success, danger, info; `size`: sm, md                                                                                                                                                                                            |
| **Badge**                           | ad-hoc `rounded-pill` spans (status pills, tags, level labels)                            | `tone`: neutral, accent, dark, success, danger; `size`: sm, md                                                                                                                                                                           |
| **Heading**                         | `headingSizes`, `SectionHeading.astro`, local `h2`/`h3`/`H` constants                     | `level`: display, title, h1, h2, h2-medium, h3; `as`: h1 to h4 (semantics separate from size); `tone`: default, on-dark                                                                                                                  |
| **Text**                            | `text-[17px] leading-[1.55] text-grey-text` chains everywhere                             | `size`: lead, body, base, meta, small; `tone`: default, muted, on-dark, on-dark-muted; `measure`: none, copy, copy-wide                                                                                                                  |
| **TextLink**                        | `underline underline-offset-[3px]` (31), local `link`/`linkCls`                           | `tone`: default, muted, on-dark; `weight`: regular, bold                                                                                                                                                                                 |
| **Monogram**                        | `Monogram.astro`, `monogramClass`                                                         | `tone`: grey, white, blue; `size`: avatar, tile, portrait                                                                                                                                                                                |
| **Icon**                            | `Check.tsx`, `LineIcon.astro`, `SocialIcon` sizing                                        | `size`: inline (0.9em), sm, md                                                                                                                                                                                                           |
| Already shaped, keep                | `Modal`, `StarRating`, `Gallery`, `RatingSheet`                                           | move to `ui/` only where they hold variants (`StarRating` `size`)                                                                                                                                                                        |

Not proposed: a `Section` layout primitive. The spacing tokens (`section`, `section-sm`, `opening`) are enough, and layout belongs to pages under rule 3.

## 11. Phase 2 order (after approval)

1. Tokens: the type scale (`text-body`, `text-meta`, `text-lead`, `text-title`, generated heading sizes with line heights), spacing (`touch`, `section`, `section-sm`, `opening`, `card`, `block`, `stack`), containers (`copy`, `copy-wide`, `wide`, `narrow`), radius (`control`, `thumb`), shadows, ease, `brandColors`. One commit, no call sites.
2. One commit per primitive, in this order (most call sites first): Text and Heading, Button, Field/Input/Select/Textarea, Option and ChoiceGroup, Card and Notice, Badge, TextLink, Monogram, Icon.
3. Remaining page-level snaps (spacing, widths), one commit per area (home, about, partners, events, forms, membership).
4. `pnpm lint:ui:prune` after each commit, so the baseline shrinks; the rule itself is already on.
5. After each commit: `pnpm lint && pnpm lint:ui && pnpm typecheck`, the `rg` check, screenshots at 375px and 1280px, and visual baselines updated only where a listed snap changed pixels (the PR names each).

## Decisions needed

1. **New tokens**: approve the list in step 1 above, in particular `text-body` 17px and `text-meta` 15px (or snap them to 16 and 14, which changes all body and meta text by 1px).
2. **>2px snaps**: approve all, approve by group, or keep the old value as a named one-off token. The largest are page-title sizes (±4px), section spacing maxima (±8px), container widths (up to +80px, rewraps text), `rounded-[20px]` and `[28px]` to the 24px card radius, and 40px controls growing to the 44px touch target.
3. **Token renames** (`ink-2` to `surface-dark-raised` and so on): do now, later, or never.
4. **`grid-fit-*` utility**: add it, or keep the allowed `grid-cols-[…]`.
