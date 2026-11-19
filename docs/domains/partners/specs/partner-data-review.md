---
type: Spec
title: Review every partner, then move the list into Sanity
description: A checklist of what the owner must confirm for each partner (tier, current, logo files, hover colour) and what has to be built before partners can be edited in the Studio.
tags: [partners, sponsorship, logos, sanity]
timestamp: '2026-11-19T00:00:00Z'
status: planned
domain: partners
systems: [content, studio, design-system]
---

# Outcome

Every partner the site shows has been checked by the owner (who they are to ZurichJS, their tier, whether they are current, their logo), and organisers change partners in the Sanity Studio instead of in code.

Today the list is in code: `packages/content/src/partners.ts`, with the logo files in `apps/web/public/images/partners`. Production Sanity has no `partner` documents (checked 19th November 2026), so the site falls back to that list. The board's admin area (`/admin/sponsors`) manages paid sponsorships; a running sponsorship linked to a partner sets that partner's tier and current status on the site, and has no effect on logos or colours ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").

## The list as it is (19th November 2026)

Where each partner appears on the home page: **Sponsors** are the framed colour cells, **Partners** the first moving row, **Past** the second ([Components](/systems/design-system/components.md), Logos).

| Partner                                                                                                                       | Kind       | Tier      | Current | Home page                           | Logo file                                                         | Hover colour | To check                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- | ------- | ----------------------------------- | ----------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe                                                                                                                        | sponsor    | builder   | yes     | Sponsors, large                     | `stripe.webp`                                                     | `#635bff`    | Still a Builder? The old site also listed it as a previous sponsor.                                                                                                                   |
| GYFF                                                                                                                          | sponsor    | friend    | yes     | Sponsors, a step above the smallest | `gyff-logo-square.webp`                                           | none         | Raised from supporter to friend for its coming contribution (owner, 19th November 2026): `/partners` and Tonight now call it a Community Friend. Confirm the tier and when it starts. |
| FIN                                                                                                                           | sponsor    | supporter | yes     | Sponsors, smallest                  | `fin.webp`                                                        | none         | Still sponsoring?                                                                                                                                                                     |
| SAE Institute Zürich                                                                                                          | venue      | none      | yes     | Sponsors, smallest                  | `sae-institute.svg`                                               | `#000000`    | A host, shown with the sponsors because it is a current host. Confirm that is wanted.                                                                                                 |
| WhatTheStack                                                                                                                  | conference | none      | yes     | Partners                            | `wts.webp`                                                        | none         | Perk still runs?                                                                                                                                                                      |
| iJS Munich                                                                                                                    | conference | none      | yes     | Partners                            | `ijs-munich.webp` (solid background)                              | none         | Needs a black logo file. Perk still runs?                                                                                                                                             |
| Grusp                                                                                                                         | conference | none      | yes     | Partners                            | `grusp.webp`                                                      | none         | Needs a black logo file. Perk still runs?                                                                                                                                             |
| Voxxed Days Zurich                                                                                                            | conference | none      | yes     | Partners                            | `voxxed-days-zurich.webp` (solid background)                      | none         | Current since the owner's decision of 3rd November 2026.                                                                                                                              |
| Web Zurich                                                                                                                    | community  | none      | yes     | Partners                            | `webzurich.webp` (solid background)                               | none         | Needs a black logo file. Still current?                                                                                                                                               |
| Swiss Dev Jobs                                                                                                                | supporting | none      | yes     | Partners                            | `sdj-rectangle.webp` (white shapes inside)                        | none         | Needs a black logo file. Still current?                                                                                                                                               |
| JetBrains                                                                                                                     | supporting | none      | yes     | Partners                            | `jetbrains.webp`                                                  | none         | Still current?                                                                                                                                                                        |
| CityJS                                                                                                                        | conference | none      | no      | Past                                | `city-js.webp`                                                    | none         | Past, while the other conference partners are current: right?                                                                                                                         |
| Vercel                                                                                                                        | sponsor    | none      | no      | Past                                | `vercel-black.webp`                                               | none         | The seed script still has it as a current Champion.                                                                                                                                   |
| novu AG, GetYourGuide, Smallpdf, Orbiz Josef Zurich                                                                           | venue      | none      | no      | Past                                | `novu.webp`, `get-your-guide.webp`, `smallpdf.webp`, `orbiz.webp` | none         | Hosts that are not marked current. Is any of them a current host like SAE?                                                                                                            |
| Dynatrace, AWS, Gatling, Supabase, Remotion, Sentry, Cloudflare, ImageKit, Storyblok, OnlyDust, Platformatic, Digitec Galaxus | sponsor    | none      | no      | Past                                | one file each                                                     | none         | Each was a sponsor at some point: confirm, and add the years (`since`, `until`) where known.                                                                                          |
| Ginetta, Code Blossom, DotJS, React Paris                                                                                     | various    | none      | no      | not shown                           | kept                                                              | none         | No longer promoted (owner, 2nd and 3rd November 2026).                                                                                                                                |

Nobody has a `logoBlack` file. Where logos are black (the moving rows, the wall on `/partners`), a filter draws the colour file in black, which turns a logo with a solid background or several colours into a block.

## Requirements and acceptance

**The owner's review (content, no code):**

- For each row above, the kind, tier and current flag are confirmed or corrected, with `since` and `until` where known. The open "confirm" items are also in [Content sources](/reference/content-sources.md).
- Sponsors and current hosts: the logo is the file the company wants shown, and a hover colour is chosen or left empty. A hover colour suits a logo that is one shape (the logo turns white on a dark colour, black on a light one).
- A black logo file for iJS Munich, Grusp, Web Zurich and Swiss Dev Jobs, and for any other logo that reads badly in the moving rows.
- Whether a current host belongs with the sponsors (SAE today), and whether the tier alone should set a sponsor's cell size (GYFF's bigger cell comes from the Friend tier).

**Moving the list into Sanity (code):**

- The sponsorships database keeps overriding `tier` and `current` after the move: a sponsor's partner id is then the Sanity partner's `id`, so the ids in the seed stay the ones in the code list.

- `apps/studio/scripts/seed-partners.ts` creates a draft for all 33 partners in the code list, not the 17 it has now, with the same kinds, tiers and current flags, and with `logoBackground` and `logoBlack` where the code list has them. Vercel is no longer a current Champion in it.
- The seed runs only after the Studio with the `partner` fields is deployed (it deploys when `apps/studio` reaches `main`). The site ignores the whole code list as soon as Sanity has one published partner, so all drafts are published together, after the review.
- `logoKnockout` (white shapes inside a coloured one) comes only from the code list today; in Sanity those logos get a `logoBlack` file instead, or the flag becomes a field.
- After publishing, the home page, `/partners`, an upcoming event page and Tonight show the same partners as before the move, and the visual baselines change only where the review changed something.

## Affected concepts

- [Partners and sponsorship](/domains/partners/overview.md)
- [Content sources](/reference/content-sources.md)
- [Content model](/domains/content/content-model.md)
- [Studio](/systems/studio.md)
- [Components](/systems/design-system/components.md)

## Open decisions

- Who the current hosts are, and whether hosts stay in the sponsors' cells.
- Whether GYFF is formally a Community Friend, or only shown bigger. If only bigger, cell size needs its own field instead of the tier.
- Whether hover colours are chosen by ZurichJS or asked of each sponsor.

## Not verified

- Whether each partner in the "Past" rows agreed to be listed; the sources are the old site, the prospectus and the banners on event photos.
