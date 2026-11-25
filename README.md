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
pnpm lint && pnpm lint:ui && pnpm format:check && pnpm knip && pnpm typecheck
just up                                 # Docker: site + Postgres + Mailpit + Stripe test mode
```

Requires Node 22.23.4 or later (`.nvmrc`) and pnpm 11.

- **Agents** (any tool) start with [`AGENTS.md`](AGENTS.md).
- **Documentation** is the knowledge bundle in [`docs/`](docs/index.md): the [system map](docs/systems/overview.md) (apps, packages and integrations), [local development](docs/systems/local-development.md), [operations](docs/systems/operations/index.md), the [design system](docs/systems/design-system/index.md), the domains (events, membership, content, partners, talk proposals, forms, donations) and the [decision record](docs/reference/decisions/index.md).
