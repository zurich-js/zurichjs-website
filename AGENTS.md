# AGENTS.md

These are the instructions for any coding or content agent working in this repository: Claude Code, Codex, Cursor, Copilot, Gemini and others. People should read them too. `CLAUDE.md` only imports this file.

## What this is

zurichjs.com is the website of ZurichJS, the JavaScript community in Zurich. It is a static-first Astro 7 site on Netlify, with content in Sanity (project `viqjrovw`, dataset `production`). The Studio lives in `zurich-js/zurich-js-website-sanity-studio`.

| Path                                      | What                                                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web`                                | The site. Static pages, Preact islands for interactive parts, Netlify Functions (forms, rebuilds, the Slack agent), and `apps/web/netlify.toml`. |
| `packages/design`                         | The design system: tokens, the generated Tailwind 4 theme, Figtree, components. Rules: `docs/design-system.md`.                                  |
| `packages/events`                         | Event types, the state machine, presentation copy, readiness rules.                                                                              |
| `packages/content`                        | Typed GROQ queries, mappers, sample content.                                                                                                     |
| `packages/seo`                            | Meta tags, JSON-LD, sitemap, `llms.txt`.                                                                                                         |
| `packages/forms`, `packages/integrations` | Form schemas, and where forms go (Sanity, Slack, email).                                                                                         |
| `packages/agent`                          | The Slack content agent: typed draft-only Sanity tools and a model-agnostic loop.                                                                |
| `agents/`                                 | Playbooks (`agents/skills/*/SKILL.md`) and roles (`agents/roles/*.md`) for agents.                                                               |
| `tools/`                                  | The SEO parity gate, the local Netlify-like server, the agent CLI, CI helpers.                                                                   |
| `e2e/`                                    | Playwright: routes, accessibility, redirects, visual regression.                                                                                 |
| `docs/`                                   | `docs/v2/RUNBOOK.md` (operations), `docs/v2/AUTOMATION.md` (agents and Slack), `docs/v2/DECISIONS.md`, `docs/design-system.md`.                  |

## Commands

```bash
pnpm install                               # Node 22.23.4+ (.nvmrc), pnpm 11
pnpm dev                                   # http://localhost:4321 (CONTENT_SOURCE=sample to work offline)
CONTENT_SOURCE=sample BUILD_NOW=2026-11-01T12:00:00+01:00 pnpm build   # the deterministic build CI uses
pnpm lint && pnpm format:check && pnpm knip && pnpm typecheck && pnpm test
pnpm e2e                                   # needs a build; includes visual regression
node tools/serve-dist.mjs 4321 &           # serve the build like Netlify
node tools/seo/compare.mjs --base http://localhost:4321   # SEO and LLM parity gate
pnpm agent "change the venue of the next meetup to …"     # the Slack agent, from the terminal
```

Before every commit, run the checks for what you touched. The pre-commit hook formats and lints staged files, then typechecks. CI (`.github/workflows/ci.yml`) runs everything, including e2e, visual regression, the SEO gate and Lighthouse.

## Brand rules (binding; changing them needs the owner)

- **Structure:** a black opening (header and page opening), black footer and white content.
- **Typeface:** Figtree only.
- **Colour:** `#F1E271` is the only accent. `#268BCC` is used only for focus rings and the logo.
- **Shapes and layout:** rounded pills for buttons and tags, 24px cards, one breakpoint at 800px.
- **No decoration:** no kickers or eyebrow labels, no decorative borders, dividers or gradients.
- **No recordings or slides:** ZurichJS does not record talks or publish slides.
- **Rating and award:** one plain sentence, never "/5". The rating comes from the `meetupRating` record, updated by hand and never scraped.
- **No invented facts:** dates, prices, attendee numbers, speakers and venues come from content or from a person, never from the agent.
- **Copy:** plain, specific, no em dashes. Say "talk proposals" (explain "call for papers (CFP)" once).

## Needs the owner (never do these on your own)

- changing the brand, fonts or colours
- changing or removing a public URL (every production URL keeps working or gets a 301; the SEO gate enforces it)
- changing the rating copy or the AI-crawler rules in `robots.txt`
- deleting content or Sanity documents
- spending money
- production deploys, `sanity deploy`, and migrations on the `production` dataset
- the legal pages (`apps/web/src/content/policies`)

## Content, state and rebuilds

- **Queries** live in `packages/content/src/queries.ts` and are typed by `sanity typegen` into `sanity.types.ts`. After changing a query or the schema, run `npm run typegen` in the Studio repo, with both repos checked out side by side. A test catches a forgotten run.
- **Sample content** (`packages/content/src/sample.ts`) is used only offline or in CI. Production builds fail rather than ship it.
- **Event state** (`packages/events/src/state.ts`) comes from the editorial status plus the clock. Cancelled and postponed override the clock. An event is "live" (feedback mode) from doors for 48 hours, then "past" (the recap on the same URL).
- **Rebuilds:**
  - A Sanity publish calls a signed webhook (`/api/rebuild`).
  - A scheduled function builds once publishing has paused for 2 minutes, and at each event's doors and doors + 48 h.
  - There is no nightly rebuild.
- **Draft preview:** a build with `SANITY_PERSPECTIVE=drafts` shows unpublished changes. It is noindex.
- **No payments:** pro meetups, Stripe and online donations were removed. One-off contributions go by email, or by the Twint QR from Site settings.

## Environment variables

They are listed in `docs/v2/RUNBOOK.md`. Secrets come only from the environment, never from files, and a missing secret logs a stub line instead of crashing a page. The production site's existing names keep working: `SANITY_TOKEN`, `SLACK_BOT_TOKEN` with `SLACK_DEFAULT_CHANNEL`, and `NEXT_PUBLIC_POSTHOG_*`.

## Testing and pull requests

- **One branch and one PR per change,** and never push to `main`. Every PR includes screenshots and a short recording (`agents/skills/visual-review`).
- **Visual baselines** (`e2e/__screenshots__`) change only for intended changes. Update them with `pnpm exec playwright test e2e/visual.spec.ts --update-snapshots`, and say why in the PR.
- **Keep the Chromium text-rendering flags** in `playwright.config.ts`, so baselines made locally match CI.
- **Don't weaken a test, a security check or the SEO gate to get green.** Fix the cause, or record an intended change with a reason (`tools/seo/allowlist.json`).

## Playbooks and roles

The playbooks are plain markdown in the Agent Skills format. Any agent can follow them, and Claude Code also loads them through `.claude/skills`.

| Playbook                                | Use it to                                        |
| --------------------------------------- | ------------------------------------------------ |
| `agents/skills/new-event/SKILL.md`      | add a meetup                                     |
| `agents/skills/edit-event/SKILL.md`     | change a meetup (venue, date, status, programme) |
| `agents/skills/event-recap/SKILL.md`    | write up an event after it happened              |
| `agents/skills/rating-refresh/SKILL.md` | update the Meetup rating by hand                 |
| `agents/skills/release/SKILL.md`        | check a branch before asking for a merge         |
| `agents/skills/visual-review/SKILL.md`  | make the PR screenshots and recording            |

The roles are `agents/roles/reviewer.md`, `agents/roles/qa.md` and `agents/roles/content-editor.md`.

## MCP servers

`.mcp.json` lists the Sanity, GitHub and Playwright MCP servers, with tokens taken from the environment. Tools that use another file read the same entries: Cursor uses `.cursor/mcp.json`, and VS Code uses `.vscode/mcp.json`. Content edits through Sanity follow the same rules as the Slack agent: drafts first, and a person publishes.
