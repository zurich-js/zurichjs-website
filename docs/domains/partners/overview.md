---
type: Domain
title: Partners and sponsorship
description: Hosts, sponsors and community partners: where the list comes from, who counts as current, where they are thanked, the sponsorship offering on /partners and the enquiry form.
tags: [partners, sponsorship, frontend]
timestamp: "2026-11-25T00:00:00Z"
---

# Partners and sponsorship

**This page owns the public side of partners.** Paid sponsorships (sign-up, payment, the sponsor account and admin) are in [Sponsorship](/domains/sponsorship/overview.md); a running sponsorship sets who is a current sponsor and at which tier, on top of the list described below.

Source: `packages/content/src/partners.ts` (the seed list, tiers, delisting, event supporters, `withPartnerFallback`), `packages/content/src/sponsorships.ts` (`applySponsorships`), `packages/events/src/today.ts` (`groupPartners`, `eventThanks`), `apps/web/src/pages/partners.astro`, the `partner` type ([Content model](/domains/content/content-model.md)), and the logo components ([Components](/systems/design-system/components.md), "Logos").

## Where the list comes from

- **The `partners` table in the database is the list** (owner, 20th November 2026): every sponsor, host and partner the site names, current and past, is a row there, edited by the board in `/admin/partners`. A build reads it with the sponsorships, in one step (`apps/web/src/server/sponsor-public.ts`, `withPartners` in `packages/content/src/index.ts`).
- **The list in code is the seed and the fallback.** `packages/content/src/partners.ts`, with the logo files in `apps/web/public/images/partners`, follows the old production partner list; every entry names its source ([Content sources](/reference/content-sources.md)). It is what a build shows when it has no database, cannot read it, or the table is still empty, and what tests and CI show (they never read the database). `apps/web/scripts/seed-partners.ts` copies it into a local database ("Seeding" below).
- **Sanity `partner` documents are no longer read first.** Production has none. They are used only when there is no database table to read and Sanity has some; the `partner` type and the Studio's `seed-partners.ts` are left as they were.
- **The sponsorships database overrides `tier` and `current`** for a partner a sponsorship is linked to, by the partner's `id` (owner, 19th November 2026). A running sponsorship makes the partner a current sponsor at its tier; an ended one makes it a past sponsor. The logos, hover colour, link and words stay the partner record's. A running sponsor with no partner record is listed by name, without a logo, and the admin area flags it ("No logo on the site"). The rules and the builds are in [Sponsorship](/domains/sponsorship/overview.md), "On the public site".
- **Event hosts:** while Sanity has no partner documents, each event's host is the venue partner named in its own `location`, and only the supporters production stated for an evening are added (`EVENT_SUPPORTERS`). Hosts or supporters an event already has always win.
- **The review of every partner** (tier, current, logo files, hover colour) is in [the partner review Spec](/domains/partners/specs/partner-data-review.md).

## Who counts as current

- **Only partners an organiser marks `current`, or with a running sponsorship in the database, are called current sponsors.** Venue hosts are listed as hosts ("have hosted"), never as current sponsors. The current hosts are SAE Institute Zürich, novu, GetYourGuide and Orbiz Josef (owner, 19th November 2026); Smallpdf is a past host.
- **Web Zurich is a current community partner** again (owner, 25th November 2026). It was removed from every list on 19th November 2026.
- **Delisted partners** are never promoted: `DELISTED_PARTNERS` (Ginetta, Code Blossom, DotJS, React Paris; owner, 2nd and 3rd November 2026; iJS Munich; owner, 19th November 2026) and any partner with `delisted`, matched by id or name, so a seeded Sanity document cannot bring them back. `groupPartners` leaves them out of every list (current, venue, community, previous), so they disappear from `/partners`, the home page, upcoming event pages, Tonight and the design gallery. They remain only as history: a past event they hosted still names them, and the About timeline and `llms-full.txt` keep past venues.
- Vercel is listed as a past sponsor, not current (owner, 4th November 2026).

## The partner record, logos and hover colour

Source: `packages/sponsorship/src/partners.ts` (the store), `apps/web/src/server/partner-admin.ts`, `apps/web/src/components/islands/PartnersAdmin.tsx`, the endpoints under `apps/web/src/pages/api/membership/admin/partners`, and the migration `apps/web/database/migrations/20261123090000_partners.sql`.

- **A record has** an id (lowercase letters, numbers and hyphens; fixed once created, because sponsorships and events link to it), name, website, kinds, tier, current, "do not show" (delisted), a short description, the sponsor's own words, and whether links to them carry the referrer. There is no delete: a partner that should disappear is marked "do not show".
- **Two logo files** (owner, 20th November 2026), SVG, PNG or WebP up to 2 MB, checked like a sponsor's upload (`apps/web/src/server/sponsor-logo.ts`):
  - **Colour logo:** the logo as the company wants it, in the sponsor and host cells and on event pages.
  - **One-colour logo** (optional): a single-colour version on a transparent background, used where logos are black (the moving rows, the wall on `/partners`) and drawn white or black on the hover colour. Without it the colour logo is drawn in one colour by a filter ([Components](/systems/design-system/components.md), "Logos").
- **Hover colour** (optional, `#rrggbb`): the colour the partner's cell turns on hover. The admin page previews the cell at rest, on hover and in a moving row.
- **Only the board sets them.** A sponsor still uploads logos on their own page; a file is on the public site only once the board uses it as the partner's colour or one-colour logo ("Use as the colour logo" in `/admin/sponsors`, or an upload in `/admin/partners`).
- **Where the files live:** in the database (`partner_logos`, one row per partner and variant), so a build reads them with the same connection. A build writes them out as static files, `/partner-logos/<logo id>.<ext>` (`apps/web/src/pages/partner-logos/[file].ts`); the dev server and the admin previews read them from `/api/partner-logo/<logo id>.<ext>`. A new upload has a new id, so an address never changes what it shows; both are served with a sandboxing content security policy. The logo's ratio and whether it is opaque are read from the file when it is uploaded (`apps/web/src/server/logo-meta.ts`).
- **A change queues a rebuild,** debounced like a Sanity publish ([Rebuilds](/systems/operations/rebuilds.md)); the site follows a few minutes later.

### Seeding

`pnpm partners:seed` (`just seed-partners`) adds every partner of the list in code that the table does not have yet, with its logo file, and never changes one that is there. It refuses any database that is not on this machine. The local Docker stack runs it when the site starts. **No deployed database has been seeded** (owner, 20th November 2026: local only for now): until the owner seeds production, production builds find an empty table and show the list in code, as before.

## Where partners are thanked

- **Home page:** current sponsors and current venue hosts together, in colour (Champion extra large, Builder large, Friend a step above the rest); then community and conference partners in a moving row; then past supporters in a second one ([Components](/systems/design-system/components.md)).
- **Upcoming event pages and Tonight:** the evening's hosts and supporters, plus this season's current sponsors. A one-time sponsor is one of the evening's supporters on the meetups it sponsors, and not a season sponsor on the others ([Sponsorship](/domains/sponsorship/overview.md), "On the public site").
- **Once each:** a current sponsor that also hosted is listed with the sponsors only, not again with the venues; the home page's past supporters list each partner once.
- **Past event pages:** only their own hosts and stated supporters (`eventThanks(ev, partners, { past })`). A meetup whose date has gone by, including a cancelled one, never shows "Supporting ZurichJS this season", so no past event implies today's sponsors supported it. JSON-LD sponsors follow the same rule.

## `/partners`

The page, in order: who you reach; what we take care of; four ways to partner (sponsorship, hosting, food and drinks, community collaboration; hosting and food are free or separate and are not packages); sponsorship packages; conference sponsorship as a separate block linking to conf.zurichjs.com/sponsorship; proof (current sponsors, "Hosts and partners" with the venue, conference, community and supporting groups, a testimonial, previous partners); then the enquiry form.

- **Tiers** (`SPONSORSHIP_TIERS`): Community Champion, Builder, Friend, Supporter and Host, with production's yearly, monthly and one-time prices and benefits (the same prices as `packages/sponsorship/src/tiers.ts`, held equal by `apps/web/test/sponsorship-fees.test.ts`; see [Sponsorship](/domains/sponsorship/overview.md)). Yearly is ten times monthly ("2 months free"). The page does not show the quarterly price or a link to sponsor online yet (Spec below). Every package card has the same three price rows in the same order. The Champion workshop perk is removed (workshops are discontinued). "Request the prospectus" is an email with a fixed subject.
- **Figures:** the October 2025 reach figures are headed "Our reach in October 2025" and footnoted as not updated; the attendee profile is labelled as conf.zurichjs.com/sponsorship's meetup attendee profile, undated; the organisers' Meetup export is shown as RSVPs, not check-ins (November 2024 to September 2026). No response time is promised.
- **Anchors:** `#sponsorship-tiers`, `#partners-current`, `#partners-community` (all partner groups), `#partners-venues`, `#partners-conferences`, `#partners-communities`, `#partners-supporting`, `#partners-past`, `#partner-form`, and `#inquiry-form` as an alias for the form. The category sections render even when empty.

## The enquiry form

- **Intents:** Sponsorship (`way=partner`, kept for existing links), Host a meetup, Food and drinks, Community collaboration (`way=community`) and Not sure yet (the default). Tier buttons link to `?way=partner&tier=<tier>#partner-form` and preselect an optional "Sponsorship tier"; `?tier=` alone implies sponsorship. The chosen intent is shown, stays editable, and is written back to the URL so a reload keeps it.
- **Fields:** organisation, name, email, the intent, an optional phone and, for hosting, room size, and a message whose hint changes per intent.
- **Delivery:** the `partners` form kind, by email and Slack with every field labelled; the subject names the intent ([Forms](/domains/forms/overview.md)). The page and success message say an organiser replies from hello@zurichjs.com and nothing is agreed until you confirm.

## Open questions

The owner decisions and confirm items for partners (each current flag, the one-time benefit duration and any monthly minimum, why covering speaker travel counts as Community Friend and for how long, the attendee profile's date and method) are listed in [Content sources](/reference/content-sources.md).

## Related concepts

- [Sponsorship](/domains/sponsorship/overview.md), [Sponsorship frontend](/domains/sponsorship/frontend.md)
- [Events](/domains/events/overview.md), [Events frontend](/domains/events/frontend.md), [Content](/domains/content/overview.md), [Content model](/domains/content/content-model.md)
- [Components](/systems/design-system/components.md) (logos), [Web app](/systems/web.md), [Studio](/systems/studio.md)

# Related specs

- [Online sponsorship on /partners](/domains/sponsorship/specs/partners-page-online.md)
- [Review every partner, then seed the production database](/domains/partners/specs/partner-data-review.md)
