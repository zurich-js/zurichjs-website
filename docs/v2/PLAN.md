# ZurichJS V2 platform plan

Owner decisions are in [DECISIONS.md](./DECISIONS.md), blockers in [BLOCKERS.md](./BLOCKERS.md), and progress in [STATUS.md](./STATUS.md). This plan covers Phases 1 to 5. Phase A (the `v2/` reference site) is [zurich-js/zurichjs-website#59](https://github.com/zurich-js/zurichjs-website/pull/59).

## 1. Shape of the platform

```
platform/                     own pnpm root (pnpm-workspace.yaml, lockfile, minimumReleaseAge 4320)
  apps/web/                   Astro 7 site, output 'static', @astrojs/netlify, Preact islands, Tailwind 4
    netlify.toml              read only by a Netlify site whose base directory is apps/web
  packages/
    design/                   tokens.ts → generated Tailwind 4 theme.css, Figtree, .astro and Preact components
    events/                   framework-free event-state logic (resolveState, presentEvent, formatting, ics)
    content/                  Sanity client, GROQ queries, typegen types, mappers, sample fallback
    seo/                      buildMeta, JSON-LD builders, sitemap and llms.txt helpers
    forms/                    zod schemas shared by islands and functions
    integrations/             Sanity writes, Resend, Slack, EmailOctopus; TalkProposalSink (TicketingProvider lives in events)
    config/                   shared tsconfig, oxlint, oxfmt, knip config
  tools/seo/                  snapshot.mjs (crawl), compare.mjs (parity gate), routes files
```

Why a separate pnpm root: the production app's install, lockfile and Netlify build stay untouched until the owner switches. At switchover the owner decides whether to hoist `platform/` to the repository root.

Packages are split only where a second consumer exists or will exist:

- **web:** consumes all of them.
- **Conference site:** design, seo.
- **Studio** (readiness check, typegen): events, content.
- **Netlify Functions:** forms, integrations, content.

## 2. Sitemap and rendering

Legend:

- **S**: static page (prerendered).
- **S+I**: static page plus an island.
- **F**: Netlify Function (`prerender = false`).
- **Rebuild:** P = Sanity publish webhook, D = next event's doors and doors+48h. (No nightly rebuild: owner decision, 2026-11-01.)
- **SEO** column: how the route relates to the production baseline ([SEO-BASELINE.md](./SEO-BASELINE.md)).

### Public pages (ported)

| Route                                                                                                                | Source of truth                                                             | Mode                                        | Rebuild | SEO vs production                                                                |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| `/`                                                                                                                  | Sanity `events`, `talk`, `speaker`, `meetupRating`, `conference`, `partner` | S+I (state re-check)                        | P, D    | Same URL; V2 copy (allowlisted title and description change)                     |
| `/events`                                                                                                            | `events`                                                                    | S+I (tabs, search)                          | P, D    | Same URL                                                                         |
| `/events/[id]`                                                                                                       | `events` (+ talks, speakers)                                                | S+I (state re-check, rating sheet)          | P, D    | Same URLs (`id.current`); Event JSON-LD kept                                     |
| `/speakers`                                                                                                          | `speaker`                                                                   | S+I (search)                                | P       | Same URL                                                                         |
| `/speakers/[id]`                                                                                                     | `speaker`, `talk`                                                           | S                                           | P       | Same URLs; Person JSON-LD kept                                                   |
| `/cfp`                                                                                                               | file + `conference`                                                         | S+I (form)                                  | P       | Same URL                                                                         |
| `/cfp/form`                                                                                                          | (none)                                                                      | 301 → `/cfp`                                | (none)  | V2 merges the two-step form into `/cfp`                                          |
| `/about`                                                                                                             | file + `siteSettings`                                                       | S                                           | P       | Same URL                                                                         |
| `/about/why-zurichjs`                                                                                                | file                                                                        | S                                           | (none)  | New URL                                                                          |
| `/today`                                                                                                             | `events`                                                                    | S+I (clock, rating)                         | P, D    | Same URL                                                                         |
| `/partners`                                                                                                          | file + `partner`                                                            | S+I (form)                                  | P       | New URL                                                                          |
| `/partnerships`                                                                                                      | (none)                                                                      | 301 → `/partners`                           | (none)  | Redirect                                                                         |
| `/feedback`                                                                                                          | `events`                                                                    | S+I (form)                                  | P, D    | Same URL                                                                         |
| `/event-feedback`                                                                                                    | (none)                                                                      | 301 → `/feedback`                           | (none)  | Redirect                                                                         |
| `/feedback/speaker/[token]`                                                                                          | `feedback` via JWT                                                          | F (noindex)                                 | (none)  | Same URL                                                                         |
| `/contact`                                                                                                           | file + `siteSettings`                                                       | S+I (form)                                  | P       | Same URL                                                                         |
| `/donate`                                                                                                            | file                                                                        | S+I (checkout)                              | (none)  | Same URL                                                                         |
| `/buy-us-a-coffee`, `/support`                                                                                       | (none)                                                                      | 301 → `/donate`                             | (none)  | Redirect (`/support` used to chain through `/buy-us-a-coffee`)                   |
| `/cfv`                                                                                                               | file                                                                        | S+I (form)                                  | (none)  | Same URL                                                                         |
| `/media`                                                                                                             | `events.photos`                                                             | S                                           | P       | Same URL                                                                         |
| `/membership`                                                                                                        | file                                                                        | S+I (inquiry form)                          | (none)  | Same URL                                                                         |
| `/meetups/javascript-zurich`, `/meetups/ai-ml-zurich`                                                                | file + `events`                                                             | S                                           | P, N    | Same URLs (SEO landing pages)                                                    |
| `/conferences/tech-conferences-zurich`                                                                               | file + `conference`                                                         | S                                           | P       | Same URL                                                                         |
| `/waitlist/conf`                                                                                                     | file                                                                        | S+I (form)                                  | (none)  | Same URL                                                                         |
| `/ai-context`                                                                                                        | `events`, `speaker`, `siteSettings`                                         | S                                           | P, N    | Same URL; Organization JSON-LD kept                                              |
| `/llms.txt`, `/llms-full.txt`                                                                                        | the same content                                                            | S (endpoint)                                | P, N    | New                                                                              |
| `/policies/code-of-conduct`, `/policies/privacy-policy`, `/policies/refund-policy`, `/policies/terms-and-conditions` | files (Markdown)                                                            | S                                           | (none)  | Production slugs kept (V2 used `privacy`, `terms`, `refunds`; those become 301s) |
| `/checkout/success`, `/success`                                                                                      | (none)                                                                      | 301 → `/events`, `/donate` (Stripe removed) | (none)  | Redirects                                                                        |
| `/404`                                                                                                               | (none)                                                                      | S                                           | (none)  |                                                                                  |
| `/sitemap.xml`                                                                                                       | every static route + `events` + `speaker`                                   | S (endpoint)                                | P, N    | Fixed: now complete (production serves a 3-URL file)                             |
| `/robots.txt`                                                                                                        | file                                                                        | S                                           | (none)  | Same rules, minus the removed areas                                              |
| `/api/og/*`                                                                                                          | (none)                                                                      | F                                           | (none)  | Same paths (existing share caches); pages reference build-time images            |

### APIs (Netlify Functions)

- `forms/[kind]`: kinds `cfp`, `partners`, `contact`, `feedback`, `rating`, `donate`. Same payloads as `v2/src/pages/api/forms/[kind].ts`.
- **No payments (owner, 2026-11-01):** pro meetups, Stripe ticketing, donation checkout and the Stripe functions are removed.
- Kept from production: `submit-talk` (no sign-in), `feedback`, `event-feedback`, `speaker-feedback/[token]`, `partnership-inquiry`, `verein-inquiry`, `submit-volunteer`, `subscribe`, `notify/*` (minus T-shirt), `announcements/current`, `google-maps`.
- New: `rebuild` (debounced build hook), `scheduled-rebuild` (scheduled function).

### Not ported

| Route(s)                                                                                                                                                                                                                       | Reason                   | SEO note                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/workshops`, `/workshops/*` (7 pages), `api/workshops/waitlist`                                                                                                                                                               | De-scoped (owner)        | Indexed today. Owner decides between keeping the old app, redirecting to `/events`, or returning 410                                        |
| `/tshirt`, `api/checkout-tshirt`, `api/get-stock`, `api/notify/tshirt-purchase-success`                                                                                                                                        | De-scoped (owner)        | Indexed today. Same decision                                                                                                                |
| `/admin/*`, `api/admin/*`, `/profile/*`, `/invite/*`, referrals, `api/users/[id]`, `api/cash-payment`, `api/cfp/prefill`, `api/profile/speaker`, `api/events/register-interest`, `api/feedback/speaker/generate-feedback-link` | Removed (owner): no auth | `/admin` and `/profile` are disallowed in `robots.txt`. `/invite` was indexable ("Join ZurichJS"); proposed 301 → `/about` (owner decision) |
| `/media-demo`, `/api/hello`                                                                                                                                                                                                    | Dead                     | Proposed 301 `/media-demo` → `/media`                                                                                                       |

## 3. Content model

See [CONTENT-MODEL-DIFF.md](./CONTENT-MODEL-DIFF.md). In short:

- **Additive only:** `events` gains `status`, `dateText`, `venue{}`, `venueNote`, `agenda[]`, `practical[]`, `photos[]`, `recap{}`, `hosts[]`. `speaker` gains `tagline`.
- **Declared:** fields and types the production site already writes (`stripePriceId` as deprecated, since pro meetups are removed; `company`, `location`, `interests`, `comprehensiveFeedback`, `under_review`).
- **Singletons:** `meetupRating`, `conference`, `siteSettings`.
- **Deprecated, not deleted:** `ticketSaleUrl`.
- **No workshop schema** (de-scoped).

## 4. Design system (`@zurichjs/design`)

Every token and component comes from `v2/src`. Rules and usage: [docs/design-system.md](../design-system.md); gallery at `/design` (noindex).

**Tokens** (`src/tokens.ts`, generated into the Tailwind 4 `@theme` in `src/theme.css`):

- black `#000`, white `#FFF`
- yellow `#F1E271` (hover `#EDC936`)
- ink `#19191B` / `#242528` / `#3A3B40`
- grey `#EDEDEF` (hover `#E2E2E6`), soft `#F6F6F4`, mid `#A9AAB1`, light `#D4D5DA`, text `#5F626B`, placeholder `#9CA3AF`, line `#7C7F89`, frame `#D9D9DC`
- blue `#268BCC` (focus ring and logo only; soft `#D9E9F5` for monogram tiles)
- danger `#B3261E` (hover `#8F1D17`) / `#F6D8D3`
- radius: pill 999px, card 24px, block `clamp(24px, 3vw, 40px)`
- breakpoint: 800px (plus 1100px for wide layouts)
- gutter `--px` 20/48px, `--gut: max(var(--px), (100% - 1280px) / 2)`
- font: Figtree variable, 300–900

**Components and variants:**

| Component      | Variants                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button         | yellow, outline-white, black, outline-black, white, grey, danger, link × sm/md/lg; link or button; `grow`                                                     |
| Surface        | grey, yellow, black, ink, soft, white, danger                                                                                                                 |
| Monogram       | tone grey/yellow/white/blue × size avatar/tile/portrait                                                                                                       |
| SectionHeading | lg/md/sm, optional action                                                                                                                                     |
| StarRating     | md/lg; interactive (island) or read-only                                                                                                                      |
| Field          | TextField, TextArea, SelectField, Checkbox, ChipGroup (Preact, used in islands)                                                                               |
| Layout         | Header, Footer, PageOpening (black opening); the page layout stays in the app                                                                                 |
| Site           | Modal, Photo, LogoGrid, EventRow, TalkRow, SpeakerCard (grey/yellow), ConferenceModule, ProofSentence, HomeHero, HostsSection, SpeakCta, RatingSheet (island) |

**Rule:** a component is written once. Static components are `.astro`; components used inside islands are Preact `.tsx` and are also rendered statically by Astro. There are no duplicates.

## 5. CI matrix

| Check                                                                      | PR  | main |
| -------------------------------------------------------------------------- | --- | ---- |
| Production app (existing `ci.yml`: lint, format, tsc, audit)               | ✓   | ✓    |
| platform: install (frozen), typecheck, oxlint, oxfmt                       | ✓   | ✓    |
| platform: knip (zero findings)                                             | ✓   | ✓    |
| platform: Vitest (events, forms, content mappers, seo)                     | ✓   | ✓    |
| platform: `astro build`                                                    | ✓   | ✓    |
| SEO and LLM parity gate (`tools/seo/compare.mjs` against the baseline)     | ✓   | ✓    |
| Playwright: routes, font, 320px overflow, keyboard, focus                  | ✓   | ✓    |
| Playwright visual regression (390, 1440)                                   | ✓   | ✓    |
| Lighthouse CI (perf ≥ 90 median of 3; a11y, SEO 100; home, event, speaker) | ✓   | ✓    |
| `pnpm audit` (platform)                                                    | ✓   | ✓    |

## 6. Risks and decisions

| Risk                                                  | Decision                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event state depends on the clock but pages are static | Prerender the state true at build time. An island re-evaluates it on load and every minute, and swaps the banner and actions. Rebuilds run at doors and doors+48h (scheduled function), so the HTML catches up for crawlers. |
| SEO and LLM regressions                               | A baseline of every production route; a parity gate in CI; an allowlist with a reason for each intended change; complete sitemap; JSON-LD kept; `llms.txt` added.                                                            |
| Sanity and Netlify unreachable from this environment  | Typed sample fallback (the V2 sample content), clearly logged. GROQ queries are typed with `sanity typegen` from the schema, which needs no network. Live verification is owner-side.                                        |
| Removing Clerk and admin                              | Organisers lose coupons, tap-to-pay, user and referral stats, and credits. Logged for the owner; Sane is a candidate replacement for ticketing and check-in.                                                                 |
| Workshops and T-shirt URLs are indexed                | Not touched in production. Owner decision before switchover.                                                                                                                                                                 |
| Abuse on forms without sign-in                        | Honeypot field, zod validation, the existing IP-hash and fingerprint duplicate checks, and Netlify rate limiting on functions.                                                                                               |
| Visual drift from the approved design                 | Visual regression against screenshots of `v2/`; a design gallery; written rules.                                                                                                                                             |
| Two package managers or lockfiles in one repo         | Separate pnpm roots with the same supply-chain policy; root CI ignores `platform/` and `v2/`. A separate workflow covers `platform/`.                                                                                        |
| Image weight (1.5–3.6 MB PNGs)                        | `astro:assets` generates AVIF/WebP with explicit sizes; Lighthouse budget enforced.                                                                                                                                          |
| Netlify build minutes from rebuild triggers           | Debounce (one build per 2 minutes), drafts filtered out, D triggers fire at most twice per event.                                                                                                                            |
| Sane later                                            | Ticketing and talk proposals behind interfaces; see [SANE-READINESS.md](./SANE-READINESS.md).                                                                                                                                |

## 7. Order of work

1. **Phase 1:** platform workspace; `events`, `content`, `seo`, `forms`, `integrations` packages; Astro app with the V2 screens; forms API; tests; parity gate.
2. **Phase 1b:** remaining public routes and APIs, OG images, PARITY.md.
3. **Phase 2:** `@zurichjs/design` extraction, gallery, rules, visual regression.
4. **Phase 3:** Studio schema, migrations, singletons, event workspace and readiness, Presentation, webhook definition, typegen.
5. **Phase 4:** CI workflows, `apps/web/netlify.toml`, rebuild triggers, RUNBOOK.
6. **Phase 5:** CLAUDE.md, skills, agents, `.mcp.json`, AUTOMATION.md.

Each phase gets one PR stacked on the previous one, with screenshots and recordings.
