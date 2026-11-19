---
type: Domain
title: Partners and sponsorship
description: Hosts, sponsors and community partners: where the list comes from, who counts as current, where they are thanked, the sponsorship offering on /partners and the enquiry form.
tags: [partners, sponsorship, frontend]
timestamp: "2026-11-19T00:00:00Z"
---

# Partners and sponsorship

**This page owns the public side of partners.** Paid sponsorships (sign-up, payment, the sponsor account and admin) are in [Sponsorship](/domains/sponsorship/overview.md); a running sponsorship sets who is a current sponsor and at which tier, on top of the list described below.

Source: `packages/content/src/partners.ts` (the code-side record, tiers, delisting, event supporters, `withPartnerFallback`), `packages/content/src/sponsorships.ts` (`applySponsorships`), `packages/events/src/today.ts` (`groupPartners`, `eventThanks`), `apps/web/src/pages/partners.astro`, the `partner` type ([Content model](/domains/content/content-model.md)), and the logo components ([Components](/systems/design-system/components.md), "Logos").

## Where the list comes from

- **Sanity `partner` documents win.** While Sanity has none, `withPartnerFallback` uses the code-side record in `packages/content/src/partners.ts`, which follows the old production partner list; every entry names its source ([Content sources](/reference/content-sources.md)). Once Sanity has any partner document, the record is ignored. Sample content uses the same record.
- **The sponsorships database overrides `tier` and `current`** for a partner a sponsorship is linked to, by the partner's `id` (owner, 19th November 2026). A running sponsorship makes the partner a current sponsor at its tier; an ended one makes it a past sponsor. The logo, hover colour, link and words stay the partner record's. A running sponsor with no partner record is listed by name, without a logo. A build that cannot read the database shows this list as it is. The rules and the builds are in [Sponsorship](/domains/sponsorship/overview.md), "On the public site".
- **GYFF's tier** comes from its sponsorship. The record's `friend` is only what a build without the database shows.
- **With the fallback,** each event's host is the venue partner named in its own `location`, and only the supporters production stated for an evening are added (`EVENT_SUPPORTERS`). Hosts or supporters an event already has always win.
- **The Studio's `seed-partners.ts`** writes 17 of the 33 partners as drafts for organisers to confirm (every "current" flag, with dates) before publishing. It is behind the code list: the review and what the script still needs are in [the partner review Spec](/domains/partners/specs/partner-data-review.md).

## Who counts as current

- **Only partners an organiser marks `current`, or with a running sponsorship in the database, are called current sponsors.** Venue hosts are listed as hosts ("have hosted"), never as current sponsors. The current hosts are SAE Institute Zürich, novu, GetYourGuide and Orbiz Josef (owner, 19th November 2026); Smallpdf is a past host.
- **Delisted partners** are never promoted: `DELISTED_PARTNERS` (Ginetta, Code Blossom, DotJS, React Paris; owner, 2nd and 3rd November 2026; iJS Munich and Web Zurich; owner, 19th November 2026) and any partner with `delisted`, matched by id or name, so a seeded Sanity document cannot bring them back. `groupPartners` leaves them out of every list (current, venue, community, previous), so they disappear from `/partners`, the home page, upcoming event pages, Tonight and the design gallery. They remain only as history: a past event they hosted still names them, and the About timeline and `llms-full.txt` keep past venues.
- Vercel is listed as a past sponsor, not current (owner, 4th November 2026).

## Where partners are thanked

- **Home page:** current sponsors and current venue hosts together, in colour (Champion extra large, Builder large, Friend a step above the rest); then community and conference partners in a moving row; then past supporters in a second one ([Components](/systems/design-system/components.md)).
- **Upcoming event pages and Tonight:** the evening's hosts and supporters, plus this season's current sponsors.
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
- [Review every partner, then move the list into Sanity](/domains/partners/specs/partner-data-review.md)
