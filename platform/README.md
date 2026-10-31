# ZurichJS platform (V2)

Static-first Astro site and shared packages. Lives beside the production Next.js app until the switchover. This folder is its own pnpm root.

```bash
cd platform
pnpm install
pnpm dev                                   # http://localhost:4321
CONTENT_SOURCE=sample pnpm build           # build with sample content (no Sanity needed)
pnpm test                                  # Vitest: packages and API
pnpm e2e                                   # Playwright against apps/web/dist (build first)
node tools/serve-dist.mjs 4321 &           # serve the build like Netlify (pretty URLs, _redirects)
node tools/seo/compare.mjs --base http://localhost:4321   # SEO and LLM parity gate
pnpm lint && pnpm format:check && pnpm knip && pnpm typecheck
```

| Path                    | What                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/web`              | Astro 5 site (`output: 'static'`, Netlify adapter, Preact islands, Tailwind 3).                     |
| `packages/events`       | Domain types, clock-based event state, presentation copy, ticketing seam, `.ics`. No framework.     |
| `packages/content`      | Sanity GROQ over plain `fetch`, mappers from production documents to domain types, sample fallback. |
| `packages/seo`          | Meta tags, JSON-LD, sitemap and `llms.txt` builders.                                                |
| `packages/forms`        | zod schemas shared by islands and the forms function, `submitForm`.                                 |
| `packages/integrations` | Form forwarding: Sanity writes, Resend, Slack, Stripe Checkout; `TalkProposalSink`.                 |
| `packages/config`       | Shared TypeScript config.                                                                           |
| `tools/seo`             | Production SEO baseline, snapshot crawler and the parity gate.                                      |
| `e2e`                   | Playwright smoke and accessibility checks.                                                          |

## Content

`loadContent()` reads Sanity (`SANITY_PROJECT_ID`, default `viqjrovw`; `SANITY_DATASET`, default `production`; optional `SANITY_READ_TOKEN`). If Sanity is unreachable it falls back to the sample content from the design handoff and warns. On Netlify production deploys (`CONTEXT=production`) or with `CONTENT_REQUIRE_SANITY=1` it fails the build instead, so sample content never ships.

## Event state

An event's displayed state comes from its editorial `status` plus the clock (`packages/events/src/state.ts`): before doors it is open, RSVP soon, TBC or full. From doors it is live, which is feedback mode, for 48 hours. After that it is past, which is the recap. Cancelled and postponed win over the clock. Pages are prerendered in the state true at build time; the event islands re-check the clock in the browser every minute; scheduled rebuilds at doors and doors + 48 h refresh the HTML (Phase 4).

See `docs/v2/PLAN.md` for the full plan and `docs/v2/DECISIONS.md` for decisions.
