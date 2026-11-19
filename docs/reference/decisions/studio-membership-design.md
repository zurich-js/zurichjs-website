---
type: Reference
title: 'Decisions: Studio, membership and design system'
description: 'Decisions from 3rd to 18th November 2026: the Studio in the repository, share cards, the home page, membership, the CFP bot, design system v2, motion and dependencies.'
tags: [decisions, history]
timestamp: '2026-11-19T00:00:00Z'
---

# Decisions: Studio, membership and design system

Each entry: date · decision · why · who. "Owner" means confirmed in the planning session on 2026-10-31, unless the entry gives its own date. "Assumption" means decided by Claude and open to change. Phase names (A, 0 to 5) refer to the rebuild of the site in October and November 2026; `v2/` and `platform/` were working folders of that rebuild and no longer exist.

## The Studio joins the repo (3rd November 2026, owner)

- **`apps/studio`** is `zurich-js/zurich-js-website-sanity-studio` imported with `git subtree` (history kept), after Studio PRs #1 and #2 merged. It is a pnpm workspace package, `@zurichjs/studio`; its npm lockfile is gone, and its direct dependencies are pinned to the versions that lockfile had (Sanity 3.79.0), so the move changes no versions. `@sanity/icons`, `@sanity/ui` and `@sanity/schema` are now declared (the code imported them; npm's flat layout hid that).
- **Typegen runs in the repo:** `pnpm --filter @zurichjs/studio typegen` writes `packages/content/src/sanity.types.ts`. CI's `studio` job builds the Studio, lints it and regenerates the types, failing on any difference.
- **The Studio keeps its own ESLint and Prettier**; the root oxlint, oxfmt and knip skip `apps/studio`. Its TypeScript check is part of `pnpm typecheck`.
- _(Trimmed: "Deploys stay manual". Replaced the same day by "The Studio deploys on merge", below.)_
- **Sanity 6** (owner, same day): the Studio moved from 3.79 to 6.21 with React 19.2. Code changes: `Stack` takes `gap` (`@sanity/ui` 4), icons import from their own paths (`@sanity/icons/Calendar`, `@sanity/icons` 5), and TypeGen names results `EVENTS_QUERY_RESULT` (Sanity 5). `sanity.cli.ts` names the deployed Studio (`deployment.appId`) and keeps auto-updates. This also cleared the Studio's audit findings; three that remained deep in the Sanity CLI (`js-yaml` 3, `smol-toml` 1, `undici` 7) are patched by same-major overrides in `pnpm-workspace.yaml`. `pnpm audit` is clean.
- **The Studio deploys on merge** (owner): `.github/workflows/deploy-studio.yml` runs `sanity deploy --yes` when `apps/studio` changes reach `main`, with the `SANITY_DEPLOY_TOKEN` secret; it skips with a notice without it. Migrations stay manual.

## Talk proposals for meetups only, with a photo; a success colour (3rd November 2026, owner)

- **/cfp shows the meetup form straight away.** ZurichJS Conf's call for papers is over, so the meetup-or-conference choice is gone. The form is grouped as About you, Speaker profile, Socials, Your talk and Before you send, with short notes beside it on wide screens.
- **Fields match the Sanity speaker:** job title (`title`), company, bio, photo (`image`), LinkedIn, GitHub, X (`twitter`), Bluesky (new `bluesky` field) and website. A new speaker gets them on their (hidden) speaker document; an existing speaker's page never changes from the public form, and what they sent, including a new photo, goes into the submission's review notes.
- **Photo upload:** optional, JPEG, PNG or WebP. The browser shrinks it to at most 1600 px, and a proposal with a photo is sent as multipart (`data` plus `photo`); the API checks the type and the 5 MB limit.
- **Speakers confirm the terms** with a required checkbox: travel and accommodation can't be covered for meetup talks because events are free, and acceptance depends on the theme and on speaking slots. Checked in the browser and on the server.
- **Green for success.** `success` and `success-soft` are added to the palette for confirmations only (sent forms, "Saved answers cleared.", "Link copied."). Yellow stays the only accent.

## Estimated schedules (owner, 4th November 2026)

Added to this record from `AGENTS.md` and `packages/events/src/schedule.ts`, where the decision is recorded.

- **Without an agenda but with a start time,** the evening is estimated the way the old site did it: doors at the start, the welcome an hour later, the first talk 20 minutes after that, 5 minutes between talks, a 15-minute food break after the second talk, then networking. The lines are marked "Times are approximate". Without a start time, talks are listed in running order with no times. This replaces "talks in order without times" in "Launch restoration after the V2 audit" and "Schedule fields and feedback availability".
- **Talk lengths:** a 10-minute lightning talk or a 20-minute full talk (also recorded in "Talk proposals and contact after the audit").

## The rating out of 5, and the award linked (4th November 2026, owner)

The proof sentence now reads "Rated 4.9/5 on Meetup from 199 ratings, and winner of the 2026 Open Source Award for Most Impactful Contribution to the Community globally." The award links to the award section on the home page (`/#award`). This replaces the earlier rule of never printing "/5".

## Share cards (owner, 4th November 2026)

- **Every page shares a generated 1200×630 card** (`apps/web/src/lib/og.ts`, rendered by `pages/og/[name].png.ts`): page cards by path, one shared card for the policies, and `/og/default.png` for anything else. No page shares a photo or the square logo any more.
- **Events** always use their own card: the date, title and venue, with the Sanity artwork on the right when there is one, and a "Recap" pill once the event is past. **Speakers** use their photo (face crop) or their initials.
- **Design:** black, white and yellow, Figtree, 24px tiles, the wordmark and zurichjs.com on top, no kicker line. Emoji are removed from card text (the font has none).
- **Tags:** `og:image:type`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image:alt` on every page. Deploy previews point share images at their own URL (`DEPLOY_PRIME_URL`); canonical URLs stay on zurichjs.com.
- **The SEO gate** fails a page whose share image is not a generated 1200×630 card.

## Home page, Bogdan's review (4th November 2026)

- **Hero:** "JavaScript meets Zurich." is the H1, "Shaping the Zurich tech scene." a smaller H2, then "Come for the talks, stay for the people…". No rating in the hero (it moved to the award section).
- **Next meetup:** a white card inside the hero's square composition (a photo, the workshop loop, the card), kept after trying it: it is the only light surface in the black hero, so it is the first thing to find, and it reads top to bottom as date and venue, title, "Details and RSVP". The whole card is one link to the event page; no price, "RSVP open" or Meetup note. On phones it spans the width under the two photos (replaced on 12th November 2026: it keeps its artwork beside the text). It carries the corner illustration from the V2 handoff (`corner-js.svg`).
- **Navigation:** the conference pattern: sticky, a floating black pill after scrolling, social icons and a divider on desktop, a full-screen modal menu on phones.
- **Below the award:** a packed photo grid (the conference's `useGridPacker`, ported to `@zurichjs/design/gridPacker` and packed at build time). "What happens at a meetup" is gone from the home page (with Harshil's quote).
- **Speakers:** (replaced on 12th November 2026 by the speaker arc, "Design system v2") a full-width carousel (active card in the middle, neighbours at lower opacity, arrows at the sides, a quiet Pause/Play below); "Where our speakers come from" replaces "Our speakers have worked at", without the Google Developer Experts / Microsoft MVPs line.
- **Yellow:** "Speak at a meetup" is the only large yellow section; no yellow text highlights; no yellow footer link. (One exception since 17th November 2026: the header's current-page link, see Motion below.)
- **Footer:** the conference's layout (who we are, link columns, stay in the know, wordmark and social icons).
- **The conference module** is a development placeholder: shown with `pnpm dev`, or when a build sets `SHOW_PREVIEW_MODULES=true` (use only on password-protected deploy previews), never on the public site.

## Verein membership goes self-serve (owner, 5th and 6th November 2026)

_(Trimmed: the Supabase design, the Slack approval of applications, signed declarations, and membership phases 2 and 3 (5th and 6th November 2026). Replaced on 10th November 2026 by "Membership on Netlify only, anyone can join, certificates": Supabase was removed, and nobody approves or signs. The full plan and its bylaws analysis are in Git history; the bylaws reading that still applies is in [Membership](/domains/membership/overview.md).)_

What still holds from those entries:

- **Memberships are charged through Stripe,** which changed the `AGENTS.md` payments rule; the privacy policy and terms needed updating for it (drafted by an agent, the owner approves the text).
- **Resigning from the account counts as "in writing"** (bylaws Art. 5), with an email copy to the member.
- **Two levels only:** Basic Member and Supporter, one to one with `/membership`. Enthusiast and Advocate (named in Art. 4) do not exist yet and are not modelled.
- **Resignations are confirmed** by Nadja, Bogdan and Faris, through `SLACK_MEMBERSHIP_APPROVER_IDS`.
- **Retention:** one year after a membership ends, then the member is anonymised in the database (`member_anonymise`); Stripe's payment records stay, for the accounts.
- **Still open:** the basic discount and which paid events are included each year (board).

## Membership on Netlify only, anyone can join, certificates (owner, 10th November 2026)

- **Supabase removed.** The member database is Netlify Database (Postgres; `@netlify/database`), sign-in is Better Auth with an emailed link, everything deploys with the site on Netlify. The old Netlify DB Neon extension is discontinued; Netlify Database is its GA successor. (Replaced on 11th November 2026: the database is Postgres on Neon, see "Admin, membership launch decisions".)
- **No approval and no declaration.** Anyone can join by accepting the membership terms (based on the bylaws) and paying; the first payment makes them a member. The Slack Approve/Reject flow is gone; Slack gets notes, and a Confirm resignation button for the approvers.
- **Certificate of membership for every paid term,** signed by Faris Aziz, President of the Board, with his signature image (kept out of git, in Netlify Blobs). Emailed and in the portal.
- **Only quarterly and yearly** cycles; members switch between them (or levels) in the Stripe portal, which cannot cancel. (Replaced on 11th November 2026: changes apply from the next renewal, on the account page; the portal no longer switches plans.) Resignations go through the board (bylaws Art. 5).
- **Production keeps the email form** until `PUBLIC_MEMBERSHIP_ONLINE=on`. (Replaced on 11th November 2026: online joining is always on, with no switch; see below.)
- **Deploy previews fork production data** (Netlify Database branching). The site protects that copy itself (see the admin area below); no Netlify visitor password. (Replaced on 11th November 2026: each deploy preview gets its own empty database, with no production data.)
- **Existing members are imported through an admin endpoint,** not a data migration, so member data never goes into git.
- **Local development runs in Docker** (`docker-compose.yml`): Postgres with the migrations, the Stripe mock (now with memberships and signed webhooks), Mailpit for email (via `MAILPIT_URL`, ignored in production; replaced the home-made mail viewer tools/mock-resend.mjs on 10th November 2026, owner) and the Sanity Studio against the real project (Sanity has no local backend).

## Membership admin area behind a site-level password (owner, 11th November 2026)

- **`/admin/memberships`** for the board: members with search and filters, one member's details and history, confirming resignations, CSV import and export.
- **Protected by the site, not by the deploy:** one shared password from `ADMIN_PASSWORD` (any length since 11th November 2026, owner), enforced by the API on production and every deploy preview. The earlier advice to password-protect deploy previews in Netlify is dropped.
- **Session:** httpOnly, SameSite=Strict cookie for the admin API, 8 hours, signed with a key derived from the password (changing it signs everyone out). Writes must come from the site's own origin. 10 wrong passwords per IP block sign-in for 15 minutes, counted in the database (`admin_login_attempts`).
- **The import CLI uses the same password** (Bearer); `MEMBERSHIP_ADMIN_TOKEN` is gone.

## Admin, membership launch decisions (owner, 11th November 2026)

- **`/admin` asks for the password first, then shows Memberships (`/admin`, `/admin/memberships`)** (a Content section linking to the Sanity Studio was added and removed the same day, owner) (it was `/membership/admin`, never in production). The password variable is `ADMIN_PASSWORD` (was `MEMBERSHIP_ADMIN_PASSWORD`).
- **Online joining is always on:** the `PUBLIC_MEMBERSHIP_ONLINE` switch and the email request form on `/membership` are gone; `/api/verein-inquiry` stays for anything that still posts to it.
- **The membership terms are approved** (version of 11th November 2026) and indexed.
- **Renewal stops when a member resigns,** not when the board confirms, so nothing is charged after a resignation; resubscribing turns it back on.
- **Resigning asks why** (reasons and a note, for the board), never as a condition: a small red link resigns without a reason. Red for that link is the owner's call.
- **Soft yellow for one call to action:** members who pay manually (cash/bank) see "Switch to automatic payment" as a status banner right under "Signed in as" on the account page, on the brand yellow at 25% (`surfaceClass('yellow-soft')`). This adds to the yellow rule in AGENTS.md (owner). (Replaced on 18th November 2026: the banner is a plain note, and `yellow-soft` is gone.)
- **"Paid manually (cash/bank)"** replaces "paid by hand" everywhere members and the board read it.
- **Level and cycle changes apply from the next renewal only** (owner): on the account page, through a Stripe subscription schedule; nothing is charged or prorated now. The billing portal no longer switches plans (`pnpm membership:stripe-setup` turns it off; run it again in each Stripe account).
- **The admin area has no Content section;** Sanity is reached through the Studio directly.
- **The membership database is Postgres on Neon, not Netlify Database** (the team's Netlify plan has no database). Production on the Neon production branch; every deploy preview gets its own empty database on a separate preview branch (no production data in previews), dropped when the PR closes; local development stays on Docker. Migrations run before each Netlify build (`apps/web/scripts/db-migrate.mjs`).

## Talk proposals in Slack (owner, 11th November 2026)

- **The CFP bot** ([CFP bot](/systems/cfp-bot.md)): a second Slack app in a public `#cfp` thread, four tools on the speaker's own draft only, name, email and photo from the Slack profile (the photo only with consent), the cheapest model, at most 2 submissions per person per day, guests allowed, the Slack ID only in the review notes.
- **Privacy policy** section "Talk Proposals in Slack" approved as written.
- **Unfinished drafts** are deleted after 14 days without activity.

## Page reviews after the design system (owner, 12th November 2026)

- **More whitespace everywhere:** `section` spacing is 96–160px, and every page wraps its content in `py-section`, so the space under the opening and above the footer matches the space between sections.
- **Events (`/events`):** every meetup on one page: upcoming in date order, then past newest first and quieter. Upcoming and Past are a sticky jump bar with the search, no longer tabs (`?tab=past` still lands on the past section). (Replaced in "Page reviews, second round": the bar holds only the search.) Rows are image and text cards.
- **About:** it opens with what ZurichJS is about; the first-visit block and the section subnav are gone. The story is a timeline grouped by year, oldest first, with where we started and where we are now as full-width panels with the numbers, and photos chosen by the owner. The CFP count is 434 (the prospectus said 436). Values have a clear heading, name and text hierarchy. Team cards are photo link cards that open the speaker profile in a new tab, with the social links inside.
- **Page titles never shrink below the section headings** (`PageOpening`: full size up to 64 characters).

## Tokens in CSS, no generator (owner, 12th November 2026)

- **`theme.css` is the single source, edited by hand.** It replaces the 1st November setup (`tokens.ts` plus a script that generated `theme.css` and `fonts.css`, see "Phase 2: design system" in [Building the platform](/reference/decisions/platform-build.md)). A generated file that people edit is an antipattern: a direct edit worked until the next regeneration silently undid it.
- **TypeScript reads the CSS** through `packages/design/src/theme.ts` (Vite's `?raw` import, parsed once): `color()`, `radius()` and `space()` throw on an unknown name, so a typo fails the build. The emails, the OG images (which had hex literals) and the `/design` gallery use it.
- **The font is configuration, not a token:** `font.ts` keeps Figtree's file, weights and fallbacks for the Astro Fonts API (`astro.config.mjs` runs in plain Node and cannot import CSS) and the emails. `fonts.css` is hand-written for other sites. The OG images keep their static TTFs, because satori cannot read woff2.

## Design system v2 (owner, 12th November 2026)

A design audit found the site visually consistent but built from duplicates: four tag versions, several card styles, 51 text sizes and controls from 36 to 56px tall. A proposal was built as a page-only route (`/opus`), reviewed with the owner over many rounds, and then rolled out to the whole site (PR zurich-js/zurichjs-website#82). The page was removed once the site used the system. The rules are in [the design system](/systems/design-system/index.md).

- **Type:** nine roles (display, title, section, subsection, card-title, lead, body 18px, compact 16px, meta 14px). All 17px text became body; Tailwind's default text scale is off.
- **Buttons:** primary, secondary, cta and plain (interface controls only), one height (48px, also form fields) and no size prop. The yellow hover is `#E3CB16`. A tertiary button is not decided.
- **Switches** are 48px in total on native radios; **filter chips** 44px; **tags** have 6px corners, not pills (the AGENTS.md brand line changed with it).
- **Rounding formula:** outer radius = inner radius + padding + border, applied by Card's `edge` prop.
- **Cards:** one Card with a surface (outline, filled, plain, white) and a behaviour by props (static, link with an arrow, disclosure with a chevron, action with footer buttons). The outline frame is functional, not decoration. No eyebrows: times and labels go in a facts row under the title.
- **Logos:** walls in a packed grid, black at rest and in colour on hover (with an optional black file and background colour per partner); inline logos keep their colours.
- **Home page:** the next meetup as a media link card, and the speaker arc (roles, not talk titles; holds on hover; one motion exception, see [Motion](/systems/design-system/motion.md)).
- **Variants live as props of design-system components**, not as cva recipes in `components/ui/` as the UI compliance audit of 10th November 2026 had planned; that audit was superseded and is in Git history.

## Page reviews, second round (12th November 2026)

Items marked "owner" are stated as his in the code or the commits; the rest are review fixes recorded from the commit messages.

- **Openings fill the screen (owner).** Every page opening is at least the screen's height under the header, up to 800px (`--spacing-opening`, `min-h-opening`), with its text centred, so a short opening never looks empty.
- **A phone breakpoint at 480px, for `grow` buttons only (owner).** Below it they are full width; from there they keep their own width and sit side by side. 800px stays the one layout breakpoint.
- **Cards with buttons keep 24px corners for now (owner).** The rounding formula still applies where text touches the edge; `edge="control"` is opt-in. A better rule for cards with buttons comes later. This narrows "Rounding formula" under "Design system v2".
- **Events list:** each meetup is the home hero's card, a link card with the image flush to its edges (`Card mediaLayout="row"`). The facts are the date, "RSVP open" while it is, the talks when there are any, and the venue. The Upcoming and Past chips are gone; the anchors and `?tab=past` stay, and the sticky bar holds only the search. This replaces "a sticky jump bar" in "Page reviews after the design system".
- **Past meetups are dimmed until hovered or focused (owner),** through Card's `dim` prop. The opacity is 70%: 60% failed the contrast check.
- **Add to calendar is a menu** (new `Menu` island): Google Calendar and Outlook open a prefilled entry; Apple and other apps open `/events/<slug>.ics`, served as `text/calendar` and never cached stale. The file is not in the sitemap. Share is an icon button.
- **Event page:** the programme lists the talk, then who gives it, with larger avatars. The summary card leads with the date and has a copy-link icon button beside the RSVP button. The venue and summary cards have a frame instead of a grey background. The "Opens Meetup in a new tab" note under RSVP is gone.
- **Today:** the old site's layout. What to do is on the left (feedback, sharing, staying in touch) and the evening on the right (the event page's programme, getting there, thanks); on phones the programme comes first. "Keep ZurichJS going" spans the width below. The hero has no labels and no now/next cards, and the venue is plain text.
- **Home:** on phones the next-meetup card keeps its artwork beside the text (`Card mediaLayout="side"`, a third of a narrow card), so it is under 200px tall. This replaces "On phones it spans the width under the two photos" in "Home page, Bogdan's review".
- **Partners, contact, CFP, membership:** sponsors are whole link cards with the logo first. Contact shows the team as photo cards with round icon links, and channel cards with a short title. The CFP asks about speaking history as one choice. The Join step on `/membership` is one centred column without a card.
- **`theme.ts` reads `theme.css` in esbuild too:** `import css from './theme.css?raw' with { type: 'text' }`. Netlify bundles the functions with esbuild, which does not know Vite's `?raw`, and the Slack functions reach `theme.ts` through the emails. This updates "Tokens in CSS, no generator".

## Design system cleanup (12th November 2026)

- **The UI lint baseline went from 84 suppressions to 11** (`eslint-suppressions.json`, 8 files).
- **Long-form text gets a `prose` utility** (the policies' Markdown); `RichText` uses `space-y` and `line-clamp`. No arbitrary variants on child elements.
- **One underline offset for every link,** set once in `theme.css`; no per-link offsets.
- **Social icons have one colour only;** the unused brand tone is removed.
- **Raw `h2`s use `Heading`,** with a new Preact twin for islands. HomeHero is a plain two-column grid instead of named grid areas. Radii, the shadow and small one-offs snap to tokens, and the header's colours come from tokens.
- **Gallery:** the open and hash effects run as layout effects, so Escape right after Next no longer reopens the viewer (the cause of a flaky e2e test).

## Motion (12th to 18th November 2026)

- **CSS only, no library (owner, 12th November 2026).** The rules are in `packages/design/src/motion.css` and the values are tokens in `theme.css`. All of it is progressive enhancement: a browser without a feature keeps the instant behaviour, with no script fallback. It is switched off under `prefers-reduced-motion`.
- **Duration tokens by job (names approved by the owner, 12th November 2026):** `duration-feedback` 150ms, `duration-reveal` 250ms, `duration-drift` 500ms. Added with the reveals: `duration-entrance` 1000ms, `delay-stagger` 120ms, `ease-entrance`, `spacing-reveal` 120px and `blur-reveal` 10px.
- **Pages change through native cross-document view transitions, not Astro's client router (owner, 12th November 2026).** The old page stays drawn while the new one rises in, and the header stays still. Lists filtered in place cross-fade through `swap()`.
- **`Modal` is a native `<dialog>` (owner, 12th November 2026).** Dropdowns, disclosures, notices and field errors animate, and the segmented control's thumb slides.
- **Scroll reveals in the Zoo site's pattern** (`reveal.ts`): per layout with no page markup, staggered in reading order, only when scrolling down; scrolling up resets what drops below the screen. Page openings enter on load. This replaces "No scroll reveals" in the design system's earlier motion rule, and the speaker arc is no longer the one motion exception ("Design system v2"): it is the one thing that moves on its own.
- **Header:** links get a dark pill on hover that grows and fades in over 250ms. **The current page's link is yellow, the others white (owner, 17th November 2026),** instead of underlined. This is the one exception to "no yellow text highlights" (4th November 2026).
- **Choices (owner):** form options get the choice cards' 3px frame, yellow when chosen. Choice cards and form options have a yellow focus ring instead of the blue one (18th November 2026). The talk proposal form starts on "No, not yet.".
- **Speaker cards (owner, 17th November 2026):** the photo sits turned on a grey card and straightens on hover or focus; photos are cropped 10% closer; a speaker page lists talk events as link cards. The grey card sits 2px inside the photo, so it does not show through the photo's rounded corners.
- **Logo tiles:** the hover cross-fades from the black logo to the colour one over 250ms, opacity only.
- **Tests:** e2e runs with reduced motion by default; `e2e/motion.spec.ts` runs with motion on.

## Dependencies (18th November 2026)

- **Astro 7.4.4 → 7.4.12** for GHSA-r3h5-4585-7x3w (moderate: the image endpoint can read a case-variant sibling of the output directory) and GHSA-mh32-jxcr-mh9f (low). Astro stays pinned exactly; the stack test checks the major.
- **`@emnapi/runtime` is overridden to 1.x.** Astro 7.4.12's compiler pulls `@napi-rs/wasm-runtime`, and pnpm filled its `@emnapi/runtime` peer with the 2.0.0 beta, which breaks `astro check` next to `@emnapi/core` 1.x.
- **picomatch GHSA-fc5q-39xc-vjpf is ignored with a note (owner, 18th November 2026).** picomatch 4.0.7 and earlier have a ReDoS advisory with no patched release. It only reaches build and dev tools that match our own glob patterns. Remove the ignore once picomatch publishes a fix. (Removed on 19th November 2026: `pnpm audit` passes without the ignore.)

## Self-serve sponsorships (owner, 18th November 2026)

- **What:** sponsors get the same self-serve system as members: the board invites a company or brings an existing sponsorship onto the site, a contact signs the sponsorship agreement and pays, and the sponsor manages tier, billing, payment details, logo and colleagues at `/partners/account`. The board works in `/admin/sponsors`; the Slack bot can answer questions about sponsors (read only). Design and open points: [Sponsorship](/domains/sponsorship/overview.md).
- **Billing:** monthly, quarterly, yearly or one meetup. Quarterly prices: Supporter CHF 420, Friend 840, Builder 1’400, Champion 2’100 (round numbers, about 7% under three months). A one-time sponsorship covers one meetup (or a bundle the board sets up, see round 2).
- **Payment:** card (Stripe Checkout); sponsorships paid by bank transfer can be recorded by the board.
- **Changes:** a higher tier on the same billing applies now with a prorated charge; anything else from the next renewal. Changes the board agrees with a sponsor apply only when the sponsor confirms.
- **Round 2 (owner, 18th November 2026, after the review):** card only (invoices removed; bank transfers recorded by the board); bundles of meetups at a custom price per meetup, pegged to a tier, paid through one single-use payment link; contracts signed outside the site can be attached and replace signing online; the board sends a pre-filled link instead of proposals; sign once, then confirm changes with one tick; logos upload with no review; board notices in Slack only; the billing portal reuses the membership configuration.
- **One Stripe webhook:** memberships, sponsorships and donations share `/api/stripe/webhook` with one signing secret; each part skips events that are not its own by the `source` metadata. The old membership and donation endpoints stay until production switches ([Stripe](/systems/stripe.md)).
- **Agent's assumptions to confirm:** no minimum term; `/partners` does not show quarterly prices or a sign-in link yet. The agreement text (`/partners/agreement`) was approved by the owner the same day; the page stays noindex.

## Netlify Functions and the model provider (18th November 2026)

Recorded from the commits that made them (#83, #90).

- **Netlify Functions are bundled with esbuild** (`apps/web/scripts/bundle-functions.mjs`, run by the Netlify build into `.netlify/functions-bundled`), because Netlify's own packaging missed the workspace packages' TypeScript and the functions failed in production with `ERR_MODULE_NOT_FOUND`. Schedules are repeated in `netlify.toml`.
- **The Slack bots call the LLM provider directly,** with an explicit base URL, not Netlify's AI Gateway, whose injected `OPENAI_BASE_URL` / `ANTHROPIC_BASE_URL` sent the team's own key to the gateway and failed with a 401 ([Slack content agent](/systems/slack-agent.md)).

## Related concepts

- [Decision record](/reference/decisions/index.md)
- [System map](/systems/overview.md), [Domains](/domains/index.md)

# Related specs

None.

## Supporters on the home page in three steps (owner, 19th November 2026)

- Logos were all black at rest so they would not compete for attention, but sponsors like their logos as they are. So only the companies who fund the meetups (current sponsors and current hosts) keep their colours, in framed white cells sized by tier.
- Community and conference partners, and past supporters, are two moving rows of faint black logos across the whole screen, fading at its edges, in colour on hover. This adds a second thing that moves on its own (after the speaker arc) and the `duration-marquee` token.
- A partner's `logoBackground` became its hover colour: the cell flips to it and the logo turns white (black on a light colour). Stripe flips to its purple and SAE to black; partners without one stay white. It is one optional field in the Studio.
