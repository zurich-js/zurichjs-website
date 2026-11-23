---
type: Spec
title: Review every partner, then seed the production database
description: A checklist of what the owner must confirm for each partner (tier, current, logo files, hover colour), and what is left before production reads its partners from the database.
tags: [partners, sponsorship, logos, database]
timestamp: '2026-11-25T00:00:00Z'
status: in-progress
domain: partners
systems: [content, web, design-system]
---

# Outcome

Every partner the site shows has been checked by the owner (who they are to ZurichJS, their tier, whether they are current, their logos), and the board changes partners in `/admin/partners` instead of in code.

The admin section and the database tables exist ([Partners and sponsorship](/domains/partners/overview.md)). Production's table is still empty, so production shows the list in code: `packages/content/src/partners.ts`, with the logo files in `apps/web/public/images/partners`. A running sponsorship linked to a partner sets that partner's tier and current status on the site, and has no effect on logos or colours ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").

## The list as it is (19th November 2026)

Where each partner appears on the home page: **Sponsors** are the framed colour cells, **Partners** the first moving row, **Past** the second ([Components](/systems/design-system/components.md), Logos).

| Partner                                                                                                                       | Kind       | Tier      | Current | Home page                           | Logo file                                        | Hover colour | To check                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------- | --------- | ------- | ----------------------------------- | ------------------------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe                                                                                                                        | sponsor    | builder   | yes     | Sponsors, large                     | `stripe.webp`                                    | `#635bff`    | Confirmed: stays a Builder (owner, 19th November 2026).                                                                                                                                      |
| GYFF                                                                                                                          | sponsor    | friend    | yes     | Sponsors, a step above the smallest | `gyff-logo-square.webp`                          | none         | Its tier comes from its sponsorship in the database (owner, 19th November 2026); `friend` is what a build without the database shows. The board still has to set it up in `/admin/sponsors`. |
| FIN                                                                                                                           | sponsor    | supporter | yes     | Sponsors, smallest                  | `fin.webp`                                       | none         | Still sponsoring?                                                                                                                                                                            |
| SAE Institute Zürich                                                                                                          | venue      | none      | yes     | Sponsors, smallest                  | `sae-institute.svg`                              | `#000000`    | Confirmed: stays, with the sponsors as a current host (owner, 19th November 2026).                                                                                                           |
| novu AG, GetYourGuide, Orbiz Josef Zurich                                                                                     | venue      | none      | yes     | Sponsors, smallest                  | `novu.webp`, `get-your-guide.webp`, `orbiz.webp` | none         | Current hosts again (owner, 19th November 2026). Hover colours not chosen.                                                                                                                   |
| WhatTheStack                                                                                                                  | conference | none      | yes     | Partners                            | `wts.webp`                                       | none         | Perk still runs?                                                                                                                                                                             |
| Grusp                                                                                                                         | conference | none      | yes     | Partners                            | `grusp.webp`                                     | none         | Needs a black logo file. Perk still runs?                                                                                                                                                    |
| Voxxed Days Zurich                                                                                                            | conference | none      | yes     | Partners                            | `voxxed-days-zurich.webp` (solid background)     | none         | Current since the owner's decision of 3rd November 2026.                                                                                                                                     |
| Swiss Dev Jobs                                                                                                                | supporting | none      | yes     | Partners                            | `sdj-rectangle.webp` (white shapes inside)       | none         | Needs a black logo file. Still current?                                                                                                                                                      |
| JetBrains                                                                                                                     | supporting | none      | yes     | Partners                            | `jetbrains.webp`                                 | none         | Still current?                                                                                                                                                                               |
| CityJS                                                                                                                        | conference | none      | no      | Past                                | `city-js.webp`                                   | none         | Confirmed past: they no longer recognise us (owner, 19th November 2026).                                                                                                                     |
| Vercel                                                                                                                        | sponsor    | none      | no      | Past                                | `vercel-black.webp`                              | none         | The seed script still has it as a current Champion.                                                                                                                                          |
| Smallpdf                                                                                                                      | venue      | none      | no      | Past                                | `smallpdf.webp`                                  | none         | Confirmed past (owner, 19th November 2026).                                                                                                                                                  |
| Dynatrace, AWS, Gatling, Supabase, Remotion, Sentry, Cloudflare, ImageKit, Storyblok, OnlyDust, Platformatic, Digitec Galaxus | sponsor    | none      | no      | Past                                | one file each                                    | none         | Each was a sponsor at some point: confirm, and add the years (`since`, `until`) where known.                                                                                                 |
| Web Zurich                                                                                                                    | community  | none      | yes     | Partners                            | `webzurich.webp` (solid background)              | none         | Shown again as a community partner (owner, 25th November 2026). Needs a one-colour logo file: its solid background reads badly in the moving row.                                            |
| Ginetta, Code Blossom, DotJS, React Paris, iJS Munich                                                                         | various    | none      | no      | not shown                           | kept                                             | none         | No longer promoted (owner, 2nd, 3rd and 19th November 2026).                                                                                                                                 |

Nobody has a `logoBlack` file. Where logos are black (the moving rows, the wall on `/partners`), a filter draws the colour file in black, which turns a logo with a solid background or several colours into a block.

## Requirements and acceptance

**The owner's review (content, no code):**

- For each row above, the kind, tier and current flag are confirmed or corrected. The open "confirm" items are also in [Content sources](/reference/content-sources.md).
- Sponsors and current hosts: the logo is the file the company wants shown, and a hover colour is chosen or left empty. A hover colour suits a logo that is one shape (the logo turns white on a dark colour, black on a light one).
- A one-colour logo file for Grusp and Swiss Dev Jobs, and for any other logo that reads badly in the moving rows.
- Hover colours for the three hosts added back.

**Moving the list into the database** (owner, 20th November 2026: partners are records in the database, edited in `/admin/partners`, not in Sanity and not in code):

- Built: the `partners` and `partner_logos` tables, the admin section with two logo files and a hover colour per partner, the build reading them, and a seed for local databases ([Partners and sponsorship](/domains/partners/overview.md)).
- Left: seeding the production database. `apps/web/scripts/seed-partners.ts` refuses any database that is not on this machine; how production is seeded (the same list through the admin area, or the script with an explicit switch) is the owner's call. Until then production builds find an empty table and show the list in code.
- Left: once production reads the table, the logo files in `apps/web/public/images/partners` and the list in code are only the seed and what tests show; the Sanity `partner` type and the Studio's `seed-partners.ts` can then go.
- After seeding, the home page, `/partners`, an upcoming event page and Tonight show the same partners as before, apart from the logo addresses.

## Affected concepts

- [Partners and sponsorship](/domains/partners/overview.md)
- [Content sources](/reference/content-sources.md)
- [Content model](/domains/content/content-model.md)
- [Studio](/systems/studio.md)
- [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Components](/systems/design-system/components.md)

## Open decisions

- Whether hover colours are chosen by ZurichJS or asked of each sponsor. Either way the board enters them (owner, 20th November 2026).
- How and when the production database is seeded.

## Not verified

- Whether each partner in the "Past" rows agreed to be listed; the sources are the old site, the prospectus and the banners on event photos.
