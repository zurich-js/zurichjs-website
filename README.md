# zurichjs.com

The website of ZurichJS, the JavaScript community in Zurich. It is a static-first [Astro 7](https://astro.build) site on Netlify, with content in Sanity.

```bash
pnpm install
pnpm dev                                   # http://localhost:4321 (reads Sanity; set CONTENT_SOURCE=sample to work offline)
CONTENT_SOURCE=sample pnpm build           # build with sample content
pnpm test                                  # Vitest: packages, API functions, rebuild logic
pnpm e2e                                   # Playwright against apps/web/dist (build first)
node tools/serve-dist.mjs 4321 &           # serve the build like Netlify (pretty URLs, redirects)
node tools/seo/compare.mjs --base http://localhost:4321   # SEO and LLM parity gate
pnpm lint && pnpm format:check && pnpm knip && pnpm typecheck
```

Requires Node 22.23.4 or later (`.nvmrc`) and pnpm 11.

| Path                    | What                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `apps/web`              | The Astro 7 site: static output, Netlify adapter, Preact islands, Tailwind 4. `netlify.toml` is here.     |
| `packages/design`       | The design system: tokens, the generated Tailwind 4 theme, Figtree, Astro components, Preact islands.     |
| `packages/events`       | Domain types, clock-based event state, presentation copy, the ticketing seam, `.ics`.                     |
| `packages/content`      | Sanity GROQ over `fetch`, types generated from the Studio schema, mappers, sample content.                |
| `packages/seo`          | Meta tags, JSON-LD, sitemap and `llms.txt` builders.                                                      |
| `packages/forms`        | zod schemas shared by islands and the forms function.                                                     |
| `packages/integrations` | Form forwarding: Sanity writes, Resend, Slack, EmailOctopus; `TalkProposalSink`.                          |
| `packages/config`       | Shared TypeScript config.                                                                                 |
| `tools/`                | The SEO baseline and parity gate, the local Netlify-like server, CI helpers.                              |
| `e2e/`                  | Playwright: routes, accessibility, redirects, visual regression.                                          |
| `docs/`                 | [Runbook](docs/v2/RUNBOOK.md), [design system](docs/design-system.md), [decisions](docs/v2/DECISIONS.md). |

## Content

`loadContent()` reads Sanity. It uses `SANITY_PROJECT_ID` (default `viqjrovw`), `SANITY_DATASET` (default `production`) and, optionally, `SANITY_READ_TOKEN` or `SANITY_TOKEN`.

- **When Sanity is unreachable:** the build falls back to sample content with a warning. On production builds (`CONTEXT=production` or `CONTENT_REQUIRE_SANITY=1`) it fails instead, so sample content never ships.
- **Typed queries:** the Studio repo generates `packages/content/src/sanity.types.ts` (`npm run typegen`, with both repos checked out side by side). A test fails when a query changes without re-running it.
- **Draft preview:** `SANITY_PERSPECTIVE=drafts` (which needs a read token) builds with unpublished changes. The pages are noindex and show a "Draft preview" bar.
- **Rebuilds:** publishing in Sanity, and each event's doors and doors + 48 h, trigger a rebuild. See the [runbook](docs/v2/RUNBOOK.md).

## Event state

An event's displayed state comes from its editorial `status` plus the clock (`packages/events/src/state.ts`):

- **Before doors:** open, RSVP soon, TBC or full.
- **From doors, for 48 hours:** live, which means feedback mode.
- **After that:** past, which means the recap.

Cancelled and postponed override the clock. Pages are prerendered in the state that is true at build time, and the event islands re-check the clock in the browser.
